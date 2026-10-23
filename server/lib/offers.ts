import crypto from 'node:crypto';
import { z } from 'zod';
import { db } from '../db.js';
import { calculateOffer, fingerprintOffer, type OfferMechanism } from './calculations.js';
import { observedFunnel } from './intelligence.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const NAMES: Record<string, string[]> = {
  reactivation: [
    'Your Comeback Has Entered the Chat',
    'Absence Makes the Barre Grow Fonder',
    'Less Ghosting, More Glutes',
    'The Return of the Rep',
    'Your Mat Missed You. There, We Said It.',
  ],
  retention: [
    'The Commitment Issues Cure',
    'Loyalty Looks Good on You',
    'Stay for the Sizzle',
    'The Habit Has Officially Stuck',
    'Keep the Good Burn Going',
  ],
  anniversary: [
    'The Anniversary Flex',
    'Another Year, Another Rear',
    'A Little Older, A Lot Stronger',
    'Our Birthday. Your Strong Era.',
    'Cake Is Optional. The Burn Is Not.',
  ],
  acquisition: [
    'Your Wallet Gets a Warm-Up Too',
    'First Date With the Burn',
    'Meet Your Strongest Plot Twist',
    'One Small Step. One Mighty Shake.',
    'Your Strong Era Starts Here',
  ],
  trial_conversion: [
    'From First Shake to Full Send',
    'You Survived the Trial. Now Thrive.',
    'The First Class Was the Warm-Up',
    'Make It Official With Your Glutes',
  ],
  revenue_gap: [
    'The Final Rep Counts Double',
    'Strong Finish Society',
    'The Month-End Muscle',
    'Close the Gap. Keep the Burn.',
  ],
  default: [
    'A Very Good Excuse to Show Up',
    'Strong Looks Good on You',
    'The Good Kind of Shake-Up',
    'Your Next Chapter Has a Pulse',
  ],
};
const OBJECTIVE_LABELS: Record<string, string> = {
  reactivation: 'Reactivate lapsed clients',
  retention: 'Improve renewals and retention',
  acquisition: 'Acquire new clients',
  trial_conversion: 'Convert completed trials',
  anniversary: 'Maximise anniversary revenue',
  revenue_gap: 'Close a revenue shortfall',
  additional_purchase: 'Increase repeat purchases',
  referral: 'Generate referral purchases',
  aov: 'Increase average order value',
};

export interface GenerationRequest {
  studioId: number;
  year: number;
  month: number;
  objective: string;
  segment?: string;
  productId?: number;
  mechanism?: OfferMechanism;
  maxDiscountPercent?: number;
  minSellingPrice?: number;
  targetRevenue?: number;
  targetPurchases?: number;
  durationDays?: number;
  tone?: string;
  theme?: string;
  instructions?: string;
  eligibleAudience?: number;
  budget?: number;
  count?: number;
  source?: 'engine' | 'ai';
  refine?: string;
  excludeMechanism?: string;
}

function parseInstruction(request: GenerationRequest) {
  const text = request.instructions || '';
  const lower = text.toLowerCase();
  const monthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];
  const mentionedMonth = monthNames.findIndex(name =>
    new RegExp(`\\b${name.slice(0, 3)}(?:${name.slice(3)})?\\b`).test(lower),
  );
  if (mentionedMonth >= 0) request.month = mentionedMonth + 1;
  const amount = lower.match(/(?:₹|inr\s*)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|k)\b/);
  if (!request.targetRevenue && amount) {
    const multiplier = ['lakh', 'lac'].includes(amount[2])
      ? 100000
      : ['crore', 'cr'].includes(amount[2])
        ? 10000000
        : 1000;
    request.targetRevenue = Number(amount[1]) * multiplier;
  }
  const discount = lower.match(/(?:discount|below|under|max(?:imum)?)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*%/);
  if (!request.maxDiscountPercent && discount) request.maxDiscountPercent = Number(discount[1]);
  if (/lapsed|comeback|reactivat|ghosting/.test(lower)) {
    request.objective = 'reactivation';
    request.segment = 'recently_lapsed';
  }
  if (/renew|retention/.test(lower)) {
    request.objective = 'retention';
    request.segment = 'approaching_expiry';
  }
  if (/trial/.test(lower)) request.objective = 'trial_conversion';
  if (/anniversary|april/.test(lower)) request.objective = 'anniversary';
  if (/three|3 offer|3 concept/.test(lower)) request.count = 3;
  if (/funny|witty|cheeky/.test(lower)) request.tone = 'witty';
  return request;
}

