import crypto from 'node:crypto';
import { db } from '../db.js';
import { POPUP_CHILDREN, POPUP_PARENT } from './plan2027.js';

import fs from 'node:fs';
import path from 'node:path';

// Official membership catalogue (Momence "Sales - Raw - Memberships"), stored ex-GST; shown here incl. 5% GST.
// Bengaluru: 1M ₹13,900 → ₹14,595 (matches the workbook); Mumbai: 1M ₹19,275 → ₹20,239 (matches the playbook).
const CATALOGUE: Array<{ city: string; name: string; priceInclGst: number }> = JSON.parse(
  fs.readFileSync(path.resolve('server/data/membership-prices.json'), 'utf8'),
);
export const CITY_PRICES: Record<string, Record<string, number>> = {};
for (const m of CATALOGUE) (CITY_PRICES[m.city] ||= {})[m.name] = m.priceInclGst;
const priceOf = (city: string, product: string) =>
  CITY_PRICES[city]?.[product] ??
  (product === 'Copper + Cloves Buddy Pass (2)'
    ? (CITY_PRICES.Bengaluru['Copper + Cloves Single Class Package'] || 945) * 2
    : 0);
const cityOfBook = (book: string) => (book.startsWith('Bengaluru') ? 'Bengaluru' : 'Mumbai');
export function priceBookFor(studioName: string) {
  if (studioName === 'Kenkere House') return 'Bengaluru · Kenkere House';
  if (studioName === POPUP_PARENT || POPUP_CHILDREN.includes(studioName)) return 'Bengaluru · Pop-up';
  return 'Mumbai';
}

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
const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
export const SLOTS = ['newcomer', 'lapsed', 'renewal'] as const;
export type Slot = (typeof SLOTS)[number];

// Month-flavoured names so every month's options read as distinct campaigns.
const FLAVOUR = [
  'Fresh Start',
  'Love the Burn',
  'Spring Reset',
  'Anniversary',
  'Strong Together',
  'Longest Day',
  'Monsoon',
  'Friends',
  'Heart Month',
  'Festive',
  'Black Friday',
  'Year-End',
];

