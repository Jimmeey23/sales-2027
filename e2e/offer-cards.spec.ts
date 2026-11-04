import { expect, test, type Page } from '@playwright/test';

// Like the other browser suites, run against a seeded, direct-workspace dev server.
// These checks are read-only: draft notes are never submitted to the API.
async function openOffers(page: Page, month: number) {
  await page.addInitScript(() => localStorage.setItem('p57-location', '1'));
  await page.goto(`/sales-plan/plan?month=${month}`);
  await page.locator('.mc-open').click({ timeout: 30000 });
  await page
    .locator('.mw-page-tab')
    .filter({ hasText: /^Offers/ })
    .click();
  await expect(page.locator('.oc.is-v3').first()).toBeVisible();
}

async function expectNoCardOverflow(page: Page) {
  const overflow = await page
    .locator('.oc.is-v3, .mw-offer-item, .mw-offer-alt')
    .evaluateAll(elements =>
      elements
        .filter(element => element.scrollWidth > element.clientWidth + 1)
        .map(element => ({ className: element.className, width: element.clientWidth, scroll: element.scrollWidth })),
    );
  expect(overflow).toEqual([]);
}

test.describe('polished month-plan offer cards', () => {
  test.use({ viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });

  test('keeps paired cards and their alternatives in two columns, and preserves figures in one-up', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openOffers(page, 2);
    await page.getByRole('button', { name: '2-up', exact: true }).click();

    const cards = page.locator('.oc.is-v3');
    const financials = await cards.locator('.ocv-figures, .ocv-facts').allTextContents();
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
    expect(second!.x).toBeGreaterThan(first!.x + first!.width);
    await expect(page.locator('.mw-offer-item').first().locator('.mw-offer-alts')).toBeVisible();
    await expectNoCardOverflow(page);

    await page.getByRole('button', { name: '1-up', exact: true }).click();
    await expect(page.getByRole('button', { name: '1-up', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect((await cards.first().boundingBox())!.width).toBeGreaterThan(first!.width * 1.7);
    expect(await cards.locator('.ocv-figures, .ocv-facts').allTextContents()).toEqual(financials);
    await expectNoCardOverflow(page);

    // A stream with just one offer should not leave a blank half-row in two-up.
    await openOffers(page, 1);
    await page.getByRole('button', { name: '2-up', exact: true }).click();
    const wideItem = page.locator('.mw-offer-item.is-wide').first();
    await expect(wideItem).toBeVisible();
    const widths = await wideItem.evaluate(element => {
      const list = element.parentElement!;
      const style = getComputedStyle(list);
      return {
        item: element.getBoundingClientRect().width,
        available: list.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      };
    });
    expect(Math.abs(widths.item - widths.available)).toBeLessThan(2);
    expect(errors).toEqual([]);
  });

  test('uses an explicit keyboard disclosure and keeps unsaved notes when folded', async ({ page }) => {
    await openOffers(page, 1);
    const card = page.locator('.oc.is-v3').first();
    await expect(card.locator('.ocv-plate h3')).toHaveAttribute('id', (await card.getAttribute('aria-labelledby'))!);
    await expect(card.locator('.ocv-record')).toBeVisible();
    const disclosure = card.getByRole('button', { name: /Audience, timing & notes/ });
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    // Reading or selecting the brief no longer unexpectedly opens the card.
    await card.locator('.ocv-brief').click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await disclosure.focus();
    await expect(disclosure).toBeFocused();
    await disclosure.press('Space');
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(card.locator('.ocv-extra')).not.toHaveAttribute('inert');

    const note = card.getByRole('textbox', { name: /^Note for / });
    await note.fill('Confirm the front-desk briefing before launch.');
    await expect(card.locator('.ocv-log-state')).toHaveText('Unsaved');
    await expect(card.getByRole('button', { name: 'Save note', exact: true })).toBeEnabled();
    await disclosure.focus();
    await disclosure.press('Enter');
    await expect(card.locator('.ocv-extra')).toBeHidden();
    await expect(card.locator('.ocv-extra')).toHaveAttribute('inert', '');
    await expect(card.locator('.ocv-record')).toBeVisible();
    await disclosure.press('Enter');
    await expect(note).toHaveValue('Confirm the front-desk briefing before launch.');
    await expectNoCardOverflow(page);

    await card.hover();
    await expect(card).toHaveCSS('transform', 'none');
    // The shared reduced-motion reset uses an effectively instantaneous 0.01ms.
    const duration = await card.locator('.ocv-photo').evaluate(element =>
      Math.max(
        ...getComputedStyle(element)
          .transitionDuration.split(',')
          .map(value => parseFloat(value)),
      ),
    );
    expect(duration).toBeLessThanOrEqual(0.001);
  });
});

test.describe('offer cards on touch screens', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });

  test('gives cards the phone width, keeps the library opt-in, and provides comfortable controls', async ({ page }) => {
    await openOffers(page, 2);
    await expect(page.locator('.mw-lib-rail')).toHaveCount(0);
    const card = page.locator('.oc.is-v3').first();

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await expectNoCardOverflow(page);
      const cardBox = await card.boundingBox();
      expect(cardBox!.x).toBeGreaterThanOrEqual(0);
      expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(width);
      if (width <= 390) expect(cardBox!.width).toBeGreaterThanOrEqual(width - 32);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const disclosure = card.getByRole('button', { name: /Audience, timing & notes/ });
    expect((await disclosure.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await disclosure.click();
    await expect(card.locator('.ocv-note')).toHaveCSS('font-size', '16px');
    expect(
      (await card.getByRole('button', { name: 'Save note', exact: true }).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    for (const button of await card.getByRole('checkbox').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }

    await page
      .locator('.mw-pages-tools')
      .getByRole('button', { name: /Offer library/ })
      .click();
    await expect(page.locator('.mw-lib-rail')).toBeVisible();
    await page.locator('.olib-close').click();
    await expect(page.locator('.mw-lib-rail')).toHaveCount(0);
    await expectNoCardOverflow(page);
  });
});
