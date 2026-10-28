import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CalendarHeart,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Columns2,
  Copy,
  FileText,
  Flag,
  Gift,
  Globe,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  Lightbulb,
  Link2,
  LockKeyhole,
  ListChecks,
  Minus,
  Package,
  PartyPopper,
  Pencil,
  Percent,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShoppingBag,
  Square,
  Sigma,
  SlidersHorizontal,
  Loader2,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Trash2,
  Trophy,
  Unlink,
  X,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../App';
import { Badge, Button } from '../../components/ui';
import { LOCATION_COLORS, accentFor, locationStudioIds } from '../../data/locations';
import MarketingCollaterals from '../../components/MarketingCollaterals';
import { KEY_DATE_LABELS, formatKeyDate, keyDatesFor } from '../../data/keyDates';
import { MONTHS, money, number, titleCase } from '../../types';
import { locationPlaybook, type ActionItem } from '../../data/planDefaults';
import { isLegacyTheme, monthChapter, monthStory } from '../../data/monthNarrative';
import { monthActivations } from './CampaignsTab';
import MonthCover from './MonthCover';
import PageHero from './PageHero';
import { PAGE_PHOTOS, coverPhotoFor } from '../../data/pagePhotos';
import MonthOverview from './MonthOverview';
import { lakh, type MonthEconomics, type PlanData } from './usePlanData';

const SLOT_KEYS = ['newcomer', 'lapsed', 'renewal'] as const;

/* The month is read as four pages rather than one long scroll: the story, the numbers,
   the offers and the work. Every section keeps its id and its edit controls; the page
   only decides what is on screen at once. */
