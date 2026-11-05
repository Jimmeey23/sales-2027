import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarHeart,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Copy,
  FileText,
  Flag,
  Gift,
  Handshake,
  HeartHandshake,
  LayoutGrid,
  MessageSquare,
  Lightbulb,
  Link2,
  LockKeyhole,
  ListChecks,
  PartyPopper,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Square,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Unlink,
  X,
} from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../App';
import { Button } from '../../components/ui';
import { LOCATION_COLORS, accentFor, locationStudioIds } from '../../data/locations';
import MarketingCollaterals from '../../components/MarketingCollaterals';
import { KEY_DATE_LABELS, formatKeyDate, keyDatesFor } from '../../data/keyDates';
import { MONTHS, money, number } from '../../types';
import { locationPlaybook, type ActionItem } from '../../data/planDefaults';
import { isLegacyTheme, monthChapter, monthStory } from '../../data/monthNarrative';
import { monthActivations } from './CampaignsTab';
import MonthCover from './MonthCover';
import MonthExplainer from '../../components/MonthExplainer';
import { buildExplainer, type ExplainerOffer } from '../../lib/explainerScript';
import PageHero from './PageHero';
import OfferLibrary from './OfferLibrary';
import { selectedForPlan } from './TargetsTab';
import { coverPhotoFor } from '../../data/pagePhotos';
import MonthOverview from './MonthOverview';
import OfferRevenueSummary from './OfferRevenueSummary';
import StudioAi from '../../components/StudioAi';
import TargetBreakdown from './TargetBreakdown';
import { lakh, type PlanData } from './usePlanData';
import { offerDescription, offerDetails } from '../../lib/offerSummary';
import { hasValidForecast, forecastRevenue } from '../../lib/forecast';
import { groupOffersByCategory } from '../../lib/offerCategory';
import {
  SLOT_KEYS,
  type PlanPage,
  PAGES,
  PAGE_OF_SECTION,
  LIVE,
  isRecommended,
  alternateFor,
  bankIdOf,
  isBankOffer,
  roleLabel,
  TEAM_ROLES,
  STREAMS,
  fullCoverageStreams,
  STREAM_OF,
  STREAM_KEY,
  type AiFocus,
  planBodyOf,
  inline,
  parseStrategyLines,
  serializeStrategyLines,
  StructuredLine,
  RichText,
  n,
  DAY_KIND_ICONS,
  monthContentWithCalendar,
  pct,
  FOCUS_POINTS,
  daysUntil,
  DAY_PLAYS,
  type Prices,
} from './month/shared';
import { MathsPanel } from './month/MathsPanel';
import { assignMonthPhotos, pickOfferCardPhoto, OfferCard } from './month/OfferCard';
import { OfferEditor } from './month/OfferEditor';
import { OfferCopilot } from './month/OfferCopilot';
import { OfferEditChat } from './month/OfferEditChat';
import { ReplaceOfferModal } from './month/ReplaceOfferModal';
import { setCopilotScope } from '../../lib/copilotActions';
import { useRowAlign } from '../../lib/useRowAlign';
import { SectionHead } from './month/SectionHead';
import { Act } from './month/Act';
import { VolumesChart } from './month/VolumesChart';

