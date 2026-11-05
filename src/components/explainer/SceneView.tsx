/* The explainer's scenes.

   Every scene is a small piece of motion: a figure counting up, an arc drawing itself, a
   bar finding its length. The motion is driven by a mounted flag rather than by keyframes
   alone, so a scene replayed animates again from the start, and `prefers-reduced-motion`
   renders the same information already settled. */

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Target, Users, Wallet } from 'lucide-react';
import { displayMoney, type Scene } from '../../lib/explainerScript';

const int = (v: number) => Math.round(Number(v) || 0).toLocaleString('en-IN');

/* ------------------------------------------------------------------- primitives */

function useMounted(delay = 60) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return on;
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

/** Counts a figure up when the scene arrives. */
function Counter({
  to,
  format = int,
  delay = 120,
  duration = 1100,
}: {
  to: number;
  format?: (v: number) => string;
  delay?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, Math.max(0, (now - start - delay) / duration));
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delay, duration, reduce]);
  return <>{format(value)}</>;
}

const STAGE_DELAYS = [0, 90, 180, 270, 360, 450];

/** Fades and lifts its children in, one after another when given an index. */
function Rise({
  children,
  index = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: any;
}) {
  const on = useMounted(40 + (STAGE_DELAYS[index] ?? 450));
  return (
    <Tag className={`ex-rise${on ? ' is-on' : ''} ${className}`} style={{ transitionDelay: `${index * 70}ms` }}>
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------------- chart bits */

const STREAM_TONES = ['var(--ex-gold)', 'var(--ex-teal)', 'var(--ex-rose)', 'var(--ex-blue)'];

/** A ring cut into arcs. The arcs draw themselves from twelve o'clock, in order. */
function Ring({ segments, size = 240 }: { segments: { label: string; value: number; tone: string }[]; size?: number }) {
  const on = useMounted(180);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  return (
    <svg className="ex-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="18" />
      {segments.map((s, i) => {
        const length = (s.value / total) * circumference;
        const offset = cursor;
        cursor += length;
        return (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={s.tone}
            strokeWidth="18"
            strokeLinecap="butt"
            strokeDasharray={`${on ? Math.max(0, length - 2) : 0} ${circumference}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transitionDelay: `${260 + i * 190}ms` }}
          />
        );
      })}
    </svg>
  );
}

function Bars({
  items,
  unit = displayMoney,
}: {
  items: { label: string; value: number; tone: string; note?: string; ghost?: number }[];
  unit?: (v: number) => string;
}) {
  const on = useMounted(220);
  const max = Math.max(...items.map(i => Math.max(i.value, i.ghost || 0)), 1);
  return (
    <div className="ex-bars">
      {items.map((item, i) => (
        <div className="ex-bar" key={item.label}>
          <span className="ex-bar-label">{item.label}</span>
          <span className="ex-bar-track">
            {item.ghost ? (
              <i className="ex-bar-ghost" style={{ width: on ? `${(item.ghost / max) * 100}%` : '0%' }} />
            ) : null}
            <i
              className="ex-bar-fill"
              style={{
                width: on ? `${(item.value / max) * 100}%` : '0%',
                background: item.tone,
                transitionDelay: `${180 + i * 140}ms`,
              }}
            />
          </span>
          <b className="ex-bar-value">
            <Counter to={item.value} format={unit} delay={200 + i * 140} />
          </b>
          {item.note ? <em className="ex-bar-note">{item.note}</em> : null}
        </div>
      ))}
    </div>
  );
}

/** Leads → trials → buyers. Widths are square-rooted so a steep funnel stays readable. */
function FunnelChart({ stages }: { stages: { label: string; value: number; rate?: string }[] }) {
  const on = useMounted(200);
  const max = Math.max(...stages.map(s => s.value), 1);
  return (
    <div className="ex-funnel">
      {stages.map((stage, i) => (
        <div className="ex-funnel-row" key={stage.label}>
          <span className="ex-funnel-label">{stage.label}</span>
          <span className="ex-funnel-track">
            <i
              className="ex-funnel-bar"
              style={{
                width: on ? `${Math.max(4, Math.pow(stage.value / max, 0.5) * 100)}%` : '0%',
                transitionDelay: `${160 + i * 200}ms`,
                opacity: 1 - i * 0.18,
              }}
            />
            <b>
              <Counter to={stage.value} delay={220 + i * 200} />
            </b>
          </span>
          {stage.rate ? <em className="ex-funnel-rate">{stage.rate}</em> : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------- scenes */

function OpenScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  return (
    <div className="ex-scene ex-scene-open">
      <Rise index={0}>
        <p className="ex-kicker">
          {d.studio} · {d.year}
        </p>
      </Rise>
      <Rise index={1}>
        <h2 className="ex-display">{d.monthName}</h2>
      </Rise>
      {d.theme ? (
        <Rise index={2}>
          <p className="ex-theme">{d.theme}</p>
        </Rise>
      ) : null}
      {d.description ? (
        <Rise index={3}>
          <p className="ex-lede">{d.description}</p>
        </Rise>
      ) : null}
      <Rise index={4}>
        <p className="ex-footnote">
          {d.offers} offer{d.offers === 1 ? '' : 's'} · {displayMoney(d.target)} target
        </p>
      </Rise>
    </div>
  );
}

function TargetScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  const up = (d.delta as number) >= 0;
  return (
    <div className="ex-scene">
      <Rise index={0}>
        <p className="ex-kicker">{scene.kicker}</p>
      </Rise>
      <Rise index={1}>
        <h3 className="ex-figure">
          <Counter to={d.target} format={displayMoney} />
        </h3>
      </Rise>
      <Rise index={2}>
        <Bars
          items={[
            { label: `Last ${d.monthName ?? 'year'}`, value: d.lastYear, tone: 'rgba(255,255,255,.28)' },
            { label: 'Target', value: d.target, tone: 'var(--ex-gold)' },
          ]}
        />
      </Rise>
      {d.yoy !== null ? (
        <Rise index={3}>
          <p className={`ex-delta ${up ? 'is-up' : 'is-down'}`}>
            {up ? '▲' : '▼'} {Math.abs(Math.round((d.yoy as number) * 100))}% · {displayMoney(Math.abs(d.delta))}{' '}
            {up ? 'more than' : 'below'} last year
          </p>
        </Rise>
      ) : null}
    </div>
  );
}

function StreamsScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  const segments = (d.streams as any[]).map((s, i) => ({ label: s.label, value: s.value, tone: STREAM_TONES[i % 4] }));
  return (
    <div className="ex-scene ex-scene-split">
      <div className="ex-col">
        <Rise index={0}>
          <p className="ex-kicker">{scene.kicker}</p>
          <h3 className="ex-figure">
            <Counter to={d.total} format={displayMoney} />
          </h3>
        </Rise>
        <Rise index={2}>
          <Bars
            items={[
              ...(d.streams as any[]).map((s, i) => ({
                label: s.label,
                value: s.value,
                tone: STREAM_TONES[i % 4],
              })),
              // The plan states its full-price expectation for the month as a whole, not
              // stream by stream, so it is its own line rather than a ghost behind each bar
              // it cannot honestly be split across.
              ...(d.standard
                ? [
                    {
                      label: 'At full price',
                      value: d.standard,
                      tone: 'rgba(247,243,234,.22)',
                      note: `${Math.round(d.standardShare)}% of the month, no offer behind it`,
                    },
                  ]
                : []),
            ]}
          />
        </Rise>
      </div>
      <Rise index={1} className="ex-col ex-col-ring">
        <Ring segments={segments} />
        <dl className="ex-legend">
          {(d.streams as any[]).map((s, i) => (
            <div key={s.key}>
              <dt>
                <i style={{ background: STREAM_TONES[i % 4] }} />
                {s.label}
              </dt>
              <dd>{Math.round(s.share)}%</dd>
            </div>
          ))}
        </dl>
      </Rise>
    </div>
  );
}

function FunnelScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  return (
    <div className="ex-scene">
      <Rise index={0}>
        <p className="ex-kicker">{scene.kicker}</p>
        <h3 className="ex-figure">
          <Counter to={d.buyers} /> <em>buyers</em>
        </h3>
      </Rise>
      <Rise index={1}>
        <FunnelChart
          stages={[
            { label: 'Leads', value: d.leads },
            {
              label: 'Trials',
              value: d.trials,
              rate: d.leadToTrial ? `${Math.round(d.leadToTrial * 100)}% of leads` : undefined,
            },
            {
              label: 'Buyers',
              value: d.buyers,
              rate: d.trialToBuyer ? `${Math.round(d.trialToBuyer * 100)}% of trials` : undefined,
            },
          ]}
        />
      </Rise>
      {d.renewalsDue > 0 ? (
        <Rise index={2}>
          <p className="ex-note">
            <Users size={13} /> {int(d.renewalsDue)} memberships expire this month
            {d.renewalCoverage !== null ? ` · ${Math.round(d.renewalCoverage * 100)}% of their value is covered` : ''}
          </p>
        </Rise>
      ) : null}
    </div>
  );
}

function CoverageScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  const on = useMounted(240);
  return (
    <div className="ex-scene">
      <Rise index={0}>
        <p className="ex-kicker">{scene.kicker}</p>
        <h3 className="ex-figure">
          <Counter to={Math.round(d.share * 100)} />%
        </h3>
      </Rise>
      <Rise index={1}>
        <div
          className="ex-meter"
          role="img"
          aria-label={`Offers carry ${Math.round(d.share * 100)} per cent of target`}
        >
          <i className="ex-meter-fill" style={{ width: on ? `${Math.min(100, d.share * 100)}%` : '0%' }} />
          <span className="ex-meter-rest" style={{ width: on ? `${Math.min(100, (1 - d.share) * 100)}%` : '0%' }}>
            {displayMoney(d.standard)} at full price
          </span>
        </div>
        <dl className="ex-split">
          <div>
            <dt>
              <Wallet size={12} /> Offers carry
            </dt>
            <dd>
              <Counter to={d.offerRevenue} format={displayMoney} />
            </dd>
          </div>
          <div>
            <dt>
              <Target size={12} /> Target
            </dt>
            <dd>
              <Counter to={d.target} format={displayMoney} />
            </dd>
          </div>
        </dl>
      </Rise>
      <Rise index={2}>
        <p className="ex-note">
          {d.offers} offer{d.offers === 1 ? '' : 's'} · the balance is expected from clients buying at full price
        </p>
      </Rise>
    </div>
  );
}

const SLOT_TONE: Record<string, string> = {
  newcomer: 'var(--ex-teal)',
  new_client: 'var(--ex-teal)',
  renewal: 'var(--ex-gold)',
  retention: 'var(--ex-gold)',
  lapsed: 'var(--ex-rose)',
  reactivation: 'var(--ex-rose)',
  upsell: 'var(--ex-blue)',
};

function OfferScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  const on = useMounted(260);
  const tone = SLOT_TONE[d.slot] || 'var(--ex-gold)';
  return (
    <div className="ex-scene ex-scene-offer" style={{ ['--slot' as any]: tone }}>
      <Rise index={0}>
        <p className="ex-kicker">
          <span className="ex-slot" style={{ background: tone }} />
          {scene.kicker}
        </p>
        <h3 className="ex-offer-name">{d.name}</h3>
        {d.headline ? <p className="ex-offer-headline">{d.headline}</p> : null}
      </Rise>

      {d.benefit ? (
        <Rise index={1}>
          <section className="ex-card">
            <h4>The mechanic</h4>
            <p>{d.benefit}</p>
          </section>
        </Rise>
      ) : null}

      <Rise index={2}>
        <div className="ex-maths">
          <div>
            <span>Buyers</span>
            <b>
              <Counter to={d.buyers} />
            </b>
          </div>
          <em>×</em>
          <div>
            <span>Ticket</span>
            <b>
              <Counter to={d.ticket} format={displayMoney} />
            </b>
          </div>
          <em>=</em>
          <div className="is-total">
            <span>Revenue</span>
            <b>
              <Counter to={d.revenue} format={displayMoney} />
            </b>
          </div>
        </div>
        <div className="ex-share" aria-hidden="true">
          <i style={{ width: on ? `${Math.max(2, d.share * 100)}%` : '0%', background: tone }} />
          <span>{Math.round(d.share * 100)}% of the month’s offer revenue</span>
        </div>
      </Rise>

      <Rise index={3}>
        <dl className="ex-offer-meta">
          {d.discount != null && d.discount > 0 ? (
            <div>
              <dt>Discount</dt>
              <dd>{d.discount}%</dd>
            </div>
          ) : null}
          {d.audience ? (
            <div>
              <dt>Who</dt>
              <dd>{d.audience}</dd>
            </div>
          ) : null}
          {d.conditions ? (
            <div>
              <dt>Conditions</dt>
              <dd>{d.conditions}</dd>
            </div>
          ) : null}
          {d.kpi ? (
            <div className="is-wide">
              <dt>Measured by</dt>
              <dd>{d.kpi}</dd>
            </div>
          ) : null}
        </dl>
      </Rise>
    </div>
  );
}

function PlanScene({ scene }: { scene: Scene }) {
  const d = scene.data;
  return (
    <div className="ex-scene">
      <Rise index={0}>
        <p className="ex-kicker">{scene.kicker}</p>
        <h3 className="ex-figure">{scene.title}</h3>
      </Rise>
      <ol className="ex-steps">
        {(d.steps as any[]).map((step, i) => (
          <Rise key={i} index={i + 1} as="li" className="ex-step">
            <span className="ex-step-label">{step.label || `0${i + 1}`}</span>
            <p>{step.text}</p>
          </Rise>
        ))}
      </ol>
    </div>
  );
}

function CloseScene({ scene, onOpenPlan }: { scene: Scene; onOpenPlan?: () => void }) {
  const d = scene.data;
  return (
    <div className="ex-scene ex-scene-close">
      <Rise index={0}>
        <p className="ex-kicker">{scene.kicker}</p>
        <h3 className="ex-display">{scene.title}</h3>
      </Rise>
      <Rise index={1}>
        <dl className="ex-summary">
          <div>
            <dt>Target</dt>
            <dd>
              <Counter to={d.target} format={displayMoney} />
            </dd>
          </div>
          <div>
            <dt>Offers carry</dt>
            <dd>
              <Counter to={d.offerRevenue} format={displayMoney} />
            </dd>
          </div>
          <div>
            <dt>Buyers</dt>
            <dd>
              <Counter to={d.buyers} />
            </dd>
          </div>
        </dl>
      </Rise>
      {onOpenPlan ? (
        <Rise index={2}>
          <button type="button" className="ex-cta" onClick={onOpenPlan}>
            Open the month plan
            <ArrowRight size={15} />
          </button>
        </Rise>
      ) : null}
    </div>
  );
}

export default function SceneView({ scene, onOpenPlan }: { scene: Scene; onOpenPlan?: () => void }) {
  switch (scene.kind) {
    case 'open':
      return <OpenScene scene={scene} />;
    case 'target':
      return <TargetScene scene={scene} />;
    case 'streams':
      return <StreamsScene scene={scene} />;
    case 'funnel':
      return <FunnelScene scene={scene} />;
    case 'coverage':
      return <CoverageScene scene={scene} />;
    case 'offer':
      return <OfferScene scene={scene} />;
    case 'plan':
      return <PlanScene scene={scene} />;
    case 'close':
      return <CloseScene scene={scene} onOpenPlan={onOpenPlan} />;
    default:
      return null;
  }
}
