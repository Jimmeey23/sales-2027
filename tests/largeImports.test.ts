import type { Server } from 'node:http';
import { gzipSync } from 'node:zlib';
import express, { type ErrorRequestHandler } from 'express';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Real routes and a real schema, but never the developer's or production database.
const original = vi.hoisted(() => {
  const databasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = ':memory:';
  return { databasePath };
});
import { db } from '../server/db.js';
import { jsonRequestBody, STANDARD_JSON_LIMIT_BYTES } from '../server/lib/requestBody.js';
import registerPlanImportRoutes from '../server/routes/planImport.js';
import registerOfferImportRoutes from '../server/routes/offerImport.js';
import { IMPORT_REQUEST_LIMIT_BYTES, IMPORT_TOO_LARGE_MESSAGE } from '../src/lib/importLimits.js';

const app = express();
app.use(jsonRequestBody);
app.use((req, _res, next) => {
  const role = req.get('x-test-role') || 'administrator';
  if (role !== 'unauthenticated') {
    req.user = {
      id: 1,
      name: 'Import test',
      email: 'import-test@example.invalid',
      role: role === 'scoped' ? 'studio_manager' : role,
      assigned_studio_id: role === 'scoped' ? 2 : null,
      permissions:
        role === 'reader'
          ? ['read']
          : role === 'editor'
            ? ['target_edit', 'offer_edit']
            : ['target_edit', 'target_approve', 'offer_edit', 'offer_create', 'offer_approve'],
    };
  }
  next();
});
registerPlanImportRoutes(app);
registerOfferImportRoutes(app);
app.post(['/api/ordinary', '/api/plan/import/other'], (_req, res) => res.json({ ok: true }));
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  res.status(error.status || 500).json({ error: error.message, code: error.code });
};
app.use(errors);

let server: Server;
let origin: string;

beforeAll(async () => {
  db.prepare(
    "INSERT INTO users(id,email,name,password_hash,role) VALUES (1,'import-test@example.invalid','Import test','unused','administrator')",
  ).run();
  db.prepare(
    "INSERT INTO studios(id,name,code,city) VALUES (1,'Import studio','IMP1','Mumbai'),(2,'Other studio','IMP2','Mumbai')",
  ).run();
  await new Promise<void>(resolve => {
    server = app.listen(0, '0.0.0.0', () => {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected a test HTTP port.');
      origin = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});
beforeEach(() => db.exec('BEGIN'));
afterEach(() => db.exec('ROLLBACK'));
afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
  db.close();
  if (original.databasePath === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = original.databasePath;
});

const padding = 'Mumbai ₹7,500 — café, "quoted"\n'.repeat(120_000);
const note = 'Mumbai ₹7,500 — keep the original copy.\nA second line.';
const plan = () => ({
  schema: 'p57-sales-plan/1',
  year: 2027,
  studios: [
    {
      studio: { id: 1, name: 'Import studio' },
      months: [
        {
          month: 1,
          theme: 'Large plan · Mumbai',
          objective: 'Keep the imported target and copy.',
          target: 100_000,
          priorYear: 90_000,
          streams: { newClient: 20_000, renewal: 70_000, reactivation: 10_000, other: 0 },
          notes: note,
          offers: [],
        },
      ],
    },
  ],
  metadata: { sourceNotes: padding },
});
const offers = () => ({
  offers: [
    { name: 'Monsoon offer', expectedAsp: 7500, expectedRevenue: 75000, targetPurchases: 10, notes: note },
    { name: 'Leave this offer out' },
  ],
  metadata: { sourceNotes: padding },
});

function payloadFor(path: string, dryRun = true) {
  return path.toLowerCase().includes('/plan/')
    ? { text: JSON.stringify(plan()), studioId: 1, year: 2027, mode: 'modify', dryRun, approve: false, useRates: false }
    : {
        text: JSON.stringify(offers()),
        studioId: 1,
        year: 2027,
        mode: 'upsert',
        dryRun,
        month: 2,
        attach: true,
        bulk: { prefix: 'Imported · ', runAds: true },
        decisions: { '1': 'skip' },
      };
}

async function send(path: string, payload: unknown, gzip = true, role?: string) {
  const json = JSON.stringify(payload);
  const bytes = gzip ? gzipSync(json) : json;
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
      ...(role ? { 'x-test-role': role } : {}),
    },
    body: bytes,
  });
  return { status: response.status, body: (await response.json()) as any };
}

