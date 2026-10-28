/* Ties every month's offers to that month's moment, and says plainly what each one is.

   Three things happen here, in order:

   1. Rename. An offer's name should tell you which moment it belongs to. February's
      pair offer is a Valentine's offer; October's gift offer is a Diwali offer. Names
      are only changed where the moment genuinely fits — a full-price renewal ladder in
      June has nothing to do with Father's Day, and pretending otherwise is worse than
      leaving it alone.

   2. Say it plainly. `plain` is the one line a studio manager reads: what is sold, at
      what discount, with what thrown in — "3-month unlimited at 15% off + 2 freezes".
      No internal vocabulary, no qualification clauses, no ₹ figures.

   3. Link. `moment` records the key date the offer is built around, so the card can say
      so and the month can group by it.

   Run: npx tsx scripts/tie-offers-to-moments.ts   (then `npm run plan:offers`) */

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('server/data/sales-offer-plan-2027.json');
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The moment each month is built around, drawn from the curated calendar. */
const MOMENTS: Record<number, { key: string; day: number | null; year: number | null }> = {
  1: { key: 'New Year', day: 1, year: null },
  2: { key: 'Valentine’s Day', day: 14, year: null },
  3: { key: 'International Women’s Day', day: 8, year: null },
  4: { key: 'Anniversary', day: 18, year: null },
  5: { key: 'Mother’s Day', day: 9, year: null },
  6: { key: 'Father’s Day', day: 20, year: null },
  7: { key: 'the monsoon', day: null, year: null },
  8: { key: 'Friendship Day', day: 1, year: null },
  9: { key: 'World Heart Day', day: 29, year: null },
  10: { key: 'Diwali', day: 29, year: null },
  11: { key: 'Black Friday', day: 26, year: null },
  12: { key: 'Christmas', day: 25, year: null },
};

/* Renames, by the offer's name today. Only where the moment is the honest reason for the
   offer to exist; anything absent keeps its name and gets no moment. */
