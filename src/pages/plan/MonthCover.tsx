import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Cake,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  PartyPopper,
  Sparkles,
  X,
} from 'lucide-react';
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

/* The anniversary cover's confetti is scattered by arithmetic rather than by hand: a
   fractional hash spreads each piece across the width, with its own delay, fall time and
   drift, so nothing lines up into columns. Purely decorative, all of it CSS-driven. */
const CONFETTI = ['#d9b25f', '#c98a94', '#a8c4b4', '#efe0bb', '#d9a878', '#c3b2cf', '#ffffff'];
/** The anniversary the studio is keeping this year. Named once, used everywhere on the cover. */
const ANNIVERSARY_YEARS = 9;
const YEARS_WORD = 'nine';
const YEARS_TITLE = 'Nine';
const frac = (i: number, seed: number) => {
  const x = Math.sin((i + 1) * seed) * 10000;
  return x - Math.floor(x);
};
const scatter = (i: number) =>
  ({
    '--x': `${(frac(i, 12.9898) * 98).toFixed(1)}%`,
    '--dl': `${(frac(i, 4.1414) * 9).toFixed(2)}s`,
    '--du': `${(11 + frac(i, 7.771) * 9).toFixed(2)}s`,
    '--dr': `${Math.round(frac(i, 3.31) * 120 - 60)}px`,
    '--spin': `${Math.round(frac(i, 9.7) * 720 - 360)}deg`,
    '--y': `${(frac(i, 6.61) * 88).toFixed(1)}%`,
  }) as React.CSSProperties;
const BALLOONS = [0, 1, 2, 3, 4].map(i => ({
  left: `${6 + frac(i, 5.13) * 84}%`,
  delay: `${(frac(i, 2.77) * 12).toFixed(2)}s`,
  duration: `${(18 + frac(i, 6.19) * 10).toFixed(1)}s`,
  size: 34 + Math.round(frac(i, 8.03) * 22),
  tone: CONFETTI[i % CONFETTI.length],
}));
/* Gold dust: the confetti above is paper, this is light. Twenty-six specks, each on its own
   slow rise and fade, so the photograph breathes instead of glittering. */
const DUST = Array.from({ length: 26 }).map((_, i) => ({
  left: `${(frac(i, 3.71) * 96).toFixed(1)}%`,
  top: `${(frac(i, 8.19) * 90).toFixed(1)}%`,
  size: `${(1.5 + frac(i, 5.53) * 3).toFixed(1)}px`,
  delay: `${(frac(i, 7.13) * 9).toFixed(2)}s`,
  duration: `${(9 + frac(i, 2.31) * 9).toFixed(1)}s`,
  drift: `${Math.round(frac(i, 4.87) * 40 - 20)}px`,
}));
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
  status,
  photo,
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
  status: Status;
  photo: { url: string; pos: string };
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

  return (
    <div
      ref={root}
      tabIndex={-1}
      className={`mw-monthcover is-${status}${leaving ? ' is-leaving' : ''}${birthday ? ' is-birthday' : ''}`}
      data-month={month}
      role="dialog"
      aria-modal="true"
      aria-label={`${MONTHS[month - 1]} overview`}
    >
      {/* The room itself: the cover is the photograph, cropped to the sheet, with the
          type set into a scrim over its left edge. */}
      <div
        className="mc-photo"
        style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
        aria-hidden="true"
      />
      <div className="mc-scrim" aria-hidden="true" />

      {birthday && (
        <>
          {/* Birthday confetti: thirty-six pieces in four shapes, each on its own fall.
              Decorative only — frozen entirely when motion is reduced. */}
          <div className="mc-confetti" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => (
              <i
                key={i}
                data-shape={i % 4}
                style={
                  {
                    ...scatter(i),
                    ['--c' as string]: CONFETTI[i % CONFETTI.length],
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Rising balloons, the slowest layer of the stack. */}
          <div className="mc-balloons" aria-hidden="true">
            {BALLOONS.map((b, i) => (
              <span
                key={i}
                style={
                  {
                    '--x': b.left,
                    '--dl': b.delay,
                    '--du': b.duration,
                    '--size': `${b.size}px`,
                    ['--c' as string]: b.tone,
                  } as React.CSSProperties
                }
              >
                <i />
              </span>
            ))}
          </div>

          {/* Bunting strung across the top of the sheet. */}
          {/* Bunting across the top edge, stopping well before the controls at the right. */}
          <div className="mc-bunting" aria-hidden="true">
            {Array.from({ length: 11 }).map((_, i) => (
              <i key={i} style={{ ['--i' as string]: i } as React.CSSProperties} />
            ))}
          </div>

          {/* Gold dust drifting through the room, slower and finer than the confetti. */}
          <div className="mc-dust" aria-hidden="true">
            {DUST.map((d, i) => (
              <i
                key={i}
                style={
                  {
                    '--x': d.left,
                    '--y': d.top,
                    '--s': d.size,
                    '--dl': d.delay,
                    '--du': d.duration,
                    '--dr': d.drift,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* A gilded frame, so the whole page reads as an invitation. */}
          <div className="mc-frame" aria-hidden="true">
            <span />
          </div>

          {/* One slow band of light crossing the sheet every twenty seconds. */}
          <div className="mc-sweep" aria-hidden="true" />
        </>
      )}

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
              <p className="mc-crest">
                <span className="mc-crest-crown">
                  <Crown size={15} />
                </span>
                <span className="mc-crest-copy">
                  <b>The Anniversary</b>
                  <em>Still Shaking · {YEARS_WORD} years</em>
                </span>
              </p>
            )}
            {birthday && (
              <>
                {/* A slow sparkle field over the title block. */}
                <div className="mc-sparkle-field" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Sparkles key={i} size={i % 3 === 0 ? 15 : 10} style={scatter(i * 3 + 1)} />
                  ))}
                </div>
              </>
            )}
            {birthday && (
              <p className="mc-royal">
                <Sparkles size={13} />
                57 numbered memberships · crowned this month
              </p>
            )}
            {birthday && (
              // The anniversary coin, struck over the room.
              <div className="mc-medallion" aria-hidden="true">
                <span className="mc-med-halo" />
                <span className="mc-med-ring">
                  <b>{ANNIVERSARY_YEARS}</b>
                  <em>years</em>
                </span>
                <span className="mc-med-crown">
                  <Crown size={17} />
                </span>
                <span className="mc-med-rays" />
                <span className="mc-med-orbit">
                  {Array.from({ length: ANNIVERSARY_YEARS }).map((_, i) => (
                    <i key={i} style={{ ['--i' as string]: i } as React.CSSProperties} />
                  ))}
                </span>
              </div>
            )}
            {theme && (
              <p className="mc-focus">
                <span>Focus</span>
                {theme}
              </p>
            )}
            <h2>{MONTHS[month - 1]}</h2>
            {birthday && (
              <p className="mc-ribbon">
                <PartyPopper size={13} />
                <span>{YEARS_TITLE} years of Physique 57 India</span>
                <Cake size={13} />
              </p>
            )}
            {brief && <p className="mc-brief">{brief}</p>}
          </div>
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
            <div className="mc-conv">
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
