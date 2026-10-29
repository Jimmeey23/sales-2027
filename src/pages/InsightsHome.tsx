import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Building2, CheckCircle2, MapPin, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../App';
import { useLoad } from '../hooks';
import { LOCATION_COLORS, accentFor } from '../data/locations';
import { money, number, percent } from '../types';
import { Badge, Button, Callout, Card, CardHeader, ErrorState, Loading, Metric, TableScroll } from '../components/ui';
import PageHeader from '../components/PageHeader';

export default function InsightsHome() {
  const { studioId, setStudioId, year } = useApp();
  const navigate = useNavigate();
  const [cityFilter, setCityFilter] = useState<'all' | 'Mumbai' | 'Bengaluru'>('all');
  const [showSubVenues, setShowSubVenues] = useState(false);
  const [evidenceYear, setEvidenceYear] = useState<number>(Math.min(year, 2026));

  const { data, loading, error, reload } = useLoad<any>(
    () => api(`/studios-overview?year=${evidenceYear}`),
    [evidenceYear],
  );

  const visibleStudios = useMemo(() => {
    const list: any[] = data?.studios || [];
    return list.filter(item => {
      if (!showSubVenues && item.isChildVenue) return false;
      if (cityFilter !== 'all' && item.studio.city !== cityFilter) return false;
      return true;
    });
  }, [data, cityFilter, showSubVenues]);

  const chartRows = useMemo(
    () =>
      visibleStudios.map(item => ({
        name: item.studio.name,
        prior2025: item.priorCompleteRevenue,
        annualized2026: item.annualized2026,
        target2027: item.target2027,
      })),
    [visibleStudios],
  );

  if (studioId) return <Navigate to={`/studios/${studioId}`} replace />;
  if (loading && !data) return <Loading label="Consolidating cross-studio historical intelligence…" />;
  if (error && !data) return <ErrorState message={error} retry={() => reload().catch(() => {})} />;
  if (!data) return null;

  const p = data.portfolio;
  const openStudio = (id: number) => {
    setStudioId(id);
    navigate(`/studios/${id}`);
  };

  return (
    <div className="insights-hub">
      <PageHeader
        eyebrow="HISTORICAL EVIDENCE & COMMERCIAL BENCHMARKS"
        title="Studio Intelligence Hub"
        description={
          <>
            Complete-period sales, cohort conversion, attendance discipline and 2027 commercial bridges across{' '}
            <strong>{p.studioCount} operating studio groups</strong> (complete sales evidence through{' '}
            <strong>{data.throughCompleteMonth}</strong>).
          </>
        }
        meta={
          <>
            <Badge tone="green">Complete actuals through {data.throughCompleteMonth}</Badge>
            <Badge tone="blue">{number(p.checkinsCount)} observed check-ins</Badge>
            <Badge tone="amber">2027 plan targets bridged</Badge>
          </>
        }
        actions={
          <div className="filter-row">
            <div className="ws-segmented" role="group" aria-label="Historical evidence year">
              {[2026, 2025].map(yr => (
                <button
                  key={yr}
                  type="button"
                  className={evidenceYear === yr ? 'active' : ''}
                  onClick={() => setEvidenceYear(yr)}
                >
                  {yr} actuals
                </button>
              ))}
            </div>
            <Button variant="secondary" onClick={() => navigate('/sales-plan/targets')}>
              Open 2027 Plan <ArrowRight size={15} />
            </Button>
          </div>
        }
      />

      {year > 2026 && (
        <Callout
          tone="info"
          title={`Showing ${data.actualYear} historical actuals alongside the 2027 commercial bridge`}
        >
          Planning year {year} has no completed sales actuals yet. Historical conversion, attendance, and revenue
          benchmarks below reflect audited {data.actualYear} cohorts through {data.throughCompleteMonth}, paired with
          each studio&apos;s 2027 target step-up.
        </Callout>
      )}

      <Card className="kpi-primary">
        <div className="kpi-grid four">
          <Metric
            label={`${data.actualYear} complete-period revenue`}
            value={money(p.completeRevenue, true)}
            detail={
              p.yoyCompletePct !== null
                ? `${p.yoyCompletePct >= 0 ? '+' : ''}${p.yoyCompletePct.toFixed(1)}% vs prior-year complete period (${money(p.priorCompleteRevenue, true)})`
                : `Through ${data.throughCompleteMonth}`
            }
          />
          <Metric
            label="2026 annualised → 2027 target"
            value={`${money(p.annualized2026, true)} → ${money(p.target2027, true)}`}
            detail={
              p.growthTo2027Pct !== null
                ? `+${p.growthTo2027Pct.toFixed(1)}% planned expansion (+${money(p.bridgeDelta, true)})`
                : 'Full-year commercial bridge'
            }
          />
          <Metric
            label="Discount exposure & margin pool"
            value={percent(p.effectiveDiscountRate * 100, 1)}
            detail={`${money(p.recoverableMarginAt10PctCap, true)}/yr recoverable at a 10% discount ceiling`}
          />
          <Metric
            label="Upcoming renewal pipeline"
            value={`${number(p.dueNextMonthPackages)} due`}
            detail={`${money(p.dueNextMonthValue, true)} paid value expiring next month`}
          />
        </div>
      </Card>

      <div className="ws-toolbar" style={{ marginTop: 18, marginBottom: 14 }}>
        <div>
          <h2>Location evidence scorecards</h2>
          <p>
            Select any studio to inspect monthly cohorts, product concentration, check-in patterns, and the 2027 plan
            simulator.
          </p>
        </div>
        <div className="filter-row">
          <div className="ws-segmented" role="tablist" aria-label="Filter by city">
            {(['all', 'Mumbai', 'Bengaluru'] as const).map(city => (
              <button
                key={city}
                type="button"
                className={cityFilter === city ? 'active' : ''}
                onClick={() => setCityFilter(city)}
              >
                {city === 'all' ? 'All cities' : city}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`ws-export-btn ${showSubVenues ? 'is-on' : ''}`}
            onClick={() => setShowSubVenues(v => !v)}
          >
            <Building2 size={14} />
            <span>{showSubVenues ? 'Hide Pop-up venues' : 'Show Pop-up venues'}</span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 22,
        }}
      >
        {visibleStudios.map(item => {
          const color = LOCATION_COLORS[item.studio.name] || accentFor(item.studio.name);
          return (
            <Card key={item.studio.id} className="studio-intel-card" style={{ '--loc': color } as React.CSSProperties}>
              <div className="sic-head">
                <div>
                  <p className="sic-eyebrow">
                    <MapPin size={11} /> {item.studio.city}
                    {item.isRollup && <span className="sic-tag">Consolidated</span>}
                    {item.isChildVenue && <span className="sic-tag">Pop-up venue</span>}
                  </p>
                  <h3>{item.studio.name}</h3>
                </div>
                {item.yoyCompletePct !== null && (
                  <Badge tone={item.yoyCompletePct >= 0 ? 'green' : 'amber'}>
                    {item.yoyCompletePct >= 0 ? '+' : ''}
                    {item.yoyCompletePct.toFixed(1)}% YoY
                  </Badge>
                )}
              </div>

              <div className="sic-figures">
                <div>
                  <span>{data.actualYear} year to date</span>
                  <strong>{money(item.ytdRevenue, true)}</strong>
                  <small>{money(item.completeRevenue, true)} complete (Jan–Sep)</small>
                </div>
                <div>
                  <span>2027 plan target</span>
                  <strong>{money(item.target2027, true)}</strong>
                  <small>
                    {item.growthTo2027Pct !== null
                      ? `${item.growthTo2027Pct >= 0 ? '+' : ''}${item.growthTo2027Pct.toFixed(1)}% vs 2026 pace`
                      : 'Annual target'}
                  </small>
                </div>
              </div>

              <div className="sic-stats">
                <div>
                  <span>Trial → buy</span>
                  <strong>{percent(item.trialToPurchaseRate, 1, true)}</strong>
                </div>
                <div>
                  <span>Check-in rate</span>
                  <strong>{percent(item.checkinRate, 1, true)}</strong>
                </div>
                <div>
                  <span>Avg ticket</span>
                  <strong>{item.aov ? money(item.aov, true) : '—'}</strong>
                </div>
              </div>

              {item.topProduct && (
                <p className="sic-note">
                  <Sparkles size={12} />
                  <span>
                    <strong>Top revenue driver:</strong> {item.topProduct.name} ({money(item.topProduct.revenue, true)}
                    {item.topProduct.share !== null ? ` · ${item.topProduct.share}% share` : ''})
                  </span>
                </p>
              )}

              {item.priority2027 && (
                <p className="sic-note">
                  <Target size={12} />
                  <span>{item.priority2027}</span>
                </p>
              )}

              <div className="sic-foot">
                <div className="sic-badges">
                  <Badge tone="green">
                    {item.feasibility.comfortableMonths + item.feasibility.balancedMonths}m on-pace
                  </Badge>
                  {item.feasibility.stretchMonths > 0 && (
                    <Badge tone="amber">{item.feasibility.stretchMonths}m stretch</Badge>
                  )}
                </div>
                <Button size="sm" variant="secondary" onClick={() => openStudio(item.studio.id)}>
                  Explore evidence <ArrowRight size={13} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="dashboard-grid-main">
        <Card>
          <CardHeader
            title="Commercial bridge by location"
            subtitle={`Comparing ${data.actualYear - 1} complete period, ${data.actualYear} annualised pace, and 2027 annual target`}
          />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={chartRows} barGap={6}>
                <CartesianGrid stroke="#e7e0db" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Legend />
                <Bar
                  dataKey="prior2025"
                  name={`${data.actualYear - 1} complete`}
                  fill="#d9ccc2"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="annualized2026" name="2026 annualised pace" fill="#a96935" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target2027" name="2027 plan target" fill="#245f57" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Portfolio commercial opportunities"
            subtitle="Cross-studio levers surfaced directly from historical cohorts"
          />
          <div className="stack-list">
            <div className="finding-card">
              <div className="finding-head">
                <Badge tone="amber">margin</Badge>
                <strong>Discount ceiling discipline</strong>
              </div>
              <p>
                Portfolio discount exposure stands at <strong>{percent(p.effectiveDiscountRate * 100, 1)}</strong> (
                {money(p.discountCost, true)} recorded). Replacing deep renewal percentage codes with bonus classes or
                freeze extensions recovers up to <strong>{money(p.recoverableMarginAt10PctCap, true)}/yr</strong>.
              </p>
            </div>
            <div className="finding-card">
              <div className="finding-head">
                <Badge tone="blue">retention</Badge>
                <strong>Expiring membership pipeline</strong>
              </div>
              <p>
                <strong>{number(p.dueNextMonthPackages)} active memberships</strong> ({money(p.dueNextMonthValue, true)}{' '}
                paid value) reach expiry next month — pre-expiry T-14 outreach protects Q1 renewal baselines.
              </p>
            </div>
            <div className="finding-card">
              <div className="finding-head">
                <Badge tone="green">growth bridge</Badge>
                <strong>2026 → 2027 expansion (+{money(p.bridgeDelta, true)})</strong>
              </div>
              <p>
                Portfolio 2027 target of <strong>{money(p.target2027, true)}</strong> represents{' '}
                <strong>{p.growthTo2027Pct !== null ? `+${p.growthTo2027Pct.toFixed(1)}%` : 'planned growth'}</strong>{' '}
                over the 2026 annualised run-rate ({money(p.annualized2026, true)}).
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 18 }}>
        <CardHeader
          title="Cross-studio benchmark register"
          subtitle="Side-by-side conversion, attendance, ticket, discount and 2027 target benchmarks"
        />
        <TableScroll>
          <table className="data-table">
            <thead>
              <tr>
                <th>Location</th>
                <th className="num">Complete {data.actualYear}</th>
                <th className="num">YoY</th>
                <th className="num">1st-visit ticket</th>
                <th className="num">Trial → buy</th>
                <th className="num">Check-in %</th>
                <th className="num">Late cancel %</th>
                <th className="num">Discount %</th>
                <th className="num">2027 Target</th>
                <th className="num">2027 vs 2026</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleStudios.map(item => (
                <tr key={item.studio.id} className="clickable-row" onClick={() => openStudio(item.studio.id)}>
                  <td>
                    <strong>{item.studio.name}</strong>
                    <span>{item.studio.city}</span>
                  </td>
                  <td className="num">{money(item.completeRevenue, true)}</td>
                  <td
                    className={`num ${
                      item.yoyCompletePct !== null && item.yoyCompletePct >= 0 ? 'positive-text' : 'negative-text'
                    }`}
                  >
                    {item.yoyCompletePct !== null
                      ? `${item.yoyCompletePct >= 0 ? '+' : ''}${item.yoyCompletePct.toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="num">{item.firstPurchaseAov ? money(item.firstPurchaseAov, true) : '—'}</td>
                  <td className="num">{percent(item.trialToPurchaseRate, 1, true)}</td>
                  <td className="num">{percent(item.checkinRate, 1, true)}</td>
                  <td className="num">{percent(item.lateCancellationRate, 1, true)}</td>
                  <td className="num">{percent(item.discountRate * 100, 1)}</td>
                  <td className="num">
                    <strong>{money(item.target2027, true)}</strong>
                  </td>
                  <td className="num">
                    {item.growthTo2027Pct !== null
                      ? `${item.growthTo2027Pct >= 0 ? '+' : ''}${item.growthTo2027Pct.toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="num">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation();
                        openStudio(item.studio.id);
                      }}
                    >
                      Open <ArrowRight size={13} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Card>
    </div>
  );
}
