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
/* One heartbeat, drawn as a path so the trace can travel along it. Three beats sit
   side by side; the bright segment runs the length of the path and reads as a pulse
   moving through a resting line. Built here rather than hand-written so the geometry
   stays symmetrical. */
const ECG_BEATS = 3;
const ECG_BEAT = 64;
const ECG_BASELINE = 20;
const ECG_PATH = Array.from({ length: ECG_BEATS }, (_, i) => {
  const b = i * ECG_BEAT;
  const lead = i === 0 ? `M 0 ${ECG_BASELINE}` : '';
  return (
    `${lead} L ${b + 10} ${ECG_BASELINE}` +
    // P wave — the small atrial rise before the beat.
    ` C ${b + 13} ${ECG_BASELINE} ${b + 14} 16.5 ${b + 17} 16.5` +
    ` C ${b + 20} 16.5 ${b + 21} ${ECG_BASELINE} ${b + 24} ${ECG_BASELINE}` +
    // QRS — the beat itself.
    ` L ${b + 28} ${ECG_BASELINE} L ${b + 30.5} 23 L ${b + 34} 3 L ${b + 37.5} 31 L ${b + 40} ${ECG_BASELINE}` +
    // T wave — the recovery.
    ` L ${b + 46} ${ECG_BASELINE}` +
    ` C ${b + 49} ${ECG_BASELINE} ${b + 50} 14 ${b + 53} 14` +
    ` C ${b + 56} 14 ${b + 57} ${ECG_BASELINE} ${b + 60} ${ECG_BASELINE}` +
    ` L ${b + ECG_BEAT} ${ECG_BASELINE}`
  );
}).join(' ');

/* The waiting mark: a heartbeat wave, and nothing else. No label, no dots, no mark
   stacked beside it — the pulse is the whole state. The label survives only as the
   accessible name, for screen readers. */
export function Heartbeat({ className = '' }: { className?: string }) {
  return (
    <span className={`hb ${className}`.trim()} aria-hidden="true">
      <svg viewBox={`0 0 ${ECG_BEATS * ECG_BEAT} 40`} focusable="false">
        <path className="hb-track" d={ECG_PATH} />
        <path className="hb-glow" d={ECG_PATH} pathLength={100} />
        <path className="hb-trace" d={ECG_PATH} pathLength={100} />
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
