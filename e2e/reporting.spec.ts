import { test, expect } from '@playwright/test';

const savedName = 'Browser reporting verification';

test('advanced reporting catalogue, configuration, saved views, exports and responsive print layouts work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Monthly studio performance', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.report-catalogue-item')).toHaveCount(21);
  await expect(page.locator('.report-kpi')).toHaveCount(4);
  await expect(page.locator('.report-chart')).toBeVisible();
  await page.getByTitle('Line chart', { exact: true }).click();
  await expect(page.getByTitle('Line chart', { exact: true })).toHaveClass(/active/);

  await page.getByLabel('Global studio', { exact: true }).selectOption('1');
  const builder = page.locator('.report-builder-card');
  await builder.getByLabel('Report from month', { exact: true }).fill('2026-09');
  await builder.getByLabel('Report to month', { exact: true }).fill('2026-09');
  await builder.getByRole('button', { name: 'Run report', exact: true }).click();
  await expect(page.locator('.report-result.is-refreshing')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('tab', { name: /^Data table/ }).click();
  await expect(page.locator('.report-data-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.report-data-table tbody')).toContainText('Kemps Corner');
  await expect(page.locator('.report-data-table tbody')).toContainText('2026-09');

  await page.getByRole('button', { name: /^Columns/ }).click();
  const columnDialog = page.getByRole('dialog');
  await columnDialog.locator('label').filter({ hasText: 'City' }).getByRole('checkbox').uncheck();
  await columnDialog.getByRole('button', { name: 'Apply & run', exact: true }).click();
  await expect(page.locator('.report-result.is-refreshing')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.report-data-table thead')).not.toContainText('City');
  await expect(page.locator('.report-data-table thead')).toContainText('Observed revenue');

  await page.getByRole('button', { name: 'Save view', exact: true }).click();
  await page.getByLabel('Saved view name', { exact: true }).fill(savedName);
  await page.getByRole('button', { name: 'Save view', exact: true }).last().click();
  await expect(page.getByText(`Saved view “${savedName}” created.`, { exact: true })).toBeVisible();

  await page.locator('.report-catalogue-item').filter({ hasText: 'Discount exposure & revenue quality' }).click();
  await expect(page.getByRole('heading', { name: 'Discount exposure & revenue quality', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('button', { name: /Saved views/ }).click();
  const savedDialog = page.getByRole('dialog');
  await savedDialog.locator('.saved-report-open').filter({ hasText: savedName }).click();
  await expect(page.getByRole('heading', { name: 'Monthly studio performance', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole('tab', { name: /^Data table/ }).click();
  await expect(page.locator('.report-data-table thead')).not.toContainText('City');

  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toMatch(/monthly-performance.*\.csv$/);
  expect(await csv.failure()).toBeNull();
  const xlsxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'XLSX', exact: true }).click();
  const xlsx = await xlsxDownload;
  expect(xlsx.suggestedFilename()).toMatch(/monthly-performance.*\.xlsx$/);
  expect(await xlsx.failure()).toBeNull();

  await page.getByRole('button', { name: /Saved views/ }).click();
  const deleteDialog = page.getByRole('dialog');
  const savedRow = deleteDialog.locator('.saved-report-list > div').filter({ hasText: savedName });
  page.once('dialog', dialog => dialog.accept());
  await savedRow.getByRole('button', { name: `Delete saved view ${savedName}`, exact: true }).click();
  await expect(deleteDialog.locator('.saved-report-list')).not.toContainText(savedName);
  await deleteDialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.locator('.report-catalogue-item').filter({ hasText: 'Membership renewals due' }).click();
  await page.getByLabel('Global studio', { exact: true }).selectOption('3');
  await builder.getByLabel('Report from month', { exact: true }).fill('2026-11');
  await builder.getByLabel('Report to month', { exact: true }).fill('2026-11');
  await builder.getByRole('button', { name: 'Run report', exact: true }).click();
  await expect(page.locator('.report-result.is-refreshing')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('tab', { name: /^Data table/ }).click();
  await expect(page.locator('.report-data-table tbody')).toContainText('Kenkere House');
  await expect(page.locator('.report-data-table thead')).toContainText('Known paid due value');
  await page.getByRole('tab', { name: 'Definitions & provenance', exact: true }).click();
  await expect(page.getByText(/Only Active, New and Frozen open packages are due/).first()).toBeVisible();
  await expect(page.getByText(/No future conversion is assumed/).first()).toBeVisible();

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.report-print-only')).toBeVisible();
  await expect(page.locator('.report-builder-card')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Monthly studio performance', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.report-result.is-refreshing')).toHaveCount(0, { timeout: 20000 });
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 2);
  await page.screenshot({ path: 'artifacts/reporting-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'artifacts/reporting-desktop.png', fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('identical reruns, reset and consolidated studio changes never clear a valid report', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/reports');
  await expect(page.locator('.report-kpi')).toHaveCount(4, { timeout: 20000 });
  await page.getByRole('button', { name: 'Run report', exact: true }).click();
  await expect(page.locator('.report-kpi')).toHaveCount(4, { timeout: 20000 });
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.report-kpi')).toHaveCount(4, { timeout: 20000 });
  await expect(page.locator('.report-chart')).toBeVisible();
  await page.locator('.report-catalogue-item').filter({ hasText: 'Import lineage & reconciliation' }).click();
  await expect(page.getByRole('heading', { name: 'Import lineage & reconciliation', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.report-kpi')).toHaveCount(4, { timeout: 20000 });
  await expect(page.locator('input[value="Consolidated business"]')).toBeDisabled();
  await page.getByLabel('Global studio', { exact: true }).selectOption('1');
  await expect(page.locator('.report-kpi')).toHaveCount(4);
  await expect(page.locator('.report-result-meta')).toContainText('matching rows');
  await expect(page.getByText('Something needs attention', { exact: true })).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
