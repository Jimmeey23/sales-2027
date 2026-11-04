import { expect, test, type Page } from '@playwright/test';

// Contradictory import metadata is intentional: the chosen month slot must win,
// saved slots must beat objectives, and generic upsells must not become renewals.
// Fixtures exist only in intercepted GET responses; no workspace data is changed.
const base = {
  studio_id: 1,
  studio: 'Kemps Corner',
  year: 2027,
  month: null,
  offer_type: 'percentage',
  status: 'draft',
  approval_status: 'pending',
  generation_source: 'json_import',
  data_mode: 'user',
  expected_asp: 2500,
  expected_revenue: 10000,
  actual_revenue: null,
  target_purchases: 4,
  benefit: '3-month unlimited at the campaign rate.',
  effective_discount: 0,
  mechanics: {},
  financials: { expectedRevenue: 10000 },
  risks: [],
  provenance: { pricing: { product: '3M' } },
  performance_notes: '',
  run_ads: 0,
  updated_at: '2026-11-04T00:00:00Z',
};
const selected = [
  { ...base, id: 10001, name: 'New via month slot', month: 2, plan_slot: 'renewal', objective: 'reactivation' },
  { ...base, id: 10002, name: 'Winback by stored slot', month: 2, plan_slot: 'lapsed', objective: 'acquisition' },
  { ...base, id: 10003, name: 'Renewal by stored slot', month: 2, plan_slot: 'renewal', objective: 'reactivation' },
  { ...base, id: 10004, name: 'Other general upsell', month: 2, plan_slot: null, objective: 'additional_purchase' },
];
const bank = [
  { ...base, id: 10011, name: 'Library other upsell', plan_slot: null, objective: 'additional_purchase' },
  { ...base, id: 10012, name: 'Library winback', plan_slot: 'lapsed', objective: 'acquisition' },
  { ...base, id: 10013, name: 'Library new', plan_slot: 'newcomer', objective: 'retention' },
  { ...base, id: 10014, name: 'Library renewal', plan_slot: null, objective: 'retention' },
  { ...base, id: 10015, name: 'Library bookout', plan_slot: 'bookout', objective: 'acquisition' },
];
const categories = ['new', 'winback', 'renewal', 'other'];
const labels = ['New', 'Winback', 'Renewal', 'Other'];

async function fixtures(page: Page) {
  await page.addInitScript(() => localStorage.setItem('p57-location', '1'));
  await page.route('**/api/plan/bundle?*', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.offers = [...selected, ...bank];
    const plan = body.studios
      .find((studio: any) => studio.id === 1)
      .detail.plans.find((entry: any) => entry.month === 2);
    plan.slots = { newcomer: 10001, lapsed: 10002, renewal: 10003 };
    plan.offer_ids = [10004];
    plan.offers = selected;
    await route.fulfill({ response, json: body });
  });
  await page.route('**/api/offers?*', async route => {
    await route.fulfill({ json: { rows: bank, total: bank.length, page: 1, limit: 40 } });
  });
}

async function openMonthOffers(page: Page) {
  await fixtures(page);
  await page.goto('/sales-plan/plan?month=2');
  await page.locator('.mc-open').click({ timeout: 30000 });
  await page
    .locator('.mw-page-tab')
    .filter({ hasText: /^Offers/ })
    .click();
  await expect(page.locator('.oc.is-v3')).toHaveCount(4);
}

test.use({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });

test('groups month cards in lifecycle order, using the actual month assignment', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openMonthOffers(page);
  await expect(page.locator('.mp-offer-divider > span')).toHaveText(labels);
  expect(
    await page
      .locator('.mw-offer-item')
      .evaluateAll(items => items.map(item => item.getAttribute('data-offer-category'))),
  ).toEqual(categories);
  for (const [index, category] of categories.entries()) {
    const card = page.locator(`.oc[data-offer-category="${category}"]`);
    await expect(card.locator('.ocv-title')).toHaveText(selected[index].name);
    await expect(card.locator('.ocv-eyebrow')).toContainText(labels[index]);
  }
  expect(errors).toEqual([]);
});

test('uses exclusive library filters, including Other, and keeps product details visible', async ({ page }) => {
  await openMonthOffers(page);
  const library = page.locator('.olib');
  await expect(library).toBeVisible();
  expect(
    await library
      .locator('.olib-group')
      .evaluateAll(groups => groups.map(group => group.getAttribute('data-offer-category'))),
  ).toEqual(categories);
  await expect(library.locator('.olib-row-item')).toHaveCount(bank.length);
  await expect(library.locator('.olib-membership').first()).toContainText('3');
  const filters = library.getByRole('group', { name: 'Offer category' });
  for (const [index, category] of categories.entries()) {
    await filters.getByRole('button', { name: labels[index], exact: true }).click();
    await expect(library.locator('.olib-group')).toHaveCount(1);
    await expect(library.locator('.olib-group')).toHaveAttribute('data-offer-category', category);
    await expect(library.locator('.olib-row-item')).toHaveCount(category === 'other' ? 2 : 1);
  }
  await filters.getByRole('button', { name: 'All', exact: true }).click();
  await expect(library.locator('.olib-row-item')).toHaveCount(bank.length);
});

test('uses the same categories in planned promotions, the bank rail and the bank table', async ({ page }) => {
  await fixtures(page);
  await page.goto('/offers?view=planned');
  await page.locator('.os-months').getByRole('button', { name: /^Feb/ }).click();
  await expect(page.locator('.os-offer-category')).toHaveCount(4);
  await expect(page.locator('.bank-category')).toHaveCount(4);
  expect(
    await page
      .locator('.os-offer-category')
      .evaluateAll(groups => groups.map(group => group.getAttribute('data-offer-category'))),
  ).toEqual(categories);
  await expect(page.locator('.os-offer')).toHaveCount(4);
  expect(
    await page
      .locator('.bank-category')
      .evaluateAll(groups => groups.map(group => group.getAttribute('data-offer-category'))),
  ).toEqual(categories);
  await expect(page.locator('.bank-card')).toHaveCount(bank.length);

  await page.getByRole('button', { name: 'Offer bank', exact: true }).click();
  const table = page.locator('.offer-bank-table');
  await expect(table).toBeVisible();
  expect(
    await table.locator('tbody').evaluateAll(groups => groups.map(group => group.getAttribute('data-offer-category'))),
  ).toEqual(categories);
  await expect(table.locator('tr[data-offer-id]')).toHaveCount(bank.length);
  await expect(table.locator('.offer-bank-category strong')).toHaveText(labels);
  await expect(table.locator('tbody[data-offer-category="winback"] tr[data-offer-id]')).toContainText(
    'Library winback',
  );
  await expect(table.locator('tbody[data-offer-category="other"] tr[data-offer-id]')).toHaveCount(2);
});

test('keeps the five category filters usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMonthOffers(page);
  await page.locator('.mw-qtool').filter({ hasText: 'Offer library' }).click();
  const library = page.locator('.olib');
  await expect(library).toBeVisible();
  await library.getByRole('button', { name: 'Other', exact: true }).click();
  await expect(library.locator('.olib-row-item')).toHaveCount(2);
  expect(
    await library.locator('.olib-scopes').evaluate(element => element.scrollWidth <= element.clientWidth + 1),
  ).toBe(true);
  await expect(page.locator('.mp-offer-divider > span')).toHaveText(labels);
});