type Template = {
  name: string;
  product: string;
  discount?: number;
  fixedPrice?: number;
  bonusValue?: number;
  gets: string;
  audience: string;
  objective: string;
  offerType: string;
  why: string;
};
// Primary (rank 1) and alternate (rank 2) option per slot, per price book. Discounts follow the standing perks:
// 15% first purchase for newcomers and lapsed 60+ days, ≤10% or bonus value for renewals, never stacked.
const TEMPLATES: Record<string, Record<Slot, [Template, Template]>> = {
  'Bengaluru · Kenkere House': {
    newcomer: [
      {
        name: 'Newcomer Starter',
        product: 'Studio 2 Week Unlimited',
        discount: 0.15,
        gets: '2-week unlimited at the 15% newcomer price; full value credited if they buy 1M/3M within 14 days',
        audience: 'First-time clients',
        objective: 'acquisition',
        offerType: 'percentage',
        why: 'Paid first visits convert at 40% vs 3% for hosted classes; a credit-back starter moves trials to commitment.',
      },
      {
        name: 'Paid Trial, Credited',
        product: 'Studio Single Class',
        gets: 'Trial class at ₹1,418, credited in full against a pack or membership bought within 72 hours',
        audience: 'Trial leads',
        objective: 'trial_conversion',
        offerType: 'fixed',
        why: 'Workbook always-on programme: paid trials convert at 40% vs 24% for free trials.',
      },
    ],
    lapsed: [
      {
        name: 'Comeback 1M',
        product: 'Studio 1 Month Unlimited Membership',
        discount: 0.15,
        bonusValue: 1417.5,
        gets: '1M unlimited at the standing 15% lapsed perk + a free comeback class',
        audience: 'Lapsed 60+ days',
        objective: 'reactivation',
        offerType: 'percentage',
        why: 'Reactivating lapsed clients is cheaper than acquiring new ones while lead flow is weak.',
      },
      {
        name: 'We Saved Your Spot',
        product: 'Studio 2 Week Unlimited',
        fixedPrice: 4999,
        gets: '2-week unlimited for ₹4,999, fully credited to a 1M within 14 days',
        audience: 'Lapsed 60+ days',
        objective: 'reactivation',
        offerType: 'fixed',
        why: 'Low-commitment way back in that ladders straight into a 1M.',
      },
    ],
    renewal: [
      {
        name: 'Early Renewal',
        product: 'Studio 1 Month Unlimited Membership',
        discount: 0.1,
        bonusValue: 2432.5,
        gets: 'Renew 1M before expiry at 10% off + 5 bonus days',
        audience: 'Active 1M members expiring this month',
        objective: 'retention',
        offerType: 'percentage',
        why: 'Only ~46% of 1M buyers repurchase within 60 days; an early-renewal reward targets the drop-off.',
      },
      {
        name: '3M Upgrade',
        product: 'Studio 3 Month Unlimited Membership',
        discount: 0.15,
        bonusValue: 3649,
        gets: 'Upgrade to 3M at 15% off + 7 bonus days',
        audience: '1M members with 8+ visits a month',
        objective: 'retention',
        offerType: 'percentage',
        why: '3M renews at 71% vs 59% for 1M; steering frequent users up lifts the renewal ticket.',
      },
    ],
  },
  'Bengaluru · Pop-up': {
    newcomer: [
      {
        name: 'First Pop-up Class',
        product: 'Copper + Cloves Single Class Package',
        fixedPrice: 599,
        gets: 'First pop-up class at ₹599',
        audience: 'First-time clients',
        objective: 'acquisition',
        offerType: 'fixed',
        why: 'Pop-up acquisition is door-led (88–90% of first visits pay); a low first-class price widens the funnel.',
      },
      {
        name: 'Starter Eight',
        product: 'Copper + Cloves 8 Class Package',
        discount: 0.15,
        gets: '8-class Copper + Cloves pack at the 15% newcomer price',
        audience: 'First-time clients',
        objective: 'acquisition',
        offerType: 'percentage',
        why: 'Bridges single credits and 8/10 packs for new clients.',
      },
    ],
    lapsed: [
      {
        name: 'Back at the Pop-up',
        product: 'Copper + Cloves 8 Class Package',
        discount: 0.15,
        bonusValue: 945,
        gets: '8-class pack at the 15% lapsed perk + a free comeback class',
        audience: 'Lapsed 60+ days',
        objective: 'reactivation',
        offerType: 'percentage',
        why: 'Turns lapsed drop-in clients into pack holders.',
      },
      {
        name: 'Buddy Comeback',
        product: 'Copper + Cloves Buddy Pass (2)',
        fixedPrice: 1299,
        gets: '2 classes for ₹1,299 — bring a friend back with you',
        audience: 'Lapsed 60+ days',
        objective: 'reactivation',
        offerType: 'fixed',
        why: 'Low-ticket return with a referral built in.',
      },
    ],
    renewal: [
      {
        name: 'Pack Refill 10+2',
        product: 'Copper + Cloves 10 Class Pack',
        bonusValue: 1890,
        gets: '10-class pack at list + 2 bonus classes when refilling before credits run out',
        audience: 'Current pack holders',
        objective: 'retention',
        offerType: 'bonus_classes',
        why: '75% of pop-up revenue is single credits; bonus classes make the pack the obvious refill.',
      },
      {
        name: 'Credit Where It’s Due',
        product: 'Copper + Cloves 10 Class Pack',
        fixedPrice: 6615,
        gets: 'Last 2 drop-ins credited toward a 10-class pack (~₹6,615)',
        audience: 'Drop-in regulars (3+ visits in 60 days)',
        objective: 'retention',
        offerType: 'fixed',
        why: 'The 186 drop-in regulars already spend about half a pack a year.',
      },
    ],
  },
  Mumbai: {
    newcomer: [
      {
        name: 'Commitment Issues Pack',
        product: 'Studio 3 Month Unlimited Membership',
        discount: 0.15,
        bonusValue: 3885,
        gets: '3M unlimited at 15% off + 2 guest passes for friends',
        audience: 'New leads and first-timers',
        objective: 'acquisition',
        offerType: 'percentage',
        why: 'Revenue-led new-client offer: ≈₹49.2k first ticket; 3M renews 68–74%.',
      },
      {
        name: 'First Eight',
        product: 'Studio 8 Class Package',
        discount: 0.1,
        bonusValue: 1942.5,
        gets: '8-class pack at 10% off + 1 bonus class',
        audience: 'Price-sensitive trial clients',
        objective: 'trial_conversion',
        offerType: 'percentage',
        why: 'Conversion-led fallback: highest conversion, ≈₹11.8k first ticket.',
      },
    ],
    lapsed: [
      {
        name: 'Text Your Ex-ercise',
        product: 'Studio 1 Month Unlimited Membership',
        discount: 0.15,
        bonusValue: 1942.5,
        gets: 'Standing 15% lapsed perk on 1M + a free comeback class; +1 bonus class if they rebuy within 7 days',
        audience: 'Lapsed 61–365 days',
        objective: 'reactivation',
        offerType: 'percentage',
        why: 'Reactivations earn ₹4.8–7.6k each; low-cost outreach at scale.',
      },
      {
        name: 'Comeback Twelve',
        product: 'Studio 12 Class Package',
        discount: 0.15,
        bonusValue: 1942.5,
        gets: '12-class pack at the 15% lapsed perk + a comeback class',
        audience: 'Lapsed 181–365 days and 1–2 years',
        objective: 'reactivation',
        offerType: 'percentage',
        why: 'A pack suits clients who drifted off unlimited.',
      },
    ],
    renewal: [
      {
        name: 'Lock It In',
        product: 'Studio 1 Month Unlimited Membership',
        bonusValue: 5827.5,
        gets: 'Renew at the current price + 3 bonus classes; no % off',
        audience: 'Members expiring this month (T−14 list)',
        objective: 'retention',
        offerType: 'bonus_classes',
        why: 'Renewal offers are bonus classes, never % off; protects the ₹24k renewal ticket.',
      },
      {
        name: 'The Long Game',
        product: 'Studio 3 Month Unlimited Membership',
        bonusValue: 11655,
        gets: 'Upgrade to 3M at list + 6 bonus classes',
        audience: '1M renewers with 8+ visits a month',
        objective: 'annual_membership',
        offerType: 'bonus_classes',
        why: 'Higher-value purchase without a price cut; 3M renews best.',
      },
    ],
  },
};

