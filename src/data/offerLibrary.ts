// The final approved 2027 plan's offers as offer-bank templates. Each one pre-fills the manual builder,
// where the studio's real product prices and policy caps are applied before any number is trusted.
import { APPROVED_PLAN_2027, field, type ApprovedOffer, type ApprovedSlot } from './approvedPlan2027';

export interface OfferTemplate {
  id: string;
  name: string;
  family: 'Acquisition' | 'Conversion' | 'Retention' | 'Reactivation' | 'Referral' | 'Value' | 'Seasonal';
  mechanism: string;
  objective: string;
  audience: string;
  months: number[];
  benefit: string;
  hook: string;
  why: string;
  guardrail: string;
  mechanics: Record<string, any>;
}

const SLOT: Record<ApprovedSlot, Pick<OfferTemplate, 'family' | 'objective' | 'audience'>> = {
  newcomer: { family: 'Acquisition', objective: 'acquisition', audience: 'new_leads' },
  lapsed: { family: 'Reactivation', objective: 'reactivation', audience: 'recently_lapsed' },
  renewal: { family: 'Retention', objective: 'retention', audience: 'approaching_expiry' },
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Cash discount from the plan's “Effective discount” line; extras-only offers are value-adds. */
function mechanicsOf(offer: ApprovedOffer) {
  const cash = Number(/(\d+(?:\.\d+)?)% cash/.exec(field(offer, 'Effective discount'))?.[1] || 0);
  return cash > 0 ? { mechanism: 'percentage', discountPercent: cash } : { mechanism: 'experience' };
}

// One template per offer in the final approved 2027 plan, with every month it runs in.
export const OFFER_LIBRARY: OfferTemplate[] = (() => {
  const byName = new Map<string, OfferTemplate>();
  for (const e of APPROVED_PLAN_2027)
    for (const o of e.offers) {
      const seen = byName.get(o.name);
      if (seen) {
        if (!seen.months.includes(e.month)) seen.months.push(e.month);
        continue;
      }
      const mechanics = mechanicsOf(o);
      byName.set(o.name, {
        id: slug(o.name),
        name: o.name,
        ...SLOT[o.slot],
        mechanism: mechanics.mechanism,
        months: [e.month],
        benefit: [field(o, 'You pay'), field(o, 'You get', '; ')].filter(Boolean).join(' '),
        hook: o.tagline,
        why: field(o, 'Why it works'),
        guardrail: field(o, 'Rules', '; '),
        mechanics,
      });
    }
  return [...byName.values()].map(t => ({ ...t, months: t.months.sort((x, y) => x - y) }));
})();

export const FAMILY_TONES: Record<string, string> = {
  Acquisition: 'blue',
  Conversion: 'purple',
  Retention: 'green',
  Reactivation: 'amber',
  Referral: 'purple',
  Value: 'dark',
  Seasonal: 'red',
};