type PlanPage = 'overview' | 'targets' | 'offers' | 'collaterals' | 'execution';
const PAGE_OF_SECTION: Record<string, PlanPage> = {
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
const LIVE = (o: any) => !['archived', 'rejected'].includes(o.status);
// A month's copy points back at the bank offer it was picked from.
const bankIdOf = (o: any) => {
  if (o.month == null) return o.id;
  try {
    return (typeof o.provenance === 'string' ? JSON.parse(o.provenance) : o.provenance || {}).bankId ?? o.id;
  } catch {
    return o.id;
  }
};
const STREAMS = [
  { key: 'newClient', field: 'new_client_target', body: 'newClientTarget', label: 'New clients', color: 'var(--a1)' },
  {
    key: 'renewal',
    field: 'renewal_target',
    body: 'renewalTarget',
    label: 'Renewals',
    color: 'color-mix(in srgb, var(--a1) 66%, #0284c7)',
  },
  {
    key: 'reactivation',
    field: 'reactivation_target',
    body: 'reactivationTarget',
    label: 'Comeback / reactivation',
    color: 'color-mix(in srgb, var(--a1) 46%, #0d9488)',
  },
] as const;
const fullCoverageStreams = (target: number, renewal: number, reactivation: number) => {
  const nonNew = Math.max(0, renewal) + Math.max(0, reactivation);
  const factor = nonNew > target && nonNew > 0 ? Math.max(0, target) / nonNew : 1;
  const adjustedRenewal = Math.round(Math.max(0, renewal) * factor);
  const adjustedReactivation = Math.max(0, Math.round(Math.max(0, reactivation) * factor));
  return {
    newClient: Math.max(0, Math.round(target) - adjustedRenewal - adjustedReactivation),
    renewal: adjustedRenewal,
    reactivation: adjustedReactivation,
  };
};
// Which revenue stream an offer mainly serves, for grouping the month's offers.
const STREAM_OF: Record<string, string> = {
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
const STREAM_KEY: Record<string, string> = {
  'New clients': 'newClient',
  'Ticket & renewal': 'renewal',
  'Comeback / reactivation': 'reactivation',
};
type AiFocus = {
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
const planBodyOf = (f: any, over: Record<string, unknown> = {}) => ({
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
const renderSegmentTokens = (segment: string, keyPrefix: string) =>
  segment.split(/(₹[\d,]+(?:\.\d+)?\s*(?:L|Cr|K|lakh|cr)?|[+-]?\d+(?:\.\d+)?%)/gi).map((tok, j) =>
    tok && /^(₹[\d,]+|[+-]?\d+(?:\.\d+)?%)/i.test(tok) ? (
      <span key={`${keyPrefix}-${j}`} className="mw-inline-num">
        {tok}
      </span>
    ) : (
      tok
    ),
  );

const inline = (t: string) =>
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
function parseStructuredLine(raw: string): { lead: string | null; body: string } {
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

function parseStrategyLines(text: string): string[] {
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

function serializeStrategyLines(lines: string[]): string {
  return lines
    .map(l => l.trim().replace(/^[-•*]\s+/, ''))
    .filter(l => l.length > 0)
    .map(l => `- ${l}`)
    .join('\n');
}

function StructuredLine({ text, leadTone = 'default' }: { text: string; leadTone?: 'default' | 'risk' | 'stream' }) {
  const { lead, body } = parseStructuredLine(text);
  if (!lead) return <span className="mw-struct-body">{inline(body)}</span>;
  return (
    <span className={`mw-struct-line is-${leadTone}`}>
      <strong className="mw-struct-lead">{lead}</strong>
      <span className="mw-struct-body">{inline(body)}</span>
    </span>
  );
}

function RichText({ text }: { text: string }) {
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
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
// Minimal line icons for the important-days list.
const DAY_KIND_ICONS = {
  festival: PartyPopper,
  holiday: CalendarHeart,
  awareness: HeartHandshake,
  global: Globe,
  retail: ShoppingBag,
  brand: Sparkles,
} as const;

const hasValidForecast = (o: any) => {
  if (
    !o ||
    o.data_mode === 'demo' ||
    o.generation_source === 'demo_seed' ||
    o.expected_revenue == null ||
    !Number.isFinite(Number(o.expected_revenue))
  )
    return false;
  let financials = o.financials || {};
  if (typeof financials === 'string') {
    try {
      financials = JSON.parse(financials);
    } catch {
      financials = {};
    }
  }
  const modeledRevenue = financials.expectedRevenue;
  return (
    modeledRevenue == null ||
    Math.abs(n(o.expected_revenue) - n(modeledRevenue)) <= Math.max(2, Math.abs(n(modeledRevenue)) * 0.0001)
  );
};
const forecastRevenue = (o: any) => (hasValidForecast(o) ? n(o.expected_revenue) : 0);
const monthContentWithCalendar = (content: any, year: number, month: number) => {
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
const pct = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(d)}%`);

// What the team should focus on each month (from the 2027 Annual Sales and Offer Plan).
const FOCUS_POINTS: Record<number, string[]> = {
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
const daysUntil = (year: number, month: number, day: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86400000);
};
// How each kind of important day is usually worked, shown when a day card is opened.
const DAY_PLAYS: Record<string, { play: string; lead: number; channel: string; pairs: string[] }> = {
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

type Prices = { keys: Record<string, string>; prices: Record<string, Record<string, number | null>> };

// Full-screen month plan: everything for one month in one place, editable per studio, with alternate offers on the side.
export default function MonthWorkspace({
  data,
  month,
  setMonth,
  onClose,
  onSaved,
}: {
  data: PlanData;
  month: number;
  setMonth: (m: number) => void;
  onClose: () => void;
  onSaved: () => Promise<unknown>;
}) {
  const { boot, year, can, toast, adminUnlocked: masterUnlocked, unlockAdmin, lockAdmin } = useApp(),
    navigate = useNavigate();
  // The offer library is a drawer over the page, never a squeezed column beside it.
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [studioIdx, setStudioIdx] = useState(0),
    [solo, setSolo] = useState(false),
    [mathsOpen, setMathsOpen] = useState(false),
    [prices, setPrices] = useState<Prices | null>(null),
    [masterCode, setMasterCode] = useState(''),
    [masterCodeError, setMasterCodeError] = useState(''),
    // The passcode now opens one door only: the AI. It is asked for when an AI control is
    // used, not before the month can be edited.
    [aiGateOpen, setAiGateOpen] = useState(false);
  // The cover is the first page of a month: it mounts with the workspace and re-animates on month changes.
  const [coverOpen, setCoverOpen] = useState(true);
  // Editing is turned on one section at a time, from the pencil in that section's header.
  // Being able to edit never changes how a section is drawn — only what its pencil unlocks.
  const [editSection, setEditSection] = useState<string | null>(null);
  const [page, setPage] = useState<PlanPage>('overview');
  // Each page opens at its own top rather than inheriting the previous page's scroll.
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);
  const plan = data.plans[studioIdx],
    studio = plan.studio,
    row = plan.months[month - 1],
    econ = plan.economics.months[month - 1],
    combinedRow = data.months[month - 1];
  // An administrator holds every editing permission but sees none of its controls until the
  // passcode is entered; `can` already enforces that, and this mirrors it for the copy.
  const isAdministrator = boot.user.role === 'administrator';
  const canEditPlan = can('target_edit');
  const canApprovePlan = can('target_approve');
  const canApproveOffers = can('offer_approve');
  const targetRow = plan.detail.targets.find((t: any) => t.month === month);
  const saved = plan.detail.plans.find((p: any) => p.month === month);
  const locked = saved?.status === 'approved';
  // Editing is a permission and, for an administrator, a passcode. Once either door is open the
  // pencil on the thing they want to change is the only extra control the page adds.
  const editable = canEditPlan && !locked;
  // The passcode opens the AI for everyone, and the editing controls for an administrator.
  const aiReady = masterUnlocked;
  // Adding, removing and swapping offers needs no passcode.
  const offersEditable = (canEditPlan || can('offer_edit')) && !locked;
  // A section is editable only while its own pencil is on.
  const sectionEditable = (key: string) => editable && editSection === key;
  const toggleSection = (key: string) => setEditSection(current => (current === key ? null : key));
  const others = 3;

  useEffect(() => {
    api<Prices>('/studio-plans/products/prices')
      .then(setPrices)
      .catch(() => {});
  }, []);

  // Offers this studio can pick from (Pop-up includes its venues).
  const ownIds = useMemo(() => locationStudioIds(studio, boot.studios), [studio, boot.studios]);
  const ownOffers = useMemo(
    () =>
      data.offers.filter(
        o => LIVE(o) && o.data_mode !== 'demo' && o.generation_source !== 'demo_seed' && ownIds.includes(o.studio_id),
      ),
    [data.offers, ownIds],
  );
  // The month shows only what its plan picked; the library is the location's offer bank (offers with no month).
  const exists = (id: any) => id && ownOffers.some(o => o.id === id);
  const slots: Record<string, number | null> = Object.fromEntries(
    SLOT_KEYS.map(slot => [slot, exists(saved?.slots?.[slot]) ? saved.slots[slot] : null]),
  );
  const extras: number[] = Array.isArray(saved?.offer_ids) ? saved.offer_ids.filter(exists) : [];
  const selectedIds = [...(Object.values(slots).filter(Boolean) as number[]), ...extras];
  const selected = selectedIds.map(id => ownOffers.find(o => o.id === id)).filter(Boolean) as any[];
  const slotOf = (id: number) => Object.entries(slots).find(([, v]) => v === id)?.[0];
  const pickedBank = new Set(selected.map(o => bankIdOf(o)));
  const alternates = ownOffers
    .filter(o => o.year === year && o.month == null && !pickedBank.has(o.id))
    .sort((a, b) => n(b.expected_revenue) - n(a.expected_revenue));
  const [openAlt, setOpenAlt] = useState<number | null>(null);
  const [altQuery, setAltQuery] = useState('');
  const [altScope, setAltScope] = useState<'all' | 'newcomer' | 'lapsed' | 'renewal'>('all');
  const filteredAlternates = useMemo(() => {
    const q = altQuery.trim().toLowerCase();
    return alternates.filter(o => {
      if (
        altScope === 'newcomer' &&
        o.plan_slot !== 'newcomer' &&
        !['acquisition', 'trial_conversion', 'new_client', 'referral'].includes(o.objective)
      )
        return false;
      if (altScope === 'lapsed' && o.plan_slot !== 'lapsed' && o.objective !== 'reactivation') return false;
      if (
        altScope === 'renewal' &&
        o.plan_slot !== 'renewal' &&
        !['retention', 'annual_membership', 'additional_purchase', 'aov'].includes(o.objective)
      )
        return false;
      if (!q) return true;
      const hay =
        `${o.name || ''} ${o.benefit || ''} ${o.headline || ''} ${o.audience || ''} ${o.offer_type || ''}`.toLowerCase();
      return q.split(/\s+/).every(t => hay.includes(t));
    });
  }, [altQuery, altScope, alternates, month]);
  const altGroups = useMemo(() => {
    const labels = prices?.keys || {};
    // Offers without a recorded pricing product are matched to a membership from their wording.
    const guess = (o: any) => {
      const t = `${o.benefit || ''} ${o.headline || ''} ${o.name || ''}`.toLowerCase();
      if (/annual|12 ?m(onth)?\b|year/.test(t)) return 'ANNUAL';
      if (/\b6 ?m(onth)?\b|six[- ]month/.test(t)) return '6M';
      if (/\b3 ?m(onth)?\b|three[- ]month/.test(t)) return '3M';
      if (/\b1 ?m(onth)?\b|one[- ]month/.test(t)) return '1M';
      if (/private/.test(t)) return 'PRIV10';
      if (/\b8 (single )?class|8-class/.test(t)) return '8C';
      if (/\b12 (single )?class|12-class/.test(t)) return '12C';
      if (/\b20 (single )?class|20 sessions/.test(t)) return '20C';
      if (/\b10 (single )?class|10 sessions/.test(t)) return 'CC10';
      if (/single class/.test(t)) return 'SINGLE';
      return null;
    };
    const groups = new Map<string, any[]>();
    for (const o of filteredAlternates) {
      const key = o.provenance?.pricing?.product || guess(o);
      const label = key ? labels[key] || key : 'Other offers';
      const list = groups.get(label) || [];
      // Each membership shows its best 10–15 options (alternates are already sorted month-first).
      if (list.length < 15) groups.set(label, [...list, o]);
    }
    const order = Object.values(labels);
    return [...groups.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]),
        ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [filteredAlternates, prices]);
  const offerRevenue = selected.reduce((s, o) => s + forecastRevenue(o), 0);
  const groups = ['New clients', 'Ticket & renewal', 'Comeback / reactivation', 'Other'].map(g => ({
    label: g,
    offers: selected.filter(o => (STREAM_OF[o.objective] || 'Other') === g),
  }));

  const initialEffectiveTarget = targetRow?.approved_target ?? targetRow?.proposed_target;
  const initialScale =
    targetRow && n(targetRow.proposed_target) ? n(initialEffectiveTarget) / n(targetRow.proposed_target) : 1;
  const initialStreams = fullCoverageStreams(
    n(initialEffectiveTarget),
    n(targetRow?.renewal_target) * initialScale,
    n(targetRow?.reactivation_target) * initialScale,
  );
  const initialForm = () => ({
    theme: saved?.theme ?? row.theme ?? '',
    objective: saved?.objective ?? row.objective ?? '',
    strategy: saved?.strategy ?? '',
    notes: saved?.notes ?? '',
    status: saved?.status ?? 'draft',
    actions: (saved?.actions as ActionItem[]) || [],
    content: monthContentWithCalendar(saved?.content, year, month),
    target: Math.round(n(targetRow?.proposed_target)),
    streams: initialStreams,
  });
  const [form, setForm] = useState(initialForm),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<number | null>(null),
    [creatingOffer, setCreatingOffer] = useState<any | null>(null),
    [activeDay, setActiveDay] = useState<number | null>(null);
  // Reset whenever the month or studio changes, or fresh data arrives — except right after our own autosave.
  const skipReset = useRef(false),
    resetKey = useRef(''),
    lastSaved = useRef('');
  useEffect(() => {
    const key = `${month}-${studioIdx}`;
    if (skipReset.current && resetKey.current === key) {
      skipReset.current = false;
      return;
    }
    skipReset.current = false;
    resetKey.current = key;
    const f = initialForm();
    lastSaved.current = JSON.stringify(planBodyOf(f));
    setForm(f);
  }, [month, studioIdx, data]);
  useEffect(() => {
    setEditing(null);
    setCreatingOffer(null);
    setPage('overview');
  }, [month, studioIdx]);
  useEffect(() => setActiveDay(null), [month, studioIdx]);
  useEffect(() => setMathsOpen(false), [month, studioIdx]);
  const set = (patch: Partial<ReturnType<typeof initialForm>>) => setForm(f => ({ ...f, ...patch }));
  const updateContent = (patch: Record<string, unknown>) =>
    setForm(f => ({ ...f, content: { ...(f.content || {}), ...patch } }));
  const hiddenSections: string[] = Array.isArray(form.content?.hiddenSections) ? form.content.hiddenSections : [];
  // Offer cards start collapsed to their hero, and the open ones persist with the month plan
  // (so the layout survives reloads and rides the existing autosave).
  const expandedOffers: number[] = Array.isArray(form.content?.expandedOffers)
    ? (form.content.expandedOffers as number[])
    : [];
  // One card per row or two is a reading preference, so it rides the plan content like the
  // expanded set: it survives reloads and autosaves with the month.
  const offerColumns: 1 | 2 = form.content?.offerColumns === 1 ? 1 : 2;
  const setOfferColumns = (next: 1 | 2) => updateContent({ offerColumns: next });
  const allOffersExpanded = selected.length > 0 && selected.every(o => expandedOffers.includes(o.id));
  const toggleAllOffers = () => updateContent({ expandedOffers: allOffersExpanded ? [] : selected.map(o => o.id) });
  const isSectionVisible = (secKey: string) => !hiddenSections.includes(secKey);
  const hideSection = (secKey: string) => updateContent({ hiddenSections: [...new Set([...hiddenSections, secKey])] });
  const restoreSection = (secKey: string) =>
    updateContent({ hiddenSections: hiddenSections.filter(s => s !== secKey) });
  const sectionMeta = (secKey: string, defaultTitle: string, defaultHint: string) => {
    const m = form.content?.sectionMeta?.[secKey] || {};
    return {
      title: m.title !== undefined ? m.title : defaultTitle,
      hint: m.hint !== undefined ? m.hint : defaultHint,
    };
  };
  const patchSectionMeta = (secKey: string, patch: { title?: string; hint?: string }) =>
    updateContent({
      sectionMeta: {
        ...(form.content?.sectionMeta || {}),
        [secKey]: { ...(form.content?.sectionMeta?.[secKey] || {}), ...patch },
      },
    });
  type CustomSectionItem = { id: string; label: string; value: string; detail: string };
  type CustomSection = { id: string; title: string; hint: string; body: string; items: CustomSectionItem[] };
  const customSections: CustomSection[] = Array.isArray(form.content?.customSections)
    ? form.content.customSections
    : [];
  const setCustomSections = (next: CustomSection[]) => updateContent({ customSections: next });
  const addCustomSection = () => {
    const created: CustomSection = {
      id: `custom-${Date.now()}`,
      title: 'Custom section',
      hint: 'Add notes, milestones or studio-specific playbooks for this month.',
      body: '',
      items: [
        {
          id: `item-${Date.now()}`,
          label: 'Priority',
          value: 'Studio initiative',
          detail: 'Owner, timeline and expected outcome.',
        },
      ],
    };
    setCustomSections([...customSections, created]);
    setTimeout(
      () => document.getElementById(`mw-sec-${created.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      60,
    );
  };
  const updateCustomSection = (id: string, patch: Partial<CustomSection>) =>
    setCustomSections(customSections.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const removeCustomSection = (id: string) => setCustomSections(customSections.filter(s => s.id !== id));

  const changeTarget = (target: number) => {
    const amount = approved ? n(targetRow?.approved_target) : target;
    setForm(f => ({
      ...f,
      target,
      streams: { ...f.streams, newClient: Math.max(0, amount - n(f.streams.renewal) - n(f.streams.reactivation)) },
    }));
  };
  const changeStream = (key: string, value: number) => {
    const clean = Math.max(0, value);
    setForm(f => {
      const streams = { ...f.streams, [key]: clean };
      if (key === 'newClient') {
        if (approved) {
          const amount = n(targetRow?.approved_target);
          streams.renewal = Math.max(0, amount - clean - n(streams.reactivation));
          return { ...f, streams };
        }
        const nextTarget = Math.max(0, clean + n(streams.renewal) + n(streams.reactivation));
        return { ...f, target: nextTarget, streams };
      }
      const amount = approved ? n(targetRow?.approved_target) : f.target;
      streams.newClient = Math.max(0, amount - n(streams.renewal) - n(streams.reactivation));
      return { ...f, streams };
    });
  };

  const approved = targetRow?.approved_target !== null && targetRow?.approved_target !== undefined;
  const effective = approved ? n(targetRow.approved_target) : form.target;
  const streamTotal = STREAMS.reduce((s, x) => s + n(form.streams[x.key]), 0);
  const streamsMismatch = Math.abs(streamTotal - effective) > 1;
  const gapRows = (
    [
      ['New clients', 'newClient'],
      ['Ticket & renewal', 'renewal'],
      ['Comeback / reactivation', 'reactivation'],
    ] as const
  )
    .map(([label, key]) => {
      const target = n(form.streams[key]);
      const mine = selected.filter(o => (STREAM_OF[o.objective] || 'Other') === label);
      const offer = mine.reduce((sum, o) => sum + forecastRevenue(o), 0);
      const gap = Math.max(0, target - offer);
      let left = gap;
      const picks: any[] = [];
      for (const o of alternates
        .filter(a => (STREAM_OF[a.objective] || 'Other') === label)
        .filter(a => forecastRevenue(a) > 0)
        .sort((a, b) => forecastRevenue(b) - forecastRevenue(a))) {
        if (left <= 0) break;
        picks.push(o);
        left -= forecastRevenue(o);
      }
      const lead = [...mine]
        .filter(o => forecastRevenue(o) > 0)
        .sort((a, b) => forecastRevenue(b) - forecastRevenue(a))[0];
      const asp = n(lead?.expected_asp);
      return {
        label,
        target,
        offer,
        gap,
        picks,
        left: Math.max(0, left),
        lead,
        extra: asp && left > 0 ? Math.ceil(left / asp) : 0,
      };
    })
    .filter(r => r.target > 0);
  const targetDirty =
    !!targetRow &&
    (form.target !== Math.round(n(targetRow.proposed_target)) ||
      STREAMS.some(s => form.streams[s.key] !== Math.round(n(approved ? initialStreams[s.key] : targetRow[s.field]))));

  // Offer changes save immediately and, unless solo mode is on, mirror to every other location.
  const offerChange = async (body: any, done: string) => {
    setBusy(true);
    try {
      const r = await api<{ studios: number[] }>(`/studio-plans/${studio.id}/${year}/${month}/offers`, {
        method: 'POST',
        body: JSON.stringify({ ...body, solo }),
      });
      await onSaved();
      toast(r.studios.length > 1 ? `${done} — mirrored to ${r.studios.length - 1} other locations.` : `${done}.`);
      return true;
    } catch (e: any) {
      toast(e.message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const coverTarget = async () => {
    setBusy(true);
    try {
      const r = await api<{ added: number[]; raised: number[]; short: number }>(
        `/studio-plans/${studio.id}/${year}/${month}/cover`,
        { method: 'POST' },
      );
      await onSaved();
      toast(
        r.short > 0
          ? `Added ${r.added.length}, raised ${r.raised.length} — still ${lakh(r.short)} short. Build a new offer for the rest.`
          : `Target covered: ${r.added.length} offer${r.added.length === 1 ? '' : 's'} added, ${r.raised.length} raised.`,
        r.short > 0 ? 'error' : undefined,
      );
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const replaceOffer = async (outId: number, incoming: any) => {
    const out = selected.find(x => x.id === outId);
    if (!out) return;
    if (await offerChange({ op: 'add', offerId: incoming.id }, `“${incoming.name}” added`))
      await offerChange({ op: 'remove', offerId: outId }, `“${incoming.name}” replaced “${out.name}”`);
  };

  const planBody = (over: Record<string, unknown> = {}) => planBodyOf(form, over);

  // Autosave: plan text, focus points, activations, actions and AI output persist ~1s after the last edit.
  const [autoState, setAutoState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const pendingSave = useRef<{ url: string; body: string } | null>(null),
    saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flushSave = async () => {
    clearTimeout(saveTimer.current);
    const p = pendingSave.current;
    if (!p) return;
    pendingSave.current = null;
    setAutoState('saving');
    try {
      await api(p.url, { method: 'PUT', body: p.body });
      lastSaved.current = p.body;
      setAutoState('saved');
      skipReset.current = true;
      await onSaved();
    } catch (e: any) {
      setAutoState('error');
      toast(e.message || 'Autosave failed.', 'error');
    }
  };
  useEffect(() => {
    if (!editable) return;
    const body = JSON.stringify(planBody());
    if (body === lastSaved.current) return;
    pendingSave.current = { url: `/studio-plans/${studio.id}/${year}/${month}`, body };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 1000);
  }, [form, editable]);
  useEffect(() => () => void flushSave(), [month, studioIdx]);

  // Persists a whole form snapshot, including the stream split when it differs from the saved target.
  const persistForm = async (f: ReturnType<typeof initialForm>) => {
    clearTimeout(saveTimer.current);
    pendingSave.current = null;
    const streamsChanged =
      !!targetRow &&
      STREAMS.some(s => n(f.streams[s.key]) !== Math.round(n(approved ? initialStreams[s.key] : targetRow[s.field])));
    if (streamsChanged)
      await api(`/targets/${targetRow.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          proposedTarget: f.target,
          ...Object.fromEntries(STREAMS.map(s => [s.body, n(f.streams[s.key])])),
          repeatTarget: 0,
          otherTarget: 0,
          requireFullCoverage: true,
          monthlyPlan: planBodyOf(f),
        }),
      });
    else
      await api(`/studio-plans/${studio.id}/${year}/${month}`, { method: 'PUT', body: JSON.stringify(planBodyOf(f)) });
    lastSaved.current = JSON.stringify(planBodyOf(f));
    setAutoState('saved');
    skipReset.current = true;
    await onSaved();
  };

  const [generating, setGenerating] = useState(false);
  const [steerOpen, setSteerOpen] = useState(false);
  const [aiSteer, setAiSteer] = useState('');
  const [strategyRawMode, setStrategyRawMode] = useState(false);

  const generateFocus = async () => {
    if (!aiReady) {
      toast('Unlock the AI passcode to generate the brief.', 'error');
      setAiGateOpen(true);
      return;
    }
    setGenerating(true);
    try {
      // Split the target across streams in proportion to the revenue each stream's offers carry.
      const cover = { newClient: 0, renewal: 0, reactivation: 0 } as Record<string, number>;
      for (const o of selected) {
        const k = STREAM_KEY[STREAM_OF[o.objective] || ''];
        if (k) cover[k] += forecastRevenue(o);
      }
      const coverTotal = cover.newClient + cover.renewal + cover.reactivation;
      let streams = form.streams;
      if (coverTotal > 0 && effective > 0) {
        const renewal = Math.round((effective * cover.renewal) / coverTotal);
        const reactivation = Math.round((effective * cover.reactivation) / coverTotal);
        streams = { newClient: Math.max(0, Math.round(effective) - renewal - reactivation), renewal, reactivation };
      }
      const ai = await api<AiFocus>(`/studio-plans/${studio.id}/${year}/${month}/focus/generate`, {
        method: 'POST',
        body: JSON.stringify({
          studioName: studio.name,
          monthName: MONTHS[month - 1],
          year,
          currentTheme: form.theme,
          target: effective,
          lastYear: row.lastYear,
          offerGap: effective - offerRevenue,
          offerRevenue,
          keyDates: dates.map(d => `${formatKeyDate(d)} ${MONTHS[month - 1].slice(0, 3)} · ${d.name}`).slice(0, 16),
          offers: selected.map(o => o.name).slice(0, 16),
          offerDetails: selected.slice(0, 16).map(o => ({
            name: String(o.name || '').slice(0, 160),
            stream: STREAM_OF[o.objective] || 'Other',
            benefit: String(o.benefit || '').slice(0, 400),
            audience: String(o.audience || '').slice(0, 200),
            price: n(o.expected_asp),
            units: n(o.target_purchases),
            revenue: forecastRevenue(o),
          })),
          streams,
          streamCoverage: cover,
          funnel: econ
            ? {
                leads: n(econ.newClient.leads),
                trials: n(econ.newClient.trials),
                newMembers: n(econ.newClient.buyers),
                renewalsNeeded: n(econ.renewal.renewersNeeded),
                expiriesDue: n(econ.renewal.projectedExpiries),
                reactivationsNeeded: n(econ.reactivation.needed),
                lapsedPool: n(econ.reactivation.lapsedPool),
              }
            : {},
          steer: aiSteer.trim(),
        }),
      });
      const cleanStrategy = serializeStrategyLines(parseStrategyLines(ai.strategy));
      const cleanFocusPoints = (ai.focusPoints || []).map(p =>
        String(p || '')
          .trim()
          .replace(/^[-•*]\s+/, '')
          .replace(/^\d+[.)]\s+/, '')
          .trim(),
      );
      const next = {
        ...form,
        theme: String(ai.theme || '').trim(),
        objective: String(ai.objective || '').trim(),
        strategy: cleanStrategy || ai.strategy,
        streams,
        actions: ai.actionPlan.map(a => ({ ...a, done: false })),
        content: {
          ...(form.content || {}),
          focusPoints: cleanFocusPoints,
          ai: {
            mode: ai.mode || 'ai',
            splitRationale: ai.splitRationale,
            reasoning: ai.reasoning,
            risks: ai.risks,
            split: streams,
            coverage: cover,
            target: effective,
            offerRevenue,
            generatedAt: new Date().toISOString(),
          },
        },
      };
      setForm(next);
      setSteerOpen(false);
      await persistForm(next);
      toast(
        ai.mode === 'synthesised'
          ? `${MONTHS[month - 1]} structured brief synthesised from studio data and saved.`
          : `${MONTHS[month - 1]} commercial brief written by AI and saved.`,
      );
    } catch (e: any) {
      toast(e.message || 'Could not generate the focus.', 'error');
    } finally {
      setGenerating(false);
    }
  };
  const setApproval = async (approve: boolean) => {
    if (approve) {
      const missing = [
        !form.theme.trim() && 'monthly theme',
        !form.objective.trim() && 'commercial objective',
        !form.strategy.trim() && 'execution strategy',
        !form.actions.some(action => action.text.trim() && String(action.owner || '').trim()) &&
          'an action with a named owner',
      ].filter(Boolean);
      if (missing.length) return toast(`Complete the ${missing.join(', ')} before approving this month.`, 'error');
      const uncovered = gapRows.filter(g => g.gap > 1);
      if (uncovered.length)
        return toast(
          `Selected offers leave revenue gaps: ${uncovered.map(g => `${g.label} ${lakh(g.gap)} short`).join('; ')}.`,
          'error',
        );
    }
    setBusy(true);
    try {
      await api(`/studio-plans/${studio.id}/${year}/${month}`, {
        method: 'PUT',
        body: JSON.stringify(planBody({ status: approve ? 'approved' : 'draft' })),
      });
      await onSaved();
      toast(approve ? `${MONTHS[month - 1]} approved for ${studio.name}.` : `${MONTHS[month - 1]} reopened.`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const offerApproval = async (offer: any, approve: boolean) => {
    setBusy(true);
    try {
      await api(`/offers/${offer.id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: approve ? 'approve' : 'unapprove' }),
      });
      await onSaved();
      toast(approve ? `“${offer.name}” approved.` : `“${offer.name}” reopened.`);
      return true;
    } catch (e: any) {
      toast(e.message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };
  const addOffers = async (ids: number[]) => {
    setBusy(true);
    try {
      for (const offerId of ids)
        await api(`/studio-plans/${studio.id}/${year}/${month}/offers`, {
          method: 'POST',
          body: JSON.stringify({ op: 'add', offerId, solo }),
        });
      await onSaved();
      toast(`${ids.length} offer${ids.length > 1 ? 's' : ''} added to ${MONTHS[month - 1]}.`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  type Proposal = {
    action: 'add' | 'replace' | 'optimise';
    targetOfferId: number | null;
    replaces: string | null;
    name: string;
    headline: string;
    benefit: string;
    audience: string;
    objective: string;
    offerType: string;
    productKey: string;
    discountPct: number;
    targetPurchases: number;
    rationale: string;
    price: number;
    listPrice: number | null;
    revenue: number;
  };
  const [copilot, setCopilot] = useState<{
    mode: 'suggest' | 'replace' | 'optimise';
    replaceOfferId?: number;
    loading: boolean;
    summary?: string;
    proposals: Proposal[];
    created?: Array<{ proposal: Proposal; offerId: number; offer: any }>;
    creating?: boolean;
  } | null>(null);
  const [steer, setSteer] = useState('');
  // What the copilot needs to know about this month: target, stream gaps, key dates and the offers on the plan.
  const copilotContext = () => ({
    studioName: studio.name,
    monthName: MONTHS[month - 1],
    theme: form.theme,
    target: effective,
    steer,
    streams: gapRows.map(g => ({
      label: g.label,
      target: Math.round(g.target),
      offerLed: Math.round(g.offer),
    })),
    keyDates: dates.map(d => `${formatKeyDate(d)} ${MONTHS[month - 1].slice(0, 3)} · ${d.name}`),
    offers: selected.map(o => ({
      id: o.id,
      name: o.name,
      stream: STREAM_OF[o.objective] || 'Other',
      product: prices?.keys[o.provenance?.pricing?.product] || '',
      price: Math.round(n(o.expected_asp)),
      units: Math.round(n(o.target_purchases)),
      revenue: Math.round(n(o.expected_revenue)),
      approved: o.approval_status === 'approved',
    })),
  });
  const [regenerating, setRegenerating] = useState<number | null>(null);
  // "Generate with AI" on a card: a new, better-optimised offer replaces this one in the same card.
  const regenerateOffer = async (o: any) => {
    if (!aiReady) {
      toast('Unlock the AI passcode to generate offers.', 'error');
      setAiGateOpen(true);
      return;
    }
    setRegenerating(o.id);
    try {
      const r = await api<{ offerId: number; proposal: { name: string } }>(
        `/studio-plans/${studio.id}/${year}/${month}/offers/${o.id}/ai/regenerate`,
        { method: 'POST', body: JSON.stringify({ ...copilotContext(), steer, solo }) },
      );
      await onSaved();
      toast(`“${o.name}” replaced with “${r.proposal.name}”.`);
    } catch (e: any) {
      toast(e.message || 'Could not generate a new offer.', 'error');
    } finally {
      setRegenerating(null);
    }
  };
  const askCopilot = async (mode: 'suggest' | 'replace' | 'optimise', replaceOfferId?: number) => {
    setCopilot({ mode, replaceOfferId, loading: true, proposals: [] });
    try {
      const r = await api<{ summary: string; proposals: Proposal[] }>(
        `/studio-plans/${studio.id}/${year}/${month}/offers/ai`,
        {
          method: 'POST',
          body: JSON.stringify({ mode, replaceOfferId, ...copilotContext() }),
        },
      );
      setCopilot({ mode, replaceOfferId, loading: false, ...r, created: [] });
      if (mode === 'suggest' && r.proposals.length) {
        setCopilot({
          mode,
          replaceOfferId,
          loading: false,
          creating: true,
          summary: r.summary,
          proposals: r.proposals,
          created: [],
        });
        await applyProposals(r.proposals);
      }
      if (!r.proposals.length) toast('The copilot found nothing worth changing.', 'success');
    } catch (e: any) {
      setCopilot(null);
      toast(e.message || 'Could not reach the copilot.', 'error');
    }
  };
  const applyProposals = async (list: Proposal[]) => {
    setBusy(true);
    let done = 0;
    const created: Array<{ proposal: Proposal; offerId: number; offer: any }> = [];
    try {
      for (const proposal of list) {
        const result = await api<{ offerId: number; offer: any }>(
          `/studio-plans/${studio.id}/${year}/${month}/offers/ai/apply`,
          {
            method: 'POST',
            body: JSON.stringify({ proposal, solo }),
          },
        );
        done++;
        created.push({ proposal, offerId: result.offerId, offer: result.offer });
        setCopilot(c => c && { ...c, proposals: c.proposals.filter(p => p !== proposal) });
      }
      await onSaved();
      setCopilot(
        c =>
          c && {
            ...c,
            creating: false,
            proposals: c.proposals.filter(p => !list.includes(p)),
            created: [...(c.created || []), ...created],
            summary: `${created.length} complete draft offer${created.length === 1 ? '' : 's'} created and added to ${MONTHS[month - 1]} for ${studio.name}.`,
          },
      );
      toast(`${done} offer change${done > 1 ? 's' : ''} applied to ${MONTHS[month - 1]}.`);
    } catch (e: any) {
      if (done) await onSaved();
      if (done) setCopilot(c => c && { ...c, creating: false, created: [...(c.created || []), ...created] });
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (streamsMismatch)
      return toast('New-client, renewal, and comeback revenue must add up to the monthly target.', 'error');
    setBusy(true);
    try {
      if (targetDirty) {
        await api(`/targets/${targetRow.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            proposedTarget: form.target,
            ...Object.fromEntries(STREAMS.map(s => [s.body, n(form.streams[s.key])])),
            repeatTarget: 0,
            otherTarget: 0,
            requireFullCoverage: true,
            monthlyPlan: planBody(),
          }),
        });
      } else {
        await api(`/studio-plans/${studio.id}/${year}/${month}`, {
          method: 'PUT',
          body: JSON.stringify(planBody()),
        });
      }
      await onSaved();
      toast(`${MONTHS[month - 1]} plan saved for ${studio.name}.`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (libraryOpen) setLibraryOpen(false);
        else if (coverOpen) setCoverOpen(false);
        else onClose();
        return;
      }
      const el = e.target as HTMLElement | null;
      if (!el || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable || e.metaKey || e.ctrlKey)
        return;
      if (e.key === '[' && month > 1) {
        e.preventDefault();
        setMonth(month - 1);
      } else if (e.key === ']' && month < 12) {
        e.preventDefault();
        setMonth(month + 1);
      } else if (e.key === '\\' && page === 'offers' && !coverOpen) {
        e.preventDefault();
        setLibraryOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [month, onClose, setMonth, coverOpen, page, libraryOpen]);

  const copyMonthBrief = async () => {
    const lines = [
      `PHYSIQUE 57 · ${MONTHS[month - 1].toUpperCase()} ${year} COMMERCIAL BRIEF — ${studio.name.toUpperCase()}`,
      `Theme: ${displayTheme || '—'}`,
      `Monthly Target: ${lakh(effective)} (New clients ${lakh(form.streams.newClient)} · Renewals ${lakh(form.streams.renewal)} · Comeback ${lakh(form.streams.reactivation)})`,
      form.objective ? `Objective: ${form.objective}` : '',
      '',
      story.split,
      story.leads,
      story.renewals,
      dates.length
        ? `Key Moments: ${dates.map(d => `${formatKeyDate(d)} ${MONTHS[month - 1].slice(0, 3)} (${d.name})`).join(', ')}`
        : '',
      '',
      `SELECTED OFFERS (${selected.length} · ${lakh(offerRevenue)} forecast):`,
      ...selected.map(
        (o, idx) =>
          `${idx + 1}. ${o.name} — ${o.expected_asp ? money(o.expected_asp, true) : 'MRP'} × ${number(o.target_purchases)} units = ${lakh(forecastRevenue(o))}`,
      ),
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast(`${MONTHS[month - 1]} brief copied to clipboard.`);
    } catch {
      toast('Could not copy brief in this browser.', 'error');
    }
  };

  const { base, local } = monthActivations(data, month);
  const dates = (form.content?.keyDates || keyDatesFor(year, month)) as ReturnType<typeof keyDatesFor>;
  const activationEdits = form.content?.activations || {};
  const activation = (key: string, title: string, text: string) => activationEdits[key] || { title, text };
  const challenge = local.find(a => a.Format?.toLowerCase().includes('challenge'));
  const event = local.find(a => !a.Format?.toLowerCase().includes('challenge'));
  const fieldProps = { disabled: !editable };
  const coverage = econ?.renewal.coverage ?? null;
  const coverStreams = [
    { key: 'newClient', label: 'New clients', value: n(form.streams.newClient) },
    { key: 'renewal', label: 'Renewals', value: n(form.streams.renewal) },
    { key: 'reactivation', label: 'Comeback', value: n(form.streams.reactivation) },
  ];
  const chapter = monthChapter(month);
  // Months planned before the narrative rewrite carry a generic label; the chapter names them now.
  const displayTheme =
    isLegacyTheme(form.theme) || isLegacyTheme(row.theme) ? chapter.theme : form.theme || row.theme || chapter.theme;
  // A different cover photograph every month, from a set the offer cards never draw on.
  const coverPhoto = coverPhotoFor(month);

  /* The cover has to carry the month's argument, not an empty schedule. Action plan
     weeks win when they exist; when they do not, the execution page's strategy is read
     line by line, keeping its own labels (Hook, Moment, ...) instead of inventing weeks.
     The chapter signature is the last resort, so the cover is never blank. */
  const coverPlan = (() => {
    const weeks = [1, 2, 3, 4]
      .map(week => {
        const steps = form.actions.filter((a: any) => a.week === week && a.text);
        return { week, label: `W${week}`, text: steps[0]?.text ?? '', extra: Math.max(0, steps.length - 1) };
      })
      .filter(step => step.text);
    if (weeks.length) return weeks;

    const lines = parseStrategyLines(form.strategy).filter(Boolean);
    if (lines.length) {
      return lines.slice(0, 4).map((line, i) => {
        const labelled = line.match(/^(Hook|Moment|Play|Build|Close|Risk|Move)\s*:\s*(.+)$/i);
        return {
          week: i + 1,
          label: labelled ? labelled[1] : String(i + 1).padStart(2, '0'),
          text: labelled ? labelled[2] : line,
        };
      });
    }
    return chapter.signature ? [{ week: 1, label: 'The move', text: chapter.signature }] : [];
  })();
  const story = monthStory(month, {
    studio: studio.name,
    target: effective,
    lastYear: row.lastYear,
    streams: {
      newClient: n(form.streams.newClient),
      renewal: n(form.streams.renewal),
      reactivation: n(form.streams.reactivation),
    },
    leads: row.leads,
    trials: row.trials,
    buyers: row.buyers,
    renewalsDue: econ?.renewal.projectedExpiries || row.renewalsDue || 0,
    renewalCoverage: coverage,
    offers: selected.length,
    offerRevenue,
  });
  const showOnPage = (key: string) => isSectionVisible(key) && PAGE_OF_SECTION[key] === page;
  const pageTabs: Array<{ id: PlanPage; label: string; meta?: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'targets', label: 'Targets & mix' },
    { id: 'offers', label: 'Offers', meta: selected.length ? String(selected.length) : undefined },
    { id: 'collaterals', label: 'Collaterals' },
    { id: 'execution', label: 'Execution' },
  ];
  const heroPhoto = (offset: number) => PAGE_PHOTOS[(month + offset) % PAGE_PHOTOS.length];
  const heroYoy = row.lastYear ? Math.round((effective / row.lastYear - 1) * 100) : null;
  const mix = (value: number) => (effective ? `${Math.round((n(value) / effective) * 100)}%` : '—');
  const pageIdx = pageTabs.findIndex(t => t.id === page);
  const prevTab = pageIdx > 0 ? pageTabs[pageIdx - 1] : null;
  const nextTab = pageIdx >= 0 && pageIdx < pageTabs.length - 1 ? pageTabs[pageIdx + 1] : null;
  const coverStatus = locked ? 'approved' : approved ? 'locked' : 'proposed';
  const unlockEditing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await unlockAdmin(masterCode);
      setMasterCode('');
      setMasterCodeError('');
      setAiGateOpen(false);
    } catch (error: any) {
      setMasterCodeError(error.message || 'That passcode is incorrect.');
      setMasterCode('');
    }
  };
  const lockEditing = () => {
    void lockAdmin();
  };

  return (
    <div className="mw-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section
        className={`mw accented ${editable ? 'is-editable' : 'is-readonly'} ${coverOpen ? 'has-cover' : ''}`}
        role="dialog"
        aria-label={`${MONTHS[month - 1]} plan`}
        style={{ '--a1': accentFor(studio.name) } as React.CSSProperties}
      >
        <header className="mw-hero" inert={coverOpen}>
          <div className="mw-hero-fx" aria-hidden="true">
            <i className="mw-aurora mw-aurora-a" />
            <i className="mw-aurora mw-aurora-b" />
            <i className="mw-hairline" />
          </div>
          <div className="mw-hero-top">
            <div className="mw-nav">
              <button aria-label="Previous month" disabled={month === 1} onClick={() => setMonth(month - 1)}>
                <ChevronLeft size={16} />
              </button>
              <div className="mw-title-block" key={`title-${month}-${studio.id}`}>
                <div className="mw-eyebrow-row">
                  <span className="mw-month-idx">
                    {String(month).padStart(2, '0')}
                    <em>/12</em>
                  </span>
                  <span className="mw-eyebrow">
                    {studio.name} · {year}
                  </span>
                  {locked && (
                    <span className="mw-hero-badge is-approved">
                      <CheckCircle2 size={10} /> Approved
                    </span>
                  )}
                </div>
                <div className="mw-title-line">
                  <h2>{MONTHS[month - 1]}</h2>
                  {displayTheme && page !== 'overview' && (
                    <>
                      <i className="mw-title-sep" aria-hidden="true" />
                      <span className="mw-theme-sub">{displayTheme}</span>
                    </>
                  )}
                </div>
              </div>
              <button aria-label="Next month" disabled={month === 12} onClick={() => setMonth(month + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="mw-head-actions">
              {econ && (
                <button
                  type="button"
                  className={`mw-maths-launch ${mathsOpen ? 'active' : ''}`}
                  aria-expanded={mathsOpen}
                  aria-controls="mw-maths-panel"
                  aria-label={mathsOpen ? 'Hide monthly maths' : 'Show monthly maths'}
                  title={mathsOpen ? 'Hide monthly maths' : 'Show monthly maths and assumptions'}
                  onClick={() => setMathsOpen(open => !open)}
                >
                  <Sigma size={15} />
                  <span>Maths</span>
                </button>
              )}
              {/* One passcode: for an administrator it uncovers the editing controls as well
                  as the AI; for everyone else it still only unlocks the AI. */}
              {aiReady ? (
                <div className="mw-edit-status is-ai">
                  <span>
                    <Sparkles size={11} /> {isAdministrator ? 'Editing unlocked' : 'AI unlocked'}
                  </span>
                  <Button variant="secondary" icon={<LockKeyhole size={13} />} onClick={lockEditing}>
                    Lock
                  </Button>
                </div>
              ) : aiGateOpen ? (
                <form className="mw-hero-gate" onSubmit={unlockEditing}>
                  <LockKeyhole size={13} />
                  <input
                    aria-label={isAdministrator ? 'Editing passcode' : 'AI passcode'}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    autoFocus
                    value={masterCode}
                    onChange={e => {
                      setMasterCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setMasterCodeError('');
                    }}
                    placeholder={isAdministrator ? 'Editing passcode' : 'AI passcode'}
                  />
                  <button type="submit" disabled={masterCode.length !== 4}>
                    Unlock
                  </button>
                  <button
                    type="button"
                    className="mw-gate-dismiss"
                    onClick={() => setAiGateOpen(false)}
                    aria-label="Cancel"
                  >
                    <X size={12} />
                  </button>
                  {masterCodeError && (
                    <span className="mw-hero-gate-error" role="alert">
                      {masterCodeError}
                    </span>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  className="mw-ai-gate-btn"
                  title={
                    isAdministrator
                      ? 'Enter the passcode to show this month’s editing controls and unlock the AI'
                      : 'Enter the passcode to unlock the AI'
                  }
                  onClick={() => setAiGateOpen(true)}
                >
                  {isAdministrator ? <LockKeyhole size={13} /> : <Sparkles size={13} />}
                  <span>{isAdministrator ? 'Unlock editing' : 'Unlock AI'}</span>
                </button>
              )}
              {editable && (
                <label className={`mw-solo ${solo ? 'on' : ''}`} title="When off, offer changes copy to every location">
                  <input type="checkbox" checked={solo} onChange={e => setSolo(e.target.checked)} />
                  <span className="mw-switch" />
                  {solo ? <Unlink size={13} /> : <Link2 size={13} />}
                  {solo ? `Solo: ${studio.name} only` : 'Synced to all locations'}
                </label>
              )}
              {canApprovePlan && (
                <Button
                  variant={locked ? 'secondary' : 'dark'}
                  icon={locked ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                  disabled={busy}
                  onClick={() => setApproval(!locked)}
                >
                  {locked ? 'Reopen month' : 'Approve month'}
                </Button>
              )}
              {editable && (
                <Button icon={<Save size={14} />} disabled={busy} onClick={save}>
                  {busy ? 'Saving…' : 'Save month'}
                </Button>
              )}
              <button className="mw-close" aria-label="Close" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
          {data.plans.length > 1 && (
            <div className="mw-studios" role="tablist" aria-label="Location">
              <span className="mw-studios-eyebrow">Locations</span>
              <div className="mw-studios-track">
                {data.plans.map((p, i) => {
                  const mRow = p.months[month - 1];
                  const share = combinedRow.target ? Math.round((mRow.target / combinedRow.target) * 100) : 0;
                  return (
                    <button
                      key={p.studio.id}
                      type="button"
                      role="tab"
                      aria-selected={i === studioIdx}
                      className={i === studioIdx ? 'active' : ''}
                      style={{ '--loc': LOCATION_COLORS[p.studio.name] } as React.CSSProperties}
                      onClick={() => setStudioIdx(i)}
                    >
                      <i />
                      <span className="mw-studio-copy">
                        <strong>{p.studio.name}</strong>
                        <small>
                          {p.studio.city} · {share}%
                        </small>
                      </span>
                      <b>{lakh(mRow.target)}</b>
                    </button>
                  );
                })}
              </div>
              <span className="mw-studios-total">
                <em>All locations</em>
                <b>{lakh(combinedRow.target)}</b>
              </span>
            </div>
          )}
        </header>

        <div className="mw-body" inert={coverOpen}>
          <main ref={mainRef} className={`mw-main is-page-${page} ${locked ? 'is-locked' : ''}`}>
            <nav className="mw-pages" aria-label="Month plan pages">
              <div className="mw-pages-tabs" role="group" aria-label="Month pages">
                {pageTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={page === tab.id ? 'page' : undefined}
                    className={`mw-page-tab${page === tab.id ? ' is-active' : ''}`}
                    onClick={() => setPage(tab.id)}
                  >
                    <span>{tab.label}</span>
                    {tab.meta && <em>{tab.meta}</em>}
                  </button>
                ))}
              </div>
              <div className="mw-pages-tools">
                {editable && (
                  <button
                    type="button"
                    className="mw-qtool"
                    onClick={() => {
                      setPage('execution');
                      addCustomSection();
                    }}
                    title="Add a new custom section to this month's plan"
                  >
                    <Plus size={13} />
                    <span>Add section</span>
                  </button>
                )}
                {page === 'offers' && (
                  <button
                    type="button"
                    className="mw-qtool"
                    onClick={() => setLibraryOpen(true)}
                    title="Browse the offer library (shortcut: \\)"
                  >
                    <LayoutGrid size={13} />
                    <span>Offer library</span>
                    <em>{alternates.length}</em>
                  </button>
                )}
                <button
                  type="button"
                  className="mw-qtool"
                  onClick={copyMonthBrief}
                  title="Copy formatted executive summary to clipboard"
                >
                  <Copy size={13} />
                  <span>Copy brief</span>
                </button>
              </div>
            </nav>

            {editable &&
              hiddenSections.length > 0 &&
              (() => {
                const SEC_NAMES: Record<string, string> = {
                  days: 'Important days',
                  focus: 'Monthly focus & target',
                  ai: 'AI plan & reasoning',
                  offers: 'Offers',
                  coverage: 'Offer coverage',
                  acts: 'Activations',
                  actions: 'Action plan',
                  collaterals: 'Marketing & collaterals',
                };
                return (
                  <div className="mw-restore-strip" role="region" aria-label="Deleted sections">
                    <span>Deleted sections:</span>
                    {hiddenSections.map(sec => (
                      <button key={sec} type="button" onClick={() => restoreSection(sec)}>
                        <RotateCcw size={11} /> Restore {SEC_NAMES[sec] || sec}
                      </button>
                    ))}
                    {hiddenSections.length > 1 && (
                      <button type="button" className="is-all" onClick={() => updateContent({ hiddenSections: [] })}>
                        Restore all
                      </button>
                    )}
                  </div>
                );
              })()}

            {locked && (
              <div className="mw-approved-banner">
                <CheckCircle2 size={16} />
                <span>
                  <b>
                    {MONTHS[month - 1]} is approved for {studio.name}.
                  </b>{' '}
                  Fields are locked — reopen the month to make changes.
                </span>
              </div>
            )}

            {page === 'targets' && (
              <PageHero
                index="02"
                label="Targets & mix"
                title="Where the money comes from"
                description="Set the month’s number, split it across new clients, renewals and comeback, then check that the offers can carry it."
                photo={heroPhoto(1)}
                meta={[
                  { label: 'Target', value: lakh(effective) },
                  {
                    label: 'vs last year',
                    value: heroYoy === null ? '—' : `${heroYoy >= 0 ? '+' : ''}${heroYoy}%`,
                  },
                  {
                    label: 'New · renew · back',
                    value: `${mix(form.streams.newClient)} · ${mix(form.streams.renewal)} · ${mix(form.streams.reactivation)}`,
                  },
                ]}
              />
            )}

            {page === 'offers' && (
              <PageHero
                index="03"
                label="Offers"
                title="What we sell to get there"
                description="Every offer that carries the month: the photograph, the promise, the maths behind it and its approval, in one card."
                photo={heroPhoto(2)}
                meta={[
                  { label: 'Offers', value: `${selected.length}` },
                  { label: 'Carried', value: lakh(offerRevenue) },
                  { label: 'Of target', value: effective ? `${Math.round((offerRevenue / effective) * 100)}%` : '—' },
                ]}
                actions={
                  <button type="button" className="mp-hero-btn" onClick={() => setLibraryOpen(true)}>
                    <LayoutGrid size={14} />
                    Offer library
                    <em>{alternates.length}</em>
                  </button>
                }
              />
            )}

            {page === 'collaterals' && (
              <PageHero
                index="04"
                label="Collaterals"
                title="What has to be made, and by when"
                description="Every asset the studio owes this month's offers — channel by channel, with the copy, the sizes and the date it is due at the desk."
                photo={heroPhoto(4)}
                meta={[
                  {
                    label: 'Channels',
                    value: `${Math.max(
                      0,
                      3 -
                        (Array.isArray(form.content?.collaterals?.hiddenChannels)
                          ? form.content!.collaterals!.hiddenChannels!.length
                          : 0) +
                        (Array.isArray(form.content?.collaterals?.customChannels)
                          ? form.content!.collaterals!.customChannels!.length
                          : 0),
                    )}`,
                  },
                  { label: 'Offers covered', value: `${selected.length}` },
                  { label: 'Creatives', value: `${selected.length * 3}` },
                ]}
              />
            )}

            {page === 'execution' && (
              <PageHero
                index="05"
                label="Execution"
                title="How the month actually runs"
                description="The week-by-week run of the month and the activations that create demand."
                photo={heroPhoto(3)}
                meta={[
                  { label: 'Actions', value: `${form.actions.length}` },
                  { label: 'Strategy plays', value: `${parseStrategyLines(form.strategy).length}` },
                  { label: 'Key dates', value: `${dates.length}` },
                ]}
              />
            )}

            {page === 'overview' && (
              <MonthOverview
                month={month}
                chapter={chapter}
                theme={displayTheme}
                studioName={studio.name}
                roomAngle={locationPlaybook(studio.name).theme}
                story={story}
                target={effective}
                lastYear={row.lastYear}
                leads={row.leads}
                trials={row.trials}
                buyers={row.buyers}
                offers={selected.length}
                offerRevenue={offerRevenue}
                renewalsDue={econ?.renewal.projectedExpiries || row.renewalsDue || 0}
                renewalCoverage={coverage}
                photo={coverPhoto}
                status={coverStatus}
              />
            )}

            {/* ─── Section 1: Important days ─── */}
            {showOnPage('days') &&
              (() => {
                const meta = sectionMeta(
                  'days',
                  'Important days',
                  'Festivals, holidays and moments that shape demand.',
                );
                const setDates = (nextDates: any[]) => updateContent({ keyDates: nextDates, keyDatesCustomized: true });
                return (
                  <div id="mw-sec-days" className="mw-section mw-days">
                    <SectionHead
                      icon={CalendarHeart}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('days')}
                      onToggleEdit={() => toggleSection('days')}
                      onTitleChange={v => patchSectionMeta('days', { title: v })}
                      onHintChange={v => patchSectionMeta('days', { hint: v })}
                      onDelete={() => hideSection('days')}
                      actions={
                        sectionEditable('days') ? (
                          <>
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={() => {
                                const next = [
                                  ...dates,
                                  { day: 1, name: 'New moment', kind: 'awareness', approx: false },
                                ];
                                setDates(next);
                                setActiveDay(next.length - 1);
                              }}
                            >
                              <Plus size={12} /> Add day
                            </button>
                            {form.content?.keyDatesCustomized && (
                              <button
                                type="button"
                                className="mw-mini-btn"
                                onClick={() =>
                                  updateContent({ keyDates: keyDatesFor(year, month), keyDatesCustomized: false })
                                }
                              >
                                <RotateCcw size={11} /> Reset calendar
                              </button>
                            )}
                          </>
                        ) : undefined
                      }
                    />
                    {dates.length > 0 ? (
                      <div className="mw-days-grid">
                        {dates.map((d: any, di: number) => {
                          const left = daysUntil(year, month, d.day);
                          const open = activeDay === di;
                          return (
                            <article
                              key={`${d.day}-${di}`}
                              className={`mw-day kd-${d.kind}${open ? ' is-open' : ''}${sectionEditable('days') ? ' is-editing' : ''}`}
                              role="button"
                              tabIndex={0}
                              aria-expanded={open}
                              onClick={() => setActiveDay(open ? null : di)}
                              onKeyDown={e =>
                                (e.key === 'Enter' || e.key === ' ') &&
                                (e.preventDefault(), setActiveDay(open ? null : di))
                              }
                            >
                              <div className="mw-day-art">
                                {(() => {
                                  const Icon = DAY_KIND_ICONS[d.kind as keyof typeof DAY_KIND_ICONS] || CalendarHeart;
                                  return <Icon size={17} strokeWidth={1.6} />;
                                })()}
                              </div>
                              <div className="mw-day-body">
                                <strong>{d.name}</strong>
                                <span className="mw-day-meta">
                                  <em>
                                    {formatKeyDate(d)} {MONTHS[month - 1].slice(0, 3)}
                                  </em>
                                  <i className={left < 0 ? 'is-past' : left <= 14 ? 'is-soon' : ''}>
                                    {left < 0 ? 'Passed' : left === 0 ? 'Today' : `in ${left}d`}
                                  </i>
                                </span>
                              </div>
                              {/* The controls ride on top of the card instead of replacing its
                                  contents, so editing never reshapes the grid. */}
                              {sectionEditable('days') && (
                                <div className="mw-day-tools">
                                  <button
                                    type="button"
                                    title="Edit play & channels"
                                    aria-label={`Edit details for ${d.name || 'day'}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setActiveDay(di);
                                    }}
                                  >
                                    <Pencil size={11.5} />
                                  </button>
                                  <button
                                    type="button"
                                    className="is-danger"
                                    aria-label={`Remove ${d.name}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (activeDay === di) setActiveDay(null);
                                      setDates(dates.filter((_: any, i: number) => i !== di));
                                    }}
                                  >
                                    <Trash2 size={12.5} />
                                  </button>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mw-action-empty">No important days listed for {MONTHS[month - 1]}.</p>
                    )}
                    {activeDay !== null &&
                      dates[activeDay] &&
                      (() => {
                        const d: any = dates[activeDay];
                        const tip = DAY_PLAYS[d.kind] || DAY_PLAYS.awareness;
                        const playText = d.play ?? tip.play;
                        const leadDays = d.lead ?? tip.lead;
                        const channelText = d.channel ?? tip.channel;
                        const pair = selected.find(o => tip.pairs.includes(o.plan_slot)) || selected[0];
                        const patchDay = (patch: Record<string, any>) =>
                          setDates(dates.map((x: any, i: number) => (i === activeDay ? { ...x, ...patch } : x)));
                        return (
                          <div className={`mw-day-detail kd-${d.kind}`}>
                            <div>
                              <small>
                                {formatKeyDate(d)} {MONTHS[month - 1]} ·{' '}
                                {KEY_DATE_LABELS[d.kind as keyof typeof KEY_DATE_LABELS]}
                                {d.approx ? ' · date to confirm' : ''}
                              </small>
                              <h5>{d.name || 'Untitled moment'}</h5>
                              {d.note && <p className="mw-day-note">{d.note}</p>}
                              {sectionEditable('days') ? (
                                <textarea
                                  className="mw-day-detail-input"
                                  rows={2}
                                  aria-label="How we play this moment"
                                  value={playText}
                                  onChange={e => patchDay({ play: e.target.value })}
                                />
                              ) : (
                                <p>{playText}</p>
                              )}
                            </div>
                            <ul>
                              <li>
                                <b>Go live</b>{' '}
                                {sectionEditable('days') ? (
                                  <span className="mw-day-inline-num">
                                    <input
                                      type="number"
                                      min={1}
                                      max={45}
                                      value={leadDays}
                                      onChange={e => patchDay({ lead: Math.max(1, Number(e.target.value) || 1) })}
                                    />{' '}
                                    days before
                                  </span>
                                ) : (
                                  `${leadDays} days before`
                                )}
                              </li>
                              <li>
                                <b>Channel</b>{' '}
                                {sectionEditable('days') ? (
                                  <input
                                    className="mw-day-inline-text"
                                    value={channelText}
                                    onChange={e => patchDay({ channel: e.target.value })}
                                  />
                                ) : (
                                  channelText
                                )}
                              </li>
                              {pair && (
                                <li>
                                  <b>Pair with</b> {pair.name}
                                </li>
                              )}
                            </ul>
                            <button type="button" aria-label="Close" onClick={() => setActiveDay(null)}>
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })()}
                  </div>
                );
              })()}

            {/* ─── Section 2: Monthly focus & target (ONE Unified Cohesive Canvas) ─── */}
            {showOnPage('focus') &&
              (() => {
                const meta = sectionMeta(
                  'focus',
                  'Monthly focus & target',
                  'Commercial narrative, monthly revenue goal, stream mix and required funnel volumes in one unified brief.',
                );
                const points: string[] = Array.isArray(form.content?.focusPoints)
                  ? form.content.focusPoints
                  : FOCUS_POINTS[month] || [];
                const setPoints = (next: string[]) => updateContent({ focusPoints: next });
                const strategyLines = parseStrategyLines(form.strategy);
                // Plan notes carry the month's numbers and cohort maths; surface them under the plays so
                // the strategy column carries as much substance as the focus-points panel beside it.
                const strategyContext = String(form.notes || '')
                  .split(/\n+/)
                  .map(line => line.replace(/^\s*[-•*]\s*/, '').trim())
                  .filter(Boolean)
                  .slice(0, 5);
                const setStrategyLines = (next: string[]) => set({ strategy: serializeStrategyLines(next) });
                const aiMeta = form.content?.ai || null;
                const splitRationaleLines = aiMeta?.splitRationale
                  ? String(aiMeta.splitRationale)
                      .split(/\r?\n/)
                      .map((l: string) => l.trim())
                      .filter(Boolean)
                  : [];

                const volOverrides: Record<string, { label?: string; tag?: string; value?: string; hint?: string }> =
                  form.content?.volumeOverrides || {};
                const hiddenVols: string[] = Array.isArray(form.content?.hiddenVolumes)
                  ? form.content.hiddenVolumes
                  : [];
                const customVols: Array<{
                  id: string;
                  label: string;
                  tag: string;
                  kind: string;
                  value: string;
                  hint: string;
                }> = Array.isArray(form.content?.customVolumes) ? form.content.customVolumes : [];
                const baseVols = (() => {
                  if (!econ) return [];
                  const liveNewTarget = editable ? Math.max(0, n(form.streams.newClient)) : n(econ.newClient.target);
                  const liveRenTarget = editable ? Math.max(0, n(form.streams.renewal)) : n(econ.renewal.target);
                  const liveReactTarget = editable
                    ? Math.max(0, n(form.streams.reactivation))
                    : n(econ.reactivation.target);
                  const t2m = Math.max(0.01, n(econ.newClient.trialToMember) || 0.24);
                  const l2t = Math.max(0.01, n(econ.newClient.leadToTrial) || 0.45);
                  const firstSpend = Math.max(1, n(econ.newClient.firstSpend) || 6000);
                  const trialSpend = Math.max(0, n(econ.newClient.trialSpend));
                  const revPerBuyer = firstSpend + (t2m > 0 ? trialSpend / t2m : 0);
                  const liveBuyers = liveNewTarget > 0 ? Math.ceil(liveNewTarget / revPerBuyer) : 0;
                  const liveTrials = liveBuyers > 0 ? Math.ceil(liveBuyers / t2m) : 0;
                  const liveLeads = liveTrials > 0 ? Math.ceil(liveTrials / l2t) : 0;
                  const renTicket = Math.max(1, n(econ.renewal.ticket) || 14000);
                  const reactTicket = Math.max(1, n(econ.reactivation.ticket) || 10000);
                  const liveRenewals = liveRenTarget > 0 ? Math.ceil(liveRenTarget / renTicket) : 0;
                  const liveReactivations = liveReactTarget > 0 ? Math.ceil(liveReactTarget / reactTicket) : 0;
                  return [
                    {
                      id: 'leads',
                      label: 'Leads needed',
                      tag: 'Step 1',
                      kind: 'acq',
                      value: number(liveLeads),
                      hint: 'Top-of-funnel leads',
                    },
                    {
                      id: 'trials',
                      label: 'Completed trials',
                      tag: 'Step 2',
                      kind: 'acq',
                      value: number(liveTrials),
                      hint: `${pct(econ.newClient.leadToTrial)} lead → trial`,
                      rate: l2t,
                    },
                    {
                      id: 'buyers',
                      label: 'New members',
                      tag: 'Step 3',
                      kind: 'acq',
                      value: number(liveBuyers),
                      hint: `${pct(econ.newClient.trialToMember)} trial → member`,
                      rate: t2m,
                    },
                    {
                      id: 'renewals',
                      label: 'Renewals needed',
                      tag: 'Retention',
                      kind: 'ret',
                      value: number(liveRenewals),
                      hint: `of ${number(econ.renewal.projectedExpiries)} due · ${pct(econ.renewal.renewalRate)}`,
                      of: n(econ.renewal.projectedExpiries),
                      ofLabel: 'due',
                    },
                    {
                      id: 'reactivations',
                      label: 'Reactivations',
                      tag: 'Comeback',
                      kind: 'ret',
                      value: number(liveReactivations),
                      hint: `from ${number(econ.reactivation.lapsedPool)} lapsed`,
                      of: n(econ.reactivation.lapsedPool),
                      ofLabel: 'lapsed',
                    },
                    {
                      id: 'conv',
                      label: 'Lead → member',
                      tag: 'Net conv.',
                      kind: 'conv',
                      value: pct(liveLeads ? liveBuyers / liveLeads : 0, 1),
                      hint: 'End-to-end conversion',
                    },
                  ];
                })();
                const visibleBaseVols = baseVols
                  .filter(v => !hiddenVols.includes(v.id))
                  .map(v => ({ ...v, ...(volOverrides[v.id] || {}), isCustom: false }));
                const allVols = [...visibleBaseVols, ...customVols.map(v => ({ ...v, isCustom: true }))];
                const yoyDelta =
                  row.lastYear > 0 ? Math.round(((effective - row.lastYear) / row.lastYear) * 100) : null;
                const offerDelta = offerRevenue - effective;

                return (
                  <div
                    id="mw-sec-focus"
                    className={`mw-section mw-planning-section ${generating ? 'is-generating' : ''}`}
                  >
                    <SectionHead
                      icon={Flag}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('focus')}
                      onToggleEdit={() => toggleSection('focus')}
                      onTitleChange={v => patchSectionMeta('focus', { title: v })}
                      onHintChange={v => patchSectionMeta('focus', { hint: v })}
                      onDelete={() => hideSection('focus')}
                      actions={
                        <div className="mw-focus-head-actions">
                          {aiMeta?.generatedAt && (
                            <span
                              className="mw-ai-stamp"
                              title="Formatted to the unified Monthly Focus & Target structure"
                            >
                              <Sparkles size={11} />
                              {aiMeta.mode === 'synthesised' ? 'Data-synthesised' : 'AI-structured'} ·{' '}
                              {new Date(aiMeta.generatedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                          {aiReady && (
                            <>
                              <button
                                type="button"
                                className={`mw-mini-btn ${steerOpen ? 'is-active' : ''}`}
                                disabled={generating || busy}
                                onClick={() => setSteerOpen(v => !v)}
                                title="Give optional custom direction before generating"
                              >
                                <SlidersHorizontal size={12} /> Steer
                              </button>
                              <button
                                type="button"
                                className="mw-ai"
                                disabled={generating || busy}
                                onClick={generateFocus}
                                title="Write the focus, stream split, action plan and reasoning from this month's dates, offers and target, then save"
                              >
                                <Sparkles size={14} />
                                {generating
                                  ? 'Writing structured brief…'
                                  : form.strategy
                                    ? 'Regenerate with AI'
                                    : 'Enhance with AI'}
                              </button>
                            </>
                          )}
                        </div>
                      }
                    />

                    {aiReady && steerOpen && (
                      <div className="mw-fu-steer-bar">
                        <Sparkles size={13} className="mw-fu-steer-ic" />
                        <input
                          value={aiSteer}
                          onChange={e => setAiSteer(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !generating && !busy) {
                              e.preventDefault();
                              void generateFocus();
                            }
                          }}
                          placeholder="Optional commercial steer — e.g. 'Push 3M commitments, zero % promo codes, anchor Week 2 around festival gifting'…"
                          aria-label="Commercial steer for AI brief"
                        />
                        <button
                          type="button"
                          className="mw-mini-btn is-primary"
                          disabled={generating || busy}
                          onClick={generateFocus}
                        >
                          {generating ? 'Generating…' : 'Generate now'}
                        </button>
                        <button
                          type="button"
                          className="mw-mini-icon"
                          aria-label="Close steer bar"
                          onClick={() => setSteerOpen(false)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    <div className="mw-focus-unified">
                      {/* Band 1: Unified Story, Mandate & Headline Commercial Target Scorecard */}
                      <div className="mw-fu-top">
                        <div className="mw-fu-story">
                          <div className="mw-fu-story-head">
                            <span className="mw-fu-band-kicker">
                              <i>01</i> Campaign story &amp; mandate
                            </span>
                            <span className="mw-fu-context-chip">
                              {studio.name} · {MONTHS[month - 1]} {year}
                            </span>
                          </div>

                          {sectionEditable('focus') ? (
                            <label className="mw-fu-theme">
                              <span>Monthly theme</span>
                              <input
                                value={form.theme}
                                placeholder="Name the month’s campaign story (e.g. Founding 57 · Full-Value Commitment)"
                                onChange={e => set({ theme: e.target.value })}
                                {...fieldProps}
                              />
                            </label>
                          ) : (
                            <div className="mw-fu-theme is-readonly">
                              <span>Monthly theme</span>
                              <h3 className="mw-fu-theme-display">
                                {displayTheme || `${MONTHS[month - 1]} Commercial Plan`}
                              </h3>
                            </div>
                          )}

                          <div className="mw-fu-mandate-card">
                            <span className="mw-fu-label">
                              <Target size={12.5} /> Commercial objective
                            </span>
                            {sectionEditable('focus') ? (
                              <textarea
                                aria-label="Commercial objective"
                                rows={2}
                                value={form.objective}
                                placeholder="One crisp sentence: the primary commercial job this month delivers…"
                                onChange={e => set({ objective: e.target.value })}
                              />
                            ) : form.objective ? (
                              <p className="mw-fu-objective-display">{inline(form.objective)}</p>
                            ) : (
                              <p className="mw-fu-objective-display is-empty">No commercial objective defined yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="mw-fu-target-box">
                          <div className="mw-fu-target-meta">
                            <span className={`mw-fu-status-pill ${approved ? 'is-approved' : 'is-proposed'}`}>
                              {approved ? <CheckCircle2 size={11} /> : <Target size={11} />}
                              {approved ? 'Approved target' : 'Proposed target'}
                            </span>
                            {yoyDelta !== null && (
                              <em className={yoyDelta >= 0 ? 'is-pos' : 'is-neg'}>
                                {yoyDelta >= 0 ? `+${yoyDelta}%` : `${yoyDelta}%`} vs LY
                              </em>
                            )}
                          </div>

                          {sectionEditable('focus') ? (
                            <div className="mw-fu-target-input-wrap">
                              <div className="mw-money big">
                                <em className="cur">₹</em>
                                <input
                                  aria-label="Monthly revenue target"
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={form.target}
                                  onChange={e => changeTarget(Math.round(n(e.target.value)))}
                                  disabled={!targetRow}
                                />
                                <span className="mw-money-lakh-pill">{lakh(form.target)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="mw-fu-target-readout">
                              <strong>{lakh(effective)}</strong>
                              <span>₹{Math.round(effective).toLocaleString('en-IN')}</span>
                            </div>
                          )}

                          <div className="mw-fu-target-benchmarks">
                            <div>
                              <small>Last year actual</small>
                              <b>{row.lastYear > 0 ? lakh(row.lastYear) : '—'}</b>
                            </div>
                            <div>
                              <small>Offer forecast</small>
                              <b className={offerDelta >= -1000 ? 'is-ok' : 'is-warn'}>
                                {lakh(offerRevenue)}{' '}
                                <em>{offerDelta >= -1000 ? '· Covered' : `· ${lakh(Math.abs(offerDelta))} gap`}</em>
                              </b>
                            </div>
                          </div>

                          <div className="mw-fu-split-wrap">
                            <div className="mw-split-bar" aria-hidden="true">
                              {STREAMS.map(s => (
                                <span
                                  key={s.key}
                                  title={`${s.label}: ${lakh(n(form.streams[s.key]))}`}
                                  style={{
                                    width: `${(n(form.streams[s.key]) / Math.max(streamTotal, effective, 1)) * 100}%`,
                                    background: s.color,
                                  }}
                                />
                              ))}
                            </div>
                            <div className="mw-fu-target-foot">
                              <small>3-stream allocation</small>
                              <small className={streamsMismatch ? 'is-warn' : 'is-ok'}>
                                {streamsMismatch ? (
                                  <>
                                    {`${lakh(Math.abs(effective - streamTotal))} ${streamTotal > effective ? 'over' : 'unallocated'}`}
                                    {sectionEditable('focus') && (
                                      <>
                                        {' · '}
                                        <button
                                          type="button"
                                          className="mw-inline-link-btn"
                                          onClick={() => {
                                            const ren = Math.round(n(form.streams.renewal));
                                            const react = Math.round(n(form.streams.reactivation));
                                            const rest = Math.max(0, Math.round(effective) - ren - react);
                                            set({
                                              streams: {
                                                newClient: rest,
                                                renewal: rest === 0 ? Math.min(ren, Math.round(effective)) : ren,
                                                reactivation:
                                                  rest === 0
                                                    ? Math.max(
                                                        0,
                                                        Math.round(effective) - Math.min(ren, Math.round(effective)),
                                                      )
                                                    : react,
                                              },
                                            });
                                          }}
                                        >
                                          Auto-balance
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  `${lakh(streamTotal)} · 100% balanced`
                                )}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Band 2: Structured Execution Strategy & Team Focus Playbook */}
                      <div className="mw-fu-execution">
                        <div className="mw-fu-strategy">
                          <div className="mw-fu-pillars-head">
                            <span className="mw-fu-band-kicker">
                              <i>02</i> <ListChecks size={12.5} /> Execution strategy
                            </span>
                            <div className="mw-subgrid-tools">
                              <span className="mw-fu-count-pill">
                                {strategyLines.length} {strategyLines.length === 1 ? 'play' : 'plays'}
                              </span>
                              {sectionEditable('focus') && (
                                <>
                                  {!strategyRawMode && (
                                    <button
                                      type="button"
                                      className="mw-mini-btn"
                                      onClick={() =>
                                        setStrategyLines([
                                          ...strategyLines,
                                          '**New Play:** Name the offer, target cohort and commercial target.',
                                        ])
                                      }
                                    >
                                      <Plus size={11} /> Add play
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="mw-mini-btn"
                                    onClick={() => setStrategyRawMode(v => !v)}
                                  >
                                    {strategyRawMode ? 'Card view' : 'Bulk text'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {sectionEditable('focus') ? (
                            strategyRawMode ? (
                              <textarea
                                className="mw-fu-raw-strategy"
                                rows={6}
                                value={form.strategy}
                                placeholder={
                                  '- **Hero Offer:** Lead with the festive gifting pack\n- **Renewal Lock-In:** Push T-14 renewals in Week 2…'
                                }
                                onChange={e => set({ strategy: e.target.value })}
                              />
                            ) : (
                              <ol className="mw-fu-strategy-cards is-editing">
                                {(strategyLines.length ? strategyLines : ['']).map((line, idx) => (
                                  <li key={idx}>
                                    <b>{String(idx + 1).padStart(2, '0')}</b>
                                    <textarea
                                      rows={2}
                                      aria-label={`Strategy play ${idx + 1}`}
                                      placeholder="**Play Name:** Specific offer, audience, key date and ₹ goal…"
                                      value={line}
                                      onChange={e => {
                                        const base = strategyLines.length ? [...strategyLines] : [''];
                                        base[idx] = e.target.value;
                                        set({
                                          strategy: base
                                            .map(l => l.replace(/^[-•*]\s+/, ''))
                                            .map(l => `- ${l}`)
                                            .join('\n'),
                                        });
                                      }}
                                    />
                                    <button
                                      type="button"
                                      aria-label={`Remove strategy play ${idx + 1}`}
                                      onClick={() => setStrategyLines(strategyLines.filter((_, j) => j !== idx))}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </li>
                                ))}
                              </ol>
                            )
                          ) : strategyLines.length > 0 ? (
                            <>
                              <ol className="mw-fu-strategy-cards">
                                {strategyLines.map((line, idx) => (
                                  <li key={idx}>
                                    <b>{String(idx + 1).padStart(2, '0')}</b>
                                    <div className="mw-fu-card-copy">
                                      <StructuredLine text={line} />
                                    </div>
                                  </li>
                                ))}
                              </ol>
                              {strategyContext.length > 0 && (
                                <div className="mw-fu-strategy-context">
                                  <span className="mw-fu-context-label">Month context</span>
                                  {strategyContext.map((line, idx) => (
                                    <p key={idx}>{line}</p>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="mw-fu-empty">No execution strategy drafted yet.</p>
                          )}
                        </div>

                        <div className="mw-fu-pillars">
                          <div className="mw-fu-pillars-head">
                            <span className="mw-fu-band-kicker">
                              <i>03</i> <Flag size={12.5} /> Team focus points
                            </span>
                            <div className="mw-subgrid-tools">
                              <span className="mw-fu-count-pill">{points.length} priorities</span>
                              {sectionEditable('focus') && (
                                <button
                                  type="button"
                                  className="mw-mini-btn"
                                  onClick={() => setPoints([...points, '**Front Desk:** Crisp team action…'])}
                                >
                                  <Plus size={11} /> Add point
                                </button>
                              )}
                            </div>
                          </div>
                          <ol className="mw-fu-points-list">
                            {points.map((t, i) => (
                              <li key={i} className={sectionEditable('focus') ? 'is-editing' : ''}>
                                <b>{String(i + 1).padStart(2, '0')}</b>
                                {sectionEditable('focus') ? (
                                  <>
                                    <textarea
                                      rows={2}
                                      aria-label={`Focus point ${i + 1}`}
                                      placeholder="**Owner / Focus:** Actionable priority…"
                                      value={t}
                                      onChange={e => setPoints(points.map((x, j) => (j === i ? e.target.value : x)))}
                                    />
                                    <button
                                      type="button"
                                      aria-label="Remove focus point"
                                      onClick={() => setPoints(points.filter((_, j) => j !== i))}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="mw-fu-card-copy">
                                    <StructuredLine text={t} />
                                  </div>
                                )}
                              </li>
                            ))}
                            {points.length === 0 && <li className="is-empty">No focus points listed yet.</li>}
                          </ol>
                        </div>
                      </div>

                      {/* Band 3: Full-Width Revenue Streams, Split Rationale & Volumes Needed */}
                      <div className="mw-fu-commercial">
                        <div className="mw-streams-block">
                          <div className="mw-subgrid-head">
                            <span className="mw-fu-band-kicker">
                              <i>04</i> Revenue streams
                            </span>
                            <small className={streamsMismatch ? 'neg' : ''}>
                              Allocated {lakh(streamTotal)} of {lakh(effective)}
                              {streamsMismatch
                                ? ` · ${lakh(Math.abs(effective - streamTotal))} ${streamTotal > effective ? 'over' : 'short'}`
                                : ' · 100% allocated across 3 streams'}
                            </small>
                          </div>
                          {(() => {
                            // One chart: the target split as a single bar, then each stream's target vs its
                            // offers' forecast on a shared scale.
                            const rows = STREAMS.map(s => {
                              const val = n(form.streams[s.key]);
                              const streamOffers = selected.filter(
                                o => STREAM_KEY[STREAM_OF[o.objective] || ''] === s.key,
                              );
                              const forecast = streamOffers.reduce((sum, o) => sum + forecastRevenue(o), 0);
                              return {
                                ...s,
                                val,
                                share: effective ? Math.round((val / effective) * 100) : 0,
                                offers: streamOffers.length,
                                forecast,
                                covered: val <= 0 || forecast >= val - 500,
                              };
                            });
                            const scale = Math.max(1, ...rows.map(r => Math.max(r.val, r.forecast)));
                            const w = (v: number) => `${Math.min(100, Math.max(0, (v / scale) * 100))}%`;
                            return (
                              <div className="mw-streamchart">
                                <div className="mw-streamchart-split" aria-label="Target split by stream">
                                  {rows
                                    .filter(r => r.val > 0)
                                    .map(r => (
                                      <span
                                        key={r.key}
                                        style={{ flexGrow: r.val, '--c': r.color } as React.CSSProperties}
                                        title={`${r.label}: ${lakh(r.val)} (${r.share}%)`}
                                      >
                                        {r.share >= 8 && `${r.share}%`}
                                      </span>
                                    ))}
                                </div>
                                <div className="mw-streamchart-legend" aria-hidden="true">
                                  <span>
                                    <i className="is-target" /> Target
                                  </span>
                                  <span>
                                    <i className="is-forecast" /> Offer forecast
                                  </span>
                                </div>
                                {rows.map(r => (
                                  <div
                                    key={r.key}
                                    className="mw-streamchart-row"
                                    style={{ '--c': r.color } as React.CSSProperties}
                                  >
                                    <div className="mw-streamchart-label">
                                      <span title={r.label}>
                                        <i /> {r.key === 'reactivation' ? 'Comeback' : r.label}
                                      </span>
                                    </div>
                                    <div className="mw-streamchart-bars">
                                      <b className="is-target" style={{ width: w(r.val) }} />
                                      <b className="is-forecast" style={{ width: w(r.forecast) }} />
                                    </div>
                                    <div className="mw-streamchart-value">
                                      {sectionEditable('focus') ? (
                                        <div className="mw-money">
                                          <em className="cur">₹</em>
                                          <input
                                            aria-label={`${r.label} target`}
                                            type="number"
                                            min={0}
                                            step={1000}
                                            value={form.streams[r.key]}
                                            onChange={e => changeStream(r.key, Math.round(n(e.target.value)))}
                                            disabled={!targetRow}
                                          />
                                        </div>
                                      ) : (
                                        <strong>
                                          {lakh(r.val)} <em>{r.share}%</em>
                                        </strong>
                                      )}
                                      <small className={r.covered ? 'is-covered' : 'is-short'}>
                                        {r.offers > 0
                                          ? `${r.offers} offer${r.offers === 1 ? '' : 's'} · ${lakh(r.forecast)}`
                                          : 'No offer assigned'}
                                      </small>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {splitRationaleLines.length > 0 && (
                            <div className="mw-fu-rationale-strip">
                              <span className="mw-fu-rationale-tag">
                                <Sparkles size={11} /> Why this split
                              </span>
                              <ul className="mw-fu-rationale-list">
                                {splitRationaleLines.map((line: string, rIdx: number) => (
                                  <li key={rIdx}>
                                    <StructuredLine text={line} leadTone="stream" />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {(allVols.length > 0 || sectionEditable('focus')) && (
                          <div className="mw-funnel-targets">
                            <div className="mw-subgrid-head">
                              <span className="mw-fu-band-kicker">
                                <i>05</i> Volumes needed
                              </span>
                              <div className="mw-subgrid-tools">
                                <small>
                                  {targetDirty ? 'Live preview from edited split' : 'Funnel & conversion targets'}
                                </small>
                                {econ && (
                                  <button
                                    type="button"
                                    className="mw-mini-btn"
                                    onClick={() => {
                                      setMathsOpen(true);
                                      setTimeout(
                                        () =>
                                          document
                                            .getElementById('mw-maths-panel')
                                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                                        60,
                                      );
                                    }}
                                    title="Inspect or override unit tickets & conversion rates"
                                  >
                                    {mathsOpen ? 'Unit math ↓' : 'Unit math ↘'}
                                  </button>
                                )}
                                {sectionEditable('focus') && (
                                  <>
                                    <button
                                      type="button"
                                      className="mw-mini-btn"
                                      onClick={() =>
                                        updateContent({
                                          customVolumes: [
                                            ...customVols,
                                            {
                                              id: `vol-${Date.now()}`,
                                              label: 'Custom target',
                                              tag: 'KPI',
                                              kind: 'acq',
                                              value: '10',
                                              hint: 'Target volume or conversion benchmark',
                                            },
                                          ],
                                        })
                                      }
                                    >
                                      <Plus size={11} /> Add metric
                                    </button>
                                    {(hiddenVols.length > 0 || Object.keys(volOverrides).length > 0) && (
                                      <button
                                        type="button"
                                        className="mw-mini-btn"
                                        onClick={() => updateContent({ hiddenVolumes: [], volumeOverrides: {} })}
                                      >
                                        <RotateCcw size={11} /> Reset defaults
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {!sectionEditable('focus') && <VolumesChart vols={allVols} />}
                            {sectionEditable('focus') && (
                              <div className="mw-volumes-grid is-full">
                                {allVols.map(k => (
                                  <div
                                    key={k.id}
                                    className={`mw-vol-card is-${k.kind}`}
                                    title={`${k.label}: ${k.value} · ${k.hint}`}
                                  >
                                    {sectionEditable('focus') ? (
                                      <div className="mw-vol-edit">
                                        <div className="mw-vol-edit-top">
                                          <input
                                            aria-label="Volume metric label"
                                            value={k.label}
                                            onChange={e => {
                                              if (k.isCustom) {
                                                updateContent({
                                                  customVolumes: customVols.map(c =>
                                                    c.id === k.id ? { ...c, label: e.target.value } : c,
                                                  ),
                                                });
                                              } else {
                                                updateContent({
                                                  volumeOverrides: {
                                                    ...volOverrides,
                                                    [k.id]: { ...(volOverrides[k.id] || {}), label: e.target.value },
                                                  },
                                                });
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            aria-label={`Remove ${k.label}`}
                                            onClick={() => {
                                              if (k.isCustom) {
                                                updateContent({ customVolumes: customVols.filter(c => c.id !== k.id) });
                                              } else {
                                                updateContent({ hiddenVolumes: [...hiddenVols, k.id] });
                                              }
                                            }}
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                        <input
                                          className="mw-vol-val-in"
                                          aria-label={`${k.label} value`}
                                          value={k.value}
                                          onChange={e => {
                                            if (k.isCustom) {
                                              updateContent({
                                                customVolumes: customVols.map(c =>
                                                  c.id === k.id ? { ...c, value: e.target.value } : c,
                                                ),
                                              });
                                            } else {
                                              updateContent({
                                                volumeOverrides: {
                                                  ...volOverrides,
                                                  [k.id]: { ...(volOverrides[k.id] || {}), value: e.target.value },
                                                },
                                              });
                                            }
                                          }}
                                        />
                                        <input
                                          className="mw-vol-hint-in"
                                          aria-label={`${k.label} note`}
                                          value={k.hint}
                                          onChange={e => {
                                            if (k.isCustom) {
                                              updateContent({
                                                customVolumes: customVols.map(c =>
                                                  c.id === k.id ? { ...c, hint: e.target.value } : c,
                                                ),
                                              });
                                            } else {
                                              updateContent({
                                                volumeOverrides: {
                                                  ...volOverrides,
                                                  [k.id]: { ...(volOverrides[k.id] || {}), hint: e.target.value },
                                                },
                                              });
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="mw-vol-head">
                                          <small>{k.label}</small>
                                          <span>{k.tag}</span>
                                        </div>
                                        <b>{k.value}</b>
                                        <em>{k.hint}</em>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {sectionEditable('focus') && (
                        <small className="mw-focus-note">
                          <Sparkles size={12} /> Everything in this brief autosaves
                          {autoState === 'saving'
                            ? ' — saving…'
                            : autoState === 'saved'
                              ? ' — saved.'
                              : autoState === 'error'
                                ? ' — last save failed.'
                                : '.'}
                        </small>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* ─── Section 3: AI plan & reasoning (Unified Design System) ─── */}
            {showOnPage('ai') &&
              (form.content?.ai || sectionEditable('ai')) &&
              (() => {
                const ai = form.content?.ai || { splitRationale: '', reasoning: [], risks: [], generatedAt: null };
                const patchAi = (patch: Record<string, any>) =>
                  updateContent({
                    ai: {
                      ...ai,
                      ...patch,
                      generatedAt: ai.generatedAt || new Date().toISOString(),
                    },
                  });
                const reasoningList: Array<{ heading: string; points: string[] }> = Array.isArray(ai.reasoning)
                  ? ai.reasoning
                  : [];
                const risksList: string[] = Array.isArray(ai.risks) ? ai.risks : [];
                const meta = sectionMeta(
                  'ai',
                  'AI plan & reasoning',
                  ai.generatedAt
                    ? `How ${MONTHS[month - 1]} reaches ${lakh(effective)} · ${ai.mode === 'synthesised' ? 'synthesised' : 'AI-generated'} ${new Date(ai.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : `Strategic rationale, stream logic and risk mitigations for ${MONTHS[month - 1]}.`,
                );
                return (
                  <div id="mw-sec-ai" className="mw-section mw-ai-plan">
                    <SectionHead
                      icon={Sparkles}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('ai')}
                      onToggleEdit={() => toggleSection('ai')}
                      onTitleChange={v => patchSectionMeta('ai', { title: v })}
                      onHintChange={v => patchSectionMeta('ai', { hint: v })}
                      onDelete={() => hideSection('ai')}
                      actions={
                        sectionEditable('ai') ? (
                          <>
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={() =>
                                patchAi({
                                  reasoning: [
                                    ...reasoningList,
                                    { heading: 'New pillar', points: ['**Evidence:** Key commercial point'] },
                                  ],
                                })
                              }
                            >
                              <Plus size={12} /> Add reasoning block
                            </button>
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={() =>
                                patchAi({ risks: [...risksList, '**Risk Title:** Concrete studio mitigation'] })
                              }
                            >
                              <Plus size={12} /> Add risk
                            </button>
                          </>
                        ) : undefined
                      }
                    />
                    <div className="mw-ai-unified">
                      <div className="mw-ai-split">
                        {(ai.splitRationale || sectionEditable('ai')) && (
                          <div className="mw-ai-rationale">
                            <div className="mw-ai-card-head">
                              <span className="mw-fu-band-kicker">Stream allocation rationale</span>
                            </div>
                            {sectionEditable('ai') ? (
                              <textarea
                                rows={5}
                                placeholder="- **New clients:** Explain why revenue is weighted across new clients, renewals and reactivation…"
                                value={ai.splitRationale || ''}
                                onChange={e => patchAi({ splitRationale: e.target.value })}
                              />
                            ) : (
                              <RichText text={ai.splitRationale} />
                            )}
                          </div>
                        )}
                      </div>

                      {(reasoningList.length > 0 || sectionEditable('ai')) && (
                        <div className="mw-ai-reasons">
                          {reasoningList.map((sec, i) => (
                            <section key={i}>
                              <h5>
                                <span>{String(i + 1).padStart(2, '0')}</span>
                                {sectionEditable('ai') ? (
                                  <>
                                    <input
                                      aria-label={`Reasoning heading ${i + 1}`}
                                      value={sec.heading}
                                      onChange={e =>
                                        patchAi({
                                          reasoning: reasoningList.map((x, idx) =>
                                            idx === i ? { ...x, heading: e.target.value } : x,
                                          ),
                                        })
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="mw-mini-icon is-danger"
                                      aria-label="Remove reasoning block"
                                      onClick={() =>
                                        patchAi({ reasoning: reasoningList.filter((_, idx) => idx !== i) })
                                      }
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                ) : (
                                  sec.heading
                                )}
                              </h5>
                              {sectionEditable('ai') ? (
                                <div className="mw-list-editor">
                                  {sec.points.map((p, j) => (
                                    <div key={j} className="mw-list-editor-row">
                                      <input
                                        value={p}
                                        placeholder="**Lead:** Commercial evidence…"
                                        onChange={e =>
                                          patchAi({
                                            reasoning: reasoningList.map((x, idx) =>
                                              idx === i
                                                ? {
                                                    ...x,
                                                    points: x.points.map((pt, pj) => (pj === j ? e.target.value : pt)),
                                                  }
                                                : x,
                                            ),
                                          })
                                        }
                                      />
                                      <button
                                        type="button"
                                        aria-label="Remove bullet"
                                        onClick={() =>
                                          patchAi({
                                            reasoning: reasoningList.map((x, idx) =>
                                              idx === i ? { ...x, points: x.points.filter((_, pj) => pj !== j) } : x,
                                            ),
                                          })
                                        }
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="mw-mini-btn"
                                    onClick={() =>
                                      patchAi({
                                        reasoning: reasoningList.map((x, idx) =>
                                          idx === i
                                            ? { ...x, points: [...x.points, '**Point:** Supporting metric'] }
                                            : x,
                                        ),
                                      })
                                    }
                                  >
                                    <Plus size={11} /> Add point
                                  </button>
                                </div>
                              ) : (
                                <ul className="mw-ai-struct-list">
                                  {sec.points.map((p, j) => (
                                    <li key={j}>
                                      <StructuredLine text={p} />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </section>
                          ))}
                        </div>
                      )}

                      {(risksList.length > 0 || sectionEditable('ai')) && (
                        <div className="mw-ai-risks">
                          <div className="mw-ai-card-head">
                            <span className="mw-fu-band-kicker is-risk">Commercial watchpoints &amp; mitigations</span>
                          </div>
                          {sectionEditable('ai') ? (
                            <div className="mw-list-editor">
                              {risksList.map((r, i) => (
                                <div key={i} className="mw-list-editor-row">
                                  <input
                                    value={r}
                                    placeholder="**Risk Title:** Concrete studio mitigation…"
                                    onChange={e =>
                                      patchAi({ risks: risksList.map((x, idx) => (idx === i ? e.target.value : x)) })
                                    }
                                  />
                                  <button
                                    type="button"
                                    aria-label="Remove risk"
                                    onClick={() => patchAi({ risks: risksList.filter((_, idx) => idx !== i) })}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="mw-mini-btn"
                                onClick={() => patchAi({ risks: [...risksList, '**Risk Title:** Mitigation plan'] })}
                              >
                                <Plus size={11} /> Add risk
                              </button>
                            </div>
                          ) : (
                            <div className="mw-ai-risk-grid">
                              {risksList.map((r, i) => (
                                <div key={i} className="mw-ai-risk-card">
                                  <span className="mw-ai-risk-idx">R{i + 1}</span>
                                  <div className="mw-fu-card-copy">
                                    <StructuredLine text={r} leadTone="risk" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {form.actions.length > 0 && (
                        <div className="mw-ai-weeks-wrap">
                          <div className="mw-ai-card-head">
                            <span className="mw-fu-band-kicker">Weekly execution cadence</span>
                            <small>{form.actions.length} scheduled actions</small>
                          </div>
                          <div className="mw-ai-weeks">
                            {[1, 2, 3, 4, 5]
                              .filter(w => form.actions.some(a => a.week === w))
                              .map(w => (
                                <div key={w}>
                                  <h6>Week {w}</h6>
                                  <ul>
                                    {form.actions
                                      .filter(a => a.week === w)
                                      .map((a, i) => (
                                        <li key={i} className={a.done ? 'done' : ''}>
                                          <span>{inline(a.text)}</span>
                                          {a.owner && <em>{a.owner}</em>}
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {econ && mathsOpen && (
              <MathsPanel
                id="mw-maths-panel"
                econ={econ}
                window={plan.economics.window}
                studioId={studio.id}
                studioName={studio.name}
                year={year}
                editable={editable}
                assumptions={plan.economics.assumptions}
                onSaved={onSaved}
                onClose={() => setMathsOpen(false)}
              />
            )}

            {/* ─── Section 4: Offers ─── */}
            {showOnPage('offers') &&
              (() => {
                const meta = sectionMeta(
                  'offers',
                  `Offers · ${selected.length}`,
                  `${lakh(offerRevenue)} expected. Edit all offer details here, build a new offer, or pick from the library.`,
                );
                const mm = String(month).padStart(2, '0');
                const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, '0');
                const openNewOffer = (preset?: Partial<any>) => {
                  setEditing(null);
                  setCreatingOffer({
                    name: '',
                    headline: '',
                    benefit: '',
                    objective: 'acquisition',
                    offer_type: 'percentage',
                    plan_slot: '',
                    audience: 'New clients & qualified leads',
                    excluded_audience: 'Active unlimited members',
                    redemption_conditions:
                      'One offer per client; non-transferable and not stackable with standing perks.',
                    customer_copy: '',
                    cta: 'Book your spot',
                    rationale: '',
                    validity_start: `${year}-${mm}-01`,
                    validity_end: `${year}-${mm}-${lastDay}`,
                    target_purchases: 12,
                    expected_asp: prices?.prices[studio.id]?.['1M'] || 15000,
                    effective_discount: 10,
                    success_metrics: ['Target unit conversions achieved within window'],
                    risks: ['Monitor discount realization and front-desk follow-up'],
                    provenance: { pricing: { product: '1M', discount: 0.1 } },
                    ...preset,
                  });
                };
                return (
                  <div id="mw-sec-offers" className="mw-section">
                    <SectionHead
                      icon={Gift}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('offers')}
                      onToggleEdit={() => toggleSection('offers')}
                      onTitleChange={v => patchSectionMeta('offers', { title: v })}
                      onHintChange={v => patchSectionMeta('offers', { hint: v })}
                      onDelete={() => hideSection('offers')}
                      actions={
                        <>
                          {selected.length > 0 && (
                            <div className="mw-card-cols" role="group" aria-label="Cards per row">
                              <button
                                type="button"
                                aria-pressed={offerColumns === 1}
                                className={offerColumns === 1 ? 'is-on' : ''}
                                onClick={() => setOfferColumns(1)}
                                title="One offer per row — read each card in full"
                              >
                                <Square size={10} />
                                1-up
                              </button>
                              <button
                                type="button"
                                aria-pressed={offerColumns === 2}
                                className={offerColumns === 2 ? 'is-on' : ''}
                                onClick={() => setOfferColumns(2)}
                                title="Two offers per row — scan the month"
                              >
                                <Columns2 size={10} />
                                2-up
                              </button>
                            </div>
                          )}
                          {selected.length > 0 && (
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={toggleAllOffers}
                              title={allOffersExpanded ? 'Collapse every offer card' : 'Expand every offer card'}
                            >
                              {allOffersExpanded ? <ChevronsDownUp size={12} /> : <ChevronsUpDown size={12} />}
                              {allOffersExpanded ? 'Collapse all' : 'Expand all'}
                            </button>
                          )}
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => setLibraryOpen(true)}
                            title="Browse every offer this studio can run, and add or swap them in"
                          >
                            <LayoutGrid size={12} /> Offer library
                            <em>{alternates.length}</em>
                          </button>
                          {(sectionEditable('offers') || offersEditable) && (
                            <button type="button" className="mw-mini-btn is-primary" onClick={() => openNewOffer()}>
                              <Plus size={12} /> New offer
                            </button>
                          )}
                        </>
                      }
                    />

                    {creatingOffer && (
                      <OfferEditor
                        mode="create"
                        offer={creatingOffer}
                        studioId={studio.id}
                        prices={prices}
                        solo={solo}
                        others={others}
                        busy={busy}
                        onCancel={() => setCreatingOffer(null)}
                        onSave={async edit => {
                          if (await offerChange({ op: 'create', edit }, `“${edit.name}” created and added`)) {
                            setCreatingOffer(null);
                          }
                        }}
                      />
                    )}

                    {aiReady && (
                      <OfferCopilot
                        state={copilot}
                        steer={steer}
                        setSteer={setSteer}
                        busy={busy}
                        onAsk={askCopilot}
                        onApply={applyProposals}
                        onClose={() => setCopilot(null)}
                        current={selected}
                      />
                    )}
                    {selected.length ? (
                      (() => {
                        const activeGroups = groups.filter(g => g.offers.length);
                        const orderedOffers = activeGroups.flatMap(g =>
                          g.offers.map(o => ({ offer: o, stream: g.label })),
                        );
                        // One photograph per card, so no two cards in a month share a hero image.
                        const photoById = assignMonthPhotos(
                          orderedOffers.map(({ offer }) => ({ offer, slot: slotOf(offer.id) })),
                        );
                        // Month totals let each card's bars show its share of the plan.
                        const monthUnitsTotal = orderedOffers.reduce(
                          (sum, { offer }) => sum + (forecastRevenue(offer) > 0 ? n(offer.target_purchases) || 0 : 0),
                          0,
                        );
                        // In the 2-up grid each row is a pair: expanding one card expands its neighbour so
                        // the two columns keep the same height and the shared subgrid rows stay aligned.
                        // Pairs restart at every revenue stream band, so they are read off the groups
                        // rather than from the card's running number.
                        const pairOf = new Map<number, number>();
                        activeGroups.forEach(group => {
                          for (let i = 0; i + 1 < group.offers.length; i += 2) {
                            const a = group.offers[i],
                              b = group.offers[i + 1];
                            pairOf.set(a.id, b.id);
                            pairOf.set(b.id, a.id);
                          }
                        });
                        const toggleCardPair = (offerId: number) => {
                          // In a one-up list the neighbour is a whole card away — do not open it.
                          const partnerId = offerColumns === 2 ? pairOf.get(offerId) : undefined;
                          const ids = partnerId ? [offerId, partnerId] : [offerId];
                          const anyClosed = ids.some(id => !expandedOffers.includes(id));
                          updateContent({
                            expandedOffers: anyClosed
                              ? Array.from(new Set([...expandedOffers, ...ids]))
                              : expandedOffers.filter(id => !ids.includes(id)),
                          });
                        };

                        const renderItem = (o: any, no: number, stream?: string) =>
                          editing === o.id ? (
                            <OfferEditor
                              key={o.id}
                              mode="edit"
                              offer={{ ...o, plan_slot: slotOf(o.id) ?? o.plan_slot ?? '' }}
                              studioId={studio.id}
                              prices={prices}
                              solo={solo}
                              others={others}
                              busy={busy}
                              onCancel={() => setEditing(null)}
                              onDelete={
                                sectionEditable('offers')
                                  ? async () => {
                                      if (await offerChange({ op: 'delete', offerId: o.id }, `“${o.name}” deleted`)) {
                                        setEditing(null);
                                      }
                                    }
                                  : undefined
                              }
                              onSave={async edit => {
                                if (await offerChange({ op: 'update', offerId: o.id, edit }, `“${edit.name}” updated`))
                                  setEditing(null);
                              }}
                            />
                          ) : (
                            <OfferCard
                              key={o.id}
                              no={no}
                              offer={o}
                              streamLabel={stream}
                              list={
                                prices?.prices[studio.id]?.[o.provenance?.pricing?.product] ??
                                (o.provenance?.pricing?.customListPrice
                                  ? n(o.provenance.pricing.customListPrice)
                                  : null)
                              }
                              productLabel={prices?.keys[o.provenance?.pricing?.product]}
                              slot={slotOf(o.id)}
                              editable={editable}
                              canSwap={aiReady}
                              approved={o.approval_status === 'approved'}
                              canApprove={canApproveOffers}
                              busy={busy}
                              onApprove={(next: boolean) => offerApproval(o, next)}
                              onEdit={() => {
                                setCreatingOffer(null);
                                setEditing(o.id);
                              }}
                              onDuplicate={() =>
                                openNewOffer({
                                  ...o,
                                  name: `${o.name} (Copy)`,
                                  plan_slot: '',
                                })
                              }
                              onRemove={() =>
                                offerChange({ op: 'remove', offerId: o.id }, `“${o.name}” removed from month`)
                              }
                              onDelete={() => offerChange({ op: 'delete', offerId: o.id }, `“${o.name}” deleted`)}
                              onSwap={() => regenerateOffer(o)}
                              regenerating={regenerating === o.id}
                              monthTarget={effective}
                              monthUnits={monthUnitsTotal}
                              photo={photoById.get(o.id)}
                              collapsed={!expandedOffers.includes(o.id)}
                              onToggleCollapse={() => toggleCardPair(o.id)}
                            />
                          );

                        return (
                          <div className="mw-offers-board">
                            {effective > 0 &&
                              selected.length > 0 &&
                              (() => {
                                const ratio = offerRevenue / effective;
                                const tone = ratio > 1.1 ? 'over' : ratio < 0.9 ? 'under' : 'ok';
                                const diff = Math.abs(offerRevenue - effective);
                                return (
                                  <div className={`mw-rev-check is-${tone}`} role="status">
                                    <div className="mw-rev-check-text">
                                      <strong>
                                        {tone === 'over'
                                          ? 'Offer plan exceeds target'
                                          : tone === 'under'
                                            ? 'Offer plan is below target'
                                            : 'Offer plan is in line with target'}
                                      </strong>
                                      <span>
                                        {lakh(offerRevenue)} forecast vs {lakh(effective)} target ·{' '}
                                        {tone === 'ok'
                                          ? `${Math.round(ratio * 100)}% covered`
                                          : tone === 'over'
                                            ? `${lakh(diff)} (${Math.round((ratio - 1) * 100)}%) over — check unit assumptions or trim an offer`
                                            : `${lakh(diff)} (${Math.round((1 - ratio) * 100)}%) short — add or raise offers`}
                                      </span>
                                    </div>
                                    <div className="mw-rev-check-meter" aria-hidden="true">
                                      <i style={{ width: `${Math.min(100, (ratio / 1.25) * 100)}%` }} />
                                      <b style={{ left: `${100 / 1.25}%` }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            <div className={`mw-offer-list ${offerColumns === 2 ? 'is-two-up' : 'is-one-up'}`}>
                              {activeGroups.flatMap(g => {
                                const total = g.offers.reduce((sum, o) => sum + forecastRevenue(o), 0);
                                return [
                                  <div key={`divider-${g.label}`} className={`mp-offer-divider stream-${g.label}`}>
                                    <span>{g.label}</span>
                                    <em>
                                      {g.offers.length} {g.offers.length === 1 ? 'offer' : 'offers'}
                                    </em>
                                    <i aria-hidden="true" />
                                    <b>{lakh(total)}</b>
                                  </div>,
                                  ...g.offers.map(o =>
                                    renderItem(o, orderedOffers.findIndex(x => x.offer.id === o.id) + 1, g.label),
                                  ),
                                ];
                              })}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="mw-offer-empty">
                        No offers picked yet — click “New offer” above, or open the offer library and add the ones that
                        fit this month.
                      </p>
                    )}
                  </div>
                );
              })()}

            {/* ─── Section 5: Offer coverage by revenue stream ─── */}
            {showOnPage('coverage') &&
              (gapRows.length > 0 || sectionEditable('coverage')) &&
              (() => {
                const meta = sectionMeta(
                  'coverage',
                  'Offer coverage by revenue stream',
                  'Compares selected offer forecasts with each allocated target. Approval requires every stream to be covered.',
                );
                const covNotes: Record<string, string> = form.content?.coverageNotes || {};
                const covered = gapRows.filter(r => r.gap <= 1).length;
                const short = gapRows.reduce((sum, r) => sum + r.gap, 0);
                return (
                  <div id="mw-sec-coverage" className="mw-section mw-gapplan">
                    <SectionHead
                      icon={Target}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('coverage')}
                      onToggleEdit={() => toggleSection('coverage')}
                      onTitleChange={v => patchSectionMeta('coverage', { title: v })}
                      onHintChange={v => patchSectionMeta('coverage', { hint: v })}
                      onDelete={() => hideSection('coverage')}
                    />
                    {/* The reading, before the detail: how many streams are carried, and what is left. */}
                    <div className={`mw-gp-summary${short > 1 ? ' is-short' : ' is-covered'}`}>
                      <span>
                        <b>
                          {covered}/{gapRows.length}
                        </b>{' '}
                        streams covered
                      </span>
                      <span className="mw-gp-summary-gap">
                        {short > 1 ? `${lakh(short)} still to find` : 'every stream carries its target'}
                      </span>
                    </div>
                    <div className="mw-gp-cols" aria-hidden="true">
                      <span>Revenue stream</span>
                      <span>Forecast · target</span>
                      <span>Share of target</span>
                      <span>Coverage</span>
                    </div>
                    <div className="mw-gp-rows">
                      {gapRows.map(r => {
                        const ratio = r.target ? r.offer / r.target : 0;
                        const state = r.gap > 0 ? 'short' : ratio > 1.15 ? 'over' : 'ok';
                        const scale = Math.max(r.target, r.offer, 1);
                        const note = covNotes[r.label] || '';
                        return (
                          <div key={r.label} className={`mw-gp-row ${state}`}>
                            <div className="mw-gp-line">
                              <span className="mw-gp-name">
                                <i aria-hidden="true" />
                                {r.label}
                              </span>
                              <span className="mw-gp-vals">
                                <b>{lakh(r.offer)}</b>
                                <em>of {lakh(r.target)}</em>
                              </span>
                              <span className="mw-gp-bar" aria-hidden="true">
                                <i style={{ width: `${Math.min(100, (r.offer / scale) * 100)}%` }} />
                                <b style={{ left: `${Math.min(100, (r.target / scale) * 100)}%` }} title="Target" />
                              </span>
                              <span className={`mw-gp-state ${state}`}>
                                {Math.round(ratio * 100)}%
                                {state === 'short' ? (
                                  <em>{lakh(r.gap)} short</em>
                                ) : state === 'over' ? (
                                  <em>{lakh(r.offer - r.target)} over</em>
                                ) : (
                                  <em>covered</em>
                                )}
                              </span>
                            </div>
                            {(r.gap > 0 || note || sectionEditable('coverage')) && (
                              <div className="mw-gp-detail">
                                {r.gap > 0 && (
                                  <div className="mw-gp-plan">
                                    {r.picks.map(o => (
                                      <span key={o.id} className="mw-gp-pick">
                                        {o.name}
                                        <b>+{lakh(forecastRevenue(o))}</b>
                                      </span>
                                    ))}
                                    {r.left > 0 && (
                                      <p>
                                        {r.picks.length ? 'Still ' : ''}
                                        <b>{lakh(r.left)}</b> to find.{' '}
                                        {r.lead && r.extra
                                          ? `Sell ${number(r.extra)} more of “${r.lead.name}” (${money(n(r.lead.expected_asp), true)} each), or add a new ${r.label.toLowerCase()} offer.`
                                          : 'No offer carries this stream yet — create or add one above.'}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {(sectionEditable('coverage') || note) && (
                                  <div className="mw-gp-note">
                                    {sectionEditable('coverage') ? (
                                      <input
                                        placeholder={`Plan note for ${r.label.toLowerCase()} coverage…`}
                                        value={note}
                                        onChange={e =>
                                          updateContent({ coverageNotes: { ...covNotes, [r.label]: e.target.value } })
                                        }
                                      />
                                    ) : (
                                      <small>{note}</small>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {offersEditable && (gapRows.some(r => r.gap > 0) || offerRevenue < effective) && (
                      <Button icon={<Target size={15} />} variant="dark" disabled={busy} onClick={coverTarget}>
                        Cover full target
                      </Button>
                    )}
                    {offersEditable && gapRows.some(r => r.picks.length) && (
                      <Button
                        icon={<Plus size={15} />}
                        disabled={busy}
                        onClick={() => addOffers(gapRows.flatMap(r => r.picks.map((o: any) => o.id)))}
                      >
                        Add {gapRows.reduce((sum, r) => sum + r.picks.length, 0)} suggested offers
                      </Button>
                    )}
                  </div>
                );
              })()}

            {/* ─── Section 6: The run of the month ─── */}
            {showOnPage('actions') &&
              (() => {
                const meta = sectionMeta(
                  'actions',
                  'The run of the month',
                  'Every step, week by week — tick them off as the month moves.',
                );
                return (
                  <div id="mw-sec-actions" className="mw-section mw-actions">
                    <SectionHead
                      icon={ListChecks}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('actions')}
                      onToggleEdit={() => toggleSection('actions')}
                      onTitleChange={v => patchSectionMeta('actions', { title: v })}
                      onHintChange={v => patchSectionMeta('actions', { hint: v })}
                      onDelete={() => hideSection('actions')}
                      actions={
                        sectionEditable('actions') ? (
                          <>
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={() =>
                                set({ actions: [...form.actions, { text: '', owner: '', week: 1, done: false }] })
                              }
                            >
                              <Plus size={12} /> Add action
                            </button>
                            {form.actions.length === 0 && (
                              <button
                                type="button"
                                className="mw-mini-btn"
                                onClick={() =>
                                  set({
                                    actions: [
                                      {
                                        text: 'Brief creative & submit WhatsApp templates for approval',
                                        owner: 'Marketing',
                                        week: 1,
                                        done: false,
                                      },
                                      {
                                        text: 'Launch primary offers & brief front-desk team on scripts',
                                        owner: 'Studio Manager',
                                        week: 1,
                                        done: false,
                                      },
                                      {
                                        text: 'Mid-month renewal & trial conversion check-in',
                                        owner: 'Sales Lead',
                                        week: 2,
                                        done: false,
                                      },
                                      {
                                        text: '48-hour closing reminder broadcast & lapsed follow-up calls',
                                        owner: 'Studio Manager',
                                        week: 4,
                                        done: false,
                                      },
                                    ],
                                  })
                                }
                              >
                                <Sparkles size={11} /> Starter checklist
                              </button>
                            )}
                          </>
                        ) : undefined
                      }
                    />
                    {(() => {
                      const PHASES = [
                        {
                          week: 1,
                          label: 'Set up & launch',
                          hint: 'Creatives approved, offers live, front desk briefed',
                        },
                        { week: 2, label: 'Push & convert', hint: 'Trial follow-ups and the first renewal calls' },
                        { week: 3, label: 'Mid-month review', hint: 'Read the numbers, fix what is not converting' },
                        { week: 4, label: 'Close & renew', hint: 'Final reminders, renewals and hand-over' },
                        { week: 5, label: 'Overflow', hint: 'Anything that slipped' },
                      ];
                      const total = form.actions.length;
                      const done = form.actions.filter(a => a.done).length;
                      // The rail also carries the calendar span each week covers, so the track
                      // reads as a dated timeline rather than five abstract buckets.
                      const lastDay = new Date(year, month, 0).getDate();
                      const span = (week: number) => {
                        const from = (week - 1) * 7 + 1;
                        const to = week === 5 ? lastDay : Math.min(week * 7, lastDay);
                        const pad = (n: number) => String(n).padStart(2, '0');
                        return from > lastDay ? '' : `${pad(from)}–${pad(to)}`;
                      };
                      const phases = PHASES.map(phase => ({
                        ...phase,
                        range: span(phase.week),
                        items: form.actions
                          .map((action, index) => ({ action, index }))
                          .filter(entry => entry.action.week === phase.week),
                      })).filter(phase => phase.items.length > 0 || (sectionEditable('actions') && phase.week < 5));
                      const patchAt = (i: number, patch: Partial<ActionItem>) =>
                        set({ actions: form.actions.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

                      return (
                        <div className="mp-run">
                          {/* The plan as an infographic: four figures, a completion metre and a
                              week ribbon across the top, then the work itself underneath. */}
                          <header className="mp-run-head">
                            <div className="mp-run-summary">
                              <span className="mp-run-kicker">
                                Action plan · {MONTHS[month - 1]} {year}
                              </span>
                              <strong>{total ? `${done} of ${total} steps done` : 'The month, week by week'}</strong>
                            </div>
                            <div className="mp-run-figures">
                              <span>
                                <b>{total}</b>
                                <small>steps</small>
                              </span>
                              <span>
                                <b>{phases.filter(phase => phase.items.length > 0).length}</b>
                                <small>weeks in play</small>
                              </span>
                              <span>
                                <b>{new Set(form.actions.map(a => a.owner).filter(Boolean)).size}</b>
                                <small>owners</small>
                              </span>
                              <span>
                                <b>{dates.length}</b>
                                <small>key dates</small>
                              </span>
                            </div>
                            <div className="mp-run-meter" aria-hidden="true">
                              <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                              <em>{total ? `${Math.round((done / total) * 100)}%` : '0%'}</em>
                            </div>
                          </header>

                          {/* One segment per week, filled to the share of that week's steps already done. */}
                          <ol className="mp-ribbon" aria-label={`${MONTHS[month - 1]} week by week`}>
                            {PHASES.map(phase => {
                              const weekItems = form.actions.filter(a => a.week === phase.week);
                              const finished = weekItems.filter(a => a.done).length;
                              const fill = weekItems.length ? (finished / weekItems.length) * 100 : 0;
                              return (
                                <li
                                  key={phase.week}
                                  className={weekItems.length ? 'has-work' : 'is-empty'}
                                  style={{ '--fill': `${fill}%` } as React.CSSProperties}
                                  title={`${phase.label} — ${weekItems.length} steps, ${finished} done`}
                                >
                                  <span>W{phase.week}</span>
                                  <em>{span(phase.week) || '—'}</em>
                                  <i aria-hidden="true">
                                    <b />
                                  </i>
                                  <small>{weekItems.length ? `${finished}/${weekItems.length}` : '—'}</small>
                                </li>
                              );
                            })}
                          </ol>

                          {dates.length > 0 && (
                            <div className="mp-run-calendar">
                              <span className="mp-run-calendar-label">Dates that move the month</span>
                              <div className="mp-run-dates">
                                {dates.slice(0, 5).map(d => (
                                  <span key={`${d.day}-${d.name}`} className={`kd-${d.kind}`}>
                                    <b>{formatKeyDate(d)}</b>
                                    {d.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {!total && (
                            <p className="mp-run-empty">
                              The run of the month is still blank. Add the launch tasks — creatives briefed, WhatsApp
                              template approved, emails scheduled, tent cards placed — and the week-2 and week-4
                              performance checks.
                            </p>
                          )}

                          <ol className="mp-track">
                            {phases.map((phase, gi) => {
                              const phaseDone = phase.items.filter(e => e.action.done).length;
                              return (
                                <li
                                  key={phase.week}
                                  className={`mp-phase${phase.items.length ? ' has-steps' : ' is-empty'}`}
                                  style={{ '--i': gi } as React.CSSProperties}
                                >
                                  <div className="mp-phase-rail" aria-hidden="true">
                                    <span>
                                      <i>W</i>
                                      {String(phase.week).padStart(2, '0')}
                                    </span>
                                    {phase.range && <em>{phase.range}</em>}
                                  </div>
                                  <div className="mp-phase-body">
                                    <header className="mp-phase-head">
                                      <div>
                                        <h5>{phase.label}</h5>
                                        <p>{phase.hint}</p>
                                      </div>
                                      <span
                                        className={`mp-phase-count${phaseDone === phase.items.length && phase.items.length ? ' is-done' : ''}`}
                                      >
                                        {phase.items.length ? `${phaseDone}/${phase.items.length}` : '—'}
                                      </span>
                                    </header>

                                    {phase.items.length > 0 && (
                                      <div className="mp-steps">
                                        {phase.items.map(({ action, index }) => (
                                          <div key={index} className={`mp-step${action.done ? ' is-done' : ''}`}>
                                            <label className="mp-step-check">
                                              <input
                                                type="checkbox"
                                                checked={action.done}
                                                aria-label={`Mark “${action.text || 'step'}” done`}
                                                onChange={e => patchAt(index, { done: e.target.checked })}
                                                {...fieldProps}
                                              />
                                              <i aria-hidden="true">
                                                <Check size={11} />
                                              </i>
                                            </label>
                                            <div className="mp-step-body">
                                              <input
                                                className="mp-step-text"
                                                value={action.text}
                                                placeholder="What happens"
                                                aria-label={`Step ${index + 1}`}
                                                onChange={e => patchAt(index, { text: e.target.value })}
                                                {...fieldProps}
                                              />
                                              <div className="mp-step-meta">
                                                <input
                                                  className="mp-step-owner"
                                                  value={action.owner}
                                                  placeholder="Owner"
                                                  aria-label={`Owner for step ${index + 1}`}
                                                  onChange={e => patchAt(index, { owner: e.target.value })}
                                                  {...fieldProps}
                                                />
                                                <select
                                                  value={action.week}
                                                  aria-label={`Week for step ${index + 1}`}
                                                  onChange={e => patchAt(index, { week: n(e.target.value) })}
                                                  {...fieldProps}
                                                >
                                                  {[1, 2, 3, 4, 5].map(w => (
                                                    <option key={w} value={w}>
                                                      Week {w}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>
                                            {sectionEditable('actions') && (
                                              <button
                                                type="button"
                                                className="mp-step-del"
                                                aria-label="Remove step"
                                                onClick={() =>
                                                  set({ actions: form.actions.filter((_, j) => j !== index) })
                                                }
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {sectionEditable('actions') && (
                                      <button
                                        type="button"
                                        className="mp-phase-add"
                                        onClick={() =>
                                          set({
                                            actions: [
                                              ...form.actions,
                                              { text: '', owner: '', week: phase.week, done: false },
                                            ],
                                          })
                                        }
                                      >
                                        <Plus size={11} /> Add a step to week {phase.week}
                                      </button>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      );
                    })()}
                    <label className="mw-notes">
                      <span>Notes</span>
                      <textarea
                        rows={3}
                        value={form.notes}
                        onChange={e => set({ notes: e.target.value })}
                        {...fieldProps}
                      />
                    </label>
                    {sectionEditable('actions') && (
                      <label className="mw-final">
                        <input
                          type="checkbox"
                          checked={form.status === 'final'}
                          onChange={e => set({ status: e.target.checked ? 'final' : 'draft' })}
                        />
                        Mark this month’s plan as final
                      </label>
                    )}
                  </div>
                );
              })()}

            {/* ─── Section 7: Activations ─── */}
            {showOnPage('acts') &&
              (() => {
                const meta = sectionMeta('acts', 'Activations', 'Challenge, event, partner and retention play.');
                const hidden: string[] = Array.isArray(form.content?.hiddenActivations)
                  ? form.content.hiddenActivations
                  : [];
                const extras: { id: string; label: string; title: string; text: string }[] = Array.isArray(
                  form.content?.extraActivations,
                )
                  ? form.content.extraActivations
                  : [];
                const fixed = [
                  {
                    key: 'challenge',
                    icon: Trophy,
                    label: 'Challenge',
                    tone: 'purple',
                    ...activation(
                      'challenge',
                      challenge?.Activation || base.challenge[0],
                      challenge?.Mechanics || base.challenge[1],
                    ),
                  },
                  {
                    key: 'event',
                    icon: PartyPopper,
                    label: 'Event',
                    tone: 'coral',
                    ...activation('event', event?.Activation || base.event[0], event?.Mechanics || base.event[1]),
                  },
                  {
                    key: 'partner',
                    icon: Handshake,
                    label: 'Partnership',
                    tone: 'gold',
                    ...activation('partner', base.partner[0], base.partner[1]),
                  },
                  {
                    key: 'retention',
                    icon: HeartHandshake,
                    label: 'Retention',
                    tone: 'green',
                    ...activation('retention', 'Members', base.retention),
                  },
                ].filter(a => !hidden.includes(a.key));
                const setExtras = (next: typeof extras) => updateContent({ extraActivations: next });
                const defaultPrimaryKpi = local[0]?.['Primary KPI'] ?? base.kpi;
                const kpiList: string[] = Array.isArray(form.content?.kpis)
                  ? form.content.kpis
                  : [form.content?.kpi ?? defaultPrimaryKpi].filter(Boolean);
                const setKpis = (next: string[]) => updateContent({ kpis: next, kpi: next[0] || '' });

                return (
                  <div id="mw-sec-acts" className="mw-section">
                    <SectionHead
                      icon={PartyPopper}
                      title={meta.title}
                      hint={meta.hint}
                      editable={editable}
                      canEdit={editable}
                      editOn={sectionEditable('acts')}
                      onToggleEdit={() => toggleSection('acts')}
                      onTitleChange={v => patchSectionMeta('acts', { title: v })}
                      onHintChange={v => patchSectionMeta('acts', { hint: v })}
                      onDelete={() => hideSection('acts')}
                      actions={
                        sectionEditable('acts') ? (
                          <>
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={() =>
                                setExtras([
                                  ...extras,
                                  { id: `x${Date.now()}`, label: 'Activation', title: '', text: '' },
                                ])
                              }
                            >
                              <Plus size={12} /> Add activation
                            </button>
                            {hidden.length > 0 && (
                              <button
                                type="button"
                                className="mw-mini-btn"
                                onClick={() => updateContent({ hiddenActivations: [] })}
                              >
                                <RotateCcw size={11} /> Restore {hidden.length}
                              </button>
                            )}
                          </>
                        ) : undefined
                      }
                    />
                    <div className="mw-acts">
                      {fixed.map(a => (
                        <Act
                          key={a.key}
                          icon={a.icon}
                          label={a.label}
                          tone={a.tone}
                          title={a.title}
                          text={a.text}
                          editable={editable}
                          onChange={(value: any) =>
                            updateContent({ activations: { ...activationEdits, [a.key]: value } })
                          }
                          onRemove={() => updateContent({ hiddenActivations: [...hidden, a.key] })}
                        />
                      ))}
                      {extras.map(x => (
                        <Act
                          key={x.id}
                          icon={Lightbulb}
                          label={x.label || 'Activation'}
                          labelEditable
                          tone="purple"
                          title={x.title}
                          text={x.text}
                          editable={editable}
                          onChange={(value: any) =>
                            setExtras(extras.map(e => (e.id === x.id ? { ...e, ...value } : e)))
                          }
                          onRemove={() => setExtras(extras.filter(e => e.id !== x.id))}
                        />
                      ))}
                      {!fixed.length && !extras.length && (
                        <p className="mw-action-empty">No activations planned for this month.</p>
                      )}
                    </div>
                    <div className="mw-acts-kpis">
                      <span className="mw-fu-label">Activation KPIs</span>
                      {sectionEditable('acts') ? (
                        <div className="mw-list-editor">
                          {kpiList.map((k, idx) => (
                            <div key={idx} className="mw-list-editor-row">
                              <input
                                aria-label={`Activation KPI ${idx + 1}`}
                                value={k}
                                placeholder="KPI target…"
                                onChange={e => setKpis(kpiList.map((x, j) => (j === idx ? e.target.value : x)))}
                              />
                              <button
                                type="button"
                                aria-label="Remove KPI"
                                onClick={() => setKpis(kpiList.filter((_, j) => j !== idx))}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button type="button" className="mw-mini-btn" onClick={() => setKpis([...kpiList, ''])}>
                            <Plus size={11} /> Add KPI
                          </button>
                        </div>
                      ) : (
                        <div className="mw-kpi-tags">
                          {kpiList.map((k, idx) => (
                            <span key={idx} className="mw-kpi-pill">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* ─── Section 8: Marketing & collaterals ─── */}
            {showOnPage('collaterals') && (
              <MarketingCollaterals
                id="mw-sec-collaterals"
                offers={selected}
                studioName={studio.name}
                city={studio.city || (['Kenkere House', 'Pop-up'].includes(studio.name) ? 'Bengaluru' : 'Mumbai')}
                year={year}
                month={month}
                theme={form.theme}
                hook={(form.strategy || '')
                  .split('\n')
                  .find((l: string) => l.startsWith('Moment:'))
                  ?.slice(8)}
                editable={editable}
                collaterals={form.content?.collaterals}
                onChangeCollaterals={next => updateContent({ collaterals: next })}
                onDeleteSection={() => hideSection('collaterals')}
              />
            )}

            {/* ─── User-Added Custom Sections ─── */}
            {page !== 'execution'
              ? null
              : customSections.map(cs => (
                  <div key={cs.id} id={`mw-sec-${cs.id}`} className="mw-section mw-custom-section">
                    <SectionHead
                      icon={FileText}
                      title={cs.title}
                      hint={cs.hint}
                      editable={editable}
                      onTitleChange={v => updateCustomSection(cs.id, { title: v })}
                      onHintChange={v => updateCustomSection(cs.id, { hint: v })}
                      onDelete={() => removeCustomSection(cs.id)}
                      actions={
                        editable ? (
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() =>
                              updateCustomSection(cs.id, {
                                items: [
                                  ...cs.items,
                                  {
                                    id: `item-${Date.now()}`,
                                    label: 'Item',
                                    value: 'New entry',
                                    detail: 'Details or owner',
                                  },
                                ],
                              })
                            }
                          >
                            <Plus size={12} /> Add item
                          </button>
                        ) : undefined
                      }
                    />
                    {(editable || cs.body) && (
                      <div className="mw-custom-body">
                        {editable ? (
                          <textarea
                            rows={3}
                            placeholder="Add section notes, bullet points (- item) or context…"
                            value={cs.body}
                            onChange={e => updateCustomSection(cs.id, { body: e.target.value })}
                          />
                        ) : (
                          <RichText text={cs.body} />
                        )}
                      </div>
                    )}
                    {cs.items.length > 0 && (
                      <div className="mw-custom-grid">
                        {cs.items.map(it => (
                          <div key={it.id} className="mw-custom-card">
                            {editable ? (
                              <>
                                <div className="mw-custom-card-top">
                                  <input
                                    aria-label="Item label"
                                    placeholder="Category / label"
                                    value={it.label}
                                    onChange={e =>
                                      updateCustomSection(cs.id, {
                                        items: cs.items.map(x =>
                                          x.id === it.id ? { ...x, label: e.target.value } : x,
                                        ),
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    aria-label="Remove item"
                                    onClick={() =>
                                      updateCustomSection(cs.id, {
                                        items: cs.items.filter(x => x.id !== it.id),
                                      })
                                    }
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <input
                                  className="mw-custom-card-title"
                                  aria-label="Item headline"
                                  placeholder="Headline or metric"
                                  value={it.value}
                                  onChange={e =>
                                    updateCustomSection(cs.id, {
                                      items: cs.items.map(x => (x.id === it.id ? { ...x, value: e.target.value } : x)),
                                    })
                                  }
                                />
                                <textarea
                                  rows={2}
                                  aria-label="Item details"
                                  placeholder="Supporting details, owner or timeline"
                                  value={it.detail}
                                  onChange={e =>
                                    updateCustomSection(cs.id, {
                                      items: cs.items.map(x => (x.id === it.id ? { ...x, detail: e.target.value } : x)),
                                    })
                                  }
                                />
                              </>
                            ) : (
                              <>
                                <small>{it.label}</small>
                                <strong>{it.value}</strong>
                                {it.detail && <p>{it.detail}</p>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

            {editable && page === 'execution' && (
              <div className="mw-add-section-bar">
                <button type="button" className="mw-add-section-btn" onClick={addCustomSection}>
                  <Plus size={15} />
                  <span>Add new section to {MONTHS[month - 1]}</span>
                </button>
              </div>
            )}

            <nav className="mw-page-foot" aria-label="Month pages">
              {prevTab ? (
                <button type="button" onClick={() => setPage(prevTab.id)}>
                  <ChevronLeft size={14} />
                  <span>
                    <small>Back to</small>
                    {prevTab.label}
                  </span>
                </button>
              ) : (
                <span className="mw-page-foot-gap" />
              )}
              {nextTab && (
                <button type="button" className="is-next" onClick={() => setPage(nextTab.id)}>
                  <span>
                    <small>Next</small>
                    {nextTab.label}
                  </span>
                  <ChevronRight size={14} />
                </button>
              )}
            </nav>
          </main>
        </div>

        {libraryOpen && (
          <div className="mp-drawer-scrim" onClick={() => setLibraryOpen(false)} role="presentation">
            <aside
              className="mp-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Offer library"
              onClick={e => e.stopPropagation()}
            >
              <header className="mp-drawer-head">
                <div
                  className="mp-drawer-photo"
                  style={{
                    backgroundImage: `url(${heroPhoto(5).url})`,
                    backgroundPosition: heroPhoto(5).pos,
                  }}
                  aria-hidden="true"
                />
                <div className="mp-drawer-veil" aria-hidden="true" />
                <div className="mp-drawer-title">
                  <span className="mp-drawer-kicker">Offer library · {alternates.length} available</span>
                  <h3>Everything else we could run</h3>
                  <p>{studio.name}’s other offers, with this month’s first. Add one, or swap it in for a card.</p>
                </div>
                <button
                  type="button"
                  className="mp-drawer-close"
                  aria-label="Close offer library"
                  onClick={() => setLibraryOpen(false)}
                >
                  <X size={17} />
                </button>
              </header>

              <div className="mp-drawer-tools">
                <div className="mp-drawer-search">
                  <Search size={14} />
                  <input
                    value={altQuery}
                    onChange={e => setAltQuery(e.target.value)}
                    placeholder="Search the library…"
                    aria-label="Search offer library"
                  />
                  {altQuery && (
                    <button type="button" onClick={() => setAltQuery('')} aria-label="Clear library search">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="mp-drawer-scopes">
                  {(
                    [
                      ['all', 'All'],
                      ['newcomer', 'Newcomer'],
                      ['lapsed', 'Winback'],
                      ['renewal', 'Renewal'],
                    ] as Array<[typeof altScope, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={altScope === id ? 'is-on' : ''}
                      onClick={() => setAltScope(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mp-drawer-body">
                {alternates.length ? (
                  altGroups.length ? (
                    altGroups.map(([group, list]) => (
                      <section key={group} className="mp-lib-group">
                        <h5>
                          {group} <em>{list.length}</em>
                        </h5>
                        {list.map((o, idx) => {
                          const approved = o.approval_status === 'approved';
                          const open = openAlt === o.id;
                          const photo = pickOfferCardPhoto(o, o.plan_slot, idx + 1);
                          const slotText = o.plan_slot
                            ? o.plan_slot === 'lapsed'
                              ? 'Winback'
                              : titleCase(o.plan_slot)
                            : 'Any audience';
                          return (
                            <div key={o.id} className={`mp-lib-row${open ? ' is-open' : ''}`}>
                              <button
                                type="button"
                                className="mp-lib-main"
                                aria-expanded={open}
                                onClick={() => setOpenAlt(open ? null : o.id)}
                              >
                                <span
                                  className="mp-lib-thumb"
                                  style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
                                  aria-hidden="true"
                                />
                                <span className="mp-lib-copy">
                                  <span className="mp-lib-slot">
                                    {slotText}
                                    {approved && <b>Approved</b>}
                                  </span>
                                  <strong>{o.name}</strong>
                                  <em>{o.benefit || o.headline || titleCase(o.offer_type)}</em>
                                </span>
                                <span className="mp-lib-side">
                                  <b>{lakh(n(o.expected_revenue))}</b>
                                  <ChevronDown size={14} className={open ? 'is-flipped' : undefined} />
                                </span>
                              </button>
                              {open && (
                                <div className="mp-lib-detail">
                                  {(o.rationale || o.customer_copy) && (
                                    <p>
                                      {String(o.rationale || o.customer_copy)
                                        .split('\n')[0]
                                        .replace(/^Why: /, '')}
                                    </p>
                                  )}
                                  <dl>
                                    <div>
                                      <dt>Audience</dt>
                                      <dd>{o.audience || '—'}</dd>
                                    </div>
                                    <div>
                                      <dt>Value</dt>
                                      <dd>
                                        {Number(o.effective_discount)
                                          ? `${Number(o.effective_discount).toFixed(0)}% effective`
                                          : 'At list'}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt>Avg ticket</dt>
                                      <dd>{o.expected_asp ? lakh(n(o.expected_asp)) : '—'}</dd>
                                    </div>
                                    <div>
                                      <dt>Buyers</dt>
                                      <dd>{o.target_purchases || '—'}</dd>
                                    </div>
                                  </dl>
                                  {o.redemption_conditions && <p className="mp-lib-fine">{o.redemption_conditions}</p>}
                                  {offersEditable && !approved && (
                                    <div className="mp-lib-actions">
                                      <button
                                        type="button"
                                        className="mp-lib-add"
                                        disabled={busy}
                                        onClick={() => offerChange({ op: 'add', offerId: o.id }, `“${o.name}” added`)}
                                      >
                                        <Plus size={13} /> Add to month
                                      </button>
                                      {selected.length > 0 && (
                                        <label
                                          className="mp-lib-swap"
                                          title="Swap this offer in for one of the month's cards"
                                        >
                                          <RefreshCcw size={12} />
                                          <select
                                            aria-label={`Replace an offer with ${o.name}`}
                                            disabled={busy}
                                            value=""
                                            onChange={e => replaceOffer(Number(e.target.value), o)}
                                          >
                                            <option value="" disabled>
                                              Swap for…
                                            </option>
                                            {selected.map(cur => (
                                              <option
                                                key={cur.id}
                                                value={cur.id}
                                                disabled={cur.approval_status === 'approved'}
                                              >
                                                {cur.name}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      )}
                                    </div>
                                  )}
                                  {approved && (
                                    <span className="mp-lib-approved">
                                      <CheckCircle2 size={12} /> Approved for {MONTHS[month - 1]} — reopen the month to
                                      swap it.
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </section>
                    ))
                  ) : (
                    <p className="mp-drawer-empty">No library offers match “{altQuery || altScope}”.</p>
                  )
                ) : (
                  <p className="mp-drawer-empty">No other offers for this studio yet.</p>
                )}
              </div>
            </aside>
          </div>
        )}

        {coverOpen && (
          <MonthCover
            key={`cover-${month}-${studioIdx}`}
            month={month}
            year={year}
            studioName={studio.name}
            theme={displayTheme}
            brief={chapter.brief}
            risk={chapter.risk}
            signature={chapter.signature}
            plan={coverPlan}
            target={effective}
            lastYear={row.lastYear}
            streams={coverStreams}
            leads={row.leads}
            trials={row.trials}
            buyers={row.buyers}
            renewalsDue={econ?.renewal.projectedExpiries || row.renewalsDue || 0}
            renewalCoverage={coverage}
            dates={dates}
            offers={selected.length}
            status={coverStatus}
            photo={coverPhoto}
            onOpen={() => setCoverOpen(false)}
            onClose={onClose}
            onPrev={() => month > 1 && setMonth(month - 1)}
            onNext={() => month < 12 && setMonth(month + 1)}
          />
        )}
      </section>
    </div>
  );
}

// Detailed monthly maths, opened from the month hero on request.
function MathsPanel({
  id,
  econ,
  window,
  studioId,
  studioName,
  year,
  editable,
  assumptions,
  onSaved,
  onClose,
}: {
  id: string;
  econ: MonthEconomics;
  window: { from: string; to: string };
  studioId: number;
  studioName: string;
  year: number;
  editable: boolean;
  assumptions: Record<string, { auto: number | null; override: number | null }>;
  onSaved: () => Promise<unknown>;
  onClose: () => void;
}) {
  const custom = Object.values(assumptions || {}).filter(a => a.override !== null && a.override !== undefined).length;
  return (
    <div id={id} className="mw-section mw-maths is-open">
      <header className="mw-sh">
        <span className="mw-sh-icon">
          <Sigma size={16} />
        </span>
        <h4>The maths &amp; assumptions</h4>
        <p>
          Built bottom-up from history, {window.from} → {window.to}.
        </p>
        <span className="mw-maths-custom" title={`${custom} customised assumptions`}>
          <SlidersHorizontal size={13} /> {custom ? `${custom} customised` : 'History based'}
        </span>
        <button type="button" className="mw-maths-close" onClick={onClose} aria-label="Close monthly maths">
          <X size={16} />
        </button>
      </header>
      <div className="mw-assume-wrap">
        <h5>
          <SlidersHorizontal size={14} /> Assumptions · {studioName}
        </h5>
        <AssumptionsEditor
          studioId={studioId}
          studioName={studioName}
          year={year}
          editable={editable}
          assumptions={assumptions}
          onSaved={onSaved}
        />
      </div>
      <Economics econ={econ} window={window} />
    </div>
  );
}

const ASSUMPTION_FIELDS: Array<{ key: string; label: string; hint: string; kind: 'money' | 'rate' }> = [
  { key: 'firstSpend', label: 'Average first spend', hint: 'Per new paying member', kind: 'money' },
  { key: 'trialSpend', label: 'Trial fee', hint: 'Per completed trial', kind: 'money' },
  { key: 'trialToMember', label: 'Trial → member', hint: 'Trials that become paying members', kind: 'rate' },
  { key: 'leadToTrial', label: 'Lead → trial', hint: 'Leads that complete a trial', kind: 'rate' },
  { key: 'renewalRate', label: 'Renewal rate', hint: 'Expiring memberships that renew', kind: 'rate' },
  { key: 'renewalTicket', label: 'Renewal ticket', hint: 'Revenue per renewal', kind: 'money' },
  { key: 'reactivationTicket', label: 'Reactivation ticket', hint: 'Revenue per returning member', kind: 'money' },
];

// Studio-specific spends and conversion rates. A value typed here replaces the history-based one in every month
// of this studio's plan; clearing a field returns it to history.
function AssumptionsEditor({
  studioId,
  studioName,
  year,
  editable,
  assumptions,
  onSaved,
}: {
  studioId: number;
  studioName: string;
  year: number;
  editable: boolean;
  assumptions: Record<string, { auto: number | null; override: number | null }>;
  onSaved: () => Promise<unknown>;
}) {
  const { toast } = useApp();
  const show = (kind: 'money' | 'rate', v: number | null) =>
    v === null || v === undefined ? '' : String(kind === 'rate' ? Math.round(v * 100) : Math.round(v));
  const initial = () =>
    Object.fromEntries(ASSUMPTION_FIELDS.map(f => [f.key, show(f.kind, assumptions?.[f.key]?.override ?? null)]));
  const [draft, setDraft] = useState<Record<string, string>>(initial),
    [busy, setBusy] = useState(false);
  const signature = JSON.stringify(initial());
  useEffect(() => setDraft(initial()), [signature, studioId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== signature;
  const customised = ASSUMPTION_FIELDS.filter(
    f => assumptions?.[f.key]?.override !== null && assumptions?.[f.key]?.override !== undefined,
  ).length;
  const save = async (values: Record<string, number | null>, done: string) => {
    setBusy(true);
    try {
      await api(`/studio-assumptions/${studioId}/${year}`, { method: 'PUT', body: JSON.stringify({ values }) });
      await onSaved();
      toast(done);
    } catch (e: any) {
      toast(e.message || 'Could not save assumptions.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    const values: Record<string, number | null> = {};
    for (const f of ASSUMPTION_FIELDS) {
      const raw = draft[f.key].trim();
      if (raw === '') values[f.key] = null;
      else {
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0) return toast(`${f.label} must be a positive number.`, 'error');
        values[f.key] = f.kind === 'rate' ? num / 100 : num;
      }
    }
    return save(values, `${studioName} assumptions applied to all months`);
  };
  return (
    <div className="mw-assume">
      <div className="mw-assume-grid">
        {ASSUMPTION_FIELDS.map(f => {
          const a = assumptions?.[f.key],
            custom = a?.override !== null && a?.override !== undefined;
          return (
            <label key={f.key} className={custom ? 'custom' : ''}>
              <span>
                {f.label}
                {custom && <em>edited</em>}
              </span>
              <div className="mw-assume-input">
                {f.kind === 'money' && <i>₹</i>}
                <input
                  type="number"
                  min={0}
                  step={f.kind === 'rate' ? 1 : 100}
                  inputMode="decimal"
                  disabled={!editable || busy}
                  value={draft[f.key] ?? ''}
                  placeholder={show(f.kind, a?.auto ?? null) || 'auto'}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                />
                {f.kind === 'rate' && <i>%</i>}
              </div>
              <small>
                History:{' '}
                {a?.auto === null || a?.auto === undefined
                  ? '—'
                  : f.kind === 'rate'
                    ? pct(a.auto, 0)
                    : money(a.auto, true)}{' '}
                · {f.hint}
              </small>
            </label>
          );
        })}
      </div>
      {editable && (
        <div className="mw-assume-actions">
          <Button variant="primary" disabled={!dirty || busy} onClick={apply}>
            {busy ? 'Recalculating…' : 'Apply to all months'}
          </Button>
          {customised > 0 && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                save(Object.fromEntries(ASSUMPTION_FIELDS.map(f => [f.key, null])), 'Back to history-based assumptions')
              }
            >
              Reset to history
            </Button>
          )}
          <small>
            {customised
              ? `${customised} assumption${customised > 1 ? 's' : ''} customised for ${studioName}.`
              : 'Using history for every assumption.'}
          </small>
        </div>
      )}
    </div>
  );
}

// The month's volumes, built bottom-up from history, with every step shown so the numbers can be challenged.
function Economics({ econ, window }: { econ: MonthEconomics; window: { from: string; to: string } }) {
  const nc = econ.newClient,
    r = econ.renewal,
    re = econ.reactivation;
  const steps = [
    { label: 'New-client revenue', value: lakh(nc.target), note: 'from the revenue split' },
    {
      label: 'Paying members',
      value: number(nc.buyers),
      note: `÷ (${money(nc.firstSpend, true)} first spend + ${money(nc.trialSpend, true)} trial fee ÷ ${pct(nc.trialToMember)})`,
    },
    { label: 'Completed trials', value: number(nc.trials), note: `÷ ${pct(nc.trialToMember)} trial → member` },
    { label: 'Leads', value: number(nc.leads), note: `÷ ${pct(nc.leadToTrial)} lead → trial` },
  ];
  return (
    <div className="mw-econ-body">
      <section className="mw-econ-card nc">
        <h5>
          <i>1</i> New clients <em>{lakh(nc.target)} to find</em>
        </h5>
        <div className="mw-chain">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <ArrowRight size={16} className="mw-chain-arrow" />}
              <div>
                <span>{s.label}</span>
                <strong>{s.value}</strong>
                <small>{s.note}</small>
              </div>
            </React.Fragment>
          ))}
        </div>
        <p className="mw-reason">
          Average first membership spend is {money(nc.firstSpend, true)} across {number(nc.samples.firstSpendBuyers)}{' '}
          new buyers in the last 12 months
          {nc.samples.seasonalFirstSpend
            ? `, blended with ${money(nc.samples.seasonalFirstSpend, true)} in ${nc.samples.seasonalMonth}`
            : ''}
          . Trial → member uses {number(nc.samples.trialCohort)} trials given 90 days to convert
          {nc.samples.seasonalTrialToMember !== null
            ? ` (same month last year: ${pct(nc.samples.seasonalTrialToMember)})`
            : ''}
          . Trial fees bring in {lakh(nc.trialRevenue)} of the new-client number on their own.
        </p>
      </section>

      <section className="mw-econ-card rn">
        <h5>
          <i>2</i> Renewals <em>{lakh(r.target)} target</em>
        </h5>
        <div className="mw-renewal">
          <div className="mw-renewal-head">
            <div>
              <span>Renewal revenue we can expect</span>
              <strong>{lakh(r.expected)}</strong>
              <small>of {lakh(r.target)} renewal target</small>
            </div>
            <div className="mw-cover">
              <div className="mw-cover-bar">
                <i style={{ width: `${Math.min(100, (r.coverage || 0) * 100)}%` }} />
              </div>
              <b className={r.gap > 0 ? 'neg' : 'pos'}>
                {r.gap > 0 ? `${lakh(r.gap)} short` : `Covered · ${lakh(r.expected - r.target)} headroom`}
              </b>
            </div>
          </div>
          <div className="mw-renewal-math">
            <span>
              <b>{number(r.projectedExpiries)}</b> memberships expire
              <small>
                {number(r.bookedExpiries)} already booked · {number(r.baselineExpiries)} expired same month last year
              </small>
            </span>
            <span>
              × <b>{pct(r.renewalRate)}</b> renew
              <small>renewed ÷ (renewed + lapsed), last 12 months</small>
            </span>
            <span>
              × <b>{money(r.ticket, true)}</b> per renewal
              <small>renewal revenue ÷ renewed memberships</small>
            </span>
            <span>
              = <b>{number(r.expectedRenewers)}</b> renewals
              <small>{number(r.renewersNeeded)} needed to hit target</small>
            </span>
          </div>
          {econ.alternates.length > 0 && (
            <div className="mw-gap">
              <h5>Closing the {lakh(r.gap)} renewal gap</h5>
              {econ.alternates.map(a => (
                <div key={a.key}>
                  <strong>{a.name}</strong>
                  <span>{a.logic}</span>
                  <b>
                    {number(a.units)} → {lakh(a.revenue)}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mw-econ-card re">
        <h5>
          <i>3</i> Comeback / reactivation <em>{lakh(re.target)} target</em>
        </h5>
        <p className="mw-reason">
          {lakh(re.target)} ÷ {money(re.ticket, true)} average comeback ticket ={' '}
          <b>{number(re.needed)} returning members</b>, from {number(re.lapsedPool)} members lapsed 61–365 days (
          {re.lapsedPool ? pct(re.needed / re.lapsedPool, 1) : '—'} response needed).
        </p>
      </section>
    </div>
  );
}

type CardPhoto = { url: string; pos: string; tags: string[] };
const OFFER_CARD_PHOTOS: CardPhoto[] = [
  // Duo, referral, partner & bring-a-friend energy
  { url: '/p57/pro/n23.jpg', pos: '54% 30%', tags: ['duo', 'newcomer', 'lapsed'] },
  { url: '/p57/pro/n03.jpg', pos: '58% 24%', tags: ['duo', 'barre', 'newcomer'] },
  { url: '/p57/pro/n25.jpg', pos: '54% 40%', tags: ['duo', 'strength', 'renewal'] },
  // Community, party, founding & She Moves moments
  { url: '/p57/pro/n20.jpg', pos: '56% 24%', tags: ['community', 'duo', 'newcomer', 'renewal'] },
  { url: '/p57/class-1.jpg', pos: '58% 24%', tags: ['community', 'barre', 'newcomer'] },
  // 1-on-1 coaching, privates & trainer consultations
  { url: '/p57/pro/n13.jpg', pos: '64% 24%', tags: ['coaching', 'newcomer', 'renewal'] },
  { url: '/p57/pro/n12.jpg', pos: '62% 22%', tags: ['coaching', 'duo', 'newcomer'] },
  { url: '/p57/pro/n02.jpg', pos: '54% 32%', tags: ['coaching', 'strength', 'lapsed'] },
  // Indoor cycle, flash & high-tempo challenges
  { url: '/p57/pro/n01.jpg', pos: '54% 24%', tags: ['cycle', 'flash', 'renewal'] },
  { url: '/p57/pro/n08.jpg', pos: '52% 24%', tags: ['cycle', 'flash', 'newcomer'] },
  // Strength, class packs, trade-ups & boxes
  { url: '/p57/pro/p34.jpg', pos: '58% 26%', tags: ['strength', 'community', 'renewal'] },
  { url: '/p57/pro/n24.jpg', pos: '62% 26%', tags: ['strength', 'barre', 'newcomer'] },
  { url: '/p57/pro/n10.jpg', pos: '62% 28%', tags: ['strength', 'lapsed', 'renewal'] },
  { url: '/p57/pro/p38.jpg', pos: '54% 26%', tags: ['strength', 'flash', 'renewal'] },
  // Signature barre, stretch, newcomers & welcome offers
  { url: '/p57/pro/n18.jpg', pos: '56% 36%', tags: ['barre', 'calm', 'renewal'] },
  { url: '/p57/barre-solo.jpg', pos: '68% 20%', tags: ['barre', 'newcomer', 'renewal'] },
  // Comeback, travel-proof, freeze & reactivation
  { url: '/p57/class-2.jpg', pos: '54% 32%', tags: ['calm', 'lapsed', 'renewal'] },
  { url: '/p57/pro/n16.jpg', pos: '54% 28%', tags: ['calm', 'lapsed'] },
  { url: '/p57/pro/n26.jpg', pos: '58% 26%', tags: ['calm', 'strength', 'lapsed'] },
];

// Remaining studio photography, used to keep every card in a month on its own image.
const CARD_PHOTO_EXTRAS: CardPhoto[] = [
  { url: '/p57/pro/n04.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n05.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n06.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n07.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n09.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n11.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n14.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n15.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n17.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n19.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n21.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n22.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n27.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/n28.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p01.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p02.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p03.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p04.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p05.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p06.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p08.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p09.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p10.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p12.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p13.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p14.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p15.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p16.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p17.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p18.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p19.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p20.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p21.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p23.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p24.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p25.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p26.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p27.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p28.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p29.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p30.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p31.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p32.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p33.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p35.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p36.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p37.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p39.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p40.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p41.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p42.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p43.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p44.jpg', pos: '56% 26%', tags: [] },
  { url: '/p57/pro/p45.jpg', pos: '56% 26%', tags: [] },
];

const CARD_PHOTO_THEMES: [RegExp, string][] = [
  [/private|consult|1-on-1|trainer|personal|coach/i, 'coaching'],
  [/friend|duo|pair|squad|refer|bring|together|reunion|couple/i, 'duo'],
  [/cycle|ride|spin|c\+c|flash|72-hour|earn it back/i, 'cycle'],
  [/she moves|women|party|founding|passport|festival/i, 'community'],
  [/travel|freeze|comeback|missed|return|lapsed|reset|stretch|calm/i, 'calm'],
  [/strength|lift|box|trade-up|upgrade|level up|20-class|10-pack|pack/i, 'strength'],
  [/barre|welcome|first|trial|intro|golden|bonus|punch/i, 'barre'],
];

// Assigns each card in a month its own photograph so no two cards share a hero image.
function assignMonthPhotos(offers: { offer: any; slot?: string }[]): Map<number, CardPhoto> {
  const used = new Set<string>();
  const assigned = new Map<number, CardPhoto>();
  const pool = [...OFFER_CARD_PHOTOS, ...CARD_PHOTO_EXTRAS];
  offers.forEach(({ offer, slot }, index) => {
    const preferred = pickOfferCardPhoto(offer, slot, index + 1);
    const chosen =
      (used.has(preferred.url) ? undefined : preferred) ||
      pool.find(photo => !used.has(photo.url)) ||
      CARD_PHOTO_EXTRAS.find(photo => !used.has(photo.url)) ||
      preferred;
    used.add(chosen.url);
    assigned.set(offer.id, chosen);
  });
  return assigned;
}

function pickOfferCardPhoto(o: any, slot?: string, no?: number): CardPhoto {
  if (o.provenance?.photoKey) {
    const chosen = OFFER_CARD_PHOTOS.find(
      p => p.url === o.provenance.photoKey || p.url.endsWith(`/${o.provenance.photoKey}.jpg`),
    );
    if (chosen) return chosen;
  }
  const text = `${o.name || ''} ${o.benefit || ''} ${o.headline || ''} ${o.objective || ''}`;
  const theme = CARD_PHOTO_THEMES.find(([re]) => re.test(text))?.[1];
  const byTheme = theme ? OFFER_CARD_PHOTOS.filter(p => p.tags.includes(theme)) : [];
  const bySlot = slot ? OFFER_CARD_PHOTOS.filter(p => p.tags.includes(slot)) : [];
  const merged = [...new Map([...byTheme, ...bySlot].map(p => [p.url, p])).values()];
  const pool = merged.length >= 2 ? merged : OFFER_CARD_PHOTOS;
  const seed = [...String(o.name || o.id || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 13);
  const idx = (seed + (o.month || 1) * 3 + (no || 1) * 5) % pool.length;
  return pool[idx];
}

function OfferCard({
  offer: o,
  no,
  slot,
  streamLabel,
  list,
  productLabel,
  editable,
  canSwap = editable,
  approved,
  canApprove,
  busy,
  onApprove,
  onEdit,
  onDuplicate,
  onRemove,
  onDelete,
  onSwap,
  regenerating = false,
  monthTarget = 0,
  monthUnits = 0,
  photo,
  collapsed = false,
  onToggleCollapse,
}: any) {
  const linked = !!o.provenance?.linkGroup;
  const parseList = (value: any) => {
    if (Array.isArray(value)) return value;
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  };
  const metrics = parseList(o.success_metrics),
    risks = parseList(o.risks);

  const offerPrice = n(o.expected_asp);
  const rawDisc = o.provenance?.pricing?.discount;
  const cashDisc = rawDisc !== undefined && rawDisc !== null ? n(rawDisc) : null;
  const effPct = n(o.effective_discount);
  const featuredSell = list ? Math.round(list * (1 - (cashDisc ?? 0))) : null;
  const isBlendedTicket = Boolean(
    list &&
      featuredSell &&
      offerPrice > 0 &&
      Math.abs(offerPrice - featuredSell) > Math.max(100, list * 0.03) &&
      offerPrice < featuredSell * 0.9,
  );
  const isDirectCashCut =
    !isBlendedTicket &&
    ((list && offerPrice > 0 && list - offerPrice > 1) ||
      (!list && cashDisc !== null && cashDisc > 0 && cashDisc < 1) ||
      (!list && cashDisc === null && o.offer_type === 'percentage' && effPct > 0 && effPct < 100));
  const strikePrice = isDirectCashCut
    ? list && list > offerPrice + 1
      ? list
      : offerPrice > 0
        ? Math.round(offerPrice / (1 - (cashDisc ?? effPct / 100)))
        : null
    : null;
  const directSaving = strikePrice && offerPrice ? Math.max(0, strikePrice - offerPrice) : 0;
  const directPct = strikePrice && strikePrice > 0 ? directSaving / strikePrice : 0;

  const fmtPct = (v: number) => `${Number(v.toFixed(1))}%`;
  const hasCashDiscount = (cashDisc !== null && cashDisc > 0) || isDirectCashCut;

  // Column 1: List price / Featured MRP (only crossed out when there is a real direct price cut)
  const listColLabel = isBlendedTicket ? 'Featured MRP' : 'List price';
  const listColSub = isBlendedTicket && productLabel ? productLabel : !list && !strikePrice ? 'Standard tariff' : null;

  // Column 2: Offer price / Blended cohort avg ticket
  const offerColLabel = isBlendedTicket ? 'Avg ticket' : 'Offer price';
  const offerColSub = isBlendedTicket
    ? cashDisc && cashDisc > 0
      ? `Featured: ${money(featuredSell, true)} (${Math.round(cashDisc * 100)}% off)`
      : 'Blended across tiers'
    : null;

  // Column 3: Client saves / Value-add structured display
  const savesPrimary =
    directSaving > 0 ? money(directSaving) : hasCashDiscount ? `${fmtPct((cashDisc ?? 0) * 100)} off` : null;
  const savesPillText =
    directSaving > 0
      ? `${fmtPct(directPct * 100)} off list`
      : hasCashDiscount
        ? effPct > (cashDisc ?? 0) * 100 + 0.2
          ? `${fmtPct(effPct)} total value`
          : 'Campaign rate'
        : effPct > 0
          ? `+${fmtPct(effPct)} perk value`
          : 'Value-add, no price cut';

  const slotLabel = slot === 'lapsed' ? 'Winback' : slot ? titleCase(slot) : null;
  const membership = productLabel || o.provenance?.pricing?.product || (o.offer_type ? titleCase(o.offer_type) : '');
  const objectiveLabel = o.objective ? titleCase(o.objective) : null;
  const showObjective = objectiveLabel && (!membership || objectiveLabel.toLowerCase() !== membership.toLowerCase());

  const monthEndDay = o.month ? new Date(o.year || 2027, o.month, 0).getDate() : 30;
  const windowText = o.validity_start
    ? `${new Date(o.validity_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${
        o.validity_end
          ? ` – ${new Date(o.validity_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
          : ''
      }`
    : o.month
      ? `1 – ${monthEndDay} ${MONTHS[o.month - 1].slice(0, 3)}${o.year ? ` ${o.year}` : ''}`
      : 'Full month';

  const days =
    o.validity_start && o.validity_end
      ? Math.max(1, Math.round((+new Date(o.validity_end) - +new Date(o.validity_start)) / 86400000) + 1)
      : monthEndDay;
  const units = n(o.target_purchases);
  const perWeek = units ? Math.max(1, Math.round((units / days) * 7)) : 0;
  const fin = (() => {
    if (o.financials && typeof o.financials === 'object') return o.financials;
    try {
      return JSON.parse(o.financials || '{}');
    } catch {
      return {};
    }
  })();
  const margin = fin.contributionMargin ?? o.margin_impact;
  const mechanic = [o.offer_type ? titleCase(o.offer_type) : '', productLabel].filter(Boolean).join(' · ');
  // The closing words of the name carry the accent, as in the studio's own cards.
  const titleWords = String(o.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const titleAccent = titleWords.length > 1 ? (titleWords.pop() as string) : titleWords[0] || '';
  const titleLead = titleWords.join(' ');
  const heroPhoto: CardPhoto = photo || pickOfferCardPhoto(o, slot, no);
  const offerNum = no ? String(no).padStart(2, '0') : '01';

  // Imported rationale uses "Why: … / Watch: … / Model: … / Logic: … / KPI: …" lines.
  const reasons = String(o.rationale || '')
    .split('\n')
    .map(line => line.match(/^(Why|Watch|Model|Logic|KPI):\s*(.*)$/i))
    .filter(Boolean) as RegExpMatchArray[];

  // Optimistic approval: the tick flips immediately and settles once the month reloads.
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => setPending(null), [approved]);
  const shown = pending ?? !!approved;
  // The whole card is the collapse target; controls, links and text selection are left alone.
  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!onToggleCollapse) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, label, [role="checkbox"], [contenteditable="true"]'))
      return;
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) return;
    onToggleCollapse();
  };
  const revenue = hasValidForecast(o) ? n(o.expected_revenue) : null;
  const contribution = margin != null && Number.isFinite(Number(margin)) ? Number(margin) : null;
  const sharePct = monthTarget && monthTarget > 0 && revenue !== null ? (revenue / monthTarget) * 100 : null;
  // The plan's offers carry the written mechanic in provenance; older ones keep it in mechanics,
  // customer copy or the benefit line.
  const mechanicsText = (() => {
    const asText = (value: any): string => {
      if (!value) return '';
      if (typeof value === 'object') {
        return String(value.summary || value.text || value.description || value.mechanic || '').trim();
      }
      const text = String(value).trim();
      if (!/^[[{]/.test(text)) return text;
      try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object'
          ? String(parsed.summary || parsed.text || parsed.description || '').trim()
          : '';
      } catch {
        return '';
      }
    };
    const written = asText(o.provenance?.pricing?.mechanic) || asText(o.mechanics);
    if (written) return written;
    if (o.customer_copy && o.customer_copy !== o.headline && o.customer_copy !== o.benefit) return o.customer_copy;
    return o.benefit && o.benefit !== o.headline ? o.benefit : '';
  })();

  // The hero explains, in one or two plain lines, what the offer actually is: what is being
  // sold, at what price against list, and the mechanic that makes it work.
  const offerDescription = (() => {
    const firstSentences = (value: string, budget = 150) => {
      const clean = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!clean) return '';
      const parts = (clean.match(/[^.!?]+[.!?]*/g) || [clean]).map(part => part.trim()).filter(Boolean);
      let out = '';
      for (const part of parts) {
        if (out && out.length + part.length > budget) break;
        const sentence = /[.!?]$/.test(part) ? part : `${part}.`;
        out = out ? `${out} ${sentence}` : sentence;
        if (out.length >= budget * 0.6) break;
      }
      if (out.length > budget) out = `${out.slice(0, budget).replace(/[,;:\s]+\S*$/, '')}…`;
      return out;
    };

    const what = productLabel || (o.offer_type ? titleCase(o.offer_type) : '');
    const price = offerPrice ? money(offerPrice) : '';
    const headline = what ? (price ? `${what} at ${price}` : what) : price ? `Priced at ${price}` : '';

    const discount = (() => {
      if (strikePrice && offerPrice && strikePrice > offerPrice * 1.01) {
        return `${fmtPct(directPct * 100)} below the ${money(strikePrice)} list price`;
      }
      if (cashDisc && cashDisc > 0 && list) return `${Math.round(cashDisc * 100)}% below the ${money(list)} list price`;
      if (effPct > 0) return `with ${fmtPct(effPct)} back in value`;
      return '';
    })();

    // Client-facing copy reads most plainly; otherwise fall back to the written benefit with its
    // internal asides removed, then to the mechanic.
    const plain = (value: string) =>
      String(value || '')
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // The plan writes one plain line per offer ("3-month unlimited at 15% off + 2 freezes");
    // that sentence is the description. Marketing copy is only a fallback.
    const written = String(o.provenance?.plainUsage || '').trim();
    const description = written
      ? written
      : firstSentences(o.customer_copy || plain(o.benefit) || plain(mechanicsText), 140);

    const lead = [headline, discount].filter(Boolean).join(', ');
    const parts = [lead ? (/[.!?]$/.test(lead) ? lead : `${lead}.`) : '', description].filter(Boolean);
    return parts.join(' ').trim();
  })();

  // Bars are the chart line for each figure; they all share one 0–100 scale.
  const clampPct = (value: number) =>
    Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value)) * 10) / 10 : 0;
  const valueBar = clampPct(effPct);
  const cashBar = clampPct(cashDisc !== null && cashDisc > 0 ? Math.min(cashDisc * 100, effPct) : 0);
  const ticketBase = strikePrice || (isBlendedTicket ? featuredSell : list);
  const ticketBar = ticketBase && offerPrice ? clampPct((offerPrice / ticketBase) * 100) : 0;
  const unitsBar = monthUnits > 0 && units ? clampPct((units / monthUnits) * 100) : 0;
  const revenueBar = sharePct !== null ? Math.max(2, clampPct(sharePct)) : 0;
  const marginPct = contribution !== null && revenue ? (contribution / revenue) * 100 : null;
  const marginBar = marginPct !== null ? clampPct(marginPct) : 0;

  // The spec sheet: what the offer is, in the client's own words, on what terms, and the arithmetic
  // behind its forecast. Every line is derived from the offer record or its plan provenance.
  const specRows = (() => {
    const rows: Array<{ label: string; value: React.ReactNode }> = [];
    const tidy = (value: unknown) =>
      String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim();
    const cut = (value: string, max: number) =>
      value.length > max ? `${value.slice(0, max).replace(/[\s,;:.]+$/, '')}\u2026` : value;
    const line = (names: string[]) => {
      const hit = reasons.find(entry => names.some(name => new RegExp(name, 'i').test(entry[1])));
      return tidy(hit?.[2]);
    };
    // Never print the same sentence twice: the hero brief and the stat bar already carry
    // their own copy, so a row only lands when it adds something.
    const fresh = (value: string) => value && !offerDescription.includes(value.slice(0, 60));

    const audience = [
      tidy(o.audience),
      tidy(o.excluded_audience) && `excludes ${tidy(o.excluded_audience).toLowerCase()}`,
    ]
      .filter(Boolean)
      .join(' · ');
    if (audience) rows.push({ label: 'Audience', value: cut(audience, 200) });

    const mechanicRow = tidy(mechanicsText);
    if (mechanicRow && fresh(mechanicRow)) rows.push({ label: 'The offer', value: cut(mechanicRow, 300) });

    const included = tidy(o.benefit);
    if (included && included !== mechanicRow && fresh(included)) {
      rows.push({ label: "What's included", value: cut(included, 260) });
    }

    const why = line(['why']);
    if (why) rows.push({ label: 'Why it works', value: cut(why, 300) });

    // How the number is actually sold: the play, the pace it needs, and what it carries.
    const salesLogic = [
      objectiveLabel || slotLabel,
      units ? `${number(units)} buyers over ${days} days` : '',
      perWeek ? `~${number(perWeek)} a week` : '',
      sharePct !== null ? `${fmtPct(sharePct)} of the month's target` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    if (salesLogic) rows.push({ label: 'Sales logic', value: salesLogic });

    const model = line(['model', 'revenue', 'logic']);
    const arithmetic =
      units && offerPrice && revenue !== null
        ? `${number(units)} × ${money(offerPrice)} = ${lakh(revenue)}${sharePct !== null ? ` (${fmtPct(sharePct)} of the month)` : ''}`
        : '';
    if (model) rows.push({ label: 'Revenue logic', value: cut(model, 320) });
    else if (arithmetic) rows.push({ label: 'Revenue logic', value: arithmetic });

    const kpis = metrics.length ? metrics.slice(0, 4).join(' · ') : line(['kpi']);
    if (kpis) rows.push({ label: 'Success metrics', value: cut(kpis, 300) });
    else if (units && revenue !== null) {
      rows.push({
        label: 'Success metrics',
        value: `${number(units)} buyers and ${lakh(revenue)} booked inside the ${days}-day window`,
      });
    }

    const watch = line(['watch']);
    if (watch) rows.push({ label: 'What to watch', value: cut(watch, 260) });

    if (risks.length) rows.push({ label: 'Risk & mitigation', value: cut(risks.slice(0, 3).join(' · '), 260) });

    rows.push({
      label: 'Terms',
      value: tidy(o.redemption_conditions)
        ? cut(tidy(o.redemption_conditions), 240)
        : 'One per client; no cash discount beyond the campaign rate.',
    });

    const moment = tidy(o.provenance?.moment);
    if (moment) rows.push({ label: 'Tied to', value: `${moment} · ${windowText}` });

    const quote = tidy(o.customer_copy);
    if (quote && fresh(quote) && quote !== included) {
      rows.push({ label: 'In their words', value: `\u201c${cut(quote, 160)}\u201d` });
    }

    return rows;
  })();

  return (
    <article
      className={`oc${shown ? ' is-approved' : ''}${slot ? ` slot-${slot}` : ''}${collapsed ? ' is-collapsed' : ''}`}
      onClick={handleCardClick}
    >
      <div className="oc-hero">
        <div
          className="oc-hero-image"
          aria-hidden="true"
          style={{ backgroundImage: `url(${heroPhoto.url})`, backgroundPosition: heroPhoto.pos }}
        />
        <div className="oc-hero-scrim" aria-hidden="true" />

        <div className="oc-hero-top">
          <span className="oc-num-badge" aria-hidden="true">
            {offerNum}
          </span>
          <div className="oc-toolbar">
            {onToggleCollapse && (
              <button
                type="button"
                className="oc-collapse"
                aria-expanded={!collapsed}
                aria-label={collapsed ? `Expand ${o.name}` : `Collapse ${o.name}`}
                title={collapsed ? 'Expand this offer card' : 'Collapse to the photo only'}
                onClick={onToggleCollapse}
              >
                <ChevronDown size={14} className={collapsed ? 'is-flipped' : undefined} />
              </button>
            )}
            {(editable || (canSwap && !shown)) && (
              <div className="oc-icon-group">
                {canSwap && !shown && (
                  <button
                    type="button"
                    aria-label={`Generate a new offer with AI in place of ${o.name}`}
                    title="Generate with AI — a new, better-optimised offer replaces this one"
                    className={`oc-icon-btn ai${regenerating ? ' is-loading' : ''}`}
                    onClick={onSwap}
                    disabled={busy || regenerating}
                    aria-busy={regenerating}
                  >
                    {regenerating ? <Loader2 size={13.5} className="spin" /> : <Sparkles size={13.5} />}
                  </button>
                )}
                {editable && onDuplicate && (
                  <button
                    type="button"
                    aria-label={`Duplicate ${o.name}`}
                    title="Duplicate as new offer"
                    className="oc-icon-btn"
                    onClick={onDuplicate}
                    disabled={busy}
                  >
                    <Copy size={13} />
                  </button>
                )}
                {editable && (
                  <button
                    type="button"
                    aria-label={`Edit ${o.name}`}
                    title="Edit all offer details"
                    className="oc-icon-btn"
                    onClick={onEdit}
                    disabled={busy}
                  >
                    <Pencil size={13.5} />
                  </button>
                )}
                {(editable || !shown) && (
                  <button
                    type="button"
                    aria-label={`Remove ${o.name} from month`}
                    title="Remove from month plan"
                    className="oc-icon-btn danger"
                    onClick={onRemove}
                    disabled={busy}
                  >
                    <Minus size={14} />
                  </button>
                )}
                {editable && onDelete && (
                  <button
                    type="button"
                    aria-label={`Delete ${o.name}`}
                    title="Delete offer permanently"
                    className="oc-icon-btn danger"
                    onClick={onDelete}
                    disabled={busy}
                  >
                    <Trash2 size={13.5} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="oc-hero-bottom">
          <div className="oc-hero-copy">
            <div className="oc-headline">
              <h3 className="oc-title">
                {titleLead && <>{titleLead} </>}
                <span className="oc-title-accent">{titleAccent}</span>
              </h3>
            </div>
            {o.headline && o.headline !== o.customer_copy && !offerDescription.startsWith(o.headline) && (
              <p className="oc-job">{o.headline}</p>
            )}
            {offerDescription && <p className="oc-brief">{offerDescription}</p>}
          </div>
          <div className="oc-chips">
            {slotLabel ? (
              <span className={`oc-chip is-slot slot-${slot}`}>
                <Sparkles size={10} />
                {slotLabel}
              </span>
            ) : (
              streamLabel && (
                <span className="oc-chip is-stream">
                  <Target size={10} />
                  {streamLabel}
                </span>
              )
            )}
            {membership && (
              <span className="oc-chip">
                <Tag size={10} />
                {membership}
              </span>
            )}
            {objectiveLabel && showObjective && <span className="oc-chip">{objectiveLabel}</span>}
            {o.provenance?.moment && (
              <span className="oc-chip is-moment" title={`Built around ${o.provenance.moment} this month`}>
                <CalendarHeart size={10} />
                {o.provenance.moment}
              </span>
            )}
            <span
              className={`oc-chip is-icon ${linked ? 'is-linked' : 'is-solo'}`}
              title={linked ? 'Runs at all locations' : 'This location only'}
              aria-label={linked ? 'Runs at all locations' : 'This location only'}
            >
              {linked ? <Link2 size={10} /> : <Unlink size={10} />}
            </span>
          </div>
        </div>
      </div>

      <div className="oc-sheet">
        {/* Six figures on one bar, each with its own icon, so the card scans at a glance. */}
        {/* Six figures, each closed with a bar so the numbers read as a chart, not as prose. */}
        <div className="oc-stats">
          <div className="oc-stat">
            <span className="oc-stat-label">
              <Tag size={12} />
              {offerColLabel}
            </span>
            <span className="oc-stat-value">
              {offerPrice ? money(offerPrice) : '—'}
              {strikePrice && <s>{money(strikePrice)}</s>}
            </span>
            <span
              className="oc-bar"
              aria-hidden="true"
              style={{ '--oc-fill': `${ticketBar}%` } as React.CSSProperties}
            />
            <small className="oc-stat-note">
              {strikePrice
                ? `of ${money(strikePrice)} list`
                : isBlendedTicket && featuredSell
                  ? `vs ${money(featuredSell)} featured`
                  : list
                    ? `of ${money(list)} list`
                    : 'No list comparison'}
            </small>
          </div>
          <div className="oc-stat">
            <span className="oc-stat-label">
              <Users size={12} />
              Client gets
            </span>
            <span className="oc-stat-value">{savesPrimary || (effPct > 0 ? `+${fmtPct(effPct)}` : 'Value-add')}</span>
            <span
              className="oc-bar"
              aria-hidden="true"
              style={{ '--oc-fill': `${valueBar}%` } as React.CSSProperties}
            />
            <small className="oc-stat-note">
              {hasCashDiscount ? 'Off the list price' : effPct > 0 ? 'In perks & extras' : 'No price cut'}
            </small>
          </div>
          <div className="oc-stat">
            <span className="oc-stat-label">
              <Package size={12} />
              Units
            </span>
            <span className="oc-stat-value">
              {number(units)}
              {perWeek > 0 && <em>~{perWeek}/wk</em>}
            </span>
            <span
              className="oc-bar"
              aria-hidden="true"
              style={{ '--oc-fill': `${unitsBar}%` } as React.CSSProperties}
            />
            <small className="oc-stat-note">
              {monthUnits > 0 ? `of ${number(monthUnits)} this month` : `over ${days} days`}
            </small>
          </div>
          <div className="oc-stat">
            <span className="oc-stat-label">
              <TrendingUp size={12} />
              Revenue
            </span>
            <span className="oc-stat-value">{revenue !== null ? lakh(revenue) : '—'}</span>
            <span
              className="oc-bar"
              aria-hidden="true"
              style={{ '--oc-fill': `${revenueBar}%` } as React.CSSProperties}
            />
            <small className="oc-stat-note">
              {sharePct !== null
                ? `${sharePct.toFixed(sharePct < 10 ? 1 : 0)}% of ${monthTarget ? lakh(monthTarget) : 'the'} target`
                : 'No forecast'}
            </small>
          </div>
          <div className="oc-stat">
            <span className="oc-stat-label">
              <Percent size={12} />
              Eff. discount
            </span>
            <span className={effPct > 0 ? 'oc-stat-value' : 'oc-stat-value is-muted'}>
              {effPct > 0 ? fmtPct(effPct) : 'None'}
            </span>
            <span
              className="oc-bar is-stacked"
              aria-hidden="true"
              style={{ '--oc-fill': `${valueBar}%`, '--oc-cash': `${cashBar}%` } as React.CSSProperties}
            />
            <small className="oc-stat-note">
              {cashBar > 0 ? 'Cash + perk value' : effPct > 0 ? 'Perk value only' : 'No discount'}
            </small>
          </div>
          <div className="oc-stat">
            <span className="oc-stat-label">
              <Wallet size={12} />
              Contribution
            </span>
            <span
              className={contribution === null ? 'oc-stat-value is-muted' : 'oc-stat-value'}
              title={contribution === null ? 'Delivery costs are not set for this offer yet' : undefined}
            >
              {contribution === null ? '—' : lakh(contribution)}
            </span>
            <span
              className="oc-bar"
              aria-hidden="true"
              style={{ '--oc-fill': `${marginBar}%` } as React.CSSProperties}
            />
            <small className="oc-stat-note">
              {marginPct !== null ? `${marginPct.toFixed(0)}% margin` : 'Costs pending'}
            </small>
          </div>
        </div>

        <div className="oc-meta">
          <div className="oc-meta-item">
            <span className="oc-meta-icon">
              <Users size={15} />
            </span>
            <div>
              <span className="oc-label">Who</span>
              <b>{o.audience || 'All clients'}</b>
            </div>
          </div>
          <div className="oc-meta-item">
            <span className="oc-meta-icon">
              <Calendar size={15} />
            </span>
            <div>
              <span className="oc-label">When</span>
              <b>
                {windowText} · {days} days
              </b>
            </div>
          </div>
          <div className="oc-meta-item">
            <span className="oc-meta-icon">
              <Tag size={15} />
            </span>
            <div>
              <span className="oc-label">How</span>
              <b>{[mechanic, offerColSub].filter(Boolean).join(' · ') || titleCase(o.offer_type) || 'Value-add'}</b>
            </div>
          </div>
        </div>

        {/* Spec sheet: the commercial record as ruled label → value lines, so the whole offer
            reads without opening anything. Approval sits in its header. */}
        <div className="oc-spec">
          <div className="oc-spec-head">
            <span className="oc-spec-title">
              <FileText size={13} />
              Offer spec
            </span>
            <div className="oc-actions">
              {canApprove ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={shown}
                  className={`oc-check${shown ? ' is-on' : ''}${pending !== null ? ' is-saving' : ''}`}
                  title={shown ? 'Approved · click to reopen' : 'Approve this offer'}
                  disabled={pending !== null}
                  onClick={() => {
                    setPending(!shown);
                    Promise.resolve(onApprove(!shown)).then(ok => ok === false && setPending(null));
                  }}
                >
                  <Check size={13} strokeWidth={2.75} />
                  <span>{shown ? 'Approved' : 'Approve'}</span>
                </button>
              ) : shown ? (
                <span className="oc-status-approved">
                  <Check size={12} strokeWidth={2.75} /> Approved
                </span>
              ) : null}
            </div>
          </div>
          {specRows.map(row => (
            <div key={row.label} className="oc-spec-row">
              <span className="oc-spec-label">{row.label}</span>
              <p className="oc-spec-value">{row.value}</p>
            </div>
          ))}
        </div>

        <div className="oc-sign">
          <span>{[slotLabel || streamLabel, objectiveLabel].filter(Boolean).join(' · ') || 'Offer plan'}</span>
          <i aria-hidden="true">//</i>
        </div>
      </div>
    </article>
  );
}

const OFFER_OBJECTIVES = [
  ['acquisition', 'New clients · Acquisition'],
  ['trial_conversion', 'New clients · Trial conversion'],
  ['referral', 'New clients · Referral / duo'],
  ['retention', 'Renewals · Member retention'],
  ['annual_membership', 'Renewals · Annual commitment'],
  ['additional_purchase', 'Renewals · Pack / upsell'],
  ['reactivation', 'Comeback · Lapsed reactivation'],
] as const;

const OFFER_TYPES = [
  ['percentage', 'Percentage discount'],
  ['fixed_price', 'Fixed campaign tariff'],
  ['value_add', 'Value-add / bonus perk'],
  ['bundle', 'Curated bundle'],
  ['bogo_duo', 'Duo / bring-a-friend'],
  ['referral', 'Referral reward'],
  ['annual', 'Annual tier'],
  ['experience', 'Hosted experience'],
] as const;

function OfferEditor({
  mode = 'edit',
  offer,
  studioId,
  prices,
  solo,
  others,
  busy,
  onCancel,
  onDelete,
  onSave,
}: {
  mode?: 'edit' | 'create';
  offer: any;
  studioId: number;
  prices: Prices | null;
  solo: boolean;
  others: number;
  busy: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  onSave: (edit: any) => void;
}) {
  const parseList = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String);
    try {
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  };
  const pricing = offer.provenance?.pricing || {};
  const [f, setF] = useState({
    name: offer.name || '',
    headline: offer.headline || '',
    benefit: offer.benefit || '',
    objective: offer.objective || 'acquisition',
    offer_type: offer.offer_type || 'percentage',
    plan_slot: offer.plan_slot || '',
    photoKey: offer.provenance?.photoKey || '',
    audience: offer.audience || '',
    excluded_audience: offer.excluded_audience || '',
    redemption_conditions: offer.redemption_conditions || '',
    cta: offer.cta || '',
    customer_copy: offer.customer_copy || '',
    rationale: offer.rationale || '',
    product: pricing.product || '',
    customListPrice: pricing.customListPrice ? Math.round(n(pricing.customListPrice)) : 0,
    discount: Math.round(n(pricing.discount ?? n(offer.effective_discount) / 100) * 100),
    customAsp: Boolean(pricing.customAsp),
    units: n(offer.target_purchases),
    asp: Math.round(n(offer.expected_asp)),
    validity_start: offer.validity_start || '',
    validity_end: offer.validity_end || '',
    success_metrics: parseList(offer.success_metrics),
    risks: parseList(offer.risks),
  });
  const catalogList = f.product ? prices?.prices[studioId]?.[f.product] : null;
  const effectiveList = catalogList ?? (f.customListPrice > 0 ? f.customListPrice : null);
  const computedAsp = effectiveList ? Math.round(effectiveList * (1 - f.discount / 100)) : f.asp;
  const asp = f.customAsp || !effectiveList ? f.asp : computedAsp;
  const savings = effectiveList && asp > 0 && effectiveList > asp ? effectiveList - asp : 0;
  const up = (p: Partial<typeof f>) => setF(x => ({ ...x, ...p }));

  return (
    <form
      className="mw-editor"
      onSubmit={e => {
        e.preventDefault();
        onSave({
          name: f.name.trim(),
          headline: f.headline.trim() || null,
          benefit: f.benefit.trim() || null,
          objective: f.objective,
          offer_type: f.offer_type,
          plan_slot: f.plan_slot || null,
          photoKey: f.photoKey || null,
          audience: f.audience.trim() || null,
          excluded_audience: f.excluded_audience.trim() || null,
          redemption_conditions: f.redemption_conditions.trim() || null,
          cta: f.cta.trim() || null,
          customer_copy: f.customer_copy.trim() || null,
          rationale: f.rationale.trim() || null,
          validity_start: f.validity_start || null,
          validity_end: f.validity_end || null,
          target_purchases: f.units,
          expected_asp: asp,
          success_metrics: f.success_metrics.map(s => s.trim()).filter(Boolean),
          risks: f.risks.map(s => s.trim()).filter(Boolean),
          pricing: {
            product: f.product || null,
            discount: f.discount / 100,
            mechanic: f.benefit,
            customListPrice: !f.product && f.customListPrice > 0 ? f.customListPrice : null,
            customAsp: f.customAsp,
          },
        });
      }}
    >
      <div className="mw-editor-head">
        <div>
          <span className="mw-editor-badge">{mode === 'create' ? 'New offer' : 'Edit offer'}</span>
          <h5>{f.name || (mode === 'create' ? 'Build a new monthly offer' : 'Offer details')}</h5>
        </div>
        <button type="button" className="mw-mini-icon" aria-label="Close editor" onClick={onCancel}>
          <X size={15} />
        </button>
      </div>

      {/* Group 1: Hero & Positioning */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">1 · Hero &amp; positioning</span>
        <div className="mw-editor-grid">
          <label className="wide">
            <span>Offer title</span>
            <input
              value={f.name}
              required
              minLength={3}
              placeholder="e.g. Founding 57: Annual Unlimited"
              onChange={e => up({ name: e.target.value })}
            />
          </label>
          <label>
            <span>Revenue stream &amp; objective</span>
            <select value={f.objective} onChange={e => up({ objective: e.target.value })}>
              {OFFER_OBJECTIVES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Primary plan slot</span>
            <select value={f.plan_slot} onChange={e => up({ plan_slot: e.target.value })}>
              <option value="">Additional / general offer</option>
              <option value="newcomer">Newcomer primary slot</option>
              <option value="lapsed">Winback / lapsed primary slot</option>
              <option value="renewal">Renewal primary slot</option>
            </select>
          </label>
          <label>
            <span>Offer mechanism type</span>
            <select value={f.offer_type} onChange={e => up({ offer_type: e.target.value })}>
              {OFFER_TYPES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Card hero photography</span>
            <select value={f.photoKey} onChange={e => up({ photoKey: e.target.value })}>
              <option value="">Auto-matched from offer wording</option>
              {OFFER_CARD_PHOTOS.map((p, idx) => (
                <option key={p.url} value={p.url}>
                  Studio frame #{idx + 1} · {p.tags.join(', ')}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>Subheadline / commercial hook</span>
            <input
              value={f.headline}
              placeholder="Short one-line hook shown right under the card title"
              onChange={e => up({ headline: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Value-add / mechanic summary (what the client gets)</span>
            <textarea
              rows={2}
              value={f.benefit}
              placeholder="e.g. 15% off 3-Month Unlimited + 2 complimentary guest passes"
              onChange={e => up({ benefit: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Group 2: Pricing & Commercials */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">2 · Pricing &amp; plan forecast</span>
        <div className="mw-editor-grid">
          <label>
            <span>Catalog membership / pack</span>
            <select value={f.product} onChange={e => up({ product: e.target.value, customAsp: false })}>
              <option value="">Custom / manual package</option>
              {Object.entries(prices?.keys || {}).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                  {prices?.prices[studioId]?.[k] ? ` · ${money(prices.prices[studioId][k], true)}` : ' · custom here'}
                </option>
              ))}
            </select>
          </label>
          {!f.product && (
            <label>
              <span>List price / MRP (₹)</span>
              <input
                type="number"
                min={0}
                value={f.customListPrice}
                placeholder="Optional MRP before discount"
                onChange={e => up({ customListPrice: n(e.target.value) })}
              />
            </label>
          )}
          <label>
            <span>Discount %</span>
            <input
              type="number"
              min={0}
              max={50}
              value={f.discount}
              onChange={e => up({ discount: Math.min(50, Math.max(0, n(e.target.value))) })}
            />
          </label>
          <label>
            <span className="mw-editor-inline-check">
              Offer price / ASP (₹)
              {effectiveList ? (
                <small>
                  <input
                    type="checkbox"
                    checked={f.customAsp}
                    onChange={e => up({ customAsp: e.target.checked, asp: computedAsp })}
                  />{' '}
                  Override
                </small>
              ) : null}
            </span>
            <input
              type="number"
              min={0}
              value={asp}
              disabled={Boolean(effectiveList) && !f.customAsp}
              onChange={e => up({ asp: n(e.target.value), customAsp: true })}
            />
          </label>
          <label>
            <span>Planned units (this location)</span>
            <input type="number" min={0} value={f.units} onChange={e => up({ units: n(e.target.value) })} />
          </label>
        </div>
        <div className="mw-editor-preview-strip">
          <div>
            <small>List price</small>
            <b>{effectiveList ? money(effectiveList) : '—'}</b>
          </div>
          <div>
            <small>Offer price</small>
            <b>{asp ? money(asp) : '—'}</b>
          </div>
          <div>
            <small>Client saves</small>
            <b>{savings > 0 ? money(savings) : f.discount > 0 ? `${f.discount}% off` : 'Value-add'}</b>
          </div>
          <div>
            <small>Plan forecast</small>
            <b>{money(asp * f.units, true)}</b>
          </div>
        </div>
      </div>

      {/* Group 3: Operational Details & Guardrails */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">3 · Target cohort, window &amp; guardrails</span>
        <div className="mw-editor-grid">
          <label>
            <span>Target cohort (Who it’s for)</span>
            <input
              value={f.audience}
              placeholder="e.g. First-time studio visitors & trial completers"
              onChange={e => up({ audience: e.target.value })}
            />
          </label>
          <label>
            <span>Valid window</span>
            <div className="mw-dates-in">
              <input type="date" value={f.validity_start} onChange={e => up({ validity_start: e.target.value })} />
              <input type="date" value={f.validity_end} onChange={e => up({ validity_end: e.target.value })} />
            </div>
          </label>
          <label>
            <span>Call to action</span>
            <input
              value={f.cta}
              placeholder="e.g. Claim at reception or book via Momence"
              onChange={e => up({ cta: e.target.value })}
            />
          </label>
          <label>
            <span>Exclusions (Not eligible)</span>
            <input
              value={f.excluded_audience}
              placeholder="e.g. Existing active annual members"
              onChange={e => up({ excluded_audience: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Terms &amp; guardrails</span>
            <textarea
              rows={2}
              value={f.redemption_conditions}
              placeholder="Redemption rules, stacking policy, validity conditions…"
              onChange={e => up({ redemption_conditions: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* Group 4: Copy, Rationale, Success Metrics & Risks */}
      <div className="mw-editor-section">
        <span className="mw-editor-sec-title">4 · Copy, rationale, metrics &amp; watch-outs</span>
        <div className="mw-editor-grid">
          <label className="wide">
            <span>Client-facing copy / quote</span>
            <textarea
              rows={2}
              value={f.customer_copy}
              placeholder="Client-facing message used on cards and collateral samples…"
              onChange={e => up({ customer_copy: e.target.value })}
            />
          </label>
          <label className="wide">
            <span>Strategic rationale (Why it works)</span>
            <textarea
              rows={3}
              value={f.rationale}
              placeholder={
                'Why: Converts trial momentum within 72h\nLogic: Protects list rate with added value\nWatch: Enforce newcomer eligibility in Momence'
              }
              onChange={e => up({ rationale: e.target.value })}
            />
          </label>
          <div className="mw-editor-list-col">
            <span>Success metrics</span>
            <div className="mw-list-editor">
              {f.success_metrics.map((m, i) => (
                <div key={i} className="mw-list-editor-row">
                  <input
                    value={m}
                    placeholder="KPI or target metric…"
                    onChange={e =>
                      up({ success_metrics: f.success_metrics.map((x, idx) => (idx === i ? e.target.value : x)) })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Remove success metric"
                    onClick={() => up({ success_metrics: f.success_metrics.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mw-mini-btn"
                onClick={() => up({ success_metrics: [...f.success_metrics, ''] })}
              >
                <Plus size={11} /> Add metric
              </button>
            </div>
          </div>
          <div className="mw-editor-list-col">
            <span>Risks &amp; assumptions</span>
            <div className="mw-list-editor">
              {f.risks.map((r, i) => (
                <div key={i} className="mw-list-editor-row">
                  <input
                    value={r}
                    placeholder="Guardrail or assumption…"
                    onChange={e => up({ risks: f.risks.map((x, idx) => (idx === i ? e.target.value : x)) })}
                  />
                  <button
                    type="button"
                    aria-label="Remove risk"
                    onClick={() => up({ risks: f.risks.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button type="button" className="mw-mini-btn" onClick={() => up({ risks: [...f.risks, ''] })}>
                <Plus size={11} /> Add risk
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mw-editor-foot">
        <span>
          Expected <b>{money(asp * f.units, true)}</b> here.{' '}
          {solo
            ? 'Solo mode: saved to this location only and unlinked from the others.'
            : `Mirrors across up to ${others} other locations at their local prices unless Solo mode is enabled.`}
        </span>
        <div className="mw-editor-foot-btns">
          {mode === 'edit' && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={busy}
              icon={<Trash2 size={13} />}
              onClick={onDelete}
            >
              Delete offer
            </Button>
          )}
          <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={busy}>
            {busy
              ? 'Saving…'
              : mode === 'create'
                ? solo
                  ? 'Create here only'
                  : 'Create everywhere'
                : solo
                  ? 'Save here only'
                  : 'Save everywhere'}
          </Button>
        </div>
      </div>
    </form>
  );
}

const ACTION_LABEL = { add: 'New offer', replace: 'Replaces', optimise: 'Sharpens' } as const;

// AI offer copilot: asks for proposals, shows each with its priced effect, and saves only what the planner applies.
function OfferCopilot({ state, steer, setSteer, busy, onAsk, onApply, onClose, current }: any) {
  const loading = !!state?.loading || !!state?.creating;
  const unlocked = current.filter((o: any) => o.approval_status !== 'approved');
  const list = (value: any) => {
    if (Array.isArray(value)) return value;
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  };
  return (
    <div className={`mw-copilot ${state ? 'open' : ''}`}>
      <div className="mw-cp-bar">
        <span className="mw-cp-badge">
          <Sparkles size={14} /> Offer copilot
        </span>
        <input
          value={steer}
          maxLength={400}
          placeholder="Optional steer — e.g. “push 3-month memberships, keep discounts under 15%”"
          onChange={e => setSteer(e.target.value)}
        />
        <Button
          size="sm"
          variant="primary"
          disabled={loading || busy || !unlocked.length}
          onClick={() => onAsk('optimise')}
        >
          Optimise this set
        </Button>
        <Button size="sm" variant="ghost" disabled={loading || busy} onClick={() => onAsk('suggest')}>
          Suggest new offers
        </Button>
      </div>
      {loading && (
        <p className="mw-cp-loading">
          <Sparkles size={14} />{' '}
          {state?.creating
            ? 'Creating complete draft offers and adding them to this month…'
            : 'Working through the numbers…'}
        </p>
      )}
      {state && !loading && (
        <div className="mw-cp-results">
          <div className="mw-cp-head">
            <p>{state.summary || 'Nothing to change.'}</p>
            <div>
              {state.proposals.length > 1 && (
                <Button size="sm" variant="primary" disabled={busy} onClick={() => onApply(state.proposals)}>
                  Apply all {state.proposals.length}
                </Button>
              )}
              <button className="mw-cp-x" aria-label="Dismiss suggestions" onClick={onClose}>
                <X size={15} />
              </button>
            </div>
          </div>
          {state.proposals.map((p: any, i: number) => (
            <article key={`${p.name}-${i}`} className={`mw-cp-card ${p.action}`}>
              <header>
                <span className="mw-cp-tag">
                  {ACTION_LABEL[p.action as keyof typeof ACTION_LABEL]}
                  {p.replaces ? ` · ${p.replaces}` : ''}
                </span>
                <h5>{p.name}</h5>
                {p.headline && <p className="mw-cp-job">{p.headline}</p>}
              </header>
              <p className="mw-cp-benefit">{p.benefit}</p>
              <dl>
                <div>
                  <dt>Price</dt>
                  <dd>
                    {p.price ? money(p.price) : '—'}
                    {p.discountPct > 0 && <small> · {Math.round(p.discountPct)}% off</small>}
                  </dd>
                </div>
                <div>
                  <dt>Units</dt>
                  <dd>{number(p.targetPurchases)}</dd>
                </div>
                <div>
                  <dt>Plan</dt>
                  <dd>{lakh(p.revenue)}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>{p.audience || '—'}</dd>
                </div>
              </dl>
              <p className="mw-cp-why">{p.rationale}</p>
              <footer>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  icon={<Check size={14} />}
                  onClick={() => onApply([p])}
                >
                  Apply
                </Button>
              </footer>
            </article>
          ))}
          {(state.created || []).map(({ proposal: p, offerId, offer }: any) => (
            <article key={`created-${offerId}`} className="mw-cp-card created">
              <header>
                <span className="mw-cp-tag">
                  <CheckCircle2 size={12} /> Draft offer created · #{offerId}
                </span>
                <h5>{offer.name}</h5>
                {offer.headline && <p className="mw-cp-job">{offer.headline}</p>}
              </header>
              <p className="mw-cp-benefit">{offer.benefit}</p>
              <dl>
                <div>
                  <dt>Membership</dt>
                  <dd>{p.productKey}</dd>
                </div>
                <div>
                  <dt>Type · objective</dt>
                  <dd>
                    {titleCase(p.offerType)} · {titleCase(p.objective)}
                  </dd>
                </div>
                <div>
                  <dt>Audience</dt>
                  <dd>{offer.audience}</dd>
                </div>
                <div>
                  <dt>Price · discount</dt>
                  <dd>
                    {money(offer.expected_asp)} · {p.discountPct}% off
                  </dd>
                </div>
                <div>
                  <dt>Target buyers</dt>
                  <dd>{number(offer.target_purchases)}</dd>
                </div>
                <div>
                  <dt>Expected revenue</dt>
                  <dd>{lakh(offer.expected_revenue)}</dd>
                </div>
                <div>
                  <dt>Validity</dt>
                  <dd>
                    {offer.validity_start} – {offer.validity_end}
                  </dd>
                </div>
                <div>
                  <dt>Call to action</dt>
                  <dd>{offer.cta}</dd>
                </div>
                <div className="wide">
                  <dt>Redemption terms</dt>
                  <dd>{offer.redemption_conditions}</dd>
                </div>
                <div className="wide">
                  <dt>Exclusions</dt>
                  <dd>{offer.excluded_audience}</dd>
                </div>
              </dl>
              <p className="mw-cp-why">{offer.rationale}</p>
              {list(offer.success_metrics).length > 0 && (
                <details>
                  <summary>Success metrics</summary>
                  <ul>
                    {list(offer.success_metrics).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
              {list(offer.risks).length > 0 && (
                <details>
                  <summary>Risks and assumptions</summary>
                  <ul>
                    {list(offer.risks).map((item: string, index: number) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
              <footer>
                <span>Saved as a draft in the selected month plan. Costs are needed before approval.</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHead({
  icon: Icon,
  title,
  hint,
  editable = false,
  onTitleChange,
  onHintChange,
  actions,
  onDelete,
  editOn = false,
  canEdit = false,
  onToggleEdit,
}: {
  icon: any;
  title: React.ReactNode;
  hint?: React.ReactNode;
  editable?: boolean;
  onTitleChange?: (next: string) => void;
  onHintChange?: (next: string) => void;
  actions?: React.ReactNode;
  onDelete?: () => void;
  /** This section's own edit mode. */
  editOn?: boolean;
  canEdit?: boolean;
  onToggleEdit?: () => void;
}) {
  // A section reads as a heading until someone asks to rename it: the pencil is the door,
  // not a permanent pair of text boxes sitting in the header.
  const [renaming, setRenaming] = useState(false);
  const canRename = editable && Boolean(onTitleChange) && typeof title === 'string';
  const showActions =
    Boolean(actions) || (editable && Boolean(onDelete)) || canRename || (canEdit && Boolean(onToggleEdit));
  return (
    <header className={`mw-sh${showActions ? ' has-actions' : ''}${renaming ? ' is-renaming' : ''}`}>
      <span className="mw-sh-icon">
        <Icon size={16} />
      </span>
      <div className="mw-sh-copy">
        {canRename && renaming ? (
          <input
            className="mw-sh-title-in"
            aria-label="Section title"
            autoFocus
            value={title as string}
            onChange={e => onTitleChange!(e.target.value)}
            onBlur={() => setRenaming(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <h4>{title}</h4>
        )}
        {canRename && renaming && onHintChange && (typeof hint === 'string' || hint === undefined) ? (
          <input
            className="mw-sh-hint-in"
            aria-label="Section subtitle"
            placeholder="Section description…"
            value={hint || ''}
            onChange={e => onHintChange(e.target.value)}
          />
        ) : (
          hint && <p>{hint}</p>
        )}
      </div>
      {showActions && (
        <div className="mw-sh-actions">
          {canEdit && onToggleEdit && (
            <button
              type="button"
              className={`mw-sh-edit${editOn ? ' is-on' : ''}`}
              aria-pressed={editOn}
              title={
                editOn ? `Done editing ${typeof title === 'string' ? title : 'this section'}` : 'Edit this section'
              }
              aria-label={editOn ? 'Done editing this section' : 'Edit this section'}
              onClick={onToggleEdit}
            >
              {editOn ? <Check size={13} /> : <Pencil size={13} />}
              <span>{editOn ? 'Done' : 'Edit'}</span>
            </button>
          )}
          {actions}
          {canRename && (
            <button
              type="button"
              className={`mw-mini-icon mw-sh-rename${renaming ? ' is-on' : ''}`}
              title={renaming ? 'Done renaming' : 'Rename this section'}
              aria-label={renaming ? 'Done renaming section' : 'Rename this section'}
              aria-pressed={renaming}
              onClick={() => setRenaming(v => !v)}
            >
              <Pencil size={12.5} />
            </button>
          )}
          {editable && onDelete && (
            <button
              type="button"
              className="mw-mini-icon is-danger"
              title="Delete section from this month"
              aria-label={`Delete ${typeof title === 'string' ? title : 'section'}`}
              onClick={onDelete}
            >
              <Trash2 size={13.5} />
            </button>
          )}
        </div>
      )}
    </header>
  );
}

function Act({
  icon: Icon,
  label,
  title,
  text,
  tone,
  editable = false,
  labelEditable = false,
  onChange,
  onRemove,
}: any) {
  return (
    <div className={`mw-act mw-act-${tone}`}>
      <Icon size={15} />
      <div>
        {editable && labelEditable ? (
          <input
            className="mw-act-label"
            aria-label="Activation type"
            value={label}
            onChange={e => onChange({ label: e.target.value })}
          />
        ) : (
          <small>{label}</small>
        )}
        {editable ? (
          <div className="mw-act-edit">
            <input
              aria-label={`${label} title`}
              placeholder="Title"
              value={title}
              onChange={e => onChange({ title: e.target.value, text })}
            />
            <textarea
              aria-label={`${label} details`}
              placeholder="Mechanics, dates, owner"
              rows={3}
              value={text}
              onChange={e => onChange({ title, text: e.target.value })}
            />
          </div>
        ) : (
          <>
            <strong>{title}</strong>
            <p>{text}</p>
          </>
        )}
      </div>
      {editable && onRemove && (
        <button
          type="button"
          className="mw-act-remove"
          aria-label={`Remove ${label}`}
          title="Remove activation"
          onClick={onRemove}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// Volumes as two compact charts: the acquisition funnel (bars taper from leads, with step conversion) and the
// lifecycle asks (renewals of those due, comebacks of the lapsed pool). Custom metrics sit underneath as chips.
const VOL_DEFAULT_LABELS = ['Leads needed', 'Completed trials', 'New members', 'Renewals needed', 'Reactivations'];
const volLabelEdited = (v: any) => !VOL_DEFAULT_LABELS.includes(v.label);
const SHORT_VOL: Record<string, string> = {
  leads: 'Leads',
  trials: 'Trials',
  buyers: 'New members',
  renewals: 'Renewals',
  reactivations: 'Comebacks',
};
const toNum = (v: any) => Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0;
function VolumesChart({ vols }: { vols: any[] }) {
  const byId = Object.fromEntries(vols.map(v => [v.id, v]));
  const funnel = ['leads', 'trials', 'buyers'].map(id => byId[id]).filter(Boolean);
  const life = ['renewals', 'reactivations'].map(id => byId[id]).filter(Boolean);
  const extra = vols.filter(v => !['leads', 'trials', 'buyers', 'renewals', 'reactivations', 'conv'].includes(v.id));
  const top = Math.max(1, ...funnel.map(v => toNum(v.value)));
  return (
    <div className="mw-volchart">
      {funnel.length > 0 && (
        <div className="mw-volchart-block">
          <div className="mw-volchart-title">
            <span>Acquisition funnel</span>
            {byId.conv && (
              <em title={byId.conv.hint}>
                {byId.conv.value} {byId.conv.label.toLowerCase()}
              </em>
            )}
          </div>
          {funnel.map(v => {
            const val = toNum(v.value);
            return (
              <div key={v.id} className="mw-volchart-row is-acq" title={v.hint}>
                <span className="mw-volchart-label">
                  {v.isCustom || volLabelEdited(v) ? v.label : SHORT_VOL[v.id] || v.label}
                </span>
                <div className="mw-volchart-track">
                  <b style={{ width: `${Math.max(2, (val / top) * 100)}%` }} />
                </div>
                <strong>{v.value}</strong>
                <small>{v.rate ? `${Math.round(v.rate * 100)}% conv.` : ''}</small>
              </div>
            );
          })}
        </div>
      )}
      {life.length > 0 && (
        <div className="mw-volchart-block">
          <div className="mw-volchart-title">
            <span>Lifecycle</span>
          </div>
          {life.map(v => {
            const val = toNum(v.value),
              share = v.of ? val / v.of : 0;
            return (
              <div key={v.id} className={`mw-volchart-row is-${v.id}${share > 1 ? ' is-over' : ''}`} title={v.hint}>
                <span className="mw-volchart-label">
                  {v.isCustom || volLabelEdited(v) ? v.label : SHORT_VOL[v.id] || v.label}
                </span>
                <div className="mw-volchart-track is-share">
                  <b style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }} />
                </div>
                <strong>{v.value}</strong>
                <small>{v.of ? `${Math.round(share * 100)}% of ${number(v.of)}` : ''}</small>
              </div>
            );
          })}
        </div>
      )}
      {extra.length > 0 && (
        <div className="mw-volchart-extra">
          {extra.map(v => (
            <span key={v.id} title={v.hint}>
              {v.label} <b>{v.value}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
