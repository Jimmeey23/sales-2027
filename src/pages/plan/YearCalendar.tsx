import React, { useMemo, useState } from 'react';
import { CheckCircle2, Gift, Layers, PartyPopper, TrendingUp } from 'lucide-react';
import '../../styles/yearcal.css';
import { MONTHS, MONTHS_SHORT, number } from '../../types';
import { LOCATION_COLORS, accentFor } from '../../data/locations';
import { coverPhotoFor } from '../../data/pagePhotos';
import { KEY_DATE_LABELS, formatKeyDate, keyDatesFor, type KeyDateKind } from '../../data/keyDates';
import FestivalArt from '../../components/FestivalArt';
import { useApp } from '../../App';
import { lakh, type MonthRow, type PlanData } from './usePlanData';
import { selectedForPlan, selectedInMonth } from './TargetsTab';

const KIND_COLOR: Record<KeyDateKind, string> = {
  festival: '#b07a2e',
  holiday: '#3f8f73',
  awareness: '#3886b2',
  global: '#25776c',
  retail: '#b23859',
  brand: '#6f5a86',
};
const STREAMS = [
  { key: 'newClient', label: 'New clients', shade: 1 },
  { key: 'renewal', label: 'Renewals', shade: 0.66 },
  { key: 'reactivation', label: 'Reactivation', shade: 0.4 },
  { key: 'other', label: 'Other', shade: 0.2 },
] as const;
const LAYERS = [
  { id: 'revenue', label: 'Revenue mix', icon: Layers },
  { id: 'offers', label: 'Offers', icon: Gift },
  { id: 'moments', label: 'Moments', icon: PartyPopper },
] as const;
type Layer = (typeof LAYERS)[number]['id'];
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* A season curve is easier to read than twelve columns: the year's shape shows in the
   line, and each month still carries its own dot and hit area for hover and click. */
