import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Lightbulb, MapPin, Target, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { useLoad, useOnChange } from '../hooks';
import { MONTHS_SHORT, money, moneyShort, number, percent } from '../types';
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
  StatusBadge,
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

  /* ── The figures the page needs but did not read ──────────────────────────
     Every number below comes from the studio's own response: the funnel's cohort sizes,
     the 2027 monthly bridge, and the segment snapshots. Nothing here is a new estimate
     unless it says so on screen. */
  const funnelSizes = data.funnel.sampleSizes || { leadCohort: 0, trialCohort: 0, bookingCohort: 0 };
  const funnelCohort = {
    buyers: Math.round(Number(funnelSizes.trialCohort || 0) * Number(data.funnel.trialToPurchaseRate || 0)),
  };
  /* A one-line reading of the revenue chart: the months that carried the year and the
     trend behind them, so the card says something rather than only drawing something. */
  const observedMonths = (data.monthly || []).filter((m: any) => Number(m.revenue) > 0);
  const bestMonth = observedMonths.reduce(
    (a: any, b: any) => (Number(b.revenue) > Number(a?.revenue || -1) ? b : a),
    null,
  );
  const worstMonth = observedMonths.reduce(
    (a: any, b: any) => (Number(b.revenue) < Number(a?.revenue || Infinity) ? b : a),
    null,
  );
  const observedTotal = observedMonths.reduce((sum: number, m: any) => sum + Number(m.revenue || 0), 0);
  const priorTotal = observedMonths.reduce((sum: number, m: any) => sum + Number(m.prior_revenue || 0), 0);
  const read = {
    best: bestMonth ? Number(bestMonth.revenue) : 0,
    bestMonth: bestMonth ? Number(bestMonth.month) - 1 : 0,
    worst: worstMonth ? Number(worstMonth.revenue) : 0,
    worstMonth: worstMonth ? Number(worstMonth.month) - 1 : 0,
    yoy: priorTotal > 0 ? ((observedTotal - priorTotal) / priorTotal) * 100 : null,
  };
  const productRevenue = (data.products || []).reduce((sum: number, p: any) => sum + Number(p.revenue || 0), 0);
  const sourceLeads = (data.sources || []).reduce((sum: number, p: any) => sum + Number(p.leads || 0), 0);
  const monthlyBridge: any[] = bridge?.monthlyBridge || [];
  const maxBridgeTarget = Math.max(1, ...monthlyBridge.map((m: any) => Number(m.target2027 || 0)));
  const bridgeStreams = [
    { key: 'newClient', label: 'New clients', tone: '#245f57' },
    { key: 'renewal', label: 'Renewals', tone: '#a96935' },
    { key: 'reactivation', label: 'Reactivation', tone: '#7d5b8c' },
    { key: 'other', label: 'Other & ancillary', tone: '#8a9a98' },
  ];
  /* Observed average ticket: revenue over transactions across the evidence year. */
  const observedAov = totalTransactions ? data.recommendations.totalRevenue / totalTransactions : 0;
  const segmentTicket = (segment: any) => {
    if (segment.average_spend) return { value: segment.average_spend, modelled: false };
    // Segments that have never bought (leads, lapsed, trials) have no observed spend, so
    // they are valued at the studio's own observed average ticket and labelled as modelled.
    return { value: observedAov, modelled: true };
  };
  const segments = (data.segments || []).map((segment: any) => {
    const ticket = segmentTicket(segment);
    const expected = segment.average_spend
      ? segment.expected_revenue
      : Math.round(ticket.value * Number(segment.response_rate || 0) * Number(segment.audience_size || 0));
    return { ...segment, ticket, expected };
  });
  const measurableSegments = segments.filter((s: any) => Number(s.audience_size) > 0);
  const unmeasurableSegments = segments.filter((s: any) => !Number(s.audience_size));
  const segmentAudience = measurableSegments.reduce((sum: number, s: any) => sum + Number(s.audience_size || 0), 0);
  const segmentOpportunity = measurableSegments.reduce((sum: number, s: any) => sum + Number(s.expected || 0), 0);
  const highPrioritySegments = measurableSegments.filter((s: any) => s.priority === 'high').length;

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
            value={moneyShort(data.recommendations.totalRevenue)}
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
          { id: 'bridge', label: '2027 bridge & simulator' },
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
                <ResponsiveContainer width="100%" height={330}>
                  {/* Only months with observed sales: trailing empty months would drag the
                      line to zero and read as a collapse that never happened. */}
                  <LineChart data={data.monthly.filter((m: any) => Number(m.revenue) > 0)}>
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
              {/* The chart is the shape; this line is the reading of it. */}
              <ul className="rev-read">
                <li>
                  <span>Strongest month</span>
                  <b>{read.best ? `${MONTHS_SHORT[read.bestMonth]} · ${money(read.best, true)}` : '—'}</b>
                </li>
                <li>
                  <span>Quietest month</span>
                  <b>{read.worst ? `${MONTHS_SHORT[read.worstMonth]} · ${money(read.worst, true)}` : '—'}</b>
                </li>
                <li>
                  <span>Trend · same months LY</span>
                  <b className={read.yoy === null ? '' : read.yoy >= 0 ? 'pos' : 'neg'}>
                    {read.yoy === null ? '—' : `${read.yoy >= 0 ? '+' : ''}${read.yoy.toFixed(1)}% vs prior year`}
                  </b>
                </li>
                <li>
                  <span>Average ticket</span>
                  <b>{money(observedAov)}</b>
                </li>
              </ul>
            </Card>
            <Card>
              <CardHeader
                title="Conversion funnel"
                subtitle="Observed cohort narrowing, drawn to scale"
                action={<Badge tone="blue">Historical</Badge>}
              />
              {/* The funnel used to be three loose numbers in a tall white box. It is drawn
                  now: each bar's width is that stage against the stage above it, so the
                  narrowing is the shape of the thing rather than something to work out. */}
              <div className="funnel-steps">
                <div className="funnel-step">
                  <span>Leads observed</span>
                  <strong>{number(funnelSizes.leadCohort)}</strong>
                  <i style={{ ['--w' as string]: '100%' } as React.CSSProperties} />
                  <small>Imported lead records in the current snapshot</small>
                </div>
                <div className="funnel-step">
                  <span>Matured trial cohort</span>
                  <strong>{number(funnelSizes.trialCohort)}</strong>
                  <i
                    style={
                      {
                        ['--w' as string]: `${funnelSizes.leadCohort ? Math.min(100, (funnelSizes.trialCohort / funnelSizes.leadCohort) * 100) : 100}%`,
                      } as React.CSSProperties
                    }
                  />
                  <small>
                    First visits with enough time behind them to convert ·{' '}
                    {percent(data.funnel.leadToBookingRate, 1, true)} of leads assumed to book
                  </small>
                </div>
                <div className="funnel-step is-rate">
                  <span>Bought after the trial</span>
                  <strong>{number(funnelCohort.buyers)}</strong>
                  <i
                    style={
                      {
                        ['--w' as string]: `${funnelSizes.trialCohort ? Math.min(100, (funnelCohort.buyers / funnelSizes.trialCohort) * 100) : 0}%`,
                      } as React.CSSProperties
                    }
                  />
                  <small>
                    {percent(data.funnel.trialToPurchaseRate, 1, true)} of matured trials ·{' '}
                    {percent(data.funnel.leadToPurchaseObserved, 1, true)} of imported leads overall
                  </small>
                </div>
              </div>
              <Callout tone="info">
                Observed history only. The rates used to build 2027 targets are in Plan › Approvals &amp; Calculations ›
                Target breakdown.
              </Callout>
            </Card>
          </div>
          {/* Both of these are wide tables. Side by side they clipped their own headings and
              left a column of empty card; stacked, each one reads at full width. */}
          <Card>
            <CardHeader
              title="Product and package mix"
              subtitle="Top observed sales items by revenue, with the share each one carries"
            />
            <TableScroll>
              <table className="data-table mix-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Revenue</th>
                    <th className="num">Share</th>
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
                      <td className="num">
                        <span className="share-bar" aria-hidden="true">
                          <i
                            style={{
                              width: `${Math.min(100, (Number(p.revenue) / Math.max(1, Number(data.products[0]?.revenue))) * 100)}%`,
                            }}
                          />
                        </span>
                        <em className="src-rate">{percent((Number(p.revenue) / Math.max(1, productRevenue)) * 100)}</em>
                      </td>
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
              subtitle="Lead volume and the conversion state imported for each source"
            />
            <TableScroll>
              <table className="data-table mix-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th className="num">Leads</th>
                    <th className="num">Share of leads</th>
                    <th className="num">Converted</th>
                    <th className="num">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((p: any) => (
                    <tr key={p.source}>
                      <td>
                        <strong>{p.source}</strong>
                      </td>
                      <td className="num">{p.leads}</td>
                      <td className="num">
                        <span className="share-bar" aria-hidden="true">
                          <i
                            style={{ width: `${Math.min(100, (Number(p.leads) / Math.max(1, sourceLeads)) * 100)}%` }}
                          />
                        </span>
                        <em className="src-rate">{percent((Number(p.leads) / Math.max(1, sourceLeads)) * 100)}</em>
                      </td>
                      <td className="num">{p.conversions || 0}</td>
                      <td className="num">{percent(p.leads ? ((p.conversions || 0) / p.leads) * 100 : null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <p className="data-note">
              Lead records are current-state snapshots, so a source&apos;s conversion is the state at import time — not
              a cohort that has finished converting.
            </p>
          </Card>
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
      {tab === 'bridge' && (
        <>
          {!bridge ? (
            <Card>
              <CardHeader title="No 2027 bridge for this studio" />
              <p className="data-note">
                This location has no approved 2027 target in the current plan, so no bridge has been drawn. Nothing has
                been estimated in its place.
              </p>
            </Card>
          ) : (
            <>
              <Card className="kpi-primary">
                <div className="kpi-grid four">
                  <Metric
                    label={`${activeYear} annualised pace`}
                    value={moneyShort(bridge.annualized2026)}
                    detail={`${money(bridge.observedComplete2026, true)} complete · ${money(bridge.observedYtd2026, true)} to date`}
                  />
                  <Metric
                    label="2027 plan target"
                    value={moneyShort(bridge.annualTarget2027)}
                    detail={`+${Number(bridge.bridgePct || 0).toFixed(1)}% over the ${activeYear} run-rate`}
                  />
                  <Metric
                    label="Bridge to find"
                    value={moneyShort(bridge.bridgeDelta)}
                    detail="Revenue above the current annualised pace"
                  />
                  <Metric
                    label="Recoverable at a 10% cap"
                    value={moneyShort(bridge.discountAudit?.recoverableAt10PctCap)}
                    detail={`${percent((bridge.discountAudit?.effectiveDiscountRate || 0) * 100, 1)} observed discount rate`}
                    tone={(bridge.discountAudit?.effectiveDiscountRate || 0) * 100 <= 10 ? 'positive' : 'default'}
                  />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Where the bridge comes from"
                  subtitle={`${activeYear} observed stream revenue against the 2027 stream targets baked into the approved plan`}
                />
                <div className="br-streams">
                  {bridgeStreams.map(stream => {
                    const actual = Number(bridge.streamActuals2026?.[stream.key] || 0);
                    const target = Number(bridge.streamTargets2027?.[stream.key] || 0);
                    const delta = target - actual;
                    return (
                      <div className="br-stream" key={stream.key}>
                        <span>
                          <i
                            aria-hidden="true"
                            style={{
                              display: 'inline-block',
                              width: 7,
                              height: 7,
                              marginRight: 6,
                              borderRadius: 2,
                              background: stream.tone,
                            }}
                          />
                          {stream.label}
                        </span>
                        <strong>{money(target, true)}</strong>
                        <em>
                          {money(actual, true)} in {activeYear}
                        </em>
                        <b className={delta >= 0 ? 'pos' : 'neg'}>
                          {delta >= 0 ? `+${money(delta, true)}` : money(delta, true)}
                        </b>
                      </div>
                    );
                  })}
                </div>
                <p className="data-note">
                  Stream targets come from the approved 2027 plan. Observed stream revenue is what the imported sales
                  history attributes to each stream — it is not a forecast.
                </p>
              </Card>

              <Card>
                <CardHeader
                  title="What each month has to find"
                  subtitle="The approved monthly target, and the buyers, trials, leads and renewals that carry it"
                />
                <TableScroll>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="num">2027 target</th>
                        <th className="num">New buyers</th>
                        <th className="num">Trials</th>
                        <th className="num">Leads</th>
                        <th className="num">Renewals</th>
                        <th className="num">Reactivations</th>
                        <th>Feasibility</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBridge.map((m: any) => (
                        <tr key={m.month}>
                          <td>
                            <strong>
                              {MONTHS_SHORT[Number(m.month) - 1]} {year}
                            </strong>
                            <span
                              aria-hidden="true"
                              style={{
                                display: 'block',
                                height: 4,
                                marginTop: 5,
                                borderRadius: 999,
                                background: 'var(--line-soft, #efeae0)',
                                overflow: 'hidden',
                              }}
                            >
                              <i
                                style={{
                                  display: 'block',
                                  height: '100%',
                                  width: `${Math.min(100, (Number(m.target2027 || 0) / maxBridgeTarget) * 100)}%`,
                                  borderRadius: 999,
                                  background: 'color-mix(in srgb, var(--a1, #45403a) 70%, #ffffff)',
                                }}
                              />
                            </span>
                          </td>
                          <td className="num">
                            <strong>{money(m.target2027, true)}</strong>
                          </td>
                          <td className="num">{number(m.newBuyersNeeded)}</td>
                          <td className="num">{number(m.trialsNeeded)}</td>
                          <td className="num">{number(m.leadsNeeded)}</td>
                          <td className="num">{number(m.renewalsNeeded)}</td>
                          <td className="num">{number(m.reactivationsNeeded)}</td>
                          <td>
                            <Badge
                              tone={
                                m.feasibility === 'stretch'
                                  ? 'amber'
                                  : m.feasibility === 'comfortable'
                                    ? 'green'
                                    : 'blue'
                              }
                            >
                              {String(m.feasibility || 'balanced').replaceAll('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </Card>

              <div className="dashboard-grid-main">
                <Card>
                  <CardHeader
                    title="Leverage simulator"
                    subtitle="Three levers the studio controls, moved against the bridge it has to cover"
                  />
                  <div className="sim-controls">
                    <div className="sim-control">
                      <label htmlFor="sim-cap">
                        Discount ceiling
                        <b>{simDiscountCap}%</b>
                      </label>
                      <input
                        id="sim-cap"
                        type="range"
                        min="4"
                        max={Math.max(20, Math.round(observedDiscPct))}
                        step="1"
                        value={simDiscountCap}
                        onChange={e => setSimDiscountCap(Number(e.target.value))}
                      />
                      <small>
                        Observed exposure {percent(observedDiscPct, 1)}. Every point removed above the ceiling returns{' '}
                        {money(Math.round(annualizedGross / 100), true)} a year at this run-rate.
                      </small>
                    </div>
                    <div className="sim-control">
                      <label htmlFor="sim-trial">
                        Trial → purchase lift
                        <b>+{simTrialLiftPts} pts</b>
                      </label>
                      <input
                        id="sim-trial"
                        type="range"
                        min="0"
                        max="15"
                        step="1"
                        value={simTrialLiftPts}
                        onChange={e => setSimTrialLiftPts(Number(e.target.value))}
                      />
                      <small>
                        On {number(annualTrials2027)} planned trials, at the {money(newTicket)} new-client ticket.
                      </small>
                    </div>
                    <div className="sim-control">
                      <label htmlFor="sim-upgrade">
                        Renewal upgrade share
                        <b>{simUpgradeShare}%</b>
                      </label>
                      <input
                        id="sim-upgrade"
                        type="range"
                        min="0"
                        max="60"
                        step="5"
                        value={simUpgradeShare}
                        onChange={e => setSimUpgradeShare(Number(e.target.value))}
                      />
                      <small>
                        On {number(annualRenewals2027)} planned renewals, valued at the upgrade share of a{' '}
                        {money(renewalTicket)} renewal.
                      </small>
                    </div>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="What the levers add up to" subtitle="Scenario only — nothing here is approved" />
                  <div className="sim-result">
                    <div>
                      <span>Discount discipline</span>
                      <strong>{money(simDiscountRecovered, true)}</strong>
                    </div>
                    <div>
                      <span>Trial conversion</span>
                      <strong>{money(simTrialRevenueLift, true)}</strong>
                    </div>
                    <div>
                      <span>Renewal upgrades</span>
                      <strong>{money(simUpgradeLift, true)}</strong>
                    </div>
                    <div>
                      <span>Total leverage</span>
                      <strong>{money(simTotalLeverage, true)}</strong>
                    </div>
                    <div className="sim-cover">
                      <i
                        style={
                          {
                            ['--w' as string]: `${Math.min(100, simBridgeCoveragePct)}%`,
                          } as React.CSSProperties
                        }
                      />
                      <span>
                        Covers <strong>{simBridgeCoveragePct}%</strong> of the {money(bridgeGap, true)} bridge. The
                        three levers overlap in practice; treat the total as an upper bound.
                      </span>
                    </div>
                  </div>
                  <Callout tone="info">{data.recommendations.targetMethod}</Callout>
                </Card>
              </div>
            </>
          )}
        </>
      )}
      {tab === 'attendance' && (
        <>
          <Card className="kpi-primary">
            <div className="kpi-grid four">
              <Metric
                label={`${activeYear} observed bookings`}
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
              <CardHeader title="Time-band cancellation pattern" subtitle={`${activeYear} observed bookings`} />
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
        <>
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
            {/* The segment rows used to carry a dash wherever a segment had never bought
                anything — which is most of them, because leads and lapsed clients have no
                observed spend by definition. Each row now states a value and says whether
                that value was observed or modelled from this studio's own average ticket. */}
            <div className="seg-summary">
              <div>
                <span>Addressable audience</span>
                <strong>{number(segmentAudience)}</strong>
              </div>
              <div>
                <span>Modelled opportunity</span>
                <strong>{money(segmentOpportunity, true)}</strong>
              </div>
              <div>
                <span>High-priority segments</span>
                <strong>
                  {highPrioritySegments} of {measurableSegments.length}
                </strong>
              </div>
              <div>
                <span>Observed average ticket</span>
                <strong>{money(observedAov, true)}</strong>
              </div>
            </div>
            <TableScroll>
              <table className="data-table segment-table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th className="num">Audience</th>
                    <th className="num">Ticket used</th>
                    <th className="num">Scenario revenue</th>
                    <th>Recommended intervention</th>
                    <th>Limitation</th>
                  </tr>
                </thead>
                <tbody>
                  {measurableSegments.map((x: any) => (
                    <tr key={x.segment_key}>
                      <td>
                        <strong>{x.segment_name}</strong>
                        <Badge tone={x.priority === 'high' ? 'red' : 'neutral'}>{x.priority}</Badge>
                      </td>
                      <td className="num">{number(x.audience_size)}</td>
                      <td className="num">
                        {money(x.ticket.value)}
                        {x.ticket.modelled && <span className="seg-model">modelled</span>}
                      </td>
                      <td className="num">
                        <strong>{money(x.expected, true)}</strong>
                      </td>
                      <td>{x.recommendation}</td>
                      <td className="cell-wrap muted">{x.limitations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <p className="data-note">
              Audience counts are imported-data estimates. Scenario revenue applies each segment&apos;s stated response
              rate to its audience and ticket; a <span className="seg-model">modelled</span> ticket is this
              studio&apos;s observed average ticket, because that segment has never bought in the imported history.
            </p>
          </Card>
          {unmeasurableSegments.length > 0 && (
            <Card>
              <CardHeader
                title="Segments the supplied files cannot measure"
                subtitle="Listed rather than shown as zero, so the gap is visible"
              />
              <ul className="methodology-list">
                {unmeasurableSegments.map((x: any) => (
                  <li key={x.segment_key}>
                    <strong>{x.segment_name}</strong> — {x.limitations}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {data.offers?.length > 0 && (
            <Card>
              <CardHeader
                title="Attributed historical promotions"
                subtitle="Codes with observed revenue in the imported history · attributed, not proven incremental"
              />
              <TableScroll>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Offer</th>
                      <th className="num">Attributed revenue</th>
                      <th className="num">Redemptions</th>
                      <th className="num">Effective discount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.offers.map((o: any) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.name}</strong>
                          <span>{String(o.objective || '').replaceAll('_', ' ')}</span>
                        </td>
                        <td className="num">{money(o.actual_revenue ?? o.expected_revenue, true)}</td>
                        <td className="num">{o.actual_redemptions ? number(o.actual_redemptions) : '—'}</td>
                        <td className="num">{percent(o.effective_discount, 1, true)}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
