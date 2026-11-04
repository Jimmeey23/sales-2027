import { gunzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';

// Run against a seeded direct-workspace server. Previews use the real API;
// commits are intercepted, so this suite never writes to the workspace database.
const padding = 'Mumbai ₹7,500 — café, "quoted"\n'.repeat(150_000);
const planText = JSON.stringify({
  schema: 'p57-sales-plan/1',
  year: 2027,
  studios: [
    { studio: { id: 1 }, months: [{ month: 1, theme: 'Large import regression', target: 100000, offers: [] }] },
  ],
  metadata: { sourceNotes: padding },
});
const offerText = JSON.stringify({
  offers: [{ name: 'Large import regression — Mumbai', studioId: 1, expectedAsp: 7500, expectedRevenue: 75000 }],
  metadata: { sourceNotes: padding },
});

async function openImport(page: Page, kind: 'plan' | 'offers') {
  await page.addInitScript(() => localStorage.setItem('p57-location', '1'));
  await page.goto('/sales-plan/plan');
  await page.getByRole('button', { name: kind === 'plan' ? 'Import plan' : 'Import offers', exact: true }).click();
  return page.getByRole('dialog', { name: kind === 'plan' ? 'Import the 2027 plan' : 'Import offers', exact: true });
}

for (const kind of ['plan', 'offers'] as const) {
  test(`uploads a large ${kind} file with gzip for preview and commit`, async ({ page }) => {
    const text = kind === 'plan' ? planText : offerText;
    const endpoint = kind === 'plan' ? '/api/plan/import' : '/api/offers/import';
    const seen: Array<{ dryRun: boolean; bytes: number }> = [];
    let preview: any;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.route(`**${endpoint}`, async route => {
      const request = route.request();
      const body = request.postDataBuffer()!;
      expect(request.headers()['content-encoding']).toBe('gzip');
      expect(body.length).toBeLessThan(4 * 1024 * 1024);
      const payload = JSON.parse(gunzipSync(body).toString('utf8'));
      expect(payload.text).toBe(text);
      expect(payload.mode).toBe(kind === 'plan' ? 'modify' : 'upsert');
      expect(payload.year).toBe(2027);
      seen.push({ dryRun: payload.dryRun, bytes: body.length });
      if (payload.dryRun === true) {
        await route.continue();
      } else {
        // A real commit is covered with an in-memory DB in largeImports.test.ts.
        await route.fulfill({
          json: {
            ...preview,
            dryRun: false,
            summary:
              kind === 'plan'
                ? { months: 1, created: 0, updated: 1, offers: 0 }
                : { create: 1, update: 0, skip: 0, error: 0 },
          },
        });
      }
    });

    const dialog = await openImport(page, kind);
    const file = { name: `large-${kind}.json`, mimeType: 'application/json', buffer: Buffer.from(text) };
    expect(file.buffer.length).toBeGreaterThan(3 * 1024 * 1024);
    const responsePromise = page.waitForResponse(response => response.url().endsWith(endpoint));
    await dialog.locator('input[type="file"]').setInputFiles(file);
    if (kind === 'plan') await dialog.getByRole('button', { name: 'Preview', exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    preview = await response.json();
    expect(preview.dryRun).toBe(true);
    if (kind === 'offers') expect(preview.summary).toMatchObject({ create: 1, error: 0 });
    await expect(dialog.locator('.pex-error')).toHaveCount(0);
    await expect(dialog.locator('.pex-go')).toBeEnabled();

    if (kind === 'plan') {
      // Changing the document must invalidate its preview. Selecting that same
      // file again must work too (the hidden file input is reset after reading).
      await dialog.locator('.pex-code').fill('{}');
      await expect(dialog.locator('.pex-go')).toBeDisabled();
      await expect(dialog.locator('.pex-rows')).toHaveCount(0);
      const secondPreview = page.waitForResponse(result => result.url().endsWith(endpoint));
      await dialog.locator('input[type="file"]').setInputFiles(file);
      await dialog.getByRole('button', { name: 'Preview', exact: true }).click();
      expect((await secondPreview).status()).toBe(200);
      await expect(dialog.locator('.pex-go')).toBeEnabled();
    }

    await dialog.locator('.pex-go').click();
    await expect(dialog.locator('.pex-done')).toBeVisible();
    expect(seen.at(-1)?.dryRun).toBe(false);
    expect(seen.filter(request => request.dryRun)).toHaveLength(kind === 'plan' ? 2 : 1);
    expect(errors).toEqual([]);
  });
}

test('rejects an oversized selected file before sending an import request', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/offers/import', async route => {
    requests.push(route.request().url());
    await route.abort();
  });
  const dialog = await openImport(page, 'offers');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'too-large.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1, 'x'),
  });
  await expect(dialog.locator('.pex-error')).toContainText('25 MB before compression');
  await expect(dialog.locator('.pex-go')).toBeDisabled();
  expect(requests).toEqual([]);
});
