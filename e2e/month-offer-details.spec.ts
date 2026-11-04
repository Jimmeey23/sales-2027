import { expect, test, type Page } from '@playwright/test';

const prices = [125000, 235000, 640000];
const terms = [
  '₹2,000 for a 7-day unlimited intro, credited in full on a qualifying purchase within 72 hours. Then 15% off the first membership.',
  '1-month unlimited at ₹17,203 — the standing 15% lapsed-client price, with a free comeback class.',
  'Renew at 10% off list by 31 January, with the rate locked for the full term.',
];

// Both formats are received through intercepted GETs. No imports, saves or seed
// changes are needed to reproduce the screenshot or test a stale filed estimate.
async function openMonth(page: Page, format: 'export' | 'legacy' = 'export', missingForecast = false) {
  await page.addInitScript(() => localStorage.setItem('p57-location', '1'));
  await page.route('**/api/plan/bundle?*', async route => {
    const response = await route.fetch();
    const body = await response.json();
    const plan = body.studios
      .find((studio: any) => studio.id === 1)
      .detail.plans.find((entry: any) => entry.month === 1);
    const ids = ['newcomer', 'lapsed', 'renewal'].map(slot => plan.slots[slot]);
    const offers = ids.map((id, index) => {
      const offer = body.offers.find((entry: any) => entry.id === id);
      offer.expected_revenue = prices[index];
      offer.expected_asp = prices[index] / offer.target_purchases;
      offer.financials = missingForecast && index === 1 ? { expectedRevenue: 123 } : {};
      offer.provenance = {
        ...offer.provenance,
        fields: {
          ...offer.provenance?.fields,
          'You pay': [terms[index]],
          'You get': [
            '• The stated membership and campaign benefits',
            '• Purchase within the written qualifying window',
          ],
        },
      };
      return offer;
    });
    // Slot + extra references must not count the same offer twice.
    plan.offer_ids = [ids[0]];
    plan.offers = offers;
    plan.content = {
      ...plan.content,
      focus: "Turn January's lead spike into habits, not one-off visits.",
      studioRole:
        'Flagship and revenue anchor. Carries the January rent increase, so it leans on annuals, 3-month+ upgrades and privates.',
      offersPlannedRevenue: 1900000,
      collateral: {
        title: 'Marketing & collaterals needed',
        pieces: Array.from({ length: 7 }, (_, i) => {
          const offer = offers[i % offers.length];
          return format === 'export'
            ? {
                offer: offer.name,
                description: `Creative ${i + 1}`,
                copy: {
                  headline: `Creative ${i + 1}`,
                  detail: `Actual terms for asset ${i + 1}.`,
                  waLaunchText: `Campaign copy ${i + 1}.`,
                },
                channels: [
                  { key: 'whatsapp', title: 'WhatsApp', due: '2026-12-21' },
                  { key: 'email', title: 'Email', due: '27 Dec' },
                ],
              }
            : {
                offerId: offer.offer_uid,
                headline: `Creative ${i + 1}`,
                detail: `Actual terms for asset ${i + 1}.`,
                copy: `Campaign copy ${i + 1}.`,
                channels: ['WhatsApp', 'Email'],
              };
        }),
      },
      crm: {
        rule: 'One **audience**, one send.',
        sendsCount: format === 'legacy' ? 12 : 10,
        sends: Array.from({ length: 10 }, (_, i) => {
          const offer = offers[i % offers.length];
          return format === 'export'
            ? {
                date: `2027-01-${String(i + 1).padStart(2, '0')}`,
                channel: i % 2 ? 'Email' : 'WhatsApp',
                label: `Send ${i + 1}`,
                audience: ['New to Physique 57', 'Welcome back', 'Members only'][i % 3],
                offers: [offer.name],
                note: `Delivery note ${i + 1}.`,
              }
            : { offerId: offer.offer_uid, audience: `Audience ${i + 1}`, message: `Campaign message ${i + 1}.` };
        }),
      },
    };
    await route.fulfill({ response, json: body });
  });
  await page.goto('/sales-plan/plan?month=1');
  await page.locator('.mc-open').click({ timeout: 30000 });
  await expect(page.getByRole('region', { name: 'Monthly launch brief' })).toBeVisible();
}
async function openOffers(page: Page) {
  await page
    .locator('.mw-page-tab')
    .filter({ hasText: /^Offers/ })
    .click();
  await expect(page.locator('.oc.is-v3')).toHaveCount(3);
}

test.use({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });

