/* Sales Plan › month cover narration.
   Every month's cover can be listened to as well as read: a short, spoken director's
   commentary that states the month's focus, the reason it works that way, what usually
   goes wrong, the one move the month is built on, and the four weeks of the action plan.

   The scripts are deliberately studio-agnostic. Figures are live on the cover and differ
   by studio, so the voice explains the *shape* of the month — the split, the funnel, the
   risk, the plan — and never reads a number that would be wrong for another room. They
   are written for speech: no currency symbols, no percentages, no arrows, numbers spelled
   where the reading would otherwise be ambiguous. */

/** A beat is both a caption and a thing on the cover that should light up with it. */
export type CoverBeat = 'focus' | 'why' | 'risk' | 'move' | 'planEarly' | 'planLate' | 'close';

export interface CoverSegment {
  beat: CoverBeat;
  /** Spoken text. Also the caption — never truncated, so it has to read well on screen. */
  text: string;
}

export interface CoverNarrationData {
  month: number;
  /** Working title of the cover's argument, used as the transcript's heading. */
  title: string;
  /** Static file in /public/voice, generated from these segments. */
  audio: string;
  segments: CoverSegment[];
}

export const COVER_BEATS: CoverBeat[] = ['focus', 'why', 'risk', 'move', 'planEarly', 'planLate', 'close'];

export const COVER_BEAT_LABEL: Record<CoverBeat, string> = {
  focus: 'The focus',
  why: 'Why it works',
  risk: 'What goes wrong',
  move: 'The move',
  planEarly: 'Weeks 1–2',
  planLate: 'Weeks 3–4',
  close: 'The close',
};

