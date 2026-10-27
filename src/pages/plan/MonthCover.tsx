import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MONTHS, MONTHS_SHORT } from '../../types';
import { formatKeyDate, type KeyDate } from '../../data/keyDates';
import { lakh } from './usePlanData';

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
  text: string;
  /** How many further steps that week carries. */
  extra?: number;
}

const TONES = ['var(--mc-a)', 'var(--mc-b)', 'var(--mc-c)'];
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

  return (
    <div
      ref={root}
      tabIndex={-1}
      className={`mw-monthcover is-${status}${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${MONTHS[month - 1]} overview`}
    >
      <div
        className="mc-photo"
        style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
        aria-hidden="true"
      />
      <div className="mc-scrim" aria-hidden="true" />

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
          {theme && (
            <p className="mc-focus">
              <span>Focus</span>
              {theme}
            </p>
          )}
          <h2>{MONTHS[month - 1]}</h2>
          {brief && <p className="mc-brief">{brief}</p>}
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
                    <li key={w.week} className="mc-week" data-week={w.week}>
                      <b>W{w.week}</b>
                      <span>
                        {w.text || 'Not planned yet'}
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
