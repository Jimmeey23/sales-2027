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
    theme: 'The January Re-Up',
    kicker: 'First light',
    moment:
      'The city restarts: resolutions, new memberships, and the annuals signed last January coming due in the same fortnight.',
    objective: 'Convert January trial demand at full price, and re-up the expiring annuals before the month cools.',
    brief:
      'January is the one month the year comes to you. The resolution crowd walks in without being chased, and last January’s annual members arrive at the same door holding an expiry date. The job is not to buy demand — it is to be ready for it: a full-price first purchase for the new, a warm re-up conversation for the old, and no discount that steals revenue from either.',
    risk: 'New-year discounting. If the first offer of the year is a percentage off, that discount becomes the price anchor for the next eleven months.',
    signature: 'An annual re-up week in the first ten days, before the trial wave peaks.',
  },
  {
    theme: 'Plus-One Season',
    kicker: 'Bring someone',
    moment:
      'Valentine’s on the 14th, Galentine’s on the 13th — the two weekends that turn February into a referral month wearing a romance costume.',
    objective: 'Turn couples and best friends into members, and keep the January cohort’s second month honest.',
    brief:
      'February sells company. The people who join this month are rarely alone: they arrive as a pair, a duo, a friend who was brought along and now wants her own membership. That makes it a referral month, not a romance one — the offer should reward the second person rather than discount the first.',
    risk: 'Buy-one-get-one. BOGO buyers renewed at a third to a half, and almost all of them were already members paying full price.',
    signature: 'A Galentine’s class with a QR at the door, and a duo rate that never discounts the first membership.',
  },
  {
    theme: 'She Moves',
    kicker: 'Half the city',
    moment:
      'International Women’s Day on the 8th, and the reunion that brings the launch-year cohort back into the room.',
    objective: 'Reach the women who left after the launch year, and stop March trials from waiting for April.',
    brief:
      'March belongs to a purpose, not a promotion. Women’s Day gives the studio a reason to gather the women who built the first year — including the hundreds who lapsed after the launch cohort — and a reason to ask plainly why they stopped. The offer is a homecoming, not a discount: come back to the room you helped fill.',
    risk: 'Trials that wait. A March trial allowed to defer its decision becomes an April buyer — at April’s scarcity price, on April’s terms.',
    signature: 'A Class of 2024 reunion, then a short, honest winback window for everyone who was in it.',
  },
  {
    theme: 'Still Shaking',
    kicker: 'The anniversary',
    moment: 'The brand turns a year older, and the Founding 57 goes on sale — fifty-seven numbered annuals, in waves.',
    objective: 'Make the anniversary the revenue month: full-value annuals, hard-capped, hard-closed.',
    brief:
      'April is the flagship. An anniversary is the one moment a membership can be sold as belonging rather than as a price: numbered annuals, released in waves, capped by seat count and closed at midnight on the 30th. Everything else the month does — the hosted classes, the founding story, the countdown — exists to fill that room.',
    risk: 'An anniversary that reads as a sale. The moment the cap becomes negotiable, the scarcity and the price leave together.',
    signature: 'The Founding 57: numbered annual memberships, released in waves, closing at 23:59 on 30 April.',
  },
  {
    theme: 'The Afterparty',
    kicker: 'The month after',
    moment: 'Mother’s Day on the 9th, and the first thirty days of every single person who bought in April.',
    objective:
      'Hold the April cohort: 55% renewal at next expiry, and a second purchase from everyone who can carry one.',
    brief:
      'May is not about acquisition. It is the month that decides whether April was a spike or a membership — the first thirty days of every April buyer, when the habit is still a decision rather than a routine. The work is small and specific: a call in week one, eight classes by month-end, and a hosted class that makes the second visit feel like the point of the first.',
    risk: 'Silence. An April buyer with no contact in the first three weeks is a May churn statistic with a receipt.',
    signature: 'The 30-day Afterparty plan: one call, eight classes, one hosted class.',
  },
  {
    theme: 'Out of Office',
    kicker: 'Before they leave',
    moment:
      'Summer travel, college holidays and Father’s Day on the 20th — the month members leave without cancelling.',
    objective: 'Stop the summer lapse: freeze memberships instead of losing them, and fill the daytime with students.',
    brief:
      'June is the month members disappear politely. Travel, weddings and school holidays empty the room, and the direct debits quietly follow. The job is to catch the exit at the door: a freeze with a return date rather than a cancellation, a plan rather than a pause, and the under-25s who are suddenly free at eleven in the morning.',
    risk: 'Cancellations dressed as pauses. A freeze with no return date is churn with better manners.',
    signature: 'Golden Hours: student access to the quietest slots of the week.',
  },
  {
    theme: 'Rain Check',
    kicker: 'The monsoon test',
    moment: 'Monsoon. Attendance drops six weeks before intent does.',
    objective: 'Hold attendance through the rain, and earn the renewals that fall due in the wettest month.',
    brief:
      'July is a weather month, and weather is an excuse rather than a reason. Attendance falls first; the renewal follows it six weeks later. So the work is attendance — streaks, a little grace on late cancels, and a leaderboard that makes showing up in the rain a small status symbol rather than a chore.',
    risk: 'Late cancels. In the busiest studios they reach a third of all bookings in July.',
    signature: 'The Monsoon Streak: a studio leaderboard for the people who came anyway.',
  },
  {
    theme: 'Squads & Upgrades',
    kicker: 'More than one',
    moment: 'Friendship Day on the 1st, and the second seasonal peak of the Mumbai year.',
    objective: 'Move one-month members onto three-month terms, and let friends bring friends.',
    brief:
      'August is the month of the upgrade. A one-month member renews half the time; a three-month member renews at sixty-eight to seventy-four. The same person, a different length of habit. Friendship Day gives the nudge a social shape — squad classes, friend-led trials — and the upgrade conversation becomes about commitment instead of price.',
    risk: 'Selling more of the same. A longer term at a discount is a smaller margin, not a bigger member.',
    signature: 'Friendship Day squads, and a 1M → 3M upgrade path priced on commitment.',
  },
  {
    theme: 'The 57-Day Comeback',
    kicker: 'Before the lights',
    moment: 'Fifty-seven days to Diwali: the long run-in to the festive season starts on the 2nd.',
    objective: 'Reactivate the lapsed before Diwali, and build a challenge that carries attendance into October.',
    brief:
      'September is the last quiet month before the year gets loud, which makes it the best window to win people back. A 57-day countdown to Diwali gives the comeback a deadline and a story: start now, walk into the festival having already changed something. The cohort is the offer; the festival is the reason.',
    risk: 'A comeback that peaks on day three. Without a cohort and a check-in, reactivation is a message rather than a habit.',
    signature: 'The 57 Days to Diwali cohort: one start date, one leaderboard, one finish line.',
  },
  {
    theme: 'Festival of Lights',
    kicker: 'Give the room',
    moment: 'Diwali on the 29th, Dasara week in Bengaluru, and the year’s biggest gifting window.',
    objective: 'Sell the festival through gifting, and protect the Bengaluru Dasara trough.',
    brief:
      'October is bought for other people. Diwali gifting turns a membership into a present — a card, a class, a candle-lit evening — and brings in revenue no discount could. The other half of the month is defensive: Dasara week empties Bengaluru, and the plan has to hold the numbers while the city is at home.',
    risk: 'Codes. A festival rush bought with promo codes becomes a January renewal problem.',
    signature: 'Gift a Shake cards, and candle-lit evening classes through Diwali week.',
  },
  {
    theme: 'Strong Monday',
    kicker: 'Lock the year',
    moment: 'Black Friday on the 26th, Cyber Monday on the 29th, and the softest four weeks in Mumbai.',
    objective: 'Use the one week the city expects a deal to sell annual commitments, not discounts.',
    brief:
      'November has the year’s softest demand and its loudest discount week. The instinct is to join in; the plan is to use the noise. Black Friday is the one moment a long commitment is culturally expected, so the Founding 57 returns for a second wave — annuals, capped, closing on Monday — instead of a percentage off a month.',
    risk: 'A discount week that discounts the year. An annual sold at 40% off is sold at 40% off forever.',
    signature: 'The Founding 57, second wave: remaining seats only, Cyber Monday close.',
  },
  {
    theme: 'Wrapped, Then Renewed',
    kicker: 'Close the loop',
    moment: 'Year-end, and the January decision made a month early.',
    objective: 'Pre-sell January with the year’s own data, and renew on personal usage.',
    brief:
      'December is where the year is counted. Every member gets their own 2027 Wrapped — the classes, the streaks, the months that went missing — and the last page is a renewal prescription built from their own attendance. The month’s real product is the argument, and the argument is already in the data.',
    risk: 'January panic. A renewal left to the new year is a renewal argued against January’s discounts.',
    signature: '‘Your 2027 Wrapped’: a personal year-in-review ending in a renewal prescription.',
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
