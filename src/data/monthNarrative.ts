/* Sales Plan › month narrative: a voice that explains a studio-month's planned numbers in the
   month's own words. Theme, commercial job and offers come from the month plan saved in the
   database; nothing here carries plan content of its own. */

/** A month's headline content, filled from the month plan saved in the database. */
export interface MonthChapter {
  theme: string;
  /** Two or three words that sit above the theme, like a magazine kicker. */
  kicker: string;
  /** The cultural or commercial moment the month belongs to. */
  moment: string;
  /** The single commercial job, in one line. */
  objective: string;
  /** Why the month works the way it does. */
  brief: string;
  /** Each picked offer and the line that sells it. */
  briefPoints: { name: string; line: string }[];
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
  /* The month's own theme, commercial job and plan-slot offers, from the database. */
  theme?: string | null;
  objective?: string | null;
  planOffers?: { newcomer?: string | null; lapsed?: string | null; renewal?: string | null };
}

export interface MonthStory {
  /** Where the money comes from, in this month's own terms. */
  split: string;
  /** Who has to walk through the door. */
  leads: string;
  /** Who has to stay. */
  renewals: string;
  /** The same three notes as short, plain bullet points. */
  points: { split: string[]; leads: string[]; renewals: string[] };
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

function voice(c: MonthStoryInput): MonthStory {
  const theme = String(c.theme || '').trim() || 'This month';
  const job = String(c.objective || '').trim();
  const offer = (slot: 'newcomer' | 'lapsed' | 'renewal') => String(c.planOffers?.[slot] || '').trim() || '—';
  return {
    split: `${theme}: of ${L(c.target)}, ${L(c.streams.newClient)} (${share(c.streams.newClient, c.target)}) comes from new clients, ${L(c.streams.renewal)} (${share(c.streams.renewal, c.target)}) from renewals and ${L(c.streams.reactivation)} (${share(c.streams.reactivation, c.target)}) from lapsed clients coming back. ${job}`,
    leads: `${N(c.leads)} leads → ${N(c.trials)} trials → ${N(c.buyers)} first purchases at ${conv(c)} trial conversion. Newcomer offer: ${offer('newcomer')}; lapsed offer: ${offer('lapsed')}.`,
    renewals: `${N(c.renewalsDue)} memberships expire and the plan funds ${P(c.renewalCoverage)} of that renewal book. Renewal offer: ${offer('renewal')}.`,
    points: {
      split: [
        `Goal this month: ${L(c.target)}`,
        `New clients bring ${L(c.streams.newClient)} (${share(c.streams.newClient, c.target)})`,
        `Members who renew bring ${L(c.streams.renewal)} (${share(c.streams.renewal, c.target)})`,
        `Past clients coming back bring ${L(c.streams.reactivation)} (${share(c.streams.reactivation, c.target)})`,
        ...(job ? [`Main focus: ${job}`] : []),
      ],
      leads: [
        `${N(c.leads)} people enquire`,
        `${N(c.trials)} take a trial class`,
        `${N(c.buyers)} buy a pack or membership (${conv(c)} of trials)`,
        `New-client offer: ${offer('newcomer')}`,
        `Win-back offer: ${offer('lapsed')}`,
      ],
      renewals: [
        `${N(c.renewalsDue)} memberships run out this month`,
        `The plan expects to renew ${P(c.renewalCoverage)} of them`,
        `Renewal offer: ${offer('renewal')}`,
      ],
    },
  };
}

export function monthStory(month: number, input: MonthStoryInput): MonthStory {
  void month;
  return voice(input);
}
