import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarPlus, Check, Copy, Gift, PartyPopper, QrCode, Sparkles, X } from 'lucide-react';
import '../../styles/year-board.css';
import { MONTHS, MONTHS_SHORT, number } from '../../types';
import { LOCATION_COLORS, accentFor, locationStudioIds } from '../../data/locations';
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
// The same campaign runs in several locations; the day drawer names it once and lists where.
const groupedCampaigns = (running: any[]) => {
  const byName = new Map<string, any>();
  const dayMonth = (value: string) =>
    /^\d{4}-(\d{2})-(\d{2})$/.test(value)
      ? `${Number(value.slice(8, 10))} ${MONTHS_SHORT[Number(value.slice(5, 7)) - 1]}`
      : '';
  for (const campaign of running) {
    const entry =
      byName.get(campaign.name) ||
      ({
        ...campaign,
        studios: [] as string[],
        range:
          campaign.end_date && campaign.end_date !== campaign.start_date
            ? `${dayMonth(campaign.start_date)} – ${dayMonth(campaign.end_date)}`
            : dayMonth(campaign.start_date || ''),
      } as any);
    if (campaign.studio && !entry.studios.includes(campaign.studio)) entry.studios.push(campaign.studio);
    byName.set(campaign.name, entry);
  }
  return [...byName.values()];
};
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

// A campaign owns every day between its start and end, clipped to the month on screen.
const campaignSpan = (campaign: any, year: number, month: number) => {
  const start = String(campaign.start_date || '');
  if (!start) return null;
  const end = String(campaign.end_date || start);
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  if (!sy || !sm || !sd) return null;
  const monthStart = new Date(year, month - 1, 1).getTime();
  const monthEnd = new Date(year, month, 0, 23, 59).getTime();
  const from = new Date(sy, sm - 1, sd).getTime();
  const to = new Date(ey, em - 1, ed || sd).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < monthStart || from > monthEnd) return null;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: from <= monthStart ? 1 : sd,
    to: to >= monthEnd ? lastDay : ed || sd,
  };
};

