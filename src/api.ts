export class ApiError extends Error {
  status: number;
  code?: string;
  conflicts?: any[];
  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.status = status;
    this.code = payload?.code;
    this.conflicts = payload?.conflicts;
  }
}

/* Reads are cached, briefly, and identical in-flight reads share one request.

   Two things made navigation feel slow: the same GET fired two or three times over
   (StrictMode mounts an effect twice; a page often mounts two components that want the
   same list), and going back to a page refetched everything from scratch. Neither is a
   data problem — the plan does not change between two clicks — so the cache holds a
   response for a few seconds and any write clears it wholesale. That keeps the app
   honest: after a save, the next read is always a real one. */
const READ_TTL_MS = 20_000;
const cache = new Map<string, { at: number; value: any }>();
const inFlight = new Map<string, Promise<any>>();

/** Drop every cached read. Called after any write, and on sign-in/sign-out. */
export function invalidateApiCache() {
  cache.clear();
}
export function prefetch(path: string) {
  api(path).catch(() => {});
}

const cacheable = (method: string) => method === 'GET' || method === 'HEAD';

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const url = path.startsWith('/api') ? path : `/api${path}`;
  const method = (options.method || 'GET').toUpperCase();
  if (cacheable(method) && options.body === undefined && !options.signal) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < READ_TTL_MS) return hit.value as T;
    const pending = inFlight.get(url);
    if (pending) return pending as Promise<T>;
    const request = fetch(url, { ...options, headers, credentials: 'same-origin' }).then(
      async response => {
        const value = await readBody(response);
        inFlight.delete(url);
        if (hit === undefined || Date.now() - hit.at >= READ_TTL_MS) cache.set(url, { at: Date.now(), value });
        return value as T;
      },
      error => {
        inFlight.delete(url);
        throw error;
      },
    );
    inFlight.set(url, request);
    return request as Promise<T>;
  }
  if (!cacheable(method)) invalidateApiCache();
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  return (await readBody(response)) as T;
}

async function readBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('p57-unauthorised'));
    throw new ApiError(
      typeof payload === 'object' ? payload.error || 'Request failed.' : payload,
      response.status,
      payload,
    );
  }
  return payload;
}

export const post = <T = any>(path: string, body: any) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = <T = any>(path: string, body: any) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export function downloadUrl(path: string) {
  window.location.href = path.startsWith('/api') ? path : `/api${path}`;
}

export function downloadJson(filename: string, value: any) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: any[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const escape = (value: any) =>
    `"${String(typeof value === 'object' ? JSON.stringify(value) : (value ?? '')).replaceAll('"', '""')}"`;
  const csv = [keys.map(escape).join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
