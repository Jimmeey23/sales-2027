// Offer edit copilot: turns a planner's plain-language request into field changes on one offer
// or on every offer in a month. It only proposes; the planner applies each change through the
// normal month-offer update route, so policy, pricing and audit rules still run on save.
import { z } from 'zod';

export interface OfferEditInput {
  id: number;
  name: string;
  headline?: string | null;
  benefit?: string | null;
  customer_copy?: string | null;
  audience?: string | null;
  cta?: string | null;
  redemption_conditions?: string | null;
  validity_start?: string | null;
  validity_end?: string | null;
  target_purchases?: number | null;
  expected_asp?: number | null;
  effective_discount?: number | null;
  product?: string | null;
  discount?: number | null;
  approval_status?: string | null;
}

export interface OfferEditProposal {
  offerId: number;
  changes: Record<string, any>;
  why: string;
}

export interface OfferEditReply {
  reply: string;
  edits: OfferEditProposal[];
  mode: 'ai' | 'rules';
}

const TEXT_FIELDS = [
  'name',
  'headline',
  'benefit',
  'customer_copy',
  'audience',
  'cta',
  'redemption_conditions',
  'validity_start',
  'validity_end',
] as const;

// The fields the copilot may touch, in the month-offer edit shape.
export const changeSchema = z
  .object({
    name: z.string().trim().min(3).max(200).optional(),
    headline: z.string().max(500).optional(),
    benefit: z.string().max(1000).optional(),
    customer_copy: z.string().max(3000).optional(),
    audience: z.string().max(500).optional(),
    cta: z.string().max(240).optional(),
    redemption_conditions: z.string().max(3000).optional(),
    validity_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    validity_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    target_purchases: z.number().min(0).max(10000).optional(),
    expected_asp: z.number().min(0).max(10000000).optional(),
    pricing: z.object({ discount: z.number().min(0).max(0.5) }).optional(),
  })
  .strict();

const replySchema = z.object({
  reply: z.string().min(1).max(2000),
  edits: z
    .array(z.object({ offerId: z.number().int(), changes: z.record(z.string(), z.any()), why: z.string().max(500) }))
    .max(30),
});

/** Keeps only valid changes to offers in scope that actually differ from the current record. */
export function cleanEdits(raw: OfferEditProposal[], offers: OfferEditInput[]): OfferEditProposal[] {
  const byId = new Map(offers.map(o => [o.id, o]));
  const out: OfferEditProposal[] = [];
  for (const edit of raw) {
    const offer = byId.get(edit.offerId);
    if (!offer) continue;
    const changes: Record<string, any> = {};
    for (const [key, value] of Object.entries(edit.changes || {})) {
      if (value === null || value === undefined || value === '') continue;
      const one = changeSchema.safeParse({ [key]: value });
      if (!one.success) continue;
      const current = key === 'pricing' ? { discount: offer.discount ?? null } : (offer as any)[key];
      if (JSON.stringify(current) === JSON.stringify(value)) continue;
      changes[key] = (one.data as any)[key];
    }
    if (Object.keys(changes).length) out.push({ offerId: offer.id, changes, why: String(edit.why || '').slice(0, 500) });
  }
  return out;
}

const num = (s: string) => Number(s.replace(/[,₹\s]/g, ''));
const rupees = (s: string) => {
  const m = /₹?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|l|lakh)?/i.exec(s);
  if (!m) return null;
  const base = num(m[1]);
  const unit = (m[2] || '').toLowerCase();
  return unit === 'k' ? base * 1000 : unit.startsWith('l') ? base * 100000 : base;
};

