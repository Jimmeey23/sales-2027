import crypto from 'node:crypto';
import { db, audit } from '../db.js';
import { DEFAULT_PICKS, listPrice, planningStudios, saveSelection, selection } from './linkedOffers.js';

// “January 2027 — Top 25 Offers” (Oct 2026). Umbrella campaign: Resolution Insurance — “New Year resolutions fail by
// the second Friday. Yours comes with cover.” Units are per studio [Kemps Corner (KH), Bandra (SHQ), Kenkere (KK),
// Pop-up]; revenue (₹ lakh, incl. GST) is the document's line total, split across studios by units × local price.
interface JanOffer {
  n: number;
  name: string;
  job: string;
  audience: string;
  mechanic: string;
  discount: number;
  product: string | null;
  objective: string;
  type: string;
  window: [number, number];
  units: [number, number, number, number];
  totalL: number;
  why: string;
  logic: string;
  kpi?: string;
  slot?: 'newcomer' | 'lapsed' | 'renewal';
}

const OFFERS: JanOffer[] = [
  {
    n: 1,
    name: 'Resolution Insurance',
    job: 'Lift the first ticket from 1M/packs to 3M',
    audience: 'Studio trials, new leads',
    mechanic: '3M at 15% off + 1 bonus week, earned with 12 classes in the first 30 days',
    discount: 0.15,
    product: '3M',
    objective: 'trial_conversion',
    type: 'percentage',
    window: [1, 31],
    units: [3, 2, 2, 0],
    totalL: 3.03,
    why: "January's first purchases average ₹13–18k, while 3M buyers renew at 68–74% against 52–54% for small packs.",
    logic:
      'The only new-client offer with a price cut on a 3M; the bonus week is earned only by attending, so the "insurance" also builds the habit.',
    kpi: '≥30% of new-client revenue on 3M (Jan 2026: about 15%).',
    slot: 'newcomer',
  },
  {
    n: 2,
    name: 'The 72-Hour Fallback',
    job: 'Convert price-sensitive trials quickly',
    audience: 'Trials who decline Resolution Insurance',
    mechanic: '8-class at 10% off + 1 bonus class, valid 72h after the trial',
    discount: 0.1,
    product: '8C',
    objective: 'trial_conversion',
    type: 'percentage',
    window: [1, 31],
    units: [6, 5, 5, 0],
    totalL: 1.69,
    why: 'Conversion is fastest in the first 72 hours (median buy comes 3 days after the trial); trials who won’t take a 3M still need a yes.',
    logic: 'Offered only after #1 is declined, so it doesn’t pull 3M buyers down.',
    kpi: 'Studio-trial conversion of 35% (KH), 28% (SHQ), 25% (KK).',
  },
  {
    n: 3,
    name: "Quitter's Day Rescue",
    job: 'Recover trials before the resolution drop-off',
    audience: 'Trials 1 Dec–7 Jan, no purchase',
    mechanic: '12-class at 12% off + 1 bonus class',
    discount: 0.12,
    product: '12C',
    objective: 'trial_conversion',
    type: 'percentage',
    window: [4, 10],
    units: [3, 2, 1, 0],
    totalL: 0.98,
    why: 'Quitter’s Day (second Friday, 8 Jan 2027) is when resolutions break; December and early-January trials are the warmest unconverted list.',
    logic: 'A short 7-day window with a 12-class pack — a step above #2’s 8-class so it isn’t a cheaper copy.',
    kpi: '≥10% of the list buys.',
  },
  {
    n: 4,
    name: 'Resolution Buddies',
    job: 'Acquire in pairs (accountability)',
    audience: 'Two new clients buying together',
    mechanic: '1M at 20% off each, bought on one sale',
    discount: 0.2,
    product: '1M',
    objective: 'referral',
    type: 'percentage',
    window: [1, 31],
    units: [2, 2, 2, 0],
    totalL: 0.88,
    why: 'Referral leads convert far better than website leads (63–78% to purchase at the pop-ups), and a friend is the best attendance insurance.',
    logic: '20% applies only when two new clients check out on one sale, so it can’t be used alone.',
  },
  {
    n: 5,
    name: 'Bring Your Shaker',
    job: 'Referral acquisition at no price cost',
    audience: 'Active members as referrers',
    mechanic: 'Friend: 15% perk. Referrer: 2 bonus classes when the friend buys a commitment',
    discount: 0.15,
    product: '1M',
    objective: 'referral',
    type: 'referral',
    window: [1, 31],
    units: [2, 2, 2, 0],
    totalL: 0.94,
    why: 'Costs nothing in price; the referrer’s reward is spare capacity (studios run at 42–45% fill).',
    logic:
      'The friend gets only the standing perk; the referrer earns 2 classes only when the friend buys a commitment.',
    kpi: '1 referral ask per member renewal call.',
  },
  {
    n: 6,
    name: 'Encore',
    job: 'Make hosted and outdoor visits convert',
    audience: 'Hosted / outdoor attendees',
    mechanic: 'QR for a free studio class within 7 days, then 8-class at 15% off + 1 bonus within 72h',
    discount: 0.15,
    product: '8C',
    objective: 'trial_conversion',
    type: 'percentage',
    window: [1, 31],
    units: [2, 1, 3, 0],
    totalL: 0.56,
    why: 'Only 3 of 247 hosted and outdoor first-timers converted in January 2026 (Kenkere’s Peakst8: 1 of 170). The missing piece is the second step.',
    logic:
      'A free studio class within 7 days moves them into the studio, where conversion is 18–39%. Pack offer sits just under the cap at 24%.',
    kpi: '≥20% of event attendees book the studio class; ≥4% buy.',
  },
  {
    n: 7,
    name: 'First 48',
    job: 'Speed from website lead to trial',
    audience: 'Website and abandoned-checkout leads',
    mechanic: 'Trial within 48h of enquiry: trial price credited to a 1M/3M (replaces the 15% perk)',
    discount: 0.15,
    product: '1M',
    objective: 'acquisition',
    type: 'fixed',
    window: [1, 31],
    units: [1, 2, 1, 0],
    totalL: 0.64,
    why: 'Website leads are 41–55% of Bandra and Kenkere leads, and too many stall at “Shared pricing”.',
    logic:
      'Trial price is credited only if the trial happens within 48h — rewards speed, replaces the 15% perk rather than stacking.',
    kpi: 'Median enquiry → trial under 3 days.',
  },
  {
    n: 8,
    name: 'Off-Peak Resolution',
    job: 'Fill 11:00–16:00 seats; keep peak price intact',
    audience: 'Price-sensitive trials',
    mechanic: '1M valid for 11:00–16:00 classes at 20% off',
    discount: 0.2,
    product: '1M',
    objective: 'acquisition',
    type: 'percentage',
    window: [1, 31],
    units: [1, 1, 0, 0],
    totalL: 0.32,
    why: 'Afternoon trials convert at ~7% vs 14–17% mornings/evenings, and those seats are empty.',
    logic: 'A fenced product (11:00–16:00 only) lowers price without touching peak 1M pricing. Strength Lab excluded.',
  },
  {
    n: 9,
    name: 'Annual Re-Up',
    job: "Keep January's biggest tickets without codes",
    audience: 'Annual holders expiring Dec–Feb',
    mechanic: 'Renew at list + 1 month (step-up from last price capped at 10%)',
    discount: 0.08,
    product: 'ANNUAL',
    objective: 'annual_membership',
    type: 'validity_extension',
    window: [1, 31],
    units: [2, 1, 1, 0],
    totalL: 7.16,
    why: 'January 2026’s 8 annuals were worth ₹12.5L, sold at ~22% off with codes, and they come due now.',
    logic: 'Value comes as time (+1 month), not a code. Early access opens 15 Dec.',
    kpi: '≥50% of expiring annuals renew annual.',
  },
  {
    n: 10,
    name: 'Half-Year Resolution',
    job: 'Move 3M repeaters up to 6M',
    audience: '2+ prior 3M buyers',
    mechanic: '6M at 10% off + 2 weeks',
    discount: 0.1,
    product: '6M',
    objective: 'retention',
    type: 'percentage',
    window: [1, 31],
    units: [2, 1, 1, 0],
    totalL: 3.5,
    why: '6M/annual tickets made Bandra’s January 2026; without them Bandra falls ₹6.4L short.',
    logic: 'Only clients with 2+ prior 3M purchases qualify — upgrades loyal clients rather than discounting new ones.',
  },
  {
    n: 11,
    name: 'Go the Distance',
    job: 'Lift the renewal ticket',
    audience: '1M renewers with 8+ visits a month',
    mechanic: '3M at list + 1 week + 1 guest pass',
    discount: 0.07,
    product: '3M',
    objective: 'retention',
    type: 'bonus_classes',
    window: [1, 31],
    units: [3, 3, 3, 0],
    totalL: 4.48,
    why: '1M renewers attending 8+ times a month already pay for a 3M’s worth of classes.',
    logic:
      'Sold at list; the extra week and guest pass add value at no price cost, and the guest feeds Bring Your Shaker.',
    kpi: '≥30% of 8+-visit 1M renewers move to 3M.',
  },
  {
    n: 12,
    name: 'Pack-Up',
    job: 'Move small-pack repeaters to bigger packs',
    audience: '2+ buys of 4/8-class packs',
    mechanic: '20-class at the standing 10% + 2 bonus (KK: 12-class at list + 1 bonus)',
    discount: 0.1,
    product: '20C',
    objective: 'additional_purchase',
    type: 'bonus_classes',
    window: [1, 31],
    units: [2, 2, 2, 0],
    totalL: 1.66,
    why: '4/8-class repeat buyers renew at 52–54% and pay the highest per-class price — the easiest upgrade.',
    logic: 'Standing 10% pack perk plus 2 bonus classes beats the perk at 18%.',
  },
  {
    n: 13,
    name: "Teacher's Pet Pack",
    job: 'Stop private-session code leakage',
    audience: 'Privates clients',
    mechanic: '10 privates + 1 bonus private; PR1V@TE codes retired',
    discount: 0,
    product: 'PRIV10',
    objective: 'aov',
    type: 'bundle',
    window: [1, 31],
    units: [2, 1, 0, 0],
    totalL: 1.57,
    why: 'Kemps Corner privates ran at 34% discount through PR1V@TE codes, above the 25% cap.',
    logic: 'Retire the codes and sell privates only as a 10+1 pack (9% effective).',
    kpi: 'Zero private sales on codes.',
  },
  {
    n: 14,
    name: 'Renew Before the Bell',
    job: 'Renew before expiry, not after',
    audience: 'Members expiring 1 Jan–15 Feb',
    mechanic: 'Renew before the end date: unlimited +5 days, packs +2 classes',
    discount: 0,
    product: '1M',
    objective: 'retention',
    type: 'validity_extension',
    window: [1, 31],
    units: [12, 8, 8, 0],
    totalL: 5.32,
    why: '120 / 60 / 39 renewals are due. Renewing after expiry risks the 60-day lapse, and most sales land after day 21.',
    logic: 'A small bonus, only before the end date, pulls renewals into weeks 1–3.',
    kpi: '≥85% of planned renewal purchases by day 21.',
    slot: 'renewal',
  },
  {
    n: 15,
    name: 'Holiday Hangover',
    job: 'Stop December travellers drifting past 60 days',
    audience: 'Expired 1–60 days',
    mechanic: 'Renew in January, activated on first visit + 1 bonus class',
    discount: 0,
    product: '1M',
    objective: 'retention',
    type: 'bonus_classes',
    window: [2, 31],
    units: [4, 3, 3, 0],
    totalL: 1.73,
    why: 'December travel pushes clients past their end date; every day after 60 turns a renewal into a reactivation.',
    logic: 'Activation on first visit removes the “I’ll lose days” objection; the cost is 1 class.',
  },
  {
    n: 16,
    name: 'Habit Lock',
    job: 'Build the early habit that drives renewal',
    audience: 'Every January commitment buyer',
    mechanic: '12 classes in the first 30 days earns a free hosted class + trainer progress check',
    discount: 0,
    product: null,
    objective: 'retention',
    type: 'experience',
    window: [1, 31],
    units: [0, 0, 0, 0],
    totalL: 0,
    why: 'Renewers average twice the early visits of lapsers.',
    logic:
      'No discount; the reward is a hosted class and a trainer check-in. Runs to 28 Feb; no January revenue attributed.',
    kpi: '≥50% of January commitment buyers reach 12 classes; ≥55% renew at next expiry.',
  },
  {
    n: 17,
    name: 'New Year, Old Flame',
    job: 'Reactivate the lapsed',
    audience: 'Lapsed 61–365 days',
    mechanic: 'Standing 15% perk + free comeback class + 1 bonus class if they rebuy within 7 days',
    discount: 0.15,
    product: '1M',
    objective: 'reactivation',
    type: 'percentage',
    window: [2, 31],
    units: [7, 4, 3, 0],
    totalL: 2.13,
    why: '1,817 clients sit 61–365 days lapsed across the three studios.',
    logic:
      'The standing 15% lapsed perk made more appealing with a free comeback class; the bonus is earned only by buying within 7 days.',
    kpi: '~175 contacts at the 8% response hypothesis.',
    slot: 'lapsed',
  },
  {
    n: 18,
    name: 'High-Value Homecoming',
    job: 'Win back the most valuable clients personally',
    audience: 'Lapsed 61–730 days with ₹50k+ lifetime',
    mechanic: 'Trainer call + 3M at 15% off + 1 bonus week + a free assessment private',
    discount: 0.15,
    product: '3M',
    objective: 'reactivation',
    type: 'percentage',
    window: [2, 31],
    units: [2, 1, 1, 0],
    totalL: 1.76,
    why: '185 lapsed clients have spent ₹50k+; each one back on a 3M is worth more than four 8-class buyers.',
    logic: 'A personal trainer call, not a broadcast, with a 3M at 21% effective and an assessment private.',
    kpi: 'All 185 called by 20 January.',
  },
  {
    n: 19,
    name: 'Blue Monday Reunion',
    job: 'Reopen the 1–2-year dormant pool',
    audience: 'Lapsed 1–2 years',
    mechanic: 'Free hosted class on Mon 18 Jan, then the 15% perk + 1 bonus class within 7 days',
    discount: 0.15,
    product: '1M',
    objective: 'reactivation',
    type: 'experience',
    window: [18, 25],
    units: [2, 1, 1, 0],
    totalL: 0.51,
    why: 'Bandra (654) and Kenkere (435) have large 1–2-year dormant pools, mostly opening cohorts.',
    logic: 'Blue Monday is a natural reason to invite them to a hosted class; the bonus applies only within 7 days.',
    kpi: '≥40 attendees across studios.',
  },
  {
    n: 20,
    name: "Credit Where It's Due",
    job: 'Turn drop-in regulars into pack buyers',
    audience: 'Pop-up clients on their 3rd drop-in in 60 days',
    mechanic: 'C+C 10-pack with the last 2 drop-ins credited',
    discount: 0.11,
    product: 'CC10',
    objective: 'additional_purchase',
    type: 'fixed',
    window: [1, 31],
    units: [0, 0, 0, 4],
    totalL: 0.3,
    why: '67 pop-up clients bought 2+ drop-ins in 90 days, but only 3 packs sold in January 2026.',
    logic: 'Crediting drop-ins they’ve already paid for makes the pack feel free to start.',
  },
  {
    n: 21,
    name: 'Studio Passport',
    job: 'Feed Kenkere from the pop-ups',
    audience: 'Pop-up regulars',
    mechanic: '1 free Kenkere class, then the 8-class at the 15% perk',
    discount: 0.15,
    product: '8C',
    objective: 'acquisition',
    type: 'free_trial',
    window: [1, 31],
    units: [0, 0, 2, 0],
    totalL: 0.15,
    why: 'The pop-ups exist partly to feed Kenkere.',
    logic: 'A free Kenkere class, then Kenkere’s newcomer perk; credited to both teams.',
  },
  {
    n: 22,
    name: 'Pop-up Pack Refill',
    job: 'Pack renewals at the pop-ups',
    audience: 'Pack holders with ≤2 credits left',
    mechanic: 'Rebuy before the last class: +1 credit',
    discount: 0.09,
    product: 'CC10',
    objective: 'retention',
    type: 'bonus_classes',
    window: [1, 31],
    units: [0, 0, 0, 2],
    totalL: 0.17,
    why: 'Pack holders drift back to drop-ins when credits run out.',
    logic: '+1 credit only if they rebuy before the last class.',
  },
  {
    n: 23,
    name: 'The Second Date',
    job: 'Second visit before the sale at Kenkere',
    audience: 'Unconverted studio trials',
    mechanic: '2nd class free within 7 days, then the 15% perk on a 1M',
    discount: 0.15,
    product: '1M',
    objective: 'trial_conversion',
    type: 'free_trial',
    window: [1, 31],
    units: [0, 1, 1, 0],
    totalL: 0.3,
    why: 'Kenkere’s studio-trial conversion halved, from 38% (Jan 2025) to 18% (Jan 2026).',
    logic: 'A free second class costs only a seat and gives the trainer a second chance to sell.',
  },
  {
    n: 24,
    name: 'Team Resolution (pilot)',
    job: 'Test a corporate channel',
    audience: 'Groups of 5+ colleagues',
    mechanic: 'Each buys a 1M at 20% off + 1 private team class',
    discount: 0.2,
    product: '1M',
    objective: 'acquisition',
    type: 'percentage',
    window: [1, 31],
    units: [2, 0, 2, 0],
    totalL: 0.56,
    why: 'There is no corporate channel today; Lavelle Road and Kemps Corner sit near offices.',
    logic: 'A 5-person minimum and one private team class. Keep it if 1 group buys.',
  },
  {
    n: 25,
    name: 'Unwrap Round Two',
    job: 'Convert gift recipients',
    audience: 'Gift a Shake / Pre-Solution recipients',
    mechanic: 'Gift value credited to a 3M within 14 days of redeeming',
    discount: 0.08,
    product: '3M',
    objective: 'acquisition',
    type: 'fixed',
    window: [1, 31],
    units: [1, 0, 0, 0],
    totalL: 0.53,
    why: 'Gift recipients from October’s Gift a Shake and December’s Pre-Solution arrive in January as un-acquired clients.',
    logic: 'Gift value is credited only toward a 3M. Start tagging gift recipients in Momence.',
  },
];

