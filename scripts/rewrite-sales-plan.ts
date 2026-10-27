/* Rewrites the 2027 sales and offer plan so every month is argued from its offers and revenue
   streams rather than from the calendar.

   Two things change in `server/data/sales-offer-plan-2027.json`:

   1. Copy. Every month gets a theme, hook, commercial job and offer architecture written in
      revenue terms — renewals, new clients, winbacks, gifting, upgrades. No festival, no
      "important day". The same copy is applied to all four planning locations; figures stay
      per-location because the importer prices them from each studio's own product list.

   2. Shape. The plan carries at most **two offers per stream** — two new-client, two renewal,
      two winback. One fills the month's slot, its companion rides beside it in the month, and
      the third offer drops back into the location's offer bank as a library alternative.

   April is the exception: its flagship is rewritten as a grander, numbered anniversary
   membership, and the month carries a full anniversary programme of events and activities.

   Run: npx tsx scripts/rewrite-sales-plan.ts   (then `npm run plan:offers`) */

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('server/data/sales-offer-plan-2027.json');

interface Copy {
  theme: string;
  hook: string;
  job: string;
  moment: string;
}

// ── The twelve months, argued from the offer and the revenue stream ───────────
const MONTH_COPY: Record<number, Copy> = {
  1: {
    theme: 'The Re-Up',
    hook: 'Renewal book + full-price trial conversion',
    job: 'Re-up the expiring annual book at full value, convert trial demand at full price, and reactivate the lapsed — without setting a discount anchor for the year.',
    moment:
      'The month is built from three revenue streams. Renewals carry it: an annual book comes due and is re-signed in a ladder of longer terms. New clients convert from trial at list, with a refund-of-habit mechanism instead of a price cut. Winback works the lapsed list with a single, honest comeback offer.',
  },
  2: {
    theme: 'The Second Seat',
    hook: 'Referral-led new client growth',
    job: 'Grow new clients through the second seat rather than a discount: the companion membership is the offer, and the first membership is never cut.',
    moment:
      'New clients are the growth stream this month, and they arrive in pairs. A duo rate prices the second seat, a referral credit pays out in classes rather than cash, and winback returns to the members who left as a pair — so acquisition is bought with product, not with margin.',
  },
  3: {
    theme: 'The Homecoming',
    hook: 'Winback of the launch-year book',
    job: 'Rebuild the reactivation stream: bring the lapsed launch cohort home on a reunion offer, and close March trials inside the month instead of letting them slide into April.',
    moment:
      'Reactivation is the month’s growth stream. A reunion-led winback works the oldest cohort on the book, a trial offer closes in-week so demand does not defer, and a renewal ladder protects the first-quarter book while acquisition runs warm rather than loud.',
  },
  4: {
    theme: 'Still Shaking',
    hook: 'The anniversary: numbered annuals, capped and closed',
    job: 'Sell the year’s flagship — numbered annual memberships, capped by seat count and hard-closed on a date — inside an anniversary programme that fills the room for a month.',
    moment:
      'The anniversary is the product, and the flagship is a numbered annual: scarce, tiered, and sold as belonging rather than as a price. Around it runs the birthday programme — a coronation gala, themed classes across all formats, a founding-members wall, and daily celebration moments — so the renewal stream is sold by the room, not by a discount.',
  },
  5: {
    theme: 'The Afterparty',
    hook: 'Second purchase: converting the flagship cohort',
    job: 'Turn the anniversary’s buyers into a habit: eight classes inside thirty days, then the second purchase, before the flagship glow wears off.',
    moment:
      'April sold the membership; this month sells the second one. The renewal stream is built on usage — a thirty-day plan, an upgrade path for anyone who is ready for a longer term, and a winback for the buyers who never came back.',
  },
  6: {
    theme: 'The Freeze',
    hook: 'Retention: dated freezes instead of cancellations',
    job: 'Protect the book: convert cancellation intent into dated freezes, keep the direct debits alive, and hold intake with a low-commitment newcomer offer.',
    moment:
      'Retention is the revenue stream. A freeze with a return date replaces the cancellation, the renewal ladder runs early so nothing lapses by default, and a short-ticket newcomer offer keeps the front door open while the book is held.',
  },
  7: {
    theme: 'The Attendance Book',
    hook: 'Engagement as the leading indicator of renewal',
    job: 'Hold attendance so the renewals that fall due actually land: streaks, grace on late cancels, and a renewal priced before the drop.',
    moment:
      'Renewal is decided weeks after attendance moves, so the month’s offers are behavioural rather than financial: a streak that makes showing up visible, a small grace on late cancels, and a renewal ladder sold to people who are still coming.',
  },
  8: {
    theme: 'The Upgrade',
    hook: 'Term ladder: 1M → 3M → 6M',
    job: 'Move the one-month book onto longer terms — the same member at a longer commitment, not a cheaper one — and fill the new seats by referral.',
    moment:
      'The upgrade path is the growth stream. One month becomes three, three becomes six, each priced on commitment; a squad referral brings in the new seats without a discount, and winback returns the lapsed to the same ladder.',
  },
  9: {
    theme: 'The Comeback Cohort',
    hook: 'Reactivation at scale, one start date',
    job: 'Reactivate the lapsed book at scale with one cohort, one start date and one finish line, so the comeback is a habit rather than a message.',
    moment:
      'Reactivation carries the month. A cohort winback with a fixed start date gives the comeback a deadline and a peer group, the newcomer trial rides the same date to share the energy, and the renewal ladder steps the book into the final quarter.',
  },
  10: {
    theme: 'The Gifting Window',
    hook: 'Gifting as a revenue stream, not a promotion',
    job: 'Add revenue that survives the month — gift cards, gifting annuals and a second annual wave — with no promo-code discounting.',
    moment:
      'Gifting is a stream, not a sale: cards and gift annuals are priced and banked, a second numbered-annual wave takes the commitment buyers, and winback returns the lapsed on the strength of the gift rather than a cut.',
  },
  11: {
    theme: 'The Annual Window',
    hook: 'Annual commitments, capped and dated',
    job: 'Take the year’s biggest commitment window without discounting the year: capped numbered annuals, a closed date, and a renewal ladder on the expiring book.',
    moment:
      'The annual is the offer. A second wave of numbered memberships opens to the list first and closes on a date, the renewal ladder re-signs whatever comes due, and winback catches anyone who let a membership lapse during the year.',
  },
  12: {
    theme: 'Wrapped, Then Renewed',
    hook: 'Data-led renewal and the January pre-sale',
    job: 'Renew on usage: every member’s own year in data, ending in a renewal prescription — then pre-sell January before the calendar resets.',
    moment:
      'The renewal stream closes the year. A personal year-in-review is the argument, a prescription renewal is the ask, the gifting tail carries into January, and the pre-sale takes next year’s annuals before the discount season can argue against them.',
  },
};

