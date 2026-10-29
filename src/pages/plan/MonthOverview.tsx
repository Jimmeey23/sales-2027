import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Quote, ShieldCheck, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import { MONTHS, number } from '../../types';
import type { MonthChapter, MonthStory } from '../../data/monthNarrative';

/* ─────────────────────────────────────────────────────────────────────────────
   The month's opening page.

   It is built as one sheet with a clear reading order: the month and its promise,
   then the four numbers that decide whether it works, then how the revenue is
   split and how many people have to walk in, and only then the prose. The
   figures are the first thing the eye lands on, and every bar in them is drawn
   from a real number rather than a placeholder.
   ──────────────────────────────────────────────────────────────────────────── */

const lakh = (v: number) => `₹${(Math.max(0, v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const pct = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(d)}%`;

export interface OverviewStream {
  key: string;
  label: string;
  value: number;
}

// Counts a figure up on mount; skipped when motion is reduced.
function Counter({
  to,
  format,
  animate,
  delay = 0,
}: {
  to: number;
  format: (v: number) => string;
  animate: boolean;
  delay?: number;
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
      const p = Math.min(1, Math.max(0, (now - start - delay) / 900));
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delay, animate]);
  return <>{format(value)}</>;
}

/* The target dial: one ring, filled by how much of the month the offers carry. */
function TargetDial({ share, animate }: { share: number; animate: boolean }) {
  const clamped = Math.max(0, Math.min(100, share));
  return (
    <span className="mo2-dial" role="img" aria-label={`${Math.round(share)}% of target carried by offers`}>
      <svg viewBox="0 0 84 84">
        <circle className="mo2-dial-track" cx="42" cy="42" r="34" />
        <circle
          className={`mo2-dial-arc${animate ? ' is-animated' : ''}`}
          cx="42"
          cy="42"
          r="34"
          pathLength={100}
          style={{ strokeDasharray: `${clamped} 100` }}
        />
      </svg>
      <b>{Math.round(share)}%</b>
      <em>carried</em>
    </span>
  );
}

