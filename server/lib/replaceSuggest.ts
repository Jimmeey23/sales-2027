// Replacement suggestions for one offer: Claude picks the best 1–3 alternates from the studio's
// offer bank and, where the bank is thin, drafts up to two fresh offers built for the same job.
import { z } from 'zod';
import { db } from '../db.js';
import { anthropicClient, COPILOT_MODEL } from './offerEditCopilot.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const brief = (o: any) => {
  let prov: any = {};
  try {
    prov = typeof o.provenance === 'string' ? JSON.parse(o.provenance || '{}') : o.provenance || {};
  } catch {}
  return {
    id: o.id,
    name: o.name,
    objective: o.objective,
    offer_type: o.offer_type,
    plan_slot: o.plan_slot,
    headline: o.headline,
    benefit: o.benefit ? String(o.benefit).slice(0, 300) : null,
    audience: o.audience,
    expected_asp: o.expected_asp,
    target_purchases: o.target_purchases,
    expected_revenue: o.expected_revenue,
    effective_discount: o.effective_discount,
    product: prov.pricing?.product ?? null,
  };
};

const schema = z.object({
  summary: z.string(),
  picks: z.array(z.object({ offerId: z.number().int(), why: z.string() })),
  fresh: z.array(
    z.object({
      name: z.string(),
      headline: z.string(),
      benefit: z.string(),
      audience: z.string(),
      offer_type: z.string(),
      objective: z.enum(['new_client', 'renewal', 'reactivation', 'upsell', 'retention']),
      expected_asp: z.number(),
      target_purchases: z.number(),
      discount_percent: z.number(),
      redemption_conditions: z.string(),
      why: z.string(),
    }),
  ),
});
export type ReplaceSuggestion = z.infer<typeof schema>;

export async function replaceSuggestions(input: {
  offerId: number;
  candidateIds: number[];
  month: number;
  year: number;
  theme?: string | null;
}): Promise<ReplaceSuggestion> {
  const current = db.prepare('SELECT * FROM offers WHERE id=?').get(input.offerId) as any;
  if (!current) throw Object.assign(new Error('Offer not found.'), { status: 404 });
  const ids = input.candidateIds.slice(0, 80);
  const candidates = ids.length
    ? (db.prepare(`SELECT * FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as any[])
    : [];
  const studio = current.studio_id
    ? (db.prepare('SELECT name, max_discount_percent FROM studios WHERE id=?').get(current.studio_id) as any)
    : null;
  const cap = Number(studio?.max_discount_percent ?? 20) || 20;
  const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod');
  const client = await anthropicClient(55_000);
  const response = await client.messages.parse({
    model: COPILOT_MODEL,
    max_tokens: 12000,
    output_config: { effort: 'medium', format: zodOutputFormat(schema) },
    system: `You help a Physique 57 India studio manager replace one offer in a month's sales plan. Prices in rupees.
Pick the 1-3 best replacements from the candidate bank offers: same job (objective/stream) first, a fit for the month and theme, and at least the current offer's revenue unless there is a clear strategic reason. Give each a one-sentence reason with the trade-off.
Then draft 0-2 fresh offers only if the bank has nothing strong; each must be concrete (real price, buyers, conditions), creative but premium in tone (no emojis or exclamation marks), discount 0-${cap}%.
summary: one sentence on what the current offer is missing.`,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          month: MONTHS[input.month - 1],
          year: input.year,
          studio: studio?.name,
          theme: input.theme || null,
          maxDiscountPercent: cap,
          current: brief(current),
          candidates: candidates.map(brief),
        }),
      },
    ],
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error('Claude returned an unexpected format.');
  const allowed = new Set(candidates.map(c => c.id));
  return {
    summary: parsed.summary,
    picks: parsed.picks.filter(p => allowed.has(p.offerId)).slice(0, 3),
    fresh: parsed.fresh.slice(0, 2).map(f => ({ ...f, discount_percent: Math.max(0, Math.min(f.discount_percent, cap)) })),
  };
}