export default function YearCalendar({ data, onOpen }: { data: PlanData; onOpen: (month: number) => void }) {
  const { year, studioId, boot } = useApp();
  const [scope, setScope] = useState<number | 'all'>('all');
  const [copied, setCopied] = useState(false);
  // Which layers of the year are drawn. All three are on to begin with — the board looks
  // exactly as it always has until someone asks to see one strand on its own.
  const [layers, setLayers] = useState({ offers: true, campaigns: true, moments: true });
  const [openDay, setOpenDay] = useState<{ month: number; day: number } | null>(null);
  const [hotMonth, setHotMonth] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const plan = scope === 'all' ? null : data.plans.find(p => p.studio.id === scope) || null;
  const months: MonthRow[] = plan ? plan.months : data.months;
  const annual = plan ? plan.annual : data.annual;
  const accent = plan
    ? accentFor(plan.studio.name)
    : accentFor(data.plans.length === 1 ? data.plans[0].studio.name : undefined);
  const offersOf = (m: number) => (plan ? selectedForPlan(data, plan, m) : selectedInMonth(data, m));

  // Campaigns belong to a location, and a location's Pop-up venues share its colour.
  const campaigns = useMemo(() => {
    const scopeStudios = plan ? [plan.studio] : data.plans.map(p => p.studio);
    const ids = new Set(scopeStudios.flatMap(s => locationStudioIds(s, boot.studios)));
    return (data.campaigns || []).filter((c: any) => ids.has(Number(c.studio_id)));
  }, [data.campaigns, data.plans, plan, boot.studios]);

  const campaignDays = useMemo(() => {
    const byMonth = new Map<number, Map<number, any[]>>();
    for (const campaign of campaigns) {
      for (let month = 1; month <= 12; month++) {
        const span = campaignSpan(campaign, year, month);
        if (!span) continue;
        const days = byMonth.get(month) || new Map<number, any[]>();
        for (let day = span.from; day <= span.to; day++) {
          const list = days.get(day) || [];
          list.push(campaign);
          days.set(day, list);
        }
        byMonth.set(month, days);
      }
    }
    return byMonth;
  }, [campaigns, year]);

  // A month often carries a dozen overlapping campaigns, so the grid only ticks the day
  // each one starts. What is *running* on any given day is a question for the day drawer.
  const campaignStarts = useMemo(() => {
    const byMonth = new Map<number, Map<number, any[]>>();
    for (const campaign of campaigns) {
      const start = String(campaign.start_date || '');
      const [y, m, d] = start.split('-').map(Number);
      if (y !== year || !m || !d) continue;
      const days = byMonth.get(m) || new Map<number, any[]>();
      const list = days.get(d) || [];
      list.push(campaign);
      days.set(d, list);
      byMonth.set(m, days);
    }
    return byMonth;
  }, [campaigns, year]);

  const momentsOf = (month: number) => keyDatesFor(year, month);
  const campaignCount = (month: number) => {
    const seen = new Set<any>();
    for (const list of campaignDays.get(month)?.values() || []) for (const c of list) seen.add(c.id);
    return seen.size;
  };

  // All four locations, or the one on screen: the share link follows what is displayed.
  const feedStudio = plan ? plan.studio.id : studioId && data.plans.length === 1 ? studioId : null;
  const share = useLoad<any>(
    () => api(`/calendar/share?year=${year}${feedStudio ? `&studio=${feedStudio}` : ''}`),
    [year, feedStudio, data.plans.length],
  );

  const totals = useMemo(() => {
    const offers = months.reduce((s, m) => s + offersOf(m.month).length, 0);
    const moments = months.reduce((s, m) => s + momentsOf(m.month).length, 0);
    const campaigns = months.reduce((s, m) => s + campaignCount(m.month), 0);
    return { offers, moments, campaigns, approved: months.filter(m => m.planApproved).length };
  }, [months, plan, campaignDays]);

  const peak = Math.max(1, ...months.map(m => m.target));

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

  // Escape closes the day drawer from anywhere on the board.
  useEffect(() => {
    if (!openDay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDay(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDay]);

  useEffect(() => setOpenDay(null), [scope]);

  const jumpTo = (month: number) => {
    const target = boardRef.current?.querySelector(`[data-month="${month}"]`);
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
    setPinned(month);
    window.setTimeout(() => setPinned(current => (current === month ? null : current)), 2200);
  };

  const dayFacts = (month: number, day: number) => ({
    moments: momentsOf(month).filter(m => day >= m.day && day <= (m.end || m.day)),
    campaigns: campaignDays.get(month)?.get(day) || [],
  });

  const ribbonMonth = hotMonth ?? pinned ?? null;
  const ribbonRow = ribbonMonth ? months.find(m => m.month === ribbonMonth) : null;

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
                <i
                  style={{ background: 'linear-gradient(90deg,#0d6b58 0 25%,#28489b 0 50%,#9b2c58 0 75%,#8d5a12 0)' }}
                />
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
              <img
                src={share.data.qr}
                alt="QR code that opens the plan’s calendar subscription"
                width={118}
                height={118}
              />
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

      {/* The year as one strip: every month sized by its share of the target, so the shape
          of the year is readable before any month card. Hover reads the month out, click
          takes you to its card. */}
      <section className="yb-ribbon" aria-label={`${year} at a glance`}>
        <div className="yb-ribbon-head">
          <div className="yb-ribbon-quarters" aria-hidden="true">
            <span>Q1</span>
            <span>Q2</span>
            <span>Q3</span>
            <span>Q4</span>
          </div>
          <p className="yb-ribbon-read" aria-live="polite">
            {ribbonRow ? (
              <>
                <strong>
                  {MONTHS[ribbonRow.month - 1]} {year}
                </strong>
                <span>{lakh(ribbonRow.target)}</span>
                <span>{annual ? `${Math.round((ribbonRow.target / annual) * 100)}% of the year` : '—'}</span>
                <span>{offersOf(ribbonRow.month).length} offers</span>
                <span>{campaignCount(ribbonRow.month)} campaigns</span>
                <span>{momentsOf(ribbonRow.month).length} moments</span>
              </>
            ) : (
              <>
                <strong>{year} at a glance</strong>
                <span>Hover a month to read it out, click to jump to its card</span>
              </>
            )}
          </p>
        </div>
        <div className="yb-ribbon-months">
          {months.map(m => {
            const height = Math.max(6, Math.round((m.target / peak) * 100));
            const on = ribbonMonth === m.month;
            return (
              <button
                key={m.month}
                type="button"
                className={`yb-ribbon-month ${on ? 'on' : ''} ${m.planApproved ? 'is-approved' : ''}`}
                style={{ ['--fill' as string]: `${height}%` } as React.CSSProperties}
                onMouseEnter={() => setHotMonth(m.month)}
                onMouseLeave={() => setHotMonth(current => (current === m.month ? null : current))}
                onFocus={() => setHotMonth(m.month)}
                onBlur={() => setHotMonth(current => (current === m.month ? null : current))}
                onClick={() => jumpTo(m.month)}
                aria-label={`${MONTHS[m.month - 1]} ${year}, ${lakh(m.target)} target. Jump to the month.`}
              >
                <span className="yb-ribbon-bar" aria-hidden="true">
                  <i />
                </span>
                <b>{MONTHS_SHORT[m.month - 1]}</b>
                <em>{lakh(m.target)}</em>
              </button>
            );
          })}
        </div>
      </section>

      <div className="yb-legend">
        {(
          [
            ['offers', Gift, `Offers · ${totals.offers}`, '#0d6b58'],
            ['campaigns', Sparkles, `Campaigns · ${totals.campaigns}`, '#28489b'],
            ['moments', PartyPopper, `Moments · ${totals.moments}`, '#b07a2e'],
          ] as const
        ).map(([key, Icon, label, colour]) => (
          <button
            key={key}
            type="button"
            className={`yb-toggle ${layers[key] ? 'on' : ''}`}
            aria-pressed={layers[key]}
            style={{ ['--k' as string]: colour } as React.CSSProperties}
            onClick={() => setLayers(current => ({ ...current, [key]: !current[key] }))}
            title={`${layers[key] ? 'Hide' : 'Show'} ${key} on the board`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
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

      <div className="yb-grid" ref={boardRef}>
        {months.map(m => {
          const moments = momentsOf(m.month);
          const offers = offersOf(m.month);
          const cells = calendarCells(year, m.month, moments);
          const byDay = campaignDays.get(m.month);
          const shareOfYear = annual ? m.target / annual : 0;
          const isOpen = openDay?.month === m.month;
          const facts = isOpen ? dayFacts(m.month, openDay!.day) : null;
          return (
            <article
              key={m.month}
              data-month={m.month}
              className={`yb-month ${m.planApproved ? 'is-approved' : ''} ${isOpen ? 'is-open' : ''} ${
                pinned === m.month ? 'is-pinned' : ''
              } ${ribbonMonth === m.month ? 'is-hot' : ''}`}
              onMouseEnter={() => setHotMonth(m.month)}
              onMouseLeave={() => setHotMonth(current => (current === m.month ? null : current))}
              style={{ ['--loc' as string]: plan ? accent : 'var(--a1)' } as React.CSSProperties}
            >
              <button
                type="button"
                className="yb-month-head"
                onClick={() => onOpen(m.month)}
                aria-label={`Open the ${MONTHS[m.month - 1]} plan`}
              >
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
                <span className="yb-month-go" aria-hidden="true">
                  <ArrowRight size={13} />
                </span>
              </button>

              {m.theme && <p className="yb-theme">{m.theme}</p>}

              <div className="yb-days" role="grid" aria-label={`${MONTHS[m.month - 1]} calendar`}>
                {WEEKDAYS.map(d => (
                  <span key={d} className="yb-dow" aria-hidden="true">
                    {d[0]}
                  </span>
                ))}
                {cells.map((cell, i) => {
                  if (cell === null) return <span key={`pad-${i}`} className="yb-day is-pad" aria-hidden="true" />;
                  const running = campaignStarts.get(m.month)?.get(cell.day) || [];
                  const moment = cell.moments[0];
                  const events = cell.moments.length + running.length;
                  const picked = isOpen && openDay!.day === cell.day;
                  const tip = [
                    ...cell.moments.map(x => `${x.name} · ${KEY_DATE_LABELS[x.kind]}`),
                    ...running.map((c: any) => `${c.name} · campaign`),
                  ].join('\n');
                  const label = `${cell.day} ${MONTHS[m.month - 1]}${
                    cell.moments.length ? `, ${cell.moments.map(x => x.name).join(', ')}` : ''
                  }${running.length ? `, campaign${running.length > 1 ? 's' : ''} running` : ''}`;
                  const className = `yb-day ${events ? 'has-moment' : ''} ${
                    cell.moments.some(x => x.kind === 'festival') ? 'is-festival' : ''
                  } ${running.length ? 'has-campaign' : ''} ${picked ? 'is-picked' : ''}`;
                  return events ? (
                    <button
                      key={cell.day}
                      type="button"
                      className={className}
                      aria-pressed={picked}
                      aria-label={label}
                      title={tip}
                      onClick={() => setOpenDay(picked ? null : { month: m.month, day: cell.day })}
                    >
                      {cell.day}
                      {layers.moments && cell.moments.length > 0 && (
                        <i style={{ background: KIND_COLOR[moment.kind] || 'var(--gold)' }} />
                      )}
                      {layers.campaigns && running.length > 0 && (
                        <u
                          aria-hidden="true"
                          style={{
                            background: plan ? accent : LOCATION_COLORS[running[0].studio] || 'var(--a1)',
                          }}
                        />
                      )}
                    </button>
                  ) : (
                    <span key={cell.day} className={className}>
                      {cell.day}
                    </span>
                  );
                })}
              </div>

              {facts && (
                <div className="yb-day-panel" role="group" aria-label={`${openDay!.day} ${MONTHS[m.month - 1]}`}>
                  <header>
                    <strong>
                      {openDay!.day} {MONTHS[m.month - 1]}
                    </strong>
                    <button type="button" onClick={() => setOpenDay(null)} aria-label="Close this day">
                      <X size={12} />
                    </button>
                  </header>
                  <ul>
                    {facts.moments.map(x => (
                      <li key={`m-${x.name}`} style={{ ['--k' as string]: KIND_COLOR[x.kind] } as React.CSSProperties}>
                        <i />
                        <span>
                          {x.name}
                          <em>{KEY_DATE_LABELS[x.kind]}</em>
                        </span>
                      </li>
                    ))}
                    {groupedCampaigns(facts.campaigns).map((c: any) => (
                      <li key={`c-${c.name}`} style={{ ['--k' as string]: LOCATION_COLORS[c.studio] || 'var(--a1)' }}>
                        <i />
                        <span>
                          {c.name}
                          <em>
                            {c.range} · {c.studios.join(' · ')}
                          </em>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="yb-day-open" onClick={() => onOpen(m.month)}>
                    Open {MONTHS[m.month - 1]}
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {layers.offers && (
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
              )}

              {layers.moments && moments.length > 0 && (
                <p className={`yb-moments ${expanded === m.month ? 'is-expanded' : ''}`}>
                  {(expanded === m.month ? moments : moments.slice(0, 3)).map(x => (
                    <span key={x.name} style={{ ['--k' as string]: KIND_COLOR[x.kind] }}>
                      <i />
                      {x.name}
                    </span>
                  ))}
                  {moments.length > 3 && (
                    <button
                      type="button"
                      className="more"
                      aria-expanded={expanded === m.month}
                      onClick={() => setExpanded(current => (current === m.month ? null : m.month))}
                    >
                      {expanded === m.month ? 'Show less' : `+${moments.length - 3} more`}
                    </button>
                  )}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <footer className="yb-foot">
        <span>
          <b>{number(totals.offers)}</b> offers, <b>{number(totals.campaigns)}</b> campaigns and{' '}
          <b>{number(totals.moments)}</b> moments across the year
        </span>
        <span>
          Target for {year}: <b>{lakh(annual)}</b>
          {plan ? ` · ${plan.studio.name}` : ' · all four locations'}
        </span>
      </footer>
    </section>
  );
}