function studioContext(studioId: number, year: number, month: number) {
  const studio = db.prepare('SELECT * FROM studios WHERE id=? AND active=1').get(studioId) as any;
  if (!studio) throw Object.assign(new Error('Studio not found.'), { status: 404 });
  const target = db
    .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, year, month) as any;
  const recent = db
    .prepare(
      `SELECT month,SUM(amount) revenue,COUNT(*) transactions,AVG(amount) aov,SUM(discount_amount) discount
    FROM transactions WHERE studio_id=? GROUP BY month ORDER BY month DESC LIMIT 6`,
    )
    .all(studioId);
  const productsOf = (id: number) =>
    db
      .prepare(
        `SELECT * FROM products WHERE studio_id=? AND active=1 AND list_price>0 AND category NOT IN ('Retail','Money Credits','Gift Cards','Others') ORDER BY list_price`,
      )
      .all(id) as any[];
  let products = productsOf(studioId);
  // Venues without their own catalogue (e.g. Copper + Cloves, Plash Pilates) price from the same city's studio products.
  if (!products.length) {
    const sibling = db
      .prepare(
        `SELECT s.id FROM studios s WHERE s.city=? AND s.id!=? AND EXISTS (SELECT 1 FROM products p WHERE p.studio_id=s.id AND p.list_price>0) ORDER BY s.name='Pop-up' DESC, s.id LIMIT 1`,
      )
      .get(studio.city, studioId) as any;
    if (sibling) products = productsOf(sibling.id);
  }
  const historicalOffers = db
    .prepare(
      `SELECT name,objective,actual_revenue,actual_redemptions,effective_discount FROM offers
    WHERE studio_id=? AND generation_source='historical_import' ORDER BY actual_revenue DESC LIMIT 12`,
    )
    .all(studioId);
  return { studio, target, recent, products, historicalOffers, funnel: observedFunnel(studioId) };
}

function audienceFor(studioId: number, segment?: string) {
  if (!segment) return { size: 0, source: 'missing', name: 'Broad eligible audience' };
  const row = db
    .prepare('SELECT * FROM segment_snapshots WHERE studio_id=? AND segment_key=?')
    .get(studioId, segment) as any;
  return row
    ? { size: row.audience_size, source: 'imported_segment', name: row.segment_name, averageSpend: row.average_spend }
    : { size: 0, source: 'missing', name: segment.replaceAll('_', ' ') };
}

