import React from 'react';
import {
  CalendarHeart,
  Gift,
  Globe,
  HeartHandshake,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Tag,
  Target,
} from 'lucide-react';
import { keyDatesFor } from '../../../data/keyDates';
import { number } from '../../../types';
import { type ActionItem } from '../../../data/planDefaults';
import { lakh } from '../usePlanData';

export const SLOT_KEYS = ['newcomer', 'lapsed', 'renewal', 'upsell', 'flash'] as const;

/* The month is read as four pages rather than one long scroll: the story, the numbers,
   the offers and the work. Every section keeps its id and its edit controls; the page
   only decides what is on screen at once. */
export type PlanPage = 'overview' | 'targets' | 'offers' | 'collaterals' | 'execution';
export const PAGES: PlanPage[] = ['overview', 'targets', 'offers', 'collaterals', 'execution'];
export const PAGE_OF_SECTION: Record<string, PlanPage> = {
  days: 'overview',
  focus: 'targets',
  ai: 'targets',
  coverage: 'targets',
  offers: 'offers',
  // Collateral has its own page: it is the list the studio actually produces from.
  collaterals: 'collaterals',
  acts: 'execution',
  actions: 'execution',
};
export const LIVE = (o: any) => !['archived', 'rejected'].includes(o.status);
// Bank offers marked recommended for this month (or for the plan as a whole when no months are named).
export const isRecommended = (o: any, month: number) => {
  const p = typeof o.provenance === 'string' ? JSON.parse(o.provenance || '{}') : o.provenance || {};
  return !!p.recommended && (!p.recommendedMonths?.length || p.recommendedMonths.includes(month));
};
// Bank offers the approved plan weighed as alternatives for this month (never counted in the month's revenue).
export const alternateFor = (o: any, month: number) => {
  const p = typeof o.provenance === 'string' ? JSON.parse(o.provenance || '{}') : o.provenance || {};
  return (p.alternateFor || []).find((a: any) => a.month === month) as { slot: string; for: string } | undefined;
};
/* A bank offer is one not filed under a month. The plan bundle derives a display month from the
   validity dates, so `month` alone cannot tell; `filed_month` is the stored value. */
export const isBankOffer = (o: any) => ('filed_month' in (o || {}) ? o.filed_month == null : o?.month == null);
// A month's copy points back at the bank offer it was picked from.
export const bankIdOf = (o: any) => {
  if (isBankOffer(o)) return o.id;
  try {
    return (typeof o.provenance === 'string' ? JSON.parse(o.provenance) : o.provenance || {}).bankId ?? o.id;
  } catch {
    return o.id;
  }
};
export const STREAMS = [
  { key: 'newClient', field: 'new_client_target', body: 'newClientTarget', label: 'New clients', color: 'var(--a1)' },
  {
    key: 'renewal',
    field: 'renewal_target',
    body: 'renewalTarget',
    label: 'Renewals',
    color: 'color-mix(in srgb, var(--a1) 66%, #307299)',
  },
  {
    key: 'reactivation',
    field: 'reactivation_target',
    body: 'reactivationTarget',
    label: 'Comeback / reactivation',
    color: 'color-mix(in srgb, var(--a1) 46%, #277a6f)',
  },
] as const;
// `held` is the part of the target outside the three edited streams (the stored "other" and
// "repeat" lines). It is kept as-is so a save never silently zeroes it.
export const fullCoverageStreams = (target: number, renewal: number, reactivation: number, held = 0) => {
  const room = Math.max(0, target - held);
  const nonNew = Math.max(0, renewal) + Math.max(0, reactivation);
  const factor = nonNew > room && nonNew > 0 ? room / nonNew : 1;
  const adjustedRenewal = Math.round(Math.max(0, renewal) * factor);
  const adjustedReactivation = Math.max(0, Math.round(Math.max(0, reactivation) * factor));
  return {
    newClient: Math.max(0, Math.round(room) - adjustedRenewal - adjustedReactivation),
    renewal: adjustedRenewal,
    reactivation: adjustedReactivation,
  };
};
// Which revenue stream an offer mainly serves, for grouping the month's offers.
export const STREAM_OF: Record<string, string> = {
  acquisition: 'New clients',
  trial_conversion: 'New clients',
  referral: 'New clients',
  new_client: 'New clients',
  retention: 'Ticket & renewal',
  annual_membership: 'Ticket & renewal',
  additional_purchase: 'Ticket & renewal',
  aov: 'Ticket & renewal',
  reactivation: 'Comeback / reactivation',
};
export const STREAM_KEY: Record<string, string> = {
  'New clients': 'newClient',
  'Ticket & renewal': 'renewal',
  'Comeback / reactivation': 'reactivation',
};
export type AiFocus = {
  theme: string;
  objective: string;
  strategy: string;
  focusPoints: string[];
  splitRationale: string;
  actionPlan: { week: number; owner: string; text: string }[];
  reasoning: { heading: string; points: string[] }[];
  risks: string[];
  mode?: 'ai' | 'synthesised';
};
export const planBodyOf = (f: any, over: Record<string, unknown> = {}) => ({
  theme: f.theme || null,
  objective: f.objective || null,
  strategy: f.strategy || null,
  notes: f.notes || null,
  status: f.status,
  actions: (f.actions || []).filter((a: ActionItem) => a.text.trim()),
  content: f.content || {},
  ...over,
});