const NARRATION: CoverNarrationData[] = [
  {
    month: 1,
    title: 'Full price, full room, no anchor',
    audio: '/voice/month-01.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'January. The January Re-Up. The city restarts, the resolution crowd arrives without being chased, and last January’s annuals come due in the same fortnight.',
      },
      {
        beat: 'why',
        text: 'This is the one month the year comes to you. The job is not to buy demand. It is to be ready for it: a full price first purchase for the new, a warm re-up for the old, and no discount that steals revenue from either.',
      },
      {
        beat: 'risk',
        text: 'The risk is new year discounting. If the first offer of the year is a percentage off, that number becomes the price anchor for the next eleven months.',
      },
      {
        beat: 'move',
        text: 'So the move is an annual re-up week inside the first ten days, before the trial wave peaks.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: brief the team, open the renewal calls, launch the offer. Week two: fill the diary with qualified leads, and book the trials.',
      },
      {
        beat: 'planLate',
        text: 'Week three: bring the lapsed back to a comeback class, then hold the mid month review against target. Week four: close, convert the open trials, chase what is pending, and set up February.',
      },
      { beat: 'close', text: 'Full price, full room, no anchor. That is January.' },
    ],
  },
  {
    month: 2,
    title: 'Sell the pair, never the discount',
    audio: '/voice/month-02.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'February. Plus-One Season. Valentine’s on the fourteenth and Galentine’s on the thirteenth turn the month into a referral month wearing a romance costume.',
      },
      {
        beat: 'why',
        text: 'The people who join now rarely arrive alone. They come as a pair, a duo, a friend who was brought along and now wants her own membership. So the offer rewards the second person. It never discounts the first.',
      },
      {
        beat: 'risk',
        text: 'The risk is buy one, get one. Those buyers renewed at a third to a half, and almost all of them were already members paying full price.',
      },
      {
        beat: 'move',
        text: 'The move is a Galentine’s class with a code at the door, and a duo rate that protects the first membership.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: renew the January cohort early, brief the squad offer, open the friend led trials. Week two: run the Galentine’s and Valentine’s classes, and follow up every guest while the visit is still warm.',
      },
      {
        beat: 'planLate',
        text: 'Week three: convert the second month, and call everyone who came as somebody’s guest. Week four: close, protect the first month renewal rate, and pre plan March.',
      },
      { beat: 'close', text: 'Sell the pair, never the discount. That is February.' },
    ],
  },
  {
    month: 3,
    title: 'Bring the room back, not the discount',
    audio: '/voice/month-03.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'March. She Moves. International Women’s Day on the eighth, and a reunion that brings the launch year cohort back into the room.',
      },
      {
        beat: 'why',
        text: 'March belongs to a purpose, not a promotion. Women’s Day is a reason to gather the women who built the first year, including the hundreds who lapsed after it, and to ask them plainly why they stopped. The offer is a homecoming, not a price cut.',
      },
      {
        beat: 'risk',
        text: 'The risk is trials that wait. A March trial allowed to defer its decision becomes an April buyer, at April’s scarcity price, on April’s terms.',
      },
      {
        beat: 'move',
        text: 'The move is a reunion for the launch cohort, followed by a short and honest winback window for everyone who was in it.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: send the reunion invitations, brief the winback list, and open the window. Week two: host the reunion, and ask every returning member one honest question.',
      },
      {
        beat: 'planLate',
        text: 'Week three: convert the reunion, and stop any trial from deferring. Week four: close, and hand April a warm list instead of a cold one.',
      },
      { beat: 'close', text: 'Bring the room back, not the discount. That is March.' },
    ],
  },
  {
    month: 4,
    title: 'Scarcity is the product',
    audio: '/voice/month-04.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'April. Still Shaking. The brand turns a year older, and the Founding Fifty-Seven goes on sale: fifty-seven numbered annuals, released in waves.',
      },
      {
        beat: 'why',
        text: 'April is the flagship. An anniversary is the one moment a membership sells as belonging rather than as a price. Numbered annuals, capped by seat count, closed at midnight on the thirtieth. Everything else the month does exists to fill that room.',
      },
      {
        beat: 'risk',
        text: 'The risk is an anniversary that reads as a sale. The moment the cap becomes negotiable, the scarcity and the price leave together.',
      },
      {
        beat: 'move',
        text: 'So the move is the Founding Fifty-Seven itself: numbered annual memberships, released in waves, closing at one minute to midnight on the thirtieth.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: build the list before the wave opens, and brief the team on the cap. Week two: release the first wave, and let the waitlist do the selling.',
      },
      {
        beat: 'planLate',
        text: 'Week three: release the second wave, and count the seats in public. Week four: close the cap on the thirtieth, and open the afterparty list.',
      },
      { beat: 'close', text: 'Scarcity is the product. That is April.' },
    ],
  },
  {
    month: 5,
    title: 'April is only real if May keeps it',
    audio: '/voice/month-05.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'May. The Afterparty. Mother’s Day on the ninth, and the first thirty days of every single person who bought in April.',
      },
      {
        beat: 'why',
        text: 'This month is not about acquisition. It decides whether April was a spike or a membership. The habit is still a decision rather than a routine, so the work is small and specific: a call in week one, eight classes by month end, and one hosted class.',
      },
      {
        beat: 'risk',
        text: 'The risk is silence. An April buyer with no contact in the first three weeks is a May churn statistic with a receipt.',
      },
      { beat: 'move', text: 'The move is the thirty day Afterparty plan: one call, eight classes, one hosted class.' },
      {
        beat: 'planEarly',
        text: 'Week one: call every April buyer, personally. Week two: get each of them into class twice, and hosted once.',
      },
      {
        beat: 'planLate',
        text: 'Week three: count attendance, and call the ones who are missing. Week four: ask for the second purchase, and lock the next term before the habit cools.',
      },
      { beat: 'close', text: 'April is only real if May keeps it. That is May.' },
    ],
  },
  {
    month: 6,
    title: 'Freeze them, do not lose them',
    audio: '/voice/month-06.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'June. Out of Office. Summer travel, school holidays, and Father’s Day on the twentieth: the month members leave without cancelling.',
      },
      {
        beat: 'why',
        text: 'June is the month members disappear politely. Travel and holidays empty the room, and the direct debits quietly follow. The job is to catch the exit at the door: a freeze with a return date rather than a cancellation, and a plan rather than a pause.',
      },
      {
        beat: 'risk',
        text: 'The risk is cancellations dressed as pauses. A freeze with no return date is churn with better manners.',
      },
      {
        beat: 'move',
        text: 'The move is Golden Hours: student access to the quietest slots of the week, and freezes that carry a date back to the mat.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: call everyone who is about to leave, and offer the freeze with a date on it. Week two: open Golden Hours to the under twenty-fives.',
      },
      {
        beat: 'planLate',
        text: 'Week three: hold attendance with the summer schedule, and fill the late morning classes. Week four: close the month, and diarise every return date.',
      },
      { beat: 'close', text: 'Freeze them, do not lose them. That is June.' },
    ],
  },
  {
    month: 7,
    title: 'Show up in the rain, and the renewal follows',
    audio: '/voice/month-07.mp3',
    segments: [
      { beat: 'focus', text: 'July. Rain Check. Monsoon. Attendance drops six weeks before intent does.' },
      {
        beat: 'why',
        text: 'July is a weather month, and weather is an excuse rather than a reason. Attendance falls first and the renewal follows it six weeks later. So the work is attendance: streaks, a little grace on late cancels, and a leaderboard that makes showing up in the rain a small status symbol.',
      },
      {
        beat: 'risk',
        text: 'The risk is late cancels. In the busiest studios they reach a third of all bookings in July.',
      },
      { beat: 'move', text: 'The move is the Monsoon Streak: a studio leaderboard for the people who came anyway.' },
      {
        beat: 'planEarly',
        text: 'Week one: announce the streak, and reset the late cancel grace. Week two: publish the leaderboard, and call the members who have gone quiet.',
      },
      {
        beat: 'planLate',
        text: 'Week three: renew whoever falls due this month, while they are still coming. Week four: close, and count attendance before counting revenue.',
      },
      { beat: 'close', text: 'Show up in the rain, and the renewal follows. That is July.' },
    ],
  },
  {
    month: 8,
    title: 'Same member, longer habit',
    audio: '/voice/month-08.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'August. Squads and Upgrades. Friendship Day on the first, and the second seasonal peak of the Mumbai year.',
      },
      {
        beat: 'why',
        text: 'This is the month of the upgrade. A one month member renews half the time. A three month member renews at sixty-eight to seventy-four percent. Same person, a different length of habit. Friendship Day gives the nudge a social shape: squad classes, and friend led trials.',
      },
      {
        beat: 'risk',
        text: 'The risk is selling more of the same. A longer term at a discount is a smaller margin, not a bigger member.',
      },
      {
        beat: 'move',
        text: 'The move is Friendship Day squads, and a one to three month upgrade path priced on commitment rather than on price.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: invite the squads, and list every one month member who is due. Week two: run the squad classes, and open the upgrade conversation.',
      },
      {
        beat: 'planLate',
        text: 'Week three: convert the upgrades, and hold the price. Week four: close, and move the rest of the book onto the next term.',
      },
      { beat: 'close', text: 'Same member, longer habit. That is August.' },
    ],
  },
  {
    month: 9,
    title: 'One start date, one finish line',
    audio: '/voice/month-09.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'September. The Fifty-Seven Day Comeback. Fifty-seven days to Diwali, starting on the second.',
      },
      {
        beat: 'why',
        text: 'This is the last quiet month before the year gets loud, which makes it the best window to win people back. A countdown to Diwali gives the comeback a deadline and a story: start now, and walk into the festival having already changed something.',
      },
      {
        beat: 'risk',
        text: 'The risk is a comeback that peaks on day three. Without a cohort and a check in, reactivation is a message rather than a habit.',
      },
      {
        beat: 'move',
        text: 'The move is the Fifty-Seven Days to Diwali cohort: one start date, one leaderboard, one finish line.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: call the whole lapsed list, and open a single start date. Week two: start the cohort, and check in on every single one of them.',
      },
      {
        beat: 'planLate',
        text: 'Week three: publish the leaderboard, and catch the people dropping off. Week four: close the cohort, and convert it before the festival arrives.',
      },
      { beat: 'close', text: 'One start date, one finish line. That is September.' },
    ],
  },
  {
    month: 10,
    title: 'Sell the present, not the code',
    audio: '/voice/month-10.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'October. Festival of Lights. Diwali on the twenty-ninth, Dasara week in Bengaluru, and the year’s biggest gifting window.',
      },
      {
        beat: 'why',
        text: 'October is bought for other people. Gifting turns a membership into a present: a card, a class, a candle lit evening. It brings in revenue no discount could. The other half of the month is defensive, because Dasara week empties Bengaluru.',
      },
      {
        beat: 'risk',
        text: 'The risk is codes. A festival rush bought with promo codes becomes a January renewal problem.',
      },
      {
        beat: 'move',
        text: 'The move is gifting at the desk, and candle lit evening classes through Diwali week.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: open gifting, and stock the cards at the desk. Week two: protect Dasara week, and hold the numbers while the city is at home.',
      },
      {
        beat: 'planLate',
        text: 'Week three: run the candle lit evenings, and gift every guest. Week four: close, and bank the gift cards for January.',
      },
      { beat: 'close', text: 'Sell the present, not the code. That is October.' },
    ],
  },
  {
    month: 11,
    title: 'Use the noise, never the discount',
    audio: '/voice/month-11.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'November. Strong Monday. Black Friday on the twenty-sixth, Cyber Monday on the twenty-ninth, and the softest four weeks in Mumbai.',
      },
      {
        beat: 'why',
        text: 'This month has the year’s softest demand and its loudest discount week. The instinct is to join in. The plan is to use the noise. Black Friday is the one moment a long commitment is culturally expected, so the Founding Fifty-Seven returns instead of a percentage off.',
      },
      {
        beat: 'risk',
        text: 'The risk is a discount week that discounts the year. An annual sold at forty percent off is sold at forty percent off forever.',
      },
      {
        beat: 'move',
        text: 'The move is the second wave of the Founding Fifty-Seven: remaining seats only, closing on Cyber Monday.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: warm the waitlist, and protect the weekday numbers. Week two: open the second wave quietly, to the list first.',
      },
      {
        beat: 'planLate',
        text: 'Week three: go public on Black Friday, and count the seats out loud. Week four: close on Cyber Monday, and hold the price.',
      },
      { beat: 'close', text: 'Use the noise, never the discount. That is November.' },
    ],
  },
  {
    month: 12,
    title: 'The argument is already in the data',
    audio: '/voice/month-12.mp3',
    segments: [
      {
        beat: 'focus',
        text: 'December. Wrapped, Then Renewed. Year end, and the January decision made a month early.',
      },
      {
        beat: 'why',
        text: 'December is where the year is counted. Every member gets their own wrapped: the classes, the streaks, the months that went missing. The last page is a renewal prescription built from their own attendance. The month’s real product is the argument, and the argument is already in the data.',
      },
      {
        beat: 'risk',
        text: 'The risk is January panic. A renewal left to the new year is a renewal argued against January’s discounts.',
      },
      {
        beat: 'move',
        text: 'The move is Your Year Wrapped: a personal year in review that ends in a renewal prescription.',
      },
      {
        beat: 'planEarly',
        text: 'Week one: pull the data, and build a wrapped for every member. Week two: send them, and open the renewal calls on the back of them.',
      },
      {
        beat: 'planLate',
        text: 'Week three: sell January early, and fill the gifting slots. Week four: close the year, and hand January a full diary.',
      },
      { beat: 'close', text: 'The argument is already in the data. That is December.' },
    ],
  },
];

