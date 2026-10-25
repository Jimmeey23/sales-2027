import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Crosshair,
  Lightbulb,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { MONTHS, MONTHS_SHORT, money, number, percent, titleCase } from '../types';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Loading,
  Metric,
  Modal,
  Progress,
  Select,
  StatusBadge,
  TableScroll,
  Tabs,
} from '../components/ui';
import PageHeader from '../components/PageHeader';

const COLORS = ['#6857e5', '#a9a0ef', '#f4a261', '#ee7d9b'];
export default function Dashboard() {
  const { studioId, boot, year, setYear } = useApp();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => (year <= 2026 ? 9 : 1)),
    [city, setCity] = useState('all'),
    [status, setStatus] = useState('all'),
    [campaign, setCampaign] = useState('all');
  const [action, setAction] = useState<any>(null),
    [offerTab, setOfferTab] = useState('top');
  const { data, loading, error, reload } = useLoad<any>(
    () => apiDashboard(year, month, studioId),
    [year, month, studioId],
  );
  const { data: campaignData } = useLoad<any>(
    () => import('../api').then(({ api }) => api(`/campaigns?year=${year}`)),
    [year],
  );
  const rows = useMemo(
    () =>
      data?.rows.filter(
        (r: any) =>
          (Number(r.actual?.revenue || 0) > 0 || Number(r.target_value || 0) > 0 || Number(r.prior_revenue || 0) > 0) &&
          (city === 'all' || r.studio.city === city) &&
          (status === 'all' || r.status === status) &&
          (campaign === 'all' ||
            campaignData?.rows.some((c: any) => String(c.id) === campaign && c.studio_id === r.studio.id)),
      ) || [],
    [data, city, status, campaign, campaignData],
  );
  const monthTotals = useMemo(() => {
    const rawRows: any[] = data?.rows || [];
    const hasPopupRollup = rawRows.some(r => r.studio?.name === 'Pop-up');
    const monthlyRows = hasPopupRollup
      ? rawRows.filter(r => r.studio?.name !== 'Copper + Cloves' && r.studio?.name !== 'Plash Pilates')
      : rawRows;
    const sum = (key: string) =>
      monthlyRows.reduce((total: number, row: any) => total + Number(row.actual?.[key] || 0), 0);
    const revenue = sum('revenue'),
      target = monthlyRows.reduce((total: number, row: any) => total + Number(row.target_value || 0), 0),
      prior = monthlyRows.reduce((total: number, row: any) => total + Number(row.prior_revenue || 0), 0);
    const transactions = sum('transactions'),
      bookings = sum('booking_count'),
      checkins = sum('checkin_count');
    return {
      revenue,
      target,
      prior,
      transactions,
      aov: transactions ? revenue / transactions : null,
      leads: sum('leads'),
      visits: sum('completed_trials'),
      checkins,
      bookings,
      yoy: prior ? (revenue / prior - 1) * 100 : null,
      achievement: target ? (revenue / target) * 100 : null,
      streams: [
        { name: 'First observed purchase', value: sum('new_client') },
        { name: 'Inferred renewals', value: sum('renewal') },
        { name: 'Inferred reactivation', value: sum('reactivation') },
        { name: 'Additional purchases', value: sum('additional') },
      ],
    };
  }, [data]);
  if (loading && !data) return <Loading label="Consolidating studio performance…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;
  const k = data.kpis,
    selectedActualMonth = data.selectedMonth;
  const composition = [
    { name: 'First observed purchase', value: k.newClient },
    { name: 'Inferred renewals', value: k.renewal },
    { name: 'Inferred reactivation', value: k.reactivation },
    { name: 'Additional purchases', value: k.additional },
  ];
  const statusCount = [
    { label: 'On track', value: k.onTrack, tone: 'green' },
    { label: 'At risk', value: k.atRisk, tone: 'amber' },
    { label: 'Below target', value: k.belowTarget, tone: 'red' },
  ];
  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="MANAGEMENT CONTROL CENTRE"
        title="The business, in motion."
        description={
          <>
            Imported actuals and planning targets for{' '}
            <strong>{studioId ? boot.studios.find(s => s.id === studioId)?.name : 'all studios'}</strong>. Estimates and
            proposed plans are labelled.
          </>
        }
        actions={
          <div className="filter-row">
            <div className="ws-segmented" role="group" aria-label="Control centre horizon">
              <button
                type="button"
                className={year === 2026 ? 'active' : ''}
                onClick={() => {
                  setYear(2026);
                  if (month > 10) setMonth(9);
                }}
              >
                2026 Actuals
              </button>
              <button
                type="button"
                className={year === 2027 ? 'active' : ''}
                onClick={() => setYear(2027)}
              >
                2027 Plan
              </button>
            </div>
            <Select aria-label="Snapshot month" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => navigate('/sales-plan/targets')}>
              Open annual plan <ArrowRight size={15} />
            </Button>
          </div>
        }
      />
      {year > 2026 && k.achieved === 0 && (
        <Callout tone="info" title={`Viewing ${year} forward planning targets (no ${year} sales actuals recorded yet)`}>
          Imported sales actuals run through <strong>{data.coverage.sales.last?.slice(0, 10) || '2026-10'}</strong>.
          Switch to <strong>2026 Actuals</strong> above to inspect observed YTD performance, or open{' '}
          <button
            type="button"
            onClick={() => navigate('/insights')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Studio Insights
          </button>{' '}
          for the 2026 → 2027 commercial bridge.
        </Callout>
      )}
      <section className="commercial-flow" aria-label="Commercial planning workflow">
        <div className="commercial-flow-heading">
          <div>
            <span className="eyebrow">A CONNECTED WORKFLOW</span>
            <h2>From target to learning</h2>
          </div>
          <p>Every stage uses the same year and location selected above.</p>
        </div>
        <div className="commercial-flow-steps">
          {[
            { n: '01', title: 'Set targets', detail: 'Agree the goal', to: '/sales-plan/targets' },
            { n: '02', title: 'Build offers', detail: 'Choose the levers', to: '/sales-plan/offers' },
            { n: '03', title: 'Schedule campaigns', detail: 'Assign dates and owners', to: '/sales-plan/campaigns' },
            { n: '04', title: 'Review outcomes', detail: 'Learn from actuals', to: '/performance' },
          ].map((step, i) => (
            <React.Fragment key={step.n}>
              <button type="button" onClick={() => navigate(step.to)}>
                <span>{step.n}</span>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </button>
              {i < 3 && <ArrowRight className="commercial-flow-arrow" size={16} />}
            </React.Fragment>
          ))}
        </div>
      </section>
      {data.coverage.sales.last?.slice(0, 7) === `${year}-${String(month).padStart(2, '0')}` &&
        Number(data.coverage.sales.last.slice(8, 10)) < new Date(year, month, 0).getDate() && (
          <Callout tone="warning" title="Partial month">
            Sales actuals run through {data.coverage.sales.last}. Comparisons with complete months need caution.
          </Callout>
        )}
      <Card className="kpi-primary">
        <div className="kpi-grid">
          <Metric
            label={`${year} revenue target`}
            value={money(k.annualTarget, true)}
            detail={
              <>
                <Badge
                  tone={
                    k.approvedMonths === k.totalTargetMonths && k.totalTargetMonths > 0
                      ? 'green'
                      : k.approvedMonths > 0
                        ? 'amber'
                        : 'amber'
                  }
                >
                  {k.approvedMonths === k.totalTargetMonths && k.totalTargetMonths > 0
                    ? 'Fully approved'
                    : k.approvedMonths > 0
                      ? 'Mixed approval'
                      : 'Proposed'}
                </Badge>{' '}
                · {k.approvedMonths} of {k.totalTargetMonths} studio-month targets approved
              </>
            }
          />
          <Metric
            label="Achieved to date"
            value={money(k.achieved, true)}
            detail={`${percent(k.achievement)} of annual target`}
          />
          <Metric label="Revenue remaining" value={money(k.remaining, true)} detail="Against selected annual target" />
          <Metric
            label="Forecast year-end"
            value={money(k.forecast, true)}
            detail="Actual YTD + baseline for unobserved months"
          />
          <Metric
            label="Forecast gap"
            value={money(k.forecastGap, true)}
            tone={k.forecastGap > 0 ? 'negative' : 'positive'}
            detail={k.forecastGap > 0 ? 'Additional action required' : 'Above selected target'}
          />
        </div>
        <div className="target-progress">
          <div>
            <span>Annual target progress</span>
            <strong>{percent(k.achievement)}</strong>
          </div>
          <Progress value={k.achievement || 0} />
        </div>
      </Card>
      <div className="overview-month-layout">
        <Card className="overview-month-card">
          <CardHeader
            title={`${MONTHS[selectedActualMonth - 1]} operating snapshot`}
            subtitle={`${year} · imported monthly actuals across the selected location scope`}
            action={<Badge tone="blue">Monthly view</Badge>}
          />
          <div className="overview-month-metrics">
            <Metric label="Monthly revenue" value={money(monthTotals.revenue, true)} detail="Gross collected value" />
            <Metric
              label="Monthly target"
              value={money(monthTotals.target, true)}
              detail={monthTotals.target ? `${percent(monthTotals.achievement)} achieved` : 'No target set'}
            />
            <Metric
              label="Year over year"
              value={percent(monthTotals.yoy)}
              detail={
                monthTotals.prior
                  ? `vs ${money(monthTotals.prior, true)} last year`
                  : 'No comparable prior-year revenue'
              }
            />
            <Metric label="Transactions" value={number(monthTotals.transactions)} detail="Imported paid transactions" />
            <Metric label="Average transaction" value={money(monthTotals.aov)} detail="Revenue ÷ transactions" />
            <Metric label="New-client leads" value={number(monthTotals.leads)} detail="Lead snapshot records" />
            <Metric label="Completed first visits" value={number(monthTotals.visits)} detail="Observed member visits" />
            <Metric
              label="Check-in rate"
              value={percent(monthTotals.bookings ? monthTotals.checkins / monthTotals.bookings : null, 1, true)}
              detail={`${number(monthTotals.checkins)} of ${number(monthTotals.bookings)} observed bookings`}
            />
          </div>
        </Card>
        <Card className="overview-month-mix">
          <CardHeader
            title="Monthly revenue mix"
            subtitle="Observed transaction classifications · not lifetime cohorts"
          />
          <div className="composition-list">
            {monthTotals.streams.map((item: any, i: number) => (
              <div key={item.name}>
                <div>
                  <span>
                    <i style={{ background: COLORS[i] }} />
                    {item.name}
                  </span>
                  <strong>{money(item.value, true)}</strong>
                </div>
                <Progress value={item.value} max={Math.max(1, monthTotals.revenue)} tone={`custom-${i}`} />
              </div>
            ))}
          </div>
          <p className="data-note">
            Renewal and reactivation are inferred from observed membership timing. Discount attribution does not prove
            incremental lift.
          </p>
        </Card>
      </div>
      <div className="status-strip">
        {statusCount.map(s => (
          <div key={s.label}>
            <Badge tone={s.tone as any} dot>
              {s.label}
            </Badge>
            <strong>{s.value}</strong>
            <span>studios in {MONTHS[month - 1]}</span>
          </div>
        ))}
        <div>
          <Badge tone="blue" dot>
            Active offers
          </Badge>
          <strong>{k.activeOffers}</strong>
          <span>currently live</span>
        </div>
        <div>
          <Badge tone="purple" dot>
            Live campaigns
          </Badge>
          <strong>{k.runningCampaigns}</strong>
          <span>running today</span>
        </div>
      </div>
      <div className="dashboard-grid-main">
        <Card>
          <CardHeader
            title="Revenue plan versus actual"
            subtitle={`${year} · gross collected value from imported sales`}
            action={<Badge tone="neutral">INR</Badge>}
          />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.trend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e8e4ef" vertical={false} />
                <XAxis dataKey="month" tickFormatter={m => MONTHS_SHORT[m - 1]} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                />
                <Tooltip
                  formatter={(v: any, name: any) => [money(v), name === 'revenue' ? 'Actual revenue' : 'Plan target']}
                  labelFormatter={m => MONTHS[Number(m) - 1]}
                />
                <Legend formatter={v => (v === 'revenue' ? 'Actual revenue' : 'Plan target')} />
                <Bar dataKey="revenue" fill="#6857e5" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line dataKey="target" stroke="#f27d5b" strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Revenue composition" subtitle="Observed classifications · not customer lifetime cohorts" />
          <div className="composition-list">
            {composition.map((item, i) => (
              <div key={item.name}>
                <div>
                  <span>
                    <i style={{ background: COLORS[i] }} />
                    {item.name}
                  </span>
                  <strong>{money(item.value, true)}</strong>
                </div>
                <Progress value={item.value} max={Math.max(1, k.achieved)} tone={`custom-${i}`} />
              </div>
            ))}
          </div>
          <div className="mini-metrics">
            <Metric label="Average transaction" value={money(k.aov)} />
            <Metric label="Average first observed purchase" value={money(k.firstAov)} />
          </div>
          <p className="data-note">
            Renewal and reactivation streams are inferred from membership start/end gaps. Early history may be
            left-truncated.
          </p>
        </Card>
      </div>
      <Card className="funnel-strip">
        <div className="funnel-stat">
          <UsersRound size={19} />
          <div>
            <span>New-client leads</span>
            <strong>{number(k.leads)}</strong>
          </div>
        </div>
        <ArrowRight className="funnel-arrow" size={18} />
        <div className="funnel-stat">
          <div>
            <span>Trial bookings</span>
            <strong>—</strong>
            <small>Event log unavailable</small>
          </div>
        </div>
        <ArrowRight className="funnel-arrow" size={18} />
        <div className="funnel-stat">
          <div>
            <span>Completed first visits</span>
            <strong>{number(k.trials)}</strong>
          </div>
        </div>
        <ArrowRight className="funnel-arrow" size={18} />
        <div className="funnel-stat">
          <div>
            <span>Trial → purchase</span>
            <strong>{percent(k.trialConversion, 1, true)}</strong>
            <small>Matured 90-day cohorts</small>
          </div>
        </div>
        <ArrowRight className="funnel-arrow" size={18} />
        <div className="funnel-stat">
          <div>
            <span>Lead → purchase</span>
            <strong>{percent(k.leadConversion, 1, true)}</strong>
            <small>Current-state snapshot</small>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/funnel')}>
          Model funnel
        </Button>
      </Card>
      <div className="dashboard-grid-actions">
        <Card className="action-centre">
          <CardHeader
            title="Prioritised action centre"
            subtitle="Rules-based insights from imported metrics and explicit planning assumptions"
            action={<Badge tone="dark">{data.actions.length} actions</Badge>}
          />
          {data.actions.length ? (
            <div className="action-list">
              {data.actions.map((a: any, i: number) => (
                <button key={i} onClick={() => setAction(a)}>
                  <span className={`priority priority-${a.priority}`}>{a.priority}</span>
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.action}</p>
                    <small>
                      {a.studio} · {a.period}
                    </small>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No rule-based alerts"
              text="No configured alert thresholds were triggered for this period. Review the studio table for context."
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Offer learning" subtitle="Observed attributed performance · not proven lift" />
          <Tabs
            value={offerTab}
            onChange={setOfferTab}
            items={[
              { id: 'top', label: 'Highest revenue' },
              { id: 'poor', label: 'Discount exposure' },
            ]}
          />
          <div className="compact-offer-list">
            {(offerTab === 'top' ? data.topOffers : data.poorOffers).slice(0, 5).map((o: any) => (
              <button key={o.id} onClick={() => navigate(`/offers?q=${encodeURIComponent(o.name)}`)}>
                <div>
                  <strong>{o.name}</strong>
                  <span>
                    {o.studio || 'All studios'} · {number(o.actual_redemptions)} redemptions
                  </span>
                </div>
                <div>
                  <strong>{money(o.actual_revenue, true)}</strong>
                  <span>{percent(o.effective_discount)} discount</span>
                </div>
              </button>
            ))}
            {!(offerTab === 'top' ? data.topOffers : data.poorOffers).length && (
              <EmptyState
                title="No matching promotion history"
                text="This filter does not have enough imported offer performance."
              />
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/performance')}>
            Open learning loop <ArrowRight size={14} />
          </Button>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="Studio performance comparison"
          subtitle={`${MONTHS[selectedActualMonth - 1]} ${year} · select a studio to drill down`}
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>
              Export view
            </Button>
          }
        />
        <div className="table-filters">
          <input placeholder="Filter by city or status using selectors" disabled className="sr-only" />
          <Select value={city} onChange={e => setCity(e.target.value)}>
            <option value="all">All cities</option>
            {[...new Set(data.rows.map((r: any) => r.studio.city))].map((c: any) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All performance statuses</option>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="below_target">Below target</option>
            <option value="unplanned">Unplanned</option>
          </Select>
          <Select value={campaign} onChange={e => setCampaign(e.target.value)}>
            <option value="all">All campaigns</option>
            {campaignData?.rows.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <span className="filter-result">{rows.length} studios</span>
        </div>
        <TableScroll>
          <table className="data-table studio-table">
            <thead>
              <tr>
                <th>Studio</th>
                <th className="num">Monthly target</th>
                <th className="num">Actual revenue</th>
                <th>Achievement</th>
                <th className="num">YoY</th>
                <th className="num">New-client</th>
                <th className="num">Renewal</th>
                <th className="num">AOV</th>
                <th className="num">Leads</th>
                <th className="num">Trials</th>
                <th className="num">Check-in</th>
                <th className="num">Late cancel</th>
                <th className="num">Trial conv.</th>
                <th className="num">Gap</th>
                <th>Recommended next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.studio.id} onClick={() => navigate(`/studios/${r.studio.id}`)} className="clickable-row">
                  <td>
                    <strong>{r.studio.name}</strong>
                    <span>{r.studio.city}</span>
                  </td>
                  <td className="num">
                    <span>{money(r.target_value, true)}</span>
                    <small>{r.target_basis}</small>
                  </td>
                  <td className="num">
                    <strong>{money(r.actual.revenue, true)}</strong>
                  </td>
                  <td>
                    <div className="achievement-cell">
                      <span>{percent(r.achievement)}</span>
                      <Progress
                        value={r.achievement || 0}
                        tone={r.status === 'on_track' ? 'green' : r.status === 'at_risk' ? 'amber' : 'red'}
                      />
                      <StatusBadge status={r.status} />
                    </div>
                  </td>
                  <td className={`num ${r.yoy > 0 ? 'positive-text' : r.yoy < 0 ? 'negative-text' : ''}`}>
                    {percent(r.yoy)}
                  </td>
                  <td className="num">{money(r.actual.new_client, true)}</td>
                  <td className="num">{money(r.actual.renewal, true)}</td>
                  <td className="num">{money(r.actual.aov)}</td>
                  <td className="num">{number(r.actual.leads)}</td>
                  <td className="num">{number(r.actual.completed_trials)}</td>
                  <td className="num">{percent(r.actual.checkin_rate, 1, true)}</td>
                  <td className="num">{percent(r.actual.late_cancellation_rate, 1, true)}</td>
                  <td className="num">{percent(r.actual.trial_conversion, 1, true)}</td>
                  <td className="num">{money(r.revenue_gap, true)}</td>
                  <td className="action-cell">
                    {r.recommended_action}
                    <ArrowRight size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
      <details className="methodology">
        <summary>Metric definitions, provenance and known data limitations</summary>
        <ul>
          {data.coverage.limitations.map((x: string) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
      {action && (
        <Modal
          title={action.title}
          subtitle={`${action.studio} · ${action.period}`}
          onClose={() => setAction(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setAction(null)}>
                Close
              </Button>
              <Button onClick={() => navigate(`/goal-builder`)}>Build recovery plan</Button>
            </>
          }
        >
          <div className="evidence-grid">
            <div>
              <span>Priority</span>
              <Badge tone={action.priority === 'high' ? 'red' : 'amber'}>{action.priority}</Badge>
            </div>
            <div>
              <span>Expected contribution</span>
              <strong>{money(action.expected_contribution)}</strong>
            </div>
          </div>
          <Callout title="Evidence">{action.evidence}</Callout>
          <h3>Business impact</h3>
          <p>{action.impact}</p>
          <h3>Recommended action</h3>
          <p>{action.action}</p>
          <p className="data-note">
            Recommendations use the displayed evidence. Expected contribution is a planning opportunity, not guaranteed
            incremental revenue.
          </p>
        </Modal>
      )}
    </div>
  );
}
async function apiDashboard(year: number, month: number, studioId: number | null) {
  const { api } = await import('../api');
  return api(`/dashboard?year=${year}&month=${month}${studioId ? `&studio=${studioId}` : ''}`);
}