// Highlights **bold** spans as well as ₹ currency & % KPI tokens with crisp tabular styling.
export const renderSegmentTokens = (segment: string, keyPrefix: string) =>
  segment.split(/(₹[\d,]+(?:\.\d+)?\s*(?:L|Cr|K|lakh|cr)?|[+-]?\d+(?:\.\d+)?%)/gi).map((tok, j) =>
    tok && /^(₹[\d,]+|[+-]?\d+(?:\.\d+)?%)/i.test(tok) ? (
      <span key={`${keyPrefix}-${j}`} className="mw-inline-num">
        {tok}
      </span>
    ) : (
      tok
    ),
  );

export const inline = (t: string) =>
  String(t || '')
    .split(/(\*\*[^*]+\*\*)/)
    .map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? (
        <b key={i} className="mw-inline-strong">
          {p.slice(2, -2)}
        </b>
      ) : (
        <React.Fragment key={i}>{renderSegmentTokens(p, `s${i}`)}</React.Fragment>
      ),
    );

// Parses "- **Lead:** Body", "**Lead** — Body", or concise "Lead: Body" into a uniform { lead, body } pair
// so curated playbooks, manual edits, and AI generations share identical visual layout & typography.
export function parseStructuredLine(raw: string): { lead: string | null; body: string } {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^(?:#{1,6}\s+|[-•*–—]\s+|\d+[.)]\s+)+/, '')
    .trim();
  if (!cleaned) return { lead: null, body: '' };
  const boldLead = cleaned.match(/^\*\*([^*]{2,64}?)(?:\s*[:—–-]\s*\*\*|\*\*\s*[:—–-])\s*(.+)$/);
  if (boldLead) {
    return {
      lead: boldLead[1]
        .trim()
        .replace(/[:—–-]+$/, '')
        .trim(),
      body: boldLead[2].trim(),
    };
  }
  const plainLead = cleaned.match(/^([A-Za-z0-9₹%+&/()'’ -]{2,44})\s*(?::|—|–)\s+(.+)$/);
  if (plainLead && plainLead[1].trim().split(/\s+/).length <= 6) {
    return { lead: plainLead[1].trim(), body: plainLead[2].trim() };
  }
  return { lead: null, body: cleaned };
}

export function parseStrategyLines(text: string): string[] {
  const rawLines = String(text || '')
    .split(/\r?\n/)
    .map(l =>
      l
        .trim()
        .replace(/^[-•*]\s+/, '')
        .replace(/^\d+[.)]\s+/, '')
        .trim(),
    )
    .filter(Boolean);
  if (rawLines.length === 1 && rawLines[0].includes('; ') && rawLines[0].length > 110) {
    return rawLines[0]
      .split(/;\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return rawLines;
}

export function serializeStrategyLines(lines: string[]): string {
  return lines
    .map(l => l.trim().replace(/^[-•*]\s+/, ''))
    .filter(l => l.length > 0)
    .map(l => `- ${l}`)
    .join('\n');
}

export function StructuredLine({
  text,
  leadTone = 'default',
}: {
  text: string;
  leadTone?: 'default' | 'risk' | 'stream';
}) {
  const { lead, body } = parseStructuredLine(text);
  if (!lead) return <span className="mw-struct-body">{inline(body)}</span>;
  return (
    <span className={`mw-struct-line is-${leadTone}`}>
      <strong className="mw-struct-lead">{lead}</strong>
      <span className="mw-struct-body">{inline(body)}</span>
    </span>
  );
}

export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const close = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length} className="mw-rich-list">
        {list.items.map((t, i) => (
          <li key={i}>
            <StructuredLine text={t} />
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-•*]\s+(.*)/),
      num = line.match(/^\d+[.)]\s+(.*)/);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        close();
        list = { ordered, items: [] };
      }
      list.items.push((bullet || num)![1]);
    } else {
      close();
      if (line)
        blocks.push(
          <p key={blocks.length}>
            <StructuredLine text={line} />
          </p>,
        );
    }
  }
  close();
  return <div className="mw-rich">{blocks}</div>;
}
export const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
// Minimal line icons for the important-days list.
export const DAY_KIND_ICONS = {
  festival: PartyPopper,
  holiday: CalendarHeart,
  awareness: HeartHandshake,
  global: Globe,
  retail: ShoppingBag,
  brand: Sparkles,
} as const;

