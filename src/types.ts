export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  assigned_studio_id: number | null;
  permissions: string[];
}
export interface Studio {
  id: number;
  name: string;
  code: string;
  city: string;
  active: number;
  max_discount_percent: number;
  monthly_capacity: number | null;
}
export interface Product {
  id: number;
  studio_id: number;
  name: string;
  category: string;
  list_price: number | null;
  variable_cost: number | null;
  sessions_included: number;
  validity_days: number | null;
}
export interface Bootstrap {
  user: User;
  studios: Studio[];
  products: Product[];
  years: number[];
  planningYear: number;
  aiConfigured: boolean;
  aiModel: string | null;
  coverage: any;
  permissions: Record<string, string[]>;
  targetScenario: 'standard' | 'aggressive' | 'aspirational';
  demo: { enabled: boolean; label: string };
}
export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const SEGMENTS = [
  ['new_leads', 'New leads'],
  ['unconverted_trials', 'Unconverted trial attendees'],
  ['first_time_purchasers', 'First-time purchasers'],
  ['active_customers', 'Active customers'],
  ['frequent_purchasers', 'Frequent purchasers'],
  ['approaching_expiry', 'Approaching expiry'],
  ['declining_attendance', 'Declining attendance'],
  ['recently_lapsed', 'Recently lapsed'],
  ['long_lapsed', 'Long-lapsed customers'],
  ['high_value', 'High-value customers'],
  ['promotion_sensitive', 'Promotion-sensitive customers'],
  ['reactivated', 'Reactivated customers'],
];
export const OBJECTIVES = [
  ['acquisition', 'Acquire new clients'],
  ['trial_conversion', 'Improve trial conversion'],
  ['retention', 'Improve renewal and retention'],
  ['reactivation', 'Reactivate lapsed clients'],
  ['revenue_gap', 'Close a revenue shortfall'],
  ['additional_purchase', 'Increase repeat purchases'],
  ['aov', 'Increase average transaction value'],
  ['annual_membership', 'Increase annual membership sales'],
  ['referral', 'Generate referral purchases'],
  ['anniversary', 'Maximise anniversary revenue'],
  ['reduce_discount', 'Reduce discount dependency'],
  ['weak_month', 'Strengthen a weak month'],
  ['unused_credits', 'Reduce unused package credits'],
  ['lead_source', 'Improve a specific lead source'],
  ['product_sales', 'Sell a specific package'],
];
export const money = (value: number | null | undefined, compact = false) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
        notation: compact ? 'compact' : 'standard',
      }).format(Number(value));
/** Compact money with enough precision to tell two similar figures apart ("₹5.11 Cr", not
    "₹5Cr"). KPI bands use this; tables keep the plain compact form. */
export const moneyShort = (value: number | null | undefined) => {
  const v = Number(value);
  if (value === null || value === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};
export const number = (value: number | null | undefined, maximumFractionDigits = 0) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : new Intl.NumberFormat('en-IN', { maximumFractionDigits }).format(Number(value));
export const percent = (value: number | null | undefined, digits = 1, ratio = false) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `${(Number(value) * (ratio ? 100 : 1)).toFixed(digits)}%`;
export const titleCase = (value: string | null | undefined) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
export const dateLabel = (value: string | null | undefined) =>
  value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
