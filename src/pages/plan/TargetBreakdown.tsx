import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../App';
import { useLoad } from '../../hooks';
import { MONTHS_SHORT } from '../../types';
import { Badge, ErrorState, Loading } from '../../components/ui';
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

export default function TargetBreakdown({ onMonth }: { onMonth: (month: number) => void }) {
  const { studioId, year, scenario, boot } = useApp();
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
    { key: 'as', label: 'Avg spend / paying client', group: 'Funnel', get: m => rupee(m.avgSpend) },
    { key: 'ci', label: 'Check-ins target', group: 'Studio', get: m => int(m.checkins) },
    ...units.map(u => ({ key: `u_${u.key}`, label: u.label, group: 'Units', get: (m: BMonth) => int(m.units[u.key]) })),
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
            {year} target breakdown · {current.studio.name}{' '}
            <Badge tone={data.scenario === 'standard' ? 'green' : 'purple'}>{scenarioLabel} target</Badge>
          </h2>
          <p>
            One target per location; every column below is calculated from it. Click a month to open its plan.
            {current.venues.length > 0 &&
              ` Pop-up = ${current.venues.map(v => `${v.studio.name} ${lakh(v.annual)}`).join(' + ')}.`}
          </p>
        </div>
        <div className="ws-toolbar-actions">
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

      <div className="tb-kpis">
        {[
          [
            'Revenue target',
            lakh(current.total.target),
            `${pct(current.total.growth)} vs 2026 (${lakh(current.total.lastYear)})`,
          ],
          [
            'New-client revenue',
            lakh(current.total.newRevenue),
            `${share(current.total.newRevenue / current.total.target)} of target`,
          ],
          ['Leads needed', int(current.total.leads), `${(current.total.leads / 52.14).toFixed(0)} a week`],
          [
            'First visits / trials',
            int(current.total.firstVisits),
            `${int(current.total.packageConversions)} package conversions`,
          ],
          [
            'New paying clients',
            int(current.total.newPaying),
            `${int(current.monthlyAverage.totalPaying)} paying clients a month`,
          ],
          [
            'Avg spend / paying client',
            rupee(current.monthlyAverage.avgSpend),
            `${int(current.total.checkins)} check-ins`,
          ],
        ].map(([l, v, s]) => (
          <div key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
            <small>{s}</small>
          </div>
        ))}
      </div>

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
                <th key={c.key} title={c.title} className={`tb-g-${c.group.toLowerCase()}`}>
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
                    'New paying clients = new-client revenue ÷ this',
                  ],
                  [
                    'payingPerVisit',
                    'New paying clients per first visit',
                    share,
                    'First visits = new paying clients ÷ this',
                  ],
                  ['leadToVisit', 'Lead → first visit', share, 'Leads = first visits ÷ this'],
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
