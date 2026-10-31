import crypto from 'node:crypto';
import zlib from 'node:zlib';

// A planning screen is read far more often than it is written: the year plan asks for the same
// hundred kilobytes every time somebody opens the tab, and building it from SQLite (four
// locations of targets, plans, playbook items and economics) costs ~165 ms every time.
// This keeps the finished JSON — and its gzipped form — until the next write, which drops the
// whole card. So a read after an edit is always fresh, and reads in between are ~2 ms.
//
// Keys must be complete: everything that shapes the body goes in the key (year, the already
// access-filtered studio ids, any query options). Nothing user-specific is stored, because
// nothing user-specific is cached: the route resolves permissions before it builds a key.
interface Entry {
  at: number;
  json: string;
  gzip: Buffer;
  etag: string;
}
const entries = new Map<string, Entry>();
const MAX_ENTRIES = 40;

export function cachedJson(key: string, build: () => unknown): Entry {
  const hit = entries.get(key);
  if (hit) return hit;
  const json = JSON.stringify(build());
  const entry: Entry = {
    at: Date.now(),
    json,
    gzip: zlib.gzipSync(json, { level: 6 }),
    etag: `"${crypto.createHash('sha1').update(json).digest('base64url')}"`,
  };
  entries.set(key, entry);
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
  return entry;
}

/** Called on every write so the next read rebuilds from the database. */
export function clearJsonCache() {
  entries.clear();
}

/** Sends a cached body, gzipped when the client asked for it. */
export function sendCached(res: any, key: string, build: () => unknown) {
  const { json, gzip, etag } = cachedJson(key, build);
  res.setHeader('Vary', 'Accept-Encoding');
  res.setHeader('ETag', etag);
  if (res.req?.headers['if-none-match'] === etag) return res.status(304).end();
  if (/\bgzip\b/.test(String(res.req?.headers['accept-encoding'] || ''))) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(gzip);
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(json);
}
