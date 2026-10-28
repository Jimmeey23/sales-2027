/* Sales Plan › month narratives.
   The twelve months are not twelve buckets of the same target. Each has its own weather,
   its own commercial job and its own reason the money arrives — so each gets a chapter
   (kicker, theme, moment, brief, risk, signature move) and a voice: three short paragraphs
   that explain *this* month's revenue split, lead requirement and renewal book in plain
   language, using the numbers actually planned for the selected studio. */

export interface MonthChapter {
  /** Editable campaign theme, used when a month has no saved theme. */
  theme: string;
  /** Two or three words that sit above the theme, like a magazine kicker. */
  kicker: string;
  /** The cultural or commercial moment the month belongs to. */
  moment: string;
  /** The single commercial job, in one line. */
  objective: string;
  /** Two to three sentences of story: why the month works the way it does. */
  brief: string;
  /** What usually goes wrong. */
  risk: string;
  /** The one move the month is built around. */
  signature: string;
}

export interface MonthStoryInput {
  studio: string;
  target: number;
  lastYear: number;
  streams: { newClient: number; renewal: number; reactivation: number };
  leads: number;
  trials: number;
  buyers: number;
  renewalsDue: number;
  renewalCoverage: number | null;
  offers: number;
  offerRevenue: number;
}

export interface MonthStory {
  /** Where the money comes from, in this month's own terms. */
  split: string;
  /** Who has to walk through the door. */
  leads: string;
  /** Who has to stay. */
  renewals: string;
}

const L = (v: number) =>
  `₹${(Math.max(0, Number.isFinite(v) ? v : 0) / 100000).toLocaleString('en-IN', {
    maximumFractionDigits: 1,
  })}L`;
