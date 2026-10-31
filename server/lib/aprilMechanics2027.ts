import crypto from 'node:crypto';
import { db, audit } from '../db.js';
import { CITY_PRICES, priceBookFor } from './offerCatalog.js';
import { POPUP_CHILDREN, POPUP_PARENT } from './plan2027.js';

/* April's three playable mechanics.

   The anniversary month sells one idea — nine years — three ways, and each way is a
   *game* a guest can see: a wheel they spin at the desk, a gold ticket that arrives in
   the post, nine numbered gifts a renewing member chooses between. The offers are real
   rows like every other offer; what sets them apart is `provenance.mechanics` — the
   prize list, the serial, the nine gifts — which the offer card draws as an animation
   instead of a photograph.

   Priced from the studio's own catalogue (server/data/membership-prices.json), so Mumbai
   and Bengaluru carry their own tariffs and nothing is invented. */

export type MechanicKind = 'wheel' | 'ticket' | 'gifts';

export interface AprilMechanic {
  kind: MechanicKind;
  name: string;
  headline: string;
  customer: string;
  brief: string;
  rationale: string;
  objective: string;
  offerType: string;
  audience: string;
  /** Catalogue product the price is struck from. */
  product: string;
  /** Share of list the client actually pays for the featured product. */
  priceFactor: number;
  /** Buyers needed at each location, in studio order. */
  units: [number, number, number, number];
  /** Effective discount, in per cent, counting perk value. */
  discount: number;
  /** How the mechanic actually runs, in the studio's language. */
  rules: string;
  when: string;
  scope: string[];
  success: string[];
  /** Anything the card's animation needs: prizes, serials, gift names. */
  art: Record<string, any>;
}

