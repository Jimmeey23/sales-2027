import React, { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Gift, LayoutGrid, LineChart, Rows3, Sparkles, SquareStack, Users } from 'lucide-react';
import { MONTHS, MONTHS_SHORT, money, number, titleCase } from '../../types';
import { Badge, Drawer, TableScroll } from '../../components/ui';
import { LOCATION_COLORS } from '../../data/locations';
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
        <h2>Target scenario · {SCENARIO_LABELS[scenario]}</h2>
        <p>
          Shared across all studios and reports.{' '}
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
  { key: 'newClient', label: 'New clients', color: '#6857e5' },
  { key: 'renewal', label: 'Renewals / existing', color: '#237a67' },
  { key: 'reactivation', label: 'Reactivation', color: '#f27d5b' },
  { key: 'other', label: 'Other (gifts, privates, retail)', color: '#c2932b' },
] as const;
const LIVE = (o: any) => !['archived', 'rejected'].includes(o.status);
export const offersInMonth = (data: PlanData, month: number) =>
  data.offers
    .filter(o => o.month === month && LIVE(o))
    .sort(
      (a, b) => (a.plan_slot ? 0 : 1) - (b.plan_slot ? 0 : 1) || (b.expected_revenue || 0) - (a.expected_revenue || 0),
    );
const pct = (a: number, b: number) => (b ? `${a >= b ? '+' : ''}${((a / b - 1) * 100).toFixed(0)}%` : '—');

export function SourceBar({ row }: { row: MonthRow }) {
  const total = SOURCES.reduce((n, s) => n + (row as any)[s.key], 0) || 1;
  return (
    <div className="ws-mixbar" title={SOURCES.map(s => `${s.label}: ${lakh((row as any)[s.key])}`).join('\n')}>
      {SOURCES.map(s => (
        <span key={s.key} style={{ width: `${((row as any)[s.key] / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}

export default function TargetsTab({ data }: { data: PlanData }) {
  const multi = data.plans.length > 1;
  const [layout, setLayout] = useState('cards'),
    [open, setOpen] = useState<number | null>(null);
  const layouts = [
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
      <div className="ws-kpis">
        {totals.map(t => (
          <div key={t.key} className="ws-kpi" style={{ '--c': t.color } as React.CSSProperties}>
            <span>{t.label}</span>
            <strong>{lakh(t.value)}</strong>
            <small>{data.annual ? `${((t.value / data.annual) * 100).toFixed(0)}% of target` : '—'}</small>
          </div>
        ))}
        <div className="ws-kpi" style={{ '--c': '#211e2b' } as React.CSSProperties}>
          <span>Approval</span>
          <strong>{approvedMonths}/12</strong>
          <small>months approved</small>
        </div>
      </div>
      <div className="ws-funnel-strip">
        {funnel.map(([k, v]) => (
          <div key={k}>
            <strong>{number(v)}</strong>
            <span>
              {
                (
                  {
                    leads: 'Leads needed',
                    trials: 'Completed trials',
                    buyers: 'New buyers',
                    renewalPurchases: 'Renewal purchases',
                    reactivated: 'Reactivations',
                  } as any
                )[k]
              }
            </span>
          </div>
        ))}
      </div>
      <div className="ws-toolbar">
        <div>
          <h2>Year plan</h2>
          <p>Click any month for its full breakdown and planned offers.</p>
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

      {layout === 'cards' && (
        <div className="ws-month-grid">
          {data.months.map(m => {
            const offers = offersInMonth(data, m.month);
            return (
              <button key={m.month} className="ws-month-card" onClick={() => setOpen(m.month)}>
                <header>
                  <span>{MONTHS_SHORT[m.month - 1]}</span>
                  {m.approved ? (
                    <Badge tone="green">
                      <CheckCircle2 size={11} /> Approved
                    </Badge>
                  ) : (
                    <Badge tone="amber">Proposed</Badge>
                  )}
                </header>
                <strong className="ws-month-target">{lakh(m.target)}</strong>
                <small className={m.target >= m.lastYear ? 'pos' : 'neg'}>
                  {pct(m.target, m.lastYear)} vs {lakh(m.lastYear)} last year
                </small>
                <SourceBar row={m} />
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

      {open !== null && <MonthDrawer data={data} row={data.months[open - 1]} onClose={() => setOpen(null)} />}
    </>
  );
}

function MonthDrawer({ data, row, onClose }: { data: PlanData; row: MonthRow; onClose: () => void }) {
  const offers = offersInMonth(data, row.month),
    total = SOURCES.reduce((n, s) => n + (row as any)[s.key], 0) || 1;
  return (
    <Drawer
      title={`${MONTHS[row.month - 1]} plan`}
      subtitle={`${lakh(row.target)} target · ${row.approved ? 'approved' : 'proposed'}`}
      onClose={onClose}
    >
      <div className="ws-drawer-hero">
        <span>Lead offer</span>
        <strong>{row.leadOffer}</strong>
        <p>{row.objective}</p>
      </div>
      <h4 className="ws-h4">Revenue by source</h4>
      {SOURCES.map(s => (
        <div key={s.key} className="ws-source-row">
          <i style={{ background: s.color }} />
          <span>{s.label}</span>
          <b>{lakh((row as any)[s.key])}</b>
          <small>{(((row as any)[s.key] / total) * 100).toFixed(0)}%</small>
        </div>
      ))}
      <h4 className="ws-h4">Volume needed</h4>
      <div className="ws-mini-grid">
        {[
          ['Leads', row.leads],
          ['Trials', row.trials],
          ['New buyers', row.buyers],
          ['Renewals due', row.renewalsDue],
          ['Renewal purchases', row.renewalPurchases],
          ['Reactivations', row.reactivated],
        ].map(([l, v]) => (
          <div key={l as string}>
            <strong>{number(v as number)}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      {row.byStudio.length > 1 && (
        <>
          <h4 className="ws-h4">By location</h4>
          {row.byStudio.map(s => (
            <div key={s.id} className="ws-source-row">
              <i style={{ background: LOCATION_COLORS[s.name] }} />
              <span>
                {s.name}
                <small> · {s.leadOffer}</small>
              </span>
              <b>{lakh(s.target)}</b>
            </div>
          ))}
        </>
      )}
      <h4 className="ws-h4">Offers & promotions planned ({offers.length})</h4>
      {offers.length ? (
        offers.map(o => (
          <div key={o.id} className="ws-offer-line">
            <div>
              <strong>{o.name}</strong>
              <span>
                {o.studio} · {titleCase(o.offer_type)} · {o.benefit || o.headline}
              </span>
            </div>
            <div>
              <b>{money(o.expected_revenue, true)}</b>
              {o.plan_slot && <Badge tone="green">{titleCase(o.plan_slot)} slot</Badge>}
            </div>
          </div>
        ))
      ) : (
        <p className="muted">No offers attached to this month yet — use the Offer studio tab to add some.</p>
      )}
    </Drawer>
  );
}
