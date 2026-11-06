import React, { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { money, number } from '../types';
import { Badge, Card, CardHeader, EmptyState, TableScroll, Tabs } from './ui';

// Overview when no sales transactions are imported. Every figure is either the 2027 plan from the
// database (targets, streams, funnel, offers) or a pack figure (last 12 months, prior year) taken from
// the 2027 Sales Plan Pack. Anything without a source is not rendered, never shown as zero.
const ok = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
const signed = (v: number | null | undefined, d = 1) => (ok(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(d)}%` : '—');
const cr = (v: number) => `₹${(v / 1e7).toFixed(2)} Cr`;
const lakh = (v: number | null | undefined) => (ok(v) ? `₹${(v / 1e5).toFixed(1)}L` : '—');
const pctOf = (a: number, b: number) => (b ? (a / b - 1) * 100 : null);
const tone = (v: number | null | undefined) => (!ok(v) ? '' : v > 0 ? 'positive-text' : v < 0 ? 'negative-text' : '');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function OverviewPlanBrief({ b }: { b: any }) {
  const [view, setView] = useState('plan');
  const pack = b.pack;
  const p = b.plan;
  const f = p.funnel || {};
  const hasPlan = p.target > 0;
  if (!pack && !hasPlan)
    return (
      <EmptyState
        title={`No plan or history for ${b.scope}`}
        text="This location has no 2027 targets in the plan and no document in the 2027 pack. Pick All studios, Kemps Corner, Bandra, Kenkere House or Pop-up."
      />
    );

  const chart = pack
    ? pack.monthly.map((m: any) => ({
        label: MONTHS[m.month - 1],
        actual: m.actual,
        prior: m.prior,
        target: m.target || null,
      }))
    : MONTHS.map((label, i) => ({ label, target: p.months[i]?.target ?? null }));
  const hasPrior = pack && pack.monthly.every((m: any) => ok(m.prior));
  const jo = pack?.jan_oct;
  const scorecard: Array<{ label: string; cur: string; prev: string | null; d: number | null }> = [];
  if (jo) {
    scorecard.push({ label: 'Revenue', cur: cr(jo.revenue2026), prev: ok(jo.revenue2025) ? cr(jo.revenue2025) : null, d: ok(jo.revenue2025) ? pctOf(jo.revenue2026, jo.revenue2025) : null });
    scorecard.push({ label: 'Paying clients (average per month)', cur: number(Math.round(jo.payers2026 / jo.months)), prev: ok(jo.payers2025) ? number(Math.round(jo.payers2025 / jo.months)) : null, d: ok(jo.payers2025) ? pctOf(jo.payers2026, jo.payers2025) : null });
    scorecard.push({ label: 'Leads', cur: number(jo.leads), prev: null, d: null });
    scorecard.push({ label: 'First visits', cur: number(jo.firstVisits), prev: null, d: null });
    if (jo.leads) scorecard.push({ label: 'Lead → first visit', cur: `${((jo.firstVisits / jo.leads) * 100).toFixed(1)}%`, prev: null, d: null });
    if (jo.visits) scorecard.push({ label: 'Paid share of class visits', cur: `${((jo.paidVisits / jo.visits) * 100).toFixed(1)}%`, prev: null, d: null });
  }

  const funnelRows: Array<[string, number]> = [
    ['Leads needed', f.leads],
    ['First visits needed', f.trials],
    ['New paying clients', f.buyers],
    ['of which new members', f.newMembers],
    ['Renewals due', f.renewalsDue],
    ['Renewals to sell', f.renewals],
    ['Win-backs (returners)', f.winbacks],
  ].filter(([, v]) => ok(v as number) && (v as number) > 0) as Array<[string, number]>;

  return (
    <section className="ob" aria-label="2027 plan and pack history brief">
      <div className="ob-hero">
        {pack && (
          <div className="ob-hero-cell">
            <span>Last 12 months ({pack.period.current})</span>
            <strong>{cr(pack.l12)}</strong>
            <small className={tone(pack.yoy)}>
              {ok(pack.yoy) ? `${signed(pack.yoy)} vs prior 12 months (${cr(pack.prior12)})` : pack.isNew ? 'New venue: no comparable prior year' : ''}
            </small>
          </div>
        )}
        {pack && pack.streams.length > 0 && (
          <div className="ob-hero-cell">
            <span>Renewal share of revenue</span>
            <strong>{pack.streams.find((s: any) => s.key === 'renewal')?.shareL12?.toFixed(0)}%</strong>
            <small>of last-12-month revenue, up to {pack.streams.find((s: any) => s.key === 'renewal')?.shareTarget?.toFixed(0)}% in the 2027 plan</small>
          </div>
        )}
        {f.buyers > 0 && (
          <div className="ob-hero-cell">
            <span>2027 new paying clients</span>
            <strong>{number(f.buyers)}</strong>
            <small>
              from {number(f.leads)} leads and {number(f.trials)} first visits
            </small>
          </div>
        )}
        {hasPlan && (
          <div className="ob-hero-cell ob-hero-plan">
            <span>2027 plan target</span>
            <strong>{cr(p.target)}</strong>
            <small>
              {pack ? `${signed(pack.growth2027)} vs last 12 months` : `${lakh(p.monthlyAverage)} a month`}
              {p.offerTotal ? ` · ${p.offerTotal} offers planned` : ''}
            </small>
          </div>
        )}
      </div>

      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: 'plan', label: 'History and 2027 plan' },
          { id: 'findings', label: 'Key findings', count: b.findings.length },
        ]}
      />

      {view === 'plan' && (
        <>
          <Card>
            <CardHeader
              title={pack ? 'Monthly revenue: last 12 months, prior year, 2027 target' : 'Monthly 2027 target'}
              subtitle={`${b.scope}${pack ? ` · ${pack.period.current} by calendar month vs ${pack.period.prior}` : ''} · gross collected value`}
            />
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e7e0db" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => `₹${(v / 1e5).toFixed(0)}L`} tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={(v: any, name: any) => [money(v), name]} />
                  <Legend />
                  {hasPrior && <Bar name="Prior 12 months" dataKey="prior" fill="#d8cabf" radius={[4, 4, 0, 0]} maxBarSize={22} />}
                  {pack && <Bar name="Last 12 months" dataKey="actual" fill="#245f57" radius={[4, 4, 0, 0]} maxBarSize={22} />}
                  <Line name="2027 target" dataKey="target" stroke="#a96935" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {pack && (
            <Card>
              <CardHeader
                title="Revenue streams"
                subtitle={`${pack.period.current} actual, ${pack.period.prior}, and the 2027 plan`}
              />
              <TableScroll>
                <table className="data-table ob-table">
                  <thead>
                    <tr>
                      <th>Stream</th>
                      <th className="num">Last 12 months</th>
                      <th className="num">Share</th>
                      {!pack.isNew && <th className="num">Prior 12 months</th>}
                      {!pack.isNew && <th className="num">YoY</th>}
                      <th className="num">2027 target</th>
                      <th className="num">Share</th>
                      <th className="num">Growth needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pack.streams.map((s: any) => (
                      <tr key={s.key}>
                        <td>{s.label}</td>
                        <td className="num">{lakh(s.l12)}</td>
                        <td className="num">{ok(s.shareL12) ? `${s.shareL12.toFixed(0)}%` : '—'}</td>
                        {!pack.isNew && <td className="num">{lakh(s.prior)}</td>}
                        {!pack.isNew && <td className={`num ${tone(s.yoy)}`}>{signed(s.yoy)}</td>}
                        <td className="num"><strong>{lakh(s.target)}</strong></td>
                        <td className="num">{ok(s.shareTarget) ? `${s.shareTarget.toFixed(0)}%` : '—'}</td>
                        <td className="num">{signed(s.growth2027)}</td>
                      </tr>
                    ))}
                    <tr className="pk-total">
                      <td><strong>Total</strong></td>
                      <td className="num"><strong>{lakh(pack.l12)}</strong></td>
                      <td className="num">100%</td>
                      {!pack.isNew && <td className="num">{lakh(pack.prior12)}</td>}
                      {!pack.isNew && <td className={`num ${tone(pack.yoy)}`}>{signed(pack.yoy)}</td>}
                      <td className="num"><strong>{lakh(pack.target2027)}</strong></td>
                      <td className="num">100%</td>
                      <td className="num">{signed(pack.growth2027)}</td>
                    </tr>
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}

          {pack && (
            <div className="ob-two">
              <Card>
                <CardHeader
                  title={`Jan–Oct 2026${hasPrior || ok(jo?.revenue2025) ? ' vs Jan–Oct 2025' : ''}`}
                  subtitle="From the pack's 14-month history. Blank comparisons are not in the pack."
                />
                <TableScroll>
                  <table className="data-table ob-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th className="num">2026</th>
                        {scorecard.some(r => r.prev) && <th className="num">2025</th>}
                        {scorecard.some(r => r.d != null) && <th className="num">Change</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {scorecard.map(r => (
                        <tr key={r.label}>
                          <td>{r.label}</td>
                          <td className="num"><strong>{r.cur}</strong></td>
                          {scorecard.some(x => x.prev) && <td className="num">{r.prev ?? ''}</td>}
                          {scorecard.some(x => x.d != null) && <td className={`num ${tone(r.d)}`}>{r.d != null ? signed(r.d) : ''}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </Card>
              <Card>
                <CardHeader title="Revenue by product category" subtitle="Last 12 months" />
                <div className="ob-cats">
                  {pack.categories.map((c: any) => (
                    <div key={c.name}>
                      <div>
                        <span>{c.name}</span>
                        <strong>{lakh(c.l12)}</strong>
                      </div>
                      <div className="ob-bar">
                        <i style={{ width: `${(c.l12 / pack.categories[0].l12) * 100}%` }} />
                      </div>
                      <small>
                        {ok(c.share) ? `${c.share.toFixed(0)}% of revenue` : ''}
                        {ok(c.yoy) && (
                          <>
                            {' · '}
                            <span className={tone(c.yoy)}>{signed(c.yoy)} YoY</span>
                          </>
                        )}
                      </small>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {pack && pack.perStudio.length > 0 && (
            <Card>
              <CardHeader title="Studio performance and 2027 targets" subtitle="Pop-up covers all Bengaluru pop-up venues" />
              <TableScroll>
                <table className="data-table ob-table">
                  <thead>
                    <tr>
                      <th>Studio</th>
                      <th className="num">Last 12 months</th>
                      <th className="num">Prior 12 months</th>
                      <th className="num">YoY</th>
                      <th className="num">2027 target</th>
                      <th className="num">Growth needed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pack.perStudio.map((s: any) => (
                      <tr key={s.name}>
                        <td><strong>{s.name}</strong></td>
                        <td className="num"><strong>{lakh(s.l12)}</strong></td>
                        <td className="num">{s.isNew ? '' : lakh(s.prior12)}</td>
                        <td className={`num ${tone(s.yoy)}`}>{s.isNew ? <Badge tone="blue">New venue</Badge> : signed(s.yoy)}</td>
                        <td className="num"><strong>{lakh(s.target2027)}</strong></td>
                        <td className="num">{signed(s.growth2027)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}

          {hasPlan && (
            <div className="ob-two">
              <Card>
                <CardHeader title="2027 funnel requirement" subtitle="Volumes the target needs, from the plan" />
                <TableScroll>
                  <table className="data-table ob-table">
                    <tbody>
                      {funnelRows.map(([label, v]) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td className="num"><strong>{number(v)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </Card>
              <Card>
                <CardHeader title="2027 offers" subtitle={`${p.offerTotal} planned${p.offerRevenue ? ` · expected revenue ${cr(p.offerRevenue)}` : ''}`} />
                {p.offerTypes.length > 0 ? (
                  <TableScroll>
                    <table className="data-table ob-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th className="num">Offers</th>
                          {p.offerRevenue > 0 && <th className="num">Expected revenue</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {p.offerTypes.map((o: any) => (
                          <tr key={o.type}>
                            <td>{o.type}</td>
                            <td className="num">{o.count}</td>
                            {p.offerRevenue > 0 && <td className="num">{lakh(o.revenue)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableScroll>
                ) : (
                  <p className="pk-note">No 2027 offers are planned yet.</p>
                )}
              </Card>
            </div>
          )}

          {hasPlan && (
            <Card>
              <CardHeader title="2027 month plan" subtitle={`Targets from the plan${pack ? '; baseline is the last 12 months by calendar month' : ''}${p.themeSource ? ` · themes: ${p.themeSource}` : ''}`} />
              <TableScroll>
                <table className="data-table ob-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="num">2027 target</th>
                      {pack && <th className="num">Last 12 months</th>}
                      {pack && <th className="num">Growth</th>}
                      <th>Theme</th>
                      <th className="num">Offers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.months.filter((m: any) => m.target).map((m: any) => (
                      <tr key={m.month}>
                        <td>{m.label}</td>
                        <td className="num"><strong>{lakh(m.target)}</strong></td>
                        {pack && <td className="num">{lakh(m.forecastBase2026)}</td>}
                        {pack && <td className="num">{signed(ok(m.forecastBase2026) ? pctOf(m.target, m.forecastBase2026) : null)}</td>}
                        <td>{m.theme ?? ''}</td>
                        <td className="num">{m.offers || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}
        </>
      )}

      {view === 'findings' && (
        <>
          <h3 className="ri-section">Last 12 months and the 2027 plan</h3>
          <div className="ob-findings">
            {b.findings.map((x: any) => (
              <Card key={x.title} className={`ob-finding ob-${x.tone}`}>
                <div className="ob-finding-icon">
                  {x.tone === 'positive' ? <TrendingUp size={18} /> : x.tone === 'negative' ? <TrendingDown size={18} /> : <Minus size={18} />}
                </div>
                <div>
                  <strong>{x.title}</strong>
                  <p>{x.detail}</p>
                </div>
              </Card>
            ))}
          </div>
          {pack?.headlines?.map((h: any) => (
            <React.Fragment key={h.name}>
              <h3 className="ri-section">From the pack: {h.name}</h3>
              <div className="ob-findings">
                {h.summary && (
                  <Card className="ob-finding ob-neutral">
                    <div className="ob-finding-icon"><Lightbulb size={18} /></div>
                    <div>
                      <strong>{h.lead}</strong>
                      <p>{h.summary}</p>
                    </div>
                  </Card>
                )}
                {h.bullets.map((x: any) => (
                  <Card key={x.lead || x.text} className="ob-finding ob-neutral">
                    <div className="ob-finding-icon"><Minus size={18} /></div>
                    <div>
                      <strong>{x.lead}</strong>
                      <p>{x.text}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </React.Fragment>
          ))}
        </>
      )}

      <p className="data-note">{b.notes.join(' ')}</p>
    </section>
  );
}