const STUDIOS = ['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT] as const;

export const APRIL_MECHANICS: AprilMechanic[] = [
  {
    kind: 'wheel',
    name: 'Ninth Anniversary Wheel',
    headline: 'One spin at the desk, nine years on the clock',
    customer:
      'Every first-time guest who books a class in April spins the wheel at reception. Nine wedges, one spin, no purchase needed to play.',
    brief:
      'A first-visit game that turns a walk-in into a booked pack. Every guest who takes a first class in April spins once at the desk; nine wedges hold nine prizes, from a free class to the 9-class pack that wins outright. The spin is the conversation, not the discount — it hands the front desk a reason to talk about a pack on the day somebody already liked the room.',
    rationale:
      'Nine years of Physique 57 India. Play at the desk, prize on the spot, no purchase needed to spin. A pack bought within 72 hours of the spin keeps its prize and takes the standing newcomer rate on top — never a deeper cash cut. One spin per phone number, prize logged against the offer.',
    objective: 'acquisition',
    offerType: 'experience',
    audience: 'First-time guests who take a class in April',
    product: 'Studio 8 Class Package',
    priceFactor: 0.85,
    units: [24, 18, 14, 8],
    discount: 15,
    rules:
      'One spin per phone number, at the desk, after a first class. The prize stands alone; the standing 15% newcomer rate applies to the pack it is spent on. 57 spins a week per studio, logged in the wheel book.',
    when: 'Every day in April, at the desk, after a first class',
    scope: ['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT],
    success: ['Spins per week', 'Spin → pack within 72 hours', 'Cost of prizes vs packs sold'],
    art: {
      prizes: [
        { label: 'Free class', short: '1 class' },
        { label: 'Two guest passes', short: '2 passes' },
        { label: '9% off a pack', short: '9% off' },
        { label: 'Free Strength Lab', short: 'Lab' },
        { label: '3 extra classes', short: '3 classes' },
        { label: 'Nine-class pack', short: '9 classes' },
        { label: 'Free private', short: 'Private' },
        { label: 'Retail box', short: 'Box' },
        { label: 'Annual upgrade', short: 'Annual' },
      ],
      landing: 5,
    },
  },
  {
    kind: 'ticket',
    name: 'The Golden Ticket',
    headline: 'Nine gold tickets, nine years, nine ways back',
    customer:
      'Nine gold-foil tickets go out by post to the oldest lapsed clients at each studio. Bring one back in April and your first private is on us.',
    brief:
      'A winback with an object in it. Each studio posts nine gold tickets — one for every year the brand has run — to the nine highest-value clients who stopped coming. The ticket is not a coupon: it is an invitation to a private class, hand-addressed, valid the whole month, and it can be handed to a friend instead. Anything the ticket-holder buys in April carries the standing comeback rate.',
    rationale:
      'Nine envelopes per studio to clients with the deepest lapsed value. A free private plus the standing comeback rate on any pack bought in April. The ticket is transferable once, which lets a lapsed client bring the friend they stopped coming with — the reason most of them lapsed in the first place.',
    objective: 'reactivation',
    offerType: 'experience',
    audience: 'The nine highest-value lapsed clients at each studio',
    product: 'Studio 12 Class Package',
    priceFactor: 0.85,
    units: [9, 9, 9, 4],
    discount: 15,
    rules:
      'Nine tickets per studio, numbered 1–9 and posted. Valid for one private class in April, transferable once to a named friend. Any pack bought on a ticket takes the standing comeback rate; the ticket never stacks with Club Nine.',
    when: 'Posted 25 March · valid 1–30 April',
    scope: ['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT],
    success: ['Tickets returned', 'Return → pack', 'Friends brought in on a transferred ticket'],
    art: {
      serials: 9,
      foundAt: 'hidden in the anniversary post',
      prize: 'A private class, on us',
    },
  },
  {
    kind: 'gifts',
    name: 'Nine Years, Nine Gifts',
    headline: 'Renew in April, choose your number',
    customer:
      'Renew or upgrade in April and pick one of nine numbered gifts. Number one is a private; number nine is a year of early booking.',
    brief:
      'A renewal with a choice in it, instead of a discount. Anyone who renews or moves up a tier in April chooses one of nine numbered gifts — the same nine in every studio, in a sealed box, so the choice is made on what the client actually wants rather than on what is cheapest to give. The gifts are all perk value: privates, guest passes, retail, early booking, a freeze, a coach session, a bring-a-friend month, and the anniversary box.',
    rationale:
      'Nine years, nine gifts, one choice per renewal. Every gift is perk value rather than cash (5.7% effective on a three-month upgrade), which protects the April price line while giving the member something to talk about. Stock is set per studio so the ninth gift cannot run out before the month closes.',
    objective: 'annual_membership',
    offerType: 'value_add',
    audience: 'Members renewing or upgrading in April',
    product: 'Studio 3 Month Unlimited Membership',
    priceFactor: 0.91,
    units: [9, 9, 9, 6],
    discount: 9,
    rules:
      'One gift per renewal, chosen at the desk from the numbered box, while stock lasts. Perk value only — no cash off the renewal. Does not stack with Club Nine or the Golden Ticket.',
    when: '1–30 April, on renewal or upgrade',
    scope: ['Kemps Corner', 'Bandra', 'Kenkere House', POPUP_PARENT],
    success: ['Renewals in April', 'Gift mix', 'Three-month-to-annual upgrades'],
    art: {
      gifts: [
        'Two extra privates',
        'Four guest passes',
        'Retail box',
        '48-hour early booking',
        'One freeze week',
        'A coach session',
        'Bring-a-friend month',
        'Strength Lab induction',
        'The anniversary box',
      ],
    },
  },
];

const cityOf = (studioName: string) => {
  const book = priceBookFor(studioName);
  return book.startsWith('Bengaluru') ? 'Bengaluru' : 'Mumbai';
};
const listPriceOf = (studioName: string, product: string) => Number(CITY_PRICES[cityOf(studioName)]?.[product] || 0);
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const uidFor = (studio: string, kind: MechanicKind, year: number) =>
  `APR${year}-MECH-${slug(studio).toUpperCase()}-${kind.toUpperCase()}`;

/**
 * Writes April's three mechanics for every location and attaches them to that month's plan.
 * Idempotent: the rows are keyed by a stable uid, and only ids this function owns are added to
 * (or removed from) the plan, so anything a planner has done to April survives a re-run.
 */
export function applyAprilMechanics(year = 2027, userId: number | null = null) {
  const counts = { created: 0, updated: 0, attached: 0 };
  const studios = db.prepare('SELECT id,name FROM studios').all() as Array<{ id: number; name: string }>;
  const byName = new Map(studios.map(s => [s.name, s.id]));
  const insert = db.prepare(`
    INSERT INTO offers(
      offer_uid,name,headline,customer_copy,internal_description,rationale,objective,offer_type,
      studio_id,month,year,audience,benefit,mechanics,validity_start,validity_end,redemption_conditions,
      target_purchases,expected_asp,expected_revenue,effective_discount,revenue_target,
      status,approval_status,generation_source,data_mode,financials,risks,success_metrics,provenance,
      plan_slot,plan_rank,created_by
    ) VALUES (
      @offer_uid,@name,@headline,@customer_copy,@internal_description,@rationale,@objective,@offer_type,
      @studio_id,@month,@year,@audience,@benefit,@mechanics,@validity_start,@validity_end,@redemption_conditions,
      @target_purchases,@expected_asp,@expected_revenue,@effective_discount,@revenue_target,
      @status,@approval_status,@generation_source,@data_mode,@financials,@risks,@success_metrics,@provenance,
      @plan_slot,@plan_rank,@created_by
    )`);
  const update = db.prepare(`
    UPDATE offers SET
      name=@name, headline=@headline, customer_copy=@customer_copy, internal_description=@internal_description,
      rationale=@rationale, objective=@objective, offer_type=@offer_type, audience=@audience, benefit=@benefit,
      mechanics=@mechanics, validity_start=@validity_start, validity_end=@validity_end,
      redemption_conditions=@redemption_conditions, target_purchases=@target_purchases, expected_asp=@expected_asp,
      expected_revenue=@expected_revenue, effective_discount=@effective_discount, revenue_target=@revenue_target,
      financials=@financials, risks=@risks, success_metrics=@success_metrics, provenance=@provenance,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=@id`);

  const tx = db.transaction(() => {
    for (const studio of STUDIOS) {
      const studioId = byName.get(studio);
      if (!studioId) continue;
      const unitIndex = STUDIOS.indexOf(studio);
      const owned: number[] = [];
      for (const mechanic of APRIL_MECHANICS) {
        if (!mechanic.scope.includes(studio)) continue;
        const list = listPriceOf(studio, mechanic.product);
        const price = Math.round(list * mechanic.priceFactor);
        const units = mechanic.units[unitIndex] ?? 0;
        const revenue = price * units;
        const uid = uidFor(studio, mechanic.kind, year);
        const row: Record<string, any> = {
          offer_uid: uid,
          name: mechanic.name,
          headline: mechanic.headline,
          customer_copy: mechanic.customer,
          internal_description: `${mechanic.kind} mechanic · ${mechanic.product} · ${cityOf(studio)} catalogue price`,
          rationale: mechanic.brief,
          objective: mechanic.objective,
          offer_type: mechanic.offerType,
          studio_id: studioId,
          month: 4,
          year,
          audience: mechanic.audience,
          benefit: mechanic.headline,
          mechanics: JSON.stringify({ mechanism: mechanic.offerType, summary: mechanic.headline }),
          validity_start: `${year}-04-01`,
          validity_end: `${year}-04-30`,
          redemption_conditions: mechanic.rules,
          target_purchases: units,
          expected_asp: price,
          expected_revenue: revenue,
          effective_discount: mechanic.discount,
          revenue_target: revenue,
          status: 'draft',
          approval_status: 'pending',
          generation_source: 'april_mechanics_2027',
          data_mode: 'plan',
          financials: JSON.stringify({
            listPrice: list,
            sellingPrice: price,
            expectedRevenue: revenue,
            requiredBuyers: units,
            effectiveDiscountPercent: mechanic.discount,
          }),
          risks: JSON.stringify(['Prize stock is finite — set the count before the month opens.']),
          success_metrics: JSON.stringify(mechanic.success),
          provenance: JSON.stringify({
            source: 'P57 2027 anniversary mechanics',
            moment: 'Physique 57 anniversary · 18 Apr',
            pricing: {
              product: mechanic.product,
              listPrice: list,
              customListPrice: list,
              mechanic: mechanic.headline,
            },
            mechanicArt: mechanic.kind,
            mechanic: {
              kind: mechanic.kind,
              when: mechanic.when,
              rules: mechanic.rules,
              ...mechanic.art,
            },
          }),
          plan_slot: null,
          plan_rank: null,
          created_by: userId,
        };
        const existing = db.prepare('SELECT id FROM offers WHERE offer_uid=?').get(uid) as any;
        if (existing) {
          update.run({ ...row, id: existing.id });
          owned.push(existing.id);
          counts.updated++;
        } else {
          const id = Number(insert.run(row).lastInsertRowid);
          owned.push(id);
          counts.created++;
        }
      }

      // Attach to the month's plan as listed offers, beside whatever the month already picked.
      const plan = db
        .prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=4')
        .get(studioId, year) as any;
      if (!plan) continue;
      const current: number[] = (() => {
        try {
          return JSON.parse(plan.offer_ids || '[]');
        } catch {
          return [];
        }
      })();
      const mine = new Set(
        (
          db
            .prepare("SELECT id FROM offers WHERE studio_id=? AND year=? AND generation_source='april_mechanics_2027'")
            .all(studioId, year) as any[]
        ).map(r => Number(r.id)),
      );
      const next = [...current.filter(id => !mine.has(Number(id))), ...owned];
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        db.prepare('UPDATE monthly_plans SET offer_ids=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(
          JSON.stringify([...new Set(next)]),
          plan.id,
        );
        counts.attached++;
      }
    }
  });
  tx();

  audit({
    userId,
    action: 'import',
    entityType: 'april_mechanics_2027',
    entityId: year,
    after: { ...counts, mechanics: APRIL_MECHANICS.map(m => m.kind) },
    reason: 'April anniversary mechanics: the wheel, the golden ticket and the nine gifts.',
  });
  return counts;
}

/** Stable uid helper, exported so tests and scripts can look rows up without duplicating the format. */
export const aprilMechanicUid = (studio: string, kind: MechanicKind, year = 2027) => uidFor(studio, kind, year);
export { POPUP_CHILDREN };
