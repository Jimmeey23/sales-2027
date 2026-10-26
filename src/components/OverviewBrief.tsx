import React, { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useLoad } from '../hooks';
import { money, number } from '../types';
import { ReportFindings, ReportPerformance } from './ReportIntel';
import { reportStudioFor } from '../data/salesIntelligenceReport';
import { Badge, Card, CardHeader, ErrorState, Loading, TableScroll, Tabs } from './ui';

const signed = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
const delta = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null || !b ? null : (a / b - 1) * 100;
const cr = (v: number | null | undefined) => (v == null ? '—' : `₹${(v / 1e7).toFixed(2)} Cr`);
const lakh = (v: number | null | undefined) => (v == null ? '—' : `₹${(v / 1e5).toFixed(1)}L`);
const rate = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);
const toneClass = (v: number | null | undefined, invert = false) =>
  v == null ? '' : (invert ? -v : v) > 0 ? 'positive-text' : (invert ? -v : v) < 0 ? 'negative-text' : '';

const STREAMS: Array<[string, string]> = [
  ['newClient', 'New clients'],
  ['renewal', 'Renewals'],
  ['reactivation', 'Reactivation'],
  ['additional', 'Additional purchases'],
];

export default function OverviewBrief({ studioId }: { studioId: number | null }) {
  const {
    data: b,
    loading,
    error,
    reload,
  } = useLoad<any>(
    () => import('../api').then(({ api }) => api(`/overview-brief${studioId ? `?studio=${studioId}` : ''}`)),
    [studioId],
  );
  const [view, setView] = useState('performance');
  if (loading && !b) return <Loading label="Building the 2025 → 2027 brief…" />;
  if (error && !b) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!b) return null;
  const y25 = b.ytd2025,
    y26 = b.ytd2026,
    f25 = b.full2025,
    p = b.plan;
  const reportStudio = reportStudioFor(b.scope);
  const asOf = new Date(`${b.asOf}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const metricRows: Array<{
    label: string;
    full25: string;
    ytd25: string;
    ytd26: string;
    d: number | null;
    invert?: boolean;
  }> = [
    {
      label: 'Revenue',
      full25: cr(f25.revenue),
      ytd25: cr(y25.revenue),
      ytd26: cr(y26.revenue),
      d: delta(y26.revenue, y25.revenue),
    },
    {
      label: 'Transactions',
      full25: number(f25.transactions),
      ytd25: number(y25.transactions),
      ytd26: number(y26.transactions),
      d: delta(y26.transactions, y25.transactions),
    },
    {
      label: 'Paying clients',
      full25: number(f25.clients),
      ytd25: number(y25.clients),
      ytd26: number(y26.clients),
      d: delta(y26.clients, y25.clients),
    },
    {
      label: 'First-time buyers',
      full25: number(f25.newClients),
      ytd25: number(y25.newClients),
      ytd26: number(y26.newClients),
      d: delta(y26.newClients, y25.newClients),
    },
    {
      label: 'Average transaction',
      full25: money(f25.aov),
      ytd25: money(y25.aov),
      ytd26: money(y26.aov),
      d: delta(y26.aov, y25.aov),
    },
    {
      label: 'Revenue per client',
      full25: money(f25.revenuePerClient),
      ytd25: money(y25.revenuePerClient),
      ytd26: money(y26.revenuePerClient),
      d: delta(y26.revenuePerClient, y25.revenuePerClient),
    },
    {
      label: 'Discount rate',
      full25: rate(f25.discountRate),
      ytd25: rate(y25.discountRate),
      ytd26: rate(y26.discountRate),
      d: y26.discountRate - y25.discountRate,
      invert: true,
    },
    ...STREAMS.map(([k, label]) => ({
      label: `${label} revenue`,
      full25: lakh(f25.streams[k]),
      ytd25: lakh(y25.streams[k]),
      ytd26: lakh(y26.streams[k]),
      d: delta(y26.streams[k], y25.streams[k]),
    })),
    {
      label: 'Leads',
      full25: number(f25.leads),
      ytd25: number(y25.leads),
      ytd26: number(y26.leads),
      d: delta(y26.leads, y25.leads),
    },
    {
      label: 'First visits',
      full25: number(f25.firstVisits),
      ytd25: number(y25.firstVisits),
      ytd26: number(y26.firstVisits),
      d: delta(y26.firstVisits, y25.firstVisits),
    },
    {
      label: 'First visit → purchase',
      full25: rate(f25.visitConversion),
      ytd25: rate(y25.visitConversion),
      ytd26: rate(y26.visitConversion),
      d: y26.visitConversion - y25.visitConversion,
    },
    {
      label: 'Class check-ins',
      full25: number(f25.checkins),
      ytd25: number(y25.checkins),
      ytd26: number(y26.checkins),
      d: delta(y26.checkins, y25.checkins),
    },
    {
      label: 'Check-in rate',
      full25: rate(f25.checkinRate),
      ytd25: rate(y25.checkinRate),
      ytd26: rate(y26.checkinRate),
      d: y26.checkinRate - y25.checkinRate,
    },
    {
      label: 'Late-cancel rate',
      full25: rate(f25.lateCancelRate),
      ytd25: rate(y25.lateCancelRate),
      ytd26: rate(y26.lateCancelRate),
      d: y26.lateCancelRate - y25.lateCancelRate,
      invert: true,
    },
  ];
  const pointMetrics = new Set(['Discount rate', 'First visit → purchase', 'Check-in rate', 'Late-cancel rate']);

  return (
    <section className="ob" aria-label="2025–2027 performance brief">
      <div className="ob-hero">
        <div className="ob-hero-cell">
          <span>2025 full year</span>
          <strong>{cr(f25.revenue)}</strong>
          <small>
            {number(f25.clients)} clients · {number(f25.transactions)} transactions
          </small>
        </div>
        <div className="ob-hero-cell">
          <span>2026 to {asOf}</span>
          <strong>{cr(y26.revenue)}</strong>
          <small className={toneClass(b.ytdGrowth)}>
            {signed(b.ytdGrowth)} vs {cr(y25.revenue)} same period 2025
          </small>
        </div>
        <div className="ob-hero-cell">
          <span>2026 full-year forecast</span>
          <strong>{cr(b.forecast2026)}</strong>
          <small>
            Target {cr(p.target2026)} · {signed(delta(b.forecast2026, p.target2026))} vs plan
          </small>
        </div>
        <div className="ob-hero-cell ob-hero-plan">
          <span>2027 plan target</span>
          <strong>{cr(p.target)}</strong>
          <small>
            {signed(p.growthVsForecast2026)} vs 2026 forecast · {signed(p.growthVs2025)} vs 2025
          </small>
        </div>
      </div>

      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: 'performance', label: '2025 vs 2026 performance' },
          { id: 'findings', label: 'Key findings', count: b.findings.length },
        ]}
      />

      {view === 'performance' && (
        <>
          <Card>
            <CardHeader
              title="Monthly revenue: 2025 actual, 2026 actual, 2027 target"
              subtitle={`${b.scope} · gross collected value · October 2026 is partial (to ${asOf})`}
            />
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={b.monthly} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e8e4ef" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={v => `₹${(v / 1e5).toFixed(0)}L`}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip formatter={(v: any, name: any) => [money(v), name]} />
                  <Legend />
                  <Bar name="2025 actual" dataKey="actual2025" fill="#b9c7c0" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar name="2026 actual" dataKey="actual2026" fill="#216657" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line
                    name="2027 target"
                    dataKey="target2027"
                    stroke="#c4622d"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    type="monotone"
                  />
                  <Line
                    name="2026 target"
                    dataKey="target2026"
                    stroke="#725079"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    type="monotone"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="ob-two">
            <Card>
              <CardHeader
                title="Scorecard"
                subtitle={`Like-for-like: 1 Jan – ${asOf} in both years, plus 2025 full year`}
              />
              <TableScroll>
                <table className="data-table ob-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="num">2025 full</th>
                      <th className="num">2025 YTD</th>
                      <th className="num">2026 YTD</th>
                      <th className="num">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows.map(r => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="num">{r.full25}</td>
                        <td className="num">{r.ytd25}</td>
                        <td className="num">
                          <strong>{r.ytd26}</strong>
                        </td>
                        <td className={`num ${toneClass(r.d, r.invert)}`}>
                          {pointMetrics.has(r.label)
                            ? r.d == null
                              ? '—'
                              : `${r.d >= 0 ? '+' : ''}${r.d.toFixed(1)} pts`
                            : signed(r.d)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
            <Card>
              <CardHeader title="Revenue by product category" subtitle="2026 YTD vs same period 2025" />
              <div className="ob-cats">
                {y26.categories.map((c: any) => {
                  const prev = y25.categories.find((x: any) => x.name === c.name);
                  return (
                    <div key={c.name}>
                      <div>
                        <span>{c.name}</span>
                        <strong>{lakh(c.revenue)}</strong>
                      </div>
                      <div className="ob-bar">
                        <i style={{ width: `${(c.revenue / y26.categories[0].revenue) * 100}%` }} />
                      </div>
                      <small>
                        {((c.revenue / y26.revenue) * 100).toFixed(0)}% of revenue · {number(c.transactions)} sales ·{' '}
                        <span className={toneClass(delta(c.revenue, prev?.revenue))}>
                          {signed(delta(c.revenue, prev?.revenue))} YoY
                        </span>
                      </small>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Studio performance and 2027 targets"
              subtitle="Pop-up includes Copper + Cloves and Plash Pilates"
            />
            <TableScroll>
              <table className="data-table ob-table">
                <thead>
                  <tr>
                    <th>Studio</th>
                    <th className="num">2025 full year</th>
                    <th className="num">2025 YTD</th>
                    <th className="num">2026 YTD</th>
                    <th className="num">YoY</th>
                    <th className="num">2026 clients</th>
                    <th className="num">2026 forecast</th>
                    <th className="num">2027 target</th>
                    <th className="num">Growth needed</th>
                  </tr>
                </thead>
                <tbody>
                  {b.studios.map((s: any) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <span>{s.city}</span>
                      </td>
                      <td className="num">{lakh(s.full2025)}</td>
                      <td className="num">{lakh(s.ytd2025)}</td>
                      <td className="num">
                        <strong>{lakh(s.ytd2026)}</strong>
                      </td>
                      <td className={`num ${toneClass(s.yoy)}`}>
                        {s.isNew ? <Badge tone="blue">New venue</Badge> : signed(s.yoy)}
                      </td>
                      <td className="num">{number(s.clients2026)}</td>
                      <td className="num">{lakh(s.forecast2026)}</td>
                      <td className="num">
                        <strong>{lakh(s.target2027)}</strong>
                      </td>
                      <td className="num">{signed(s.growth2027)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
          <ReportPerformance studio={reportStudio} />
        </>
      )}

      {view === 'findings' && (
        <>
          <h3 className="ri-section">From the live data</h3>
          <div className="ob-findings">
            {b.findings.map((f: any) => (
              <Card key={f.title} className={`ob-finding ob-${f.tone}`}>
                <div className="ob-finding-icon">
                  {f.tone === 'positive' ? (
                    <TrendingUp size={18} />
                  ) : f.tone === 'negative' ? (
                    <TrendingDown size={18} />
                  ) : (
                    <Minus size={18} />
                  )}
                </div>
                <div>
                  <strong>{f.title}</strong>
                  <p>{f.detail}</p>
                </div>
              </Card>
            ))}
          </div>
          <h3 className="ri-section">From the Sales Intelligence Report</h3>
          <ReportFindings studio={reportStudio} />
        </>
      )}

      <p className="data-note">{b.notes.join(' ')}</p>
    </section>
  );
}