const RENAME: Record<string, { name: string; moment: string }> = {
  // January — New Year, the resolution month.
  'The Habit Refund': { name: 'The New Year Refund', moment: 'New Year' },
  'Habit Insurance': { name: 'Resolution Insurance', moment: 'New Year' },
  '21 in 21 Kickstart': { name: 'The January Kickstart', moment: 'New Year' },
  'Unfinished Business': { name: 'New Year, Old Goal', moment: 'New Year' },
  'An Old Friend': { name: 'The January Homecoming', moment: 'New Year' },
  'The Second Chance': { name: 'The New Year Second Chance', moment: 'New Year' },
  'The Re-Up Ladder': { name: 'The New Year Re-Up', moment: 'New Year' },

  // February — Valentine's, inside Pride month.
  'The Duo Rate': { name: 'The Valentine’s Duo', moment: 'Valentine’s Day' },
  'Love Language Menu': { name: 'The Love Language Menu', moment: 'Valentine’s Day' },
  'Plus-One, Minus Excuses': { name: 'The Valentine’s Plus-One', moment: 'Valentine’s Day' },
  'We Need to Talk': { name: 'Come Back for Valentine’s', moment: 'Valentine’s Day' },
  'Come Back as a Pair': { name: 'The Valentine’s Comeback', moment: 'Valentine’s Day' },
  'The Reunion Class': { name: 'The Valentine’s Reunion', moment: 'Valentine’s Day' },
  "The Couple's Plan": { name: 'The Valentine’s Couple Plan', moment: 'Valentine’s Day' },
  'Better Together Renewals': { name: 'Renew as a Pair', moment: 'Valentine’s Day' },

  // March — International Women's Day.
  'She Moves: Pay It Forward': { name: 'Women’s Day: Pay It Forward', moment: 'International Women’s Day' },
  'Strong Women Squad': { name: 'The Women’s Day Squad', moment: 'International Women’s Day' },
  'The Pre-Game': { name: 'The Women’s Day Pre-Game', moment: 'International Women’s Day' },
  'Re-Run Your Best Month': { name: 'The Women’s Day Return', moment: 'International Women’s Day' },
  'Class of 2024 Reunion': { name: 'The Women’s Day Reunion', moment: 'International Women’s Day' },
  'Pre-Game Upgrade': { name: 'The Women’s Day Upgrade', moment: 'International Women’s Day' },
  'Lock In Early': { name: 'The Women’s Day Lock-In', moment: 'International Women’s Day' },

  // April — the anniversary, opened by World Health Day.
  'Build Your Box': { name: 'The Anniversary Box', moment: 'Anniversary' },
  'Commitment Issues Pack': { name: 'The Health Day Pack', moment: 'World Health Day' },
  'Since Day One': { name: 'Since Day One', moment: 'Anniversary' },
  'Still Shaking Reunion Week': { name: 'Still Shaking Reunion Week', moment: 'Anniversary' },
  'The Founding 57 · Coronation': { name: 'The Founding 57 · Coronation', moment: 'Anniversary' },
  'The Long Game': { name: 'The Anniversary Long Game', moment: 'Anniversary' },

  // May — Mother's Day, inside Mental Health Awareness Month.
  'Mother Shaker': { name: 'The Mother’s Day Shaker', moment: 'Mother’s Day' },
  'A Class for Mum': { name: 'A Class for Mum', moment: 'Mother’s Day' },
  '6-Week Summer Cohort': { name: 'The Mental Health Cohort', moment: 'Mental Health Awareness Month' },
  'Summer Comeback Squad': { name: 'The Wellbeing Comeback', moment: 'Mental Health Awareness Month' },
  'Summer Freeze Pre-Pay': { name: 'The Wellbeing Freeze', moment: 'Mental Health Awareness Month' },

  // June — Father's Day.
  'Home for the Summer': { name: 'Father’s Day: Strength for Two', moment: 'Father’s Day' },
  'Passport Membership': { name: 'The Father’s Day Passport', moment: 'Father’s Day' },

  // August — Friendship Day, then Women's Day on the 9th.
  'Friends Who Squat Together': { name: 'Friends Who Squat Together', moment: 'Friendship Day' },
  'Old Friends': { name: 'Old Friends', moment: 'Friendship Day' },
  'Upgrade on Day 1': { name: 'The Friendship Upgrade', moment: 'Friendship Day' },
  'Second Peak Homecoming': { name: 'The Friendship Comeback', moment: 'Friendship Day' },
  'Pack Ladder': { name: 'The Friendship Ladder', moment: 'Friendship Day' },

  // September — World Heart Day.
  'The Return Policy': { name: 'The Heart Day Return', moment: 'World Heart Day' },
  'Gift Lock-in': { name: 'The Heart Day Lock-In', moment: 'World Heart Day' },
  'Usage Prescription (Q3)': { name: 'The Heart Day Prescription', moment: 'World Heart Day' },

  // October — Diwali, with Halloween at the close.
  'Gift a Shake': { name: 'The Diwali Gift', moment: 'Diwali' },
  'Festival of Lights Evenings': { name: 'Diwali Evenings', moment: 'Diwali' },
  'The Homecoming Invitation': { name: 'Come Home for Diwali', moment: 'Diwali' },
  'Advance Credit': { name: 'Diwali Advance Credit', moment: 'Diwali' },
  'Credit in Advance': { name: 'The Diwali Credit', moment: 'Diwali' },
  'Limited Run: First Access': { name: 'The Diwali First Access', moment: 'Diwali' },
  'Halloween Throwdown': { name: 'The Halloween Throwdown', moment: 'Halloween' },

  // November — Black Friday, after Singles' Day.
  'The Annual Window': { name: 'Black Friday Annual', moment: 'Black Friday' },
  'The Annual Six': { name: 'The Black Friday Six', moment: 'Black Friday' },
  'The Annual Envelope': { name: 'The Black Friday Envelope', moment: 'Black Friday' },
  'Annual Window Renewals': { name: 'Black Friday Renewals', moment: 'Black Friday' },
  'High-Value Homecoming': { name: 'The Singles’ Day Homecoming', moment: 'Singles’ Day (11.11)' },

  // July — the monsoon owns the month.
  'Rain Check': { name: 'Rain Check', moment: 'Monsoon' },
  'Rain or Shine Comeback': { name: 'Rain or Shine Comeback', moment: 'Monsoon' },
  'Indoor Season Pass': { name: 'Indoor Season Pass', moment: 'Monsoon' },

  // November — the annual window runs into Black Friday.
  'The Founding 57: Second Wave': { name: 'The Founding 57: Second Wave', moment: 'Black Friday' },

  // December — Christmas closes the year.
  'The Pre-Solution': { name: 'The Pre-Solution', moment: 'Christmas' },
  '12 Days of Shakemas': { name: '12 Days of Shakemas', moment: 'Christmas' },
  'The Guest List': { name: 'The Guest List', moment: 'Christmas' },
  '2027 Wrapped → 2028 Prescription': {
    name: '2027 Wrapped → 2028 Prescription',
    moment: 'Christmas',
  },
  'Your 2027 Wrapped (lapsed edition)': { name: 'The 2027 Wrapped Comeback', moment: 'Christmas' },

  // December — Christmas.
  'Early-Bird Annual': { name: 'The Christmas Early-Bird', moment: 'Christmas' },
};

