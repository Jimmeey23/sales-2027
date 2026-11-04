import { randomBytes } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api.js';
import { postImport, readImportFile } from '../src/lib/importRequest.js';
import {
  IMPORT_REQUEST_LIMIT_BYTES,
  IMPORT_TOO_LARGE_MESSAGE,
  IMPORT_UPLOAD_LIMIT_BYTES,
} from '../src/lib/importLimits.js';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('shared sales-plan and offer import transport', () => {
  it.each(['/plan/import', '/offers/import'] as const)('keeps small %s requests compatible', async path => {
    const payload = { text: '[{"name":"Mumbai — ₹7,500"}]', dryRun: true, mode: 'add', studioId: 1, year: 2027 };
    expect(await postImport(path, payload)).toEqual({ ok: true });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api${path}`);
    expect(options?.method).toBe('POST');
    expect(options?.credentials).toBe('same-origin');
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(options?.headers).has('Content-Encoding')).toBe(false);
    expect(JSON.parse(options?.body as string)).toEqual(payload);
  });

  it.each([
    ['/plan/import', true],
    ['/plan/import', false],
    ['/offers/import', true],
    ['/offers/import', false],
  ] as const)('gzips large %s requests (dryRun=%s) without changing text or options', async (path, dryRun) => {
    const payload = {
      text: 'Mumbai ₹7,500 — café, "quoted"\n'.repeat(150_000),
      dryRun,
      mode: path === '/plan/import' ? 'modify' : 'upsert',
      studioId: 1,
      year: 2027,
      month: 2,
      attach: true,
      approve: false,
      useRates: true,
      bulk: { prefix: 'Monsoon · ', scalePrice: 1.25, notes: 'Keep ₹ and newlines.\nSecond line.' },
      decisions: { '1': 'skip' },
    };
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeGreaterThan(3 * 1024 * 1024);
    await postImport(path, payload);
    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options?.headers).get('Content-Encoding')).toBe('gzip');
    expect(options?.body).toBeInstanceOf(Blob);
    const body = options?.body as Blob;
    expect(body.size).toBeLessThan(IMPORT_UPLOAD_LIMIT_BYTES);
    const decoded = gunzipSync(Buffer.from(await body.arrayBuffer())).toString('utf8');
    expect(JSON.parse(decoded)).toEqual(payload);
  });

  it('checks UTF-8 request bytes, not JavaScript character counts, before fetching', async () => {
    const text = '₹'.repeat(Math.ceil(IMPORT_REQUEST_LIMIT_BYTES / 3));
    expect(text.length).toBeLessThan(IMPORT_REQUEST_LIMIT_BYTES);
    await expect(postImport('/plan/import', { text })).rejects.toMatchObject({
      status: 413,
      code: 'IMPORT_TOO_LARGE',
      message: IMPORT_TOO_LARGE_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks file size before loading it into memory', async () => {
    const text = vi.fn(async () => 'too large');
    await expect(readImportFile({ size: IMPORT_REQUEST_LIMIT_BYTES + 1, text })).rejects.toBeInstanceOf(ApiError);
    expect(text).not.toHaveBeenCalled();
    expect(await readImportFile({ size: 20, text: async () => 'Mumbai ₹7,500' })).toBe('Mumbai ₹7,500');
  });

  it('allows a bounded plain request when browser compression is unavailable', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const payload = { text: 'x'.repeat(3 * 1024 * 1024 + 1), dryRun: true };
    await postImport('/offers/import', payload);
    const [, options] = fetchMock.mock.calls[0];
    expect(new Headers(options?.headers).has('Content-Encoding')).toBe(false);
    expect(JSON.parse(options?.body as string)).toEqual(payload);
  });

  it('does not fall back to a hosting-limit-breaking upload without browser compression', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    await expect(postImport('/offers/import', { text: 'x'.repeat(IMPORT_UPLOAD_LIMIT_BYTES) })).rejects.toMatchObject({
      status: 413,
      code: 'IMPORT_UPLOAD_TOO_LARGE',
      message: expect.stringContaining('up-to-date browser'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles a compression failure without sending an oversized fallback', async () => {
    vi.stubGlobal(
      'CompressionStream',
      class {
        constructor() {
          throw new Error('Unavailable');
        }
      },
    );
    await expect(postImport('/plan/import', { text: 'x'.repeat(IMPORT_UPLOAD_LIMIT_BYTES) })).rejects.toMatchObject({
      code: 'IMPORT_UPLOAD_TOO_LARGE',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounds incompressible requests by compressed upload bytes too', async () => {
    const payload = { text: randomBytes(6 * 1024 * 1024).toString('base64') };
    await expect(postImport('/offers/import', payload)).rejects.toMatchObject({
      code: 'IMPORT_UPLOAD_TOO_LARGE',
      message: expect.stringContaining('even after compression'),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['request entity too large', '<html>FUNCTION_PAYLOAD_TOO_LARGE</html>'])(
    'turns a non-JSON hosting 413 into a helpful message',
    async response => {
      fetchMock.mockResolvedValueOnce(new Response(response, { status: 413 }));
      await expect(postImport('/plan/import', { text: '{}' })).rejects.toMatchObject({
        status: 413,
        message: expect.stringContaining('smaller file'),
      });
    },
  );

  it('preserves a specific API 413 such as the offer row-count limit', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Import at most 500 offers at a time.' }, { status: 413 }));
    await expect(postImport('/offers/import', { text: '[]' })).rejects.toMatchObject({
      status: 413,
      message: 'Import at most 500 offers at a time.',
    });
  });
});
