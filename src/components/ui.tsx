import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, ChevronDown, Info, X } from 'lucide-react';
import { titleCase } from '../types';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = 'neutral',
  dot = false,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'dark';
  dot?: boolean;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const tone = ['approved', 'active', 'on_track', 'committed', 'completed'].includes(status)
    ? 'green'
    : ['pending', 'at_risk', 'proposed', 'validating', 'under_review', 'scheduled'].includes(status)
      ? 'amber'
      : ['rejected', 'below_target', 'failed', 'archived'].includes(status)
        ? 'red'
        : ['ai', 'openai', 'rules_engine'].includes(status)
          ? 'purple'
          : 'neutral';
  return (
    <Badge tone={tone as any} dot>
      {titleCase(status)}
    </Badge>
  );
}
export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  );
}
export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="card-actions">{action}</div>}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  trend,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {(detail || trend) && (
        <div className="metric-detail">
          {trend}
          {detail}
        </div>
      )}
    </div>
  );
}
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = '',
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">
        {label}
        {required && <span className="required"> *</span>}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-wrap">
      <select {...props}>{children}</select>
      <ChevronDown size={14} />
    </span>
  );
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string; count?: number }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map(item => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          className={value === item.id ? 'active' : ''}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  width = '720px',
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
export function Drawer({
  title,
  subtitle,
  children,
  onClose,
  footer,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="drawer-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </aside>
    </div>
  );
}
/* The waiting mark, and the only thing on the waiting screen: one pen line, drawn
   without ever lifting. It enters on the baseline, beats, and then keeps writing — the
   same line opens into the bowl of the 5, climbs its stem, and runs its bar straight on
   into the 7: the two digits share the one top rule, which is what makes the mark read
   as a single waveform rather than as two marks set side by side. From the end of that
   rule the line drops the 7's leg, settles back onto the baseline and closes with one
   last small wave.

   Because it is one path, the blue fills along it in one unbroken sweep. The numbers
   below are the measured arc length, which is what paces the draw. */
const HEART_MARK =
  'M 0 100 L 10 100' +
  // P wave — the small atrial rise before the beat.
  ' C 14 100 16 88 20 88 C 24 88 26 100 30 100' +
  // QRS — the beat itself.
  ' L 33 100 L 35 109 L 38 26 L 41.5 113 L 44 100' +
  // T wave — the recovery.
  ' L 47 100 C 51 100 53 86 57 86 C 61 86 63 100 67 100' +
  // The trace lands and the bowl of the 5 opens around it.
  ' C 74 100 80 97 88 92' +
  ' C 102 88 112 76 106 65' +
  ' C 101 57 92 54 84 57' +
  // The stem, then the rule that carries the pen from the 5 into the 7.
  ' C 82 52 81 45 82 39' +
  ' L 176 39' +
  // The 7's leg, its foot, and the wave that settles the line.
  ' L 148 90' +
  ' C 146 95 147 98 150 100' +
  ' L 166 100' +
  ' C 170 100 172 86 176 86 C 180 86 182 100 186 100' +
  ' L 240 100';

/* The waiting state. The blue is not decoration and not a progress bar: it is the trace
   being written, in one pass, and the drawing is built up the way a line of ink is —
   the ink bleeding a little into the paper under the stroke, a soft bloom carried on the
   nib, and a short comet of wet ink dragging behind the tip.

   Once the mark is complete a glint runs its whole length, the way light catches a
   freshly written line, and then it lets go and the next beat starts. Everything is
   driven by the same two dozen lines of CSS: no timers, no JS, no canvas. */
export function Heartbeat({ className = '' }: { className?: string }) {
  const id = React.useId();
  return (
    <span
      className={`hb ${className}`.trim()}
      aria-hidden="true"
      style={
        {
          // Two inks per instance: the stylesheet picks one by where the mark is used.
          '--hb-neon': `url(#${id}-ink)`,
          '--hb-paper': `url(#${id}-ink-paper)`,
        } as React.CSSProperties
      }
    >
      <svg viewBox="0 0 252 124" focusable="false">
        <defs>
          {/* The ink: deep at the foot of the trace, electric where it turns up into the
              numerals. It is fixed in the drawing's own space, so a single stroke walks
              the whole ramp as it is laid down. */}
          {/* Neon, twice over: the trace that enters and beats runs warm, and the moment it
              turns into the numerals the colour changes — one stroke, two neons, with the
              seam hidden in the corner where the 5 begins. */}
          <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="252" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE9B8" />
            <stop offset="0.1" stopColor="#FFD27A" />
            <stop offset="0.232" stopColor="#FFB84D" />
            <stop offset="0.236" stopColor="#B7EDFF" />
            <stop offset="0.46" stopColor="#7CD8FA" />
            <stop offset="0.62" stopColor="#CFF2FF" />
            <stop offset="1" stopColor="#8CE2FF" />
          </linearGradient>

          {/* The same drawing in ink, for the places it is printed rather than lit: neon
              cannot glow on paper, so the trace goes deep amber and the 57 goes teal. */}
          <linearGradient id={`${id}-ink-paper`} x1="0" y1="0" x2="252" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#C58A22" />
            <stop offset="0.232" stopColor="#A76F12" />
            <stop offset="0.236" stopColor="#1C7C9C" />
            <stop offset="0.7" stopColor="#14688A" />
            <stop offset="1" stopColor="#1C7C9C" />
          </linearGradient>

          {/* The aura the whole mark sits in, and the soft edge of the paper rule. */}
          <radialGradient id={`${id}-aura`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFC24A" stopOpacity="0.2" />
            <stop offset="0.42" stopColor="#FF9E2C" stopOpacity="0.1" />
            <stop offset="0.72" stopColor="#FFC24A" stopOpacity="0.035" />
            <stop offset="1" stopColor="#FFC24A" stopOpacity="0" />
          </radialGradient>
          {/* The cool lamp under the numerals. */}
          <radialGradient id={`${id}-aura-cool`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#9EE6FF" stopOpacity="0.2" />
            <stop offset="0.44" stopColor="#5DC7F0" stopOpacity="0.1" />
            <stop offset="0.74" stopColor="#7CD8FA" stopOpacity="0.03" />
            <stop offset="1" stopColor="#7CD8FA" stopOpacity="0" />
          </radialGradient>
          {/* A straight line has no height, so this has to be measured in user units or
              the gradient box collapses and the rule paints nothing at all. */}
          <linearGradient id={`${id}-rule`} x1="-28" y1="0" x2="280" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE7B0" stopOpacity="0" />
            <stop offset="0.16" stopColor="#FFE7B0" stopOpacity="0.24" />
            <stop offset="0.84" stopColor="#FFE7B0" stopOpacity="0.24" />
            <stop offset="1" stopColor="#FFE7B0" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* The rule the trace sits on: a hairline that runs past the mark and fades, so
            the composition has a horizon rather than a floating scribble. */}
        <path className="hb-rule" d="M -28 100 L 280 100" stroke={`url(#${id}-rule)`} />
        <ellipse className="hb-aura" cx="96" cy="66" rx="150" ry="76" fill={`url(#${id}-aura)`} />
        <ellipse className="hb-aura hb-aura-cool" cx="176" cy="60" rx="120" ry="72" fill={`url(#${id}-aura-cool)`} />

        {/* What has not been written yet. */}
        <path className="hb-track" d={HEART_MARK} />

        <g className="hb-ink">
          {/* The wet edge under the stroke, so the neon sits in the room rather than on it. */}
          <path className="hb-bleed" d={HEART_MARK} pathLength={100} />
          <path className="hb-trail" d={HEART_MARK} pathLength={100} />
          <path className="hb-fill" d={HEART_MARK} pathLength={100} />
          <path className="hb-bloom" d={HEART_MARK} pathLength={100} />
          <path className="hb-core" d={HEART_MARK} pathLength={100} />
        </g>

        {/* The glint that runs the finished mark. */}
        <path className="hb-glint" d={HEART_MARK} pathLength={100} />
      </svg>
    </span>
  );
}

/* The circuit-chip mark: eight traces carry coloured pulses into a chip that reads "Loading".
   Gradient ids are per-instance so two loaders on one page never share a definition. */
const CHIP_TRACES: [string, string][] = [
  ['M100 100 H200 V210 H326', 'purple'],
  ['M80 180 H180 V230 H326', 'blue'],
  ['M60 260 H150 V250 H326', 'yellow'],
  ['M100 350 H200 V270 H326', 'green'],
  ['M700 90 H560 V210 H474', 'blue'],
  ['M740 160 H580 V230 H474', 'green'],
  ['M720 250 H590 V250 H474', 'red'],
  ['M680 340 H570 V270 H474', 'yellow'],
];
const CHIP_PINS = [205, 225, 245, 265];
const CHIP_ENDS: [number, number][] = [
  [100, 100], [80, 180], [60, 260], [100, 350],
  [700, 90], [740, 160], [720, 250], [680, 340],
];

export function ChipLoader({ label = 'Loading' }: { label?: string }) {
  const uid = useId().replace(/:/g, '');
  const chip = `chip-${uid}`, text = `text-${uid}`, pin = `pin-${uid}`;
  return (
    <div className="chip-loader" aria-hidden="true">
      <svg viewBox="0 -10 800 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={chip} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d2d2d" />
            <stop offset="100%" stopColor="#0f0f0f" />
          </linearGradient>
          <linearGradient id={text} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eeeeee" />
            <stop offset="100%" stopColor="#888888" />
          </linearGradient>
          <linearGradient id={pin} x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#bbbbbb" />
            <stop offset="50%" stopColor="#888888" />
            <stop offset="100%" stopColor="#555555" />
          </linearGradient>
        </defs>
        <g>
          {CHIP_TRACES.map(([d, colour], i) => (
            <React.Fragment key={i}>
              <path d={d} className="trace-bg" />
              <path d={d} className={`trace-flow ${colour}`} />
            </React.Fragment>
          ))}
        </g>
        <rect x="330" y="190" width="140" height="100" rx="20" ry="20" fill={`url(#${chip})`} stroke="#222" strokeWidth="3" className="chip-body" />
        {[322, 470].map(x =>
          CHIP_PINS.map(y => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="10" rx="2" fill={`url(#${pin})`} className="chip-pin" />),
        )}
        <text
          x="400"
          y="241"
          fontFamily="var(--font-sans, Arial, sans-serif)"
          fontSize="20"
          fontWeight="700"
          letterSpacing="2"
          fill="#f5f1e8"
          textAnchor="middle"
          dominantBaseline="middle"
          className="chip-text"
        >
          {label.toUpperCase()}
        </text>
        {CHIP_ENDS.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="black" />
        ))}
      </svg>
    </div>
  );
}

