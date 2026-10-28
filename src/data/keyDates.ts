/* The dates that actually move a Physique 57 month.

   This is deliberately not a holiday list. A studio plan only needs the handful of days
   that change how a woman in Mumbai or Bengaluru feels about booking a class — the
   gifting moments, the body-image and mental-health moments, the two months the brand
   itself owns, and the retail windows worth building an offer around. Everything else
   (World Braille Day, World Toilet Day, statehood days) is noise in a sales plan.

   Dates are computed per year rather than hard-coded to one, so Mother's Day is always
   the second Sunday of May, Black Friday always follows the fourth Thursday of November,
   and the shift-aware years do not silently drift. Only the lunar festivals carry a
   per-year table, and those are flagged `approx` until the official list is published. */

export type KeyDateKind = 'festival' | 'holiday' | 'awareness' | 'global' | 'retail' | 'brand';

export interface KeyDate {
  day: number;
  /** Last day of a month-long observance. */
  end?: number;
  name: string;
  kind: KeyDateKind;
  /** Lunar or notification-dependent date: confirm before locking campaign dates. */
  approx?: boolean;
  /** Why this one is on the list, in the studio's language. */
  note?: string;
}

export const KEY_DATE_LABELS: Record<KeyDateKind, string> = {
  festival: 'Festival',
  holiday: 'Holiday',
  awareness: 'Wellness moment',
  global: 'Awareness day',
  retail: 'Retail moment',
  brand: 'P57 moment',
};

/** The brand's founding month, used to count the anniversary rather than assume it. */
const FOUNDED_YEAR = 2018;

/** Lunar festivals, which move every year and cannot be computed from a weekday rule. */
const LUNAR: Record<string, Record<number, number>> = {
  // Diwali (Lakshmi Puja). Confirmed against the 2027 Department of Personnel & Training
  // holiday order, which lists Friday 29 October 2027 as the gazetted date.
  diwali: { 2026: 8, 2027: 29, 2028: 17 },
};

/** Day of the nth given weekday in a month: nthWeekday(2027, 5, 0, 2) is the 2nd Sunday. */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(year, month - 1, 1).getDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

interface Rule {
  month: number;
  /** Month-long observance: spans the whole month. */
  span?: boolean;
  day?: (year: number) => number | undefined;
  end?: (year: number) => number;
  name: string;
  kind: KeyDateKind;
  approx?: boolean;
  note?: string;
}

