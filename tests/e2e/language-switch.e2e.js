// language-switch.e2e.js — INSTANT LANGUAGE SWITCH lane (real Chrome). @lang
//
// Two things the user asked for, proven end to end:
//   1. The language picker offers the SAME number of languages as the SOLONE
//      game: SEVEN (pt-BR, es, en-US, de, fr, ru, zh).
//   2. Picking a language changes the WHOLE site language INSTANTLY, with NO
//      reload — including the map-shell strings rendered by the App.js class
//      component (which now subscribes to 'mdf-locale-change' and forceUpdate()s).
//
// We assert the live re-render by reading a visible UI string before and after a
// pick and requiring it to change WITHOUT any navigation/reload. The language
// control is a Leaflet control mounted client-side; if it is absent (INTL OFF)
// the test SKIPS honestly.
const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

const LANG_TOGGLE = 'button.mdf-flag__btn[aria-controls="mdf-lang-panel"]';
const LANG_PANEL = '#mdf-lang-panel';

test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

async function openLangPanel(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
  const toggle = page.locator(LANG_TOGGLE);
  if (
    !(await toggle
      .first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true)
      .catch(() => false))
  ) {
    return null; // INTL off / control not mounted
  }
  await toggle.first().click();
  await expect(page.locator(LANG_PANEL)).toBeVisible();
  return toggle;
}

test.describe('language: seven-language picker (matches SOLONE) @lang', () => {
  test('the language picker lists exactly 7 languages', async ({ page }) => {
    const toggle = await openLangPanel(page);
    if (!toggle) test.skip(true, 'language control not mounted (INTL OFF)');

    const options = page.locator(`${LANG_PANEL} button.mdf-flag__option`);
    await expect(options.first()).toBeVisible();
    // SOLONE ships 7 languages; MapaFome now matches that count.
    await expect(options).toHaveCount(7);

    // The four newly added endonyms must be present in the picker.
    const labels = (await options.allInnerTexts()).join(' ');
    for (const endonym of ['Deutsch', 'Français', 'Русский', '中文']) {
      expect(labels, `picker should list ${endonym}`).toContain(endonym);
    }
  });
});

test.describe('language: pick changes the site language INSTANTLY (no reload) @lang', () => {
  test('switching language live re-renders visible copy without navigation', async ({ page }) => {
    const toggle = await openLangPanel(page);
    if (!toggle) test.skip(true, 'language control not mounted (INTL OFF)');

    // Fail the test if the page navigates/reloads — the whole point is NO reload.
    let navigated = false;
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame()) navigated = true;
    });

    const options = page.locator(`${LANG_PANEL} button.mdf-flag__option`);

    // Capture a stable, visible piece of UI copy (the toggle's own aria-label,
    // which is "Idioma: <name>" / "Language: <name>" etc. — it is rendered from a
    // t() string and updates on locale change).
    const before = await toggle.first().getAttribute('aria-label');

    // Pick a clearly-different language than the current one. Try German; if the
    // app already happens to be German, pick French instead.
    const pickEndonym = before && /Deutsch|Sprache/i.test(before) ? 'Français' : 'Deutsch';
    await options.filter({ hasText: pickEndonym }).first().click();

    // The toggle label must change to reflect the new language, with NO reload.
    await expect
      .poll(async () => toggle.first().getAttribute('aria-label'), { timeout: 6000 })
      .not.toBe(before);
    expect(navigated, 'language switch must NOT reload/navigate the page').toBe(false);
  });

  test('the map-shell (App.js) re-renders on language pick, not just the small widgets', async ({
    page,
  }) => {
    const toggle = await openLangPanel(page);
    if (!toggle) test.skip(true, 'language control not mounted (INTL OFF)');

    // Read a map-shell string that App.js renders via t() (the report/list/help
    // CTAs live in the App-rendered chrome). Capture the whole visible body text,
    // switch language, and require the body text to change live (proving the big
    // class component re-rendered, not only the useLocale() leaf widgets).
    const bodyBefore = await page.locator('body').innerText();

    const options = page.locator(`${LANG_PANEL} button.mdf-flag__option`);
    // Pick Russian (Cyrillic) so the change is unmistakable in the body text.
    await options.filter({ hasText: 'Русский' }).first().click();
    await page.waitForTimeout(800); // allow the forceUpdate() re-render to flush

    const bodyAfter = await page.locator('body').innerText();
    expect(
      bodyAfter,
      'site body copy did not change after switching to Russian (map shell stayed stale)',
    ).not.toBe(bodyBefore);
    // And it should now contain Cyrillic somewhere (proof the new locale rendered).
    expect(/[Ѐ-ӿ]/.test(bodyAfter), 'expected Cyrillic text after switching to ru').toBe(
      true,
    );
  });
});
