import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { PRODUCT_KEYS, linkedOfferChange, listPrice, priceFor } from './linkedOffers.js';

const OBJECTIVES = [
  'acquisition',
  'trial_conversion',
  'new_client',
  'referral',
  'retention',
  'annual_membership',
  'additional_purchase',
  'aov',
  'reactivation',
] as const;
const OFFER_TYPES = ['percentage', 'fixed', 'bonus_classes', 'bundle', 'experience', 'validity_extension'] as const;
const PRODUCTS = Object.keys(PRODUCT_KEYS);

export const copilotRequestSchema = z.object({
  mode: z.enum(['suggest', 'replace', 'optimise']),
  studioName: z.string().max(120),
  monthName: z.string().max(20),
  theme: z.string().max(200).optional().default(''),
  target: z.number().nonnegative().default(0),
  streams: z
    .array(
      z.object({
        label: z.string().max(40),
        target: z.number().nonnegative(),
        offerLed: z.number().nonnegative(),
      }),
    )
    .max(6)
    .default([]),
  offers: z
    .array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().max(200),
        stream: z.string().max(40),
        product: z.string().max(60).optional().default(''),
        price: z.number().nonnegative().default(0),
        units: z.number().nonnegative().default(0),
        revenue: z.number().nonnegative().default(0),
        approved: z.boolean().default(false),
      }),
    )
    .max(14)
    .default([]),
  keyDates: z.array(z.string().max(120)).max(12).default([]),
  replaceOfferId: z.number().int().positive().optional(),
  steer: z.string().max(400).optional().default(''),
});
export type CopilotRequest = z.infer<typeof copilotRequestSchema>;

const proposalCore = {
  name: z.string().trim().min(3).max(120),
  headline: z.string().trim().max(200),
  benefit: z.string().trim().max(400),
  audience: z.string().trim().max(160),
  objective: z.enum(OBJECTIVES),
  offerType: z.enum(OFFER_TYPES),
  productKey: z.enum(PRODUCTS as [string, ...string[]]),
  discountPct: z.number().min(0).max(40),
  targetPurchases: z.number().min(1).max(2000),
  rationale: z.string().trim().max(500),
};
const aiSchema = z.object({
  summary: z.string().trim().max(500),
  proposals: z
    .array(
      z.object({
        action: z.enum(['add', 'replace', 'optimise']),
        targetOfferId: z.number().int().nullable(),
        ...proposalCore,
      }),
    )
    .max(6),
});

export const proposalSchema = z.object({
  action: z.enum(['add', 'replace', 'optimise']),
  targetOfferId: z.number().int().positive().nullable(),
  ...proposalCore,
});
export type Proposal = z.infer<typeof proposalSchema>;

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'proposals'],
  properties: {
    summary: { type: 'string', description: 'Two sentences: what is wrong with the current set and what the changes fix.' },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'action',
          'targetOfferId',
          'name',
          'headline',
          'benefit',
          'audience',
          'objective',
          'offerType',
          'productKey',
          'discountPct',
          'targetPurchases',
          'rationale',
        ],
        properties: {
          action: { type: 'string', enum: ['add', 'replace', 'optimise'] },
          targetOfferId: {
            type: ['integer', 'null'],
            description: 'Existing offer id this replaces or rewrites; null for add.',
          },
          name: { type: 'string' },
          headline: { type: 'string', description: 'The job the offer does, one line.' },
          benefit: { type: 'string', description: 'What the client gets, plain words.' },
          audience: { type: 'string' },
          objective: { type: 'string', enum: [...OBJECTIVES] },
          offerType: { type: 'string', enum: [...OFFER_TYPES] },
          productKey: { type: 'string', enum: PRODUCTS },
          discountPct: { type: 'number', description: 'Percent off list price, 0-40. 0 for value-add offers.' },
          targetPurchases: { type: 'number', description: 'Units the studio can realistically sell this month.' },
          rationale: { type: 'string', description: 'Why this beats the offer it replaces or fills the gap.' },
        },
      },
    },
  },
};

const GUIDE: Record<CopilotRequest['mode'], string> = {
  suggest:
    'Propose 2-4 NEW offers (action "add", targetOfferId null) aimed at the streams with the largest revenue gap.',
  replace:
    'Propose 2-3 alternatives to the offer with id replaceOfferId. Use action "replace" and targetOfferId = replaceOfferId.',
  optimise:
    'Review the whole set against the stream gaps. Return the fewest changes that close the most gap: "replace" weak or redundant offers, "optimise" to sharpen mechanics/price/units of a good offer (targetOfferId = its id), "add" to fill an uncovered stream. Never touch offers marked approved.',
};

