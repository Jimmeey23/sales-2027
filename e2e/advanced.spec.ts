import { test, expect } from '@playwright/test';

test('advanced commercial, renewal, intelligence and Copilot journeys work end to end', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

  await page.goto('/offers');
  await page.getByRole('tab', { name: 'Offer experiments', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Newcomer offer experiments', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('No sourced outcomes', { exact: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Offer bank & comparison', exact: true }).click();
  await page.getByPlaceholder(/Try: offers that performed/).fill('The Year of Strong');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const annualRow = page.locator('tr').filter({ hasText: 'The Year of Strong' }).filter({ hasText: 'Kemps Corner' }).first();
  await expect(annualRow).toBeVisible({ timeout: 15000 });
  await annualRow.getByTitle('Edit', { exact: true }).click();
  await expect(page.getByRole('heading', { name: /Edit The Year of Strong/ })).toBeVisible({ timeout: 15000 });
  await page.getByRole('tab', { name: 'Benefits & costs', exact: true }).click();
  for (const [title, quantity] of [['Private sessions','2'],['Guest passes','4'],['Trainer consultations / check-ins','12']]) {
    const group = page.locator('details.benefit-group').filter({ hasText: title });
    await group.locator('summary').click();
    await expect(group.getByLabel('Quantity', { exact: true })).toHaveValue(quantity);
  }
  await expect(page.getByText('Incomplete · missing costs', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/annual-offer-builder.png', fullPage: true });

  await page.goto('/retention');
  await page.getByRole('tab', { name: 'Memberships due for renewal', exact: true }).click();
  await page.getByLabel('Global studio', { exact: true }).selectOption('3');
  const renewal = page.locator('.renewal-panel');
  await expect(renewal).toBeVisible({ timeout: 15000 });
  await renewal.getByLabel('Expiry month', { exact: true }).fill('2026-11');
  await renewal.getByLabel('Conversion scenario (%)', { exact: false }).fill('60');
  await renewal.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(renewal.getByText('Open memberships expiring', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(renewal.getByText('₹3,29,455', { exact: true }).first()).toBeVisible();
  await expect(renewal.getByText(/not a forecast/i).first()).toBeVisible();
  await expect(renewal.getByText('Historical renewal-coded revenue', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'artifacts/renewals-due.png', fullPage: true });

  await page.goto('/studios/3');
  await page.getByRole('tab', { name: 'Historic findings', exact: true }).click();
  await expect(page.getByText('Complete-month evidence through 2026-09', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Complete-month comparison register', exact: true })).toBeVisible();

  await page.goto('/planner');
  await page.getByRole('tab', { name: 'Nominal vs standard vs aggressive', exact: true }).click();
  const aggressive = page.locator('.scenario-card.aggressive');
  await expect(aggressive).toBeVisible({ timeout: 15000 });
  await expect(aggressive.getByText('Highest annual plan', { exact: true })).toBeVisible();
  await expect(aggressive.getByRole('button', { name: 'Prepare aggressive regeneration', exact: false })).toBeVisible();

  await page.goto('/settings');
  await page.getByRole('tab', { name: 'Offer policies & product MRP', exact: true }).click();
  const policy = page.locator('.commercial-policy');
  await expect(policy).toBeVisible({ timeout: 15000 });
  await policy.getByLabel('Commercial policy studio', { exact: true }).selectOption('3');
  await expect(page.getByLabel('Barre trial journey', { exact: true })).toHaveValue('new_client_intro_pack_50_percent_or_newcomers_2_for_1', { timeout: 15000 });
  await expect(page.getByLabel('Single-class pricing reference', { exact: true })).toHaveValue('32');
  await expect(page.getByLabel('Newcomer fulfilment product', { exact: true })).toHaveValue('235');
  await page.screenshot({ path: 'artifacts/commercial-policy.png', fullPage: true });

  await page.getByRole('button', { name: 'Copilot', exact: true }).click();
  const drawer = page.locator('.copilot-panel');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'New conversation', exact: true }).click();
  await drawer.getByLabel('Copilot studio', { exact: true }).selectOption('3');
  await drawer.getByPlaceholder('Name a studio, month and outcome…', { exact: true }).fill('Simulate a 3-for-2 newcomer offer for January 2027');
  await drawer.getByRole('button', { name: 'Send to Copilot', exact: true }).click();
  await expect(drawer.getByText('Deterministic Copilot', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(drawer.getByText('₹2,700', { exact: true })).toBeVisible();
  await expect(drawer.getByText('Open saved draft', { exact: false })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Close Copilot', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Copilot', exact: true }).click();
  await expect(page.locator('.copilot-panel').getByText('₹2,700', { exact: true })).toBeVisible({ timeout: 15000 });
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.copilot-panel').getByRole('button', { name: 'Delete conversation', exact: true }).click();
  await expect(page.locator('.copilot-panel').getByText('Build from the actual studio context.', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.locator('.copilot-panel').getByRole('button', { name: 'Close Copilot', exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/offers','/retention','/planner']) {
    await page.goto(route);
    await expect(page.locator('.page-content .loading')).toHaveCount(0, { timeout: 15000 });
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
    expect(dimensions.scroll, `Mobile overflow on ${route}`).toBeLessThanOrEqual(dimensions.width + 2);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});
