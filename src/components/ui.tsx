import React, { useEffect } from 'react';
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
    <span className={`hb ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 252 124" focusable="false">
        <defs>
          {/* The ink: deep at the foot of the trace, electric where it turns up into the
              numerals. It is fixed in the drawing's own space, so a single stroke walks
              the whole ramp as it is laid down. */}
          <linearGradient id={`${id}-ink`} x1="0" y1="118" x2="252" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0f3e93" />
            <stop offset="0.45" stopColor="#1d5cd0" />
            <stop offset="0.8" stopColor="#2f74e8" />
            <stop offset="1" stopColor="#4384ef" />
          </linearGradient>

          {/* The aura the whole mark sits in, and the soft edge of the paper rule. */}
          <radialGradient id={`${id}-aura`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#2f74e8" stopOpacity="0.1" />
            <stop offset="0.42" stopColor="#2f74e8" stopOpacity="0.05" />
            <stop offset="0.72" stopColor="#2f74e8" stopOpacity="0.015" />
            <stop offset="1" stopColor="#2f74e8" stopOpacity="0" />
          </radialGradient>
          {/* A straight line has no height, so this has to be measured in user units or
              the gradient box collapses and the rule paints nothing at all. */}
          <linearGradient id={`${id}-rule`} x1="-28" y1="0" x2="280" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--ink)" stopOpacity="0" />
            <stop offset="0.16" stopColor="var(--ink)" stopOpacity="0.3" />
            <stop offset="0.84" stopColor="var(--ink)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--ink)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* The rule the trace sits on: a hairline that runs past the mark and fades, so
            the composition has a horizon rather than a floating scribble. */}
        <path className="hb-rule" d="M -28 100 L 280 100" stroke={`url(#${id}-rule)`} />
        <ellipse className="hb-aura" cx="126" cy="64" rx="154" ry="74" fill={`url(#${id}-aura)`} />

        {/* What has not been written yet. */}
        <path className="hb-track" d={HEART_MARK} />

        <g className="hb-ink">
          <path className="hb-trail" d={HEART_MARK} pathLength={100} />
          <path className="hb-fill" d={HEART_MARK} pathLength={100} stroke={`url(#${id}-ink)`} />
          <path
            className="hb-lit"
            d={HEART_MARK}
            pathLength={100}
            stroke={`url(#${id}-lit)`}
            transform="translate(0 -1.15)"
          />
          <path className="hb-bloom" d={HEART_MARK} pathLength={100} />
          <path className="hb-core" d={HEART_MARK} pathLength={100} />
        </g>

        {/* The glint that runs the finished mark. */}
        <path className="hb-glint" d={HEART_MARK} pathLength={100} />
      </svg>
    </span>
  );
}

export function Loading({ label = 'Loading intelligence…' }: { label?: string }) {
  return (
    <div className="loading p57-loader" role="status" aria-live="polite" aria-label={label}>
      <Heartbeat />
    </div>
  );
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
