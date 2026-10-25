import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  Calendar,
  CalendarCheck2,
  CalendarHeart,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Flag,
  Gift,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  Lightbulb,
  Link2,
  LockKeyhole,
  ListChecks,
  Minus,
  PartyPopper,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
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
import Marquee from '../../components/Marquee';
import FestivalArt from '../../components/FestivalArt';
import MarketingCollaterals from '../../components/MarketingCollaterals';
import { KEY_DATE_LABELS, formatKeyDate, keyDatesFor } from '../../data/keyDates';
import { OFFER_LIBRARY } from '../../data/offerLibrary';
import { MONTHS, money, number, titleCase } from '../../types';
import type { ActionItem } from '../../data/planDefaults';
import { monthActivations } from './CampaignsTab';
import { lakh, type MonthEconomics, type PlanData } from './usePlanData';

const SLOT_KEYS = ['newcomer', 'lapsed', 'renewal'] as const;
const LIVE = (o: any) => !['archived', 'rejected'].includes(o.status);
const STREAMS = [
  { key: 'newClient', field: 'new_client_target', body: 'newClientTarget', label: 'New clients', color: 'var(--a1)' },
  {
    key: 'renewal',
    field: 'renewal_target',
    body: 'renewalTarget',
    label: 'Renewals',
    color: 'color-mix(in srgb, var(--a1) 62%, #fff)',
  },
  {
    key: 'reactivation',
    field: 'reactivation_target',
    body: 'reactivationTarget',
    label: 'Comeback / reactivation',
    color: 'color-mix(in srgb, var(--a1) 36%, #fff)',
  },
] as const;
const fullCoverageStreams = (target: number, renewal: number, reactivation: number) => {
  const nonNew = Math.max(0, renewal) + Math.max(0, reactivation);
  const factor = nonNew > target && nonNew > 0 ? Math.max(0, target) / nonNew : 1;
  const adjustedRenewal = Math.round(Math.max(0, renewal) * factor);
  const adjustedReactivation = Math.max(0, Math.round(Math.max(0, reactivation) * factor));
  return { newClient: Math.max(0, Math.round(target) - adjustedRenewal - adjustedReactivation), renewal: adjustedRenewal, reactivation: adjustedReactivation };
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
// Renders "- " bullet lines, numbered lines and **bold** from AI or planner text.
const inline = (t: string) => t.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p));
function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const close = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(<Tag key={blocks.length}>{list.items.map((t, i) => <li key={i}>{inline(t)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-•*]\s+(.*)/), num = line.match(/^\d+[.)]\s+(.*)/);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) { close(); list = { ordered, items: [] }; }
      list.items.push((bullet || num)![1]);
    } else {
      close();
      if (line) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  close();
  return <div className="mw-rich">{blocks}</div>;
}
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const MASTER_EDIT_CODE = '9818';
const MASTER_EDIT_SESSION_KEY = 'sales-plan.master-edit-unlocked';
const hasValidForecast = (o: any) => {
  if (!o || o.data_mode === 'demo' || o.generation_source === 'demo_seed' || o.expected_revenue == null || !Number.isFinite(Number(o.expected_revenue))) return false;
  let financials = o.financials || {};
  if (typeof financials === 'string') {
    try { financials = JSON.parse(financials); } catch { financials = {}; }
  }
  const modeledRevenue = financials.expectedRevenue;
  return modeledRevenue == null || Math.abs(n(o.expected_revenue) - n(modeledRevenue)) <= Math.max(2, Math.abs(n(modeledRevenue)) * 0.0001);
};
const forecastRevenue = (o: any) => hasValidForecast(o) ? n(o.expected_revenue) : 0;
const monthContentWithCalendar = (content: any, year: number, month: number) => {
  const curated = keyDatesFor(year, month);
  if (content?.keyDatesCustomized && Array.isArray(content?.keyDates)) {
    return { ...(content || {}), keyDates: [...content.keyDates], activations: content?.activations || {} };
  }
  const keyDates = Array.isArray(content?.keyDates) ? [...content.keyDates] : [];
  for (const date of curated) {
    const match = keyDates.findIndex((saved: any) => saved.name === date.name || (saved.day === date.day && saved.kind === date.kind));
    if (match < 0) keyDates.push(date);
    else if (keyDates[match].name === date.name) keyDates[match] = { ...keyDates[match], kind: date.kind };
  }
  return { ...(content || {}), keyDates, activations: content?.activations || {} };
};
const pct = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(d)}%`);

// What the team should focus on each month (from the 2027 Annual Sales and Offer Plan).
const FOCUS_POINTS: Record<number, string[]> = {
  1: ['Convert January trials within 72 hours', 'Re-up the Jan-2026 annuals in Annual Re-Up week (1–10 Jan)', 'Push first buyers onto 3M, not packs', 'Open limited-run format #1 to renewed members'],
  2: ['Duo and referral acquisition instead of BOGO', 'Both buyers must be new — check in Momence', 'Galentine’s hosted class with a door offer (Sat 13 Feb)', 'Ask for a referral at every renewal'],
  3: ['Stop March trials waiting for April', 'Start Bandra reactivation: Class of 2024 Reunion', 'Lock in Mar–Apr renewals at list with bonus time', 'Build the April pre-game list (25–31 Mar)'],
  4: ['Founding 57: sell numbered annuals at full price', 'Value scales with commitment — no deep codes', 'Anniversary hosted classes in week 2 with a named associate', 'Hard close 30 Apr 23:59'],
  5: ['Retain the April cohort: 8 classes in May', 'Week-1 call for every April buyer', 'Mother’s Day duo acquisition (Sun 9 May)', 'Target ≥55% renewal at next expiry'],
  6: ['Freeze, don’t leave: stop summer lapses', 'Launch Golden Hours for students in low-fill slots', 'Capture visiting students and NRIs', 'Father’s Day duo (Sun 20 Jun)'],
  7: ['Cut late cancels (Kenkere target <15%)', 'Monsoon Streak leaderboard by studio', 'Usage-led monsoon renewals', 'Open limited-run format #2'],
  8: ['Move 1M renewers with 8+ visits to 3M', 'Friendship Day squad classes (Sun 1 Aug)', 'Friend-led acquisition, both buyers new', 'Work the high-value lapsed list in Mumbai’s second peak'],
  9: ['Start the 57 Days to Diwali cohort (2 Sep)', 'Reactivate before the festive season', 'Lock 3M renewals through Oct–Dec', 'Repeat the Bandra reunion'],
  10: ['Gift a Shake cards on sale from 1 Oct', 'Protect Kenkere’s Dasara trough with freezes', 'Capture Kwality’s late-October surge without codes', 'Candle-lit evening classes in Diwali week'],
  11: ['Lock long commitments in the softest month', 'Founding 57 second wave — remaining seats only', 'Black Friday → Cyber Monday window (26–29 Nov)', 'Manager calls to high-value lapsers'],
  12: ['Pre-sell January with flexible start dates', 'Send every client their 2027 Wrapped', 'Renew on the usage-based prescription', 'Second gifting window: Gift the Habit'],
};

// Days from today to a day in the plan month (negative once it has passed).
const daysUntil = (year: number, month: number, day: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86400000);
};
// How each kind of important day is usually worked, shown when a day card is opened.
const DAY_PLAYS: Record<string, { play: string; lead: number; channel: string; pairs: string[] }> = {
  festival: { play: 'Gift-led message and a themed hosted class in the festival week; keep the offer as a bonus, not a deeper code.', lead: 10, channel: 'WhatsApp broadcast + in-studio tent cards', pairs: ['newcomer', 'lapsed'] },
  holiday: { play: 'Expect lighter attendance: push freezes and pre-booking, and open a holiday-morning class for regulars.', lead: 7, channel: 'Email to members + WhatsApp reminder', pairs: ['renewal'] },
  awareness: { play: 'Purpose-led story with a community class; invite members to bring a friend for their first class.', lead: 7, channel: 'Instagram + WhatsApp', pairs: ['newcomer'] },
  global: { play: 'Tie the day to a squad or cohort class and use it as the hook for the month’s newcomer offer.', lead: 10, channel: 'Instagram + email', pairs: ['newcomer'] },
  retail: { play: 'Short, named window (48–96 hours) on commitment products, with a hard close.', lead: 5, channel: 'Email + WhatsApp countdown', pairs: ['newcomer', 'renewal'] },
  brand: { play: 'Members-first moment: early access for renewers, then open to new clients with a public counter.', lead: 14, channel: 'All channels + studio takeover', pairs: ['renewal'] },
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
  const { boot, year, can, toast } = useApp(),
    navigate = useNavigate();
  // Offer library sidebar: width is draggable and it can collapse to a rail; both are remembered per browser.
  const stored = (k: string) => {
    try { return localStorage.getItem(k); } catch { return null; }
  };
  const [sideW, setSideW] = useState(() => Number(stored('mw-side-w')) || 340),
    [sideOpen, setSideOpen] = useState(() => stored('mw-side-open') !== '0');
  useEffect(() => {
    try { localStorage.setItem('mw-side-w', String(sideW)); localStorage.setItem('mw-side-open', sideOpen ? '1' : '0'); } catch {}
  }, [sideW, sideOpen]);
  const dragSide = (e: React.PointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = sideW;
    const move = (ev: PointerEvent) => setSideW(Math.min(640, Math.max(260, w0 + x0 - ev.clientX)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.cursor = ''; };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const [studioIdx, setStudioIdx] = useState(0),
    [solo, setSolo] = useState(false),
    [mathsOpen, setMathsOpen] = useState(false),
    [prices, setPrices] = useState<Prices | null>(null),
    [masterUnlocked, setMasterUnlocked] = useState(() => {
      try { return typeof window !== 'undefined' && window.sessionStorage.getItem(MASTER_EDIT_SESSION_KEY) === 'yes'; }
      catch { return false; }
    }),
    [masterCode, setMasterCode] = useState(''),
    [masterCodeError, setMasterCodeError] = useState('');
  const plan = data.plans[studioIdx],
    studio = plan.studio,
    row = plan.months[month - 1],
    econ = plan.economics.months[month - 1],
    combinedRow = data.months[month - 1];
  const canEditPlan = can('target_edit');
  const canApprovePlan = can('target_approve');
  const canApproveOffers = can('offer_approve');
  const targetRow = plan.detail.targets.find((t: any) => t.month === month);
  const saved = plan.detail.plans.find((p: any) => p.month === month);
  const locked = saved?.status === 'approved';
  const editable = canEditPlan && masterUnlocked && !locked;
  // Adding, removing and swapping offers needs no passcode.
  const offersEditable = (canEditPlan || can('offer_edit')) && !locked;
  const others = 3;

  useEffect(() => {
    api<Prices>('/studio-plans/products/prices')
      .then(setPrices)
      .catch(() => {});
  }, []);

  // Offers this studio can pick from (Pop-up includes its venues).
  const ownIds = useMemo(() => locationStudioIds(studio, boot.studios), [studio, boot.studios]);
  const ownOffers = useMemo(
    () => data.offers.filter(o => LIVE(o) && o.data_mode !== 'demo' && o.generation_source !== 'demo_seed' && ownIds.includes(o.studio_id)),
    [data.offers, ownIds],
  );
  const exists = (id: any) => id && ownOffers.some(o => o.id === id);
  const slots: Record<string, number | null> = Object.fromEntries(
    SLOT_KEYS.map(slot => [
      slot,
      saved?.slots
        ? exists(saved.slots[slot])
          ? saved.slots[slot]
          : null
        : (ownOffers.find(o => o.month === month && o.generation_source === 'plan_2027' && o.plan_slot === slot && o.plan_rank === 1)?.id ?? null),
    ]),
  );
  const extras: number[] = Array.isArray(saved?.offer_ids)
    ? saved.offer_ids.filter(exists)
    : ownOffers
        .filter(o => o.month === month && o.generation_source === 'plan_2027' && !o.plan_slot)
        .sort((a, b) => n(b.expected_revenue) - n(a.expected_revenue))
        .map(o => o.id)
        // Unsaved months start with at most four offers; more can be added by hand.
        .slice(0, Math.max(0, 4 - Object.values(slots).filter(Boolean).length));
  const selectedIds = [...(Object.values(slots).filter(Boolean) as number[]), ...extras];
  const selected = selectedIds.map(id => ownOffers.find(o => o.id === id)).filter(Boolean) as any[];
  const slotOf = (id: number) => Object.entries(slots).find(([, v]) => v === id)?.[0];
  const alternates = ownOffers
    .filter(o => !selectedIds.includes(o.id))
    .sort(
      (a, b) =>
        (a.month === month ? 0 : 1) - (b.month === month ? 0 : 1) ||
        Math.abs((a.month || 13) - month) - Math.abs((b.month || 13) - month) ||
        n(b.expected_revenue) - n(a.expected_revenue),
    );
  const [flippedAlt, setFlippedAlt] = useState<number | null>(null);
  const [altQuery, setAltQuery] = useState('');
  const [altScope, setAltScope] = useState<'all' | 'month' | 'newcomer' | 'lapsed' | 'renewal'>('all');
  const filteredAlternates = useMemo(() => {
    const q = altQuery.trim().toLowerCase();
    return alternates.filter(o => {
      if (altScope === 'month' && o.month !== month) return false;
      if (altScope === 'newcomer' && o.plan_slot !== 'newcomer' && !['acquisition', 'trial_conversion', 'new_client', 'referral'].includes(o.objective))
        return false;
      if (altScope === 'lapsed' && o.plan_slot !== 'lapsed' && o.objective !== 'reactivation') return false;
      if (altScope === 'renewal' && o.plan_slot !== 'renewal' && !['retention', 'annual_membership', 'additional_purchase', 'aov'].includes(o.objective))
        return false;
      if (!q) return true;
      const hay = `${o.name || ''} ${o.benefit || ''} ${o.headline || ''} ${o.audience || ''} ${o.offer_type || ''}`.toLowerCase();
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
  const ideas = OFFER_LIBRARY.filter(t => t.months.includes(month));
  const offerRevenue = selected.reduce((s, o) => s + forecastRevenue(o), 0);
  const groups = ['New clients', 'Ticket & renewal', 'Comeback / reactivation', 'Other'].map(g => ({
    label: g,
    offers: selected.filter(o => (STREAM_OF[o.objective] || 'Other') === g),
  }));

  const initialEffectiveTarget = targetRow?.approved_target ?? targetRow?.proposed_target;
  const initialScale = targetRow && n(targetRow.proposed_target) ? n(initialEffectiveTarget) / n(targetRow.proposed_target) : 1;
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
    [twoUpForce, setTwoUpForce] = useState<boolean | null>(null),
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
  }, [month, studioIdx]);
  useEffect(() => setActiveDay(null), [month, studioIdx]);
  useEffect(() => setMathsOpen(false), [month, studioIdx]);
  const set = (patch: Partial<ReturnType<typeof initialForm>>) => setForm(f => ({ ...f, ...patch }));
  const updateContent = (patch: Record<string, unknown>) => setForm(f => ({ ...f, content: { ...(f.content || {}), ...patch } }));
  const hiddenSections: string[] = Array.isArray(form.content?.hiddenSections) ? form.content.hiddenSections : [];
  const isSectionVisible = (secKey: string) => !hiddenSections.includes(secKey);
  const hideSection = (secKey: string) =>
    updateContent({ hiddenSections: [...new Set([...hiddenSections, secKey])] });
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
  const customSections: CustomSection[] = Array.isArray(form.content?.customSections) ? form.content.customSections : [];
  const setCustomSections = (next: CustomSection[]) => updateContent({ customSections: next });
  const addCustomSection = () => {
    const created: CustomSection = {
      id: `custom-${Date.now()}`,
      title: 'Custom section',
      hint: 'Add notes, milestones or studio-specific playbooks for this month.',
      body: '',
      items: [
        { id: `item-${Date.now()}`, label: 'Priority', value: 'Studio initiative', detail: 'Owner, timeline and expected outcome.' },
      ],
    };
    setCustomSections([...customSections, created]);
    setTimeout(() => document.getElementById(`mw-sec-${created.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const updateCustomSection = (id: string, patch: Partial<CustomSection>) =>
    setCustomSections(customSections.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const removeCustomSection = (id: string) =>
    setCustomSections(customSections.filter(s => s.id !== id));

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
      const lead = [...mine].filter(o => forecastRevenue(o) > 0).sort((a, b) => forecastRevenue(b) - forecastRevenue(a))[0];
      const asp = n(lead?.expected_asp);
      return { label, target, offer, gap, picks, left: Math.max(0, left), lead, extra: asp && left > 0 ? Math.ceil(left / asp) : 0 };
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
      const r = await api<{ added: number[]; raised: number[]; short: number }>(`/studio-plans/${studio.id}/${year}/${month}/cover`, { method: 'POST' });
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
      !!targetRow && STREAMS.some(s => n(f.streams[s.key]) !== Math.round(n(approved ? initialStreams[s.key] : targetRow[s.field])));
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
    else await api(`/studio-plans/${studio.id}/${year}/${month}`, { method: 'PUT', body: JSON.stringify(planBodyOf(f)) });
    lastSaved.current = JSON.stringify(planBodyOf(f));
    setAutoState('saved');
    skipReset.current = true;
    await onSaved();
  };

  const [generating, setGenerating] = useState(false);
  const generateFocus = async () => {
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
        }),
      });
      const next = {
        ...form,
        theme: ai.theme,
        objective: ai.objective,
        strategy: ai.strategy,
        streams,
        actions: ai.actionPlan.map(a => ({ ...a, done: false })),
        content: {
          ...(form.content || {}),
          focusPoints: ai.focusPoints,
          ai: {
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
      await persistForm(next);
      toast(`${MONTHS[month - 1]} plan written by AI and saved.`);
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
        !form.actions.some(action => action.text.trim() && String(action.owner || '').trim()) && 'an action with a named owner',
      ].filter(Boolean);
      if (missing.length) return toast(`Complete the ${missing.join(', ')} before approving this month.`, 'error');
      const uncovered = gapRows.filter(g => g.gap > 1);
      if (uncovered.length)
        return toast(`Selected offers leave revenue gaps: ${uncovered.map(g => `${g.label} ${lakh(g.gap)} short`).join('; ')}.`, 'error');
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
      await api(`/offers/${offer.id}/action`, { method: 'POST', body: JSON.stringify({ action: approve ? 'approve' : 'unapprove' }) });
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
  const askCopilot = async (mode: 'suggest' | 'replace' | 'optimise', replaceOfferId?: number) => {
    setCopilot({ mode, replaceOfferId, loading: true, proposals: [] });
    try {
      const r = await api<{ summary: string; proposals: Proposal[] }>(
        `/studio-plans/${studio.id}/${year}/${month}/offers/ai`,
        {
          method: 'POST',
          body: JSON.stringify({
            mode,
            replaceOfferId,
            studioName: studio.name,
            monthName: MONTHS[month - 1],
            theme: form.theme,
            target: effective,
            steer,
            streams: gapRows.map(g => ({ label: g.label, target: Math.round(g.target), offerLed: Math.round(g.offer) })),
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
          }),
        },
      );
      setCopilot({ mode, replaceOfferId, loading: false, ...r, created: [] });
      if (mode === 'suggest' && r.proposals.length) {
        setCopilot({ mode, replaceOfferId, loading: false, creating: true, summary: r.summary, proposals: r.proposals, created: [] });
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
        const result = await api<{ offerId: number; offer: any }>(`/studio-plans/${studio.id}/${year}/${month}/offers/ai/apply`, {
          method: 'POST',
          body: JSON.stringify({ proposal, solo }),
        });
        done++;
        created.push({ proposal, offerId: result.offerId, offer: result.offer });
        setCopilot(c => c && { ...c, proposals: c.proposals.filter(p => p !== proposal) });
      }
      await onSaved();
      setCopilot(c => c && ({
        ...c,
        creating: false,
        proposals: c.proposals.filter(p => !list.includes(p)),
        created: [...(c.created || []), ...created],
        summary: `${created.length} complete draft offer${created.length === 1 ? '' : 's'} created and added to ${MONTHS[month - 1]} for ${studio.name}.`,
      }));
      toast(`${done} offer change${done > 1 ? 's' : ''} applied to ${MONTHS[month - 1]}.`);
    } catch (e: any) {
      if (done) await onSaved();
      if (done) setCopilot(c => c && ({ ...c, creating: false, created: [...(c.created || []), ...created] }));
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (streamsMismatch) return toast('New-client, renewal, and comeback revenue must add up to the monthly target.', 'error');
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
        onClose();
        return;
      }
      const el = e.target as HTMLElement | null;
      if (
        !el ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ||
        el.isContentEditable ||
        e.metaKey ||
        e.ctrlKey
      )
        return;
      if (e.key === '[' && month > 1) {
        e.preventDefault();
        setMonth(month - 1);
      } else if (e.key === ']' && month < 12) {
        e.preventDefault();
        setMonth(month + 1);
      } else if (e.key === '\\') {
        e.preventDefault();
        setSideOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [month, onClose, setMonth]);

  const jumpToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyMonthBrief = async () => {
    const lines = [
      `PHYSIQUE 57 · ${MONTHS[month - 1].toUpperCase()} ${year} COMMERCIAL BRIEF — ${studio.name.toUpperCase()}`,
      `Theme: ${form.theme || row.theme || '—'}`,
      `Monthly Target: ${lakh(effective)} (New clients ${lakh(form.streams.newClient)} · Renewals ${lakh(form.streams.renewal)} · Comeback ${lakh(form.streams.reactivation)})`,
      form.objective ? `Objective: ${form.objective}` : '',
      dates.length ? `Key Moments: ${dates.map(d => `${formatKeyDate(d)} ${MONTHS[month - 1].slice(0, 3)} (${d.name})`).join(', ')}` : '',
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
  const unlockEditing = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (masterCode !== MASTER_EDIT_CODE) {
      setMasterCodeError('That passcode is incorrect.');
      setMasterCode('');
      return;
    }
    try { window.sessionStorage.setItem(MASTER_EDIT_SESSION_KEY, 'yes'); } catch { /* Keep the unlock active for this modal session. */ }
    setMasterUnlocked(true);
    setMasterCode('');
    setMasterCodeError('');
  };
  const lockEditing = () => {
    try { window.sessionStorage.removeItem(MASTER_EDIT_SESSION_KEY); } catch { /* State still locks the current modal. */ }
    setMasterUnlocked(false);
  };

  return (
    <div className="mw-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section
        className={`mw accented ${editable ? 'is-editable' : 'is-readonly'}`}
        role="dialog"
        aria-label={`${MONTHS[month - 1]} plan`}
        style={{ '--a1': accentFor(studio.name) } as React.CSSProperties}
      >
        <header className="mw-hero">
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
                  {(form.theme || row.theme) && (
                    <>
                      <i className="mw-title-sep" aria-hidden="true" />
                      <span className="mw-theme-sub">{form.theme || row.theme}</span>
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
              {canEditPlan && (
                masterUnlocked ? (
                  <div className="mw-edit-status"><span><Pencil size={11} /> Edit mode</span><Button variant="secondary" icon={<LockKeyhole size={13} />} onClick={lockEditing}>Lock</Button></div>
                ) : (
                  <form className="mw-hero-gate" onSubmit={unlockEditing}>
                    <LockKeyhole size={13} />
                    <input
                      aria-label="Master passcode"
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      value={masterCode}
                      onChange={e => { setMasterCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setMasterCodeError(''); }}
                      placeholder="Passcode"
                    />
                    <button type="submit" disabled={masterCode.length !== 4}>Unlock</button>
                    {masterCodeError && <span className="mw-hero-gate-error" role="alert">{masterCodeError}</span>}
                  </form>
                )
              )}
              {editable && (
                <label className={`mw-solo ${solo ? 'on' : ''}`} title="When off, offer changes copy to every location">
                  <input type="checkbox" checked={solo} onChange={e => setSolo(e.target.checked)} />
                  <span className="mw-switch" />
                  {solo ? <Unlink size={13} /> : <Link2 size={13} />}
                  {solo ? `Solo: ${studio.name} only` : 'Synced to all locations'}
                </label>
              )}
              {canApprovePlan && masterUnlocked && (
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
          <div className="mw-kpis" key={`kpis-${month}-${studio.id}`}>
            <div className="mw-kpi" style={{ '--kpi-i': 0 } as React.CSSProperties}>
              <span className="mw-kpi-label"><Target size={12} /> Target</span>
              <div className="mw-kpi-row">
                <strong>{lakh(effective)}</strong>
                <small>
                  {approved ? 'approved' : 'proposed'} · LY {lakh(row.lastYear)}
                </small>
              </div>
              <i className="mw-kpi-bar" style={{ '--p': row.lastYear ? Math.min(effective / row.lastYear / 2, 1) : 0.62 } as React.CSSProperties} />
            </div>
            <div className="mw-kpi" style={{ '--kpi-i': 1 } as React.CSSProperties}>
              <span className="mw-kpi-label"><Trophy size={12} /> Offers carry</span>
              <div className="mw-kpi-row">
                <strong>{lakh(offerRevenue)}</strong>
                <small>
                  {selected.length} offers · {effective ? pct(offerRevenue / effective) : '—'}
                </small>
              </div>
              <i className="mw-kpi-bar" style={{ '--p': effective ? Math.min(offerRevenue / effective, 1) : 0 } as React.CSSProperties} />
            </div>
            <div className={`mw-kpi ${coverage !== null && coverage < 1 ? 'warn' : ''}`} style={{ '--kpi-i': 2 } as React.CSSProperties}>
              <span className="mw-kpi-label"><RefreshCcw size={12} /> Renewals covered</span>
              <div className="mw-kpi-row">
                <strong>{pct(coverage)}</strong>
                <small>
                  {lakh(econ?.renewal.expected)} of {lakh(econ?.renewal.target)}
                </small>
              </div>
              <i className="mw-kpi-bar" style={{ '--p': Math.min(coverage ?? 0, 1) } as React.CSSProperties} />
            </div>
            <div className="mw-kpi" style={{ '--kpi-i': 3 } as React.CSSProperties}>
              <span className="mw-kpi-label"><SlidersHorizontal size={12} /> Funnel</span>
              <div className="mw-kpi-funnel">
                <b>{number(row.leads)}<em>leads</em></b>
                <ChevronRight size={11} />
                <b>{number(row.trials)}<em>trials</em></b>
                <ChevronRight size={11} />
                <b>{number(row.buyers)}<em>members</em></b>
              </div>
              <i className="mw-kpi-bar is-funnel" style={{ '--p': row.leads ? Math.min(row.trials / Math.max(1, row.leads), 1) : 0.45 } as React.CSSProperties} />
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

        <div className="mw-marquee-dock">
          <Marquee
            variant="minimal"
            tag="MONTH PULSE"
            items={[
              ...dates.map(d => ({
                label: d.name,
                value: `${formatKeyDate(d)} ${MONTHS[month - 1].slice(0, 3)}`,
                onClick: () => jumpToSection('mw-sec-days'),
              })),
              { label: 'Theme', value: form.theme || row.theme, tone: 'accent' as const, onClick: () => jumpToSection('mw-sec-focus') },
              ...(econ
                ? [
                    { label: 'Avg first spend', value: money(econ.newClient.firstSpend, true) },
                    { label: 'Trial → member', value: pct(econ.newClient.trialToMember) },
                    { label: 'Lead → trial', value: pct(econ.newClient.leadToTrial) },
                    { label: 'Memberships expiring', value: number(econ.renewal.projectedExpiries) },
                    { label: 'Renewal rate', value: pct(econ.renewal.renewalRate) },
                    ...(econ.renewal.gap > 0
                      ? [{ label: 'Renewal gap', value: lakh(econ.renewal.gap), tone: 'warn' as const, onClick: () => jumpToSection('mw-sec-coverage') }]
                      : []),
                  ]
                : []),
              ...selected.map(o => ({
                label: o.name,
                value: money(o.expected_revenue, true),
                onClick: () => jumpToSection('mw-sec-offers'),
              })),
            ]}
          />
        </div>

        <div
          className={`mw-body pane-offers ${sideOpen ? 'is-side-open' : 'is-side-collapsed'}`}
          style={{ gridTemplateColumns: `minmax(0, 1fr) ${sideOpen ? sideW : 48}px` }}
        >
          <main className={`mw-main ${locked ? 'is-locked' : ''}`}>
            <nav className="mw-quicknav" aria-label="Jump to section">
              <div className="mw-quicknav-links">
                {isSectionVisible('days') && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-days')}>Important days</button>
                )}
                {isSectionVisible('focus') && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-focus')}>Focus &amp; target</button>
                )}
                {isSectionVisible('ai') && (form.content?.ai || editable) && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-ai')}>Reasoning</button>
                )}
                {isSectionVisible('offers') && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-offers')}>
                    Offers <em>{selected.length}</em>
                  </button>
                )}
                {isSectionVisible('coverage') && (gapRows.length > 0 || editable) && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-coverage')}>Coverage</button>
                )}
                {isSectionVisible('acts') && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-acts')}>Activations</button>
                )}
                {isSectionVisible('actions') && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-actions')}>Actions</button>
                )}
                {isSectionVisible('collaterals') && (
                  <button type="button" onClick={() => jumpToSection('mw-sec-collaterals')}>Collaterals</button>
                )}
                {customSections.map(cs => (
                  <button key={cs.id} type="button" onClick={() => jumpToSection(`mw-sec-${cs.id}`)}>
                    {cs.title || 'Custom'}
                  </button>
                ))}
              </div>
              <div className="mw-quicknav-tools">
                {editable && (
                  <button
                    type="button"
                    className="mw-qtool"
                    onClick={addCustomSection}
                    title="Add a new custom section to this month's plan"
                  >
                    <Plus size={13} />
                    <span>Add section</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`mw-qtool${!sideOpen ? ' is-active' : ''}`}
                  onClick={() => setSideOpen(o => !o)}
                  title="Toggle right Offer Library sidebar (shortcut: \)"
                >
                  <LayoutGrid size={13} />
                  <span>{sideOpen ? '2-up offers' : 'Show library'}</span>
                </button>
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

            {editable && hiddenSections.length > 0 && (() => {
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
                  <b>{MONTHS[month - 1]} is approved for {studio.name}.</b> Fields are locked — reopen the month to make changes.
                </span>
              </div>
            )}

            {/* ─── Section 1: Important days ─── */}
            {isSectionVisible('days') && (() => {
              const meta = sectionMeta('days', 'Important days', 'Festivals, holidays and moments that shape demand.');
              const setDates = (nextDates: any[]) => updateContent({ keyDates: nextDates, keyDatesCustomized: true });
              return (
                <div id="mw-sec-days" className="mw-section mw-days">
                  <SectionHead
                    icon={CalendarHeart}
                    title={meta.title}
                    hint={meta.hint}
                    editable={editable}
                    onTitleChange={v => patchSectionMeta('days', { title: v })}
                    onHintChange={v => patchSectionMeta('days', { hint: v })}
                    onDelete={() => hideSection('days')}
                    actions={
                      editable ? (
                        <>
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => {
                              const next = [...dates, { day: 1, name: 'New moment', kind: 'awareness', approx: false }];
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
                              onClick={() => updateContent({ keyDates: keyDatesFor(year, month), keyDatesCustomized: false })}
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
                            className={`mw-day kd-${d.kind}${open ? ' is-open' : ''}`}
                            role={editable ? undefined : 'button'}
                            tabIndex={editable ? undefined : 0}
                            aria-expanded={editable ? undefined : open}
                            onClick={editable ? undefined : () => setActiveDay(open ? null : di)}
                            onKeyDown={editable ? undefined : e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setActiveDay(open ? null : di))}
                          >
                            <div
                              className="mw-day-art"
                              onClick={editable ? () => setActiveDay(open ? null : di) : undefined}
                              style={editable ? { cursor: 'pointer' } : undefined}
                              title={editable ? 'Click to edit play & channel details' : undefined}
                            >
                              <FestivalArt name={d.name} kind={d.kind} />
                              <span className="mw-day-date">
                                <b>{formatKeyDate(d)}</b>
                                <small>{MONTHS[month - 1].slice(0, 3)}</small>
                              </span>
                            </div>
                            <div className="mw-day-body">
                              {editable ? (
                                <div className="mw-inline-edit">
                                  <input
                                    aria-label="Important day name"
                                    placeholder="Holiday or moment"
                                    value={d.name}
                                    onChange={e => setDates(dates.map((x: any, i: number) => (i === di ? { ...x, name: e.target.value } : x)))}
                                  />
                                  <div>
                                    <select
                                      aria-label="Important day type"
                                      value={d.kind}
                                      onChange={e => setDates(dates.map((x: any, i: number) => (i === di ? { ...x, kind: e.target.value } : x)))}
                                    >
                                      {Object.entries(KEY_DATE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                      ))}
                                    </select>
                                    <input
                                      aria-label="Day of month"
                                      type="number"
                                      min={1}
                                      max={31}
                                      value={d.day}
                                      onChange={e =>
                                        setDates(
                                          dates.map((x: any, i: number) =>
                                            i === di ? { ...x, day: Math.min(31, Math.max(1, Number(e.target.value) || 1)) } : x,
                                          ),
                                        )
                                      }
                                    />
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={!!d.approx}
                                        onChange={e => setDates(dates.map((x: any, i: number) => (i === di ? { ...x, approx: e.target.checked } : x)))}
                                      />{' '}
                                      Approx.
                                    </label>
                                    <button
                                      type="button"
                                      title="Edit play & channels"
                                      aria-label={`Edit details for ${d.name || 'day'}`}
                                      onClick={() => setActiveDay(open ? null : di)}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${d.name}`}
                                      onClick={() => {
                                        if (activeDay === di) setActiveDay(null);
                                        setDates(dates.filter((_: any, i: number) => i !== di));
                                      }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <strong>{d.name}</strong>
                                  <span className="mw-day-meta">
                                    <em>{KEY_DATE_LABELS[d.kind as keyof typeof KEY_DATE_LABELS]}</em>
                                    <i className={left < 0 ? 'is-past' : left <= 14 ? 'is-soon' : ''}>
                                      {left < 0 ? 'Passed' : left === 0 ? 'Today' : `in ${left}d`}
                                    </i>
                                  </span>
                                </>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mw-action-empty">No important days listed for {MONTHS[month - 1]}.</p>
                  )}
                  {activeDay !== null && dates[activeDay] && (() => {
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
                            {formatKeyDate(d)} {MONTHS[month - 1]} · {KEY_DATE_LABELS[d.kind as keyof typeof KEY_DATE_LABELS]}
                            {d.approx ? ' · date to confirm' : ''}
                          </small>
                          <h5>{d.name || 'Untitled moment'}</h5>
                          {editable ? (
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
                            {editable ? (
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
                            {editable ? (
                              <input
                                className="mw-day-inline-text"
                                value={channelText}
                                onChange={e => patchDay({ channel: e.target.value })}
                              />
                            ) : (
                              channelText
                            )}
                          </li>
                          {pair && <li><b>Pair with</b> {pair.name}</li>}
                        </ul>
                        <button type="button" aria-label="Close" onClick={() => setActiveDay(null)}><X size={14} /></button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ─── Section 2: Monthly focus & target (ONE Unified Cohesive Canvas) ─── */}
            {isSectionVisible('focus') && (() => {
              const meta = sectionMeta(
                'focus',
                'Monthly focus & target',
                'Commercial narrative, monthly revenue goal, stream mix and required funnel volumes in one unified brief.',
              );
              const points: string[] = Array.isArray(form.content?.focusPoints)
                ? form.content.focusPoints
                : FOCUS_POINTS[month] || [];
              const setPoints = (next: string[]) => updateContent({ focusPoints: next });
              const volOverrides: Record<string, { label?: string; tag?: string; value?: string; hint?: string }> =
                form.content?.volumeOverrides || {};
              const hiddenVols: string[] = Array.isArray(form.content?.hiddenVolumes) ? form.content.hiddenVolumes : [];
              const customVols: Array<{ id: string; label: string; tag: string; kind: string; value: string; hint: string }> =
                Array.isArray(form.content?.customVolumes) ? form.content.customVolumes : [];
              const baseVols = (() => {
                if (!econ) return [];
                const liveNewTarget = editable ? Math.max(0, n(form.streams.newClient)) : n(econ.newClient.target);
                const liveRenTarget = editable ? Math.max(0, n(form.streams.renewal)) : n(econ.renewal.target);
                const liveReactTarget = editable ? Math.max(0, n(form.streams.reactivation)) : n(econ.reactivation.target);
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
                  { id: 'leads', label: 'Leads needed', tag: 'Step 1', kind: 'acq', value: number(liveLeads), hint: 'Top-of-funnel leads' },
                  { id: 'trials', label: 'Completed trials', tag: 'Step 2', kind: 'acq', value: number(liveTrials), hint: `${pct(econ.newClient.leadToTrial)} lead → trial` },
                  { id: 'buyers', label: 'New members', tag: 'Step 3', kind: 'acq', value: number(liveBuyers), hint: `${pct(econ.newClient.trialToMember)} trial → member` },
                  { id: 'renewals', label: 'Renewals needed', tag: 'Retention', kind: 'ret', value: number(liveRenewals), hint: `of ${number(econ.renewal.projectedExpiries)} due · ${pct(econ.renewal.renewalRate)}` },
                  { id: 'reactivations', label: 'Reactivations', tag: 'Comeback', kind: 'ret', value: number(liveReactivations), hint: `from ${number(econ.reactivation.lapsedPool)} lapsed` },
                  { id: 'conv', label: 'Lead → member', tag: 'Net conv.', kind: 'conv', value: pct(liveLeads ? liveBuyers / liveLeads : 0, 1), hint: 'End-to-end conversion' },
                ];
              })();
              const visibleBaseVols = baseVols
                .filter(v => !hiddenVols.includes(v.id))
                .map(v => ({ ...v, ...(volOverrides[v.id] || {}), isCustom: false }));
              const allVols = [...visibleBaseVols, ...customVols.map(v => ({ ...v, isCustom: true }))];
              const yoyDelta = row.lastYear > 0 ? Math.round(((effective - row.lastYear) / row.lastYear) * 100) : null;

              return (
                <div id="mw-sec-focus" className="mw-section mw-planning-section">
                  <SectionHead
                    icon={Flag}
                    title={meta.title}
                    hint={meta.hint}
                    editable={editable}
                    onTitleChange={v => patchSectionMeta('focus', { title: v })}
                    onHintChange={v => patchSectionMeta('focus', { hint: v })}
                    onDelete={() => hideSection('focus')}
                    actions={
                      editable ? (
                        <button
                          type="button"
                          className="mw-ai"
                          disabled={generating || busy}
                          onClick={generateFocus}
                          title="Write the focus, stream split, action plan and reasoning from this month's dates, offers and target, then save"
                        >
                          <Sparkles size={14} />
                          {generating ? 'Writing plan…' : form.strategy ? 'Regenerate with AI' : 'Enhance with AI'}
                        </button>
                      ) : undefined
                    }
                  />

                  <div className="mw-focus-unified">
                    {/* Band 1: Unified Story & Headline Commercial Target Horizon */}
                    <div className="mw-fu-top">
                      <div className="mw-fu-story">
                        <label className="mw-fu-theme">
                          <span>Monthly theme</span>
                          <input
                            value={form.theme}
                            placeholder="Name the month’s campaign story"
                            onChange={e => set({ theme: e.target.value })}
                            {...fieldProps}
                          />
                        </label>
                        <label className="mw-fu-objective">
                          <span><Target size={12.5} /> Commercial objective</span>
                          <input
                            value={form.objective}
                            placeholder="The primary commercial job this month delivers"
                            onChange={e => set({ objective: e.target.value })}
                            {...fieldProps}
                          />
                        </label>
                      </div>

                      <div className="mw-fu-target-box">
                        <div className="mw-fu-target-meta">
                          <span>{approved ? 'Approved monthly target' : 'Proposed monthly target'}</span>
                          {yoyDelta !== null && (
                            <em className={yoyDelta >= 0 ? 'is-pos' : 'is-neg'}>
                              {yoyDelta >= 0 ? `+${yoyDelta}%` : `${yoyDelta}%`} vs LY
                            </em>
                          )}
                        </div>
                        <div className="mw-money big">
                          <em className="cur">₹</em>
                          <input
                            aria-label="Monthly revenue target"
                            type="number"
                            min={0}
                            step={1000}
                            value={form.target}
                            onChange={e => changeTarget(Math.round(n(e.target.value)))}
                            disabled={!editable || !targetRow}
                          />
                        </div>
                        <div className="mw-fu-target-foot">
                          <small>
                            {approved
                              ? `Approved at ${lakh(n(targetRow.approved_target))} · LY ${lakh(row.lastYear)}`
                              : `${lakh(form.target)} planned · last year ${lakh(row.lastYear)}`}
                          </small>
                          <small className={streamsMismatch ? 'is-warn' : 'is-ok'}>
                            {streamsMismatch ? (
                              <>
                                {`${lakh(Math.abs(effective - streamTotal))} ${streamTotal > effective ? 'over' : 'unallocated'}`}
                                {editable && (
                                  <>
                                    {' · '}
                                    <button
                                      type="button"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        color: 'inherit',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                      }}
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
                                                ? Math.max(0, Math.round(effective) - Math.min(ren, Math.round(effective)))
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
                              `${lakh(streamTotal)} balanced`
                            )}
                          </small>
                        </div>
                        <div className="mw-split-bar" aria-hidden="true">
                          {STREAMS.map(s => (
                            <span
                              key={s.key}
                              style={{
                                width: `${(n(form.streams[s.key]) / Math.max(streamTotal, effective, 1)) * 100}%`,
                                background: s.color,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Band 2: Seamless Strategy & Team Playbook */}
                    <div className="mw-fu-execution">
                      <div className="mw-fu-strategy">
                        <span className="mw-fu-label">
                          <ListChecks size={13} /> Execution strategy — how we hit the number
                        </span>
                        {editable ? (
                          <textarea
                            rows={5}
                            value={form.strategy}
                            placeholder={'- Lead with the festive gifting pack\n- Push renewals in week 2…'}
                            onChange={e => set({ strategy: e.target.value })}
                          />
                        ) : form.strategy ? (
                          <RichText text={form.strategy} />
                        ) : (
                          <p className="muted">No execution strategy drafted yet.</p>
                        )}
                      </div>

                      <div className="mw-fu-pillars">
                        <div className="mw-fu-pillars-head">
                          <span className="mw-fu-label">
                            <Flag size={13} /> Team focus points
                          </span>
                          {editable && (
                            <button type="button" className="mw-mini-btn" onClick={() => setPoints([...points, ''])}>
                              <Plus size={12} /> Add point
                            </button>
                          )}
                        </div>
                        <ol className="mw-fu-points-list">
                          {points.map((t, i) => (
                            <li key={i}>
                              <b>{i + 1}</b>
                              {editable ? (
                                <>
                                  <input
                                    aria-label={`Focus point ${i + 1}`}
                                    placeholder="Add team focus point…"
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
                                <span>{inline(t)}</span>
                              )}
                            </li>
                          ))}
                          {points.length === 0 && <li className="is-empty">No focus points listed yet.</li>}
                        </ol>
                      </div>
                    </div>

                    {/* Band 3: Full-Width Revenue Streams & Volumes Needed */}
                    <div className="mw-fu-commercial">
                      <div className="mw-streams-block">
                        <div className="mw-subgrid-head">
                          <span>Revenue streams</span>
                          <small className={streamsMismatch ? 'neg' : ''}>
                            Allocated {lakh(streamTotal)} of {lakh(effective)}
                            {streamsMismatch
                              ? ` · ${lakh(Math.abs(effective - streamTotal))} ${streamTotal > effective ? 'over' : 'short'}`
                              : ' · 100% allocated across 3 streams'}
                          </small>
                        </div>
                        <div className="mw-streams">
                          {STREAMS.map(s => {
                            const val = n(form.streams[s.key]);
                            const share = effective ? Math.round((val / effective) * 100) : 0;
                            return (
                              <label key={s.key} style={{ '--c': s.color } as React.CSSProperties}>
                                <div className="mw-stream-top">
                                  <span>
                                    <i /> {s.label}
                                  </span>
                                  <em className="mw-stream-pct">{share}%</em>
                                </div>
                                <div className="mw-money">
                                  <em className="cur">₹</em>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1000}
                                    value={form.streams[s.key]}
                                    onChange={e => changeStream(s.key, Math.round(n(e.target.value)))}
                                    disabled={!editable || !targetRow}
                                  />
                                </div>
                                <span className="mw-stream-bar" aria-hidden="true">
                                  <b style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                                </span>
                                <small>{lakh(val)} of {lakh(effective)} target</small>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {(allVols.length > 0 || editable) && (
                        <div className="mw-funnel-targets">
                          <div className="mw-subgrid-head">
                            <h4>Volumes needed</h4>
                            <div className="mw-subgrid-tools">
                              <small>{targetDirty ? 'Live preview from edited split' : 'Funnel & conversion targets'}</small>
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
                              {editable && (
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
                          <div className="mw-volumes-grid is-full">
                            {allVols.map(k => (
                              <div key={k.id} className={`mw-vol-card is-${k.kind}`} title={`${k.label}: ${k.value} · ${k.hint}`}>
                                {editable ? (
                                  <div className="mw-vol-edit">
                                    <div className="mw-vol-edit-top">
                                      <input
                                        aria-label="Volume metric label"
                                        value={k.label}
                                        onChange={e => {
                                          if (k.isCustom) {
                                            updateContent({
                                              customVolumes: customVols.map(c => (c.id === k.id ? { ...c, label: e.target.value } : c)),
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
                                            customVolumes: customVols.map(c => (c.id === k.id ? { ...c, value: e.target.value } : c)),
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
                                            customVolumes: customVols.map(c => (c.id === k.id ? { ...c, hint: e.target.value } : c)),
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
                        </div>
                      )}
                    </div>

                    {editable && (
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

            {/* ─── Section 3: AI plan & reasoning ─── */}
            {isSectionVisible('ai') && (form.content?.ai || editable) && (() => {
              const ai = form.content?.ai || { splitRationale: '', reasoning: [], risks: [], generatedAt: null };
              const patchAi = (patch: Record<string, any>) =>
                updateContent({
                  ai: {
                    ...ai,
                    ...patch,
                    generatedAt: ai.generatedAt || new Date().toISOString(),
                  },
                });
              const reasoningList: Array<{ heading: string; points: string[] }> = Array.isArray(ai.reasoning) ? ai.reasoning : [];
              const risksList: string[] = Array.isArray(ai.risks) ? ai.risks : [];
              const meta = sectionMeta(
                'ai',
                'AI plan & reasoning',
                ai.generatedAt
                  ? `How ${MONTHS[month - 1]} reaches ${lakh(effective)} · updated ${new Date(ai.generatedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : `Strategic rationale, stream logic and risk mitigations for ${MONTHS[month - 1]}.`,
              );
              const rows = STREAMS.map(s => ({
                ...s,
                target: n(form.streams[s.key]),
                offer: selected
                  .filter(o => STREAM_KEY[STREAM_OF[o.objective] || ''] === s.key)
                  .reduce((sum, o) => sum + forecastRevenue(o), 0),
              }));
              const max = Math.max(1, ...rows.flatMap(r => [r.target, r.offer]));
              return (
                <div id="mw-sec-ai" className="mw-section mw-ai-plan">
                  <SectionHead
                    icon={Sparkles}
                    title={meta.title}
                    hint={meta.hint}
                    editable={editable}
                    onTitleChange={v => patchSectionMeta('ai', { title: v })}
                    onHintChange={v => patchSectionMeta('ai', { hint: v })}
                    onDelete={() => hideSection('ai')}
                    actions={
                      editable ? (
                        <>
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => patchAi({ reasoning: [...reasoningList, { heading: 'New pillar', points: ['Key commercial point'] }] })}
                          >
                            <Plus size={12} /> Add reasoning block
                          </button>
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => patchAi({ risks: [...risksList, 'New risk & mitigation'] })}
                          >
                            <Plus size={12} /> Add risk
                          </button>
                        </>
                      ) : undefined
                    }
                  />
                  <div className="mw-ai-split">
                    <div className="mw-ai-chart" role="img" aria-label="Target versus offer forecast by revenue stream">
                      <div className="mw-ai-legend">
                        <span><i className="t" /> Target</span>
                        <span><i className="o" /> Offer forecast</span>
                      </div>
                      {rows.map(r => (
                        <div key={r.key} className="mw-ai-bar-row" style={{ '--c': r.color } as React.CSSProperties}>
                          <span className="lbl">{r.label}</span>
                          <div className="bars">
                            <i className="t" style={{ width: `${(r.target / max) * 100}%` }} />
                            <i className="o" style={{ width: `${(r.offer / max) * 100}%` }} />
                          </div>
                          <span className="val">
                            <b>{lakh(r.target)}</b>
                            <em className={r.offer >= r.target ? 'ok' : 'short'}>{lakh(r.offer)}</em>
                          </span>
                        </div>
                      ))}
                      <div className="mw-ai-donut">
                        {rows.map(r => (
                          <span key={r.key} style={{ flexGrow: Math.max(r.target, 0.0001), background: r.color }} title={`${r.label} ${lakh(r.target)}`}>
                            {effective ? `${Math.round((r.target / effective) * 100)}%` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    {(ai.splitRationale || editable) && (
                      <div className="mw-ai-rationale">
                        <h5>Why this split</h5>
                        {editable ? (
                          <textarea
                            rows={5}
                            placeholder="Explain why revenue is weighted across new clients, renewals and reactivation…"
                            value={ai.splitRationale || ''}
                            onChange={e => patchAi({ splitRationale: e.target.value })}
                          />
                        ) : (
                          <RichText text={ai.splitRationale} />
                        )}
                      </div>
                    )}
                  </div>
                  {(reasoningList.length > 0 || editable) && (
                    <div className="mw-ai-reasons">
                      {reasoningList.map((sec, i) => (
                        <section key={i}>
                          <h5>
                            <span>{String(i + 1).padStart(2, '0')}</span>
                            {editable ? (
                              <>
                                <input
                                  aria-label={`Reasoning heading ${i + 1}`}
                                  value={sec.heading}
                                  onChange={e =>
                                    patchAi({
                                      reasoning: reasoningList.map((x, idx) => (idx === i ? { ...x, heading: e.target.value } : x)),
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  className="mw-mini-icon is-danger"
                                  aria-label="Remove reasoning block"
                                  onClick={() => patchAi({ reasoning: reasoningList.filter((_, idx) => idx !== i) })}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            ) : (
                              sec.heading
                            )}
                          </h5>
                          {editable ? (
                            <div className="mw-list-editor">
                              {sec.points.map((p, j) => (
                                <div key={j} className="mw-list-editor-row">
                                  <input
                                    value={p}
                                    onChange={e =>
                                      patchAi({
                                        reasoning: reasoningList.map((x, idx) =>
                                          idx === i ? { ...x, points: x.points.map((pt, pj) => (pj === j ? e.target.value : pt)) } : x,
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
                                      idx === i ? { ...x, points: [...x.points, ''] } : x,
                                    ),
                                  })
                                }
                              >
                                <Plus size={11} /> Add point
                              </button>
                            </div>
                          ) : (
                            <ul>{sec.points.map((p, j) => <li key={j}>{inline(p)}</li>)}</ul>
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                  {(risksList.length > 0 || editable) && (
                    <div className="mw-ai-risks">
                      <h5>Risks &amp; mitigations</h5>
                      {editable ? (
                        <div className="mw-list-editor">
                          {risksList.map((r, i) => (
                            <div key={i} className="mw-list-editor-row">
                              <input
                                value={r}
                                placeholder="Describe risk and studio mitigation…"
                                onChange={e => patchAi({ risks: risksList.map((x, idx) => (idx === i ? e.target.value : x)) })}
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
                          <button type="button" className="mw-mini-btn" onClick={() => patchAi({ risks: [...risksList, ''] })}>
                            <Plus size={11} /> Add risk
                          </button>
                        </div>
                      ) : (
                        <ul>{risksList.map((r, i) => <li key={i}>{inline(r)}</li>)}</ul>
                      )}
                    </div>
                  )}
                  {form.actions.length > 0 && (
                    <div className="mw-ai-weeks">
                      {[1, 2, 3, 4, 5].filter(w => form.actions.some(a => a.week === w)).map(w => (
                        <div key={w}>
                          <h6>Week {w}</h6>
                          <ul>
                            {form.actions.filter(a => a.week === w).map((a, i) => (
                              <li key={i} className={a.done ? 'done' : ''}>
                                {a.text}
                                {a.owner && <em>{a.owner}</em>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
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
            {isSectionVisible('offers') && (() => {
              const meta = sectionMeta(
                'offers',
                `Offers · ${selected.length}`,
                `${lakh(offerRevenue)} expected. Edit all offer details here, build a new offer, or pick from the library.`,
              );
              const twoUp = twoUpForce !== null ? twoUpForce : !sideOpen;
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
                  redemption_conditions: 'One offer per client; non-transferable and not stackable with standing perks.',
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
                    onTitleChange={v => patchSectionMeta('offers', { title: v })}
                    onHintChange={v => patchSectionMeta('offers', { hint: v })}
                    onDelete={() => hideSection('offers')}
                    actions={
                      <>
                        {selected.length >= 2 && (
                          <button
                            type="button"
                            className={`mw-mini-btn${twoUp ? ' is-active' : ''}`}
                            onClick={() => setTwoUpForce(twoUp ? false : true)}
                            title="Toggle side-by-side 2-up offer card view"
                          >
                            <LayoutGrid size={12} /> {twoUp ? '1-up list' : '2-up cards'}
                          </button>
                        )}
                        {(editable || offersEditable) && (
                          <button
                            type="button"
                            className="mw-mini-btn is-primary"
                            onClick={() => openNewOffer()}
                          >
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

                  {effective > 0 && selected.length > 0 && (() => {
                    const ratio = offerRevenue / effective;
                    const tone = ratio > 1.1 ? 'over' : ratio < 0.9 ? 'under' : 'ok';
                    const diff = Math.abs(offerRevenue - effective);
                    return (
                      <div className={`mw-rev-check is-${tone}`} role="status">
                        <div className="mw-rev-check-text">
                          <strong>
                            {tone === 'over' ? 'Offer plan exceeds target' : tone === 'under' ? 'Offer plan is below target' : 'Offer plan is in line with target'}
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
                  {offersEditable && (
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
                      const orderedOffers = activeGroups.flatMap(g => g.offers.map(o => ({ offer: o, stream: g.label })));
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
                              editable
                                ? async () => {
                                    if (await offerChange({ op: 'delete', offerId: o.id }, `“${o.name}” deleted`)) {
                                      setEditing(null);
                                    }
                                  }
                                : undefined
                            }
                            onSave={async edit => {
                              if (
                                await offerChange({ op: 'update', offerId: o.id, edit }, `“${edit.name}” updated`)
                              )
                                setEditing(null);
                            }}
                          />
                        ) : (
                          <OfferCard
                            key={o.id}
                            no={no}
                            offer={o}
                            streamLabel={twoUp ? stream : undefined}
                            list={
                              prices?.prices[studio.id]?.[o.provenance?.pricing?.product] ??
                              (o.provenance?.pricing?.customListPrice ? n(o.provenance.pricing.customListPrice) : null)
                            }
                            productLabel={prices?.keys[o.provenance?.pricing?.product]}
                            slot={slotOf(o.id)}
                            editable={editable}
                            canSwap={offersEditable}
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
                            onRemove={() => offerChange({ op: 'remove', offerId: o.id }, `“${o.name}” removed from month`)}
                            onDelete={() => offerChange({ op: 'delete', offerId: o.id }, `“${o.name}” deleted`)}
                            onSwap={() => askCopilot('replace', o.id)}
                          />
                        );

                      if (twoUp) {
                        return (
                          <div className="mw-offers-collapsed-wrap">
                            <div className="mw-offer-stream-strip" aria-label="Revenue stream breakdown">
                              {activeGroups.map(g => (
                                <div key={g.label} className="mw-offer-stream-pill">
                                  <span className="mw-offer-group-title">{g.label}</span>
                                  <span className="mw-offer-group-count">{g.offers.length}</span>
                                  <strong className="mw-offer-group-sum">
                                    {lakh(g.offers.reduce((s, o) => s + forecastRevenue(o), 0))}
                                  </strong>
                                </div>
                              ))}
                            </div>
                            <div className="mw-offer-list is-two-up">
                              {orderedOffers.map(({ offer: o, stream }, idx) => renderItem(o, idx + 1, stream))}
                            </div>
                          </div>
                        );
                      }

                      return activeGroups.map(g => (
                        <div key={g.label} className="mw-offer-group">
                          <div className="mw-offer-group-head">
                            <span className="mw-offer-group-title">{g.label}</span>
                            <span className="mw-offer-group-count">{g.offers.length}</span>
                            <i aria-hidden="true" />
                            <strong className="mw-offer-group-sum">
                              {lakh(g.offers.reduce((s, o) => s + forecastRevenue(o), 0))}
                            </strong>
                          </div>
                          <div className="mw-offer-list">
                            {g.offers.map(o =>
                              renderItem(
                                o,
                                orderedOffers.findIndex(x => x.offer.id === o.id) + 1,
                              ),
                            )}
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <p className="mw-offer-empty">
                      No offers picked yet — click “New offer” above or select an option from the offer library on the right.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* ─── Section 5: Offer coverage by revenue stream ─── */}
            {isSectionVisible('coverage') && (gapRows.length > 0 || editable) && (() => {
              const meta = sectionMeta(
                'coverage',
                'Offer coverage by revenue stream',
                'Compares selected offer forecasts with each allocated target. Approval requires every stream to be covered.',
              );
              const covNotes: Record<string, string> = form.content?.coverageNotes || {};
              return (
                <div id="mw-sec-coverage" className="mw-section mw-gapplan">
                  <SectionHead
                    icon={Target}
                    title={meta.title}
                    hint={meta.hint}
                    editable={editable}
                    onTitleChange={v => patchSectionMeta('coverage', { title: v })}
                    onHintChange={v => patchSectionMeta('coverage', { hint: v })}
                    onDelete={() => hideSection('coverage')}
                  />
                  <div className="mw-gp-rows">
                    {gapRows.map(r => {
                      const ratio = r.target ? r.offer / r.target : 0;
                      const state = r.gap > 0 ? 'short' : ratio > 1.15 ? 'over' : 'ok';
                      const scale = Math.max(r.target, r.offer, 1);
                      const note = covNotes[r.label] || '';
                      return (
                        <div key={r.label} className={`mw-gp-row ${state}`}>
                          <div className="mw-gp-head">
                            <strong>{r.label}</strong>
                            <em>{state === 'short' ? `${lakh(r.gap)} short` : state === 'over' ? `${lakh(r.offer - r.target)} over` : 'Covered'}</em>
                          </div>
                          <div className="mw-gp-figs">
                            <div><small>Offer forecast</small><b>{lakh(r.offer)}</b></div>
                            <div><small>Stream target</small><b>{lakh(r.target)}</b></div>
                            <div><small>Coverage</small><b>{Math.round(ratio * 100)}%</b></div>
                          </div>
                          <div className="mw-gp-bar">
                            <i style={{ width: `${(r.offer / scale) * 100}%` }} />
                            <b style={{ left: `${(r.target / scale) * 100}%` }} title="Target" />
                          </div>
                          {r.gap > 0 && (
                            <div className="mw-gp-plan">
                              {r.picks.map(o => (
                                <div key={o.id} className="mw-gp-pick">
                                  <span>{o.name}</span>
                                  <b>+{lakh(forecastRevenue(o))}</b>
                                </div>
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
                          {(editable || note) && (
                            <div className="mw-gp-note">
                              {editable ? (
                                <input
                                  placeholder={`Plan note for ${r.label.toLowerCase()} coverage…`}
                                  value={note}
                                  onChange={e => updateContent({ coverageNotes: { ...covNotes, [r.label]: e.target.value } })}
                                />
                              ) : (
                                <small>{note}</small>
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

            {/* ─── Section 6: Activations ─── */}
            {isSectionVisible('acts') && (() => {
              const meta = sectionMeta('acts', 'Activations', 'Challenge, event, partner and retention play.');
              const hidden: string[] = Array.isArray(form.content?.hiddenActivations) ? form.content.hiddenActivations : [];
              const extras: { id: string; label: string; title: string; text: string }[] = Array.isArray(form.content?.extraActivations)
                ? form.content.extraActivations
                : [];
              const fixed = [
                { key: 'challenge', icon: Trophy, label: 'Challenge', tone: 'purple', ...activation('challenge', challenge?.Activation || base.challenge[0], challenge?.Mechanics || base.challenge[1]) },
                { key: 'event', icon: PartyPopper, label: 'Event', tone: 'coral', ...activation('event', event?.Activation || base.event[0], event?.Mechanics || base.event[1]) },
                { key: 'partner', icon: Handshake, label: 'Partnership', tone: 'gold', ...activation('partner', base.partner[0], base.partner[1]) },
                { key: 'retention', icon: HeartHandshake, label: 'Retention', tone: 'green', ...activation('retention', 'Members', base.retention) },
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
                    onTitleChange={v => patchSectionMeta('acts', { title: v })}
                    onHintChange={v => patchSectionMeta('acts', { hint: v })}
                    onDelete={() => hideSection('acts')}
                    actions={
                      editable ? (
                        <>
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => setExtras([...extras, { id: `x${Date.now()}`, label: 'Activation', title: '', text: '' }])}
                          >
                            <Plus size={12} /> Add activation
                          </button>
                          {hidden.length > 0 && (
                            <button type="button" className="mw-mini-btn" onClick={() => updateContent({ hiddenActivations: [] })}>
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
                        onChange={(value: any) => updateContent({ activations: { ...activationEdits, [a.key]: value } })}
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
                        onChange={(value: any) => setExtras(extras.map(e => (e.id === x.id ? { ...e, ...value } : e)))}
                        onRemove={() => setExtras(extras.filter(e => e.id !== x.id))}
                      />
                    ))}
                    {!fixed.length && !extras.length && <p className="mw-action-empty">No activations planned for this month.</p>}
                  </div>
                  <div className="mw-acts-kpis">
                    <span className="mw-fu-label">Activation KPIs</span>
                    {editable ? (
                      <div className="mw-list-editor">
                        {kpiList.map((k, idx) => (
                          <div key={idx} className="mw-list-editor-row">
                            <input
                              aria-label={`Activation KPI ${idx + 1}`}
                              value={k}
                              placeholder="KPI target…"
                              onChange={e => setKpis(kpiList.map((x, j) => (j === idx ? e.target.value : x)))}
                            />
                            <button type="button" aria-label="Remove KPI" onClick={() => setKpis(kpiList.filter((_, j) => j !== idx))}>
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
                          <span key={idx} className="mw-kpi-pill">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ─── Section 7: Action plan ─── */}
            {isSectionVisible('actions') && (() => {
              const meta = sectionMeta('actions', 'Action plan', 'Who does what, week by week.');
              return (
                <div id="mw-sec-actions" className="mw-section mw-actions">
                  <SectionHead
                    icon={ListChecks}
                    title={meta.title}
                    hint={meta.hint}
                    editable={editable}
                    onTitleChange={v => patchSectionMeta('actions', { title: v })}
                    onHintChange={v => patchSectionMeta('actions', { hint: v })}
                    onDelete={() => hideSection('actions')}
                    actions={
                      editable ? (
                        <>
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => set({ actions: [...form.actions, { text: '', owner: '', week: 1, done: false }] })}
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
                                    { text: 'Brief creative & submit WhatsApp templates for approval', owner: 'Marketing', week: 1, done: false },
                                    { text: 'Launch primary offers & brief front-desk team on scripts', owner: 'Studio Manager', week: 1, done: false },
                                    { text: 'Mid-month renewal & trial conversion check-in', owner: 'Sales Lead', week: 2, done: false },
                                    { text: '48-hour closing reminder broadcast & lapsed follow-up calls', owner: 'Studio Manager', week: 4, done: false },
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
                  {form.actions.length > 0 && (
                    <div className="mw-action-head">
                      <span>{form.actions.filter(a => a.done).length} of {form.actions.length} done</span>
                      <i style={{ '--p': `${(form.actions.filter(a => a.done).length / form.actions.length) * 100}%` } as React.CSSProperties} />
                    </div>
                  )}
                  {!form.actions.length && (
                    <p className="mw-action-empty">No actions yet. Add the launch tasks for this month: creatives briefed, WhatsApp template approved, emails scheduled, tent cards placed, and the week-2 and week-4 performance checks.</p>
                  )}
                  {form.actions.map((a, i) => {
                    const patchAction = (p: Partial<ActionItem>) =>
                      set({ actions: form.actions.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                    return (
                      <div key={i} className={`mw-action${a.done ? ' is-done' : ''}`}>
                        <b className="mw-action-no">{i + 1}</b>
                        <input
                          type="checkbox"
                          checked={a.done}
                          onChange={e => patchAction({ done: e.target.checked })}
                          {...fieldProps}
                        />
                        <input
                          value={a.text}
                          placeholder="Action"
                          onChange={e => patchAction({ text: e.target.value })}
                          {...fieldProps}
                        />
                        <input
                          value={a.owner}
                          placeholder="Owner"
                          className="mw-owner"
                          onChange={e => patchAction({ owner: e.target.value })}
                          {...fieldProps}
                        />
                        <select value={a.week} onChange={e => patchAction({ week: n(e.target.value) })} {...fieldProps}>
                          {[1, 2, 3, 4, 5].map(w => (
                            <option key={w} value={w}>
                              Week {w}
                            </option>
                          ))}
                        </select>
                        {editable && (
                          <button
                            type="button"
                            aria-label="Remove action"
                            onClick={() => set({ actions: form.actions.filter((_, j) => j !== i) })}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Plus size={14} />}
                      onClick={() => set({ actions: [...form.actions, { text: '', owner: '', week: 1, done: false }] })}
                    >
                      Add action
                    </Button>
                  )}
                  <label className="mw-notes">
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={e => set({ notes: e.target.value })}
                      {...fieldProps}
                    />
                  </label>
                  {editable && (
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

            {/* ─── Section 8: Marketing & collaterals ─── */}
            {isSectionVisible('collaterals') && (
              <MarketingCollaterals
                id="mw-sec-collaterals"
                offers={selected}
                studioName={studio.name}
                city={studio.city || (['Kenkere House', 'Pop-up'].includes(studio.name) ? 'Bengaluru' : 'Mumbai')}
                year={year}
                month={month}
                theme={form.theme}
                hook={(form.strategy || '').split('\n').find((l: string) => l.startsWith('Moment:'))?.slice(8)}
                editable={editable}
                collaterals={form.content?.collaterals}
                onChangeCollaterals={next => updateContent({ collaterals: next })}
                onDeleteSection={() => hideSection('collaterals')}
              />
            )}

            {/* ─── User-Added Custom Sections ─── */}
            {customSections.map(cs => (
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
                              { id: `item-${Date.now()}`, label: 'Item', value: 'New entry', detail: 'Details or owner' },
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
                                    items: cs.items.map(x => (x.id === it.id ? { ...x, label: e.target.value } : x)),
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

            {editable && (
              <div className="mw-add-section-bar">
                <button type="button" className="mw-add-section-btn" onClick={addCustomSection}>
                  <Plus size={15} />
                  <span>Add new section to {MONTHS[month - 1]}</span>
                </button>
              </div>
            )}
          </main>

          {(
            sideOpen ? (
            <aside className="mw-side">
              <div
                className="mw-side-resize"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize offer library"
                aria-valuenow={sideW}
                tabIndex={0}
                onPointerDown={dragSide}
                onDoubleClick={() => setSideW(340)}
                onKeyDown={e => {
                  if (e.key === 'ArrowLeft') setSideW(w => Math.min(640, w + 20));
                  if (e.key === 'ArrowRight') setSideW(w => Math.max(260, w - 20));
                }}
              />
              <div className="mw-side-head">
                <div className="mw-side-title">
                  <span><RefreshCcw size={15} /></span>
                  <div><h4>Offer library</h4><small>{altGroups.reduce((t, [, l]) => t + l.length, 0)} available to add · up to 15 per membership</small></div>
                  <button type="button" className="mw-side-toggle" aria-label="Collapse offer library" title="Collapse" onClick={() => setSideOpen(false)}>
                    <PanelRightClose size={15} />
                  </button>
                </div>
                <p className="muted">
                  {studio.name}’s other offers, with this month’s first.{' '}
                  {solo ? 'Adds apply to this location only.' : 'Adding copies to every location at local prices.'}
                </p>
                {alternates.length > 0 && (
                  <div className="mw-side-filters">
                    <div className="mw-side-search">
                      <Search size={13} />
                      <input
                        value={altQuery}
                        onChange={e => setAltQuery(e.target.value)}
                        placeholder="Search library offers…"
                        aria-label="Search offer library"
                      />
                      {altQuery && (
                        <button type="button" onClick={() => setAltQuery('')} aria-label="Clear library search">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="mw-side-scopes">
                      {(
                        [
                          ['all', 'All'],
                          ['month', MONTHS[month - 1].slice(0, 3)],
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
                )}
              </div>
              {alternates.length ? (
                altGroups.length ? (
                  altGroups.map(([group, list]) => (
                  <section key={group} className="mw-alt-group">
                    <h5>
                      {group} <em>{list.length}</em>
                    </h5>
                    {list.map(o => {
                      const approved = o.approval_status === 'approved';
                      const flipped = flippedAlt === o.id;
                      const stop = (e: React.SyntheticEvent) => e.stopPropagation();
                      return (
                        <div
                          key={o.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={flipped}
                          className={`mw-alt mw-flip${flipped ? ' is-flipped' : ''}${approved ? ' is-approved' : ''}`}
                          onClick={() => setFlippedAlt(f => (f === o.id ? null : o.id))}
                          onKeyDown={e => {
                            if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
                            e.preventDefault();
                            setFlippedAlt(f => (f === o.id ? null : o.id));
                          }}
                        >
                          <div className="mw-flip-inner">
                            <div className={`mw-flip-face mw-flip-front slot-${o.plan_slot || 'any'}`}>
                              <div className="mw-lc-top">
                                <em>{o.plan_slot ? (o.plan_slot === 'lapsed' ? 'Winback' : titleCase(o.plan_slot)) : 'Any audience'}</em>
                                <span>{o.month ? MONTHS[o.month - 1].slice(0, 3) : 'Always on'}</span>
                              </div>
                              <strong>{o.name}</strong>
                              {(o.benefit || o.headline) && <p>{o.benefit || o.headline}</p>}
                              <div className="mw-lc-foot">
                                <span className="mw-lc-type">{titleCase(o.offer_type)}</span>
                                <b>{money(o.expected_revenue, true)}</b>
                                {offersEditable && !approved && (
                                  <span className="mw-alt-actions" onClick={stop} onKeyDown={stop}>
                                    <button aria-label={`Add ${o.name}`} title="Add to month" disabled={busy} onClick={() => offerChange({ op: 'add', offerId: o.id }, `“${o.name}” added`)}>
                                      <Plus size={14} />
                                    </button>
                                    {selected.length > 0 && (
                                      <label className="mw-alt-replace" title="Replace a current offer">
                                        <RefreshCcw size={13} />
                                        <select aria-label={`Replace an offer with ${o.name}`} disabled={busy} value="" onChange={e => replaceOffer(Number(e.target.value), o)}>
                                          <option value="" disabled>Replace…</option>
                                          {selected.map(cur => (
                                            <option key={cur.id} value={cur.id} disabled={cur.approval_status === 'approved'}>{cur.name}</option>
                                          ))}
                                        </select>
                                      </label>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mw-flip-face mw-flip-back" aria-hidden={!flipped}>
                              <small>{o.headline || 'Offer details'}</small>
                              {o.customer_copy && <em>“{o.customer_copy}”</em>}
                              <dl>
                                <div><dt>Audience</dt><dd>{o.audience || '—'}</dd></div>
                                <div><dt>Value</dt><dd>{Number(o.effective_discount) ? `${Number(o.effective_discount).toFixed(0)}% effective` : 'At list'}</dd></div>
                                <div><dt>Avg ticket</dt><dd>{o.expected_asp ? money(o.expected_asp) : '—'}</dd></div>
                                <div><dt>Buyers</dt><dd>{o.target_purchases || '—'}</dd></div>
                              </dl>
                              {o.rationale && <p>{String(o.rationale).split('\n')[0].replace(/^Why: /, '')}</p>}
                              {o.redemption_conditions && <p className="mw-flip-fine">{o.redemption_conditions}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                  ))
                ) : (
                  <p className="muted">No library offers match “{altQuery || altScope}”.</p>
                )
              ) : (
                <p className="muted">No other offers for this studio yet.</p>
              )}
              {ideas.length > 0 && (
                <>
                  <h4>
                    <Lightbulb size={15} /> Ideas for {MONTHS[month - 1]}
                  </h4>
                  {ideas.map(t => (
                    <button key={t.id} className="mw-idea" onClick={() => navigate('/offers')}>
                      <Badge tone="purple">{t.family}</Badge>
                      <strong>{t.name}</strong>
                      <span>{t.benefit}</span>
                      <em>{t.why}</em>
                    </button>
                  ))}
                </>
              )}
            </aside>
            ) : (
            <aside className="mw-side is-collapsed">
              <button type="button" className="mw-side-toggle" aria-label="Expand offer library" title="Offer library" onClick={() => setSideOpen(true)}>
                <PanelRightOpen size={15} />
              </button>
              <span className="mw-side-rail">Offer library</span>
            </aside>
            )
          )}
        </div>
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
        <p>Built bottom-up from history, {window.from} → {window.to}.</p>
        <span className="mw-maths-custom" title={`${custom} customised assumptions`}>
          <SlidersHorizontal size={13} /> {custom ? `${custom} customised` : 'History based'}
        </span>
        <button type="button" className="mw-maths-close" onClick={onClose} aria-label="Close monthly maths"><X size={16} /></button>
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
  const customised = ASSUMPTION_FIELDS.filter(f => assumptions?.[f.key]?.override !== null && assumptions?.[f.key]?.override !== undefined).length;
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
                History: {a?.auto === null || a?.auto === undefined ? '—' : f.kind === 'rate' ? pct(a.auto, 0) : money(a.auto, true)} · {f.hint}
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
              onClick={() => save(Object.fromEntries(ASSUMPTION_FIELDS.map(f => [f.key, null])), 'Back to history-based assumptions')}
            >
              Reset to history
            </Button>
          )}
          <small>{customised ? `${customised} assumption${customised > 1 ? 's' : ''} customised for ${studioName}.` : 'Using history for every assumption.'}</small>
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
      <h5><i>1</i> New clients <em>{lakh(nc.target)} to find</em></h5>
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
        Average first membership spend is {money(nc.firstSpend, true)} across {number(nc.samples.firstSpendBuyers)} new
        buyers in the last 12 months
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
      <h5><i>2</i> Renewals <em>{lakh(r.target)} target</em></h5>
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
      <h5><i>3</i> Comeback / reactivation <em>{lakh(re.target)} target</em></h5>
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

const CARD_PHOTO_THEMES: [RegExp, string][] = [
  [/private|consult|1-on-1|trainer|personal|coach/i, 'coaching'],
  [/friend|duo|pair|squad|refer|bring|together|reunion|couple/i, 'duo'],
  [/cycle|ride|spin|c\+c|flash|72-hour|earn it back/i, 'cycle'],
  [/she moves|women|party|founding|passport|festival/i, 'community'],
  [/travel|freeze|comeback|missed|return|lapsed|reset|stretch|calm/i, 'calm'],
  [/strength|lift|box|trade-up|upgrade|level up|20-class|10-pack|pack/i, 'strength'],
  [/barre|welcome|first|trial|intro|golden|bonus|punch/i, 'barre'],
];

function pickOfferCardPhoto(o: any, slot?: string, no?: number): CardPhoto {
  if (o.provenance?.photoKey) {
    const chosen = OFFER_CARD_PHOTOS.find(p => p.url === o.provenance.photoKey || p.url.endsWith(`/${o.provenance.photoKey}.jpg`));
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

function splitOfferTitle(rawName: string): [string, string] {
  const words = String(rawName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] || '', ''];
  if (words.length === 2) return [words[0], words[1]];
  const w0 = words[0].toLowerCase();
  const w1 = words[1].toLowerCase();
  const leadPair =
    w0.length <= 3 ||
    ['the', 'one', 'two', 'six', 'ten', 'new', 'all', 'get', 'try', 'win'].includes(w0) ||
    ['up', 'in', 'on', 'to', 'by', 'of', 'or', 'your', 'the', 'out', 'back', 'more', 'where', '+'].includes(w1) ||
    words.length >= 4;
  const splitAt = leadPair ? 2 : 1;
  return [words.slice(0, splitAt).join(' '), words.slice(splitAt).join(' ')];
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
  const listColValue = strikePrice ? strikePrice : list ? list : offerPrice || null;
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
    directSaving > 0
      ? money(directSaving)
      : hasCashDiscount
        ? `${fmtPct((cashDisc ?? 0) * 100)} off`
        : null;
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
  const membership = productLabel || o.provenance?.pricing?.product || titleCase(o.offer_type);
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

  const [leadTitle, restTitle] = splitOfferTitle(o.name);
  const heroPhoto = pickOfferCardPhoto(o, slot, no);
  const offerNum = no ? String(no).padStart(2, '0') : '01';

  // Imported rationale uses "Why: … / Watch: … / Model: … / Logic: … / KPI: …" lines.
  const reasons = String(o.rationale || '')
    .split('\n')
    .map(line => line.match(/^(Why|Watch|Model|Logic|KPI):\s*(.*)$/i))
    .filter(Boolean) as RegExpMatchArray[];

  // Optimistic approval: the tick flips immediately and settles once the month reloads.
  const [pending, setPending] = useState<boolean | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  useEffect(() => setPending(null), [approved]);
  const shown = pending ?? !!approved;
  const hasDrawerContent = Boolean(
    reasons.length > 0 ||
      o.rationale ||
      (o.customer_copy && o.customer_copy !== o.benefit && o.customer_copy !== o.headline) ||
      o.excluded_audience ||
      o.cta ||
      metrics.length > 0 ||
      risks.length > 0,
  );

  return (
    <article className={`oc${shown ? ' is-approved' : ''}${whyOpen ? ' is-expanded' : ''}${slot ? ` slot-${slot}` : ''}`}>
      <div className="oc-hero">
        <div className="oc-hero-art" aria-hidden="true">
          <div
            className="oc-hero-photo"
            style={{ backgroundImage: `url(${heroPhoto.url})`, backgroundPosition: heroPhoto.pos }}
          />
          <div className="oc-hero-vignette" />
        </div>

        <div className="oc-hero-body">
          <div className="oc-num-badge" aria-label={no ? `Offer ${offerNum}` : 'Offer'}>
            <span>{offerNum}</span>
          </div>

          <div className="oc-hero-copy">
            <div className="oc-chips">
              {slotLabel && (
                <span className={`oc-chip is-slot slot-${slot}`}>
                  <Sparkles size={11} />
                  {slotLabel}
                </span>
              )}
              {!slotLabel && streamLabel && (
                <span className="oc-chip is-stream">
                  <Target size={11} />
                  {streamLabel}
                </span>
              )}
              {membership && (
                <span className="oc-chip">
                  <Calendar size={11} />
                  {membership}
                </span>
              )}
              {showObjective && (
                <span className="oc-chip">
                  <Clock size={11} />
                  {objectiveLabel}
                </span>
              )}
              <span className={`oc-chip ${linked ? 'is-linked' : 'is-solo'}`}>
                {linked ? <Link2 size={11} /> : <Unlink size={11} />}
                {linked ? 'All locations' : 'This location'}
              </span>
            </div>

            <h3 className="oc-title">
              {restTitle ? (
                <>
                  <span className="oc-title-accent">{leadTitle}</span> {restTitle}
                </>
              ) : (
                <span className="oc-title-accent">{leadTitle}</span>
              )}
            </h3>

            {o.headline && <p className="oc-job">{o.headline}</p>}
            {o.benefit && o.benefit !== o.headline && <p className="oc-benefit-inline">{o.benefit}</p>}
          </div>
        </div>
      </div>

      <div className="oc-sheet">
        <div className="oc-metrics-grid">
          <div className="oc-metric-card">
            <div className="oc-metric-head">
              <span className="oc-metric-label">{listColLabel}</span>
              <Tag size={13.5} strokeWidth={1.75} className="oc-metric-glyph" aria-hidden="true" />
            </div>
            {strikePrice ? (
              <s className="oc-strike">{money(strikePrice)}</s>
            ) : (
              <strong className="oc-list-val">{listColValue ? money(listColValue) : '—'}</strong>
            )}
            <small className="oc-metric-sub">{listColSub || (strikePrice ? 'Before discount' : 'Standard MRP')}</small>
          </div>

          <div className="oc-metric-card">
            <div className="oc-metric-head">
              <span className="oc-metric-label">{offerColLabel}</span>
              <Gift size={13.5} strokeWidth={1.75} className="oc-metric-glyph" aria-hidden="true" />
            </div>
            <strong className="oc-offer-val">{offerPrice ? money(offerPrice) : '—'}</strong>
            <small className="oc-metric-sub">{offerColSub || membership || 'Member tariff'}</small>
          </div>

          <div className="oc-metric-card">
            <div className="oc-metric-head">
              <span className="oc-metric-label">Client saves</span>
              <BadgePercent size={13.5} strokeWidth={1.75} className="oc-metric-glyph" aria-hidden="true" />
            </div>
            <strong className={`oc-save-val ${savesPrimary ? 'is-cut' : 'is-perk'}`}>
              {savesPrimary || (effPct > 0 ? `+${fmtPct(effPct)} value` : 'Value-add')}
            </strong>
            <small className="oc-metric-sub">
              {savesPrimary ? savesPillText : effPct > 0 ? 'Added perk · MRP intact' : 'No price cut'}
            </small>
          </div>

          <div className="oc-metric-card is-plan">
            <div className="oc-metric-head">
              <span className="oc-metric-label">Plan</span>
              <CalendarCheck2 size={13.5} strokeWidth={1.75} className="oc-metric-glyph" aria-hidden="true" />
            </div>
            <strong className="oc-plan-val">
              {hasValidForecast(o) ? lakh(n(o.expected_revenue)) : 'Needs review'}
            </strong>
            <small className="oc-metric-sub">
              {number(o.target_purchases)} units × {money(offerPrice, true)}
            </small>
          </div>
        </div>

        <div className="oc-details-strip">
          <div className="oc-fact">
            <span className="oc-fact-label">Target cohort</span>
            <p>{o.audience || 'All clients'}</p>
          </div>

          <div className="oc-fact">
            <span className="oc-fact-label">Window</span>
            <p>{windowText}</p>
          </div>

          <div className="oc-fact oc-fact-terms">
            <span className="oc-fact-label">Terms &amp; guardrails</span>
            <p>{o.redemption_conditions || 'One offer per purchase; not stackable with standing perks.'}</p>
          </div>
        </div>

        <footer className="oc-footer">
        <div className="oc-footer-bar">
          {hasDrawerContent || editable ? (
            <button
              type="button"
              className={`oc-why-btn${whyOpen ? ' is-open' : ''}`}
              aria-expanded={whyOpen}
              onClick={() => setWhyOpen(v => !v)}
            >
              <span>{hasDrawerContent ? 'Why this offer works' : 'Offer details & guardrails'}</span>
              <ChevronDown size={14} className="oc-chevron" />
              {reasons.length > 0 && (
                <em className="oc-why-tags">{reasons.map(([, k]) => titleCase(k)).join(' · ')}</em>
              )}
            </button>
          ) : (
            <span />
          )}

          <div className="oc-actions">
            {(editable || (canSwap && !shown)) && (
              <div className="oc-icon-group">
                {canSwap && !shown && (
                  <button
                    type="button"
                    aria-label={`Replace ${o.name} with AI`}
                    title="Replace with AI"
                    className="oc-icon-btn ai"
                    onClick={onSwap}
                    disabled={busy}
                  >
                    <Sparkles size={13.5} />
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
                <i>
                  <Check size={10.5} strokeWidth={2.75} />
                </i>
                <span>{shown ? 'Approved' : 'Approve'}</span>
              </button>
            ) : shown ? (
              <span className="oc-status-approved">
                <Check size={11} strokeWidth={2.75} /> Approved
              </span>
            ) : null}
          </div>
        </div>

        {whyOpen && (hasDrawerContent || editable) && (
          <div className="oc-details-body">
            {o.customer_copy && o.customer_copy !== o.benefit && o.customer_copy !== o.headline && (
              <p className="oc-quote">“{o.customer_copy}”</p>
            )}
            {(reasons.length > 0 || o.rationale) && (
              <div className="oc-rationale">
                {reasons.length ? (
                  reasons.map(([, k, v], idx) => (
                    <div key={`${k}-${idx}`} className="oc-rationale-row">
                      <span>{k}</span>
                      <p>{v}</p>
                    </div>
                  ))
                ) : (
                  <p className="oc-rationale-plain">{o.rationale}</p>
                )}
              </div>
            )}
            {(o.excluded_audience || o.cta || metrics.length > 0 || risks.length > 0) && (
              <dl className="oc-terms-grid">
                {o.excluded_audience && (
                  <div className="wide">
                    <dt>Exclusions</dt>
                    <dd>{o.excluded_audience}</dd>
                  </div>
                )}
                {o.cta && (
                  <div>
                    <dt>Call to action</dt>
                    <dd>{o.cta}</dd>
                  </div>
                )}
                {metrics.length > 0 && (
                  <div className="wide">
                    <dt>Success metrics</dt>
                    <dd>
                      <ul>
                        {metrics.map((item: string, idx: number) => (
                          <li key={`${idx}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {risks.length > 0 && (
                  <div className="wide">
                    <dt>Risks &amp; assumptions</dt>
                    <dd>
                      <ul>
                        {risks.map((item: string, index: number) => (
                          <li key={`${index}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {editable && (
              <div className="oc-drawer-edit-bar">
                <button type="button" className="mw-mini-btn is-primary" onClick={onEdit}>
                  <Pencil size={12} /> Edit all offer details
                </button>
              </div>
            )}
          </div>
        )}
        </footer>
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
                <option key={val} value={val}>{label}</option>
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
                <option key={val} value={val}>{label}</option>
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
            <select
              value={f.product}
              onChange={e => up({ product: e.target.value, customAsp: false })}
            >
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
          <div><small>List price</small><b>{effectiveList ? money(effectiveList) : '—'}</b></div>
          <div><small>Offer price</small><b>{asp ? money(asp) : '—'}</b></div>
          <div><small>Client saves</small><b>{savings > 0 ? money(savings) : f.discount > 0 ? `${f.discount}% off` : 'Value-add'}</b></div>
          <div><small>Plan forecast</small><b>{money(asp * f.units, true)}</b></div>
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
              placeholder={'Why: Converts trial momentum within 72h\nLogic: Protects list rate with added value\nWatch: Enforce newcomer eligibility in Momence'}
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
                    onChange={e => up({ success_metrics: f.success_metrics.map((x, idx) => (idx === i ? e.target.value : x)) })}
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
              <button
                type="button"
                className="mw-mini-btn"
                onClick={() => up({ risks: [...f.risks, ''] })}
              >
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
            <Button size="sm" variant="ghost" type="button" disabled={busy} icon={<Trash2 size={13} />} onClick={onDelete}>
              Delete offer
            </Button>
          )}
          <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit" disabled={busy}>
            {busy ? 'Saving…' : mode === 'create' ? (solo ? 'Create here only' : 'Create everywhere') : solo ? 'Save here only' : 'Save everywhere'}
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
    try { return value ? JSON.parse(value) : []; } catch { return []; }
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
        <Button size="sm" variant="primary" disabled={loading || busy || !unlocked.length} onClick={() => onAsk('optimise')}>
          Optimise this set
        </Button>
        <Button size="sm" variant="ghost" disabled={loading || busy} onClick={() => onAsk('suggest')}>
          Suggest new offers
        </Button>
      </div>
      {loading && (
        <p className="mw-cp-loading">
          <Sparkles size={14} /> {state?.creating ? 'Creating complete draft offers and adding them to this month…' : 'Working through the numbers…'}
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
                <Button size="sm" variant="primary" disabled={busy} icon={<Check size={14} />} onClick={() => onApply([p])}>
                  Apply
                </Button>
              </footer>
            </article>
          ))}
          {(state.created || []).map(({ proposal: p, offerId, offer }: any) => (
            <article key={`created-${offerId}`} className="mw-cp-card created">
              <header>
                <span className="mw-cp-tag"><CheckCircle2 size={12} /> Draft offer created · #{offerId}</span>
                <h5>{offer.name}</h5>
                {offer.headline && <p className="mw-cp-job">{offer.headline}</p>}
              </header>
              <p className="mw-cp-benefit">{offer.benefit}</p>
              <dl>
                <div><dt>Membership</dt><dd>{p.productKey}</dd></div>
                <div><dt>Type · objective</dt><dd>{titleCase(p.offerType)} · {titleCase(p.objective)}</dd></div>
                <div><dt>Audience</dt><dd>{offer.audience}</dd></div>
                <div><dt>Price · discount</dt><dd>{money(offer.expected_asp)} · {p.discountPct}% off</dd></div>
                <div><dt>Target buyers</dt><dd>{number(offer.target_purchases)}</dd></div>
                <div><dt>Expected revenue</dt><dd>{lakh(offer.expected_revenue)}</dd></div>
                <div><dt>Validity</dt><dd>{offer.validity_start} – {offer.validity_end}</dd></div>
                <div><dt>Call to action</dt><dd>{offer.cta}</dd></div>
                <div className="wide"><dt>Redemption terms</dt><dd>{offer.redemption_conditions}</dd></div>
                <div className="wide"><dt>Exclusions</dt><dd>{offer.excluded_audience}</dd></div>
              </dl>
              <p className="mw-cp-why">{offer.rationale}</p>
              {list(offer.success_metrics).length > 0 && <details><summary>Success metrics</summary><ul>{list(offer.success_metrics).map((item: string) => <li key={item}>{item}</li>)}</ul></details>}
              {list(offer.risks).length > 0 && <details><summary>Risks and assumptions</summary><ul>{list(offer.risks).map((item: string, index: number) => <li key={`${index}-${item}`}>{item}</li>)}</ul></details>}
              <footer><span>Saved as a draft in the selected month plan. Costs are needed before approval.</span></footer>
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
}: {
  icon: any;
  title: React.ReactNode;
  hint?: React.ReactNode;
  editable?: boolean;
  onTitleChange?: (next: string) => void;
  onHintChange?: (next: string) => void;
  actions?: React.ReactNode;
  onDelete?: () => void;
}) {
  return (
    <header className={`mw-sh${actions || (editable && onDelete) ? ' has-actions' : ''}`}>
      <span className="mw-sh-icon">
        <Icon size={16} />
      </span>
      <div className="mw-sh-copy">
        {editable && onTitleChange && typeof title === 'string' ? (
          <input
            className="mw-sh-title-in"
            aria-label="Section title"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
          />
        ) : (
          <h4>{title}</h4>
        )}
        {editable && onHintChange && (typeof hint === 'string' || hint === undefined) ? (
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
      {(actions || (editable && onDelete)) && (
        <div className="mw-sh-actions">
          {actions}
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

function Act({ icon: Icon, label, title, text, tone, editable = false, labelEditable = false, onChange, onRemove }: any) {
  return (
    <div className={`mw-act mw-act-${tone}`}>
      <Icon size={15} />
      <div>
        {editable && labelEditable ? (
          <input className="mw-act-label" aria-label="Activation type" value={label} onChange={e => onChange({ label: e.target.value })} />
        ) : (
          <small>{label}</small>
        )}
        {editable ? (
          <div className="mw-act-edit">
            <input aria-label={`${label} title`} placeholder="Title" value={title} onChange={e => onChange({ title: e.target.value, text })} />
            <textarea aria-label={`${label} details`} placeholder="Mechanics, dates, owner" rows={3} value={text} onChange={e => onChange({ title, text: e.target.value })} />
          </div>
        ) : <><strong>{title}</strong><p>{text}</p></>}
      </div>
      {editable && onRemove && (
        <button type="button" className="mw-act-remove" aria-label={`Remove ${label}`} title="Remove activation" onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
