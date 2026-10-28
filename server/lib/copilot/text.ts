// Text understanding for P57 Copilot: normalisation, slot parsing and matching.
// Everything here is pure so it can be unit-tested without a database.

export const MONTH_NAMES = [
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
] as const;

export const MONTH_SHORT = MONTH_NAMES.map(name => name.slice(0, 3));

export type MonthRef = { year: number; month: number };

export type OfferKindSlug =
  | 'newcomer_3_for_2'
  | 'newcomer_2_for_1'
  | 'intro_pack'
  | 'free_trial'
  | 'paid_trial'
  | 'first_membership'
  | 'lapsed_return'
  | 'annual'
  | 'six_month'
  | 'student'
  | 'class_pack';

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'for',
  'to',
  'in',
  'on',
  'at',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'do',
  'does',
  'did',
  'how',
  'what',
  'which',
  'who',
  'when',
  'where',
  'why',
  'can',
  'could',
  'should',
  'would',
  'will',
  'we',
  'our',
  'us',
  'me',
  'my',
  'i',
  'you',
  'your',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'with',
  'about',
  'give',
  'show',
  'tell',
  'please',
  'need',
  'want',
  'much',
  'many',
  'more',
  'most',
  'best',
  'worst',
]);

export function normalise(input: unknown): string {
  return String(input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(input: unknown): string[] {
  return normalise(input)
    .replace(/[^a-z0-9%₹.\s-]/g, ' ')
    .split(/[\s-]+/)
    .map(word => word.replace(/^\.+|\.+$/g, ''))
    .filter(word => word.length > 1 && !STOPWORDS.has(word));
}

/** Token-overlap similarity in 0..1, used for fuzzy studio/offer matching and search. */
export function similarity(a: unknown, b: unknown): number {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.max(left.size, right.size);
}

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  lac: 100_000,
  lakh: 100_000,
  lakhs: 100_000,
  l: 100_000,
  cr: 10_000_000,
  crore: 10_000_000,
  crores: 10_000_000,
  m: 1_000_000,
  mn: 1_000_000,
  million: 1_000_000,
};

/**
 * Reads an Indian-format money amount: "₹4.5L", "45 lakh", "1.2 crore", "72k", "420000".
 * Returns null when the text carries no amount.
 */
export function parseMoney(input: unknown): number | null {
  const text = normalise(input).replace(/,/g, '');
  const match = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lac|lakhs?|l|cr|crores?|m|mn|million)?\b/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[2];
  return suffix ? Math.round(base * MULTIPLIERS[suffix]) : Math.round(base);
}

/** Reads a percentage: "18%", "18 percent", "0.18". Returns a fraction (0.18). */
export function parsePercent(input: unknown): number | null {
  const text = normalise(input);
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*(?:%|percent|pct|per cent)/);
  if (match) return Number(match[1]) / 100;
  return null;
}

const MONTH_LOOKUP = new Map<string, number>();
MONTH_NAMES.forEach((name, index) => {
  MONTH_LOOKUP.set(name.toLowerCase(), index + 1);
  MONTH_LOOKUP.set(name.slice(0, 3).toLowerCase(), index + 1);
  MONTH_LOOKUP.set(name.slice(0, 4).toLowerCase(), index + 1);
});
MONTH_LOOKUP.set('sept', 9);