/* Plain-language overrides, where a generated line would miss the point. */
const PLAIN: Record<string, string> = {
  'The Founding 57 · Coronation':
    '12-month unlimited at list price, in 57 numbered seats across three tiers, closed on the anniversary',
  'The Anniversary Box': '3-month unlimited at 15% off + a gift box of anniversary retail',
  'The Valentine’s Duo': '12-class pack at 15% off each + one shared 30-minute duo private',
  'The Valentine’s Couple Plan': 'Two 3-month unlimiteds at 15% off + a shared private',
  'The Diwali Gift': '3-month unlimited at 15% off + a gift card for a second person',
  'Black Friday Annual': '12-month unlimited at list price + 2 months free, capped at 57 seats',
  'The Black Friday Six': '6-month unlimited at list price + 1 month free',
  'The New Year Refund': '3-month unlimited at list price + 20% back as studio credit after 36 classes',
  'The Women’s Day Squad': '12-class pack at 15% off + a fixed squad slot and a graduation class',
  'The Mother’s Day Shaker': '3-month unlimited at 15% off + a guest pass for her',

  'The Valentine’s Comeback': '12-class pack at 15% off + a free intro for a friend, and 2 guest passes if they buy',
  'The Love Language Menu':
    '3-month unlimited at 15% off + one perk of choice: a private, retail, two freezes or a 12-week plan',
  'Still Shaking Reunion Week': '1-month unlimited at 15% off at the reunion class + 2 guest passes',
  'The Anniversary Long Game': 'Renewal bonus: +30 days on annual, +14 on 6-month, +6 classes on 3-month',
  'The Health Day Pack': '3-month unlimited at 15% off + 2 guest passes',
  'The Guest List': '12-class pack at 15% off + 2 guest passes for holiday visitors',
  'The New Year Second Chance': '1-month unlimited at list price + 6 extra days',
  'The Women’s Day Pre-Game': '3-month unlimited at 15% off + early access to the anniversary box',
  'The Women’s Day Upgrade': 'Renewal at list price + 2 guest passes',
  'The Father’s Day Passport': '3-month renewal at list price + a virtual private to use while travelling',
  'The Streak': 'Renewal at list price + 7 days, for members on a 4-week streak',
  'Friends Who Squat Together': '12-class pack at 12% off, for two friends booking together',
  'Bring-a-Friend Trial Week': 'Two intro classes for the price of one',
  'The Heart Day Prescription': '3-month renewal at list price + 7 days, prescribed from usage',
  'Come Home for Diwali': '12-class pack at 15% off + a Diwali gift card',
  'Diwali Advance Credit': '3-month unlimited at 15% off + ₹2,000 credit to spend in the new year',
  'The New Year Re-Up':
    'Renewal bonus: +1 class on 1-month, +7 days on 3-month, +14 days on 6-month, +30 days on annual',
  'The Women’s Day Lock-In':
    'Renewal at list price + 2 bonus classes or 7 extra days, and first pick of anniversary classes',
  'Father’s Day: Strength for Two': '2-week unlimited for two at list price',
  "Freeze, Don't Leave": '3-month renewal at list price + 2 extra freezes',
  'Usage Prescription': '3-month unlimited at list price + 7 days, for members training 8+ times a month',
  'Renew as a Pair': 'Renewal at list price + 2 guest passes to give away',
  'Challenge Captain': 'Renewal at list price + 14 days or 2 classes, for members who bring 2 friends',
  'Gift Pause Pass': '1-month renewal + 1 extra freeze and 2 guest passes',
  'Black Friday Renewals': 'Renewal bonus: +7 days on 3-month, +14 days on 6-month, +30 days on annual',
  'The Afterparty': '8 classes in the month + a free hosted class and a trainer check-in',
  'The Diwali Credit': 'Renewal at list price + 5% back as Diwali gift credit',
  'The Founding 57: Second Wave': 'Annual unlimited at list price + founding-member perks',
  '2027 Wrapped → 2028 Prescription': 'Personal year-in-review, ending in a renewal prescription',
  'The 2027 Wrapped Comeback': '12-class pack at 15% off + a year-in-review page',
  'The New Year Re-Up ': '',
};