/* Two weights of the same wait. Inside a panel the mark sits on its own dark stage — the
   only way neon stays neon on paper — with the sentence that says what is being fetched and
   a hairline that runs while it runs. When the whole screen is being replaced (`screen`) the
   stage dissolves, what was there dims, and the mark takes the middle of the viewport, so
   the wait never looks like a broken page.

   The caption is not decoration: a bare mark leaves the reader guessing what is slow, and
   the label was already being written for screen readers only. It reads the same now. */
export function Loading({ label = 'Loading intelligence…', screen = false }: { label?: string; screen?: boolean }) {
  // The label already ends in an ellipsis in most call sites; the dots below say that the
  // sentence is continuing, so saying it twice would only stutter.
  const caption = String(label).replace(/[\u2026.]+\s*$/, '');
  const overlay = (
    <div
      className={`loading p57-loader${screen ? ' is-screen' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="p57-loader-stage">
        <span className="p57-pulse" aria-hidden="true" />
      </div>
    </div>
  );
  // Rendered at the page root: inside a transformed container (the month window) a fixed
  // overlay would be positioned against that container, not the screen.
  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
}

/* A skeleton row used where a list is about to arrive, so a slow fetch reads as
   content loading rather than a blank panel. */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="atl-skeleton" role="status" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} style={{ ['--i' as string]: i } as React.CSSProperties}>
          <i />
          <i />
          <i />
        </span>
      ))}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="empty-state error-state">
      <AlertCircle size={28} />
      <h3>Something needs attention</h3>
      <p>{message}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon || <Info size={28} />}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Progress({ value, max = 100, tone = 'green' }: { value: number; max?: number; tone?: string }) {
  return (
    <div className={`progress progress-${tone}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))}%` }} />
    </div>
  );
}
export function Callout({
  children,
  tone = 'info',
  title,
}: {
  children: React.ReactNode;
  tone?: 'info' | 'warning' | 'success' | 'danger';
  title?: string;
}) {
  return (
    <div className={`callout callout-${tone}`}>
      {tone === 'success' ? <Check size={18} /> : tone === 'info' ? <Info size={18} /> : <AlertCircle size={18} />}
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}
export function DefinitionList({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="definition-list">
      {items.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="table-scroll">{children}</div>;
}