function counts() {
  return Object.fromEntries(
    ['offers', 'offer_versions', 'monthly_plans', 'monthly_targets', 'target_versions', 'audit_logs'].map(table => [
      table,
      (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as any).n,
    ]),
  );
}
const endpoints = ['/api/plan/import', '/api/offers/import'] as const;

describe('large import requests through the actual API routes', () => {
  it.each(endpoints)('previews %s above the old 3 MB limit without writing', async path => {
    const payload = payloadFor(path);
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeGreaterThan(STANDARD_JSON_LIMIT_BYTES);
    const before = counts();
    const result = await send(path, payload);
    expect(result.status).toBe(200);
    expect(result.body.dryRun).toBe(true);
    expect(counts()).toEqual(before);
    if (path.includes('/plan/')) {
      expect(result.body.totals).toMatchObject({ target: 100_000, months: 1 });
    } else {
      expect(result.body.summary).toMatchObject({ create: 1, skip: 1, error: 0 });
      expect(result.body.rows[0].name).toBe('Imported · Monsoon offer');
    }
  });

  it.each(endpoints)('also accepts legacy uncompressed %s requests above 3 MB', async path => {
    const result = await send(path, payloadFor(path), false);
    expect(result.status).toBe(200);
    expect(result.body.dryRun).toBe(true);
    expect(counts().offers).toBe(0);
    expect(counts().monthly_targets).toBe(0);
  });

  it('commits the same large compressed sales plan, preserving target and UTF-8 copy', async () => {
    const result = await send('/api/plan/import', payloadFor('/api/plan/import', false));
    expect(result.status).toBe(200);
    expect(result.body.dryRun).toBe(false);
    expect(result.body.summary).toMatchObject({ created: 1, months: 1 });
    expect(
      db.prepare('SELECT proposed_target,approved_target FROM monthly_targets WHERE studio_id=1 AND month=1').get(),
    ).toMatchObject({ proposed_target: 100_000, approved_target: null });
    expect(db.prepare('SELECT theme FROM monthly_plans WHERE studio_id=1 AND month=1').get()).toMatchObject({
      theme: 'Large plan · Mumbai',
    });
  });

  it('commits the same large compressed offers, preserving bulk edits, skipped rows and attachment', async () => {
    const result = await send('/api/offers/import', payloadFor('/api/offers/import', false));
    expect(result.status).toBe(200);
    expect(result.body.dryRun).toBe(false);
    expect(result.body.summary).toMatchObject({ create: 1, skip: 1, error: 0 });
    const offer = db
      .prepare('SELECT id,name,performance_notes,expected_asp,expected_revenue,run_ads FROM offers')
      .get() as any;
    expect(offer).toMatchObject({
      name: 'Imported · Monsoon offer',
      performance_notes: note,
      expected_asp: 7500,
      expected_revenue: 75000,
      run_ads: 1,
    });
    const selection = db.prepare('SELECT offer_ids FROM monthly_plans WHERE studio_id=1 AND month=2').get() as any;
    expect(JSON.parse(selection.offer_ids)).toContain(offer.id);
    expect(counts().offers).toBe(1);
  });

  it('previews a large CSV with quoted commas, newlines and UTF-8 copy', async () => {
    const quotedNote = `"${padding.replaceAll('"', '""')}"`;
    const text = `name,studio_id,expected_asp,expected_revenue,notes\nLarge CSV offer,1,7500,75000,${quotedNote}\n`;
    const before = counts();
    expect(Buffer.byteLength(text)).toBeGreaterThan(STANDARD_JSON_LIMIT_BYTES);
    const result = await send('/api/offers/import', { text, dryRun: true, mode: 'upsert', year: 2027 });
    expect(result.status).toBe(200);
    expect(result.body.summary).toMatchObject({ create: 1, error: 0 });
    expect(result.body.rows[0].name).toBe('Large CSV offer');
    expect(counts()).toEqual(before);
  });

  it('matches the API router for a case-insensitive path, trailing slash and query string', async () => {
    const result = await send('/api/PLAN/import/?preview=1', payloadFor('/api/plan/import'));
    expect(result.status).toBe(200);
  });

  it.each(endpoints)('rejects an over-limit inflated %s body before any writes', async path => {
    const before = counts();
    const result = await send(path, { text: 'x'.repeat(IMPORT_REQUEST_LIMIT_BYTES), dryRun: false });
    expect(result.status).toBe(413);
    expect(result.body).toMatchObject({ error: IMPORT_TOO_LARGE_MESSAGE, code: 'IMPORT_TOO_LARGE' });
    expect(counts()).toEqual(before);
  });

  it('also bounds an oversized plain import', async () => {
    const result = await send('/api/plan/import', { text: 'x'.repeat(IMPORT_REQUEST_LIMIT_BYTES) }, false);
    expect(result.status).toBe(413);
    expect(result.body.code).toBe('IMPORT_TOO_LARGE');
  });

  it.each(['/api/ordinary', '/api/plan/import/other'])('does not raise the normal limit for %s', async path => {
    for (const gzip of [false, true]) {
      const result = await send(path, { text: 'x'.repeat(STANDARD_JSON_LIMIT_BYTES) }, gzip);
      expect(result.status).toBe(413);
      expect(result.body).toMatchObject({ code: 'REQUEST_TOO_LARGE', error: expect.stringContaining('3 MB') });
    }
  });

  it.each(endpoints)('still enforces authentication and import permissions on %s', async path => {
    const before = counts();
    expect((await send(path, payloadFor(path), true, 'unauthenticated')).status).toBe(401);
    expect((await send(path, payloadFor(path), true, 'reader')).status).toBe(403);
    expect(counts()).toEqual(before);
  });

  it('preserves studio access checks on both imports', async () => {
    const before = counts();
    const planResult = await send('/api/plan/import', payloadFor('/api/plan/import', false), true, 'scoped');
    expect(planResult.status).toBe(403);
    const offerResult = await send('/api/offers/import', payloadFor('/api/offers/import', false), true, 'scoped');
    expect(offerResult.body.summary).toMatchObject({ create: 0, error: 1 });
    expect(offerResult.body.rows[0].messages.join(' ')).toContain('access scope');
    expect(counts().offers).toBe(before.offers);
    expect(counts().monthly_targets).toBe(before.monthly_targets);
  });

  it('preserves commit and approval permissions separately from preview', async () => {
    expect((await send('/api/offers/import', payloadFor('/api/offers/import'), true, 'editor')).status).toBe(200);
    expect((await send('/api/offers/import', payloadFor('/api/offers/import', false), true, 'editor')).status).toBe(
      403,
    );
    expect(
      (await send('/api/plan/import', { ...payloadFor('/api/plan/import'), approve: true }, true, 'editor')).status,
    ).toBe(403);
    expect(counts().offers).toBe(0);
    expect(counts().monthly_targets).toBe(0);
  });

  it('keeps the independent offer row-count limit', async () => {
    const result = await send('/api/offers/import', {
      text: JSON.stringify(Array.from({ length: 501 }, (_, i) => ({ name: `Offer ${i}` }))),
      studioId: 1,
    });
    expect(result.status).toBe(413);
    expect(result.body.error).toBe('Import at most 500 offers at a time.');
  });

  it('still validates JSON and rejects corrupt gzip', async () => {
    const invalidJson = await fetch(`${origin}/api/plan/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
      body: gzipSync('{'),
    });
    expect(invalidJson.status).toBe(400);
    await invalidJson.text();
    const invalidGzip = await fetch(`${origin}/api/offers/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
      body: 'not gzip',
    });
    expect(invalidGzip.status).toBe(400);
    await invalidGzip.text();
    expect(counts().offers).toBe(0);
    expect(counts().monthly_targets).toBe(0);
  });
});