export function monthIndex(word: string): number | null {
  return MONTH_LOOKUP.get(normalise(word)) ?? null;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthLabel(year: number, month: number, short = false): string {
  const name = (short ? MONTH_SHORT : MONTH_NAMES)[month - 1] ?? 'Unknown';
  return `${name} ${year}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const base = new Date(Date.UTC(ref.year, ref.month - 1 + delta, 1));
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 };
}

export function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

export function compareMonthKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let [year, month] = from.split('-').map(Number);
  const [endYear, endMonth] = to.split('-').map(Number);
  for (let guard = 0; guard < 240; guard += 1) {
    out.push(monthKey(year, month));
    if (year === endYear && month === endMonth) break;
    const next = addMonths({ year, month }, 1);
    year = next.year;
    month = next.month;
  }
  return out;
}

export type ParsedTime =
  | { kind: 'month'; month: MonthRef; explicit: boolean }
  | { kind: 'quarter'; year: number; quarter: number; explicit: boolean }
  | { kind: 'year'; year: number; explicit: boolean }
  | { kind: 'range'; from: MonthRef; to: MonthRef; explicit: boolean }
  | { kind: 'relative'; offset: number; explicit: boolean }
  | { kind: 'last_months'; months: number; explicit: boolean };

const PLANNING_YEAR = 2027;

/**
 * Finds the time the question is about: explicit `2027-04`, a month name, a quarter
 * ("Q2", "second quarter"), a year, a range ("Jan to March") or a relative phrase
 * ("next month", "last 6 months"). Ambiguous text returns null and the engine falls
 * back to the conversation's month.
 */
export function parseTime(input: unknown, today = new Date()): ParsedTime | null {
  const text = normalise(input);

  const iso = text.match(/\b(20\d{2})-(\d{1,2})\b/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { kind: 'month', month: { year, month }, explicit: true };
  }

  const yearOnly = text.match(/\b(20\d{2})\b/);
  const year = yearOnly ? Number(yearOnly[1]) : null;

  const range = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b\s*(?:-|–|to|through|until|till|and)\s*\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/,
  );
  if (range) {
    const from = monthIndex(range[1]);
    const to = monthIndex(range[2]);
    if (from && to) {
      const startYear = year ?? PLANNING_YEAR;
      const endYear = to < from ? startYear + 1 : startYear;
      return {
        kind: 'range',
        from: { year: startYear, month: from },
        to: { year: endYear, month: to },
        explicit: true,
      };
    }
  }

  const quarterMatch =
    text.match(/\bq([1-4])\b/) ||
    text.match(/\b(?:([1-4])(?:st|nd|rd|th))\s+quarter\b/) ||
    text.match(/\b(first|second|third|fourth)\s+quarter\b/);
  if (quarterMatch) {
    const raw = quarterMatch[1];
    const numeric = Number(raw);
    const quarter = Number.isFinite(numeric)
      ? numeric
      : ({ first: 1, second: 2, third: 3, fourth: 4 } as Record<string, number>)[raw] ?? 1;
    if (quarter >= 1 && quarter <= 4)
      return { kind: 'quarter', year: year ?? PLANNING_YEAR, quarter, explicit: true };
  }

  const lastMonths = text.match(/last\s+(\d{1,2})\s+months?/) || text.match(/(\d{1,2})\s*months?\s+back/);
  if (lastMonths) return { kind: 'last_months', months: Math.min(36, Number(lastMonths[1])), explicit: true };

  const relative = text.match(/\b(next|this|current|last)\s+month\b/);
  if (relative) {
    const offset = relative[1] === 'last' ? -1 : relative[1] === 'next' ? 1 : 0;
    return { kind: 'relative', offset, explicit: true };
  }

  const named = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/,
  );
  if (named) {
    const month = monthIndex(named[1]);
    if (month) return { kind: 'month', month: { year: year ?? PLANNING_YEAR, month }, explicit: Boolean(year) };
  }

  if (year) return { kind: 'year', year, explicit: true };
  return null;
}

/** Resolves a parsed time into the concrete months it covers. */
export function timeToMonths(parsed: ParsedTime | null, fallback: MonthRef): MonthRef[] {
  if (!parsed) return [fallback];
  switch (parsed.kind) {
    case 'month':
      return [parsed.month];
    case 'quarter': {
      const start = (parsed.quarter - 1) * 3 + 1;
      return [0, 1, 2].map(offset => ({ year: parsed.year, month: start + offset }));
    }
    case 'year':
      return Array.from({ length: 12 }, (_, index) => ({ year: parsed.year, month: index + 1 }));
    case 'range': {
      const keys = monthRange(
        monthKey(parsed.from.year, parsed.from.month),
        monthKey(parsed.to.year, parsed.to.month),
      );
      return keys.map(key => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) }));
    }
    case 'relative':
      return [addMonths(fallback, parsed.offset)];
    case 'last_months': {
      const out: MonthRef[] = [];
      for (let index = parsed.months - 1; index >= 0; index -= 1) out.push(addMonths(fallback, -index));
      return out;
    }
    default:
      return [fallback];
  }
}

const KIND_PATTERNS: [RegExp, OfferKindSlug][] = [
  [/3\s*(?:classes?)?\s*(?:for|\/)\s*(?:the price of\s*)?2|three.*price of two|3-for-2/, 'newcomer_3_for_2'],
  [/2\s*(?:classes?)?\s*(?:for|\/)\s*(?:the price of\s*)?1|two.*price of one|2-for-1/, 'newcomer_2_for_1'],
  [/intro pack|introductory pack|first-class intro|first class intro/, 'intro_pack'],
  [/free trial|complimentary trial|trial class/, 'free_trial'],
  [/paid trial|paid intro/, 'paid_trial'],
  [/first membership|membership launch/, 'first_membership'],
  [/lapsed|comeback|come back|reactivat|win.?back|dormant/, 'lapsed_return'],
  [/annual|12.?month|yearly/, 'annual'],
  [/6.?month|six.?month|half.?year/, 'six_month'],
  [/student/, 'student'],
  [/class pack|pack of|(\b(?:10|20|30)[ -]?(?:class|pack))/, 'class_pack'],
];

export function parseOfferKind(input: unknown): { slug: OfferKindSlug; count?: number } | null {
  const text = normalise(input);
  for (const [pattern, slug] of KIND_PATTERNS) if (pattern.test(text)) {
    if (slug === 'class_pack') {
      const pack = text.match(/\b(10|20|30)[ -]?(?:class|pack)/);
      return { slug, count: Number(pack?.[1] || 10) };
    }
    return { slug };
  }
  return null;
}

/** Human list: "A", "A and B", "A, B and C". */
export function listWords(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? '';
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

export function titleCase(input: string): string {
  return input.replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function safeDiv(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || !Number.isFinite(numerator) || !Number.isFinite(denominator))
    return null;
  if (denominator === 0) return null;
  return numerator / denominator;
}

/** Rupees → compact Indian formatting for prose and cards. */
export function rupees(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'not available';
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return 'not available';
  return `${(value * 100).toFixed(digits)}%`;
}

export function delta(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return 'not available';
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(digits)}%`;
}

export function count(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'not available';
  return Math.round(value).toLocaleString('en-IN');
}