/* The month's own copy names the date it is built around, then gets back to the money.
   The lead sentence is prepended once (guarded by `messagingTied`), so re-running the
   script cannot stack the same sentence twice. */
const MESSAGING: Record<number, { hook: string; lead: string }> = {
  1: {
    hook: 'New Year: the resolution window, sold as a refund of habit',
    lead: 'New Year is the window when intent to restart is highest, and every offer in the month is built to catch it before it fades.',
  },
  2: {
    hook: 'Valentine’s Day: two seats per sale',
    lead: 'Valentine’s Day puts two people in the room instead of one, which is the cheapest second seat this business will ever buy.',
  },
  3: {
    hook: 'Women’s Day: the homecoming',
    lead: 'International Women’s Day is the one day the studio’s whole audience is already talking about itself, so the month’s winback rides it.',
  },
  4: {
    hook: 'The anniversary: numbered annuals, capped and closed',
    lead: 'The brand turns nine on the 18th, and the month is built as a birthday programme that closes on the night.',
  },
  5: {
    hook: 'Mother’s Day: the second seat, gifted',
    lead: 'Mother’s Day, inside Mental Health Awareness Month, gives the month its two audiences: the woman who gifts and the woman who needs the room.',
  },
  6: {
    hook: 'Father’s Day: one window, two seats',
    lead: 'Father’s Day is the month’s one open door in the middle of summer travel, and it is worth exactly what a pairing window is worth.',
  },
  7: {
    hook: 'The monsoon: engagement held through the rain',
    lead: 'The monsoon is a demand problem, not a product one: the rain decides attendance, so the offers are built to survive it.',
  },
  8: {
    hook: 'Friendship Day: the referral engine',
    lead: 'Friendship Day on the first Sunday puts a friend in the room, and Women’s Day on the 9th gives the month a second, quieter push.',
  },
  9: {
    hook: 'World Heart Day: one cohort, one start date',
    lead: 'World Heart Day gives the cardio formats a reason to be talked about, and the comeback cohort a date to start on.',
  },
  10: {
    hook: 'Diwali: gifting as a stream, not a sale',
    lead: 'Diwali is the one month a year people buy a membership for someone else; Breast Cancer Awareness on the 19th keeps the month honest and Halloween closes it.',
  },
  11: {
    hook: 'Black Friday: the annual window, capped and dated',
    lead: 'Singles’ Day on the 11th belongs to the self-purchase and Black Friday on the 26th is the capped annual window.',
  },
  12: {
    hook: 'Christmas: the gifting close and the year in review',
    lead: 'Christmas is the gifting close, and the year-end review is the renewal argument that goes with it.',
  },
};

