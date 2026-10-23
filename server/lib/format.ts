export function money(value: unknown): number {
  if (value === null || value === undefined || value === '' || value === '-') return 0;
  const parsed = Number(String(value).replace(/[₹,\s]/g, '').replace(/%$/, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function integer(value: unknown): number {
  return Math.trunc(money(value));
}

export function parseDate(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text || text === '-') return null;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function parseMonth(value: unknown): string | null {
  const direct = parseDate(value);
  if (direct) return direct.slice(0, 7);
  const text = String(value ?? '').trim();
  const parsed = new Date(`1 ${text}`);
  return Number.isNaN(parsed.getTime()) ? null : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

export function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : null;
}

export function json<T>(value: T): string { return JSON.stringify(value); }
export function fromJson<T>(value: unknown, fallback: T): T {
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}