// ── April: the grand anniversary membership ──────────────────────────────────
// Replaces the plain “Founding 57” renewal offer. Same economics, far more ceremony:
// numbered tiers, a coronation, a founding wall, and a birthday programme to sell it.
function aprilFlagship(base: any) {
  const buyers = Math.round(base.buyers * 1.04);
  const ticket = base.ticket;
  const revenue = Math.round(buyers * ticket);
  return {
    ...base,
    name: 'The Founding 57 · Coronation',
    tagline:
      'Fifty-seven numbered annual memberships, crowned in a gala: tiers, a founding wall, and a seat that is never sold again.',
    'Commercial job': 'Sell the flagship of the year: numbered annuals, capped by seat count, closed on the anniversary.',
    Mechanics:
      'Fifty-seven numbered annual memberships in three tiers — Regent (12 seats), Sovereign (30), Founding Circle (15). Each is a full-value 12-month unlimited, crowned at the anniversary gala, names engraved on the founding wall, and closed on the night of the anniversary. Tier perks are experience, not cash: private studio hours, a class of your own, first call on every launch through the year.',
    'Featured product': 'Annual unlimited at list',
    'Stacked perks':
      'Coronation ceremony with a numbered seat; engraved founding wall; private studio hour per tier; first call on 2028 launches; a birthday class for the member’s own day.',
    'Why it works':
      'A numbered annual sells belonging, not a price. Three tiers let the room choose its commitment instead of negotiating a discount, the cap makes the deadline real, and the ceremony gives every buyer a moment worth telling someone about — which is the referral engine the following month runs on.',
    'What to watch':
      'The cap must stay hard. The moment a seat is re-opened after the close, the number on the wall stops meaning anything and the tier price follows it down.',
    Model: `${buyers} numbered annuals at an average ${Math.round(ticket).toLocaleString('en-IN')}; no cash discount beyond the standing pack perks.`,
    selected: true,
    include: true,
    buyers,
    modelBuyers: buyers,
    revenue,
    effective: 6,
    'Effective discount': 6,
    'Expected revenue': revenue,
  };
}

