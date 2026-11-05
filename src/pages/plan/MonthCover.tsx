import React, { useEffect, useRef, useState } from 'react';
import MonsoonScene from '../../components/MonsoonScene';
import SeasonScene from '../../components/SeasonScene';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Play, Sparkles, X } from 'lucide-react';
import { MONTHS, MONTHS_SHORT } from '../../types';
import { formatKeyDate, type KeyDate } from '../../data/keyDates';
import { lakh } from './usePlanData';
import { MechanicMini } from './AnniversaryMechanics';

/* The cover that opens before a month plan: the month's focus and brief over its lead
   photograph, then the numbers that define the month — revenue split, lead requirement,
   conversions — animated in. "Open the month plan" reveals the workspace underneath. */

type Status = 'approved' | 'locked' | 'proposed';
export interface CoverStream {
  key: string;
  label: string;
  value: number;
}

/** One week of the month's action plan, shortened for the cover. */
export interface CoverPlanWeek {
  week: number;
  /** What the step is called: a week number, or the strategy's own label (Hook, Moment…). */
  label?: string;
  text: string;
  /** How many further steps that week carries. */
  extra?: number;
}

const TONES = ['var(--mc-a)', 'var(--mc-b)', 'var(--mc-c)'];

/* The anniversary the studio is keeping this year. Named once, used everywhere on the cover. */
const ANNIVERSARY_YEARS = 9;
const YEARS_WORD = 'nine';
const YEARS_TITLE = 'Nine';
/** The nine years, as ticks struck around the monogram's ring. */
const NINE_TICKS = Array.from({ length: ANNIVERSARY_YEARS }).map((_, i) => i);
const int = (v: number) => Math.round(v).toLocaleString('en-IN');
const pct = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(0)}%`;

// Counts a figure up on mount. Skipped entirely when motion is reduced.
function Counter({
  to,
  format,
  delay = 0,
  animate,
}: {
  to: number;
  format: (v: number) => string;
  delay?: number;
  animate: boolean;
}) {
  const [value, setValue] = useState(animate ? 0 : to);
  useEffect(() => {
    if (!animate) {
      setValue(to);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, Math.max(0, (now - start - delay) / 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(to * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delay, animate]);
  return <>{format(value)}</>;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const change = () => setReduce(mq.matches);
    mq.addEventListener?.('change', change);
    return () => mq.removeEventListener?.('change', change);
  }, []);
  return reduce;
}

export default function MonthCover({
  month,
  year,
  studioName,
  theme,
  brief,
  description = '',
  risk,
  signature,
  plan,
  target,
  lastYear,
  streams,
  leads,
  trials,
  buyers,
  renewalsDue,
  renewalCoverage,
  dates,
  offers,
  offerRevenue = 0,
  offerNames = [],
  status,
  photo,
  onPlay,
  playMinutes,
  onOpen,
  onClose,
  onPrev,
  onNext,
}: {
  month: number;
  year: number;
  studioName: string;
  theme: string;
  brief: string;
  description?: string;
  risk?: string;
  signature?: string;
  plan?: CoverPlanWeek[];
  target: number;
  lastYear: number;
  streams: CoverStream[];
  leads: number;
  trials: number;
  buyers: number;
  renewalsDue: number;
  renewalCoverage: number | null;
  dates: KeyDate[];
  offers: number;
  offerRevenue?: number;
  offerNames?: { name: string; slot: string }[];
  status: Status;
  photo: { url: string; pos: string };
  /** Starts the narrated explainer for this month. */
  onPlay?: () => void;
  /** How long the explainer runs, in minutes, so the button can say so. */
  playMinutes?: number;
  onOpen: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const reduce = useReducedMotion();
  const animate = !reduce;
  // April is the anniversary: the cover dresses for it — royal ground, gold rules, confetti.
  const birthday = month === 4;
  // The cover dissolves into the plan rather than cutting straight to it.
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // Focus the cover itself, never a control at the bottom of a scrollable page.
    root.current?.focus({ preventScroll: true });
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  const openPlan = () => {
    if (leaving) return;
    if (reduce) {
      onOpen();
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(onOpen, 380);
  };
  const total = streams.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const yoy = lastYear ? target / lastYear - 1 : null;
  const leadToTrial = leads ? trials / leads : null;
  const trialToBuyer = trials ? buyers / trials : null;
  const share = (v: number) => `${(Math.max(0, v) / total) * 100}%`;
  // The same split, read as a ring: arcs are cut from the full circumference in order,
  // so the three segments close the circle exactly.
  const RING = 38;
  const CIRC = 2 * Math.PI * RING;
  let cursor = 0;
  const arcs = streams.map((s, i) => {
    const len = (Math.max(0, s.value) / total) * CIRC;
    const arc = { key: s.key, len, offset: cursor, tone: TONES[i % TONES.length], i };
    cursor += len;
    return arc;
  });
  const lead = streams.reduce((a, b) => (b.value > a.value ? b : a), streams[0]);

  // Months with their own photograph. Portrait (Jun) are shown whole over a blurred copy.
  const OWN: Record<number, { url: string; pos: string }> = {
    2: { url: '/p57/feb-2027.jpg', pos: '50% 30%' },
    3: { url: '/p57/march-2027.jpg', pos: '100% 30%' },
    5: { url: '/p57/may-2027.jpg', pos: '100% 25%' },
    6: { url: '/p57/june-pride-2027.jpg', pos: '50% 0%' },
  };
  const coverPhoto = OWN[month] ?? photo;
  const fit = month === 2 || month === 6; // zoomed out 10%, blurred copy fills the edges
  return (
    <div
      ref={root}
      tabIndex={-1}
      className={`mw-monthcover is-${status}${leaving ? ' is-leaving' : ''}${birthday ? ' is-birthday' : ''}${month === 6 ? ' is-pride' : ''}`}
      data-month={month}
      role="dialog"
      aria-modal="true"
      aria-label={`${MONTHS[month - 1]} overview`}
    >
      {/* The room itself: the cover is the photograph, cropped to the sheet, with the
          type set into a scrim over its left edge. */}
      {/* June's photograph is a portrait: shown whole on the right, over a blurred copy of
          itself, instead of cropped to the landscape sheet. */}
      {fit && (
        <div className="mc-photo mc-photo-fill" style={{ backgroundImage: `url(${coverPhoto.url})` }} aria-hidden="true" />
      )}
      <div
        className={`mc-photo${fit ? ' is-zoom' : ''}`}
        style={{ backgroundImage: `url(${coverPhoto.url})`, backgroundPosition: coverPhoto.pos }}
        aria-hidden="true"
      />
      <div className="mc-scrim" aria-hidden="true" />
      {/* July is monsoon month: rain and rising floodwater behind the cover. */}
      {month === 7 && <MonsoonScene />}
      {/* Feb, Mar, Apr, May, Jun, Aug, Oct, Nov, Dec: seasonal scenes (Valentine's, Women's Day, Pride, anniversary, heat, Amazing Race, Diwali, Christmas). */}
      <SeasonScene month={month} />

      <div className="mc-scroll">
        <header className="mc-top">
          <span className="mc-kicker">
            <i aria-hidden="true" />
            Sales plan · {studioName} · {year}
          </span>
          <div className="mc-top-actions">
            <span className="mc-idx">
              {String(month).padStart(2, '0')}
              <em>/12</em>
            </span>
            <span className={`mc-status is-${status}`}>
              {status === 'approved' ? (
                <>
                  <CheckCircle2 size={11} /> Month approved
                </>
              ) : status === 'locked' ? (
                <>
                  <CheckCircle2 size={11} /> Targets locked
                </>
              ) : (
                'Proposed'
              )}
            </span>
            <span className="mc-nav">
              <button type="button" onClick={onPrev} disabled={month === 1} aria-label="Previous month">
                <ChevronLeft size={15} />
              </button>
              <button type="button" onClick={onNext} disabled={month === 12} aria-label="Next month">
                <ChevronRight size={15} />
              </button>
            </span>
            <button type="button" className="mc-close" onClick={onClose} aria-label="Close month plan">
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="mc-hero">
          <div className="mc-hero-copy">
            {birthday && (
              <p className="mc-anniv">
                <i aria-hidden="true" />
                <span>
                  <b>Nine years</b> Still Shaking · {year}
                </span>
              </p>
            )}
            <div className="mc-titleblock">
              {theme && (
                <p className="mc-focus">
                  <span>Focus</span>
                  {theme}
                </p>
              )}
              <h2>{MONTHS[month - 1]}</h2>
              {description && <p className="mc-desc">{description}</p>}
            </div>
            {onPlay && (
              <button type="button" className="mc-explainer" onClick={onPlay}>
                <span className="mc-explainer-disc" aria-hidden="true">
                  <Play size={14} />
                </span>
                Play the {MONTHS[month - 1]} explainer
                <em>{playMinutes || 1} min</em>
              </button>
            )}
            <dl className="mc-kpis">
              <div>
                <dt>Revenue target</dt>
                <dd>{lakh(target)}</dd>
              </div>
              <div>
                <dt>vs last year</dt>
                <dd className={yoy !== null && yoy < 0 ? 'neg' : 'pos'}>
                  {yoy === null ? '—' : `${yoy >= 0 ? '+' : ''}${Math.round(yoy * 100)}%`}
                </dd>
              </div>
              <div>
                <dt>Offers carry</dt>
                <dd>
                  {target > 0 ? `${Math.round((offerRevenue / target) * 100)}%` : '—'}
                  <em>{lakh(offerRevenue)}</em>
                </dd>
              </div>
              <div>
                <dt>Buyers needed</dt>
                <dd>
                  {int(buyers)}
                  <em>from {int(leads)} leads</em>
                </dd>
              </div>
            </dl>
            {brief && <CoverBrief text={brief} live={{ offers, offerRevenue, target, offerNames }} />}
          </div>

          {/* The anniversary, drawn rather than staged: a hairline ring struck with nine
              ticks, the ninth year set inside it. No confetti, no balloons — one engraved
              mark over the room, so the photograph stays the picture and the type stays
              the argument. */}
          {birthday && (
            <div className="mc-nine" aria-hidden="true">
              <svg viewBox="0 0 140 140">
                <circle className="mc-nine-ring" cx="70" cy="70" r="61" pathLength={100} />
                {NINE_TICKS.map(i => (
                  <line
                    key={i}
                    className="mc-nine-tick"
                    x1="70"
                    y1="3"
                    x2="70"
                    y2="9"
                    transform={`rotate(${i * 40} 70 70)`}
                    style={{ ['--i' as string]: i } as React.CSSProperties}
                  />
                ))}
              </svg>
              <span className="mc-nine-core">
                <b>IX</b>
                <em>years of 57</em>
              </span>
            </div>
          )}
        </div>

        <div className="mc-panel">
          <section className="mc-split">
            <div className="mc-split-head">
              <span className="mc-label">Revenue split</span>
              <div className="mc-amount">
                <strong>
                  <Counter to={target} format={lakh} delay={480} animate={animate} />
                </strong>
                {yoy === null ? (
                  <em>No prior year</em>
                ) : (
                  <em className={yoy < 0 ? 'neg' : 'pos'}>
                    {yoy >= 0 ? '+' : ''}
                    {Math.round(yoy * 100)}% vs LY
                  </em>
                )}
              </div>
            </div>

            <div className="mc-stack" aria-hidden="true">
              {streams.map((s, i) => (
                <span
                  key={s.key}
                  style={
                    {
                      width: share(s.value),
                      background: TONES[i % TONES.length],
                      ['--i' as string]: i,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>

            <div className="mc-split-figure">
              <span className="mc-donut" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                  <circle className="mc-donut-bg" cx="50" cy="50" r={RING} />
                  {arcs.map(a => (
                    <circle
                      key={a.key}
                      className={`mc-donut-arc${animate ? ' is-animated' : ''}`}
                      cx="50"
                      cy="50"
                      r={RING}
                      stroke={a.tone}
                      strokeDasharray={`${a.len} ${CIRC - a.len}`}
                      strokeDashoffset={-a.offset}
                      style={{ ['--i' as string]: a.i } as React.CSSProperties}
                    />
                  ))}
                </svg>
                <span className="mc-donut-core">
                  <b>{lead ? Math.round((Math.max(0, lead.value) / total) * 100) : 0}%</b>
                  <em>{lead ? lead.label.toLowerCase() : 'unset'}</em>
                </span>
              </span>

              <ul className="mc-legend">
                {streams.map((s, i) => (
                  <li key={s.key} style={{ ['--i' as string]: i } as React.CSSProperties}>
                    <i style={{ background: TONES[i % TONES.length] }} aria-hidden="true" />
                    <span>{s.label}</span>
                    <b>
                      <Counter to={s.value} format={lakh} delay={620 + i * 90} animate={animate} />
                    </b>
                    <em>{((Math.max(0, s.value) / total) * 100).toFixed(0)}%</em>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mc-need">
            <span className="mc-label">Lead requirement</span>
            <div className="mc-counters">
              {[
                { key: 'leads', label: 'Leads', value: leads, width: 100, delay: 560 },
                {
                  key: 'trials',
                  label: 'Trials',
                  value: trials,
                  width: leads ? (trials / leads) * 100 : 0,
                  delay: 660,
                },
                {
                  key: 'buyers',
                  label: 'Buyers',
                  value: buyers,
                  width: leads ? (buyers / leads) * 100 : 0,
                  delay: 760,
                },
              ].map(c => (
                <div key={c.key} className="mc-count">
                  <b>
                    <Counter to={c.value} format={int} delay={c.delay} animate={animate} />
                  </b>
                  <span>{c.label}</span>
                  <i style={{ ['--w' as string]: `${Math.max(4, Math.min(100, c.width))}%` } as React.CSSProperties} />
                </div>
              ))}
            </div>
            <div className="mc-conv" title="This studio's own conversion, measured on its trailing twelve months">
              <span>{pct(leadToTrial)} lead → trial</span>
              <span>{pct(trialToBuyer)} trial → buyer</span>
            </div>
            {renewalsDue > 0 && (
              <div className="mc-renew">
                <span className="mc-label">Renewals</span>
                <span className="mc-meter" aria-hidden="true">
                  <i
                    style={
                      {
                        ['--w' as string]: `${Math.min(100, Math.max(0, (renewalCoverage ?? 0) * 100))}%`,
                      } as React.CSSProperties
                    }
                  />
                </span>
                <span className="mc-renew-copy">
                  {int(renewalsDue)} expiring · {pct(renewalCoverage)} covered
                </span>
              </div>
            )}
          </section>

          {/* The anniversary month is played, not just priced: the wheel, the ticket and the
              nine gifts sit beside the numbers they have to move, each one opening the plan. */}
          {birthday && (
            <section className="mc-play" aria-label="What can be played this month">
              <span className="mc-label">
                <Sparkles size={11} /> Play this month
              </span>
              <div className="am-cover-strip is-stacked">
                <MechanicMini kind="wheel" onOpen={openPlan} />
                <MechanicMini kind="ticket" onOpen={openPlan} />
                <MechanicMini kind="gifts" onOpen={openPlan} />
              </div>
            </section>
          )}
        </div>

        {/* The argument in three columns — what breaks, what we do, and the four weeks —
            which the narration walks through in order, lighting each one as it speaks. */}
        {(risk || signature || (plan && plan.length > 0)) && (
          <section className="mc-story" aria-label="The month's argument and action plan">
            {risk && (
              <article className="mc-story-col is-risk">
                <span className="mc-label">
                  <i aria-hidden="true" />
                  What goes wrong
                </span>
                <p>{risk}</p>
              </article>
            )}
            {signature && (
              <article className="mc-story-col is-move">
                <span className="mc-label">
                  <i aria-hidden="true" />
                  The move
                </span>
                <p>{signature}</p>
              </article>
            )}
            {plan && plan.length > 0 && (
              <article className="mc-story-col is-plan">
                <span className="mc-label">
                  <i aria-hidden="true" />
                  The plan
                </span>
                <ol className="mc-weeks">
                  {plan.map(w => (
                    <li key={`${w.week}-${w.label || ''}`} className="mc-week" data-week={w.week}>
                      <b>{w.label || `W${w.week}`}</b>
                      <span>
                        {w.text || 'To be planned'}
                        {!!w.extra && <em>+{w.extra}</em>}
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            )}
          </section>
        )}

        <footer className="mc-foot">
          <div className="mc-dates">
            {dates.slice(0, 4).map(d => (
              <span key={d.name} className={`kd-${d.kind}`}>
                <b>
                  {formatKeyDate(d)} {MONTHS_SHORT[month - 1]}
                </b>
                {d.name}
              </span>
            ))}
            {dates.length > 4 && <span className="mc-more">+{dates.length - 4} more</span>}
          </div>
          <div className="mc-actions">
            <span className="mc-meta">
              {offers ? `${offers} offer${offers === 1 ? '' : 's'} planned` : 'No offers planned'}
            </span>
            <button type="button" className="mc-open" onClick={openPlan}>
              Open the month plan
              <ArrowRight size={16} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* The month's summary, organised. Imported briefs arrive as one paragraph of "•" points with
   "–" sub-items. Known points (offer mix, planned revenue, sizing, attendance, past actuals,
   source) are drawn as figures; anything else falls back to a tidy labelled row. */
type Point = { label: string; body: string; subs: { label: string | null; text: string }[] };

function briefPoints(text: string): Point[] {
  const raw = String(text).trim();
  const parts = raw.includes('•') ? raw.split(/\s*•\s*/) : raw.split(/(?<=[.!?])\s+(?=[A-Z₹0-9])/);
  return parts
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      const pieces = p
        .split(/\s+[–—]\s+/)
        .map(x => x.trim())
        .filter(Boolean);
      const head = pieces.shift() || p;
      const m = head.match(/^([^:]{2,48}):\s*(.*)$/);
      return {
        label: m ? m[1].trim() : '',
        body: m ? m[2].trim() : head,
        subs: pieces.map(x => {
          const sm = x.match(/^([^:]{2,40}):\s*(.*)$/);
          return { label: sm ? sm[1].trim() : null, text: sm ? sm[2].trim() : x };
        }),
      };
    });
}

const L = (v: number) => `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const rupees = (s: string) => {
  const m = s.match(/₹\s*([\d,]+(?:\.\d+)?)\s*(L|lakh|Cr)?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return /cr/i.test(m[2] || '') ? n * 1e7 : /l/i.test(m[2] || '') ? n * 1e5 : n;
};
const is = (p: Point, re: RegExp) => re.test(p.label);

function Actuals({ rows }: { rows: { year: string; text: string }[] }) {
  const parse = (t: string) => ({
    revenue: t.match(/^(₹[\d.,]+L)/)?.[1] || '—',
    clients: t.match(/from\s+(\d[\d,]*)\s+paying/i)?.[1] || '—',
    first: t.match(/\((\d[\d,]*)\s+first-time/i)?.[1] || '—',
    memberships: t.match(/Memberships\s+(₹[\d.,]+L)/i)?.[1] || '—',
    packs: t.match(/class packs\s+(₹[\d.,]+L)/i)?.[1] || '—',
    privates: t.match(/privates\s+(₹[\d.,]+L)/i)?.[1] || '—',
    discounts: t.match(/discounts given\s+(₹[\d.,]+L)/i)?.[1] || '—',
  });
  const data = rows.map(r => ({ year: r.year, ...parse(r.text) }));
  const cols: [keyof (typeof data)[number], string][] = [
    ['revenue', 'Revenue'],
    ['clients', 'Clients'],
    ['first', 'New'],
    ['memberships', 'Memb.'],
    ['packs', 'Packs'],
    ['privates', 'Privates'],
    ['discounts', 'Disc.'],
  ];
  return (
    <table className="mcb-table">
      <thead>
        <tr>
          <th />
          {cols.map(([, h]) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(r => (
          <tr key={r.year}>
            <th>{r.year}</th>
            {cols.map(([k]) => (
              <td key={k}>{r[k]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Live = { offers: number; offerRevenue: number; target: number; offerNames: { name: string; slot: string }[] };
const SLOT_LABEL: Record<string, string> = {
  newcomer: 'New clients',
  new_client: 'New clients',
  lapsed: 'Win-backs',
  reactivation: 'Win-backs',
  renewal: 'Renewals',
  retention: 'Renewals',
  upsell: 'Revenue boost',
};

function CoverBrief({ text, live }: { text: string; live: Live }) {
  const points = briefPoints(text);
  if (points.length < 2) return <p className="mc-brief">{text}</p>;

  const used = new Set<Point>();
  const take = (re: RegExp) => {
    const p = points.find(x => !used.has(x) && is(x, re));
    if (p) used.add(p);
    return p;
  };
  const mix = take(/offer mix/i);
  const revenue = take(/planned (offer )?revenue/i);
  const sizing = take(/units were sized|sizing/i);
  const attendance = take(/attendance/i);
  const actuals = points.filter(x => /actuals$/i.test(x.label) && !/source/i.test(x.label));
  actuals.forEach(a => used.add(a));
  const source = take(/source/i);
  const rest = points.filter(x => !used.has(x));

  // Figures pulled from the prose; each block falls back to its text when parsing finds nothing.
  const planned = revenue ? rupees(revenue.body) : null;
  const target = revenue ? rupees(revenue.body.replace(/^[^₹]*₹[\d,.]+/, '')) : null;
  const share = revenue?.body.match(/(\d+(?:\.\d+)?)%/)?.[1];
  const funnel = sizing
    ? [
        ['Leads', (sizing.body + ' ' + sizing.subs.map(x => x.text).join(' ')).match(/(\d[\d,]*)\s+leads/i)?.[1]],
        ['Trials', (sizing.body + ' ' + sizing.subs.map(x => x.text).join(' ')).match(/(\d[\d,]*)\s+trials/i)?.[1]],
        [
          'Expiring',
          (sizing.body + ' ' + sizing.subs.map(x => x.text).join(' ')).match(/(\d[\d,]*)\s+memberships expiring/i)?.[1],
        ],
      ].filter(([, v]) => v)
    : [];
  const att = attendance?.body || '';
  const bars = [
    ['8+ visits', att.match(/8\+[^.]*?(\d{2})(?:[–-](\d{2}))?%/)],
    ['4–7', att.match(/(\d{2})%\s+at\s+4[–-]7/)],
    ['2–3', att.match(/(\d{2})%\s+at\s+2[–-]3/)],
    ['1 visit', att.match(/(\d{2})%\s+at\s+one/)],
  ]
    .filter(([, m]) => m)
    .map(([k, m]: any) => ({ k, v: Number(m[2] || m[1]), label: m[2] ? `${m[1]}–${m[2]}%` : `${m[1]}%` }));
  const mixCount = mix?.body.match(/^(\d+)\s+offers?/i)?.[1];
  // Unlabelled sub-items are the summary sentence; labelled ones are the offer groups.
  const mixGroups = mix?.subs.filter(g => g.label) || [];
  const mixSummary = [
    mix?.body.replace(/^(\d+)\s+offers?\s*[—–-]?\s*/i, '').trim(),
    ...(mix?.subs.filter(g => !g.label).map(g => g.text) || []),
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <div className="mcb">
      <div className="mcb-col">
        {/* The month's live offers, grouped by the stream they serve — the plan text can lag
            behind swaps, so names and counts come from what is actually picked. */}
        <section className="mcb-block is-offers">
          <header>
            <span>This month’s offers</span>
            <b>
              {live.offers} offer{live.offers === 1 ? '' : 's'} · {L(live.offerRevenue)}
              {live.target > 0 ? ` · ${Math.round((live.offerRevenue / live.target) * 100)}% of target` : ''}
            </b>
          </header>
          {live.target > 0 && (
            <span className="mcb-meter" aria-hidden="true">
              <i style={{ width: `${Math.min(100, (live.offerRevenue / live.target) * 100)}%` }} />
            </span>
          )}
          {live.offerNames.length ? (
            <dl className="mcb-groups">
              {Object.entries(
                live.offerNames.reduce<Record<string, string[]>>((acc, o) => {
                  const k = SLOT_LABEL[o.slot] || 'Revenue boost';
                  (acc[k] = acc[k] || []).push(o.name);
                  return acc;
                }, {}),
              ).map(([group, names]) => (
                <div key={group}>
                  <dt>{group}</dt>
                  <dd>
                    {names.map(name => (
                      <span key={name} className="mcb-chip">
                        {name}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mcb-note">{mixSummary || 'No offers picked yet.'}</p>
          )}
        </section>
      </div>

      <div className="mcb-col">
        {attendance && (
          <section className="mcb-block is-attendance">
            <header>
              <span>Why attendance matters</span>
              <b>Active 3 months later</b>
            </header>
            {bars.length >= 2 ? (
              <>
                <div className="mcb-bars">
                  {bars.map(b => (
                    <div key={b.k}>
                      <span>{b.k}</span>
                      <i>
                        <s style={{ width: `${b.v}%` }} />
                      </i>
                      <b>{b.label}</b>
                    </div>
                  ))}
                </div>
                <p className="mcb-note">{att.match(/Every[^.]*\./)?.[0] || ''}</p>
              </>
            ) : (
              <p className="mcb-note">{att}</p>
            )}
          </section>
        )}

        {actuals.length > 0 && (
          <section className="mcb-block is-years">
            <header>
              <span>Same month, past years</span>
            </header>
            <Actuals rows={actuals.map(a => ({ year: a.label.replace(/\s*actuals$/i, ''), text: a.body }))} />
          </section>
        )}

        {rest.length > 0 && (
          <section className="mcb-block is-rest">
            <dl className="mcb-rows">
              {rest.map((r, i) => (
                <div key={i}>
                  <dt>{r.label || 'Note'}</dt>
                  <dd>
                    {r.body}
                    {r.subs.map((x, j) => (
                      <span key={j}>
                        {' · '}
                        {x.label ? <b>{x.label}: </b> : null}
                        {x.text}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {source && <p className="mcb-source">Source: {source.body}</p>}
      </div>
    </div>
  );
}