/** No AI configured: understand the handful of edits people ask for most. */
export function ruleEdits(message: string, offers: OfferEditInput[]): OfferEditReply {
  const text = message.trim();
  const lower = text.toLowerCase();
  const changes: Record<string, any> = {};
  const notes: string[] = [];

  const disc = lower.match(/discount[^0-9]{0,20}(\d{1,2}(?:\.\d+)?)\s*%/) || lower.match(/(\d{1,2}(?:\.\d+)?)\s*%\s*off/);
  if (disc) {
    const pct = Number(disc[1]);
    if (pct > 50) notes.push('Discounts above 50% are outside policy, so that change was skipped.');
    else changes.pricing = { discount: pct / 100 };
  }
  const price = lower.match(/(?:price|ticket|asp)[^₹\d]{0,20}(₹?\s*[\d][\d,]*(?:\.\d+)?\s*(?:k|l|lakh)?)/);
  if (price) {
    const v = rupees(price[1]);
    if (v) changes.expected_asp = v;
  }
  const buyers = lower.match(/(\d[\d,]*)\s*(?:buyers|sales|purchases|units)/) || lower.match(/(?:buyers|sales|purchases|units)[^0-9]{0,20}(\d[\d,]*)/);
  if (buyers) changes.target_purchases = num(buyers[1]);
  const rename = text.match(/(?:rename|call it|name it)(?: (?:it|this|the offer))?(?: to| as)?\s*["“']?([^"”']{3,120})["”']?$/i);
  if (rename && offers.length === 1) changes.name = rename[1].trim();
  const cond = text.match(/(?:conditions?|terms?)\s*(?:to|:|=)\s*(.{3,})$/i);
  if (cond) changes.redemption_conditions = cond[1].trim();
  const cta = text.match(/\bcta\s*(?:to|:|=)\s*(.{2,})$/i);
  if (cta) changes.cta = cta[1].trim();
  const window = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-|–|until)\s*(\d{4}-\d{2}-\d{2})/);
  if (window) {
    changes.validity_start = window[1];
    changes.validity_end = window[2];
  }

  const edits = cleanEdits(
    offers.map(o => ({ offerId: o.id, changes, why: 'Applied as asked.' })),
    offers,
  );
  const reply = edits.length
    ? `Here ${edits.length === 1 ? 'is the change' : `are changes to ${edits.length} offers`}. Review and apply.`
    : 'AI is not configured, so I can only make simple edits — e.g. “discount to 15%”, “price ₹18,000”, “40 buyers”, “rename to Summer Reset”, “conditions: one per client”, “2027-03-01 to 2027-03-31”.';
  return { reply: [reply, ...notes].join(' '), edits, mode: 'rules' };
}

/** Asks the configured model for edits, then validates every one against the schema. */
export async function aiEdits(
  message: string,
  offers: OfferEditInput[],
  history: { role: string; content: string }[],
  context: { month?: number | null; year?: number | null; studio?: string | null },
): Promise<OfferEditReply> {
  const schema = {
    type: 'object',
    additionalProperties: false,
    required: ['reply', 'edits'],
    properties: {
      reply: { type: 'string' },
      edits: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['offerId', 'why', 'changes'],
          properties: {
            offerId: { type: 'integer' },
            why: { type: 'string' },
            changes: {
              type: 'object',
              additionalProperties: false,
              required: [...TEXT_FIELDS, 'target_purchases', 'expected_asp', 'discount_percent'],
              properties: {
                ...Object.fromEntries(TEXT_FIELDS.map(f => [f, { type: ['string', 'null'] }])),
                target_purchases: { type: ['number', 'null'] },
                expected_asp: { type: ['number', 'null'] },
                discount_percent: { type: ['number', 'null'] },
              },
            },
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
            'You edit fitness-studio sales offers for Physique 57 India. You receive the offers in scope and a request. ' +
            'Return only the changes the request asks for; set every untouched field to null. Prices are in rupees. ' +
            'discount_percent is the cash discount off list, 0–50. Dates are YYYY-MM-DD. Never invent performance data. ' +
            'If the request is a question or unclear, answer in `reply` and return no edits. Keep `reply` to two sentences.',
        },
        ...history.slice(-8).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
        { role: 'user', content: JSON.stringify({ request: message, context, offers }) },
      ],
      text: { format: { type: 'json_schema', name: 'p57_offer_edits', strict: true, schema } },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw Object.assign(new Error(`AI provider returned ${response.status}.`), { status: 502 });
  const payload = (await response.json()) as any;
  const text =
    payload.output_text ||
    payload.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === 'output_text')?.text;
  const parsed = replySchema.parse(JSON.parse(text));
  const raw = parsed.edits.map(e => {
    const { discount_percent, ...rest } = e.changes as any;
    const changes: Record<string, any> = { ...rest };
    if (typeof discount_percent === 'number') changes.pricing = { discount: discount_percent / 100 };
    return { offerId: e.offerId, changes, why: e.why };
  });
  return { reply: parsed.reply, edits: cleanEdits(raw, offers), mode: 'ai' };
}