function curve(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ${p2.x - (p3.x - p1.x) / 6} ${
      p2.y - (p3.y - p1.y) / 6
    }, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Whole-year infographic: a seasonality ribbon over twelve month tiles that switch between revenue, offers and moments.
export default function YearCalendar({ data, onOpen }: { data: PlanData; onOpen: (month: number) => void }) {
  const { year } = useApp();
  const [scope, setScope] = useState<number | 'all'>('all');
  const [layer, setLayer] = useState<Layer>('revenue');
  const [hot, setHot] = useState<number | null>(null);

  const plan = scope === 'all' ? null : data.plans.find(p => p.studio.id === scope) || null;
  const months: MonthRow[] = plan ? plan.months : data.months;
  const annual = plan ? plan.annual : data.annual;
  const lastYear = plan ? plan.lastYear : data.lastYear;
  const accent = plan
    ? accentFor(plan.studio.name)
    : accentFor(data.plans.length === 1 ? data.plans[0].studio.name : undefined);
  const offersOf = (m: number) => (plan ? selectedForPlan(data, plan, m) : selectedInMonth(data, m));

  const view = useMemo(() => {
    const max = Math.max(...months.map(m => m.target), 1);
    const peak = months.reduce((a, b) => (b.target > a.target ? b : a), months[0]);
    const low = months.reduce((a, b) => (b.target < a.target ? b : a), months[0]);
    return { max, peak, low };
  }, [months]);
  const offerCount = months.reduce((s, m) => s + offersOf(m.month).length, 0);
  const momentCount = months.reduce((s, m) => s + keyDatesFor(year, m.month).length, 0);
  const approvedCount = months.filter(m => m.planApproved).length;
  const growth = lastYear ? annual / lastYear - 1 : null;

  const W = 720,
    H = 96,
    step = W / 12;
  return (
    <section className="yc" style={{ '--a1': accent } as React.CSSProperties}>
      <header className="yc-top">
        <div className="yc-scope" role="tablist" aria-label="Location">
          {data.plans.length > 1 && (
            <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>
              All locations
            </button>
          )}
          {data.plans.map(p => (
            <button
              key={p.studio.id}
              role="tab"
              aria-selected={scope === p.studio.id || (data.plans.length === 1 && scope === 'all')}
              className={scope === p.studio.id || (data.plans.length === 1 && scope === 'all') ? 'on' : ''}
              onClick={() => setScope(data.plans.length === 1 ? 'all' : p.studio.id)}
            >
              <i style={{ background: LOCATION_COLORS[p.studio.name] }} />
              {p.studio.name}
            </button>
          ))}
        </div>
        <div className="yc-layers" role="group" aria-label="Calendar layer">
          {LAYERS.map(l => {
            const Icon = l.icon;
            return (
              <button
                key={l.id}
                className={layer === l.id ? 'on' : ''}
                aria-pressed={layer === l.id}
                onClick={() => setLayer(l.id)}
              >
                <Icon size={14} />
                {l.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="yc-hero">
        <div className="yc-kpis">
          <div>
            <small>{year} target</small>
            <strong>{lakh(annual)}</strong>
            <span className={growth !== null && growth < 0 ? 'neg' : 'pos'}>
              <TrendingUp size={13} />
              {growth === null
                ? 'No prior year'
                : `${growth >= 0 ? '+' : ''}${Math.round(growth * 100)}% vs ${lakh(lastYear)}`}
            </span>
          </div>
          <div>
            <small>Peak month</small>
            <strong>{MONTHS[view.peak.month - 1]}</strong>
            <span>{lakh(view.peak.target)}</span>
          </div>
          <div>
            <small>Quietest</small>
            <strong>{MONTHS[view.low.month - 1]}</strong>
            <span>{lakh(view.low.target)}</span>
          </div>
          <div>
            <small>Offers planned</small>
            <strong>{number(offerCount)}</strong>
            <span>{momentCount} calendar moments</span>
          </div>
          <div>
            <small>Months approved</small>
            <strong>{approvedCount}/12</strong>
            <span>{12 - approvedCount} still open</span>
          </div>
        </div>
        <svg className="yc-ribbon" viewBox={`0 0 ${W} ${H + 20}`} role="group" aria-label="Monthly target seasonality">
          <defs>
            <linearGradient id="yc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--a1)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--a1)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="yc-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--a1)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--a1)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map(g => (
            <line key={g} x1="0" x2={W} y1={H - (H - 6) * g} y2={H - (H - 6) * g} className="yc-grid" />
          ))}
          {[1, 2, 3].map(q => (
            <line key={q} x1={q * step * 3} x2={q * step * 3} y1="4" y2={H} className="yc-quarter" />
          ))}
          {(() => {
            const pts = months.map((m, i) => ({
              x: i * step + step / 2,
              y: H - Math.max(7, (m.target / view.max) * (H - 18)),
            }));
            const line = curve(pts);
            return (
              <>
                <path
                  d={`${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`}
                  className="yc-area"
                  fill="url(#yc-area)"
                />
                <path d={line} className="yc-curve" stroke="url(#yc-stroke)" />
                {months.map((m, i) => (
                  <g key={m.month}>
                    <circle
                      cx={pts[i].x}
                      cy={pts[i].y}
                      r={hot === m.month ? 6 : 3.6}
                      className={`yc-dot ${hot === m.month ? 'hot' : ''} ${m.planApproved ? 'done' : ''}`}
                    />
                    {m.month === view.peak.month && hot !== m.month && (
                      <text x={pts[i].x} y={pts[i].y - 12} textAnchor="middle" className="yc-peak">
                        {lakh(m.target)}
                      </text>
                    )}
                  </g>
                ))}
                {hot !== null && (
                  <text
                    x={Math.min(W - 40, Math.max(40, pts[hot - 1].x))}
                    y={Math.max(16, pts[hot - 1].y - 14)}
                    textAnchor="middle"
                    className="yc-tip"
                  >
                    {MONTHS_SHORT[hot - 1]} · {lakh(months[hot - 1].target)}
                  </text>
                )}
              </>
            );
          })()}
          {months.map((m, i) => (
            <g
              key={m.month}
              className="yc-hitcol"
              role="button"
              tabIndex={0}
              aria-label={`Open ${MONTHS[m.month - 1]} plan, target ${lakh(m.target)}`}
              onMouseEnter={() => setHot(m.month)}
              onMouseLeave={() => setHot(null)}
              onFocus={() => setHot(m.month)}
              onBlur={() => setHot(null)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen(m.month);
                }
              }}
              onClick={() => onOpen(m.month)}
            >
              <rect x={i * step} y="0" width={step} height={H + 20} fill="transparent" />
              <text
                x={i * step + step / 2}
                y={H + 14}
                textAnchor="middle"
                className={`yc-lab ${hot === m.month ? 'hot' : ''}`}
              >
                {MONTHS_SHORT[m.month - 1]}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="yc-grid-tiles">
        {months.map(m => {
          const days = new Date(year, m.month, 0).getDate();
          const dates = keyDatesFor(year, m.month);
          const offers = offersOf(m.month);
          const share = annual ? m.target / annual : 0;
          const yoy = m.lastYear ? m.target / m.lastYear - 1 : null;
          const total = Math.max(
            1,
            STREAMS.reduce((s, x) => s + n((m as any)[x.key]), 0),
          );
          const R = 22,
            C = 2 * Math.PI * R;
          return (
            <button
              key={m.month}
              type="button"
              className={`yc-tile q${Math.ceil(m.month / 3)} ${m.planApproved ? 'is-approved' : ''} ${hot === m.month ? 'hot' : ''}`}
              onMouseEnter={() => setHot(m.month)}
              onMouseLeave={() => setHot(null)}
              onFocus={() => setHot(m.month)}
              onBlur={() => setHot(null)}
              onClick={() => onOpen(m.month)}
              aria-label={`Open ${MONTHS[m.month - 1]} plan`}
            >
              {(() => {
                const ph = coverPhotoFor(m.month);
                return (
                  <span
                    className="yc-band"
                    style={{ backgroundImage: `url(${ph.url})`, backgroundPosition: ph.pos }}
                    aria-hidden="true"
                  >
                    <em className="yc-q">Q{Math.ceil(m.month / 3)}</em>
                    <span className="yc-name">{MONTHS[m.month - 1]}</span>
                  </span>
                );
              })()}
              <div className="yc-head">
                <div>
                  <p>{m.theme || m.objective || '—'}</p>
                </div>
                <div className="yc-ring" aria-hidden="true">
                  <svg viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r={R} className="yc-ring-bg" />
                    <circle
                      cx="28"
                      cy="28"
                      r={R}
                      className="yc-ring-fg"
                      strokeDasharray={`${Math.min(1, share * 4) * C} ${C}`}
                      transform="rotate(-90 28 28)"
                    />
                  </svg>
                  <b>{(share * 100).toFixed(0)}%</b>
                </div>
              </div>

              <div className="yc-money">
                <strong>{lakh(m.target)}</strong>
                {yoy !== null && (
                  <em className={yoy < 0 ? 'neg' : 'pos'}>{`${yoy >= 0 ? '+' : ''}${Math.round(yoy * 100)}%`}</em>
                )}
                {m.planApproved && (
                  <span className="yc-done">
                    <CheckCircle2 size={12} /> Approved
                  </span>
                )}
              </div>

              <div className="yc-days" aria-hidden="true">
                <i />
                {dates.map((d, i) => {
                  const left = ((d.day - 1) / Math.max(1, days - 1)) * 100;
                  const width = d.end ? ((d.end - d.day) / Math.max(1, days - 1)) * 100 : 0;
                  return d.end ? (
                    <b
                      key={i}
                      className="span"
                      style={{ left: `${left}%`, width: `${width}%`, background: KIND_COLOR[d.kind] }}
                      title={d.name}
                    />
                  ) : (
                    <b
                      key={i}
                      style={{ left: `${left}%`, background: KIND_COLOR[d.kind] }}
                      title={`${d.day} ${MONTHS_SHORT[m.month - 1]} · ${d.name}`}
                    />
                  );
                })}
              </div>

              <div className="yc-body">
                {layer === 'revenue' && (
                  <>
                    <div className="yc-mix" aria-hidden="true">
                      {STREAMS.map(s => (
                        <i
                          key={s.key}
                          style={{
                            width: `${(n((m as any)[s.key]) / total) * 100}%`,
                            background: `color-mix(in srgb, var(--a1) ${s.shade * 100}%, #fff)`,
                          }}
                        />
                      ))}
                    </div>
                    <ul className="yc-stats">
                      <li>
                        <b>{number(m.leads)}</b> leads
                      </li>
                      <li>
                        <b>{number(m.buyers)}</b> members
                      </li>
                      <li>
                        <b>{number(m.renewalPurchases)}</b> renewals
                      </li>
                      <li>
                        <b>{number(m.reactivated)}</b> returning
                      </li>
                    </ul>
                  </>
                )}
                {layer === 'offers' && (
                  <ul className="yc-offers">
                    {offers.slice(0, 4).map(o => (
                      <li key={o.id} className={o.approval_status === 'approved' ? 'ok' : ''}>
                        <span>{o.name}</span>
                        <b>{lakh(n(o.expected_revenue))}</b>
                      </li>
                    ))}
                    {!offers.length && <li className="none">No offers picked yet</li>}
                    {offers.length > 4 && <li className="more">+{offers.length - 4} more</li>}
                  </ul>
                )}
                {layer === 'moments' && (
                  <ul className="yc-moments">
                    {dates.slice(0, 4).map((d, i) => (
                      <li key={i}>
                        <FestivalArt name={d.name} kind={d.kind} className="yc-thumb" />
                        <span>
                          <b>{d.name}</b>
                          <small>
                            {formatKeyDate(d)} {MONTHS_SHORT[m.month - 1]} · {KEY_DATE_LABELS[d.kind]}
                          </small>
                        </span>
                      </li>
                    ))}
                    {!dates.length && <li className="none">No calendar moments</li>}
                  </ul>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <footer className="yc-legend">
        {layer === 'revenue'
          ? STREAMS.map(s => (
              <span key={s.key}>
                <i style={{ background: `color-mix(in srgb, var(--a1) ${s.shade * 100}%, #fff)` }} />
                {s.label}
              </span>
            ))
          : (Object.keys(KIND_COLOR) as KeyDateKind[]).map(k => (
              <span key={k}>
                <i style={{ background: KIND_COLOR[k] }} />
                {KEY_DATE_LABELS[k]}
              </span>
            ))}
        <em>Day strip: markers show where festivals and moments fall in each month. Click a month to open its plan.</em>
      </footer>
    </section>
  );
}