export function coverNarration(month: number): CoverNarrationData {
  return NARRATION[Math.min(12, Math.max(1, month)) - 1];
}

/** The whole script as one string — for the transcript panel and for the voice pass. */
export function coverScript(month: number): string {
  return coverNarration(month)
    .segments.map(s => s.text)
    .join('\n\n');
}

/**
 * Segment windows without word timestamps.
 *
 * The audio is one file per month, so each caption's start is estimated by that segment's
 * share of the spoken text (short pauses included). Segments are written to a similar
 * length for exactly this reason, which keeps the drift at a fraction of a sentence —
 * plenty for a caption and for a block lighting up as it is described.
 */
export function segmentWindows(duration: number, segments: CoverSegment[]) {
  // Characters carry the reading time; punctuation carries the pauses that fall between
  // them. Calibrated against the recorded files (~13 characters a second, ~0.35 s at a
  // full stop), which keeps the caption within a fraction of a line of the voice.
  const weight = (t: string) => {
    const stops = (t.match(/[.!?]/g) || []).length;
    const beats = (t.match(/[,;:]/g) || []).length;
    return t.length + stops * 4.5 + beats * 2;
  };
  const total = segments.reduce((sum, s) => sum + weight(s.text), 0) || 1;
  let cursor = 0;
  return segments.map(s => {
    const span = (weight(s.text) / total) * (duration || 0);
    const start = cursor;
    cursor += span;
    return { start, end: cursor };
  });
}

export function segmentAt(time: number, windows: { start: number; end: number }[]): number {
  for (let i = windows.length - 1; i >= 0; i--) {
    if (time >= windows[i].start) return i;
  }
  return 0;
}

/** Which part of the cover a beat should light up. */
export const BEAT_TARGET: Record<CoverBeat, string> = {
  focus: 'hero',
  why: 'brief',
  risk: 'risk',
  move: 'move',
  planEarly: 'plan',
  planLate: 'plan',
  close: 'close',
};