// Units per slot as a share of the month's plan counts; editable per offer afterwards.
function unitsFor(slot: Slot, rank: number, target: any) {
  const a = JSON.parse(target?.assumptions || '{}'),
    f = JSON.parse(target?.funnel || '{}');
  const share = rank === 1 ? 1 : 0.4;
  if (a.workbook) {
    const w = a.workbook;
    const base =
      slot === 'newcomer'
        ? (w.newPaying || 0) * 0.25
        : slot === 'lapsed'
          ? (w.existingPaying || 0) * 0.05
          : (w.existingPaying || 0) * 0.12;
    return Math.max(1, Math.round(base * share));
  }
  const p = a.playbook || {};
  const base =
    slot === 'newcomer'
      ? (p.buyers ?? f.requiredNewBuyers ?? 0) * 0.3
      : slot === 'lapsed'
        ? (p.reactivated || 0) * 0.3
        : (p.renewalPurchases || 0) * 0.15;
  return Math.max(1, Math.round(base * share));
}

// Tags the workbook's own offers with a slot where their audience makes it clear.
function workbookSlot(o: any): Slot | null {
  const a = `${o.audience || ''} ${o.name}`.toLowerCase();
  if (/lapsed/.test(a)) return 'lapsed';
  if (/first-time|newcomer/.test(a)) return 'newcomer';
  if (/renew|expiring|active 1m|travelling members|most active/.test(a)) return 'renewal';
  return null;
}