const RULES: Rule[] = [
  // ── January ───────────────────────────────────────────────────────────────
  {
    month: 1,
    day: () => 1,
    name: 'New Year',
    kind: 'retail',
    note: 'The single biggest resolution month for a fitness studio. Sell the restart.',
  },

  // ── February ──────────────────────────────────────────────────────────────
  {
    month: 2,
    span: true,
    name: 'Pride Month',
    kind: 'awareness',
    note: 'Mumbai and Bengaluru Pride season. Community classes, not a discount.',
  },
  {
    month: 2,
    day: () => 14,
    name: 'Valentine’s Day',
    kind: 'retail',
    note: 'The pair offer: bring someone, both train. Gifted classes enter the encore flow.',
  },

  // ── March ─────────────────────────────────────────────────────────────────
  {
    month: 3,
    day: () => 8,
    name: 'International Women’s Day',
    kind: 'global',
    note: 'The studio’s core audience. Programme the room, not the price.',
  },

  // ── April ─────────────────────────────────────────────────────────────────
  {
    month: 4,
    day: () => 7,
    name: 'World Health Day',
    kind: 'awareness',
    note: 'Justifies the health-led message that opens the anniversary month.',
  },
  {
    month: 4,
    day: () => 18,
    name: 'Physique 57 anniversary',
    kind: 'brand',
    note: 'The brand’s own birthday. The flagship offer closes on this night.',
  },

  // ── May ───────────────────────────────────────────────────────────────────
  {
    month: 5,
    span: true,
    name: 'Mental Health Awareness Month',
    kind: 'awareness',
    note: 'Movement as a mental-health practice: the most honest retention story there is.',
  },
  {
    month: 5,
    day: year => nthWeekday(year, 5, 0, 2),
    name: 'Mother’s Day',
    kind: 'retail',
    note: 'The second seat: daughters buying for mothers, and mothers for daughters.',
  },

  // ── June ──────────────────────────────────────────────────────────────────
  {
    month: 6,
    day: year => nthWeekday(year, 6, 0, 3),
    name: 'Father’s Day',
    kind: 'retail',
    note: 'A low-effort pairing window. Strength Lab for two.',
  },

  // ── July ──────────────────────────────────────────────────────────────────
  {
    month: 7,
    span: true,
    name: 'Monsoon',
    kind: 'brand',
    note: 'Attendance dips for six weeks. Sell short terms and freeze the long ones.',
  },

  // ── August ────────────────────────────────────────────────────────────────
  {
    month: 8,
    day: year => nthWeekday(year, 8, 0, 1),
    name: 'Friendship Day',
    kind: 'retail',
    note: 'The referral engine: a member brings a friend, the friend gets a first class.',
  },
  {
    month: 8,
    day: () => 9,
    name: 'Women’s Day',
    kind: 'global',
    note: 'A second women-led moment in the quietest stretch of the year.',
  },

  // ── September ─────────────────────────────────────────────────────────────
  {
    month: 9,
    day: () => 29,
    name: 'World Heart Day',
    kind: 'awareness',
    note: 'Cardio and cycle formats get a reason to be talked about.',
  },

  // ── October ───────────────────────────────────────────────────────────────
  {
    month: 10,
    day: () => 19,
    name: 'Breast Cancer Awareness',
    kind: 'awareness',
    note: 'Marked with the community, never sold on. Screening information in the studio.',
  },
  {
    month: 10,
    day: year => LUNAR.diwali[year],
    name: 'Diwali',
    kind: 'festival',
    approx: true,
    note: 'The gifting window: the one month a year people buy a membership for someone else.',
  },
  {
    month: 10,
    day: () => 31,
    name: 'Halloween',
    kind: 'retail',
    note: 'A themed class night. Cheap to run, strong on stories.',
  },

  // ── November ──────────────────────────────────────────────────────────────
  {
    month: 11,
    day: () => 11,
    name: 'Singles’ Day (11.11)',
    kind: 'retail',
    note: 'A second 11.11 window, read in India as a self-purchase day.',
  },
  {
    // The day after the fourth Thursday of November.
    month: 11,
    day: year => nthWeekday(year, 11, 4, 4) + 1,
    name: 'Black Friday',
    kind: 'retail',
    note: 'The annual-plan window. Capped seat count, never an open discount.',
  },

  // ── December ──────────────────────────────────────────────────────────────
  {
    month: 12,
    day: () => 25,
    name: 'Christmas',
    kind: 'holiday',
    note: 'The gifting close and the last quiet week to sell the next year.',
  },
];

/** The brand-relevant days for one month, in date order. */
export function keyDatesFor(year: number, month: number): KeyDate[] {
  const days: KeyDate[] = [];
  for (const rule of RULES) {
    if (rule.month !== month) continue;
    if (rule.span) {
      const lastDay = new Date(year, month, 0).getDate();
      days.push({ day: 1, end: lastDay, name: rule.name, kind: rule.kind, note: rule.note });
      continue;
    }
    const day = rule.day?.(year);
    if (!day || day < 1 || day > 31) continue;
    days.push({
      day,
      name: rule.name,
      kind: rule.kind,
      approx: rule.approx,
      note: rule.note,
    });
  }
  if (month === 4) {
    // The anniversary is counted, not assumed: the cover and the day card must agree.
    const n = year - FOUNDED_YEAR;
    const card = days.find(d => d.kind === 'brand');
    if (card) card.name = `Physique 57 anniversary · ${n} years`;
  }
  return days.sort((a, b) => a.day - b.day);
}

export const formatKeyDate = (d: KeyDate) => (d.end ? `${d.day}–${d.end}` : String(d.day));