function nameFor(objective: string, index: number, tone = 'warm') {
  const list = NAMES[objective] || NAMES.default;
  const offset = tone === 'premium' ? 2 : tone === 'witty' ? 0 : 1;
  return list[(index + offset) % list.length];
}
function validDate(year: number, month: number, day: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

function buildConcept(request: GenerationRequest, index: number, variant?: string) {
  const context = studioContext(request.studioId, request.year, request.month);
  if (!context.products.length)
    throw Object.assign(
      new Error(
        'No priced service products are available for this studio. Add a product price before generating offers.',
      ),
      { status: 422 },
    );
  const product =
    context.products.find(p => p.id === request.productId) ||
    context.products[Math.min(index, context.products.length - 1)];
  const maxDiscount = Math.min(
    request.maxDiscountPercent ?? context.studio.max_discount_percent,
    context.studio.max_discount_percent,
  );
  const segment = audienceFor(request.studioId, request.segment);
  const audience = request.eligibleAudience ?? (segment.size || 250);
  const audienceSource =
    request.eligibleAudience !== undefined
      ? 'user_assumption'
      : segment.size
        ? 'imported_segment'
        : 'scenario_assumption';
  let target =
    request.targetRevenue ||
    Math.max(
      10000,
      (context.target?.approved_target ?? context.target?.proposed_target ?? product.list_price * 30) * 0.08,
    );
  if (request.refine === 'increase_revenue') target *= 1.2;
  const duration = request.durationDays || 14;
  const style = variant || (['conversion', 'value', 'low_discount', 'premium', 'creative'] as const)[index % 5];
  let mechanism: OfferMechanism = request.mechanism || 'percentage';
  let discount = 0,
    bonusClasses = 0,
    fixedDiscount = 0;
  if (!request.mechanism) {
    if (style === 'conversion') {
      mechanism = 'percentage';
      discount = Math.min(maxDiscount, request.objective === 'reactivation' ? 12 : 10);
    }
    if (style === 'value') {
      mechanism = request.objective === 'retention' ? 'validity_extension' : 'bonus_classes';
      bonusClasses = 1;
    }
    if (style === 'low_discount') {
      mechanism = 'percentage';
      discount = Math.min(maxDiscount, 5);
    }
    if (style === 'premium') {
      mechanism = 'experience';
    }
    if (style === 'creative') {
      mechanism = index % 2 ? 'referral' : 'threshold';
      fixedDiscount = Math.min((product.list_price * maxDiscount) / 100, 1000);
    }
  } else {
    discount = mechanism === 'percentage' ? Math.min(maxDiscount, 10) : 0;
    fixedDiscount =
      mechanism === 'fixed' || mechanism === 'threshold' ? Math.min((product.list_price * maxDiscount) / 100, 1000) : 0;
    bonusClasses = mechanism === 'bonus_classes' ? 1 : 0;
  }
  if (request.refine === 'reduce_discount') {
    discount = Math.max(0, discount - 5);
    fixedDiscount *= 0.5;
  }
  if (request.refine === 'premium') {
    mechanism = 'experience';
    discount = 0;
    fixedDiscount = 0;
    bonusClasses = 0;
  }
  if (request.excludeMechanism === mechanism) {
    mechanism = 'bonus_classes';
    bonusClasses = 1;
    discount = 0;
    fixedDiscount = 0;
  }
  const bonusClassValue = bonusClasses ? product.list_price / Math.max(1, product.sessions_included) : 0;
  const baseInput = {
    listedPrice: product.list_price,
    mechanism,
    discountPercent: discount,
    fixedDiscount,
    bonusClasses,
    bonusClassValue,
    targetRevenue: target,
    eligibleAudience: audience,
    redemptionRate: 0.1,
    conversionRate: 1,
    maxDiscountPercent: maxDiscount,
    minSellingPrice: request.minSellingPrice,
    variableCost: product.variable_cost,
    campaignBudget: request.budget || 0,
    capacityBuyers: context.studio.monthly_capacity ? Math.floor(context.studio.monthly_capacity * 0.1) : null,
  };
  let financials = calculateOffer(baseInput);
  const desiredBuyers = request.targetPurchases || financials.requiredBuyers || 0;
  const calibratedRate = audience > 0 ? Math.min(0.5, Math.max(0.02, desiredBuyers / audience)) : 0;
  financials = calculateOffer({ ...baseInput, redemptionRate: calibratedRate });
  const start = validDate(request.year, request.month, 1),
    end = validDate(request.year, request.month, duration);
  const themeOffset =
    request.theme && request.theme !== 'surprise'
      ? [...request.theme].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3
      : 0;
  const name = nameFor(request.objective, index + themeOffset, request.refine === 'funnier' ? 'witty' : request.tone);
  const objectiveLabel = OBJECTIVE_LABELS[request.objective] || request.objective.replaceAll('_', ' ');
  const benefit =
    mechanism === 'percentage'
      ? `${discount}% off ${product.name}`
      : mechanism === 'fixed' || mechanism === 'threshold'
        ? `₹${Math.round(fixedDiscount).toLocaleString('en-IN')} off ${product.name}${mechanism === 'threshold' ? ' above the stated purchase threshold' : ''}`
        : mechanism === 'bonus_classes'
          ? `${bonusClasses} bonus class with ${product.name}`
          : mechanism === 'validity_extension'
            ? `7 additional validity days with ${product.name}`
            : mechanism === 'referral'
              ? `A referral benefit with ${product.name}; exact reward requires approval`
              : `A complimentary studio experience with ${product.name}; no price discount`;
  const coverage =
    financials.expectedRevenue !== null && target > 0 ? Math.min(1, financials.expectedRevenue / target) : 0;
  const score = Math.round(
    coverage * 60 +
      Math.max(0, 1 - financials.effectiveDiscountPercent / Math.max(1, maxDiscount)) * 20 +
      (style === 'value' || style === 'premium' ? 15 : 10) -
      financials.errors.length * 30,
  );
  const rationale = `${objectiveLabel} for ${segment.name} at ${context.studio.name}. The scenario uses ${audience.toLocaleString('en-IN')} eligible customers (${audienceSource.replaceAll('_', ' ')}), ${(calibratedRate * 100).toFixed(1)}% expected purchase/redemption and a listed price of ₹${product.list_price.toLocaleString('en-IN')}. ${style === 'premium' ? 'This option protects price with a non-discount benefit.' : style === 'low_discount' ? 'This option deliberately limits discount exposure.' : 'The mechanism is matched to the selected commercial objective.'}`;
  return {
    name,
    headline: `${name} — ${MONTHS[request.month - 1]} at ${context.studio.name}`,
    customerCopy: `${benefit}. Available for a limited time at ${context.studio.name}. Eligibility and redemption conditions apply.`,
    internalDescription: `${style.replaceAll('_', ' ')} concept for ${objectiveLabel.toLowerCase()}.`,
    rationale,
    studioId: request.studioId,
    studioName: context.studio.name,
    year: request.year,
    month: request.month,
    objective: request.objective,
    offerType: mechanism,
    audience: segment.name,
    excludedAudience:
      'Employees, existing redemption of a conflicting offer, and customers outside the selected eligibility window.',
    eligibleProducts: [product.id],
    productName: product.name,
    benefit,
    mechanics: { ...baseInput, redemptionRate: calibratedRate },
    validityStart: start,
    validityEnd: end,
    redemptionConditions:
      'One redemption per eligible customer. Cannot be stacked with another discount or promotional benefit. Advance booking and studio terms apply.',
    targetPurchases: financials.requiredBuyers,
    expectedAsp: financials.sellingPrice,
    expectedRevenue: financials.expectedRevenue,
    effectiveDiscount: financials.effectiveDiscountPercent,
    marginImpact: financials.contributionMargin,
    requiredLeads: ['acquisition', 'trial_conversion'].includes(request.objective)
      ? context.target
        ? (JSON.parse(context.target.funnel || '{}').requiredLeads ?? null)
        : null
      : null,
    requiredTrials: ['acquisition', 'trial_conversion'].includes(request.objective)
      ? context.target
        ? (JSON.parse(context.target.funnel || '{}').requiredCompletedTrials ?? null)
        : null
      : null,
    expectedConversion: calibratedRate,
    expectedRedemptions: financials.expectedRedemptions,
    revenueTarget: target,
    financials,
    score,
    recommended: false,
    financialStatus: 'calculated_scenario',
    risks: [
      ...financials.errors,
      ...financials.warnings,
      audienceSource === 'scenario_assumption' ? 'Audience size is an unvalidated scenario assumption.' : null,
      'Observed historical promotions do not prove incremental lift.',
      'Capacity and post-campaign retention require manager review.',
    ].filter(Boolean),
    successMetrics: [
      'Revenue versus plan',
      'Unique buyers and redemptions',
      'Average selling price',
      'Effective discount',
      '90-day subsequent purchase rate',
    ],
    cta:
      request.objective === 'reactivation'
        ? 'Book your comeback'
        : request.objective === 'retention'
          ? 'Keep your strong streak going'
          : 'Reserve your spot',
    provenance: {
      studioMetrics: context.recent,
      targetId: context.target?.id || null,
      audienceSource,
      historicalOffersChecked: context.historicalOffers.length,
    },
  };
}

export function generateConcepts(raw: GenerationRequest) {
  const request = parseInstruction({ ...raw });
  const count = Math.max(3, Math.min(5, request.count || 3));
  const offers = Array.from({ length: count }, (_, index) => buildConcept(request, index));
  const valid = offers.filter(o => !o.financials.errors.length);
  const recommended = (valid.length ? valid : offers).reduce(
    (best, offer) => (offer.score > best.score ? offer : best),
    valid[0] || offers[0],
  );
  recommended.recommended = true;
  return {
    offers,
    recommendation: {
      name: recommended.name,
      score: recommended.score,
      explanation: `Recommended because it scores highest on target coverage, revenue quality and objective fit after deterministic guardrail checks. This is a planning recommendation, not an approved commercial decision.`,
    },
    source: 'rules_engine',
    ai: false,
    context: studioContext(request.studioId, request.year, request.month),
  };
}

export const aiConceptSchema = z.object({
  offers: z
    .array(
      z.object({
        name: z.string().min(3).max(100),
        headline: z.string().min(3).max(160),
        customerCopy: z.string().min(10).max(1200),
        rationale: z.string().min(10).max(1500),
        mechanism: z.enum([
          'percentage',
          'fixed',
          'bonus_classes',
          'validity_extension',
          'bundle',
          'referral',
          'experience',
          'threshold',
        ]),
        discountPercent: z.number().min(0).max(100).default(0),
        fixedDiscount: z.number().min(0).default(0),
        bonusClasses: z.number().min(0).max(10).default(0),
        benefit: z.string().min(3).max(300),
        cta: z.string().min(2).max(100),
        risks: z.array(z.string()).max(8).default([]),
      }),
    )
    .min(3)
    .max(5),
});

export async function generateWithAI(raw: GenerationRequest) {
  if (!process.env.OPENAI_API_KEY)
    throw Object.assign(
      new Error(
        'AI provider is not configured. Set OPENAI_API_KEY on the server, or use the labelled rules-based planning engine.',
      ),
      { status: 503, code: 'AI_NOT_CONFIGURED' },
    );
  const request = parseInstruction({ ...raw });
  const context = studioContext(request.studioId, request.year, request.month);
  const businessContext = {
    studio: context.studio,
    planningMonth: `${request.year}-${request.month}`,
    target: context.target,
    recentMetrics: context.recent,
    products: context.products,
    funnel: context.funnel,
    historicalOffers: context.historicalOffers,
    segment: audienceFor(request.studioId, request.segment),
    constraints: request,
    brandVoice:
      'Warm, witty, modern, energetic, confident, relatable, occasionally cheeky, commercially clear. Never cheap or forced.',
  };
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['offers'],
    properties: {
      offers: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'name',
            'headline',
            'customerCopy',
            'rationale',
            'mechanism',
            'discountPercent',
            'fixedDiscount',
            'bonusClasses',
            'benefit',
            'cta',
            'risks',
          ],
          properties: {
            name: { type: 'string' },
            headline: { type: 'string' },
            customerCopy: { type: 'string' },
            rationale: { type: 'string' },
            mechanism: {
              type: 'string',
              enum: [
                'percentage',
                'fixed',
                'bonus_classes',
                'validity_extension',
                'bundle',
                'referral',
                'experience',
                'threshold',
              ],
            },
            discountPercent: { type: 'number' },
            fixedDiscount: { type: 'number' },
            bonusClasses: { type: 'number' },
            benefit: { type: 'string' },
            cta: { type: 'string' },
            risks: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  };
  const response = await fetch(`${process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1'}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            "You are the senior commercial strategist and creative lead for Physique 57 India (premium barre, Mumbai and Bengaluru). Propose genuinely distinctive offers: each concept must use a different mechanism and a memorable, witty name with a clear hook. Prefer value-adds (bonus classes, privates, guest passes, validity, community experiences, referral ladders, challenges, partner perks) and urgency over deep discounts. Tie concepts to the month theme, the studio's own products and history, and the target audience. Name real products from the supplied list. Do not calculate or invent financial results — the application does that. Respect every supplied constraint, especially the discount cap. Return only structured JSON.",
        },
        { role: 'user', content: JSON.stringify(businessContext) },
      ],
      text: { format: { type: 'json_schema', name: 'p57_offer_concepts', strict: true, schema } },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    throw Object.assign(new Error(`AI provider returned ${response.status}. Retry or use the rules-based engine.`), {
      status: 502,
    });
  const payload = (await response.json()) as any;
  const text =
    payload.output_text ||
    payload.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === 'output_text')?.text;
  let parsed: z.infer<typeof aiConceptSchema>;
  try {
    parsed = aiConceptSchema.parse(JSON.parse(text));
  } catch (error) {
    throw Object.assign(new Error('AI output failed schema validation and was not saved. Retry the generation.'), {
      status: 422,
    });
  }
  const offers = parsed.offers.map((concept, index) => {
    const base = buildConcept(
      { ...request, mechanism: concept.mechanism },
      index,
      ['conversion', 'value', 'low_discount', 'premium', 'creative'][index],
    );
    const mechanics = {
      ...base.mechanics,
      mechanism: concept.mechanism,
      discountPercent: concept.discountPercent,
      fixedDiscount: concept.fixedDiscount,
      bonusClasses: concept.bonusClasses,
      maxDiscountPercent: Math.min(
        request.maxDiscountPercent ?? context.studio.max_discount_percent,
        context.studio.max_discount_percent,
      ),
    };
    const financials = calculateOffer(mechanics);
    return {
      ...base,
      name: concept.name,
      headline: concept.headline,
      customerCopy: concept.customerCopy,
      rationale: concept.rationale,
      benefit: concept.benefit,
      cta: concept.cta,
      mechanics,
      financials,
      expectedAsp: financials.sellingPrice,
      expectedRevenue: financials.expectedRevenue,
      effectiveDiscount: financials.effectiveDiscountPercent,
      marginImpact: financials.contributionMargin,
      targetPurchases: financials.requiredBuyers,
      expectedRedemptions: financials.expectedRedemptions,
      risks: [...concept.risks, ...financials.errors, ...financials.warnings],
      score: base.score - financials.errors.length * 30,
      recommended: false,
    };
  });
  const valid = offers.filter(o => !o.financials.errors.length);
  if (valid.length)
    valid.reduce((best, offer) => (offer.score > best.score ? offer : best), valid[0]).recommended = true;
  return {
    offers,
    recommendation: {
      explanation:
        'AI proposed the concepts and copy. The application recalculated all financials and validated commercial guardrails; user approval is still required.',
    },
    source: 'openai',
    ai: true,
    context,
  };
}

export function randomConcept(raw: GenerationRequest) {
  const recent = db.prepare('SELECT fingerprint FROM generation_history ORDER BY id DESC LIMIT 30').all() as any[];
  const used = new Set(recent.map(r => r.fingerprint));
  for (let attempt = 0; attempt < 30; attempt++) {
    const context = studioContext(raw.studioId, raw.year, raw.month);
    if (!context.products.length)
      throw Object.assign(new Error('No eligible priced products at this studio.'), { status: 422 });
    const mechanisms: OfferMechanism[] = [
      'percentage',
      'fixed',
      'bonus_classes',
      'validity_extension',
      'referral',
      'experience',
      'threshold',
    ];
    const mechanism = raw.mechanism || mechanisms[crypto.randomInt(mechanisms.length)];
    const product = raw.productId
      ? context.products.find(p => p.id === raw.productId)
      : context.products[crypto.randomInt(context.products.length)];
    const request = { ...raw, productId: product?.id, mechanism, discountPercent: undefined } as GenerationRequest;
    const concept = buildConcept(
      request,
      crypto.randomInt(5),
      ['conversion', 'value', 'low_discount', 'premium', 'creative'][crypto.randomInt(5)],
    );
    const fingerprint = fingerprintOffer({
      studioId: raw.studioId,
      month: raw.month,
      objective: raw.objective,
      segment: raw.segment || '',
      mechanism,
      discountPercent: Number(concept.mechanics.discountPercent || 0),
      productId: product?.id,
    });
    if (used.has(fingerprint) || concept.financials.errors.length) continue;
    const activeConflict = db
      .prepare(
        `SELECT 1 FROM offers WHERE studio_id=? AND year=? AND month=? AND status IN ('active','scheduled') AND objective=? AND offer_type=? LIMIT 1`,
      )
      .get(raw.studioId, raw.year, raw.month, raw.objective, mechanism);
    if (activeConflict) continue;
    return { ...concept, fingerprint, financialStatus: 'calculated_scenario', randomised: true };
  }
  throw Object.assign(
    new Error(
      'Could not find a novel valid combination within the current constraints. Change a filter or broaden the discount range.',
    ),
    { status: 422 },
  );
}