export function applyJanuaryOffers(year: number, userId: number | null) {
  const studios = planningStudios(),
    order = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];
  const studioAt = (i: number) => studios.find(s => s.name === order[i]);
  const counts = { created: 0, skipped: 0 };
  const pad = (n: number) => String(n).padStart(2, '0');
  db.transaction(() => {
    const byStudio = new Map<number, { slots: Record<string, number | null>; ids: number[] }>();
    for (const o of OFFERS) {
      const group = `JAN27-${pad(o.n)}`;
      const local = o.units.map((u, i) => ({
        u,
        studio: studioAt(i),
        price: listPrice(studioAt(i)?.id || 0, o.product || '1M') || 0,
      }));
      const weight = local.reduce((s, x) => s + x.u * x.price, 0);
      // Offers with no attributed revenue (Habit Lock) still run everywhere.
      const targets = o.totalL ? local.filter(x => x.u > 0) : local;
      for (const x of targets) {
        if (!x.studio) continue;
        const existing = db
          .prepare(`SELECT id FROM offers WHERE studio_id=? AND year=? AND json_extract(provenance,'$.linkGroup')=?`)
          .get(x.studio.id, year, group) as any;
        let offerId = existing?.id;
        if (existing) counts.skipped++;
        else {
          const revenue = weight ? (o.totalL * 100000 * x.u * x.price) / weight : 0;
          const asp = x.u ? Math.round(revenue / x.u) : Math.round(x.price * (1 - o.discount));
          const rationale = [`Why: ${o.why}`, `Logic: ${o.logic}`, o.kpi ? `KPI: ${o.kpi}` : '']
            .filter(Boolean)
            .join('\n');
          offerId = db
            .prepare(
              `INSERT INTO offers(offer_uid,name,headline,benefit,rationale,internal_description,objective,offer_type,studio_id,month,year,audience,
               validity_start,validity_end,redemption_conditions,target_purchases,expected_asp,expected_revenue,revenue_target,effective_discount,
               source_campaign,status,approval_status,generation_source,data_mode,plan_slot,plan_rank,provenance,created_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            )
            .run(
              `P57-${year}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
              o.name,
              o.job,
              o.mechanic,
              rationale,
              `#${o.n} in the January 2027 Top 25. Umbrella: Resolution Insurance.`,
              o.objective,
              o.type,
              x.studio.id,
              1,
              year,
              o.audience,
              `${year}-01-${pad(o.window[0])}`,
              `${year}-01-${pad(o.window[1])}`,
              'One offer per purchase; does not stack on the standing 15% new/lapsed or 10% pack perks.',
              x.u,
              asp,
              revenue,
              revenue,
              o.discount * 100,
              'Resolution Insurance',
              'draft',
              'pending',
              'plan_jan_2027',
              'user',
              o.slot || null,
              o.slot ? 1 : null,
              JSON.stringify({
                linkGroup: group,
                source: 'January 2027 — Top 25 Offers',
                pricing: { product: o.product, discount: o.discount, mechanic: o.mechanic },
              }),
              userId,
            ).lastInsertRowid;
          counts.created++;
        }
        const pick = byStudio.get(x.studio.id) || { slots: { newcomer: null, lapsed: null, renewal: null }, ids: [] };
        if (o.slot) pick.slots[o.slot] = offerId;
        else pick.ids.push(offerId);
        byStudio.set(x.studio.id, pick);
      }
    }
    // Default to four picks: the three must-haves plus the single biggest other line. The rest of the 25 stay
    // one click away as alternates.
    for (const [studioId, pick] of byStudio) {
      const before = selection(studioId, year, 1);
      const slots = Object.fromEntries(
        Object.entries(pick.slots).map(([k, v]) => [k, v ?? before.slots[k] ?? null]),
      ) as Record<string, number | null>;
      const top = pick.ids
        .map(id => db.prepare('SELECT id, expected_revenue FROM offers WHERE id=?').get(id) as any)
        .sort((a, b) => b.expected_revenue - a.expected_revenue)
        .slice(0, Math.max(0, DEFAULT_PICKS - Object.values(slots).filter(Boolean).length))
        .map(o => o.id);
      saveSelection(studioId, year, 1, slots, top, userId);
    }
  })();
  audit({
    userId,
    action: 'import_plan_offers',
    entityType: 'offers',
    entityId: `${year}-01`,
    after: counts,
    reason: 'Imported January 2027 — Top 25 Offers.',
  });
  return counts;
}
