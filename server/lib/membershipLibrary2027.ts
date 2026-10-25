import crypto from 'node:crypto';
import { db, audit } from '../db.js';
import { PRODUCT_KEYS, listPrice, planningStudios } from './linkedOffers.js';

// Always-on offer library: twelve archetypes per membership, so every membership in a studio's offer library has
// at least a dozen offers to pick from. Each copy is priced from that studio's own product list. Safe to re-run.
interface Archetype {
  id: string;
  name: (p: string) => string;
  headline: string;
  benefit: (p: string, unit: string) => string;
  copy: string;
  discount: number;
  objective: string;
  type: string;
  slot: 'newcomer' | 'lapsed' | 'renewal' | null;
  units: number;
  why: string;
}

const ARCHETYPES: Archetype[] = [
  { id: 'standing', name: p => `${p}: Standing Welcome`, headline: 'Convert new clients at the standing perk', benefit: p => `New clients get the standing 15% on the ${p}, bought within 72 hours of the trial.`, copy: 'Your first step, sorted.', discount: 0.15, objective: 'trial_conversion', type: 'percentage', slot: 'newcomer', units: 4, why: 'Median trial-to-purchase is 3 days; a 72-hour window keeps the decision fast without a deeper code.' },
  { id: 'bonus', name: p => `${p} + Bonus`, headline: 'Add value without cutting price', benefit: (p, u) => `${p} at list plus ${u} on us.`, copy: 'More shake, same price.', discount: 0.08, objective: 'trial_conversion', type: 'bonus_classes', slot: 'newcomer', units: 3, why: 'Spare capacity (42–45% fill) is cheaper than cash and protects the list price.' },
  { id: 'friend', name: p => `${p}: Bring a Friend`, headline: 'Referral acquisition', benefit: p => `Friend buys the ${p} at the standing 15%; referrer earns 2 bonus classes.`, copy: 'Better together. Literally.', discount: 0.15, objective: 'referral', type: 'referral', slot: 'newcomer', units: 2, why: 'Referrals convert at about 25% at Kwality, the cheapest channel we have.' },
  { id: 'earned', name: p => `${p}: Earn It Back`, headline: 'Reward attendance, not hesitation', benefit: p => `${p} at list; hit the attendance goal and 10% comes back as studio credit.`, copy: 'Show up. Get paid back.', discount: 0.1, objective: 'retention', type: 'fixed', slot: 'renewal', units: 3, why: 'Usage is the strongest renewal predictor (fully used 62% vs under-half 22%).' },
  { id: 'freeze', name: p => `${p}: Travel-Proof`, headline: 'Remove the travel objection', benefit: p => `${p} at list with 2 extra freezes for travel or illness.`, copy: 'Life happens. Your plan waits.', discount: 0, objective: 'retention', type: 'validity_extension', slot: 'renewal', units: 3, why: 'Freezes cost no cash and answer the most common lapse reason.' },
  { id: 'upgrade', name: p => `${p}: Trade-Up Credit`, headline: 'Move members up the ladder', benefit: p => `Upgrade to the ${p} within 14 days and the full price of the smaller product is credited.`, copy: 'Go bigger. Lose nothing.', discount: 0.05, objective: 'retention', type: 'fixed', slot: 'renewal', units: 2, why: 'Longer commitments renew better (3M 68–74% vs 1M 53–59%).' },
  { id: 'renew', name: p => `${p}: Renew at List + Perk`, headline: 'Renew without a code', benefit: p => `Renew the ${p} at list before expiry and get 2 guest passes plus priority booking.`, copy: 'Thank you for staying.', discount: 0, objective: 'retention', type: 'experience', slot: 'renewal', units: 5, why: 'Full-price renewers renew again at 61–68% vs 50–54% after discounts.' },
  { id: 'comeback', name: p => `${p}: Comeback`, headline: 'Reactivate lapsed clients', benefit: p => `Lapsed clients get the standing 15% on the ${p} plus a free comeback class.`, copy: 'Your mat missed you.', discount: 0.15, objective: 'reactivation', type: 'percentage', slot: 'lapsed', units: 4, why: 'People who already know the studio are the cheapest reach we have.' },
  { id: 'consult', name: p => `${p}: Reset Consult`, headline: 'Reactivate with a plan, not a price', benefit: p => `${p} at the standing 15% plus a 15-minute trainer reset and a 2-week attendance plan.`, copy: 'Back, with a plan.', discount: 0.15, objective: 'reactivation', type: 'experience', slot: 'lapsed', units: 3, why: 'Reactivations renew at only 37–47%; structure in the first weeks lifts that.' },
  { id: 'offpeak', name: p => `${p}: Golden Hours`, headline: 'Fill low-fill slots', benefit: p => `Students and under-25s: the ${p} at 20% off, valid weekday 10–12 and weekend 4–7 pm.`, copy: 'Your hours. Your price.', discount: 0.2, objective: 'acquisition', type: 'percentage', slot: 'newcomer', units: 2, why: 'Those slots run at 27–41% fill; fencing the hours protects peak pricing.' },
  { id: 'duo', name: p => `${p}: Duo`, headline: 'Two new clients per sale', benefit: p => `Two first-timers buy the ${p} together: 12% each + a shared 30-minute duo private.`, copy: 'Twice the shake.', discount: 0.12, objective: 'referral', type: 'referral', slot: 'newcomer', units: 2, why: 'Pairs keep each other attending; both buyers must be new.' },
  { id: 'flash', name: p => `${p}: 72-Hour Flash`, headline: 'Urgency in a soft week', benefit: p => `${p} at 10% off plus a P57 shaker bottle, 72 hours only.`, copy: '72 hours. Go.', discount: 0.1, objective: 'additional_purchase', type: 'percentage', slot: null, units: 3, why: 'A short named window drives the decision without training clients to wait.' },
];