// ── April: the anniversary programme ─────────────────────────────────────────
// Written into the month's action plan, so the timeline on the Execution page is the
// birthday programme itself: four weeks of events serving one offer.
const APRIL_ACTIONS = [
  {
    week: 1,
    owner: 'Studio manager',
    done: false,
    text: 'Coronation build: number the 57 seats, brief the team on the three tiers, and open the waitlist to the founding book.',
  },
  {
    week: 1,
    owner: 'Marketing',
    done: false,
    text: 'Anniversary identity live: birthday campaign across WhatsApp, email and Instagram, with the seat counter on every asset.',
  },
  {
    week: 1,
    owner: 'Sales',
    done: false,
    text: 'Founding book calls: every member from the launch year is called personally and offered their original number where it is still free.',
  },
  {
    week: 2,
    owner: 'Studio manager',
    done: false,
    text: 'The Coronation Gala: one evening, all 57 seats on the wall, tier reveals, cake, and the first names engraved.',
  },
  {
    week: 2,
    owner: 'Studio manager',
    done: false,
    text: 'Birthday class week: every format runs a themed anniversary class — throwback playlists, founding-year choreography, guest instructors.',
  },
  {
    week: 2,
    owner: 'Marketing',
    done: false,
    text: 'Founding wall reveal: photographs of every member from the launch year, printed and hung, with a card and a personal invitation to the gala.',
  },
  {
    week: 3,
    owner: 'Sales',
    done: false,
    text: 'Regent tier push: the 12 highest-value seats are worked one to one, with private studio hours as the closer.',
  },
  {
    week: 3,
    owner: 'Studio manager',
    done: false,
    text: 'Comeback party: one evening class for everyone who lapsed in the launch year, free, no pitch in the room.',
  },
  {
    week: 3,
    owner: 'Marketing',
    done: false,
    text: 'Birthday treats all week: cake at the desk, a photographer in the studio, member birthday cards, and the anniversary playlist.',
  },
  {
    week: 4,
    owner: 'Sales',
    done: false,
    text: 'Final seats: publish the remaining count every morning, and close every open conversation before the ceremony.',
  },
  {
    week: 4,
    owner: 'Studio manager',
    done: false,
    text: 'The Closing Night: last seats crowned, wall completed, and the 2028 waitlist opened to the room before it leaves.',
  },
  {
    week: 4,
    owner: 'Sales',
    done: false,
    text: 'Afterparty handover: every coronation member gets a thirty-day plan, so May starts on a habit instead of a receipt.',
  },
];

// ── Apply ────────────────────────────────────────────────────────────────────
const plan = JSON.parse(fs.readFileSync(FILE, 'utf8')) as any[];
let trimmed = 0;
let kept = 0;

for (const month of plan) {
  const copy = MONTH_COPY[month.month];
  if (!copy) throw new Error(`No copy for month ${month.month}`);
  month.theme = copy.theme;
  month.hook = copy.hook;
  month.job = copy.job;
  month.moment = copy.moment;

  // Two offers per stream: the selected one, plus its best companion.
  for (const stream of ['newcomer', 'lapsed', 'renewal'] as const) {
    const group = month.offers.filter((o: any) => o.stream === stream);
    const chosen = group.find((o: any) => o.selected);
    if (!chosen) throw new Error(`${month.studio} M${month.month} has no selected ${stream} offer`);

    if (month.month === 4 && stream === 'renewal') {
      const i = month.offers.indexOf(chosen);
      month.offers[i] = aprilFlagship(chosen);
    }

    // Everything except the slot holder, richest first — the companion is the second offer.
    const rest = group
      .filter((o: any) => !o.selected)
      .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));

    // April prefers its anniversary-named companion for the winback stream.
    const companion =
      month.month === 4 && stream === 'lapsed'
        ? (rest.find((o: any) => /reunion|anniversar/i.test(o.name)) ?? rest[0])
        : rest[0];

    // The slot holder may have been replaced (April's flagship), so re-read it from the month.
    const slotHolder = month.offers.find((o: any) => o.stream === stream && o.selected);
    for (const o of group) {
      const inMonth = o === slotHolder || o === companion;
      o.include = inMonth;
      if (inMonth) kept++;
      else trimmed++;
    }
  }

  if (month.month === 4) {
    month.actions = APRIL_ACTIONS;
    month.anniversary = {
      title: 'Still Shaking · The Birthday Programme',
      gala: 'The Coronation Gala — one evening, seats crowned, wall unveiled',
      events: [
        'Coronation Gala',
        'Birthday class week across every format',
        'Founding wall reveal',
        'Comeback party for the launch cohort',
        'Birthday treats and studio photographer',
        'The Closing Night and 2028 waitlist',
      ],
    };
  }
}

fs.writeFileSync(FILE, `${JSON.stringify(plan, null, 2)}\n`);
console.log(`Rewrote ${plan.length} studio-months · kept ${kept} offers (2 per stream) · banked ${trimmed}`);
