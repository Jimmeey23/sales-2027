import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../App';
import { useLoad } from '../../hooks';
import { MONTHS_SHORT } from '../../types';
import { Badge, Button, ErrorState, Loading } from '../../components/ui';
import { accentFor } from '../../data/locations';

// Month-by-month breakdown of the ONE target per location (server: lib/targetBreakdown). Every column
// is derived from that target with the location's planning assumptions, so switching Standard ↔ Stretch
// or editing a month's target changes the whole table.

type UnitKey = 'm1' | 'm3' | 'm6' | 'annual' | 'packs' | 'singles' | 'intro' | 'privates';
interface BMonth {
  month: number;
  seasonIndex: number;
  target: number;
  lastYear: number;
  growth: number | null;
  newRevenue: number;
  existingRevenue: number;
  newPaying: number;
  firstVisits: number;
  leads: number;
  packageConversions: number;
  existingPaying: number;
  totalPaying: number;
  newMemberSpend: number;
  avgSpend: number;
  leadsPerWeek: number;
  checkins: number;
  units: Record<UnitKey, number>;
  retailRevenue: number;
  lastYearEstimated?: boolean;
}
interface BLocation {
  studio: { id: number; name: string; city: string };
  assumptions: any;
  venues: Array<{ studio: { id: number; name: string }; annual: number }>;
  months: BMonth[];
  total: BMonth;
  monthlyAverage: { existingPaying: number; totalPaying: number; avgSpend: number };
}
interface BResponse {
  year: number;
  scenario: string;
  unitGroups: Array<{ key: UnitKey; label: string }>;
  locations: BLocation[];
}