const N = (v: number) => Math.round(Number.isFinite(v) ? v : 0).toLocaleString('en-IN');
const P = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`;
const share = (part: number, total: number) => (total > 0 ? `${Math.round((Math.max(0, part) / total) * 100)}%` : '—');

/** Trial → buyer rate, the number every month is actually judged on. */
const conv = (input: MonthStoryInput) => P(input.trials > 0 ? input.buyers / input.trials : null);

export const MONTH_CHAPTERS: MonthChapter[] = [
  {
    theme: 'The Re-Up',
    kicker: 'The renewal book',
    moment: 'The annual book signed a year ago comes due in one block, while trial demand converts without paid media.',
    objective:
      'Re-sign the expiring annual book at full value and convert trial demand at list — with no discount anchor set for the year.',
    brief:
      'January is decided by the book the studio already owns. Renewals are the largest stream, so the month leads with a ladder of longer terms on the expiring annuals; new clients convert from trial at full price, with a refund-of-habit mechanism instead of a price cut; the lapsed list is worked once, honestly. Nothing is bought with margin.',
    risk: 'Discount anchoring. If the first offer of the year is a percentage off, that number becomes the reference price for the next eleven months.',
    signature:
      'A re-up ladder inside the first ten days, and a full-price trial conversion that pays back in studio credit, not cash.',
  },
  {
    theme: 'The Second Seat',
    kicker: 'Referral, not discount',
    moment:
      'New clients arrive in pairs — one member brings another — so the second seat is the product the month sells.',
    objective:
      'Grow new clients through the second seat: a duo rate that prices the companion membership, a referral credit paid in classes, and a winback for members who left as a pair.',
    brief:
      'February buys growth with product rather than margin. The offer is built on the second person: a duo rate that prices the companion seat, a referral that pays out in classes so cash never leaves the business, and a winback that returns the pair together. The first membership is never discounted — the second one is the reason to buy.',
    risk: 'Buy-one-get-one. It discounts the first seat, and the buyers it attracts renew at a fraction of the rate of people who paid in full.',
    signature: 'A duo rate priced on the second seat, with referral credits paid in classes.',
  },
  {
    theme: 'The Homecoming',
    kicker: 'The winback',
    moment:
      'The oldest cohort on the book — the launch-year members — is the largest reactivation pool the studio has.',
    objective:
      'Rebuild the reactivation stream: bring the lapsed launch cohort home, and close trials inside the month instead of letting them slide.',
    brief:
      'March is won back, not bought. The reunion is the offer: the launch-year cohort is invited together, asked plainly why they left and given a reason to return that is about the room rather than a price. Trials close in-week so demand does not defer into April, and the renewal ladder holds the first-quarter book while acquisition runs warm rather than loud.',
    risk: 'Trials that wait. A trial allowed to defer its decision becomes next month’s buyer, at next month’s terms.',
    signature: 'A reunion-led winback with a closing window, and a trial that has to decide inside the month.',
  },
  {
    theme: 'Still Shaking',
    kicker: 'The anniversary',
    moment:
      'The brand turns nine. The flagship is a numbered annual, and the month around it is a birthday programme that fills the room.',
    objective:
      'Sell the flagship of the year — fifty-seven numbered annuals in three tiers, capped and hard-closed — inside a month of anniversary events.',
    brief:
      'April is the year’s grand month. The product is the Founding 57: fifty-seven numbered annual memberships, crowned across three tiers, capped by seat count and closed on the anniversary night. Around it runs the birthday programme — a coronation gala, themed classes in every format, a founding-members wall, a comeback party and daily celebration moments — so the annual is sold by the room rather than by a discount. The ceremony is the referral engine that May inherits.',
    risk: 'An anniversary that reads as a sale. The moment a capped seat is quietly re-opened, the number on the wall stops meaning anything and the tier price follows it down.',
    signature:
      'The Founding 57 · Coronation: three tiers, fifty-seven numbered seats, crowned at the gala and closed that night.',
  },
  {
    theme: 'The Afterparty',
    kicker: 'The second purchase',
    moment: 'April sold the membership. The next thirty days decide whether it becomes a habit or a receipt.',
    objective: 'Turn the anniversary cohort into a habit: eight classes inside thirty days, then the second purchase.',
    brief:
      'May is the month that makes April real. Every coronation member gets a thirty-day plan — a call in the first week, eight classes by month end, one hosted class — and the ask at the end of it is the second purchase. Upgrades take whoever is ready for a longer term, and a winback catches the buyers who never came back, because an April receipt with no visits is churn with better stationery.',
    risk: 'Silence. A flagship buyer with no contact in the first three weeks is a churn statistic with a receipt.',
    signature: 'A thirty-day plan per member: one call, eight classes, one hosted class, then the second purchase.',
  },
  {
    theme: 'The Freeze',
    kicker: 'Retention',
    moment:
      'The book is under pressure from cancellation intent — and a cancellation is a decision that can still be dated instead of taken.',
    objective:
      'Protect the book: convert cancellation intent into dated freezes, keep the direct debits alive, and hold intake with a low-commitment newcomer offer.',
    brief:
      'June is a defence month. Where a member asks to cancel, the offer is a freeze with a return date — the plan, not the pause — so revenue stays in the book and the door stays open. The renewal ladder runs early so nothing lapses by default, and a short-ticket newcomer offer keeps new seats coming in while the existing ones are held.',
    risk: 'Cancellations dressed as pauses. A freeze with no return date is churn with better manners.',
    signature: 'A dated freeze instead of a cancellation, with an early renewal ladder behind it.',
  },
  {
    theme: 'The Attendance Book',
    kicker: 'Engagement',
    moment: 'Renewal is decided weeks after attendance moves, which makes attendance the month’s revenue lever.',
    objective: 'Hold attendance so the renewals that fall due actually land, and price the renewal before the drop.',
    brief:
      'July works on behaviour rather than price. A streak makes showing up visible, a small grace on late cancels removes the excuse that ends a habit, and a leaderboard turns consistency into a small status symbol. The renewal ladder is offered to people who are still coming, because a renewal argued while the habit is alive is a different conversation from one argued after it has died.',
    risk: 'Late cancels. Where they run unchecked they take a third of all bookings, and the renewal follows them out of the door.',
    signature: 'A studio streak and leaderboard, with renewals sold to members who are still in the room.',
  },
  {
    theme: 'The Upgrade',
    kicker: 'The term ladder',
    moment: 'The one-month book is the largest pool of members whose commitment can be lengthened.',
    objective:
      'Move the one-month book onto longer terms — one to three to six — priced on commitment, and fill the new seats by referral.',
    brief:
      'August sells length rather than price. A one-month member renews about half the time; a three-month member renews at two-thirds or better. The same person, a different length of habit. The upgrade ladder prices commitment — three months, then six — a squad referral brings in the new seats without a discount, and the winback returns the lapsed to the same ladder.',
    risk: 'Selling more of the same. A longer term at a discount is a smaller margin, not a bigger member.',
    signature: 'A one-to-three-to-six upgrade ladder priced on commitment, with squad referrals for new seats.',
  },
  {
    theme: 'The Comeback Cohort',
    kicker: 'Reactivation at scale',
    moment: 'The lapsed book is large enough to reactivate as a single cohort with one start date.',
    objective:
      'Reactivate the lapsed book at scale — one cohort, one start date, one finish line — and step the book into the final quarter.',
    brief:
      'September takes the whole lapsed list at once. A cohort with a fixed start date gives the comeback a deadline and a peer group, which is the difference between a message and a habit. The newcomer trial rides the same date so the room feels full, and the renewal ladder moves the book into the last quarter with its strongest months still ahead.',
    risk: 'A comeback that peaks on day three. Without a cohort and a check-in, reactivation is a message rather than a habit.',
    signature: 'One cohort, one start date, one leaderboard — the comeback runs as a class, not a campaign.',
  },
  {
    theme: 'The Gifting Window',
    kicker: 'Gifting as revenue',
    moment: 'Gift cards and gift annuals are a revenue stream that costs no discount — if they are priced and banked.',
    objective:
      'Add revenue that survives the month — gift cards, gifting annuals and a second annual wave — with no promo-code discounting.',
    brief:
      'October adds a stream instead of cutting a price. Gift cards are sold at full value and banked, gift annuals take the commitment buyer who is buying for someone else, and a second wave of numbered annuals takes whoever missed the first. The winback returns the lapsed on the strength of the gift rather than a cut, and nothing in the month is bought with a code.',
    risk: 'Codes. A rush bought with promo codes becomes a renewal problem once the code expires.',
    signature: 'Gift cards and gift annuals at full value, banked — plus the second numbered-annual wave.',
  },
  {
    theme: 'The Annual Window',
    kicker: 'The commitment window',
    moment:
      'The year’s largest commitment window opens — the one month a long-term membership is the expected purchase.',
    objective:
      'Take the year’s biggest commitment window without discounting the year: capped numbered annuals, a closed date, and a renewal ladder on the expiring book.',
    brief:
      'November sells time, at the moment the market is willing to buy it. The second wave of numbered annuals opens to the list first and closes on a date, the renewal ladder re-signs whatever comes due, and the winback catches anyone who let a membership lapse during the year. The discipline is the same as April: cap the seats, close the date, hold the price.',
    risk: 'A discount week that discounts the year. An annual sold at forty percent off is sold at forty percent off forever.',
    signature: 'A second numbered-annual wave: remaining seats only, opening on the list and closing on a date.',
  },
  {
    theme: 'Wrapped, Then Renewed',
    kicker: 'Data-led renewal',
    moment: 'Every member’s own year of attendance is the argument for the next one — and it is already in the data.',
    objective:
      'Renew on usage: a personal year-in-review ending in a renewal prescription, then pre-sell January before the calendar resets.',
    brief:
      'December closes the year with evidence. Each member gets their own year in numbers — the classes, the streaks, the months that went missing — and the last page is a renewal prescription built from their attendance. That same argument pre-sells January, so next year’s annuals are sold before the discount season can argue against them.',
    risk: 'January panic. A renewal left to the new year is a renewal argued against January’s discounts.',
    signature:
      'A personal year-in-review that ends in a renewal prescription, and a January pre-sale on the back of it.',
  },
];

export function monthChapter(month: number): MonthChapter {
  return MONTH_CHAPTERS[Math.min(12, Math.max(1, month)) - 1];
}

/** True when a saved theme is one of the old generic labels, so the new chapter can lead. */
const LEGACY_THEMES = new Set(
  [
    'Fresh Start, Strong Finish',
    'Bring Your Bestie',
    'Stronger Together',
    'Anniversary / Community Celebration',
    'Build Your Base',
    'Midyear Momentum',
    'Monsoon Consistency',
    'Back to Routine',
    'Power Through Progress',
    'Member Appreciation',
    'Gratitude in Motion',
    'Year-End, Your Way',
    // The 2027 plan imported these from the PDF planner; the chapters replace them.
    'Fresh Start',
    'Better Together',
    'She Moves',
    'Still Shaking',
    'Still Shaking (anniversary)',
    'The Afterparty',
    'Out of Office',
    'Monsoon I: Rain Check',
    'Monsoon II: Squads & Upgrades',
    'Monsoon III: The Comeback',
    'Festival of Lights',
    'Black Friday, Strong Monday',
    'Wrapped',
  ].map(s => s.toLowerCase()),
);

export function isLegacyTheme(theme: string | null | undefined) {
  return !!theme && LEGACY_THEMES.has(theme.trim().toLowerCase());
}

/* ── The voice ────────────────────────────────────────────────────────────────
   One hand-written voice per month: the split, the door and the renewal book,
   each explained with the studio's own planned numbers. */
type Voice = (c: MonthStoryInput) => MonthStory;

const VOICES: Voice[] = [
  // January — the year arrives on its own; be ready for it.
  c => ({
    split: `Of ${L(c.target)}, ${L(c.streams.newClient)} has to come from people who have never paid us, ${L(c.streams.renewal)} from members already inside the room, and ${L(c.streams.reactivation)} from the ones we let drift. January is the only month where the new-client line does most of the work — ${share(c.streams.newClient, c.target)} of the target — so the trial desk earns more here than anywhere else in the year.`,
    leads: `${N(c.leads)} leads become ${N(c.trials)} trials and ${N(c.buyers)} first purchases${c.buyers > 0 ? `: one buyer for roughly every ${N(c.leads / c.buyers)} names at the door` : ''}, at ${conv(c)} trial conversion. That conversion number is what January is judged on, not the footfall.`,
    renewals: `${N(c.renewalsDue)} memberships expire this month, and the plan funds ${P(c.renewalCoverage)} of that renewal book. These are the annuals signed in the same fortnight last year — the easiest renewals of the year, and the easiest to lose to a January promotion.`,
  }),
  // February — pairs, not individuals.
  c => ({
    split: `The ${L(c.target)} target leans on ${L(c.streams.newClient)} of new money, ${L(c.streams.renewal)} of renewals and ${L(c.streams.reactivation)} of returns. February’s new clients arrive in pairs, so each conversation is worth close to twice a January one — which is why the lead count is lower while the money is not.`,
    leads: `${N(c.leads)} names produce ${N(c.trials)} trials and ${N(c.buyers)} buyers at ${conv(c)} trial conversion. A pair that tries together usually buys together, so the ratio to protect is trials to buyers, not leads to trials.`,
    renewals: `${N(c.renewalsDue)} memberships expire and ${P(c.renewalCoverage)} of the renewal book is already planned. February’s renewals are January’s trials: the people deciding now are the ones who joined four weeks ago.`,
  }),
  // March — a homecoming with a date on it.
  c => ({
    split: `Of the ${L(c.target)} we need, ${L(c.streams.newClient)} is new-client money, ${L(c.streams.renewal)} renewals and ${L(c.streams.reactivation)} comeback — and March is the month the comeback line stops being symbolic. Reactivation carries ${share(c.streams.reactivation, c.target)} of the target because the reunion is designed to do exactly that.`,
    leads: `${N(c.leads)} leads, ${N(c.trials)} trials, ${N(c.buyers)} buyers. The funnel is narrower than January’s on purpose: March qualifies harder and converts at ${conv(c)}, because a returning lapsed member is a longer conversation than a New Year walk-in.`,
    renewals: `${N(c.renewalsDue)} memberships expire and the plan carries ${P(c.renewalCoverage)} of that book. The renewals that matter most sit on the reunion list — a lapsed member who comes back in March renews into December.`,
  }),
  // April — belonging, sold at full value.
  c => ({
    split: `April carries ${L(c.target)}, the heaviest month of the year: ${L(c.streams.newClient)} of new clients, ${L(c.streams.renewal)} of renewals and ${L(c.streams.reactivation)} of comeback. The new-client line is ${share(c.streams.newClient, c.target)} of the target, and the Founding 57 is expected to carry most of it.`,
    leads: `${N(c.leads)} leads → ${N(c.trials)} trials → ${N(c.buyers)} buyers at ${conv(c)} trial conversion. The anniversary does the qualifying for us: people who walk in during April are already sold on the room, so the desk is closing rather than convincing.`,
    renewals: `${N(c.renewalsDue)} memberships expire in the anniversary month, with ${P(c.renewalCoverage)} of the renewal book planned. A renewal in April is the easiest annual upgrade of the year, because the member is already celebrating.`,
  }),
  // May — proving April was a membership.
  c => ({
    split: `May’s ${L(c.target)} is deliberately renewal-heavy: ${L(c.streams.renewal)} comes from members already in the building, ${L(c.streams.newClient)} from new clients and ${L(c.streams.reactivation)} from returns. Renewal is ${share(c.streams.renewal, c.target)} of the month — the highest share outside November.`,
    leads: `${N(c.leads)} leads and ${N(c.trials)} trials are enough to bring in ${N(c.buyers)} buyers at ${conv(c)}. Acquisition is small on purpose in May; the growth is meant to come from the people already here.`,
    renewals: `${N(c.renewalsDue)} memberships expire and the plan expects ${P(c.renewalCoverage)} of that book. Most of them belong to the January cohort — the renewal conversation is really a January conversation, held in May.`,
  }),
  // June — the exit at the door.
  c => ({
    split: `June needs ${L(c.target)}: ${L(c.streams.newClient)} new, ${L(c.streams.renewal)} renewal, ${L(c.streams.reactivation)} comeback. Renewals matter more than the new-client line this month — ${share(c.streams.renewal, c.target)} of the target is people deciding to stay through the summer.`,
    leads: `${N(c.leads)} names, ${N(c.trials)} trials, ${N(c.buyers)} buyers at ${conv(c)}. The funnel is small and daytime-weighted: students and under-25s who can train at eleven while the rest of the city is away.`,
    renewals: `${N(c.renewalsDue)} memberships expire in June, with ${P(c.renewalCoverage)} of the book planned. Every one of them is a freeze conversation first and a renewal second.`,
  }),
  // July — attendance is the product.
  c => ({
    split: `The ${L(c.target)} splits into ${L(c.streams.newClient)} of new clients, ${L(c.streams.renewal)} of renewals and ${L(c.streams.reactivation)} of comeback. July is a renewal month wearing a weather report: ${share(c.streams.renewal, c.target)} of the target already sits inside the building.`,
    leads: `${N(c.leads)} leads → ${N(c.trials)} trials → ${N(c.buyers)} buyers at ${conv(c)}. The number to defend is not leads; it is attendance on the trials that do arrive.`,
    renewals: `${N(c.renewalsDue)} memberships expire and ${P(c.renewalCoverage)} of the renewal book is planned. These are renewals argued with attendance data — how many classes the member actually took in June.`,
  }),
  // August — length, not price.
  c => ({
    split: `${L(c.target)} this month: ${L(c.streams.newClient)} of new clients, ${L(c.streams.renewal)} of renewals, ${L(c.streams.reactivation)} of comeback. The renewal line is the one to move, because August’s upside is length — a three-month renewal is worth three times a one-month one.`,
    leads: `${N(c.leads)} leads produce ${N(c.trials)} trials and ${N(c.buyers)} buyers at ${conv(c)}. Half the point of the month is the friend who comes with the member, so the lead number is softer than the revenue it carries.`,
    renewals: `${N(c.renewalsDue)} memberships expire and the plan covers ${P(c.renewalCoverage)}. The upgrade conversation belongs here — before expiry, not at the desk on the last day.`,
  }),
  // September — the cohort with a deadline.
  c => ({
    split: `September carries ${L(c.target)}: ${L(c.streams.newClient)} of new clients, ${L(c.streams.renewal)} of renewals and ${L(c.streams.reactivation)} of comeback. Comeback is ${share(c.streams.reactivation, c.target)} of the target — the year’s heaviest reactivation weight — and it is the line the cohort is built to move.`,
    leads: `${N(c.leads)} leads become ${N(c.trials)} trials and ${N(c.buyers)} buyers at ${conv(c)}. September’s leads arrive warm from the lapsed list rather than cold from the street, so the funnel is smaller and richer than it looks.`,
    renewals: `${N(c.renewalsDue)} memberships expire, ${P(c.renewalCoverage)} of the renewal book planned. A member who renews in September renews into the festival quarter, which is where the year’s best retention sits.`,
  }),
  // October — bought for other people.
  c => ({
    split: `Of ${L(c.target)}, ${L(c.streams.newClient)} is new-client money, ${L(c.streams.renewal)} renewals and ${L(c.streams.reactivation)} comeback. October’s new-client line is unusually gift-fed: the person who pays and the person who walks in are not always the same person.`,
    leads: `${N(c.leads)} leads, ${N(c.trials)} trials, ${N(c.buyers)} buyers at ${conv(c)}. Gifting distorts the funnel in a good way — a gift card is a lead that arrives already paid for.`,
    renewals: `${N(c.renewalsDue)} memberships expire and ${P(c.renewalCoverage)} of the book is planned. October renewals are best argued with the festival calendar rather than a discount: the member wants to be in the room for Diwali.`,
  }),
  // November — the loud week written into the plan.
  c => ({
    split: `November needs ${L(c.target)}: ${L(c.streams.newClient)} new, ${L(c.streams.renewal)} renewal, ${L(c.streams.reactivation)} comeback. Renewal is ${share(c.streams.renewal, c.target)} of the target, the year’s highest — a soft-demand month is carried by the people who already pay.`,
    leads: `${N(c.leads)} leads → ${N(c.trials)} trials → ${N(c.buyers)} buyers at ${conv(c)}. November’s leads are the hardest of the year to find, which is exactly why the offer has to be a commitment rather than a coupon.`,
    renewals: `${N(c.renewalsDue)} memberships expire and ${P(c.renewalCoverage)} of that renewal book is planned. Renewals here are annual conversations: twelve months of usage to look at, and the data does the selling.`,
  }),
  // December — the year as the argument.
  c => ({
    split: `December’s ${L(c.target)} is ${L(c.streams.newClient)} of new clients, ${L(c.streams.renewal)} of renewals and ${L(c.streams.reactivation)} of comeback — and every line is really a January line, sold a month early.`,
    leads: `${N(c.leads)} leads, ${N(c.trials)} trials, ${N(c.buyers)} buyers at ${conv(c)}. December acquisition is mostly gifting and guests; the serious conversion work is the pre-sale of January.`,
    renewals: `${N(c.renewalsDue)} memberships expire and ${P(c.renewalCoverage)} of the book is planned. With twelve months of data this is the easiest renewal conversation of the year — and the last chance to have it before the calendar resets.`,
  }),
];

export function monthStory(month: number, input: MonthStoryInput): MonthStory {
  const voice = VOICES[Math.min(12, Math.max(1, month)) - 1];
  const total = input.target || input.streams.newClient + input.streams.renewal + input.streams.reactivation || 1;
  return voice(input);
}

/** The month's chapter plus the numbers, in one call. */
export function monthNarrative(month: number, input: MonthStoryInput) {
  return { chapter: monthChapter(month), story: monthStory(month, input) };
}