/** What a plan slot is called when the explainer introduces the offer sitting in it. */
const EXPLAINER_SLOT_LABEL: Record<string, string> = {
  newcomer: 'New clients',
  new_client: 'New clients',
  lapsed: 'Win-backs',
  reactivation: 'Win-backs',
  renewal: 'Renewals',
  retention: 'Renewals',
  upsell: 'Revenue boost',
};

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
  // Dock the library when it fits beside the cards. On smaller screens it is an
  // opt-in sheet, so opening the offer page never covers the offers themselves.
  const [libraryOpen, setLibraryOpen] = useState(() => window.matchMedia('(min-width: 1181px)').matches);
  const [studioIdx, setStudioIdx] = useState(0),
    [solo, setSolo] = useState(false),
    [mathsOpen, setMathsOpen] = useState(false),
    [studioAiOpen, setStudioAiOpen] = useState(false),
    [prices, setPrices] = useState<Prices | null>(null),
    [masterCode, setMasterCode] = useState(''),
    [masterCodeError, setMasterCodeError] = useState(''),
    // The passcode now opens one door only: the AI. It is asked for when an AI control is
    // used, not before the month can be edited.
    [aiGateOpen, setAiGateOpen] = useState(false);
  // The cover is the first page of a month: it mounts with the workspace and re-animates on month changes.
  const [coverOpen, setCoverOpen] = useState(true);
  const [explainerOpen, setExplainerOpen] = useState(false);
  // Months that have a recorded narration track. Missing ones fall back to the
  // browser's own voice, which the player names in its controls.
  const [narratedMonths, setNarratedMonths] = useState<number[]>([]);
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

  // Which months have been recorded. A missing or absent manifest is not an error: the
  // explainer speaks with the browser's voice instead.
  useEffect(() => {
    const slug = studio.name
      .toLowerCase()
      .replace(/[()]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    fetch('/explainer/manifest.json', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then((data: any) => setNarratedMonths(Array.isArray(data?.studios?.[slug]) ? data.studios[slug] : []))
      .catch(() => setNarratedMonths([]));
  }, [studio.name]);

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
  // An imported plan can reference one offer in both a primary slot and extras.
  // Render and forecast it once, matching the other month-plan views.
  const selectedIds = [...new Set([...(Object.values(slots).filter(Boolean) as number[]), ...extras])];
  const selected = selectedIds.map(id => ownOffers.find(o => o.id === id)).filter(Boolean) as any[];
  const slotOf = (id: number) => Object.entries(slots).find(([, v]) => v === id)?.[0];
  // What this location already runs in any month, so the library's quick actions speak
  // about this studio's plan rather than every studio's.
  const monthOffers = (m: number) => selectedForPlan(data, plan, m) as any[];
  const pickedBank = new Set(selected.map(o => bankIdOf(o)));
  const alternates = ownOffers
    .filter(o => o.year === year && isBankOffer(o) && !pickedBank.has(o.id))
    .sort(
      (a, b) =>
        Number(isRecommended(b, month)) - Number(isRecommended(a, month)) ||
        Number(!!alternateFor(b, month)) - Number(!!alternateFor(a, month)) ||
        n(b.expected_revenue) - n(a.expected_revenue),
    );
  const offerRevenue = selected.reduce((s, o) => s + forecastRevenue(o), 0);
  const forecastedCount = selected.filter(hasValidForecast).length;
  const groups = groupOffersByCategory(selected, o => slotOf(o.id));

  const initialEffectiveTarget = targetRow?.approved_target ?? targetRow?.proposed_target;
  const initialScale =
    targetRow && n(targetRow.proposed_target) ? n(initialEffectiveTarget) / n(targetRow.proposed_target) : 1;
  const heldOther = Math.round(n(targetRow?.other_target) * initialScale);
  const heldRepeat = Math.round(n(targetRow?.repeat_target) * initialScale);
  const held = heldOther + heldRepeat;
  const initialStreams = fullCoverageStreams(
    n(initialEffectiveTarget),
    n(targetRow?.renewal_target) * initialScale,
    n(targetRow?.reactivation_target) * initialScale,
    held,
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
  // `skipReset` names the month a save belonged to, so a save that finishes after the user has
  // moved on can never swallow the next month's reload. `saving` counts saves still in flight.
  const skipReset = useRef<string | null>(null),
    resetKey = useRef(''),
    lastSaved = useRef(''),
    saving = useRef(0);
  const planKey = `${month}-${studioIdx}`;
  useEffect(() => {
    const key = planKey;
    if (skipReset.current === key && resetKey.current === key) {
      skipReset.current = null;
      return;
    }
    skipReset.current = null;
    // Fresh data for the same month must not wipe what the user is still typing: while a save is
    // queued or in flight the local form is newer than the server copy, so keep it.
    if (resetKey.current === key && (pendingSave.current || saving.current > 0)) return;
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
  // Offer cards are always shown in full: the numbers, the spec and the why-it-works are the
  // point of the card, so nothing is folded away. Only the 1-up / 2-up reading preference
  // below persists with the month.
  // One card per row or two is a reading preference, so it rides the plan content like the
  // expanded set: it survives reloads and autosaves with the month.
  const offerColumns: 1 | 2 = form.content?.offerColumns === 1 ? 1 : 2;
  const setOfferColumns = (next: 1 | 2) => updateContent({ offerColumns: next });
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
      streams: {
        ...f.streams,
        newClient: Math.max(0, amount - held - n(f.streams.renewal) - n(f.streams.reactivation)),
      },
    }));
  };
  const changeStream = (key: string, value: number) => {
    const clean = Math.max(0, value);
    setForm(f => {
      const streams = { ...f.streams, [key]: clean };
      if (key === 'newClient') {
        if (approved) {
          const amount = n(targetRow?.approved_target);
          streams.renewal = Math.max(0, amount - held - clean - n(streams.reactivation));
          return { ...f, streams };
        }
        const nextTarget = Math.max(0, clean + held + n(streams.renewal) + n(streams.reactivation));
        return { ...f, target: nextTarget, streams };
      }
      const amount = approved ? n(targetRow?.approved_target) : f.target;
      streams.newClient = Math.max(0, amount - held - n(streams.renewal) - n(streams.reactivation));
      return { ...f, streams };
    });
  };

  const approved = targetRow?.approved_target !== null && targetRow?.approved_target !== undefined;
  const effective = approved ? n(targetRow.approved_target) : form.target;
  const streamTotal = held + STREAMS.reduce((s, x) => s + n(form.streams[x.key]), 0);
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
  // The month a change lands in: the one on screen, or another the library was pointed at.
  const offerChange = async (body: any, done: string, into: number = month) => {
    setBusy(true);
    try {
      const r = await api<{ studios: number[] }>(`/studio-plans/${studio.id}/${year}/${into}/offers`, {
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
  const replaceOffer = async (outId: number, incoming: any, into: number = month) => {
    const out = (into === month ? selected : monthOffers(into)).find((x: any) => x.id === outId);
    if (!out) return;
    const where = into === month ? '' : ` in ${MONTHS[into - 1]}`;
    if (await offerChange({ op: 'add', offerId: incoming.id }, `“${incoming.name}” added${where}`, into))
      await offerChange({ op: 'remove', offerId: outId }, `“${incoming.name}” replaced “${out.name}”${where}`, into);
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
    const key = resetKey.current;
    saving.current += 1;
    try {
      await api(p.url, { method: 'PUT', body: p.body });
      lastSaved.current = p.body;
      setAutoState('saved');
      skipReset.current = key;
      await onSaved();
    } catch (e: any) {
      setAutoState('error');
      toast(e.message || 'Autosave failed.', 'error');
    } finally {
      saving.current -= 1;
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
          repeatTarget: heldRepeat,
          otherTarget: heldOther,
          requireFullCoverage: true,
          monthlyPlan: planBodyOf(f),
        }),
      });
    else
      await api(`/studio-plans/${studio.id}/${year}/${month}`, { method: 'PUT', body: JSON.stringify(planBodyOf(f)) });
    lastSaved.current = JSON.stringify(planBodyOf(f));
    setAutoState('saved');
    skipReset.current = resetKey.current;
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
        const room = Math.max(0, effective - held);
        const renewal = Math.round((room * cover.renewal) / coverTotal);
        const reactivation = Math.round((room * cover.reactivation) / coverTotal);
        streams = { newClient: Math.max(0, Math.round(room) - renewal - reactivation), renewal, reactivation };
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
  // Planning marks — approve today, put media behind it — plus the note that explains either.
  // They save on the offer itself, so the decision travels with it into every other view.
  const offerPlanning = async (offer: any, patch: { performanceNotes?: string | null; runAds?: boolean }) => {
    try {
      await api(`/offers/${offer.id}/planning`, { method: 'PATCH', body: JSON.stringify(patch) });
      await onSaved();
      if (patch.runAds !== undefined)
        toast(patch.runAds ? `Ads planned for “${offer.name}”.` : `“${offer.name}” runs organically.`);
      if (patch.performanceNotes !== undefined) toast(patch.performanceNotes ? 'Note saved.' : 'Note cleared.');
      return true;
    } catch (e: any) {
      toast(e.message, 'error');
      return false;
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
  // Chat edits: null = closed; 0 = all of the month's offers; an id = that offer.
  const [editChat, setEditChat] = useState<number | null>(null);
  const [replacing, setReplacing] = useState<any | null>(null);
  // Two-up offer cards line up section by section.
  const offerListRef = useRef<HTMLDivElement | null>(null);
  useRowAlign(offerListRef, 'article.oc', [
    '.ocv-plate',
    '.ocv-keyterms',
    '.ocv-head',
    '.ocv-offer-highlight.is-front',
    '.ocv-figures',
    '.ocv-facts',
  ]);
  // Tell the app-wide copilot which studio and month are on screen.
  useEffect(() => {
    setCopilotScope({ studioId: studio?.id ?? null, year, month, label: studio?.name ?? null });
    return () => {
      setCopilotScope({});
    };
  }, [studio?.id, studio?.name, year, month]);
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
            repeatTarget: heldRepeat,
            otherTarget: heldOther,
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
      // The cover is a full page: arrow keys belong to it, not to month navigation.
      if (!coverOpen && (e.key === 'ArrowLeft' || e.key === '[') && month > 1) {
        e.preventDefault();
        setMonth(month - 1);
      } else if (!coverOpen && (e.key === 'ArrowRight' || e.key === ']') && month < 12) {
        e.preventDefault();
        setMonth(month + 1);
      } else if (e.key === '\\' && page === 'offers' && !coverOpen) {
        e.preventDefault();
        setLibraryOpen(o => !o);
      } else if (!coverOpen && /^[1-5]$/.test(e.key)) {
        // The five pages, in the order the tabs are drawn.
        e.preventDefault();
        setPage(PAGES[Number(e.key) - 1]);
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
  // Ticking a step off is progress, not editing: anyone who can edit plans can mark it, even
  // once the plan is approved. When the page is read-only only the actions list is saved.
  // Only the live week is open (week 1 for months not under way); the rest fold to one line.
  const liveWeek = () => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month ? Math.min(5, Math.ceil(now.getDate() / 7)) : 1;
  };
  const [collapsedWeeks, setCollapsedWeeks] = useState<number[]>(() => [1, 2, 3, 4, 5].filter(w => w !== liveWeek()));
  useEffect(() => {
    setCollapsedWeeks([1, 2, 3, 4, 5].filter(w => w !== liveWeek()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);
  const toggleWeek = (week: number) =>
    setCollapsedWeeks(list => (list.includes(week) ? list.filter(w => w !== week) : [...list, week]));
  // The editing passcode hides pencils, not progress: ticking only needs the plan permission.
  const canTick = boot.user.permissions.includes('target_edit') && !!studio?.id;
  // Ticks save one at a time, each sending the latest list, so fast clicks can't land out of order.
  const actionsRef = useRef(form.actions);
  actionsRef.current = form.actions;
  const tickQueue = useRef<Promise<void>>(Promise.resolve());
  const toggleDone = (index: number, done: boolean) => {
    if (!canTick) return;
    setForm(f => {
      const next = f.actions.map((x, j) => (j === index ? { ...x, done } : x));
      actionsRef.current = next;
      return { ...f, actions: next };
    });
    if (editable) return; // autosave carries it
    const url = `/studio-plans/${studio.id}/${year}/${month}`;
    saving.current += 1;
    tickQueue.current = tickQueue.current.then(async () => {
      try {
        await api(url, {
          method: 'PUT',
          body: JSON.stringify({ actions: actionsRef.current.filter(a => String(a.text || '').trim()) }),
        });
        skipReset.current = resetKey.current;
        await onSaved();
      } catch (e: any) {
        toast(e.message || 'Could not save the step.', 'error');
        skipReset.current = null;
        await onSaved(); // reload the server's copy rather than guess at a rollback
      } finally {
        saving.current -= 1;
      }
    });
  };
  const coverage = econ?.renewal.coverage ?? null;
  const coverStreams = [
    { key: 'newClient', label: 'New clients', value: n(form.streams.newClient) },
    { key: 'renewal', label: 'Renewals', value: n(form.streams.renewal) },
    { key: 'reactivation', label: 'Comeback', value: n(form.streams.reactivation) },
  ];
  const chapter = monthChapter(month);
  /* A month imported from a plan document carries its own theme, brief, risk and offers. The
     shipped plan's chapter is a fallback for months that have not been through an import —
     never a replacement for the words the studio actually filed. */
  const importedPlan = Boolean(form.content?.planImport);
  const savedTheme = form.theme || row.theme || chapter.theme;
  // Months planned before the narrative rewrite carry a generic label; the chapter names them now.
  const displayTheme = importedPlan
    ? savedTheme
    : isLegacyTheme(form.theme, month) || isLegacyTheme(row.theme, month)
      ? chapter.theme
      : savedTheme;
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
  const planOfferNames = (() => {
    const bySlot: Record<string, string> = {};
    for (const offer of selected) {
      const slot = offer.plan_slot || slotOf(offer.id);
      if (slot && !bySlot[slot]) bySlot[slot] = String(offer.name || '');
    }
    return bySlot;
  })();
  const coverBrief = importedPlan ? String(form.notes || form.objective || chapter.brief) : chapter.brief;
  const coverRisk = importedPlan ? String(form.content?.ai?.risks?.[0] || '') || undefined : chapter.risk;
  const coverSignature = importedPlan
    ? selected
        .map((offer: any) => String(offer.name || ''))
        .filter(Boolean)
        .join(' · ') || chapter.signature
    : chapter.signature;
  /* The filed focus is written as a description; the objective is a stats list, so it is
     only a fallback, and then only its first plain sentence. */
  const coverDescription = (() => {
    const focus = String(form.content?.focus || form.content?.planImport?.focus || '').trim();
    if (focus) return focus;
    const plain = String(form.objective || chapter.objective || '')
      .replace(/•/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain
      .split(/(?<=[.!?])\s+/)
      .slice(0, 2)
      .join(' ');
  })();

  /* The explainer is built from what the month actually holds — the live offers, the
     streams as they stand right now, the plan's own words — so pressing play on a month
     that has just been edited narrates the edited month, not a snapshot of it. */
  const explainerOffers: ExplainerOffer[] = React.useMemo(
    () =>
      selected.map((offer: any) => {
        const rawSlot = String(offer.plan_slot || slotOf(offer.id) || offer.objective || '').toLowerCase();
        const metrics = (() => {
          const raw = offer.success_metrics;
          if (Array.isArray(raw)) return raw;
          try {
            const parsed = JSON.parse(String(raw || '[]'));
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
        const start = offer.validity_start ? new Date(`${offer.validity_start}T00:00:00Z`) : null;
        const end = offer.validity_end ? new Date(`${offer.validity_end}T00:00:00Z`) : null;
        const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        return {
          id: offer.id,
          name: String(offer.name || 'Offer'),
          slot: rawSlot,
          slotLabel: EXPLAINER_SLOT_LABEL[rawSlot] || 'Revenue boost',
          headline: offer.headline || null,
          // Spoken, the mechanic is the customer-facing line; the internal note is full of
          // prices, dashes and bracketed asides that flatten a voice.
          benefit: offer.customer_copy || offer.benefit || offer.internal_description || null,
          rationale: offer.rationale || null,
          audience: offer.audience || null,
          conditions: offer.redemption_conditions || null,
          kpi: metrics.map(String).filter(Boolean).join(' · ') || null,
          offerType: offer.offer_type || null,
          ticket: Number(offer.expected_asp) || 0,
          buyers: Number(offer.target_purchases) || 0,
          revenue: forecastRevenue(offer),
          discount: offer.effective_discount == null ? null : Number(offer.effective_discount),
          validity: start && end ? `${day(start)} – ${day(end)}` : null,
        };
      }),
    [selected, slots],
  );
  /* Memoised: the player keys its scene effect on the script, so a new identity on every
     keystroke would restart the narration mid-sentence. */
  const explainerScript = React.useMemo(
    () =>
      buildExplainer({
        studioName: studio.name,
        month,
        year,
        theme: displayTheme,
        description: coverDescription,
        target: effective,
        lastYear: row.lastYear,
        streams: [...coverStreams, { key: 'other', label: 'Other', value: Math.max(0, held) }],
        standardTrade: (form.content?.standardTrade as any) || null,
        leads: row.leads,
        trials: row.trials,
        buyers: row.buyers,
        renewalsDue: econ?.renewal.projectedExpiries || row.renewalsDue || 0,
        renewalCoverage: coverage,
        offers: explainerOffers,
        offerRevenue,
        plan: coverPlan.map(step => ({ label: step.label, text: step.text })),
      }),
    [
      month,
      year,
      studio.name,
      displayTheme,
      coverDescription,
      effective,
      row.lastYear,
      row.leads,
      row.trials,
      row.buyers,
      row.renewalsDue,
      econ,
      coverage,
      held,
      form.streams,
      form.content,
      offerRevenue,
      coverPlan,
      explainerOffers,
    ],
  );

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
    theme: displayTheme,
    objective: form.objective || row.objective || null,
    planOffers: planOfferNames,
  });
  const showOnPage = (key: string) => isSectionVisible(key) && PAGE_OF_SECTION[key] === page;
  const pageTabs: Array<{ id: PlanPage; label: string; meta?: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'targets', label: 'Targets & mix' },
    { id: 'offers', label: 'Offers', meta: selected.length ? String(selected.length) : undefined },
    { id: 'collaterals', label: 'Collaterals' },
    { id: 'execution', label: 'Execution' },
  ];
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
              {/* One drawer over the whole month: the audit, the copy editor, names,
                  actions and goals all read this month's numbers. */}
              <button
                type="button"
                className={`mw-maths-launch is-ai ${studioAiOpen ? 'active' : ''}`}
                aria-expanded={studioAiOpen}
                title="Studio intelligence — audit, copy, names, actions and goals for this month"
                onClick={() => (aiReady ? setStudioAiOpen(open => !open) : setAiGateOpen(true))}
              >
                <Sparkles size={15} />
                <span>Intelligence</span>
              </button>
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

        <div className={`mw-body${page === 'offers' && libraryOpen ? ' has-rail' : ''}`} inert={coverOpen}>
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
                    onClick={() => setLibraryOpen(o => !o)}
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
                meta={[
                  { label: 'Offers', value: `${selected.length}` },
                  { label: 'Projected revenue', value: forecastedCount ? lakh(offerRevenue) : '—' },
                  { label: 'Of target', value: effective ? `${Math.round((offerRevenue / effective) * 100)}%` : '—' },
                ]}
              />
            )}

            {page === 'collaterals' && (
              <PageHero
                index="04"
                label="Collaterals"
                title="What has to be made, and by when"
                description="Every asset the studio owes this month's offers — channel by channel, with the copy, the sizes and the date it is due at the desk."
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
                chapter={{
                  ...chapter,
                  // The lede is the month's own filed job; the shipped plan's only when nothing is picked.
                  objective: String(form.objective || row.objective || (selected.length ? '' : chapter.objective)),
                  // The brief names this month's live offers, never the shipped plan's.
                  briefPoints: selected.map((o: any) => ({
                    name: String(o.name || o.title || 'Offer'),
                    line: offerDescription(o),
                  })),
                }}
                theme={
                  // The headline is the month's saved theme; failing that, the live offers lead.
                  importedPlan || !(isLegacyTheme(form.theme, month) || isLegacyTheme(row.theme, month))
                    ? form.theme ||
                      row.theme ||
                      selected
                        .map((o: any) => o.name)
                        .filter(Boolean)
                        .join(' · ') ||
                      chapter.theme
                    : selected
                        .map((o: any) => o.name)
                        .filter(Boolean)
                        .join(' · ') || chapter.theme
                }
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
                forecastedOffers={forecastedCount}
                renewalsDue={econ?.renewal.projectedExpiries || row.renewalsDue || 0}
                renewalCoverage={coverage}
                streams={coverStreams}
                photo={coverPhoto}
                status={coverStatus}
                onOpenOffers={() => setPage('offers')}
              />
            )}

            {/* The filed launch brief, with the live projection kept distinct from its estimate. */}

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

            {/* The complete, year-wide breakdown the plan's numbers come from. It is the same
                table the target metrics screen shows, kept inside the month so the target and
                the mix can be read — and challenged — without leaving the plan. */}
            {page === 'targets' && (
              <div className="mw-section mw-target-table" id="mw-sec-target-table">
                <TargetBreakdown
                  studio={studio.id}
                  onMonth={next => setMonth(next)}
                  onSaved={async () => {
                    await onSaved();
                  }}
                />
              </div>
            )}

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
                  // Falls back to the measured rate the plan is built on, never to a made-up one.
                  const autoRate = (k: string) => n(plan.economics?.assumptions?.[k]?.auto) || 0;
                  const t2m = Math.max(0.01, n(econ.newClient.trialToMember) || autoRate('trialToMember'));
                  const l2t = Math.max(0.01, n(econ.newClient.leadToTrial) || autoRate('leadToTrial'));
                  const firstSpend = Math.max(1, n(econ.newClient.firstSpend) || autoRate('firstSpend'));
                  const trialSpend = Math.max(0, n(econ.newClient.trialSpend));
                  const revPerBuyer = firstSpend + (t2m > 0 ? trialSpend / t2m : 0);
                  const liveBuyers = liveNewTarget > 0 ? Math.ceil(liveNewTarget / revPerBuyer) : 0;
                  const liveTrials = liveBuyers > 0 ? Math.ceil(liveBuyers / t2m) : 0;
                  const liveLeads = liveTrials > 0 ? Math.ceil(liveTrials / l2t) : 0;
                  const renTicket = Math.max(1, n(econ.renewal.ticket) || autoRate('renewalTicket'));
                  const reactTicket = Math.max(1, n(econ.reactivation.ticket) || autoRate('reactivationTicket'));
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
                                            const rest = Math.max(0, Math.round(effective) - held - ren - react);
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
                                          {a.owner && <em>{roleLabel(a.owner)}</em>}
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
                          <button
                            type="button"
                            className="mw-mini-btn"
                            onClick={() => setLibraryOpen(o => !o)}
                            title="Browse every offer this studio can run, and add or swap them in"
                          >
                            <LayoutGrid size={12} /> Offer library
                            <em>{alternates.length}</em>
                          </button>
                          {(sectionEditable('offers') || offersEditable) && selected.length > 0 && (
                            <button
                              type="button"
                              className="mw-mini-btn"
                              onClick={() => setEditChat(c => (c === null ? 0 : null))}
                              title="Chat with the copilot to change this month's offers"
                            >
                              <MessageSquare size={12} /> Edit with copilot
                            </button>
                          )}
                          {(sectionEditable('offers') || offersEditable) && (
                            <button type="button" className="mw-mini-btn is-primary" onClick={() => openNewOffer()}>
                              <Plus size={12} /> New offer
                            </button>
                          )}
                        </>
                      }
                    />

                    {replacing && (
                      <ReplaceOfferModal
                        offer={replacing}
                        bank={alternates}
                        month={month}
                        year={year}
                        theme={displayTheme}
                        busy={busy}
                        onClose={() => setReplacing(null)}
                        onPick={async incoming => {
                          await replaceOffer(replacing.id, incoming);
                          setReplacing(null);
                        }}
                        onCreate={async f => {
                          const edit = {
                            name: f.name,
                            headline: f.headline,
                            benefit: f.benefit,
                            audience: f.audience,
                            offer_type: f.offer_type,
                            objective: f.objective,
                            redemption_conditions: f.redemption_conditions,
                            expected_asp: f.expected_asp,
                            target_purchases: f.target_purchases,
                            plan_slot: replacing.plan_slot || slotOf(replacing.id) || null,
                            pricing: { discount: f.discount_percent / 100 },
                          };
                          if (await offerChange({ op: 'create', edit }, `“${f.name}” created`)) {
                            await offerChange(
                              { op: 'remove', offerId: replacing.id },
                              `“${f.name}” replaced “${replacing.name}”`,
                            );
                            setReplacing(null);
                          }
                        }}
                      />
                    )}
                    {editChat !== null && selected.length > 0 && (
                      <OfferEditChat
                        offers={selected}
                        month={month}
                        year={year}
                        studioName={studio.name}
                        theme={displayTheme}
                        objective={String(form.objective || '')}
                        target={effective}
                        focusId={editChat || null}
                        onClose={() => setEditChat(null)}
                        onApply={(offerId, changes, name) =>
                          offerChange({ op: 'update', offerId, edit: changes }, `“${name}” updated by copilot`)
                        }
                      />
                    )}

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
                        // The bar behind "buyers needed" compares an offer with what the month actually
                        // requires on its stream — new buyers, renewers or reactivations at the rates
                        // measured on this studio's history — not with a sum of hand-typed targets.
                        const monthUnitsTotal = orderedOffers.reduce(
                          (sum, { offer }) => sum + (forecastRevenue(offer) > 0 ? n(offer.target_purchases) || 0 : 0),
                          0,
                        );
                        const SLOT_NEED: Record<string, string> = {
                          newcomer: 'new clients',
                          lapsed: 'win-backs',
                          renewal: 'renewals',
                        };
                        const slotRequirement = (slot?: string | null) => {
                          if (!econ) return 0;
                          if (slot === 'newcomer') return n(econ.newClient.buyers);
                          if (slot === 'lapsed') return n(econ.reactivation.needed);
                          if (slot === 'renewal') return n(econ.renewal.renewersNeeded);
                          return 0;
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
                              onPlanning={offerPlanning}
                              onEdit={() => {
                                setCreatingOffer(null);
                                setEditing(o.id);
                              }}
                              onChat={() => setEditChat(o.id)}
                              onReplace={() => setReplacing(o)}
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
                              monthUnits={slotRequirement(slotOf(o.id) || o.plan_slot) || monthUnitsTotal}
                              monthUnitsLabel={SLOT_NEED[String(slotOf(o.id) || o.plan_slot)] || ''}
                              photo={photoById.get(o.id)}
                              studioName={studio.name}
                              monthName={`${MONTHS[month - 1]} ${year}`}
                              monthTheme={displayTheme}
                              monthJob={form.objective}
                            />
                          );

                        return (
                          <div className="mw-offers-board">
                            <OfferRevenueSummary
                              revenue={offerRevenue}
                              count={selected.length}
                              forecastedCount={forecastedCount}
                              target={effective}
                              categories={activeGroups.map(group => ({
                                key: group.key,
                                label: group.label,
                                count: group.offers.length,
                                forecastedCount: group.offers.filter(hasValidForecast).length,
                                revenue: group.offers.reduce((sum, offer) => sum + forecastRevenue(offer), 0),
                              }))}
                            />
                            <div
                              ref={offerListRef}
                              className={`mw-offer-list ${offerColumns === 2 ? 'is-two-up' : 'is-one-up'}`}
                            >
                              {activeGroups.flatMap(g => {
                                const total = g.offers.reduce((sum, o) => sum + forecastRevenue(o), 0);
                                return [
                                  <div
                                    key={`divider-${g.key}`}
                                    className={`mp-offer-divider category-${g.key}`}
                                    data-offer-category={g.key}
                                    role="heading"
                                    aria-level={4}
                                  >
                                    <span>{g.label}</span>
                                    <em>
                                      {g.offers.length} {g.offers.length === 1 ? 'offer' : 'offers'}
                                    </em>
                                    <i aria-hidden="true" />
                                    <b>{g.offers.some(hasValidForecast) ? lakh(total) : '—'}</b>
                                  </div>,
                                  ...g.offers.map(o => {
                                    // Keep alternatives with their own card, so a full-width alternate
                                    // row cannot push the next offer out of a two-column layout.
                                    const alts = alternates.filter(a => alternateFor(a, month)?.for === o.name);
                                    return (
                                      <div
                                        key={o.id}
                                        data-offer-category={g.key}
                                        className={`mw-offer-item${g.offers.length === 1 || editing === o.id ? ' is-wide' : ''}`}
                                      >
                                        {renderItem(o, orderedOffers.findIndex(x => x.offer.id === o.id) + 1, g.label)}
                                        {alts.length > 0 && (
                                          <div className="mw-offer-alts">
                                            {alts.map(a => (
                                              <div key={a.id} className="mw-offer-alt">
                                                <b className="mw-alt-tag">Alternate</b>
                                                <span>
                                                  <strong>{a.name}</strong>
                                                  <em>{a.headline || a.benefit}</em>
                                                </span>
                                                <small title="Scenario only — not counted in the month's forecast">
                                                  {forecastRevenue(a) > 0
                                                    ? `${lakh(forecastRevenue(a))} scenario`
                                                    : 'No forecast'}
                                                </small>
                                                {o.approval_status !== 'approved' && (
                                                  <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => replaceOffer(o.id, a)}
                                                    title={`Swap ${a.name} in for ${o.name}`}
                                                  >
                                                    <RefreshCcw size={12} /> Swap in
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }),
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
                              <span
                                className={`mw-gp-state ${state}`}
                                style={
                                  { ['--p' as string]: Math.min(100, Math.round(ratio * 100)) } as React.CSSProperties
                                }
                              >
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
                                        owner: 'Team Leader',
                                        week: 1,
                                        done: false,
                                      },
                                      {
                                        text: 'Mid-month renewal & trial conversion check-in',
                                        owner: 'Senior CST',
                                        week: 2,
                                        done: false,
                                      },
                                      {
                                        text: '48-hour closing reminder broadcast & lapsed follow-up calls',
                                        owner: 'Team Leader',
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
                          <datalist id="p57-team-roles">
                            {TEAM_ROLES.map(r => (
                              <option key={r} value={r} />
                            ))}
                          </datalist>
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
                                <b>{new Set(form.actions.map(a => roleLabel(a.owner)).filter(Boolean)).size}</b>
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
                              const open = !collapsedWeeks.includes(phase.week);
                              const complete = phase.items.length > 0 && phaseDone === phase.items.length;
                              const pct = phase.items.length ? Math.round((phaseDone / phase.items.length) * 100) : 0;
                              const editing = sectionEditable('actions');
                              return (
                                <li
                                  key={phase.week}
                                  className={`mp-phase${phase.items.length ? ' has-steps' : ' is-empty'}${open ? ' is-open' : ' is-closed'}${complete ? ' is-complete' : ''}`}
                                  style={{ '--i': gi, '--pct': `${pct}%` } as React.CSSProperties}
                                >
                                  <button
                                    type="button"
                                    className="mp-phase-toggle"
                                    aria-expanded={open}
                                    onClick={() => toggleWeek(phase.week)}
                                  >
                                    <span className="mp-phase-badge">
                                      <small>Week</small>
                                      <b>{String(phase.week).padStart(2, '0')}</b>
                                    </span>
                                    <span className="mp-phase-title">
                                      <strong>{phase.label}</strong>
                                      <em>
                                        {phase.range ? `${MONTHS[month - 1].slice(0, 3)} ${phase.range} · ` : ''}
                                        {phase.hint}
                                      </em>
                                    </span>
                                    <span className="mp-phase-progress" aria-hidden="true">
                                      <i />
                                    </span>
                                    <span className={`mp-phase-count${complete ? ' is-done' : ''}`}>
                                      {complete ? <Check size={12} /> : null}
                                      {phase.items.length ? `${phaseDone}/${phase.items.length}` : '—'}
                                    </span>
                                    <ChevronDown size={16} className="mp-phase-chev" aria-hidden="true" />
                                  </button>

                                  {open && (
                                    <div className="mp-phase-body">
                                      {phase.items.length > 0 && (
                                        <ul className="mp-steps">
                                          {phase.items.map(({ action, index }) => (
                                            <li key={index} className={`mp-step${action.done ? ' is-done' : ''}`}>
                                              <label className="mp-step-check">
                                                <input
                                                  type="checkbox"
                                                  checked={action.done}
                                                  aria-label={`Mark “${action.text || 'step'}” done`}
                                                  onChange={e => toggleDone(index, e.target.checked)}
                                                  disabled={!canTick}
                                                />
                                                <i aria-hidden="true">
                                                  <Check size={12} strokeWidth={3} />
                                                </i>
                                              </label>
                                              <div className="mp-step-body">
                                                {editing ? (
                                                  <>
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
                                                        value={roleLabel(action.owner)}
                                                        list="p57-team-roles"
                                                        placeholder="Team Leader / Senior CST / CST"
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
                                                  </>
                                                ) : (
                                                  <span
                                                    className="mp-step-read"
                                                    onClick={() => canTick && toggleDone(index, !action.done)}
                                                  >
                                                    {action.text ? inline(action.text) : <em>Untitled step</em>}
                                                  </span>
                                                )}
                                              </div>
                                              {!editing && action.owner && (
                                                <span className="mp-step-owner-pill">{roleLabel(action.owner)}</span>
                                              )}
                                              {editing && (
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
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      {editing && (
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
                                  )}
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

          {page === 'offers' && libraryOpen && (
            <>
              <button
                type="button"
                className="mw-rail-scrim"
                aria-label="Hide the offer library"
                onClick={() => setLibraryOpen(false)}
              />
              <aside className="mw-lib-rail" aria-label="Offer library">
                <OfferLibrary
                  offers={alternates}
                  month={month}
                  selected={selected}
                  editable={offersEditable}
                  busy={busy}
                  labels={prices?.keys || {}}
                  isRecommended={isRecommended}
                  alternateFor={alternateFor}
                  photoFor={(o, i) => pickOfferCardPhoto(o, o.plan_slot, i + 1)}
                  offersInMonth={monthOffers}
                  onAdd={(o: any, into: number) =>
                    offerChange(
                      { op: 'add', offerId: o.id },
                      into === month ? `“${o.name}” added` : `“${o.name}” added to ${MONTHS[into - 1]}`,
                      into,
                    )
                  }
                  onSwap={replaceOffer}
                  onClose={() => setLibraryOpen(false)}
                />
              </aside>
            </>
          )}
        </div>

        {coverOpen && (
          <MonthCover
            key={`cover-${month}-${studioIdx}`}
            month={month}
            year={year}
            studioName={studio.name}
            theme={displayTheme}
            brief={coverBrief}
            description={coverDescription}
            risk={coverRisk}
            signature={coverSignature}
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
            offerRevenue={offerRevenue}
            offerNames={selected.map((o: any) => ({
              name: String(o.name),
              slot: String(slotOf(o.id) || o.plan_slot || o.objective || ''),
            }))}
            status={coverStatus}
            photo={coverPhoto}
            onPlay={() => setExplainerOpen(true)}
            playMinutes={Math.max(1, Math.round(explainerScript.duration / 60000))}
            onOpen={() => setCoverOpen(false)}
            onClose={onClose}
            onPrev={() => month > 1 && setMonth(month - 1)}
            onNext={() => month < 12 && setMonth(month + 1)}
          />
        )}
      </section>

      {/* Studio intelligence sits over the month, not inside a section, so it can read
          every part of the plan and hand text back to the field it came from. */}
      {explainerOpen && (
        <MonthExplainer
          script={explainerScript}
          audioUrl={
            narratedMonths.includes(month)
              ? `/explainer/${studio.name
                  .toLowerCase()
                  .replace(/[()]/g, '')
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}-${String(month).padStart(2, '0')}.mp3`
              : null
          }
          onClose={() => setExplainerOpen(false)}
          onOpenPlan={() => {
            setExplainerOpen(false);
            setCoverOpen(false);
          }}
        />
      )}

      {studioAiOpen && aiReady && (
        <StudioAi
          studioId={studio.id}
          year={year}
          month={month}
          monthName={MONTHS[month - 1]}
          theme={displayTheme}
          onClose={() => setStudioAiOpen(false)}
          onUseCopy={text => {
            if (!editable) {
              navigator.clipboard?.writeText(text);
              toast('Copied — this month is read-only, so it was not written in.');
              return;
            }
            updateContent({ notes: text });
            toast('Written into the month’s notes.');
          }}
        />
      )}
    </div>
  );
}