const rupee = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const lakh = (v: number) => `₹${(v / 1e5).toFixed(1)}L`;
const int = (v: number) => Math.round(v).toLocaleString('en-IN');
const pct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`;
const share = (v: number) => `${(v * 100).toFixed(0)}%`;
const SUMS: Array<keyof BMonth> = [
  'target',
  'lastYear',
  'newRevenue',
  'existingRevenue',
  'newPaying',
  'firstVisits',
  'leads',
  'packageConversions',
  'existingPaying',
  'totalPaying',
  'leadsPerWeek',
  'checkins',
  'retailRevenue',
];
function addMonth(a: BMonth, b: BMonth): BMonth {
  const out: any = { ...a, units: { ...a.units } };
  for (const k of SUMS) out[k] = (a as any)[k] + (b as any)[k];
  out.newMemberSpend = out.newPaying
    ? (a.newMemberSpend * a.newPaying + b.newMemberSpend * b.newPaying) / out.newPaying
    : 0;
  for (const k of Object.keys(out.units) as UnitKey[]) out.units[k] = a.units[k] + b.units[k];
  out.growth = out.lastYear > 0 ? out.target / out.lastYear - 1 : null;
  out.avgSpend = out.totalPaying ? out.target / out.totalPaying : 0;
  out.lastYearEstimated = Boolean(a.lastYearEstimated || b.lastYearEstimated);
  return out;
}
function combine(locs: BLocation[]): BLocation {
  const months = Array.from({ length: 12 }, (_, i) =>
    locs.slice(1).reduce((s, l) => addMonth(s, l.months[i]), locs[0].months[i]),
  );
  const annual = months.reduce((s, m) => s + m.target, 0);
  months.forEach(m => (m.seasonIndex = annual ? (m.target / annual) * 12 : 0));
  const total = locs.slice(1).reduce((s, l) => addMonth(s, l.total), locs[0].total);
  total.seasonIndex = 12;
  return {
    studio: { id: 0, name: 'All locations', city: '' },
    assumptions: null,
    venues: [],
    months,
    total,
    monthlyAverage: {
      existingPaying: total.existingPaying / 12,
      totalPaying: total.totalPaying / 12,
      avgSpend: total.totalPaying ? total.target / total.totalPaying : 0,
    },
  };
}

type Col = { key: string; label: string; group: string; get: (m: BMonth, total: boolean) => string; title?: string };
const METRIC_FORMULAS: Record<string, string> = {
  si: 'Season index = this month target ÷ average monthly target.',
  t: 'Revenue target = approved target when available; otherwise proposed target.',
  ly: 'Prior-year revenue for the same month; future months may use the marked estimate.',
  g: 'Growth = selected target ÷ prior-year revenue − 1.',
  nr: 'New-client revenue allocation for this month.',
  er: 'Existing-client revenue = total target − new-client revenue.',
  rt: 'Retail revenue = total target × location retail share.',
  ld: 'Leads = trials ÷ lead-to-trial rate; rounded up.',
  lw: 'Leads per week = leads ÷ days in month × 7.',
  fv: 'Trials = buyers ÷ trial-to-purchase rate; rounded up.',
  np: 'Buyers = new-client revenue ÷ (first-month member spend + trial spend ÷ trial-to-purchase rate); rounded up.',
  pc: 'Package conversions = trials × first-visit-to-package rate.',
  ep: 'Existing paying clients = existing-client revenue ÷ monthly spend per existing client.',
  tp: 'Total paying clients = new buyers + existing paying clients.',
  ci: 'Check-ins = classes per month × average class capacity × fill rate.',
};

// One "targets" section: header with the Standard/Stretch switch (`switcher`), the streams & volumes board
// (`children`), then the month-by-month table.
export default function TargetBreakdown({
  onMonth,
  onSaved,
  switcher,
  children,
  studio,
}: {
  onMonth: (month: number) => void;
  onSaved: () => Promise<unknown>;
  switcher?: React.ReactNode;
  children?: React.ReactNode;
  /* Embeddings inside a month plan pass their own studio so the table matches the plan on screen. */
  studio?: number | null;
}) {
  const { studioId: workspaceStudio, year, scenario, can } = useApp();
  const studioId = studio === undefined ? workspaceStudio : studio;
  const { data, loading, error, reload } = useLoad<BResponse>(
    () => api(`/targets/breakdown?year=${year}${studioId ? `&studio=${studioId}` : ''}`),
    [studioId, year, scenario],
  );
  const [view, setView] = useState<string>('all');
  const [groups, setGroups] = useState<Record<string, boolean>>({
    Revenue: true,
    Funnel: true,
    Units: true,
    Studio: true,
  });

  const locs = data?.locations || [];
  const all = useMemo(() => (locs.length > 1 ? combine(locs) : null), [locs]);
  const current: BLocation | null = studioId
    ? locs[0] || null
    : view === 'all'
      ? all
      : locs.find(l => String(l.studio.id) === view) || all;

  if (loading && !data) return <Loading label="Building the target breakdown…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data || !current) return null;

  const units = data.unitGroups.filter(g => current.total.units[g.key] > 0);
  const cols: Col[] = [
    {
      key: 'si',
      label: 'Season index',
      group: 'Revenue',
      get: m => m.seasonIndex.toFixed(2),
      title: 'Month target ÷ average month',
    },
    { key: 't', label: 'Revenue target', group: 'Revenue', get: m => rupee(m.target) },
    {
      key: 'ly',
      label: `${year - 1} same month`,
      group: 'Revenue',
      get: (m, t) => (m.lastYear ? `${rupee(m.lastYear)}${!t && m.lastYearEstimated ? ' e' : ''}` : '—'),
      title: 'Actual for complete months; e = estimate (same month two years back × year-to-date growth)',
    },
    { key: 'g', label: 'Growth vs 2026', group: 'Revenue', get: m => pct(m.growth) },
    { key: 'nr', label: 'New-client revenue', group: 'Revenue', get: m => rupee(m.newRevenue) },
    { key: 'er', label: 'Existing-client revenue', group: 'Revenue', get: m => rupee(m.existingRevenue) },
    { key: 'rt', label: 'Retail revenue', group: 'Revenue', get: m => rupee(m.retailRevenue) },
    { key: 'ld', label: 'Leads needed', group: 'Funnel', get: m => int(m.leads) },
    {
      key: 'lw',
      label: 'Leads / week',
      group: 'Funnel',
      get: (m, t) => (t ? (m.leads / 52.14).toFixed(0) : m.leadsPerWeek.toFixed(0)),
      title: 'Total row: weekly average',
    },
    { key: 'fv', label: 'First visits / trials', group: 'Funnel', get: m => int(m.firstVisits) },
    { key: 'np', label: 'New paying clients', group: 'Funnel', get: m => int(m.newPaying) },
    { key: 'pc', label: 'Package conversions', group: 'Funnel', get: m => int(m.packageConversions) },
    {
      key: 'ep',
      label: 'Existing paying clients',
      group: 'Funnel',
      get: (m, t) => int(t ? current.monthlyAverage.existingPaying : m.existingPaying),
      title: 'Total row: monthly average',
    },
    {
      key: 'tp',
      label: 'Total paying clients',
      group: 'Funnel',
      get: (m, t) => int(t ? current.monthlyAverage.totalPaying : m.totalPaying),
      title: 'Total row: monthly average',
    },
    {
      key: 'ns',
      label: 'Avg new-member spend',
      group: 'Funnel',
      get: m => rupee(m.newMemberSpend),
      title: 'Location-specific first-month spend assumption used in the new-client revenue calculation.',
    },
    {
      key: 'as',
      label: 'Blended spend / paying client',
      group: 'Funnel',
      get: m => rupee(m.avgSpend),
      title:
        'Total target revenue ÷ new plus existing paying clients. This blended average differs from the new-member spend assumption.',
    },
    { key: 'ci', label: 'Check-ins target', group: 'Studio', get: m => int(m.checkins) },
    ...units.map(u => ({
      key: `u_${u.key}`,
      label: u.label,
      group: 'Units',
      get: (m: BMonth) => int(m.units[u.key]),
      title: `${u.label} units = target after retail share × this product group’s revenue mix ÷ its realized price.`,
    })),
  ];
  const shown = cols.filter(c => groups[c.group]);
  const groupSpans = shown.reduce<Array<{ group: string; n: number }>>((acc, c) => {
    const last = acc[acc.length - 1];
    if (last && last.group === c.group) last.n++;
    else acc.push({ group: c.group, n: 1 });
    return acc;
  }, []);
  const monthLabel = (m: number) => `${MONTHS_SHORT[m - 1]}-${year}`;
  const accent = accentFor(current.studio.id ? current.studio.name : null);

  const exportCsv = () => {
    const head = ['Month', ...cols.map(c => c.label)];
    const rows = current.months.map(m => [monthLabel(m.month), ...cols.map(c => c.get(m, false))]);
    rows.push([`${year} total`, ...cols.map(c => c.get(current.total, true))]);
    const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `p57-${year}-target-breakdown-${current.studio.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const a = current.assumptions;
  const scenarioLabel = data.scenario === 'standard' ? 'Standard' : 'Stretch';
  return (
    <section className="tb" style={{ ['--tb' as any]: accent }}>
      <div className="ws-toolbar">
        <div>
          <h2>
            {year} targets · {current.studio.name}{' '}
            <Badge tone={data.scenario === 'standard' ? 'green' : 'purple'}>{scenarioLabel} target</Badge>
          </h2>
          <p>
            <b>{lakh(current.total.target)}</b> · {pct(current.total.growth)} vs 2026 ({lakh(current.total.lastYear)}) ·
            blended spend {rupee(current.monthlyAverage.avgSpend)} per paying client.
          </p>
          <p>
            One target per location; every number below is calculated from it. Click a month to open its plan.
            {current.venues.length > 0 &&
              ` Pop-up = ${current.venues.map(v => `${v.studio.name} ${lakh(v.annual)}`).join(' + ')}.`}
          </p>
        </div>
        <div className="ws-toolbar-actions">
          {switcher}
          <div className="ws-segmented" aria-label="Column groups">
            {['Revenue', 'Funnel', 'Studio', 'Units'].map(g => (
              <button
                key={g}
                className={groups[g] ? 'active' : ''}
                onClick={() => setGroups(s => ({ ...s, [g]: !s[g] }))}
              >
                {g === 'Funnel' ? 'Clients & funnel' : g === 'Units' ? 'Units by product' : g}
              </button>
            ))}
          </div>
          <button type="button" className="ws-export-btn" onClick={exportCsv}>
            <Download size={14} />
            <span>Export breakdown</span>
          </button>
        </div>
      </div>

      {!studioId && locs.length > 1 && (
        <div className="tb-loc" role="tablist" aria-label="Location">
          {[
            { id: 'all', name: 'All locations', annual: all?.total.target || 0 },
            ...locs.map(l => ({ id: String(l.studio.id), name: l.studio.name, annual: l.total.target })),
          ].map(l => (
            <button
              key={l.id}
              role="tab"
              aria-selected={view === l.id}
              className={view === l.id ? 'active' : ''}
              onClick={() => setView(l.id)}
            >
              <span>{l.name}</span>
              <strong>{lakh(l.annual)}</strong>
            </button>
          ))}
        </div>
      )}
      {!studioId && locs.length > 1 && view === 'all' && (
        <p className="tb-edit-note">
          Assumptions are set per location. Select a location above to view or edit its values.
        </p>
      )}

      {children}

      <div className="tb-scroll">
        <table className="tb-table">
          <thead>
            <tr className="tb-groups">
              <th rowSpan={2} className="tb-sticky">
                Month
              </th>
              {groupSpans.map((g, i) => (
                <th key={`${g.group}-${i}`} colSpan={g.n} className={`tb-g tb-g-${g.group.toLowerCase()}`}>
                  {g.group === 'Funnel'
                    ? 'Clients & funnel'
                    : g.group === 'Units'
                      ? 'Units by product'
                      : g.group === 'Studio'
                        ? 'Studio'
                        : 'Revenue'}
                </th>
              ))}
            </tr>
            <tr>
              {shown.map(c => (
                <th
                  key={c.key}
                  title={
                    c.title ||
                    `${c.label}. ${METRIC_FORMULAS[c.key] || 'Calculated from the selected monthly target and location assumptions.'}`
                  }
                  className={`tb-g-${c.group.toLowerCase()}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.months.map(m => (
              <tr key={m.month} onClick={() => onMonth(m.month)} title={`Open ${MONTHS_SHORT[m.month - 1]} plan`}>
                <th className="tb-sticky">{monthLabel(m.month)}</th>
                {shown.map(c => (
                  <td
                    key={c.key}
                    title={
                      c.title ||
                      `${c.label}: ${METRIC_FORMULAS[c.key] || 'Calculated from the selected monthly target and location assumptions.'}`
                    }
                    className={c.key === 't' ? 'tb-strong' : c.key === 'g' && (m.growth ?? 0) < 0 ? 'tb-neg' : ''}
                  >
                    {c.get(m, false)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="tb-sticky">{year} total</th>
              {shown.map(c => (
                <td key={c.key}>{c.get(current.total, true)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="tb-foot">
        e = estimate for months not yet complete. Counts round up per month, so annual unit totals can sit slightly
        above the revenue maths. Existing and total paying clients in the total row are monthly averages; leads / week
        is a weekly average.
      </p>

      {a && (
        <details className="tb-assume">
          <summary>
            How {current.studio.name}'s numbers are calculated — planning assumptions
            {a.overridden?.length ? <Badge tone="amber">{a.overridden.length} planner override(s)</Badge> : null}
          </summary>
          {current.studio.id > 0 && can('target_edit') && (
            <TargetAssumptionsEditor
              studioId={current.studio.id}
              studioName={current.studio.name}
              year={year}
              onSaved={async () => {
                await reload();
                await onSaved();
              }}
            />
          )}
          <p className="tb-hint">
            The plan divides by the rates these locations actually deliver: conversion and spend are the trailing twelve
            months of the studio's own history, refreshed by <code>scripts/measure-studio-rates.ts</code>. Growth comes
            from the operating levers — fill, classes and mix — not from assuming a better conversion.
          </p>
          <div className="tb-assume-grid">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rate</th>
                  <th className="num">Last 12 months</th>
                  <th className="num">{year} plan</th>
                  <th>Formula</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    'firstMonthSpend',
                    'First-month spend per new paying client',
                    rupee,
                    'Buyers = new-client revenue ÷ (member spend + visit spend ÷ trial conversion)',
                  ],
                  ['payingPerVisit', 'Trial → purchase', share, 'Trials = buyers ÷ this'],
                  ['avgSpendPerVisit', 'Average spend per visit', rupee, 'Average spend = net revenue ÷ check-ins'],
                  ['leadToVisit', 'Lead → trial', share, 'Leads = trials ÷ this'],
                  [
                    'visitToPackage',
                    'First visit → package conversion',
                    share,
                    'Package conversions = first visits × this',
                  ],
                  [
                    'existingSpend',
                    'Monthly spend per existing paying client',
                    rupee,
                    'Existing paying = existing revenue ÷ this',
                  ],
                  ['retailShare', 'Retail share of revenue', share, 'Retail revenue = target × this'],
                  [
                    'classesPerMonth',
                    'Classes per month',
                    (v: number) => v.toFixed(0),
                    'Check-ins = classes × capacity × fill',
                  ],
                  ['capacity', 'Average capacity per class', (v: number) => v.toFixed(1), ''],
                  ['fill', 'Fill rate', share, ''],
                ].map(([k, label, f, formula]: any) => (
                  <tr key={k}>
                    <td>
                      {label}
                      {a.overridden?.includes(k) && <Badge tone="amber">override</Badge>}
                    </td>
                    <td className="num">{a.t12?.[k] != null ? f(a.t12[k]) : '—'}</td>
                    <td className="num">
                      <strong>{f(a[k])}</strong>
                    </td>
                    <td>
                      <small>{formula}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product group</th>
                    <th className="num">Mix</th>
                    <th className="num">₹ / unit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unitGroups
                    .filter(g => a.mix[g.key] > 0)
                    .map(g => (
                      <tr key={g.key}>
                        <td>{g.label}</td>
                        <td className="num">{share(a.mix[g.key])}</td>
                        <td className="num">{rupee(a.price[g.key])}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <ul className="tb-notes">
                {(a.notes || []).map((n: string) => (
                  <li key={n}>{n}</li>
                ))}
                {a.overridden?.length > 0 && (
                  <li>
                    Overrides saved in the month plan's assumption editor are applied ({a.overridden.join(', ')}); clear
                    them there to return to the plan rates.
                  </li>
                )}
              </ul>
              <p className="tb-source">Source: {a.source}</p>
            </div>
          </div>
        </details>
      )}
    </section>
  );
}

const TARGET_ASSUMPTIONS: Array<{ key: string; label: string; hint: string; kind: 'money' | 'rate' }> = [
  { key: 'leadToTrial', label: 'Lead → trial', hint: 'Leads that complete a trial', kind: 'rate' },
  { key: 'trialToMember', label: 'Trial → purchase', hint: 'Trials that become paying members', kind: 'rate' },
  {
    key: 'firstSpend',
    label: 'First-month spend per new member',
    hint: 'First-month spend per new paying member',
    kind: 'money',
  },
];

function TargetAssumptionsEditor({
  studioId,
  studioName,
  year,
  onSaved,
}: {
  studioId: number;
  studioName: string;
  year: number;
  onSaved: () => Promise<unknown>;
}) {
  const { can, toast } = useApp();
  const { data, loading, error, reload } = useLoad<{
    assumptions: Record<string, { auto: number | null; override: number | null }>;
  }>(() => api(`/studio-plans/${studioId}/economics?year=${year}`), [studioId, year]);
  const show = (field: (typeof TARGET_ASSUMPTIONS)[number], value: number | null | undefined) =>
    value == null ? '' : String(field.kind === 'rate' ? Math.round(value * 100) : Math.round(value));
  const signature = JSON.stringify(
    Object.fromEntries(TARGET_ASSUMPTIONS.map(f => [f.key, show(f, data?.assumptions?.[f.key]?.override)])),
  );
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(JSON.parse(signature)), [signature]);
  const dirty = JSON.stringify(draft) !== signature;
  const save = async (values: Record<string, number | null>, message: string) => {
    setBusy(true);
    try {
      await api(`/studio-assumptions/${studioId}/${year}`, { method: 'PUT', body: JSON.stringify({ values }) });
      await reload();
      await onSaved();
      toast(message);
    } catch (e: any) {
      toast(e.message || 'Could not save assumptions.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    const values: Record<string, number | null> = {};
    for (const field of TARGET_ASSUMPTIONS) {
      const raw = (draft[field.key] || '').trim();
      if (!raw) values[field.key] = null;
      else {
        const value = Number(raw);
        const minimum = field.key === 'firstSpend' ? 1 : field.kind === 'rate' ? 0.1 : 0;
        if (!Number.isFinite(value) || value < minimum || (field.kind === 'rate' && value > 100)) {
          toast(
            `${field.label} must be ${field.kind === 'rate' ? 'between 0.1 and 100%' : 'greater than zero'}.`,
            'error',
          );
          return;
        }
        values[field.key] = field.kind === 'rate' ? value / 100 : value;
      }
    }
    void save(values, `${studioName} assumptions applied to all months`);
  };
  const customised = TARGET_ASSUMPTIONS.filter(f => data?.assumptions?.[f.key]?.override != null).length;
  if (loading && !data) return <p className="tb-assume-state">Loading editable assumptions…</p>;
  if (error && !data)
    return (
      <p className="tb-assume-state" role="alert">
        {error}
      </p>
    );
  if (!data) return null;
  return (
    <div className="tb-assume-editor">
      <h3>Editable assumptions · {studioName}</h3>
      <p>Changes recalculate this location’s funnel and apply across all months.</p>
      <div className="tb-assume-fields">
        {TARGET_ASSUMPTIONS.map(field => {
          const assumption = data.assumptions?.[field.key];
          return (
            <label key={field.key}>
              <span>{field.label}</span>
              <div className="tb-assume-input">
                {field.kind === 'money' && <i>₹</i>}
                <input
                  type="number"
                  name={field.key}
                  min={field.kind === 'rate' ? 0.1 : field.key === 'firstSpend' ? 1 : 0}
                  max={field.kind === 'rate' ? 100 : undefined}
                  step={field.kind === 'rate' ? 1 : 100}
                  title={`${field.label}. ${field.kind === 'rate' ? field.hint + '; enter a percentage.' : field.hint + '; enter rupees.'}`}
                  inputMode="decimal"
                  disabled={!can('target_edit') || busy}
                  value={draft[field.key] ?? ''}
                  placeholder={show(field, assumption?.auto) || 'auto'}
                  onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))}
                />
                {field.kind === 'rate' && <i>%</i>}
              </div>
              <small>
                History:{' '}
                {assumption?.auto == null
                  ? '—'
                  : field.kind === 'rate'
                    ? share(assumption.auto)
                    : rupee(assumption.auto)}{' '}
                · {field.hint}
              </small>
            </label>
          );
        })}
      </div>
      <div className="tb-assume-actions">
        <Button variant="primary" disabled={!dirty || busy} onClick={apply}>
          {busy ? 'Recalculating…' : 'Apply to all months'}
        </Button>
        {customised > 0 && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void save(
                Object.fromEntries(TARGET_ASSUMPTIONS.map(f => [f.key, null])),
                'Back to history-based assumptions',
              )
            }
          >
            Reset to history
          </Button>
        )}
      </div>
    </div>
  );
}