test('renders the complete exported monthly brief with real assets, CRM details and a live projection', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openMonth(page);
  const brief = page.getByRole('region', { name: 'Monthly launch brief' });
  await expect(brief.locator('.mw-brief-stats .is-revenue dd > strong')).toHaveText('₹10L');
  await expect(brief.locator('.mw-brief-filed')).toContainText('Filed plan estimate: ₹19L');
  await expect(page.locator('.mo2-hero-figures')).toContainText('Combined projected revenue');
  const collateral = brief.getByRole('region', { name: 'Collateral brief' });
  const crm = brief.getByRole('region', { name: 'CRM schedule' });
  await expect(collateral.locator('.mw-brief-list > li')).toHaveCount(7);
  await expect(collateral.locator('.mw-brief-list > li').last()).toContainText('Actual terms for asset 7.');
  await expect(collateral.locator('.mw-brief-channels').first()).toContainText('WhatsApp · due 21 Dec');
  await expect(crm.locator('.mw-brief-list > li')).toHaveCount(10);
  await expect(crm.locator('.mw-brief-list > li').last()).toContainText('Delivery note 10.');
  await expect(crm.locator('.mw-brief-rule')).toHaveText('One audience, one send.');
  await expect(crm.locator('.mw-brief-rule b')).toHaveText('audience');
  await expect(crm.locator('.mw-brief-send-meta').first()).toContainText('1 Jan');
  await expect(crm.locator('.mw-brief-send-offers').first()).toContainText('The First Seven Days');
  await expect(brief).not.toContainText('[object Object]');
  expect(await collateral.locator('.mw-brief-item-title').allTextContents()).not.toContain('Piece');
  await collateral.locator('details').first().getByText('View copy').click();
  await expect(collateral.locator('details').first()).toContainText('Campaign copy 1.');
  expect(errors).toEqual([]);
});

test('highlights the exact commercial terms and sums selected offers once across card layouts', async ({ page }) => {
  await openMonth(page);
  await openOffers(page);
  const total = page.getByRole('region', { name: 'Combined projected offer revenue' });
  await expect(total.locator('.mw-offer-total-value')).toHaveAttribute('data-revenue', '1000000');
  await expect(total.locator('.mw-offer-total-value')).toHaveText('₹10L');
  await expect(total).toContainText('From 3 selected offers');
  const cards = page.locator('.oc.is-v3');
  for (let index = 0; index < 3; index++) {
    await expect(cards.nth(index).locator('.ocv-brief')).toHaveText(terms[index]);
    await expect(cards.nth(index).locator('.ocv-offer-highlight')).toBeVisible();
    await expect(cards.nth(index).locator('.ocv-inclusions > li')).toHaveCount(2);
  }
  expect(
    await cards
      .first()
      .locator('.ocv-brief')
      .evaluate(element => parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.getByRole('button', { name: '1-up', exact: true }).click();
  await expect(total.locator('.mw-offer-total-value')).toHaveAttribute('data-revenue', '1000000');
  await page.getByRole('button', { name: '2-up', exact: true }).click();
  await expect(total.locator('.mw-offer-total-value')).toHaveAttribute('data-revenue', '1000000');
});

test('preserves the legacy brief and makes reported-count discrepancies explicit', async ({ page }) => {
  await openMonth(page, 'legacy');
  const brief = page.getByRole('region', { name: 'Monthly launch brief' });
  const collateral = brief.getByRole('region', { name: 'Collateral brief' });
  const crm = brief.getByRole('region', { name: 'CRM schedule' });
  await expect(collateral.locator('.mw-brief-item-title').first()).toHaveText('The First Seven Days');
  await expect(collateral.locator('.mw-brief-headline').last()).toHaveText('Creative 7');
  await expect(crm.locator('.mw-brief-list > li').last()).toContainText('Campaign message 10.');
  await expect(crm.locator('.mw-brief-panel-note')).toHaveText(
    'The filed plan reports 12 sends; 10 detailed sends are listed below.',
  );
  await expect(crm.locator('.mw-brief-rule')).toHaveText('One audience, one send.');
});

test('does not silently count an invalid forecast as revenue', async ({ page }) => {
  await openMonth(page, 'export', true);
  const brief = page.getByRole('region', { name: 'Monthly launch brief' });
  await expect(brief.locator('.is-revenue')).toContainText('1 awaiting forecast');
  await openOffers(page);
  const total = page.getByRole('region', { name: 'Combined projected offer revenue' });
  await expect(total.locator('.mw-offer-total-value')).toHaveAttribute('data-revenue', '765000');
  await expect(total.locator('.mw-offer-total-warning')).toContainText('1 selected offer is awaiting a valid forecast');
  await expect(total.locator('[data-offer-category="winback"] dd')).toHaveText('—');
  await expect(page.locator('.oc[data-offer-category="winback"] .ocv-fig.is-hero .ocv-fig-value')).toHaveText('—');
});

test('keeps the monthly brief, highlighted terms and combined total readable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMonth(page);
  const brief = page.getByRole('region', { name: 'Monthly launch brief' });
  await expect(brief.locator('.mw-brief-stats .is-revenue dd > strong')).toHaveText('₹10L');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await brief
        .locator('.mw-brief-sheet, .mw-brief-panel')
        .evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1)),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await openOffers(page);
  await expect(page.locator('.mw-offer-total-value')).toHaveText('₹10L');
  expect(
    await page
      .locator('.mw-offer-total, .oc.is-v3, .ocv-offer-highlight')
      .evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1)),
  ).toBe(true);
});