const BONUS_UNIT: Record<string, string> = {
  '1M': '3 extra days', '3M': '7 extra days', '6M': '14 extra days', ANNUAL: '30 extra days',
  '8C': '1 bonus class', '12C': '2 bonus classes', '20C': '3 bonus classes', CC10: '1 bonus class',
  PRIV10: '1 bonus private', SINGLE: 'a free retail add-on',
};

export function applyMembershipLibrary(year: number, userId: number | null) {
  const counts = { created: 0, skipped: 0 };
  db.transaction(() => {
    for (const studio of planningStudios())
      for (const [key, { label }] of Object.entries(PRODUCT_KEYS)) {
        const list = listPrice(studio.id, key);
        if (!list) continue;
        for (const a of ARCHETYPES) {
          const sourceKey = `membership-library:${key}:${a.id}`;
          const exists = db
            .prepare(`SELECT id FROM offers WHERE studio_id=? AND year=? AND json_extract(provenance,'$.sourceKey')=?`)
            .get(studio.id, year, sourceKey);
          if (exists) { counts.skipped++; continue; }
          const asp = Math.round(list * (1 - a.discount));
          const product = label.charAt(0).toUpperCase() + label.slice(1);
          const id = db
            .prepare(
              `INSERT INTO offers(offer_uid,name,headline,benefit,customer_copy,rationale,internal_description,objective,offer_type,
               studio_id,month,year,audience,redemption_conditions,target_purchases,expected_asp,expected_revenue,revenue_target,
               effective_discount,source_campaign,status,approval_status,generation_source,data_mode,plan_slot,provenance,created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              `P57-${year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
              a.name(product), a.headline, a.benefit(product, BONUS_UNIT[key] || '1 bonus class'), a.copy,
              `Why: ${a.why}`, `Always-on ${label} offer from the membership library.`,
              a.objective, a.type, studio.id, year,
              a.slot === 'lapsed' ? 'Lapsed clients' : a.slot === 'renewal' ? 'Renewals due' : 'New clients / trials',
              'Does not stack a campaign % on the standing 15% new/lapsed or 10% pack perks.',
              a.units, asp, asp * a.units, asp * a.units, a.discount * 100,
              'Membership library', 'draft', 'pending', 'membership_library_2027', 'user', a.slot,
              JSON.stringify({ sourceKey, source: 'Membership library', linkGroup: `MLIB27-${key}-${a.id}`, pricing: { product: key, discount: a.discount, mechanic: a.headline } }),
              userId,
            ).lastInsertRowid;
          const row = db.prepare('SELECT * FROM offers WHERE id=?').get(id);
          db.prepare('INSERT INTO offer_versions(offer_id,version,snapshot,changed_by) VALUES (?,?,?,?)').run(id, 1, JSON.stringify(row), userId);
          counts.created++;
        }
      }
  })();
  audit({ userId, action: 'import_plan_offers', entityType: 'offers', entityId: String(year), after: counts, reason: 'Seeded the membership offer library.' });
  return counts;
}
