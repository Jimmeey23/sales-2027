import React, { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CalendarHeart,
  CheckCircle2,
  ChevronRight,
  CalendarRange,
  GanttChart,
  Gift,
  LayoutGrid,
  LineChart,
  Rows3,
  Sparkles,
  SquareStack,
  Trophy,
  Users,
} from 'lucide-react';
import { MONTHS, MONTHS_SHORT, money, number } from '../../types';
import { Badge, TableScroll } from '../../components/ui';
import { formatKeyDate, keyDatesFor, type KeyDate } from '../../data/keyDates';
import { monthActivations } from './CampaignsTab';
import MonthWorkspace from './MonthWorkspace';
import YearCalendar from './YearCalendar';
import { LOCATION_COLORS, accentFor, tint } from '../../data/locations';
import { lakh, type MonthRow, type PlanData } from './usePlanData';
import { useApp } from '../../App';

const SCENARIO_LABELS: Record<string, string> = {
  standard: 'Standard',
  aggressive: 'Aggressive',
  aspirational: 'Aspirational',
};
// Applying a scenario rewrites proposed targets for every studio and month, so it is an explicit, confirmed action.
function ScenarioControl() {
  const { scenario, setScenario, can, year } = useApp();
  const [choice, setChoice] = useState(scenario),
    [busy, setBusy] = useState(false);
  const apply = async () => {
    if (
      !window.confirm(
        `Apply the ${SCENARIO_LABELS[choice]} scenario to ${year}?\n\nThis rescales proposed targets for EVERY studio and month, for all users.`,
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
        <h2>Shared target scaling · {SCENARIO_LABELS[scenario]}</h2>
        <p>
          This scales proposed targets across all studios and reports. Regeneration posture is selected separately in the annual target matrix.{' '}
          {can('target_approve')
            ? 'Changing it rescales every proposed monthly target.'
            : 'Only approvers can change it.'}
        </p>
      </div>
      {can('target_approve') && (
        <div className="ws-segmented">
          {Object.entries(SCENARIO_LABELS).map(([id, label]) => (
            <button key={id} className={choice === id ? 'active' : ''} onClick={() => setChoice(id)}>
              {label}
            </button>
          ))}
          <button disabled={busy || choice === scenario} onClick={apply}>
            {busy ? 'Applying…' : 'Apply'}
          </button>
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
  const hasSavedSelection = Boolean(saved && (saved.slots !== null && saved.slots !== undefined || Array.isArray(saved.offer_ids)));
  if (hasSavedSelection) {
    const ids = new Set<number>([...Object.values(saved.slots || {}), ...(saved.offer_ids || [])].map(Number).filter(Boolean));
    return own.filter(o => ids.has(Number(o.id)));
  }
  const slots = ['newcomer', 'lapsed', 'renewal']
    .map(slot => own.find(o => o.plan_slot === slot && Number(o.plan_rank) === 1))
    .filter(Boolean) as any[];
  const extras = own
    .filter(o => o.generation_source === 'plan_2027' && !o.plan_slot)
    .sort((a, b) => Number(a.plan_rank || 999) - Number(b.plan_rank || 999) || Number(b.expected_revenue || 0) - Number(a.expected_revenue || 0))
    .slice(0, Math.max(0, 4 - slots.length));
  return [...slots, ...extras];
};
export const selectedInMonth = (data: PlanData, month: number) =>
  data.plans.flatMap(p => selectedForPlan(data, p, month));
const METRIC_LABELS: Record<string, string> = {
  leads: 'Leads needed',
  trials: 'Completed trials',
  buyers: 'Paying members',
  renewalPurchases: 'Renewal purchases',
  reactivated: 'Reactivations',
  approved: 'Approval',
};
const METRIC_HINTS: Record<string, string> = {
  leads: 'Trials needed ÷ historic lead → trial conversion for each studio.',
  trials: 'Paying members needed ÷ historic trial → member conversion (90-day window).',
  buyers: 'New-client revenue ÷ (average first membership spend + trial fee ÷ conversion).',
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
          <button key={m.month} onClick={() => onMonth(m.month)} title={`${MONTHS[i]}: ${fmt(values[i])}`}>
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

export default function TargetsTab({ data, onSaved }: { data: PlanData; onSaved: () => Promise<unknown> }) {
  const SOURCES = useSources();
  const multi = data.plans.length > 1,
    { year } = useApp();
  const [layout, setLayout] = useState('timeline'),
    [open, setOpen] = useState<number | null>(null),
    [metric, setMetric] = useState<string | null>(null);
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
  return (
    <>
      <ScenarioControl />
      <div className="mx-board">
        <div className="mx-group">
          <span className="mx-group-label">Revenue streams</span>
          <div className="mx-row">
            {totals.map(t => (
              <button
                key={t.key}
                className={`mx ${metric === t.key ? 'active' : ''}`}
                aria-pressed={metric === t.key}
                onClick={() => setMetric(metric === t.key ? null : t.key)}
              >
                <span>
                  <i style={{ background: t.color }} />
                  {t.label}
                </span>
                <strong>{lakh(t.value)}</strong>
                <small>{data.annual ? `${((t.value / data.annual) * 100).toFixed(0)}% of target` : '—'}</small>
              </button>
            ))}
            <button
              className={`mx ${metric === 'approved' ? 'active' : ''}`}
              aria-pressed={metric === 'approved'}
              onClick={() => setMetric(metric === 'approved' ? null : 'approved')}
            >
              <span>Approval</span>
              <strong>{approvedMonths}/12</strong>
              <small>months approved</small>
            </button>
          </div>
        </div>
        <div className="mx-group">
          <span className="mx-group-label">Volumes needed</span>
          <div className="mx-row">
            {funnel.map(([k, v]) => (
              <button
                key={k}
                className={`mx ${metric === k ? 'active' : ''}`}
                aria-pressed={metric === k}
                onClick={() => setMetric(metric === k ? null : k)}
              >
                <span>{METRIC_LABELS[k]}</span>
                <strong>{number(v)}</strong>
                <small>{number(Math.round(v / 12))} a month</small>
              </button>
            ))}
          </div>
        </div>
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
      <div className="ws-toolbar">
        <div>
          <h2>Year plan</h2>
          <p>Click any month to open and edit its full plan — offers, activations, revenue split and targets.</p>
        </div>
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
      </div>

      {layout === 'calendar' && <YearCalendar data={data} onOpen={setOpen} />}

      {layout === 'timeline' && (
        <ol className="ws-year-timeline">
          {data.months.map(m => {
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
                      <b>
                        {offers.length
                          ? offers
                              .slice(0, 2)
                              .map(o => o.name)
                              .join(', ')
                          : '—'}
                      </b>
                      {offers.length > 2 && <i>+{offers.length - 2} more</i>}
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

      {layout === 'cards' && (
        <div className="ws-month-grid">
          {data.months.map(m => {
            const offers = [...new Map(selectedInMonth(data, m.month).map(o => [o.name, o])).values()],
              dates = keyDatesFor(year, m.month);
            return (
              <button key={m.month} className={`ws-month-card ${m.planApproved ? 'plan-approved' : ''}`} onClick={() => setOpen(m.month)}>
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

      {layout === 'table' && (
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
                {data.months.map(m => (
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
        <div className="ws-card">
          <h3>Target by location</h3>
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
            <table className="data-table ws-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th className="num">Annual target</th>
                  <th className="num">Last year</th>
                  <th className="num">Growth</th>
                  <th className="num">Share</th>
                  <th className="num">Offers</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map(p => (
                  <tr key={p.studio.id}>
                    <td>
                      <strong>
                        <i className="ws-dot" style={{ background: LOCATION_COLORS[p.studio.name] }} />
                        {p.studio.name}
                      </strong>
                      <span>{p.studio.city}</span>
                    </td>
                    <td className="num">
                      <strong>{lakh(p.annual)}</strong>
                    </td>
                    <td className="num">{lakh(p.lastYear)}</td>
                    <td className="num">{pct(p.annual, p.lastYear)}</td>
                    <td className="num">{((p.annual / (data.annual || 1)) * 100).toFixed(0)}%</td>
                    <td className="num">
                      {
                        data.offers.filter(
                          o =>
                            LIVE(o) &&
                            (o.studio_id === p.studio.id ||
                              (p.studio.name === 'Pop-up' && ['Copper + Cloves', 'Plash Pilates'].includes(o.studio))),
                        ).length
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
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
