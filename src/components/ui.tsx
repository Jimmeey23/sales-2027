import React, { useEffect } from 'react';
import { AlertCircle, Check, ChevronDown, Info, LoaderCircle, X } from 'lucide-react';
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
export function Loading({ label = 'Loading intelligence…' }: { label?: string }) {
  return (
    <div className="loading p57-loader" role="status" aria-live="polite">
      <span className="atl-orbit" aria-hidden="true">
        <i className="atl-orbit-arc" />
        <i className="atl-orbit-arc is-inner" />
        <i className="atl-orbit-arc is-outer" />
        <i className="atl-orbit-core" />
      </span>
      <span className="atl-loader-label">{label}</span>
      <span className="atl-loader-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
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