export default function MonthOverview({
  month,
  chapter,
  theme,
  studioName,
  roomAngle,
  story,
  target,
  lastYear,
  leads,
  trials,
  buyers,
  offers,
  offerRevenue,
  renewalsDue,
  renewalCoverage,
  streams = [],
  photo,
  status,
  onOpenOffers,
}: {
  month: number;
  chapter: MonthChapter;
  theme: string;
  studioName: string;
  roomAngle: string;
  story: MonthStory;
  target: number;
  lastYear: number;
  leads: number;
  trials: number;
  buyers: number;
  offers: number;
  offerRevenue: number;
  renewalsDue: number;
  renewalCoverage: number | null;
  streams?: OverviewStream[];
  photo: { url: string; pos: string };
  status: 'approved' | 'locked' | 'proposed';
  onOpenOffers?: () => void;
}) {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const animate = !reduce;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const yoy = lastYear ? target / lastYear - 1 : null;
  const coverage = target > 0 ? (offerRevenue / target) * 100 : 0;
  const coveragePct = Math.min(100, Math.max(0, (renewalCoverage ?? 0) * 100));
  const total = streams.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  const funnel = [
    { key: 'leads', label: 'Leads', value: leads },
    { key: 'trials', label: 'Trials', value: trials },
    { key: 'buyers', label: 'Buyers', value: buyers },
  ];
  const widest = Math.max(1, ...funnel.map(f => f.value));

  return (
    <section className="mo2" aria-label={`${MONTHS[month - 1]} overview`}>
      <header className="mo2-hero">
        <div
          className="mo2-photo"
          style={{ backgroundImage: `url(${photo.url})`, backgroundPosition: photo.pos }}
          aria-hidden="true"
        />
        <div className="mo2-scrim" aria-hidden="true" />
        <div className="mo2-hero-inner">
          <div className="mo2-hero-copy">
            <span className="mo2-kicker">
              <i aria-hidden="true" />
              {MONTHS[month - 1]} · {studioName}
              <em className={`mo2-status is-${status}`}>
                {status === 'approved' ? 'Approved' : status === 'locked' ? 'Targets locked' : 'Proposed'}
              </em>
            </span>
            <h1>{theme}</h1>
            <p className="mo2-lede">{chapter.objective}</p>
            <div className="mo2-hero-figures">
              <div>
                <span>Revenue target</span>
                <strong>
                  <Counter to={target} format={lakh} animate={animate} />
                </strong>
              </div>
              <div>
                <span>vs {new Date().getFullYear() - 1}</span>
                <strong className={yoy !== null && yoy < 0 ? 'is-down' : 'is-up'}>
                  {yoy === null ? 'first year' : `${yoy >= 0 ? '+' : ''}${Math.round(yoy * 100)}%`}
                  {yoy !== null && <ArrowUpRight size={14} />}
                </strong>
              </div>
              <div>
                <span>Offers on the plan</span>
                <strong>
                  {offers}
                  <em>{offers ? ` · ${lakh(offerRevenue)} carried` : ' · none yet'}</em>
                </strong>
              </div>
            </div>
          </div>
          <TargetDial share={coverage} animate={animate} />
        </div>
      </header>

      <div className="mo2-body">
        <div className="mo2-brief">
          <span className="mo2-label">The brief</span>
          <p>{chapter.brief}</p>
          <p className="mo2-moment">{chapter.moment}</p>
        </div>

        <div className="mo2-cards">
          <article className="mo2-card is-mix">
            <span className="mo2-label">
              <TrendingUp size={12} /> Revenue split
            </span>
            <div className="mo2-stack" aria-hidden="true">
              {streams.map((s, i) => (
                <i
                  key={s.key}
                  className="mo2-stack-seg"
                  style={
                    {
                      ['--w' as string]: `${(Math.max(0, s.value) / total) * 100}%`,
                      ['--i' as string]: i,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
            <ul className="mo2-legend">
              {streams.map((s, i) => (
                <li key={s.key} style={{ ['--i' as string]: i } as React.CSSProperties}>
                  <i aria-hidden="true" />
                  <span>{s.label}</span>
                  <b>{lakh(s.value)}</b>
                  <em>{Math.round((Math.max(0, s.value) / total) * 100)}%</em>
                </li>
              ))}
              {!streams.length && <li className="is-empty">The split appears once the month’s target is set.</li>}
            </ul>
          </article>

          <article className="mo2-card is-funnel">
            <span className="mo2-label">
              <Users size={12} /> Who has to walk in
            </span>
            <div className="mo2-funnel">
              {funnel.map(f => (
                <div key={f.key} className="mo2-funnel-row">
                  <span>{f.label}</span>
                  <b>
                    <Counter to={f.value} format={v => number(v)} animate={animate} />
                  </b>
                  <i
                    aria-hidden="true"
                    style={{ ['--w' as string]: `${Math.max(6, (f.value / widest) * 100)}%` } as React.CSSProperties}
                  />
                </div>
              ))}
            </div>
            <p className="mo2-funnel-note">
              {leads ? `${pct(trials / leads)} of leads trial` : 'No funnel set'} ·{' '}
              {trials ? `${pct(buyers / trials)} of trials buy` : 'no trial rate yet'}
            </p>
          </article>

          <article className="mo2-card is-renew">
            <span className="mo2-label">
              <Target size={12} /> Who has to stay
            </span>
            <div className="mo2-renew-figure">
              <b>{number(renewalsDue)}</b>
              <span>memberships expiring</span>
            </div>
            <div className="mo2-meter" aria-hidden="true">
              <i style={{ ['--w' as string]: `${coveragePct}%` } as React.CSSProperties} />
            </div>
            <p className="mo2-renew-note">
              {pct(renewalCoverage)} covered by planned renewals
              {coveragePct < 60 ? ' — the biggest risk in the month.' : '.'}
            </p>
            <button type="button" className="mo2-link" onClick={onOpenOffers}>
              {offers ? 'Review the offers carrying it' : 'Add the offers that cover it'}
              <ArrowUpRight size={13} />
            </button>
          </article>
        </div>

        <div className="mo2-notes">
          <article>
            <span className="mo2-note-head">
              <i>01</i> Where the money comes from
            </span>
            <p>{story.split}</p>
          </article>
          <article>
            <span className="mo2-note-head">
              <i>02</i> Who has to walk in
            </span>
            <p>{story.leads}</p>
          </article>
          <article>
            <span className="mo2-note-head">
              <i>03</i> Who has to stay
            </span>
            <p>{story.renewals}</p>
          </article>
        </div>

        <div className="mo2-chapter">
          <article>
            <span className="mo2-label">
              <ShieldCheck size={12} /> What goes wrong
            </span>
            <p>{chapter.risk}</p>
          </article>
          <article>
            <span className="mo2-label">
              <Sparkles size={12} /> The move
            </span>
            <p>{chapter.signature}</p>
          </article>
          <article className="is-room">
            <span className="mo2-label">
              <Quote size={12} /> This room’s angle
            </span>
            <p>{roomAngle}</p>
            <em>{studioName}</em>
          </article>
        </div>
      </div>
    </section>
  );
}
