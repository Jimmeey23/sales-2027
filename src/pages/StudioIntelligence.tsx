import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Lightbulb, MapPin, Target, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { useLoad, useOnChange } from '../hooks';
import { MONTHS_SHORT, money, number, percent } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  ErrorState,
  Loading,
  Metric,
  Select,
  TableScroll,
  Tabs,
} from '../components/ui';
import { LOCATION_COLORS, planningLocations } from '../data/locations';
import PageHeader from '../components/PageHeader';

export default function StudioIntelligence() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { boot, year, studioId, setStudioId } = useApp();
  const [tab, setTab] = useState('performance');
  const [evidenceYear, setEvidenceYear] = useState<number>(() => Math.min(year, 2026));
  const [simDiscountCap, setSimDiscountCap] = useState<number>(10);
  const [simTrialLiftPts, setSimTrialLiftPts] = useState<number>(3);
  const [simUpgradeShare, setSimUpgradeShare] = useState<number>(20);

  useEffect(() => {
    if (year <= 2026) setEvidenceYear(year);
    else setEvidenceYear(prev => (prev > 2026 ? 2026 : prev));
  }, [year]);

  useEffect(() => {
    if (id && !studioId) setStudioId(Number(id));
  }, []);
  useOnChange(studioId, () => {
    if (!studioId) navigate('/insights');
    else if (String(studioId) !== id) navigate(`/studios/${studioId}`);
  });
  const { data, loading, error, reload } = useLoad<any>(
    () => api(`/studios/${id}?year=${evidenceYear}`),
    [id, evidenceYear],
  );
  if (loading && !data) return <Loading label="Building studio intelligence profile…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;
  const s = data.studio,
    activeYear = Number(data.effectiveYear || evidenceYear),
    bridge = data.planBridge2027,
    totalTransactions = data.monthly.reduce((n: number, m: any) => n + m.transactions, 0);
  const strongest = [...data.seasonality].sort((a: any, b: any) => b.average_revenue - a.average_revenue)[0];
  const weakest = [...data.seasonality].sort((a: any, b: any) => a.average_revenue - b.average_revenue)[0];
  const navStudios = boot.studios.filter(st =>
    ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up', 'Copper + Cloves', 'Plash Pilates'].includes(st.name),
  );

  // Real-time leverage simulator math from observed studio unit economics
  const observedDiscPct = (bridge?.discountAudit?.effectiveDiscountRate || 0) * 100;
  const annualizedGross =
    observedDiscPct < 95 && bridge?.annualized2026
      ? bridge.annualized2026 / (1 - observedDiscPct / 100)
      : bridge?.annualized2026 || 0;
  const simDiscountRecovered = Math.max(
    0,
    Math.round(annualizedGross * (Math.max(0, observedDiscPct - simDiscountCap) / 100)),
  );
  const annualTrials2027 = (bridge?.monthlyBridge || []).reduce(
    (sum: number, m: any) => sum + Number(m.trialsNeeded || 0),
    0,
  );
  const newTicket = bridge?.unitEconomics?.newClientTicket || 6000;
  const simTrialRevenueLift = Math.round(annualTrials2027 * (simTrialLiftPts / 100) * newTicket);
  const annualRenewals2027 = (bridge?.monthlyBridge || []).reduce(
    (sum: number, m: any) => sum + Number(m.renewalsNeeded || 0),
    0,
  );
  const renewalTicket = bridge?.unitEconomics?.renewalTicket || 14000;
  const simUpgradeLift = Math.round(annualRenewals2027 * (simUpgradeShare / 100) * (renewalTicket * 0.65));
  const simTotalLeverage = simDiscountRecovered + simTrialRevenueLift + simUpgradeLift;
  const bridgeGap = Math.max(1, Number(bridge?.bridgeDelta || 1));
  const simBridgeCoveragePct = Math.min(200, Math.round((simTotalLeverage / bridgeGap) * 100));

  return (
    <div className="ws-page studio-intel">
      <PageHeader
        eyebrow={`${s.city.toUpperCase()} · STUDIO INTELLIGENCE`}
        title={s.name}
        description="Historical evidence, commercial opportunities and target guidance for this location."
        actions={
          <>
            <div className="ws-segmented" role="group" aria-label="Historical evidence year">
              {(data.availableActualYears || [2026, 2025]).map((yr: number) => (
                <button
                  key={yr}
                  type="button"
                  className={activeYear === yr ? 'active' : ''}
                  onClick={() => setEvidenceYear(yr)}
                >
                  {yr} actuals
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => navigate('/sales-plan/targets')}>
              Plan 2027 <ArrowRight size={15} />
            </Button>
          </>
        }
        meta={
          <>
            <Badge tone="neutral">
              <MapPin size={12} /> {s.city}
            </Badge>
            {data.isRollup && <Badge tone="blue">Consolidated Pop-up rollup</Badge>}
            <Badge tone="green">
              {activeYear} imported actuals (complete through {data.historic.through})
            </Badge>
          </>
        }
      />
      <Card className="kpi-primary">
        <div className="kpi-grid four">
          <Metric
            label={`${activeYear} observed revenue`}
            value={money(data.recommendations.totalRevenue, true)}
            detail="Gross collected sales value"
          />
          <Metric label="Transactions" value={number(totalTransactions)} detail="Sales items, not unique clients" />
          <Metric
            label="Trial → purchase"
            value={percent(data.funnel.trialToPurchaseRate, 1, true)}
            detail={`${number(data.funnel.sampleSizes.trialCohort)} matured first visits`}
          />
          <Metric
            label="Observed discount exposure"
            value={percent(
              data.recommendations.totalRevenue
                ? (data.recommendations.totalDiscount /
                    (data.recommendations.totalRevenue + data.recommendations.totalDiscount)) *
                    100
                : null,
            )}
            detail={money(data.recommendations.totalDiscount, true)}
          />
        </div>
      </Card>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'performance', label: 'Historical performance' },
          { id: 'findings', label: 'Historic findings' },
          { id: 'attendance', label: 'Attendance & cancellations' },
          { id: 'customers', label: 'Customer opportunities' },
        ]}
      />
      {tab === 'performance' && (
        <>
          <div className="dashboard-grid-main">
            <Card>
              <CardHeader title="Revenue trend" subtitle={`${activeYear} actual compared with prior-year month`} />
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.monthly}>
                    <CartesianGrid stroke="#e7e0db" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={m => MONTHS_SHORT[m - 1]} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                      tickLine={false}
                      axisLine={false}
                      width={54}
                    />
                    <Tooltip
                      formatter={(v: any, n: any) => [
                        money(v),
                        n === 'revenue' ? `${activeYear} actual` : `${activeYear - 1} actual`,
                      ]}
                      labelFormatter={m => MONTHS_SHORT[Number(m) - 1]}
                    />
                    <Line dataKey="revenue" stroke="#245f57" strokeWidth={2.5} dot={false} />
                    <Line dataKey="prior_revenue" stroke="#c9bcb2" strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardHeader title="Conversion funnel" subtitle="Observed rates" />
              <div className="funnel-vertical">
                <div>
                  <span>Matured trial cohort</span>
                  <strong>{number(data.funnel.sampleSizes.trialCohort)}</strong>
                  <small>Imported first visits</small>
                </div>
                <div>
                  <span>Trial-to-purchase</span>
                  <strong>{percent(data.funnel.trialToPurchaseRate, 1, true)}</strong>
                  <Badge tone="blue">Historical</Badge>
                </div>
                <div>
                  <span>Booking attendance</span>
                  <strong>{percent(data.funnel.bookingToAttendanceRate, 1, true)}</strong>
                  <Badge tone={data.funnel.sources.bookingToAttendanceRate === 'manual_assumption' ? 'amber' : 'green'}>
                    {data.funnel.sources.bookingToAttendanceRate === 'manual_assumption'
                      ? 'Assumption'
                      : 'Checkins · all bookings'}
                  </Badge>
                </div>
              </div>
              <Callout tone="info">
                Observed history only. The rates used for 2027 planning are in Plan › Target Metrics › target breakdown.
              </Callout>
            </Card>
          </div>
          <div className="two-column">
            <Card>
              <CardHeader title="Product and package mix" subtitle="Top observed sales items by revenue" />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="num">Revenue</th>
                      <th className="num">Transactions</th>
                      <th className="num">AOV</th>
                      <th className="num">Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p: any) => (
                      <tr key={p.name}>
                        <td>
                          <strong>{p.name}</strong>
                          <span>{p.category}</span>
                        </td>
                        <td className="num">{money(p.revenue, true)}</td>
                        <td className="num">{p.transactions}</td>
                        <td className="num">{money(p.aov)}</td>
                        <td className="num">{money(p.discount, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
            <Card>
              <CardHeader
                title="Acquisition sources"
                subtitle="Lead volume, current conversion state and attributed LTV"
              />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th className="num">Leads</th>
                      <th className="num">Converted</th>
                      <th className="num">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sources.map((p: any) => (
                      <tr key={p.source}>
                        <td>{p.source}</td>
                        <td className="num">{p.leads}</td>
                        <td className="num">{p.conversions || 0}</td>
                        <td className="num">{percent(p.leads ? ((p.conversions || 0) / p.leads) * 100 : null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          </div>
          {data.trainers?.length > 0 && (
            <Card>
              <CardHeader
                title="Trainer delivery and lifecycle snapshots"
                subtitle="Imported trainer-month payroll report · averages are unweighted across available monthly rows"
              />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th className="num">Sessions</th>
                      <th className="num">Customers</th>
                      <th className="num">Paid value</th>
                      <th className="num">Avg conversion</th>
                      <th className="num">Avg retention</th>
                      <th className="num">New clients</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trainers.map((t: any) => (
                      <tr key={t.trainer_ref}>
                        <td>
                          <strong>{t.trainer_name || 'Privacy-safe trainer ref'}</strong>
                        </td>
                        <td className="num">{number(t.sessions)}</td>
                        <td className="num">{number(t.customers)}</td>
                        <td className="num">{money(t.paid_revenue, true)}</td>
                        <td className="num">{percent(t.conversion_rate, 1, true)}</td>
                        <td className="num">{percent(t.retention_rate, 1, true)}</td>
                        <td className="num">{number(t.new_clients)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}
          <div className="two-column">
            <Card>
              <CardHeader
                title="Commercial strengths"
                subtitle="Evidence-linked patterns, not generic best practices"
              />
              <ul className="insight-list positive">
                {data.strengths.map((x: string) => (
                  <li key={x}>
                    <CheckCircle2 size={18} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Commercial weaknesses" subtitle="Bottlenecks and revenue-quality flags" />
              <ul className="insight-list warning">
                {data.weaknesses.map((x: string) => (
                  <li key={x}>
                    <CircleAlert size={18} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
      {tab === 'findings' && (
        <>
          <Callout tone="info" title={`Complete-month evidence through ${data.historic.through}`}>
            {data.historic.methodology}{' '}
            {data.historic.excludedPartialOrFutureMonths > 0 &&
              `${data.historic.excludedPartialOrFutureMonths} partial or future months are excluded from these findings.`}
          </Callout>
          <div className="historic-finding-grid">
            {data.historic.findings.map((finding: any, index: number) => (
              <Card key={`${finding.title}-${index}`} className="historic-finding">
                <Badge
                  tone={
                    finding.type === 'attendance'
                      ? 'blue'
                      : finding.type === 'yoy'
                        ? 'purple'
                        : finding.type === 'revenue_quality'
                          ? 'amber'
                          : 'green'
                  }
                >
                  {finding.type.replaceAll('_', ' ')}
                </Badge>
                <h3>{finding.title}</h3>
                <p>{finding.finding}</p>
                <div>
                  <strong>Decision context</strong>
                  <span>{finding.action}</span>
                </div>
              </Card>
            ))}
          </div>
          {!data.historic.findings.length && (
            <Card>
              <CardHeader title="No complete-period findings available" />
              <p className="data-note">
                The selected year has no complete observed months in the current data scope. No historic pattern has
                been invented.
              </p>
            </Card>
          )}
          <Card>
            <CardHeader
              title="Complete-month comparison register"
              subtitle="Revenue, YoY, discount and operational attendance remain separate measures"
            />
            <TableScroll>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="num">Observed revenue</th>
                    <th className="num">Prior-year revenue</th>
                    <th className="num">YoY</th>
                    <th className="num">Discount</th>
                    <th className="num">Check-in</th>
                    <th className="num">Late cancel</th>
                  </tr>
                </thead>
                <tbody>
                  {data.historic.comparisons.map((row: any) => (
                    <tr key={row.month}>
                      <td>
                        <strong>
                          {MONTHS_SHORT[row.month - 1]} {year}
                        </strong>
                      </td>
                      <td className="num">{money(row.revenue, true)}</td>
                      <td className="num">{money(row.prior_revenue, true)}</td>
                      <td className={`num ${row.yoy_percent < 0 ? 'negative-text' : 'positive-text'}`}>
                        {percent(row.yoy_percent)}
                      </td>
                      <td className="num">{money(row.discount_cost, true)}</td>
                      <td className="num">{percent(row.checkin_rate, 1, true)}</td>
                      <td className="num">{percent(row.late_cancellation_rate, 1, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
          <Card>
            <CardHeader
              title="Complete-period product contributors"
              subtitle="Top five observed sales items; partial months excluded"
            />
            <TableScroll>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Revenue</th>
                    <th className="num">Transactions</th>
                    <th className="num">Discount</th>
                    <th className="num">Period share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.historic.completeProducts.map((product: any) => (
                    <tr key={product.name}>
                      <td>
                        <strong>{product.name}</strong>
                        <span>{product.category}</span>
                      </td>
                      <td className="num">{money(product.revenue, true)}</td>
                      <td className="num">{number(product.transactions)}</td>
                      <td className="num">{money(product.discount, true)}</td>
                      <td className="num">
                        {percent(
                          product.revenue /
                            Math.max(
                              1,
                              data.historic.comparisons.reduce((sum: number, row: any) => sum + row.revenue, 0),
                            ),
                          1,
                          true,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
        </>
      )}
      {tab === 'attendance' && (
        <>
          <Card className="kpi-primary">
            <div className="kpi-grid four">
              <Metric
                label={`${year} observed bookings`}
                value={number(data.attendance.summary.bookings)}
                detail="Current-day and future sessions excluded"
              />
              <Metric
                label="Check-in rate"
                value={percent(data.attendance.summary.checkin_rate, 1, true)}
                detail={`${number(data.attendance.summary.checkins)} checked-in visits`}
              />
              <Metric
                label="Late cancellation"
                value={percent(data.attendance.summary.late_cancellation_rate, 1, true)}
                detail={`${number(data.attendance.summary.late_cancellations)} late · ${number(data.attendance.summary.other_not_checked)} other non-check-ins`}
              />
              <Metric
                label="Visits / active member"
                value={number(data.attendance.summary.visits_per_member, 1)}
                detail={`${number(data.attendance.summary.active_members)} members with a check-in`}
              />
            </div>
          </Card>
          <div className="dashboard-grid-main">
            <Card>
              <CardHeader
                title="Monthly attendance behaviour"
                subtitle="Checked-in visits and late cancellations · October remains partial"
              />
              <div className="chart-box">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.attendance.monthly}>
                    <CartesianGrid stroke="#e7e0db" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={m => MONTHS_SHORT[Number(String(m).slice(5, 7)) - 1]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: any, n: any) => [
                        number(v),
                        n === 'checkins' ? 'Checked-in visits' : 'Late cancellations',
                      ]}
                      labelFormatter={m => m}
                    />
                    <Bar dataKey="checkins" fill="#245f57" radius={[5, 5, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="late_cancellations" fill="#b25938" radius={[5, 5, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="data-note">
                Attendance and late-cancellation counts are operational records. They are not revenue transactions.
              </p>
            </Card>
            <Card>
              <CardHeader
                title="Attendance outlook & predictability"
                subtitle={`${data.attendance.outlook.next_month} operational baseline`}
              />
              <div className="detail-metrics two">
                <Metric
                  label="Baseline check-ins"
                  value={number(data.attendance.outlook.baseline_attended)}
                  detail={`Prior-year comparator: ${data.attendance.outlook.comparable_month}`}
                />
                <Metric
                  label="Planning range"
                  value={`${number(data.attendance.outlook.planning_low)}–${number(data.attendance.outlook.planning_high)}`}
                  detail="Recent-volatility range, not a confidence interval"
                />
                <Metric
                  label="Six-month attendance trend"
                  value={percent(data.attendance.outlook.raw_attendance_trend, 1, true)}
                  detail={`${percent(data.attendance.outlook.applied_trend, 1, true)} applied after caps`}
                />
                <Metric
                  label="Attendance volatility"
                  value={percent(data.attendance.outlook.attendance_volatility, 1, true)}
                  detail="Lower values indicate steadier monthly visits"
                />
              </div>
              <Callout tone="info">{data.attendance.outlook.method}</Callout>
            </Card>
          </div>
          <div className="two-column">
            <Card>
              <CardHeader title="Member attendance behaviour" subtitle="Aggregated, pseudonymous member analysis" />
              <div className="detail-metrics two">
                <Metric
                  label="Next-month attendance return"
                  value={percent(data.attendance.summary.next_month_return_rate, 1, true)}
                  detail={`${number(data.attendance.summary.eligible_return_member_months)} mature member-months`}
                />
                <Metric
                  label="New-attendee visits"
                  value={number(data.attendance.summary.new_attendee_visits)}
                  detail={`${number(data.attendance.summary.new_attendees)} distinct attending members`}
                />
                <Metric
                  label="Attended booking lead time"
                  value={`${number(data.attendance.summary.attended_lead_hours, 1)}h`}
                  detail="Order At → session; average"
                />
                <Metric
                  label="Cancelled booking lead time"
                  value={`${number(data.attendance.summary.cancelled_lead_hours, 1)}h`}
                  detail="Not cancellation notice time"
                />
              </div>
              <Callout>
                Next-month return means another check-in in the following complete month. It does not measure membership
                renewal or churn.
              </Callout>
            </Card>
            <Card>
              <CardHeader title="Time-band cancellation pattern" subtitle={`${year} observed bookings`} />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Session time</th>
                      <th className="num">Bookings</th>
                      <th className="num">Check-in</th>
                      <th className="num">Late cancel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendance.timeBands.map((x: any) => (
                      <tr key={x.band}>
                        <td>
                          <strong>{x.band}</strong>
                        </td>
                        <td className="num">{number(x.bookings)}</td>
                        <td className="num">{percent(x.checkin_rate, 1, true)}</td>
                        <td className="num">{percent(x.late_cancellation_rate, 1, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          </div>
          <div className="two-column">
            <Card>
              <CardHeader title="Day-of-week pattern" subtitle="Descriptive behaviour; no causal claim" />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th className="num">Bookings</th>
                      <th className="num">Check-in</th>
                      <th className="num">Late cancel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendance.weekdays.map((x: any) => (
                      <tr key={x.day}>
                        <td>
                          <strong>{x.day}</strong>
                        </td>
                        <td className="num">{number(x.bookings)}</td>
                        <td className="num">{percent(x.checkin_rate, 1, true)}</td>
                        <td className="num">{percent(x.late_cancellation_rate, 1, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
            <Card>
              <CardHeader
                title="Class-level review queue"
                subtitle="Highest late-cancellation rates · minimum 30 bookings"
              />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th className="num">Bookings</th>
                      <th className="num">Check-in</th>
                      <th className="num">Late cancel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendance.classes.map((x: any) => (
                      <tr key={x.class_name}>
                        <td>
                          <strong>{x.class_name}</strong>
                        </td>
                        <td className="num">{number(x.bookings)}</td>
                        <td className="num">{percent(x.checkin_rate, 1, true)}</td>
                        <td className="num">{percent(x.late_cancellation_rate, 1, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          </div>
          <Card>
            <CardHeader title="Behaviour data provenance & boundaries" subtitle={data.attendance.provenance.source} />
            <ul className="methodology-list">
              {data.attendance.provenance.limitations.map((x: string) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="data-note">
              {data.attendance.provenance.privacy} {data.attendance.provenance.observationCutoff}.
            </p>
          </Card>
        </>
      )}
      {tab === 'customers' && (
        <Card>
          <CardHeader
            title="Actionable customer audiences"
            subtitle="Aggregated, privacy-safe segment estimates"
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/retention')}>
                Open retention workspace
              </Button>
            }
          />
          <TableScroll>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th className="num">Audience</th>
                  <th className="num">Average spend</th>
                  <th className="num">Scenario revenue</th>
                  <th>Recommended intervention</th>
                  <th>Limitation</th>
                </tr>
              </thead>
              <tbody>
                {data.segments.map((x: any) => (
                  <tr key={x.segment_key}>
                    <td>
                      <strong>{x.segment_name}</strong>
                      <Badge tone={x.priority === 'high' ? 'red' : 'neutral'}>{x.priority}</Badge>
                    </td>
                    <td className="num">{number(x.audience_size)}</td>
                    <td className="num">{money(x.average_spend)}</td>
                    <td className="num">{money(x.expected_revenue, true)}</td>
                    <td>{x.recommendation}</td>
                    <td className="cell-wrap muted">{x.limitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Card>
      )}
    </div>
  );
}
