export class ApiError extends Error {
  status: number;
  code?: string;
  conflicts?: any[];
  constructor(message: string, status: number, payload?: any) {
    super(message); this.status = status; this.code = payload?.code; this.conflicts = payload?.conflicts;
  }
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, { ...options, headers, credentials: 'same-origin' });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('p57-unauthorised'));
    throw new ApiError(typeof payload === 'object' ? payload.error || 'Request failed.' : payload, response.status, payload);
  }
  return payload as T;
}

export const post = <T = any>(path: string, body: any) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T = any>(path: string, body: any) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export function downloadUrl(path: string) {
  window.location.href = path.startsWith('/api') ? path : `/api${path}`;
}

export function downloadJson(filename: string, value: any) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: any[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (value: any) => `"${String(typeof value === 'object' ? JSON.stringify(value) : value ?? '').replaceAll('"', '""')}"`;
  const csv = [keys.map(escape).join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