export const monthContentWithCalendar = (content: any, year: number, month: number) => {
  const curated = keyDatesFor(year, month);
  if (content?.keyDatesCustomized && Array.isArray(content?.keyDates)) {
    return { ...(content || {}), keyDates: [...content.keyDates], activations: content?.activations || {} };
  }
  const keyDates = Array.isArray(content?.keyDates) ? [...content.keyDates] : [];
  for (const date of curated) {
    const match = keyDates.findIndex(
      (saved: any) => saved.name === date.name || (saved.day === date.day && saved.kind === date.kind),
    );
    if (match < 0) keyDates.push(date);
    else if (keyDates[match].name === date.name) keyDates[match] = { ...keyDates[match], kind: date.kind };
  }
  return { ...(content || {}), keyDates, activations: content?.activations || {} };
};
export const pct = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(d)}%`;

// What the team should focus on each month (from the 2027 Annual Sales and Offer Plan).
export const FOCUS_POINTS: Record<number, string[]> = {
  1: [
    '**72-Hour Trial Close:** Convert January trials within 72 hours',
    '**Annual Re-Up Week:** Re-up the Jan-2026 annuals in Annual Re-Up week (1–10 Jan)',
    '**3M First-Buy Mix:** Push first buyers onto 3M, not packs',
    '**Member Access:** Open limited-run format #1 to renewed members',
  ],
  2: [
    '**Duo Acquisition:** Duo and referral acquisition instead of BOGO',
    '**Momence Verification:** Both buyers must be new — check in Momence',
    '**Galentine’s Event:** Galentine’s hosted class with a door offer (Sat 13 Feb)',
    '**Renewal Referrals:** Ask for a referral at every renewal',
  ],
  3: [
    '**Trial Momentum:** Stop March trials waiting for April',
    '**Bandra Comeback:** Start Bandra reactivation: Class of 2024 Reunion',
    '**List-Price Renewals:** Lock in Mar–Apr renewals at list with bonus time',
    '**April Pre-Game:** Build the April pre-game list (25–31 Mar)',
  ],
  4: [
    '**Founding 57:** Sell numbered annuals at full price',
    '**Commitment Value:** Value scales with commitment — no deep codes',
    '**Week-2 Hosted Classes:** Anniversary hosted classes in week 2 with a named associate',
    '**Window Discipline:** Hard close 30 Apr 23:59',
  ],
  5: [
    '**April Cohort Retention:** Retain the April cohort: 8 classes in May',
    '**Week-1 Onboarding:** Week-1 call for every April buyer',
    '**Mother’s Day Duo:** Mother’s Day duo acquisition (Sun 9 May)',
    '**Expiry Benchmark:** Target ≥55% renewal at next expiry',
  ],
  6: [
    '**Summer Continuity:** Freeze, don’t leave: stop summer lapses',
    '**Off-Peak Fill:** Launch Golden Hours for students in low-fill slots',
    '**Summer Visitors:** Capture visiting students and NRIs',
    '**Father’s Day Hook:** Father’s Day duo (Sun 20 Jun)',
  ],
  7: [
    '**Show-Up Discipline:** Cut late cancels (Kenkere target <15%)',
    '**Studio Leaderboard:** Monsoon Streak leaderboard by studio',
    '**Usage Renewals:** Usage-led monsoon renewals',
    '**Format Launch:** Open limited-run format #2',
  ],
  8: [
    '**3M Upgrade Push:** Move 1M renewers with 8+ visits to 3M',
    '**Friendship Day:** Friendship Day squad classes (Sun 1 Aug)',
    '**Squad Acquisition:** Friend-led acquisition, both buyers new',
    '**Lapsed Outreach:** Work the high-value lapsed list in Mumbai’s second peak',
  ],
  9: [
    '**Diwali Challenge:** Start the 57 Days to Diwali cohort (2 Sep)',
    '**Pre-Festive Comeback:** Reactivate before the festive season',
    '**Q4 Renewal Lock:** Lock 3M renewals through Oct–Dec',
    '**Alumni Reunion:** Repeat the Bandra reunion',
  ],
  10: [
    '**Festive Gifting:** Gift a Shake cards on sale from 1 Oct',
    '**Dasara Protection:** Protect Kenkere’s Dasara trough with freezes',
    '**Full-Value Surge:** Capture Kwality’s late-October surge without codes',
    '**Studio Experience:** Candle-lit evening classes in Diwali week',
  ],
  11: [
    '**Commitment Lock-In:** Lock long commitments in the softest month',
    '**Founding 57 Wave 2:** Founding 57 second wave — remaining seats only',
    '**BFCM Window:** Black Friday → Cyber Monday window (26–29 Nov)',
    '**High-LTV Winback:** Manager calls to high-value lapsers',
  ],
  12: [
    '**January Pre-Sale:** Pre-sell January with flexible start dates',
    '**2027 Wrapped:** Send every client their 2027 Wrapped',
    '**Prescription Renewal:** Renew on the usage-based prescription',
    '**Holiday Gifting:** Second gifting window: Gift the Habit',
  ],
};

// Days from today to a day in the plan month (negative once it has passed).
export const daysUntil = (year: number, month: number, day: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86400000);
};
// How each kind of important day is usually worked, shown when a day card is opened.
export const DAY_PLAYS: Record<string, { play: string; lead: number; channel: string; pairs: string[] }> = {
  festival: {
    play: 'Gift-led message and a themed hosted class in the festival week; keep the offer as a bonus, not a deeper code.',
    lead: 10,
    channel: 'WhatsApp broadcast + in-studio tent cards',
    pairs: ['newcomer', 'lapsed'],
  },
  holiday: {
    play: 'Expect lighter attendance: push freezes and pre-booking, and open a holiday-morning class for regulars.',
    lead: 7,
    channel: 'Email to members + WhatsApp reminder',
    pairs: ['renewal'],
  },
  awareness: {
    play: 'Purpose-led story with a community class; invite members to bring a friend for their first class.',
    lead: 7,
    channel: 'Instagram + WhatsApp',
    pairs: ['newcomer'],
  },
  global: {
    play: 'Tie the day to a squad or cohort class and use it as the hook for the month’s newcomer offer.',
    lead: 10,
    channel: 'Instagram + email',
    pairs: ['newcomer'],
  },
  retail: {
    play: 'Short, named window (48–96 hours) on commitment products, with a hard close.',
    lead: 5,
    channel: 'Email + WhatsApp countdown',
    pairs: ['newcomer', 'renewal'],
  },
  brand: {
    play: 'Members-first moment: early access for renewers, then open to new clients with a public counter.',
    lead: 14,
    channel: 'All channels + studio takeover',
    pairs: ['renewal'],
  },
};

export type Prices = { keys: Record<string, string>; prices: Record<string, Record<string, number | null>> };

/* Team designations: the studio manager is the Team Leader; the sales team are CSTs and Senior
   CSTs. Older plans and imported text carry the old labels, so they are mapped on display. */
const ROLE_MAP: [RegExp, string][] = [
  [/^(studio\s*manager|studio\s*head|manager)$/i, 'Team Leader'],
  [/^(sales\s*(lead|manager|head)|senior\s*(sales|cst).*)$/i, 'Senior CST'],
  [/^(sales(\s*(associate|executive|team|rep|consultant))?|front\s*desk|cst|client\s*services?(\s*team)?)$/i, 'CST'],
];
export const roleLabel = (owner: unknown) => {
  const raw = String(owner ?? '').trim();
  if (!raw) return raw;
  return raw
    .split(/\s*(?:,|\/|&|\+| and )\s*/i)
    .map(part => ROLE_MAP.find(([re]) => re.test(part))?.[1] || part)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(' & ');
};
export const TEAM_ROLES = ['Team Leader', 'Senior CST', 'CST', 'Marketing', 'Lead trainer'];
