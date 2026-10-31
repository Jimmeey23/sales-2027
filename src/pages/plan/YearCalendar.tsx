import React, { useMemo, useState } from 'react';
import { CalendarPlus, Check, Copy, Gift, PartyPopper, QrCode, Sparkles } from 'lucide-react';
import '../../styles/year-board.css';
import { MONTHS, number } from '../../types';
import { LOCATION_COLORS, accentFor, softFor } from '../../data/locations';
import { KEY_DATE_LABELS, keyDatesFor, type KeyDate } from '../../data/keyDates';
import { useApp } from '../../App';
import { useLoad } from '../../hooks';
import { api } from '../../api';
import { lakh, type MonthRow, type PlanData } from './usePlanData';
import { selectedForPlan, selectedInMonth } from './TargetsTab';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KIND_COLOR: Record<string, string> = {
  festival: '#b07a2e',
  holiday: '#3f8f73',
  awareness: '#3886b2',
  global: '#25776c',
  retail: '#b23859',
  brand: '#6f5a86',
};
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
// A month is drawn as a real wall-calendar grid: blank cells for the days before the
// 1st, a cell per day, and a dot on every day that carries a festival or moment.
const calendarCells = (year: number, month: number, moments: KeyDate[]) => {
  const first = new Date(year, month - 1, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month, 0).getDate();
  const marked = new Map<number, KeyDate[]>();
  for (const m of moments) {
    for (let d = m.day; d <= (m.end || m.day); d++) {
      const list = marked.get(d) || [];
      list.push(m);
      marked.set(d, list);
    }
  }
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => ({ day: i + 1, moments: marked.get(i + 1) || [] })),
  ];
};

