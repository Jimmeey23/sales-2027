/* Sales Plan › month narratives, taken from the final approved 2027 Sales and Offer Plan:
   each month's theme, hook, commercial job, moment and offers, plus a voice that explains
   the studio's planned numbers. */
import {
  APPROVED_PLAN_2027,
  approvedEntry,
  approvedMonth,
  approvedOffer,
  field,
  type ApprovedEntry,
} from './approvedPlan2027';

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

// A month can carry more than its three plan slots (February runs the challenge and the duo
// route together). The cover speaks for the three that occupy the slots; the rest are the
// month's supporting plays and stay in the plan itself.
const primaryOffers = (e: ApprovedEntry) => {
  const seen = new Set<string>();
  return e.offers.filter(o => (seen.has(o.slot) ? false : (seen.add(o.slot), true)));
};

export const MONTH_CHAPTERS: MonthChapter[] = Array.from({ length: 12 }, (_, i) => {
  const e = approvedMonth(i + 1);
  const offers = primaryOffers(e);
  return {
    theme: e.theme,
    kicker: e.hook,
    moment: e.moment,
    objective: e.job,
    brief: offers.map(o => `${o.name}: ${o.tagline}`).join(' '),
    risk: field(approvedOffer(e, 'newcomer'), 'What to watch'),
    signature: offers.map(o => o.name).join(' · '),
  };
});

export function monthChapter(month: number): MonthChapter {
  return MONTH_CHAPTERS[Math.min(12, Math.max(1, month)) - 1];
}

/** True when a saved theme is not one of the final plan's themes, so the final chapter leads. */
const FINAL_THEMES = new Set(APPROVED_PLAN_2027.map(e => e.theme.trim().toLowerCase()));

export function isLegacyTheme(theme: string | null | undefined) {
  return !!theme && !FINAL_THEMES.has(theme.trim().toLowerCase());
}

/* ── The voice ────────────────────────────────────────────────────────────────
   The split, the door and the renewal book, explained with the studio's planned numbers
   and the final plan's offers for the month. */
function voice(month: number, c: MonthStoryInput): MonthStory {
  const e = approvedEntry(c.studio, month) || approvedMonth(month);
  const offer = (slot: 'newcomer' | 'lapsed' | 'renewal') => approvedOffer(e, slot)?.name || '—';
  return {
    split: `${e.theme}: of ${L(c.target)}, ${L(c.streams.newClient)} (${share(c.streams.newClient, c.target)}) comes from new clients, ${L(c.streams.renewal)} (${share(c.streams.renewal, c.target)}) from renewals and ${L(c.streams.reactivation)} (${share(c.streams.reactivation, c.target)}) from lapsed clients coming back. ${e.job}`,
    leads: `${N(c.leads)} leads → ${N(c.trials)} trials → ${N(c.buyers)} first purchases at ${conv(c)} trial conversion. Newcomer offer: ${offer('newcomer')}; lapsed offer: ${offer('lapsed')}.`,
    renewals: `${N(c.renewalsDue)} memberships expire and the plan funds ${P(c.renewalCoverage)} of that renewal book. Renewal offer: ${offer('renewal')}.`,
  };
}

export function monthStory(month: number, input: MonthStoryInput): MonthStory {
  return voice(Math.min(12, Math.max(1, month)), input);
}

/** The month's chapter plus the numbers, in one call. */
export function monthNarrative(month: number, input: MonthStoryInput) {
  return { chapter: monthChapter(month), story: monthStory(month, input) };
}
