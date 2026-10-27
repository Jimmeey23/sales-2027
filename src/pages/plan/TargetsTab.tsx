import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CalendarHeart,
  CheckCircle2,
  ChevronRight,
  CalendarRange,
  Download,
  GanttChart,
  Gift,
  LayoutGrid,
  LineChart,
  RefreshCw,
  RotateCcw,
  Rows3,
  Search,
  Sparkles,
  SquareStack,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { MONTHS, MONTHS_SHORT, money, number } from '../../types';
import { Badge, TableScroll } from '../../components/ui';
import { formatKeyDate, keyDatesFor, type KeyDate } from '../../data/keyDates';
import { monthActivations } from './CampaignsTab';
import MonthWorkspace from './MonthWorkspace';
import TargetBreakdown from './TargetBreakdown';
import YearCalendar from './YearCalendar';
import { LOCATION_COLORS, accentFor, tint } from '../../data/locations';
import { lakh, type MonthRow, type PlanData } from './usePlanData';
import { useApp } from '../../App';

// One target per location. "Standard" is the plan; "Stretch" rescales every location-month to the
// sources' stretch case (Bengaluru workbook +10%; Mumbai report stretch ÷ base). Everything — the
// breakdown table, month plans, offers and reports — reads whichever is active.
const SCENARIO_LABELS: Record<string, string> = {
  standard: 'Standard',
  aggressive: 'Stretch',
};
function ScenarioControl() {
  const { scenario, setScenario, can, year } = useApp();
  const [busy, setBusy] = useState(false);
  const active = scenario === 'standard' ? 'standard' : 'aggressive';
  const apply = async (choice: string) => {
    if (choice === scenario) return;
    if (
      !window.confirm(
        `Switch ${year} targets to ${SCENARIO_LABELS[choice]}?\n\nThis rescales the target for EVERY location and month, for all users. You can switch back at any time.`,
      )
    )
      return;
    setBusy(true);
    await setScenario(choice);
    setBusy(false);
  };
  return (
    <div className="ws-toolbar">
      <div>
        <h2>Targets in use · {scenario === 'aspirational' ? 'Aspirational (legacy)' : SCENARIO_LABELS[active]}</h2>
        <p>
          Each location has one target. Standard is the plan; Stretch lifts every month to the stretch case.{' '}
          {can('target_approve') ? 'Switching recalculates every number on this page.' : 'Only approvers can switch.'}
        </p>
      </div>
      {can('target_approve') && (
        <div className="ws-segmented">
          {Object.entries(SCENARIO_LABELS).map(([id, label]) => (
            <button
              key={id}
              disabled={busy}
              className={active === id && scenario !== 'aspirational' ? 'active' : ''}
              onClick={() => apply(id)}
            >
              {busy && active !== id ? 'Switching…' : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const SOURCES = [
  { key: 'newClient', label: 'New clients', color: '#4b3fc4' },
  { key: 'renewal', label: 'Renewals / existing', color: '#7d72e6' },
  { key: 'reactivation', label: 'Reactivation', color: '#b3acf2' },
  { key: 'other', label: 'Other (gifts, privates, retail)', color: '#dcd8f7' },
] as const;
// Revenue streams as shades of the selected location's accent.
export function useSources() {
  const { boot, studioId } = useApp();
  const accent = accentFor(boot.studios.find(s => s.id === studioId)?.name);
  return SOURCES.map((s, i) => ({ ...s, color: tint(accent, [0, 0.35, 0.62, 0.84][i]) }));
}
const LIVE = (o: any) => !['archived', 'rejected'].includes(o.status);
const PLANNABLE = (o: any) => LIVE(o) && o.data_mode !== 'demo' && o.generation_source !== 'demo_seed';
export const offersInMonth = (data: PlanData, month: number) =>
  data.offers
    .filter(o => o.month === month && PLANNABLE(o))
    .sort(
      (a, b) => (a.plan_slot ? 0 : 1) - (b.plan_slot ? 0 : 1) || (b.expected_revenue || 0) - (a.expected_revenue || 0),
    );
// Match MonthWorkspace's saved selections and curated defaults. Scenario/demo offers are never defaults.
export const selectedForPlan = (data: PlanData, p: PlanData['plans'][number], month: number) => {
  const saved = p.detail.plans.find((x: any) => x.month === month);
  const studioIds = new Set<number>([p.studio.id, ...(p.detail.children || []).map((s: any) => s.id)]);
  const own = offersInMonth(data, month).filter(o => studioIds.has(Number(o.studio_id)));
  const hasSavedSelection = Boolean(
    saved && ((saved.slots !== null && saved.slots !== undefined) || Array.isArray(saved.offer_ids)),
  );
  if (hasSavedSelection) {
    const ids = new Set<number>(
      [...Object.values(saved.slots || {}), ...(saved.offer_ids || [])].map(Number).filter(Boolean),
    );
    return own.filter(o => ids.has(Number(o.id)));
  }
  const slots = ['newcomer', 'lapsed', 'renewal']
    .map(slot => own.find(o => o.plan_slot === slot && Number(o.plan_rank) === 1))
    .filter(Boolean) as any[];
  const extras = own
    .filter(o => o.generation_source === 'plan_2027' && !o.plan_slot)
    .sort(
      (a, b) =>
        Number(a.plan_rank || 999) - Number(b.plan_rank || 999) ||
        Number(b.expected_revenue || 0) - Number(a.expected_revenue || 0),
    )
    .slice(0, Math.max(0, 4 - slots.length));
  return [...slots, ...extras];
};
export const selectedInMonth = (data: PlanData, month: number) =>
  data.plans.flatMap(p => selectedForPlan(data, p, month));
const METRIC_LABELS: Record<string, string> = {
  leads: 'Leads needed',
  trials: 'First visits / trials',
  buyers: 'New paying clients',
  renewalPurchases: 'Renewal purchases',
  reactivated: 'Reactivations',
  approved: 'Approval',
};
const METRIC_HINTS: Record<string, string> = {
  leads: 'First visits ÷ lead → first-visit rate (see the target breakdown assumptions).',
  trials: 'New paying clients ÷ new paying clients per first visit.',
  buyers: 'New-client revenue ÷ first-month spend per new paying client.',
  renewalPurchases: 'Renewal target ÷ revenue per renewed membership.',
  reactivated: 'Reactivation target ÷ average comeback ticket.',
  approved: 'Months whose target has been approved for every location in view.',
};

// A metric opened up month by month; clicking a month opens its full plan.
function MetricFocus({
  data,
  metric,
  label,
  money: isMoney,
  onMonth,
  onClose,
}: {
  data: PlanData;
  metric: string;
  label: string;
  money: boolean;
  onMonth: (m: number) => void;
  onClose: () => void;
}) {
  const value = (m: MonthRow) => (metric === 'approved' ? (m.approved ? 1 : 0) : Number((m as any)[metric]) || 0);
  const values = data.months.map(value),
    max = Math.max(...values, 1),
    total = values.reduce((a, b) => a + b, 0),
    peak = values.indexOf(Math.max(...values));
  const fmt = (v: number) => (metric === 'approved' ? (v ? 'Approved' : 'Proposed') : isMoney ? lakh(v) : number(v));
  return (
    <section className="mx-focus" aria-label={`${label} by month`}>
      <header>
        <div>
          <span className="mx-group-label">{label} · month by month</span>
          <p>
            {METRIC_HINTS[metric] || 'Share of the annual target carried by this revenue stream.'}{' '}
            {metric !== 'approved' && (
              <>
                Peak in <b>{MONTHS[peak]}</b> ({fmt(values[peak])}); {fmt(total)} across the year.
              </>
            )}
          </p>
        </div>
        <button className="mx-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="mx-bars">
        {data.months.map((m, i) => (
          <button
            key={m.month}
            onClick={() => onMonth(m.month)}
            title={`${MONTHS[i]}: ${fmt(values[i])}. ${METRIC_HINTS[metric] || 'Monthly amount calculated from the active target and planning assumptions.'}`}
          >
            <b>{metric === 'approved' ? (values[i] ? '✓' : '·') : fmt(values[i])}</b>
            <span className="mx-bar">
              <i style={{ height: `${Math.max(4, (values[i] / max) * 100)}%` }} />
            </span>
            <small>{MONTHS_SHORT[i]}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

const pct = (a: number, b: number) => (b ? `${a >= b ? '+' : ''}${((a / b - 1) * 100).toFixed(0)}%` : '—');

export function SourceBar({ row }: { row: MonthRow }) {
  const SOURCES = useSources();
  const total = SOURCES.reduce((n, s) => n + (row as any)[s.key], 0) || 1;
  return (
    <div className="ws-mixbar" title={SOURCES.map(s => `${s.label}: ${lakh((row as any)[s.key])}`).join('\n')}>
      {SOURCES.map(s => (
        <span key={s.key} style={{ width: `${((row as any)[s.key] / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}

export default function TargetsTab({
  data,
  onSaved,
  section = 'metrics',
}: {
  data: PlanData;
  onSaved: () => Promise<unknown>;
  // metrics = Plan › Target Metrics (numbers); plan = Plan › Sales Plan (month-by-month plans)
  section?: 'metrics' | 'plan';
}) {
  const SOURCES = useSources();
  const multi = data.plans.length > 1,
    { year, boot, studioId, setStudioId, toast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [layout, setLayout] = useState('timeline'),
    [open, setOpenState] = useState<number | null>(() => {
      const m = Number(searchParams.get('month'));
      return m >= 1 && m <= 12 ? m : null;
    }),
    [metric, setMetric] = useState<string | null>(null),
    [query, setQuery] = useState(''),
    [scope, setScope] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'gap' | 'stretch' | 'pending'>('all');

  useEffect(() => {
    const m = Number(searchParams.get('month'));
    if (m >= 1 && m <= 12) setOpenState(m);
  }, [searchParams]);

  const setOpen = (m: number | null) => {
    setOpenState(m);
    const next = new URLSearchParams(searchParams);
    if (m === null) next.delete('month');
    else next.set('month', String(m));
    setSearchParams(next, { replace: true });
  };

  const layouts = [
    { id: 'timeline', label: 'Timeline', icon: GanttChart },
    { id: 'calendar', label: 'Year calendar', icon: CalendarRange },
    { id: 'cards', label: 'Month cards', icon: LayoutGrid },
    { id: 'table', label: 'Table', icon: Rows3 },
    { id: 'chart', label: 'Chart', icon: LineChart },
    { id: 'quarters', label: 'Quarters', icon: SquareStack },
    ...(multi ? [{ id: 'studios', label: 'By location', icon: Users }] : []),
  ];
  const totals = useMemo(
    () => SOURCES.map(s => ({ ...s, value: data.months.reduce((n, m) => n + (m as any)[s.key], 0) })),
    [data],
  );
  const funnel = ['leads', 'trials', 'buyers', 'renewalPurchases', 'reactivated'].map(
    k => [k, data.months.reduce((n, m) => n + (m as any)[k], 0)] as const,
  );
  const approvedMonths = data.months.filter(m => m.approved).length;
  const gapMonthsCount = data.months.filter(m => m.renewalGap > 0).length;
  const stretchMonthsCount = data.months.filter(m => m.feasibility === 'stretch').length;

  const visibleMonths = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.months.filter(m => {
      if (scope === 'q1' && m.month > 3) return false;
      if (scope === 'q2' && (m.month < 4 || m.month > 6)) return false;
      if (scope === 'q3' && (m.month < 7 || m.month > 9)) return false;
      if (scope === 'q4' && m.month < 10) return false;
      if (scope === 'gap' && !(m.renewalGap > 0)) return false;
      if (scope === 'stretch' && m.feasibility !== 'stretch') return false;
      if (scope === 'pending' && m.approved) return false;
      if (!q) return true;
      const offers = selectedInMonth(data, m.month);
      const dates = keyDatesFor(year, m.month);
      const { base } = monthActivations(data, m.month);
      const hay = [
        MONTHS[m.month - 1],
        MONTHS_SHORT[m.month - 1],
        m.theme,
        m.objective,
        m.leadOffer,
        base.challenge[0],
        ...offers.map(o => `${o.name} ${o.benefit || ''} ${o.headline || ''}`),
        ...dates.map(d => d.name),
      ]
        .join(' ')
        .toLowerCase();
      return q.split(/\s+/).every(term => hay.includes(term));
    });
  }, [data, query, scope, year]);

  const exportCsv = () => {
    const activeStudio = boot.studios.find(s => s.id === studioId);
    const scopeName = activeStudio ? activeStudio.name : 'All-Locations';
    const headers = [
      'Month',
      'Theme',
      'Status',
      'Target (INR)',
      'Last Year (INR)',
      'YoY Growth',
      'New Clients (INR)',
      'Renewals (INR)',
      'Reactivation (INR)',
      'Other (INR)',
      'Leads Needed',
      'Trials Needed',
      'Buyers Needed',
      'Lead Offer',
      'Selected Offers',
    ];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = data.months.map(m => {
      const offerNames = [...new Set(selectedInMonth(data, m.month).map(o => o.name))].join(' | ');
      return [
        MONTHS[m.month - 1],
        m.theme,
        m.planApproved ? 'Month Approved' : m.approved ? 'Target Approved' : 'Proposed',
        Math.round(m.target),
        Math.round(m.lastYear),
        pct(m.target, m.lastYear),
        Math.round((m as any).newClient || 0),
        Math.round((m as any).renewal || 0),
        Math.round((m as any).reactivation || 0),
        Math.round((m as any).other || 0),
        Math.round(m.leads),
        Math.round(m.trials),
        Math.round(m.buyers),
        m.leadOffer,
        offerNames,
      ]
        .map(esc)
        .join(',');
    });
    const csv = `\uFEFF${headers.map(esc).join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physique57-sales-plan-${year}-${scopeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${year} sales plan CSV for ${activeStudio ? activeStudio.name : 'all locations'}.`);
  };
  return (
    <>
      {section === 'metrics' && (
        <>
          <ScenarioControl />
          <div className="mx-board">
            <section className="mx-panel mx-panel-streams" aria-label="Revenue streams">
              <div className="mx-panel-head">
                <div className="mx-panel-title-wrap">
                  <span className="mx-panel-idx">01</span>
                  <div className="mx-panel-titles">
                    <span className="mx-group-label">Revenue streams</span>
                    <small>
                      Annual target mix across acquisition, renewals &amp; comeback · click any tile for 12-month split
                    </small>
                  </div>
                </div>
                <div className="mx-panel-summary">
                  <div
                    className="mx-mix-track"
                    aria-hidden="true"
                    title={totals.map(t => `${t.label}: ${lakh(t.value)}`).join(' · ')}
                  >
                    {totals.map(t => {
                      const w = data.annual ? (t.value / data.annual) * 100 : 0;
                      return w > 0 ? <span key={t.key} style={{ width: `${w}%`, background: t.color }} /> : null;
                    })}
                  </div>
                  <span className="mx-total-pill">
                    Annual <b>{lakh(data.annual)}</b>
                  </span>
                </div>
              </div>
              <div className="mx-row mx-row-streams">
                {totals.map(t => {
                  const share = data.annual ? Math.round((t.value / data.annual) * 100) : 0;
                  const shortLabel = t.key === 'other' ? 'Other streams' : t.label;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      className={`mx ${t.value === 0 ? 'is-zero' : ''} ${metric === t.key ? 'active' : ''}`}
                      aria-pressed={metric === t.key}
                      title={`${shortLabel}: ${t.key === 'newClient' ? 'sum of monthly new-client revenue allocations' : t.key === 'renewal' ? 'sum of monthly renewal revenue allocations' : t.key === 'reactivation' ? 'sum of monthly reactivation revenue allocations' : 'sum of other revenue allocations such as gifts, privates, and retail'}; share = this amount ÷ annual target.`}
                      onClick={() => setMetric(metric === t.key ? null : t.key)}
                    >
                      <div className="mx-head-row">
                        <span className="mx-title">
                          <i style={{ background: t.color }} />
                          {shortLabel}
                        </span>
                        <em className="mx-share-badge">{data.annual ? `${share}%` : '—'}</em>
                      </div>
                      <strong>{lakh(t.value)}</strong>
                      <span className="mx-mini-bar" aria-hidden="true">
                        <i style={{ width: `${t.value > 0 ? Math.max(5, share) : 0}%`, background: t.color }} />
                      </span>
                      <div className="mx-foot-row">
                        <small>{t.value > 0 ? `${lakh(t.value / 12)} / mo avg` : 'Gifts, privates & retail'}</small>
                        <span className="mx-drill-cue" aria-hidden="true">
                          12m ↗
                        </span>
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`mx mx-approval ${metric === 'approved' ? 'active' : ''}`}
                  aria-pressed={metric === 'approved'}
                  title="Approved months count the location-month targets with an approved target value; the maximum is 12."
                  onClick={() => setMetric(metric === 'approved' ? null : 'approved')}
                >
                  <div className="mx-head-row">
                    <span className="mx-title">
                      <CheckCircle2 size={13} className="mx-approval-ic" />
                      Approval
                    </span>
                    <em className={`mx-share-badge ${approvedMonths === 12 ? 'is-complete' : ''}`}>
                      {Math.round((approvedMonths / 12) * 100)}%
                    </em>
                  </div>
                  <strong>
                    {approvedMonths}
                    <em className="mx-denom">/12</em>
                  </strong>
                  <span className="mx-mini-bar" aria-hidden="true">
                    <i style={{ width: `${(approvedMonths / 12) * 100}%` }} />
                  </span>
                  <div className="mx-foot-row">
                    <small>
                      {approvedMonths === 12 ? 'All months approved' : `${12 - approvedMonths} months pending`}
                    </small>
                    <span className="mx-drill-cue" aria-hidden="true">
                      12m ↗
                    </span>
                  </div>
                </button>
              </div>
            </section>

            <section className="mx-panel mx-panel-volumes" aria-label="Volumes needed">
              {(() => {
                const volMap = Object.fromEntries(funnel) as Record<string, number>;
                const maxVol = Math.max(...funnel.map(([, v]) => v), 1);
                const leadToTrial = volMap.leads > 0 ? Math.round((volMap.trials / volMap.leads) * 100) : null;
                const trialToBuyer = volMap.trials > 0 ? Math.round((volMap.buyers / volMap.trials) * 100) : null;
                const VOL_META: Record<
                  string,
                  { icon: React.ComponentType<{ size?: number; className?: string }>; tag: string; kind: 'acq' | 'ret' }
                > = {
                  leads: { icon: Users, tag: 'Step 1 · Funnel', kind: 'acq' },
                  trials: {
                    icon: Sparkles,
                    tag: leadToTrial !== null ? `Step 2 · ${leadToTrial}% conv.` : 'Step 2 · Funnel',
                    kind: 'acq',
                  },
                  buyers: {
                    icon: Trophy,
                    tag: trialToBuyer !== null ? `Step 3 · ${trialToBuyer}% close` : 'Step 3 · Funnel',
                    kind: 'acq',
                  },
                  renewalPurchases: { icon: RefreshCw, tag: 'Retention', kind: 'ret' },
                  reactivated: { icon: RotateCcw, tag: 'Comeback', kind: 'ret' },
                };
                return (
                  <>
                    <div className="mx-panel-head">
                      <div className="mx-panel-title-wrap">
                        <span className="mx-panel-idx">02</span>
                        <div className="mx-panel-titles">
                          <span className="mx-group-label">Volumes needed</span>
                          <small>
                            Acquisition funnel stages &amp; member lifecycle volumes required across the year
                          </small>
                        </div>
                      </div>
                      <div className="mx-panel-summary">
                        <span className="mx-track-tag is-acq">Acquisition · 3 stages</span>
                        <span className="mx-track-tag is-ret">Lifecycle · 2 streams</span>
                        <span
                          className="mx-total-pill"
                          title={
                            stretchMonthsCount > 0
                              ? `${stretchMonthsCount} month(s) require stretch cohort conversion or ticket lift`
                              : 'All 12 months within historical cohort capacity'
                          }
                        >
                          Feasibility <b>{12 - stretchMonthsCount}/12 on-pace</b>
                        </span>
                      </div>
                    </div>
                    <div className="mx-row mx-row-volumes">
                      {funnel.map(([k, v], idx) => {
                        const meta = VOL_META[k] || { icon: Users, tag: 'Volume', kind: 'acq' as const };
                        const Icon = meta.icon;
                        const barW = v > 0 ? Math.max(6, Math.round((v / maxVol) * 100)) : 0;
                        return (
                          <button
                            key={k}
                            type="button"
                            className={`mx mx-vol mx-vol-${meta.kind} ${v === 0 ? 'is-zero' : ''} ${idx === 3 ? 'is-lifecycle-start' : ''} ${metric === k ? 'active' : ''}`}
                            aria-pressed={metric === k}
                            onClick={() => setMetric(metric === k ? null : k)}
                          >
                            <div className="mx-head-row">
                              <span className="mx-title">
                                <Icon size={13} className="mx-vol-ic" />
                                {METRIC_LABELS[k]}
                              </span>
                              <em className={`mx-vol-tag is-${meta.kind}`}>{meta.tag}</em>
                            </div>
                            <strong>{number(v)}</strong>
                            <span className="mx-mini-bar" aria-hidden="true">
                              <i style={{ width: `${barW}%` }} />
                            </span>
                            <div className="mx-foot-row">
                              <small>
                                <b>{number(Math.round(v / 12))}</b> / month avg
                              </small>
                              <span className="mx-drill-cue" aria-hidden="true">
                                12m ↗
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>

            {metric && (
              <MetricFocus
                data={data}
                metric={metric}
                label={METRIC_LABELS[metric] || totals.find(t => t.key === metric)?.label || ''}
                money={totals.some(t => t.key === metric)}
                onMonth={m => setOpen(m)}
                onClose={() => setMetric(null)}
              />
            )}
          </div>
          {year >= boot.planningYear && <TargetBreakdown onMonth={m => setOpen(m)} onSaved={onSaved} />}
        </>
      )}
      {section === 'plan' && (
        <>
          <div className="ws-toolbar">
            <div>
              <h2>Year plan</h2>
              <p>Click any month to open and edit its full plan — offers, activations, revenue split and targets.</p>
            </div>
            <div className="ws-toolbar-actions">
              <div className="ws-segmented">
                {layouts.map(l => {
                  const Icon = l.icon;
                  return (
                    <button key={l.id} className={layout === l.id ? 'active' : ''} onClick={() => setLayout(l.id)}>
                      <Icon size={15} />
                      {l.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="ws-export-btn"
                onClick={exportCsv}
                title="Download 12-month sales plan CSV"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {['timeline', 'cards', 'table'].includes(layout) && (
            <div className="ws-plan-filterbar" role="region" aria-label="Filter monthly plans">
              <div className="ws-plan-search">
                <Search size={14} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search months by offer, theme, festival, or activation…"
                  aria-label="Search months"
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="ws-plan-scopes" role="tablist" aria-label="Quarter and status filters">
                {(
                  [
                    ['all', 'All 12'],
                    ['q1', 'Q1'],
                    ['q2', 'Q2'],
                    ['q3', 'Q3'],
                    ['q4', 'Q4'],
                    ...(stretchMonthsCount > 0 ? [['stretch', `Stretch (${stretchMonthsCount})`]] : []),
                    ...(gapMonthsCount > 0 ? [['gap', `Renewal gap (${gapMonthsCount})`]] : []),
                    ...(approvedMonths < 12 ? [['pending', `Pending (${12 - approvedMonths})`]] : []),
                  ] as Array<[typeof scope, string]>
                ).map(([id, label]) => (
                  <button key={id} type="button" className={scope === id ? 'is-on' : ''} onClick={() => setScope(id)}>
                    {label}
                  </button>
                ))}
              </div>
              {(query || scope !== 'all') && (
                <span className="ws-plan-count">
                  <b>{visibleMonths.length}</b> of 12 months ·{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setScope('all');
                    }}
                  >
                    Reset
                  </button>
                </span>
              )}
            </div>
          )}

          {['timeline', 'cards', 'table'].includes(layout) && visibleMonths.length === 0 && (
            <div className="ws-card ws-filter-empty">
              <p>No months match the current search or filter.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setScope('all');
                }}
              >
                Show all 12 months
              </button>
            </div>
          )}

          {layout === 'calendar' && <YearCalendar data={data} onOpen={setOpen} />}

          {layout === 'timeline' && visibleMonths.length > 0 && (
            <ol className="ws-year-timeline">
              {visibleMonths.map(m => {
                const offers = selectedInMonth(data, m.month),
                  names = [...new Set(offers.map(o => o.name))],
                  dates = keyDatesFor(year, m.month),
                  { base } = monthActivations(data, m.month),
                  cover = m.renewalTarget ? m.expectedRenewal / m.renewalTarget : 0;
                return (
                  <li
                    key={m.month}
                    className={`${m.approved ? 'approved' : ''} ${m.planApproved ? 'plan-approved' : ''}`}
                    style={{ '--i': m.month } as React.CSSProperties}
                  >
                    <div className="yt-rail">
                      <span>{MONTHS_SHORT[m.month - 1]}</span>
                    </div>
                    <button className="yt-card" onClick={() => setOpen(m.month)}>
                      <div className="yt-main">
                        <div className="yt-title">
                          <em>{m.theme}</em>
                          <h3>{MONTHS[m.month - 1]}</h3>
                          <p>{m.objective}</p>
                        </div>
                        <div className="yt-target">
                          <strong>{lakh(m.target)}</strong>
                          <small className={m.target >= m.lastYear ? 'pos' : 'neg'}>
                            {pct(m.target, m.lastYear)} vs LY
                          </small>
                          {m.planApproved ? (
                            <Badge tone="green">
                              <CheckCircle2 size={11} /> Month approved
                            </Badge>
                          ) : m.approved ? (
                            <Badge tone="green">
                              <CheckCircle2 size={11} /> Approved
                            </Badge>
                          ) : (
                            <Badge tone="amber">Proposed</Badge>
                          )}
                        </div>
                      </div>
                      <SourceBar row={m} />
                      <span
                        className="yt-renew"
                        style={
                          {
                            '--w': `${Math.min(100, cover * 100)}%`,
                            '--c': cover >= 1 ? '#5b4fd6' : '#e8704f',
                          } as React.CSSProperties
                        }
                      >
                        <i /> Renewals {(cover * 100).toFixed(0)}% covered by expiring memberships
                        {m.renewalGap > 0 ? ` · ${lakh(m.renewalGap)} to find elsewhere` : ''}
                      </span>
                      <KeyDateChips dates={dates} />
                      <div className="yt-grid">
                        <div>
                          <small>
                            <Sparkles size={12} /> Lead offer
                          </small>
                          <b>{m.leadOffer}</b>
                        </div>
                        <div>
                          <small>
                            <Trophy size={12} /> Activation
                          </small>
                          <b>{base.challenge[0]}</b>
                        </div>
                        <div>
                          <small>
                            <Gift size={12} /> Promotions
                          </small>
                          <b>{names.length ? names.slice(0, 2).join(', ') : '—'}</b>
                          {names.length > 2 && <i>+{names.length - 2} more</i>}
                        </div>
                        <div>
                          <small>
                            <Users size={12} /> Funnel
                          </small>
                          <b>
                            {number(m.leads)} leads · {number(m.trials)} trials · {number(m.buyers)} buyers
                          </b>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {layout === 'cards' && visibleMonths.length > 0 && (
            <div className="ws-month-grid">
              {visibleMonths.map(m => {
                const offers = [...new Map(selectedInMonth(data, m.month).map(o => [o.name, o])).values()],
                  dates = keyDatesFor(year, m.month);
                return (
                  <button
                    key={m.month}
                    className={`ws-month-card ${m.planApproved ? 'plan-approved' : ''}`}
                    onClick={() => setOpen(m.month)}
                  >
                    <header>
                      <span>{MONTHS[m.month - 1]}</span>
                      {m.approved ? (
                        <Badge tone="green">
                          <CheckCircle2 size={11} /> Approved
                        </Badge>
                      ) : (
                        <Badge tone="amber">Proposed</Badge>
                      )}
                    </header>
                    <em className="ws-month-theme">{m.theme}</em>
                    <div className="ws-month-figure">
                      <strong className="ws-month-target">{lakh(m.target)}</strong>
                      <small className={m.target >= m.lastYear ? 'pos' : 'neg'}>
                        {pct(m.target, m.lastYear)} vs {lakh(m.lastYear)} LY
                      </small>
                    </div>
                    <SourceBar row={m} />
                    <KeyDateChips dates={dates} limit={3} />
                    <div className="ws-month-offer">
                      <Sparkles size={13} />
                      <span>
                        <b>{m.leadOffer}</b>
                        <em>{m.objective}</em>
                      </span>
                    </div>
                    <div className="ws-month-metrics">
                      <span>
                        <b>{number(m.leads)}</b> leads
                      </span>
                      <span>
                        <b>{number(m.trials)}</b> trials
                      </span>
                      <span>
                        <b>{number(m.buyers)}</b> buyers
                      </span>
                    </div>
                    {offers.length > 0 && (
                      <div className="ws-month-promos">
                        <Gift size={12} />
                        {offers.slice(0, 2).map(o => (
                          <span key={o.id}>{o.name}</span>
                        ))}
                        {offers.length > 2 && <span>+{offers.length - 2}</span>}
                      </div>
                    )}
                    <footer>
                      Open month plan <ChevronRight size={14} />
                    </footer>
                  </button>
                );
              })}
            </div>
          )}

          {layout === 'table' && visibleMonths.length > 0 && (
            <div className="ws-card">
              <TableScroll>
                <table className="data-table ws-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="num">Target</th>
                      <th className="num">Last year</th>
                      <th className="num">Growth</th>
                      {SOURCES.map(s => (
                        <th key={s.key} className="num">
                          {s.label}
                        </th>
                      ))}
                      <th className="num">Leads</th>
                      <th className="num">Trials</th>
                      <th className="num">Buyers</th>
                      <th>Lead offer</th>
                      <th className="num">Offers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMonths.map(m => (
                      <tr key={m.month} className="clickable-row" onClick={() => setOpen(m.month)}>
                        <td>
                          <strong>{MONTHS[m.month - 1]}</strong>
                        </td>
                        <td className="num">
                          <strong>{lakh(m.target)}</strong>
                        </td>
                        <td className="num">{lakh(m.lastYear)}</td>
                        <td className={`num ${m.target >= m.lastYear ? 'positive-text' : 'negative-text'}`}>
                          {pct(m.target, m.lastYear)}
                        </td>
                        {SOURCES.map(s => (
                          <td key={s.key} className="num">
                            {lakh((m as any)[s.key])}
                          </td>
                        ))}
                        <td className="num">{number(m.leads)}</td>
                        <td className="num">{number(m.trials)}</td>
                        <td className="num">{number(m.buyers)}</td>
                        <td>{m.leadOffer}</td>
                        <td className="num">{offersInMonth(data, m.month).length}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>
                        <strong>Year</strong>
                      </td>
                      <td className="num">
                        <strong>{lakh(data.annual)}</strong>
                      </td>
                      <td className="num">{lakh(data.lastYear)}</td>
                      <td className="num">{pct(data.annual, data.lastYear)}</td>
                      {totals.map(t => (
                        <td key={t.key} className="num">
                          {lakh(t.value)}
                        </td>
                      ))}
                      {funnel.slice(0, 3).map(([k, v]) => (
                        <td key={k} className="num">
                          {number(v)}
                        </td>
                      ))}
                      <td />
                      <td className="num">{data.offers.filter(LIVE).length}</td>
                    </tr>
                  </tfoot>
                </table>
              </TableScroll>
            </div>
          )}

          {layout === 'chart' && (
            <div className="ws-card">
              <h3>Monthly target by revenue source vs last year</h3>
              <div style={{ height: 380 }}>
                <ResponsiveContainer>
                  <ComposedChart data={data.months.map(m => ({ ...m, name: MONTHS_SHORT[m.month - 1] }))}>
                    <CartesianGrid stroke="#eceaf1" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                      tickLine={false}
                      axisLine={false}
                      width={56}
                    />
                    <Tooltip formatter={(v: any, n: any) => [money(v), n]} />
                    <Legend />
                    {SOURCES.map(s => (
                      <Bar
                        key={s.key}
                        dataKey={s.key}
                        name={s.label}
                        stackId="a"
                        fill={s.color}
                        radius={s.key === 'other' ? [5, 5, 0, 0] : 0}
                      />
                    ))}
                    <Line dataKey="lastYear" name="Last year" stroke="#211e2b" strokeDasharray="5 4" dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {layout === 'quarters' && (
            <div className="ws-quarter-grid">
              {[0, 1, 2, 3].map(q => {
                const ms = data.months.slice(q * 3, q * 3 + 3),
                  total = ms.reduce((n, m) => n + m.target, 0),
                  ly = ms.reduce((n, m) => n + m.lastYear, 0);
                return (
                  <div key={q} className="ws-quarter">
                    <header>
                      <span>Q{q + 1}</span>
                      <strong>{lakh(total)}</strong>
                      <small className={total >= ly ? 'pos' : 'neg'}>
                        {pct(total, ly)} vs LY · {((total / (data.annual || 1)) * 100).toFixed(0)}% of year
                      </small>
                    </header>
                    {ms.map(m => (
                      <button key={m.month} onClick={() => setOpen(m.month)}>
                        <div>
                          <b>{MONTHS[m.month - 1]}</b>
                          <span>{m.leadOffer}</span>
                        </div>
                        <strong>{lakh(m.target)}</strong>
                        <SourceBar row={m} />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {layout === 'studios' && (
            <div className="ws-studios-view">
              <div className="ws-loc-cards">
                {data.plans.map(p => {
                  const locColor = LOCATION_COLORS[p.studio.name] || '#3563d9';
                  const share = data.annual ? Math.round((p.annual / data.annual) * 100) : 0;
                  const newRev = p.months.reduce((n, m) => n + ((m as any).newClient || 0), 0);
                  const renRev = p.months.reduce((n, m) => n + ((m as any).renewal || 0), 0);
                  const reaRev = p.months.reduce((n, m) => n + ((m as any).reactivation || 0), 0);
                  const peakM = [...p.months].sort((a, b) => b.target - a.target)[0];
                  const offerCount = data.offers.filter(
                    o =>
                      LIVE(o) &&
                      (o.studio_id === p.studio.id ||
                        (p.studio.name === 'Pop-up' && ['Copper + Cloves', 'Plash Pilates'].includes(o.studio))),
                  ).length;
                  const code = p.studio.name
                    .split(/[\s-]+/)
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <article
                      key={p.studio.id}
                      className="ws-loc-card"
                      style={{ '--loc': locColor } as React.CSSProperties}
                    >
                      <header className="ws-loc-card-head">
                        <i className="ws-loc-card-badge">{code}</i>
                        <div className="ws-loc-card-titles">
                          <strong>{p.studio.name}</strong>
                          <small>{p.studio.city}</small>
                        </div>
                        <span className="ws-loc-card-share">{share}% share</span>
                      </header>
                      <div className="ws-loc-card-hero">
                        <strong>{lakh(p.annual)}</strong>
                        <span className={p.annual >= p.lastYear ? 'pos' : 'neg'}>
                          {pct(p.annual, p.lastYear)} vs {lakh(p.lastYear)} LY
                        </span>
                      </div>
                      <div
                        className="ws-loc-card-mix"
                        title={`New: ${lakh(newRev)} · Renewals: ${lakh(renRev)} · Reactivation: ${lakh(reaRev)}`}
                      >
                        <span style={{ width: `${p.annual ? (newRev / p.annual) * 100 : 0}%`, opacity: 1 }} />
                        <span style={{ width: `${p.annual ? (renRev / p.annual) * 100 : 0}%`, opacity: 0.62 }} />
                        <span style={{ width: `${p.annual ? (reaRev / p.annual) * 100 : 0}%`, opacity: 0.34 }} />
                      </div>
                      <dl className="ws-loc-card-stats">
                        <div>
                          <dt>Monthly avg</dt>
                          <dd>{lakh(p.annual / 12)}</dd>
                        </div>
                        <div>
                          <dt>Peak month</dt>
                          <dd>{peakM ? MONTHS_SHORT[peakM.month - 1] : '—'}</dd>
                        </div>
                        <div>
                          <dt>Live offers</dt>
                          <dd>{offerCount}</dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        className="ws-loc-card-cta"
                        onClick={() => {
                          setStudioId(p.studio.id);
                          setLayout('timeline');
                        }}
                      >
                        Focus {p.studio.name} plan <ChevronRight size={14} />
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="ws-card ws-loc-breakdown-card">
                <div className="ws-loc-section-head">
                  <div>
                    <h3>Monthly target stack by location</h3>
                    <p>
                      Contribution of each studio toward the {lakh(data.annual)} combined annual plan across all 12
                      months.
                    </p>
                  </div>
                </div>
                <div style={{ height: 340 }}>
                  <ResponsiveContainer>
                    <ComposedChart
                      data={data.months.map(m => ({
                        name: MONTHS_SHORT[m.month - 1],
                        ...Object.fromEntries(m.byStudio.map(s => [s.name, s.target])),
                      }))}
                    >
                      <CartesianGrid stroke="#eceaf1" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis
                        tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                        tickLine={false}
                        axisLine={false}
                        width={56}
                      />
                      <Tooltip formatter={(v: any, n: any) => [money(v), n]} />
                      <Legend />
                      {data.plans.map((p, i) => (
                        <Bar
                          key={p.studio.id}
                          dataKey={p.studio.name}
                          stackId="s"
                          fill={LOCATION_COLORS[p.studio.name]}
                          radius={i === data.plans.length - 1 ? [5, 5, 0, 0] : 0}
                        />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <TableScroll>
                  <table className="data-table ws-table ws-loc-table">
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th className="num">Annual target</th>
                        <th className="num">Last year</th>
                        <th className="num">Growth</th>
                        <th className="num">New clients</th>
                        <th className="num">Renewals</th>
                        <th className="num">Reactivation</th>
                        <th className="num">Share</th>
                        <th className="num">Offers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.plans.map(p => {
                        const share = data.annual ? Math.round((p.annual / data.annual) * 100) : 0;
                        const newRev = p.months.reduce((n, m) => n + ((m as any).newClient || 0), 0);
                        const renRev = p.months.reduce((n, m) => n + ((m as any).renewal || 0), 0);
                        const reaRev = p.months.reduce((n, m) => n + ((m as any).reactivation || 0), 0);
                        return (
                          <tr
                            key={p.studio.id}
                            className="clickable-row"
                            onClick={() => {
                              setStudioId(p.studio.id);
                              setLayout('timeline');
                            }}
                          >
                            <td>
                              <div className="ws-loc-table-cell">
                                <i className="ws-dot" style={{ background: LOCATION_COLORS[p.studio.name] }} />
                                <div>
                                  <strong>{p.studio.name}</strong>
                                  <span>{p.studio.city}</span>
                                </div>
                              </div>
                            </td>
                            <td className="num">
                              <strong>{lakh(p.annual)}</strong>
                            </td>
                            <td className="num">{lakh(p.lastYear)}</td>
                            <td className={`num ${p.annual >= p.lastYear ? 'positive-text' : 'negative-text'}`}>
                              {pct(p.annual, p.lastYear)}
                            </td>
                            <td className="num">{lakh(newRev)}</td>
                            <td className="num">{lakh(renRev)}</td>
                            <td className="num">{lakh(reaRev)}</td>
                            <td className="num">
                              <span className="ws-share-inline">{share}%</span>
                            </td>
                            <td className="num">
                              {
                                data.offers.filter(
                                  o =>
                                    LIVE(o) &&
                                    (o.studio_id === p.studio.id ||
                                      (p.studio.name === 'Pop-up' &&
                                        ['Copper + Cloves', 'Plash Pilates'].includes(o.studio))),
                                ).length
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            </div>
          )}
        </>
      )}
      {open !== null && (
        <MonthWorkspace data={data} month={open} setMonth={setOpen} onClose={() => setOpen(null)} onSaved={onSaved} />
      )}
    </>
  );
}

function KeyDateChips({ dates, limit }: { dates: KeyDate[]; limit?: number }) {
  const shown = limit ? dates.slice(0, limit) : dates;
  return (
    <div className="ws-keydates">
      <CalendarHeart size={13} />
      {shown.map(d => (
        <span key={d.name} className={`kd-${d.kind}`} title={d.approx ? 'Date to confirm' : undefined}>
          <b>{formatKeyDate(d)}</b> {d.name}
        </span>
      ))}
      {limit && dates.length > limit && <span className="kd-more">+{dates.length - limit}</span>}
    </div>
  );
}