export function applySlotOffers(year: number, userId: number | null) {
  const counts = { tagged: 0, created: 0, updated: 0 };
  const tx = db.transaction(() => {
    db.prepare("UPDATE offers SET plan_slot=NULL, plan_rank=NULL WHERE year=? AND generation_source='plan_2027'").run(
      year,
    );
    for (const studioName of ['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT]) {
      const studio = db.prepare('SELECT * FROM studios WHERE name=?').get(studioName) as any;
      if (!studio) continue;
      const book = priceBookFor(studioName),
        city = cityOfBook(book);
      for (let month = 1; month <= 12; month++) {
        const target = db
          .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?')
          .get(studio.id, year, month) as any;
        // Bengaluru: the workbook's own offer fills the slot first when it targets that audience.
        const own = db
          .prepare(
            "SELECT * FROM offers WHERE studio_id=? AND year=? AND month=? AND generation_source='plan_2027' AND offer_uid NOT LIKE 'PLAN27-SLOT-%'",
          )
          .all(studio.id, year, month) as any[];
        const filled = new Set<Slot>();
        if (book !== 'Mumbai')
          for (const o of own) {
            const slot = workbookSlot(o);
            if (!slot || filled.has(slot)) continue;
            db.prepare('UPDATE offers SET plan_slot=?, plan_rank=1 WHERE id=?').run(slot, o.id);
            filled.add(slot);
            counts.tagged++;
          }
        for (const slot of SLOTS) {
          TEMPLATES[book][slot].forEach((t, i) => {
            const rank = filled.has(slot) ? i + 2 : i + 1;
            const list = priceOf(city, t.product);
            const price = t.fixedPrice ?? Math.round(list * (1 - (t.discount || 0)));
            const units = unitsFor(slot, rank, target);
            const valuePct = list ? Math.round((1 - price / (list + (t.bonusValue || 0))) * 1000) / 10 : null;
            const uid = `PLAN27-SLOT-${crypto.createHash('sha1').update([studioName, year, month, slot, i].join('|')).digest('hex').slice(0, 10).toUpperCase()}`;
            const row: Record<string, any> = {
              name: `${FLAVOUR[month - 1]} ${t.name}`,
              headline: `${MONTHS[month - 1]} ${slot} offer`,
              customer_copy: t.gets,
              benefit: t.gets,
              internal_description: `${slot[0].toUpperCase()}${slot.slice(1)} slot · ${rank === 1 ? 'primary' : 'alternate'} · ${t.product} · ${city} catalogue prices`,
              rationale: t.why,
              objective: t.objective,
              offer_type: t.offerType,
              studio_id: studio.id,
              month,
              year,
              audience: t.audience,
              validity_start: `${year}-${pad(month)}-01`,
              validity_end: `${year}-${pad(month)}-${lastDay(year, month)}`,
              redemption_conditions:
                'Replaces the standing 15% newcomer/lapsed and 10% pack perks — never stacks with them or another offer.',
              target_purchases: units,
              expected_asp: price,
              expected_revenue: price * units,
              revenue_target: price * units,
              effective_discount: t.discount
                ? t.discount * 100
                : list && t.fixedPrice
                  ? Math.round((1 - t.fixedPrice / list) * 1000) / 10
                  : 0,
              status: 'draft',
              approval_status: 'pending',
              generation_source: 'plan_2027',
              data_mode: 'plan',
              plan_slot: slot,
              plan_rank: rank,
              provenance: JSON.stringify({
                source: `Monthly ${slot} slot · ${city} membership catalogue (incl. GST)`,
                product: t.product,
                listPrice: list,
                offerPrice: price,
                bonusValue: t.bonusValue || 0,
                valueToClientPct: valuePct,
                unitsBasis: 'Planning assumption from the month’s target counts — edit units to fit the studio.',
              }),
            };
            const existing = db.prepare('SELECT id FROM offers WHERE offer_uid=?').get(uid) as any;
            const cols = Object.keys(row);
            if (existing) {
              db.prepare(
                `UPDATE offers SET ${cols.map(c => `${c}=?`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`,
              ).run(...Object.values(row), existing.id);
              counts.updated++;
            } else {
              db.prepare(
                `INSERT INTO offers(offer_uid,created_by,${cols.join(',')}) VALUES (?,?${',?'.repeat(cols.length)})`,
              ).run(uid, userId, ...Object.values(row));
              counts.created++;
            }
          });
        }
      }
    }
  });
  tx();
  return counts;
}