export default function YearCalendar({ data, onOpen }: { data: PlanData; onOpen: (month: number) => void }) {
  const { year, studioId } = useApp();
  const [scope, setScope] = useState<number | 'all'>('all');
  const [copied, setCopied] = useState(false);

  const plan = scope === 'all' ? null : data.plans.find(p => p.studio.id === scope) || null;
  const months: MonthRow[] = plan ? plan.months : data.months;
  const annual = plan ? plan.annual : data.annual;
  const accent = plan ? accentFor(plan.studio.name) : accentFor(data.plans.length === 1 ? data.plans[0].studio.name : undefined);
  const offersOf = (m: number) => (plan ? selectedForPlan(data, plan, m) : selectedInMonth(data, m));

  // All four locations, or the one on screen: the share link follows what is displayed.
  const feedStudio = plan ? plan.studio.id : studioId && data.plans.length === 1 ? studioId : null;
  const share = useLoad<any>(() => api(`/calendar/share?year=${year}${feedStudio ? `&studio=${feedStudio}` : ''}`), [
    year,
    feedStudio,
    data.plans.length,
  ]);

  const totals = useMemo(() => {
    const offers = months.reduce((s, m) => s + offersOf(m.month).length, 0);
    const moments = months.reduce((s, m) => s + keyDatesFor(year, m.month).length, 0);
    return { offers, moments, approved: months.filter(m => m.planApproved).length };
  }, [months, plan]);

  const copyLink = async () => {
    if (!share.data?.addUrl) return;
    try {
      await navigator.clipboard.writeText(share.data.addUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard is unavailable over plain http; the link is shown below anyway. */
    }
  };

  return (
    <section className="yb" style={{ '--a1': accent } as React.CSSProperties}>
      <header className="yb-head">
        <div className="yb-head-main">
          <div className="yb-scope" role="tablist" aria-label="Location">
            {data.plans.length > 1 && (
              <button
                role="tab"
                aria-selected={scope === 'all'}
                className={scope === 'all' ? 'on' : ''}
                onClick={() => setScope('all')}
              >
                <i style={{ background: 'linear-gradient(90deg,#0d6b58 0 25%,#28489b 0 50%,#9b2c58 0 75%,#8d5a12 0)' }} />
                All four
              </button>
            )}
            {data.plans.map(p => {
              const on = scope === p.studio.id || (data.plans.length === 1 && scope === 'all');
              return (
                <button
                  key={p.studio.id}
                  role="tab"
                  aria-selected={on}
                  className={on ? 'on' : ''}
                  onClick={() => setScope(data.plans.length === 1 ? 'all' : p.studio.id)}
                >
                  <i style={{ background: LOCATION_COLORS[p.studio.name] || accent }} />
                  {p.studio.name}
                </button>
              );
            })}
          </div>
          <p className="yb-lede">
            {plan ? `${plan.studio.name} · ` : 'Every location · '}
            <strong>{lakh(annual)}</strong> across {totals.offers} offers, {totals.moments} studio moments and{' '}
            {totals.approved}/12 approved months. Click any month to open it.
          </p>
        </div>

        {/* The QR is the delivery mechanism, so it sits in the page rather than behind a menu. */}
        <aside className="yb-qr" aria-label="Add the plan to a phone calendar">
          <div className="yb-qr-code">
            {share.data?.qr ? (
              <img src={share.data.qr} alt="QR code that opens the plan’s calendar subscription" width={118} height={118} />
            ) : (
              <span className="yb-qr-skeleton">
                <QrCode size={26} />
              </span>
            )}
          </div>
          <div className="yb-qr-copy">
            <span className="yb-qr-eyebrow">
              <CalendarPlus size={12} /> Add to calendar
            </span>
            <strong>Scan to import every event</strong>
            <small>
              {share.data
                ? `${share.data.counts.offers} offers · ${share.data.counts.campaigns} campaigns · ${share.data.counts.moments} moments`
                : 'Building the feed…'}
            </small>
            <div className="yb-qr-links">
              <a href={share.data?.addUrl || '#'} target="_blank" rel="noopener noreferrer">
                Open link
              </a>
              <button type="button" onClick={copyLink} disabled={!share.data}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </aside>
      </header>

      <div className="yb-legend">
        <span>
          <Gift size={12} /> Offer
        </span>
        <span>
          <Sparkles size={12} /> Campaign
        </span>
        <span>
          <PartyPopper size={12} /> Festival / moment
        </span>
        {!plan && (
          <span className="yb-legend-locations">
            {data.plans.map(p => (
              <em key={p.studio.id} style={{ ['--loc' as string]: LOCATION_COLORS[p.studio.name] }}>
                <i />
                {p.studio.name}
              </em>
            ))}
          </span>
        )}
      </div>

      <div className="yb-grid">
        {months.map(m => {
          const moments = keyDatesFor(year, m.month);
          const offers = offersOf(m.month);
          const cells = calendarCells(year, m.month, moments);
          const shareOfYear = annual ? m.target / annual : 0;
          return (
            <article
              key={m.month}
              className={`yb-month ${m.planApproved ? 'is-approved' : ''}`}
              style={{ ['--loc' as string]: plan ? accent : 'var(--a1)' } as React.CSSProperties}
            >
              <button type="button" className="yb-month-head" onClick={() => onOpen(m.month)}>
                <span className="yb-month-name">
                  {/* The quarter is a fact about the month, not about each month: label
                      the quarter where it starts and leave the rest unlabelled. */}
                  <em>{(m.month - 1) % 3 === 0 ? `Q${Math.ceil(m.month / 3)}` : '\u00a0'}</em>
                  <strong>{MONTHS[m.month - 1]}</strong>
                </span>
                <span className="yb-month-money">
                  <b>{lakh(m.target)}</b>
                  <i>{(shareOfYear * 100).toFixed(0)}% of year</i>
                </span>
              </button>

              {m.theme && <p className="yb-theme">{m.theme}</p>}

              <div className="yb-days" role="grid" aria-label={`${MONTHS[m.month - 1]} calendar`}>
                {WEEKDAYS.map(d => (
                  <span key={d} className="yb-dow" aria-hidden="true">
                    {d[0]}
                  </span>
                ))}
                {cells.map((cell, i) =>
                  cell === null ? (
                    <span key={`pad-${i}`} className="yb-day is-pad" aria-hidden="true" />
                  ) : (
                    <span
                      key={cell.day}
                      className={`yb-day ${cell.moments.length ? 'has-moment' : ''} ${cell.moments.some(x => x.kind === 'festival') ? 'is-festival' : ''}`}
                      title={cell.moments.map(x => `${x.name} · ${KEY_DATE_LABELS[x.kind]}`).join('\n') || undefined}
                    >
                      {cell.day}
                      {cell.moments.length > 0 && (
                        <i style={{ background: KIND_COLOR[cell.moments[0].kind] || 'var(--gold)' }} />
                      )}
                    </span>
                  ),
                )}
              </div>

              <ul className="yb-offers">
                {offers.map((o: any) => (
                  <li key={o.id}>
                    <i style={{ background: plan ? accent : LOCATION_COLORS[o.studio] || accent }} />
                    <span>
                      {o.name}
                      {!plan && o.studio && <em>{o.studio}</em>}
                    </span>
                    <b>{o.expected_revenue ? lakh(n(o.expected_revenue)) : '—'}</b>
                  </li>
                ))}
                {!offers.length && <li className="none">No offers picked yet</li>}
              </ul>

              {moments.length > 0 && (
                <p className="yb-moments">
                  {moments.slice(0, 3).map(x => (
                    <span key={x.name} style={{ ['--k' as string]: KIND_COLOR[x.kind] }}>
                      <i />
                      {x.name}
                    </span>
                  ))}
                  {moments.length > 3 && <span className="more">+{moments.length - 3}</span>}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <footer className="yb-foot">
        <span>
          <b>{number(totals.offers)}</b> offers and <b>{number(totals.moments)}</b> moments across the year
        </span>
        <span>
          Target for {year}: <b>{lakh(annual)}</b>
          {plan ? ` · ${plan.studio.name}` : ' · all four locations'}
        </span>
      </footer>
    </section>
  );
}
