import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, RotateCw, Sparkles, Ticket, X } from 'lucide-react';
import '../../styles/anniversary.css';

/* April's three playable mechanics, drawn rather than photographed.

   The anniversary offers are the only offers in the plan that are a *game*: a wheel a
   guest spins at the desk, a gold ticket that arrives in the post, nine numbered gifts a
   renewing member chooses between. A photograph cannot show any of that, so these offers
   carry a stage instead — the same animation on the cover, in the month plan and on the
   offer card, sized to whatever room it is given.

   Everything is CSS and inline SVG (no assets, no libraries), decorative motion is dropped
   under `prefers-reduced-motion`, and each stage is keyboard operable: the wheel is a
   button, the ticket flips on Enter, every gift box is a toggle. */

export type MechanicKind = 'wheel' | 'ticket' | 'gifts';

/** The mechanic an offer carries, from its provenance (never guessed from its name). */
export function mechanicOf(offer: any): MechanicKind | null {
  const kind = offer?.provenance?.mechanicArt || offer?.provenance?.mechanic?.kind;
  return kind === 'wheel' || kind === 'ticket' || kind === 'gifts' ? kind : null;
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

// Fires once when the element first comes into view, so a stage animates when it is looked at
// rather than twelve times on load.
function useInView<T extends HTMLElement>(rootMargin = '-12% 0px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, seen]);
  return { ref, seen };
}

const TONES = ['#e6c16a', '#c98a94', '#a8c4b4', '#8f6fb0', '#d9a878', '#7fb3c9', '#b07a2e', '#9b2c58', '#28489b'];

/* ── The wheel ──────────────────────────────────────────────────────────────
   Nine wedges, one pointer, one spin. The result is announced politely, and the disc
   always stops with the winning wedge's centre under the needle. */

export function WheelArt({
  prizes,
  className = '',
}: {
  prizes: Array<string | { label: string; short?: string }>;
  className?: string;
}) {
  // Wedges are narrow, so they carry the short form of a prize ("9% off", not "9% off a pack");
  // the full sentence is read out under the wheel when it lands.
  const full = prizes.map(p => (typeof p === 'string' ? p : p.label));
  const short = prizes.map((p, i) => (typeof p === 'string' ? p : p.short || p.label));
  const reduce = useReducedMotion();
  const { ref, seen } = useInView<HTMLDivElement>();
  const count = Math.max(3, full.length);
  const seg = 360 / count;
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [landing, setLanding] = useState<number | null>(null);
  const angleRef = useRef(0);
  const timer = useRef<number | null>(null);

  const wedges = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const start = -90 + i * seg;
        const end = start + seg;
        const rad = (deg: number) => (deg * Math.PI) / 180;
        const r = 96;
        const x1 = 110 + r * Math.cos(rad(start));
        const y1 = 110 + r * Math.sin(rad(start));
        const x2 = 110 + r * Math.cos(rad(end));
        const y2 = 110 + r * Math.sin(rad(end));
        const mid = start + seg / 2;
        // Labels run out from the hub along the wedge's own axis, so they always sit inside
        // their slice — and flip on the lower half so none of them is read upside down.
        // The disc itself turns, so "lower half" has to be measured in screen terms: the
        // resting angle is folded in here, or a label turned by the spin reads upside down.
        const normalised = (((mid + angle) % 360) + 360) % 360;
        return {
          i,
          path: `M110 110 L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
          label: short[i] || '',
          mid,
          // Alternating radii: nine labels on one ring crowd into each other at the foot of
          // the disc, so neighbours sit a step further out and each one keeps its own arc.
          labelY: i % 2 === 0 ? 42 : 54,
          flip: normalised > 90 && normalised < 270 ? 180 : 0,
          tone: i % 2 === 0 ? '#2b1420' : '#3a1b2b',
          rim: TONES[i % TONES.length],
        };
      }),
    [count, seg, short, angle],
  );

  const spin = () => {
    if (spinning) return;
    const winner = Math.floor(Math.random() * count);
    setLanding(null);
    setSpinning(true);
    if (reduce) {
      // No travel: land on the wedge and read it out.
      angleRef.current = -(winner * seg + seg / 2);
      setAngle(angleRef.current);
      setLanding(winner);
      setSpinning(false);
      return;
    }
    const base = angleRef.current - (angleRef.current % 360);
    const target = base + 360 * 5 - (winner * seg + seg / 2);
    angleRef.current = target;
    setAngle(target);
    timer.current = window.setTimeout(() => {
      setLanding(winner);
      setSpinning(false);
    }, 3800);
  };

  // One spin when the stage is first seen, so the mechanic introduces itself.
  useEffect(() => {
    if (!seen || reduce) return;
    const id = window.setTimeout(spin, 520);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, reduce]);
  useEffect(() => () => (timer.current ? window.clearTimeout(timer.current) : undefined), []);

  return (
    <div className={`am-wheel ${className}`} ref={ref}>
      <div className="am-wheel-top">
        <span className="am-wheel-pointer" aria-hidden="true" />
        <svg
          className={`am-wheel-disc${spinning ? ' is-spinning' : ''}`}
          viewBox="0 0 220 220"
          style={{ ['--turn' as string]: `${angle}deg` } as React.CSSProperties}
          role="img"
          aria-label={`Prize wheel with ${count} wedges`}
        >
          <circle cx="110" cy="110" r="104" className="am-wheel-hoop" />
          {wedges.map(w => (
            <g key={w.i}>
              <path d={w.path} fill={w.tone} stroke="rgba(230,193,106,0.34)" strokeWidth="0.7" />
              <g transform={`rotate(${w.mid} 110 110)`}>
                <text
                  x="110"
                  y={w.labelY}
                  className="am-wheel-label"
                  textAnchor="middle"
                  transform={w.flip ? `rotate(180 110 ${w.labelY})` : undefined}
                >
                  {w.label}
                </text>
              </g>
              <circle cx="110" cy="14" r="1.8" fill={w.rim} opacity="0.9" transform={`rotate(${w.mid} 110 110)`} />
            </g>
          ))}
        </svg>
        {/* The hub is its own layer: the disc turns, the nine never does. */}
        <span className="am-wheel-hub" aria-hidden="true">
          <b>9</b>
          <em>years</em>
        </span>
      </div>
      <div className="am-wheel-foot">
        <button type="button" className="am-wheel-btn" onClick={spin} disabled={spinning}>
          <RotateCw size={13} className={spinning ? 'am-spin-icon' : ''} />
          {spinning ? 'Spinning…' : landing === null ? 'Spin the wheel' : 'Spin again'}
        </button>
        <p className="am-wheel-result" aria-live="polite">
          {landing !== null ? (
            <>
              <Sparkles size={12} />
              <span>
                Lands on <b>{full[landing]}</b>
              </span>
            </>
          ) : (
            <span>Nine wedges · every guest who takes a first class in April spins once</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ── The golden ticket ──────────────────────────────────────────────────────
   A real ticket: foil, perforation, a serial. Press it and it turns over to what it buys. */

export function TicketArt({ serial = 9, className = '' }: { serial?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`am-ticket-wrap ${className}`}>
      <button
        type="button"
        className={`am-ticket ${open ? 'is-open' : ''}`}
        aria-pressed={open}
        aria-label={open ? 'Turn the golden ticket back over' : 'Turn the golden ticket over'}
        onClick={() => setOpen(current => !current)}
      >
        {/* A form control does not build a 3D context in Chrome, so the turn happens on this
            inner layer: the button stays a flat, clickable target and the faces flip inside it. */}
        <span className="am-ticket-3d">
          <span className="am-ticket-shine" aria-hidden="true" />
          <span className="am-ticket-face is-front">
            <span className="am-ticket-stub">
              <Ticket size={15} />
              <b>No. {String(serial).padStart(2, '0')}</b>
              <em>of {String(serial).padStart(2, '0')}</em>
            </span>
            <span className="am-ticket-body">
              <em>Physique 57 India · nine years</em>
              <strong>Golden Ticket</strong>
              <span className="am-ticket-rule" aria-hidden="true" />
              <small>Admit one · one private class, on us</small>
            </span>
            <span className="am-ticket-tear" aria-hidden="true" />
          </span>
          <span className="am-ticket-face is-back">
            <Sparkles size={16} />
            <strong>Bring it back in April</strong>
            <span className="am-ticket-rule" aria-hidden="true" />
            <small>
              One private class with any coach, and the standing comeback rate on anything you buy before 30 April. One
              transfer to a friend allowed.
            </small>
          </span>
        </span>
      </button>
      <p className="am-ticket-hint">
        {open ? 'Turn it back over to read the ticket' : 'Tap the ticket to turn it over'}
      </p>
    </div>
  );
}

/* ── The nine gifts ─────────────────────────────────────────────────────────
   Nine sealed, numbered gifts. Choosing one opens it; the rest close, because a member
   chooses once. */

export function GiftsArt({ gifts, className = '' }: { gifts: string[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={`am-gifts ${className}`}>
      <div className="am-gifts-grid">
        {gifts.slice(0, 9).map((gift, i) => (
          <button
            key={gift}
            type="button"
            className={`am-gift ${open === i ? 'is-open' : ''}`}
            style={{ ['--i' as string]: i } as React.CSSProperties}
            aria-pressed={open === i}
            aria-label={`Gift ${i + 1}: ${gift}`}
            onClick={() => setOpen(current => (current === i ? null : i))}
          >
            <span className="am-gift-box" aria-hidden="true">
              <span className="am-gift-lid" />
              <span className="am-gift-body" />
              <span className="am-gift-ribbon" />
              <span className="am-gift-shine" />
            </span>
            <b>{i + 1}</b>
            <em>{gift}</em>
          </button>
        ))}
      </div>
      <p className="am-gifts-hint" aria-live="polite">
        {open === null ? (
          <>
            <Gift size={12} /> Nine sealed gifts · one choice per renewal
          </>
        ) : (
          <>
            <Sparkles size={12} /> Gift {open + 1}: <b>{gifts[open]}</b>
          </>
        )}
      </p>
    </div>
  );
}

/* ── The stage ──────────────────────────────────────────────────────────────
   The offer card's version: the mechanic, its art and the rule in one panel. */

const TITLES: Record<MechanicKind, string> = {
  wheel: 'Spin the wheel',
  ticket: 'The golden ticket',
  gifts: 'Nine years, nine gifts',
};

export function MechanicStage({ offer }: { offer: any }) {
  const kind = mechanicOf(offer);
  const [dismissed, setDismissed] = useState(false);
  if (!kind || dismissed) return null;
  const data = offer?.provenance?.mechanic || {};
  const prizes: Array<string | { label: string; short?: string }> = Array.isArray(data.prizes)
    ? data.prizes.filter((p: any) => (typeof p === 'string' ? p : p?.label))
    : [];
  const gifts: string[] = Array.isArray(data.gifts) ? data.gifts : [];

  return (
    <section className={`am-stage is-${kind}`} aria-label={`${TITLES[kind]} — how this offer is played`}>
      <header className="am-stage-head">
        <span className="am-stage-eyebrow">
          <Sparkles size={11} />
          The mechanic · April 2027
        </span>
        <strong>{TITLES[kind]}</strong>
        {data.when && <em>{data.when}</em>}
        {/* Reading is the default; playing is the choice. A planner who has already spun
            it can put the stage away and get the card's figures back on screen. */}
        <button
          type="button"
          className="am-stage-close"
          onClick={() => setDismissed(true)}
          aria-label="Put the mechanic away"
          title="Put the mechanic away"
        >
          <X size={12} />
        </button>
      </header>
      <div className="am-stage-art">
        {kind === 'wheel' && <WheelArt prizes={prizes.length ? prizes : ['Free class', 'Guest passes', '9% off']} />}
        {kind === 'ticket' && <TicketArt serial={Number(data.serials) || 9} />}
        {kind === 'gifts' && <GiftsArt gifts={gifts.length ? gifts : ['Two extra privates', 'Guest passes']} />}
      </div>
      {data.rules && <p className="am-stage-rule">{data.rules}</p>}
    </section>
  );
}

/* ── Miniatures ─────────────────────────────────────────────────────────────
   The cover uses the same three mechanics at a smaller size, as a strip of what can be
   played this month. Each one opens the month plan. */

export function MechanicMini({ kind, onOpen }: { kind: MechanicKind; onOpen: () => void }) {
  return (
    <button type="button" className={`am-mini is-${kind}`} onClick={onOpen}>
      <span className="am-mini-art" aria-hidden="true">
        {kind === 'wheel' && <span className="am-mini-wheel" />}
        {kind === 'ticket' && <span className="am-mini-ticket" />}
        {kind === 'gifts' && (
          <span className="am-mini-gifts">
            {Array.from({ length: 9 }).map((_, i) => (
              <i key={i} style={{ ['--i' as string]: i } as React.CSSProperties} />
            ))}
          </span>
        )}
      </span>
      <span className="am-mini-copy">
        {kind === 'wheel' && (
          <>
            <b>Spin the wheel</b>
            <em>Nine wedges · every first class in April</em>
          </>
        )}
        {kind === 'ticket' && (
          <>
            <b>The golden ticket</b>
            <em>Nine posted per studio · one private, on us</em>
          </>
        )}
        {kind === 'gifts' && (
          <>
            <b>Nine years, nine gifts</b>
            <em>Renew in April · choose your number</em>
          </>
        )}
      </span>
    </button>
  );
}