const PAGE = /₹[\d,.]+ ?(?:k|lakh|l)?/gi;
const normaliseProduct = (s: string) =>
  s
    .replace(PAGE, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\b(\d+)M\b/g, '$1-month')
    .replace(/\s+/g, ' ')
    // Removing the price can leave the preposition behind: "3M unlimited at" + "at list".
    .replace(/\s+(at|for|of)\s*$/i, '')
    .replace(/[,\s]+$/, '')
    .trim();

/** The one line a studio manager reads. */
function plainLine(o: any): string {
  const override = PLAIN[o.name];
  if (override) return override;

  const fp: string = o['Featured product'] || '';
  const product = normaliseProduct(fp);
  const offMatch = fp.match(/\((\d+)% off/i);
  const effRaw = String(o['Effective discount'] || '').replace('%', '');
  const eff = Number(effRaw);

  // A featured line that is not a product ("Applies across renewal products") is no use
  // as the opening of a plain sentence; the mechanic reads better.
  const usable = product && !/^applies across/i.test(product);
  let head = usable ? product : '';
  if (usable && /\(list\)/i.test(fp)) head = `${product} at list price`;
  else if (usable && offMatch) head = `${product} at ${offMatch[1]}% off`;
  else if (usable && Number.isFinite(eff) && eff > 0) head = `${product} at ${Math.round(eff)}% off`;

  // The commercial core of the mechanic: what sits after the qualifying clause.
  const mech: string = String(o.Mechanics || '');
  const core = mech.includes(': ') ? mech.slice(mech.lastIndexOf(': ') + 2) : mech;

  if (!head) {
    // No featured product: fall back to the mechanic, stripped to its first clause and
    // spelled out — the shorthand the plan is written in ("1M", "T-14") is not for the card.
    const first = core
      .split(/[.;]/)[0]
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\b(\d+)M\b/g, '$1-month')
      .replace(/\bT-(\d+)\b/gi, '$1 days before expiry')
      .replace(/\s+/g, ' ')
      .trim();
    return first.charAt(0).toLowerCase() + first.slice(1) || first;
  }

  const perks = String(o['Stacked perks'] || '')
    .split('·')
    .map(p => p.trim())
    .filter(Boolean);
  const perk =
    perks.length === 1 ? perks[0] : perks.length > 1 ? `${perks.slice(0, -1).join(', ')} and ${perks.at(-1)}` : '';
  return perk ? `${head} + ${perk}` : head;
}

const plan = JSON.parse(fs.readFileSync(FILE, 'utf8')) as any[];
let renamed = 0;
let linked = 0;
let replanned = 0;
let retied = 0;

for (const month of plan) {
  const moment = MOMENTS[month.month];
  for (const o of month.offers) {
    const r = RENAME[o.name];
    if (r) {
      if (o.name !== r.name) renamed++;
      o.name = r.name;
      o.moment = r.moment;
      linked++;
    } else if (o.moment === undefined) {
      o.moment = null;
    }
    // The plain line is written after any rename, so it keys off the final name.
    const line = plainLine(o);
    if (line !== o.plain) replanned++;
    o.plain = line;

    // Keep the offer's identity stable across the rename.
    if (o.provenance) {
      const prov = JSON.parse(o.provenance);
      prov.sourceKey = `2027 Annual Sales and Offer Plan:${month.studio}:${month.month}:${o.stream}:${slug(o.name)}`;
      prov.linkGroup = `SOP27-${String(month.month).padStart(2, '0')}-${slug(o.name)}`;
      if (o.moment) prov.moment = o.moment;
      else delete prov.moment;
      o.provenance = JSON.stringify(prov);
    }
  }
  // The month's own copy names the moment it is built around.
  if (moment) month.momentKey = moment.key;
  const msg = MESSAGING[month.month];
  if (msg && !month.messagingTied) {
    month.hook = msg.hook;
    month.moment = `${msg.lead} ${month.moment}`;
    month.messagingTied = true;
    retied++;
  }
}

fs.writeFileSync(FILE, `${JSON.stringify(plan, null, 2)}\n`);
console.log(
  `Renamed ${renamed} offers · linked ${linked} to a moment · rewrote ${replanned} plain lines · re-tied ${retied} month briefs`,
);
