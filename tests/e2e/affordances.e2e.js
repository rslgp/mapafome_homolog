// affordances.e2e.js — SCROLL-AFFORDANCE lane (real Chrome). @affordances
//
// Regression net for the UX-M00 discovery affordances (the ones that fight
// the ~80%-never-scroll finding). These are JS+CSS coupled to real scroll
// position, so a unit test cannot prove they appear/disappear on scroll:
//   1. The pre-scroll bottom veil is present at rest and hides after scroll.
//   2. The reading-progress bar grows (scaleX) as the page scrolls.
//   3. The StepsHint pill rail shows a right edge-fade when it overflows,
//      and the fade clears after scrolling the rail to its end.
//
// Each assertion degrades gracefully: if the affordance is absent on this
// build (e.g. viewport too tall to scroll), the test skips rather than
// false-failing.
const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
  await page
    .locator('.leaflet-tile-loaded, img.leaflet-tile')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {});
}

test.describe('affordances: scroll discovery @affordances', () => {
  test('bottom veil is present at rest and hides after the first scroll', async ({ page }) => {
    await gotoHome(page);
    const veil = page.locator('.mdf-scrollveil');
    if ((await veil.count()) === 0) test.skip(true, 'ScrollAffordance not mounted');

    // Scrollable page → veil starts visible (not the --off state).
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight > 48,
    );
    if (!scrollable) test.skip(true, 'page not scrollable in this viewport');

    await expect(veil).not.toHaveClass(/mdf-scrollveil--off/);
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(300);
    await expect(veil).toHaveClass(/mdf-scrollveil--off/);
  });

  test('reading-progress bar grows with scroll position', async ({ page }) => {
    await gotoHome(page);
    const bar = page.locator('.mdf-scrollprogress__bar');
    if ((await bar.count()) === 0) test.skip(true, 'progress bar not mounted');

    const scaleOf = () =>
      bar.evaluate((el) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
        return m.a; // scaleX
      });

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const atTop = await scaleOf();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const atBottom = await scaleOf();
    expect(atBottom, `progress did not grow (top=${atTop}, bottom=${atBottom})`).toBeGreaterThan(atTop);
  });

  test('pill rail shows a right edge-fade when it overflows and clears at the end', async ({ page }) => {
    await gotoHome(page);
    const rail = page.locator('.mdf-steps__scroll');
    if ((await rail.count()) === 0) test.skip(true, 'StepsHint rail not mounted');
    const overflows = await rail.evaluate((el) => el.scrollWidth - el.clientWidth > 8);
    if (!overflows) test.skip(true, 'rail does not overflow in this viewport');

    const aside = page.locator('.mdf-steps');
    // At the start, the right fade must be on (there is content to the right).
    await rail.evaluate((el) => el.scrollTo({ left: 0 }));
    await page.waitForTimeout(200);
    await expect(aside).toHaveClass(/mdf-steps--fade-right/);

    // Scroll the rail to its end → the right fade clears.
    await rail.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await page.waitForTimeout(200);
    await expect(aside).not.toHaveClass(/mdf-steps--fade-right/);
  });
});