// Asks the model to rework this month's offer set. Prices and revenue are recomputed server-side from each studio's price list.
export async function proposeOffers(studioId: number, raw: CopilotRequest) {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(new Error('AI provider is not configured. Set OPENAI_API_KEY on the server.'), {
      status: 503,
      code: 'AI_NOT_CONFIGURED',
    });
  const prices = Object.fromEntries(PRODUCTS.map(k => [k, { label: PRODUCT_KEYS[k].label, listPrice: listPrice(studioId, k) }]));
  const response = await fetch(`${process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1'}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: `You design monthly sales offers for Physique 57 India, a premium barre studio. ${GUIDE[raw.mode]} Rules: price only from the supplied productKey list (the app computes price); discounts above 25% only for reactivation; protect margin; each offer needs a clear job, audience and benefit; prefer value-adds (bonus classes, extensions) over deep discounts where the gap allows; sized units must be realistic for one studio in one month; do not invent revenue figures. Never target offers marked approved. Return only structured JSON.`,
        },
        { role: 'user', content: JSON.stringify({ ...raw, productPrices: prices }) },
      ],
      text: { format: { type: 'json_schema', name: 'p57_offer_proposals', strict: true, schema: jsonSchema } },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw Object.assign(new Error(`AI provider returned ${response.status}. Retry in a moment.`), { status: 502 });
  const payload = (await response.json()) as any;
  const text =
    payload.output_text ||
    payload.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === 'output_text')?.text;
  let parsed: z.infer<typeof aiSchema>;
  try {
    parsed = aiSchema.parse(JSON.parse(text));
  } catch {
    throw Object.assign(new Error('AI output failed validation. Retry the request.'), { status: 422 });
  }
  const editable = new Map(raw.offers.filter(o => !o.approved).map(o => [o.id, o]));
  const proposals = parsed.proposals
    .map(p => {
      // Replace/optimise must point at an offer that is in this month and not approved; otherwise it becomes an add.
      const target = p.targetOfferId && editable.has(p.targetOfferId) ? p.targetOfferId : null;
      const action = p.action !== 'add' && !target ? 'add' : p.action;
      if (raw.mode === 'replace' && raw.replaceOfferId && target !== raw.replaceOfferId) return null;
      return { ...p, action, targetOfferId: action === 'add' ? null : target };
    })
    .filter(Boolean) as Proposal[];
  return { summary: parsed.summary, proposals: proposals.map(p => priced(studioId, p)) };
}

function priced(studioId: number, p: Proposal) {
  const price = priceFor(studioId, { product: p.productKey, discount: p.discountPct / 100 });
  const units = Math.round(p.targetPurchases);
  return {
    ...p,
    targetPurchases: units,
    price,
    listPrice: listPrice(studioId, p.productKey),
    revenue: price * units,
    replaces: p.targetOfferId ? ((db.prepare('SELECT name FROM offers WHERE id=?').get(p.targetOfferId) as any)?.name ?? null) : null,
  };
}

const pad = (v: number) => String(v).padStart(2, '0');

// Saves one reviewed proposal into the studio's month: adds a new offer, swaps one out, or rewrites one in place.
export function applyProposal(
  studioId: number,
  year: number,
  month: number,
  raw: Proposal,
  solo: boolean,
  userId: number | null,
) {
  const p = proposalSchema.parse(raw);
  const price = priceFor(studioId, { product: p.productKey, discount: p.discountPct / 100 });
  if (!price) throw Object.assign(new Error('No list price for that product at this location.'), { status: 400 });
  const pricing = { product: p.productKey, discount: p.discountPct / 100 };

  if (p.action === 'optimise' && p.targetOfferId) {
    const offer = db.prepare('SELECT status, approval_status, studio_id FROM offers WHERE id=?').get(p.targetOfferId) as any;
    if (!offer || offer.studio_id !== studioId) throw Object.assign(new Error('Offer not found.'), { status: 404 });
    if (offer.approval_status === 'approved') throw Object.assign(new Error('Reopen the approved offer first.'), { status: 409 });
    linkedOfferChange(
      studioId,
      year,
      month,
      {
        op: 'update',
        offerId: p.targetOfferId,
        solo,
        edit: {
          name: p.name,
          headline: p.headline,
          benefit: p.benefit,
          audience: p.audience,
          rationale: p.rationale,
          target_purchases: p.targetPurchases,
          pricing,
        },
      },
      userId,
    );
    return { offerId: p.targetOfferId };
  }

  if (p.targetOfferId) {
    const old = db.prepare('SELECT approval_status, studio_id FROM offers WHERE id=?').get(p.targetOfferId) as any;
    if (old?.approval_status === 'approved') throw Object.assign(new Error('Reopen the approved offer first.'), { status: 409 });
  }
  const uid = `P57-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const last = new Date(year, month, 0).getDate();
  const productNames = PRODUCT_KEYS[p.productKey]?.names || [];
  const product = productNames.length
    ? db.prepare(`SELECT id,list_price,variable_cost FROM products WHERE studio_id=? AND name IN (${productNames.map(() => '?').join(',')}) AND active=1 ORDER BY list_price DESC LIMIT 1`).get(studioId, ...productNames) as any
    : null;
  const risks = [
    'Scenario forecast; actual response and incremental lift are unproven.',
    'Enter product and benefit delivery costs before approval.',
    'Confirm audience eligibility, capacity, and redemption terms before launch.',
  ];
  const listed = listPrice(studioId, p.productKey);
  const targetRevenue = price * p.targetPurchases;
  const mechanics = {
    listedPrice: listed,
    mechanism: p.offerType,
    discountPercent: p.discountPct,
    fixedDiscount: 0,
    targetRevenue,
    expectedPurchases: p.targetPurchases,
    eligibleAudience: 0,
    redemptionRate: 0,
    conversionRate: 1,
    maxDiscountPercent: p.discountPct,
    variableCost: product?.variable_cost ?? null,
    benefitCostUnconfirmed: true,
    pricingProductId: product?.id ?? null,
    fulfilmentProductId: product?.id ?? null,
    stackingRule: 'not_stackable',
  };
  const financials = {
    sellingPrice: price,
    listedPrice: listed,
    expectedBuyers: p.targetPurchases,
    expectedRevenue: targetRevenue,
    contributionMargin: null,
    economicsComplete: false,
    effectiveDiscountPercent: p.discountPct,
    warnings: ['Offer copilot scenario; validate customer-benefit and product costs before approval.'],
  };
  const row: Record<string, any> = {
    name: p.name,
    headline: p.headline,
    benefit: p.benefit,
    customer_copy: p.benefit,
    rationale: p.rationale,
    internal_description: 'Drafted by the month offer copilot',
    objective: p.objective,
    offer_type: p.offerType,
    studio_id: studioId,
    month,
    year,
    audience: p.audience,
    excluded_audience: 'Employees, ineligible customers, and customers redeeming a conflicting offer.',
    eligible_products: JSON.stringify(product?.id ? [product.id] : []),
    mechanics: JSON.stringify(mechanics),
    validity_start: `${year}-${pad(month)}-01`,
    validity_end: `${year}-${pad(month)}-${pad(last)}`,
    redemption_conditions: 'One redemption per eligible customer during the validity window. Not stackable with another offer or standing perk. Advance booking and location terms apply.',
    target_purchases: p.targetPurchases,
    expected_asp: price,
    expected_revenue: price * p.targetPurchases,
    revenue_target: price * p.targetPurchases,
    effective_discount: p.discountPct,
    margin_impact: null,
    expected_conversion: null,
    expected_redemptions: null,
    financials: JSON.stringify(financials),
    risks: JSON.stringify(risks),
    cta: p.objective === 'reactivation' ? 'Book your comeback' : p.objective === 'referral' ? 'Bring a friend' : 'Reserve your spot',
    status: 'draft',
    approval_status: 'pending',
    generation_source: 'ai_copilot',
    data_mode: 'plan',
    provenance: JSON.stringify({ source: 'Month offer copilot', pricing, productId: product?.id ?? null }),
    success_metrics: JSON.stringify(['Units vs target', 'Revenue vs expected', 'Effective discount']),
  };
  const cols = Object.keys(row);
  const id = db
    .prepare(`INSERT INTO offers(offer_uid,created_by,${cols.join(',')}) VALUES (?,?${',?'.repeat(cols.length)})`)
    .run(uid, userId, ...Object.values(row)).lastInsertRowid as number;
  const created = db.prepare('SELECT * FROM offers WHERE id=?').get(id) as any;
  db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)')
    .run(id, 1, JSON.stringify(created), userId);
  if (p.targetOfferId) linkedOfferChange(studioId, year, month, { op: 'remove', offerId: p.targetOfferId, solo }, userId);
  linkedOfferChange(studioId, year, month, { op: 'add', offerId: id, solo }, userId);
  return { offerId: id, offer: created };
}
