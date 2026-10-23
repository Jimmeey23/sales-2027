import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/studios/1',
  '/planner',
  '/calendar',
  '/ai-offers',
  '/goal-builder',
  '/random-offers',
  '/offers',
  '/offer-builder',
  '/funnel',
  '/retention',
  '/performance',
  '/imports',
  '/reports',
  '/settings',
  '/anniversary',
];

test('all modules render, desktop and mobile navigation work, and the console stays clean', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Executive Dashboard', exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.login-page')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0);
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('.page-content h2').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.page-content .loading')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await page.waitForTimeout(150);
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    expect(dimensions.scroll, `Document overflow on ${route}`).toBeLessThanOrEqual(dimensions.width + 2);
  }
  await page.goto('/studios/1');
  await page.getByRole('tab', { name: 'Attendance & cancellations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Monthly attendance behaviour' })).toBeVisible();
  await expect(page.getByText('Next-month attendance return', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Behaviour data provenance & boundaries' })).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/studio-attendance.png', fullPage: true });
  await page.goto('/planner');
  await expect(page.getByText('Kemps Corner · rent-aware 2027 operating plan', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  const kempsTargets = await page
    .locator('.target-matrix tbody tr')
    .filter({ hasText: 'Kemps Corner' })
    .locator('input')
    .evaluateAll(inputs => inputs.map(input => Number((input as HTMLInputElement).value)));
  expect(kempsTargets).toEqual([
    3200000, 3000000, 3000000, 4000000, 3000000, 3000000, 3100000, 3500000, 3800000, 3100000, 3000000, 3200000,
  ]);
  await page.screenshot({ path: 'artifacts/planner-2027.png', fullPage: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The business, in motion.' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.loading')).toHaveCount(0, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The business, in motion.' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.loading')).toHaveCount(0, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
  const mobileDimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(mobileDimensions.scroll).toBeLessThanOrEqual(mobileDimensions.width + 2);
  await page.goto('/studios/1');
  await page.getByRole('tab', { name: 'Attendance & cancellations', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Monthly attendance behaviour' })).toBeVisible({ timeout: 15000 });
  const mobileAttendance = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(mobileAttendance.scroll).toBeLessThanOrEqual(mobileAttendance.width + 2);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.sidebar.mobile-open')).toBeVisible();
  await page.getByRole('link', { name: 'April Anniversary Studio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'April Anniversary Studio', exact: true })).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
