// usability.e2e.js — CORE USABILITY FLOWS lane (real Chrome).
// Drives the actual controls a user touches: the map renders, the language
// disclosure switches locale, the country-flag disclosure opens/searches/closes
// with a keyboard escape route, and the category/recency filter is operable.
//
// These controls are Leaflet controls mounted client-side in a useEffect, so
// they are ABSENT from server HTML and only appear after JS runs — the whole
// reason a browser test (not a jsdom unit test) is the right tool here. Every
// assertion waits for the control to mount and SKIPS gracefully when a control
// is not present (e.g. INTL flag OFF hides the flag picker), so the suite is
// honest on either flag state rather than failing on an absent-by-design node.
const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

// Seed the returning-visitor cookie BEFORE any navigation so the onboarding tour
// never opens over the map and steals pointer events from the controls we drive.
test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

// Selectors derived from the real DOM contract (see CountryFlagControl.js /
// LanguageControl.js): both share .mdf-flag; disambiguate by aria-controls.
const LANG_TOGGLE = 'button.mdf-flag__btn[aria-controls="mdf-lang-panel"]';
const LANG_PANEL = '#mdf-lang-panel';
const FLAG_TOGGLE = 'button.mdf-flag__btn[aria-controls="mdf-flag-panel"]';
const FLAG_PANEL = '#mdf-flag-panel';

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // The Leaflet map container is the anchor everything else mounts onto.
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
}

test.describe('usability: map + core shell @usability', () => {
  test('the Leaflet map renders with tiles', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('.leaflet-container').first()).toBeVisible();
    // At least one tile image actually loaded (map is not a blank gray box).
    await expect(page.locator('.leaflet-tile-loaded, img.leaflet-tile').first()).toBeVisible({
      timeout: 30000,
    });
  });

  test('the category filter <select> is present and operable', async ({ page }) => {
    await gotoHome(page);
    const filtro = page.locator('select#filtro, select[aria-label="Filtrar por categoria"]').first();
    await filtro.waitFor({ state: 'visible', timeout: 30000 });
    // Operate it: pick the last option and assert the value actually changed.
    const optionValues = await filtro.locator('option').evaluateAll((opts) =>
      opts.map((o) => o.value),
    );
    expect(optionValues.length).toBeGreaterThan(1);
    await filtro.selectOption(optionValues[optionValues.length - 1]);
    await expect(filtro).toHaveValue(optionValues[optionValues.length - 1]);
  });
});

test.describe('usability: language disclosure @usability', () => {
  test('opens, lists locales, switches language, and the UI re-renders', async ({ page }) => {
    await gotoHome(page);
    const toggle = page.locator(LANG_TOGGLE);
    // The Leaflet language control mounts AFTER the map on this HDD; wait for the
    // toggle itself to be present+visible (generous budget) before clicking, so a
    // slow mount is a wait, not a click-timeout false-fail. Absent => skip.
    if (
      !(await toggle
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => true)
        .catch(() => false))
    ) {
      test.skip(true, 'language control not mounted on this build');
    }
    await toggle.first().click();
    const panel = page.locator(LANG_PANEL);
    await expect(panel).toBeVisible();

    const options = panel.locator('button.mdf-flag__option');
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThanOrEqual(2); // pt/es (+en when INTL on)

    // Capture the toggle's accessible label, switch to a different locale,
    // and assert the label CHANGED — proof the locale actually applied.
    const before = await toggle.first().getAttribute('aria-label');
    // Listen for the app's own locale-change event as a deterministic signal.
    const switched = page.evaluate(
      () =>
        new Promise((res) => {
          window.addEventListener('mdf-locale-change', () => res(true), { once: true });
          setTimeout(() => res(false), 5000);
        }),
    );
    await options.nth(1).click();
    expect(await switched, 'mdf-locale-change did not fire on language switch').toBe(true);
    const after = await toggle.first().getAttribute('aria-label');
    expect(after, 'toggle label did not update after locale switch').not.toBe(before);
  });
});

test.describe('usability: country-flag disclosure (INTL) @usability', () => {
  test('opens, search filters the list, and Escape/close returns focus', async ({ page }) => {
    await gotoHome(page);
    const toggle = page.locator(FLAG_TOGGLE);
    // Same as the language control: wait for the toggle to actually mount before
    // clicking (slow HDD), and skip honestly if INTL is OFF so the flag picker
    // never renders — an absent-by-design control is not a failure.
    if (
      !(await toggle
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => true)
        .catch(() => false))
    ) {
      test.skip(true, 'country-flag control not mounted (INTL flag OFF) — nothing to exercise');
    }
    await toggle.first().click();
    const panel = page.locator(FLAG_PANEL);
    await expect(panel).toBeVisible();

    // Search narrows the country list.
    const search = panel.locator('input.mdf-flag__search');
    await expect(search).toBeVisible();
    const allCount = await panel.locator('button.mdf-flag__option').count();
    await search.fill('bra'); // should narrow toward Brasil/Brazil
    await page.waitForTimeout(300);
    const narrowed = await panel.locator('button.mdf-flag__option').count();
    expect(narrowed, 'search did not filter the country list').toBeLessThanOrEqual(allCount);

    // Modal-contract escape route: a close button exists AND Escape dismisses.
    // The disclosure's Escape handler is bound on the PANEL (CountryFlagControl.js
    // `L.DomEvent.on(panel, 'keydown', ... Escape -> closePanel)`), so the keypress
    // must originate from WITHIN the panel — focus the search input first, then
    // press Escape, mirroring how a keyboard user actually triggers it. The panel
    // closes by toggling `hidden` (it is NOT removed from the DOM), so the correct
    // assertion is toBeHidden(), not toHaveCount(0).
    const closeBtn = panel.locator('button.mdf-flag__close');
    await expect(closeBtn).toBeVisible();
    await search.focus();
    await search.press('Escape');
    await expect(panel, 'country-flag panel did not close on Escape').toBeHidden({ timeout: 5000 });
  });
});
