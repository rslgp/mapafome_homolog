// instant-language.e2e.js — RIGOROUS instant-language-switch proof. @lang @i18n
//
// WHY this spec exists (and why the older language-switch.e2e.js is insufficient):
// the user reported "changing language does NOT apply instantly — the page must be
// reloaded." The older spec was misleadingly green because it asserted only (a) the
// picker TRIGGER's own aria-label and (b) whole-body innerText:
//   • The LanguageControl picker is VANILLA DOM and calls renderButton() itself on
//     pick (LanguageControl.js), so its trigger flips even when the React UI stays
//     stale — proving nothing about the actual app surfaces.
//   • whole-body innerText changing by ONE widget (or the Cyrillic from the picker's
//     own option labels) passes while the dominant visible UI stays Portuguese.
//
// This spec asserts SPECIFIC user-facing strings in EACH visible React surface, with
// a hard NO-RELOAD sentinel, so a PASS genuinely proves the surface switched LIVE
// (same tick, no navigation), not merely after a reload, and not just the picker.
//
// ── HISTORY: this spec was authored to PROVE a real bug, and now RE-PROVES the fix.
// Original triaged defect (now FIXED by the software-engineer; re-verified here):
//   • Picking a locale fired setLocale (localStorage.mdf_locale + <html lang> flipped
//     immediately, picker self-updated) BUT the React UI did NOT live-re-render: the
//     header (which calls useLocale()) stayed Portuguese while <html lang> already
//     showed the new locale — the classic split-module-state smoking gun (the engine
//     copy setLocale mutated != the copy the React tree's t() read under dev-webpack
//     duplication). Only a reload, which re-inited BOTH copies from localStorage,
//     showed the new language — exactly the user's "only on reload".
//   • MainControls.js had ZERO t()/useLocale, so its strings never localized at all.
// The FIX: the engine now anchors the active locale + a subscriber Set on
//   globalThis.__MDF_I18N__ (one SOT across every duplicate module copy); setLocale
//   notifies that shared Set directly (plus the window event); useLocale() subscribes
//   to it. AND MainControls.js now imports { t, useLocale }, calls useLocale(), and
//   routes its visible strings through t('mainctl.*') at 7-locale parity.
// So EVERY assertion below is now expected to PASS: each wired surface flips to the
// picked language LIVE, with the no-reload sentinel staying false.
//
// We do NOT patch app code here — this spec is the messenger. If any surface is still
// stale, the failure names the exact surface/string to route back to the engineer.
//
// Determinism: seed mdf_locale=pt-BR before first nav (always start Portuguese),
// seed the returning-visitor tour cookie so the onboarding backdrop never eats a
// click, web-first assertions only (NO hard sleeps), cold-HDD-generous timeouts.
// Picker options are addressed by their stable data-locale contract.

const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

// ── Stable locators (semantic-first; data-locale is the picker's stable contract) ──
const LEAFLET = '.leaflet-container';
const LANG_TOGGLE = 'button.mdf-flag__btn[aria-controls="mdf-lang-panel"]';
const LANG_PANEL = '#mdf-lang-panel';
const langOption = (locale) => `${LANG_PANEL} button.mdf-flag__option[data-locale="${locale}"]`;

// Header surface (header.js IS subscribed: useLocale() + t('cta.*')). The VISIBLE
// text node is t(...); the accessible name is a STATIC pt-BR aria-label, so we assert
// the element's TEXT, not its accessible name.
const HEADER_REPORT = 'button.mdf-header__report';
const HEADER_HELP_LABEL = 'span.mdf-header__tour-label';

// MainControls surface (now wired: useLocale() + t('mainctl.*')). The filter <select>
// label + a representative option + the confirm button. Note the <option> VALUE
// attribute stays a machine value (e.g. value="Doadores"); only the visible TEXT is
// translated, so we match the option's rendered text, never its value.
const FILTRO_LABEL = 'label[for="filtro"]';
const FILTRO_SELECT = 'select#filtro';
// The confirm button: a SECOND ".marcar-local" exists in the SAME fieldset (a
// hidden mylocation.js button, class "hidden", text "Atual"), so both a bare class
// AND a fieldset-scoped selector collide under strict mode. The real, VISIBLE
// confirm is the one WITHOUT the .hidden class — its visible text is the localized
// confirm label (t('mainctl.confirm.label')).
const CONFIRM_BTN = '#mdf-target-confirm button.marcar-local:not(.hidden)';

// Known dictionary values (strings.core.js) for the locales we pick. pt-BR is the
// seeded start; de is the live-switch target. These are the exact rendered strings.
const STR = {
  'pt-BR': {
    report: 'Relatar',
    help: 'Como funciona',
    filterLabel: 'filtro atual:',
    donorsOption: 'Doadores',
    confirm: 'Confirmar ponto',
  },
  de: {
    report: 'Melden',
    help: 'So funktioniert es',
    filterLabel: 'aktueller Filter:',
    donorsOption: 'Spender',
    confirm: 'Punkt bestätigen',
  },
};

// Seed a deterministic starting locale (pt-BR) BEFORE any app script runs, so the
// test never depends on a leftover localStorage choice from a prior run.
async function seedStartLocale(context, locale = 'pt-BR') {
  await context.addInitScript((loc) => {
    try { window.localStorage.setItem('mdf_locale', loc); } catch (_e) { /* ignore */ }
  }, locale);
}

// Seed a locale that a FRESH load should already render (for reload-class tests),
// so we measure the persisted-init path, not a live switch.
async function seedPersistedLocale(context, locale) {
  await context.addInitScript((loc) => {
    try { window.localStorage.setItem('mdf_locale', loc); } catch (_e) { /* ignore */ }
  }, locale);
}

// Install a reload/navigation sentinel on the MAIN frame. The user's bug was "needs a
// reload": if the page navigates after we pick a language, the switch is NOT live.
// A live-switch PASS requires this to stay false. Returns the live-flag object.
function installReloadSentinel(page) {
  const state = { navigated: false };
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) state.navigated = true;
  });
  return state;
}

// Open the app, wait for the client-mounted map + the language picker, open it.
// Returns false (caller skips) when the control is absent (INTL OFF).
async function openLangPanel(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator(LEAFLET).first().waitFor({ state: 'visible', timeout: 60000 });
  const toggle = page.locator(LANG_TOGGLE).first();
  const present = await toggle
    .waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!present) return false;
  await toggle.click();
  await expect(page.locator(LANG_PANEL)).toBeVisible();
  return true;
}

async function pickLocale(page, locale) {
  await page.locator(langOption(locale)).click();
}

test.describe('instant language: every wired surface switches LIVE on pick (no reload) @lang @i18n', () => {
  // ── LIVE-SWITCH lane (start pt-BR, pick German, assert NO reload) ────────────
  test.describe('live switch (no reload)', () => {
    test.beforeEach(async ({ context }) => {
      await seedStartLocale(context, 'pt-BR');
      await dismissOnboardingTour(context);
    });

    // SURFACE 1: HEADER — header.js calls useLocale(). After the split-state fix it
    // must flip to German LIVE on a pick, with NO reload. This is the user's
    // originally-reported defect; a PASS here is the core proof the bug is gone.
    test('header CTAs switch language LIVE on pick (no reload)', async ({ page }) => {
      const ok = await openLangPanel(page);
      test.skip(!ok, 'language control not mounted (INTL OFF)');
      const sentinel = installReloadSentinel(page);

      const report = page.locator(HEADER_REPORT);
      const help = page.locator(HEADER_HELP_LABEL);

      // Arrange: confirm we genuinely start in Portuguese.
      await expect(report).toHaveText(STR['pt-BR'].report, { timeout: 15000 });
      await expect(help).toHaveText(STR['pt-BR'].help);

      // Act: pick German.
      await pickLocale(page, 'de');

      // Assert (mechanism): setLocale ran — <html lang> flips to de immediately.
      await expect(page.locator('html')).toHaveAttribute('lang', 'de', { timeout: 8000 });

      // Assert (the fix): the wired header re-renders into German with NO reload —
      // useLocale()/t() now read the SAME global engine STORE setLocale mutated.
      await expect(
        report,
        'header report CTA must switch to German LIVE (useLocale() subscribes to the '
          + 'shared globalThis.__MDF_I18N__ listener Set; engine: .../ux/i18n/engine.js; '
          + 'consumer: src/app/components/compatibility/components/header.js)',
      ).toHaveText(STR.de.report, { timeout: 10000 });
      await expect(help).toHaveText(STR.de.help);
      expect(sentinel.navigated, 'live switch must NOT trigger a reload/navigation').toBe(false);
    });

    // SURFACE 2: MAIN MAP CONTROLS — MainControls.js is now wired (useLocale() +
    // t('mainctl.*')). Label + a representative option + the confirm button must all
    // flip to German LIVE on a pick, with NO reload. A PASS proves the formerly-
    // hardcoded panel now localizes.
    test('main controls (filter label + option + confirm) switch language LIVE on pick (no reload)', async ({ page }) => {
      const ok = await openLangPanel(page);
      test.skip(!ok, 'language control not mounted (INTL OFF)');
      const sentinel = installReloadSentinel(page);

      const filtroLabel = page.locator(FILTRO_LABEL);
      // Match the option by its RENDERED TEXT (translated), never its value attribute.
      const donorsOptionPt = page.locator(`${FILTRO_SELECT} option`, { hasText: STR['pt-BR'].donorsOption });
      const donorsOptionDe = page.locator(`${FILTRO_SELECT} option`, { hasText: STR.de.donorsOption });
      const confirm = page.locator(CONFIRM_BTN);

      // Arrange: confirm Portuguese start.
      await expect(filtroLabel).toHaveText(STR['pt-BR'].filterLabel, { timeout: 15000 });
      await expect(donorsOptionPt).toHaveCount(1);
      await expect(confirm).toContainText(STR['pt-BR'].confirm);

      // Act.
      await pickLocale(page, 'de');
      await expect(page.locator('html')).toHaveAttribute('lang', 'de', { timeout: 8000 });

      // Assert (the fix): each MainControls string localizes LIVE.
      await expect(
        filtroLabel,
        'MainControls filter label must localize LIVE via t("mainctl.filter.label") '
          + '(src/app/components/compatibility/components/MainControls.js)',
      ).toHaveText(STR.de.filterLabel, { timeout: 10000 });
      await expect(
        donorsOptionDe,
        'MainControls donors <option> text must localize LIVE via t("mainctl.filter.donors")',
      ).toHaveCount(1);
      await expect(
        donorsOptionPt,
        'the Portuguese donors option text must be GONE after the switch',
      ).toHaveCount(0);
      await expect(
        confirm,
        'MainControls confirm button must localize LIVE via t("mainctl.confirm.label")',
      ).toContainText(STR.de.confirm);
      expect(sentinel.navigated, 'live switch must NOT trigger a reload/navigation').toBe(false);
    });
  });

  // ── RELOAD lane (locale PERSISTED before load → measures the init path) ──────
  // These tests pay a cold-compile budget on the HDD; give them headroom so a
  // navigation timeout cannot masquerade as an assertion failure (triage T4).
  test.describe('after reload (persisted-init path)', () => {
    test.beforeEach(async ({ context }) => {
      await dismissOnboardingTour(context);
    });

    // The wired header DOES render the persisted language on a fresh load. This was
    // the CONTROL that passed even with the bug present (the reload path always
    // worked); it must keep passing after the fix.
    test('the wired header IS in German on a fresh load with de persisted', async ({ page, context }) => {
      test.setTimeout(120000); // cold-compile + full client mount budget on HDD
      await seedPersistedLocale(context, 'de');

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.locator(LEAFLET).first().waitFor({ state: 'visible', timeout: 60000 });

      await expect(page.locator(HEADER_REPORT)).toHaveText(STR.de.report, { timeout: 20000 });
      await expect(page.locator(HEADER_HELP_LABEL)).toHaveText(STR.de.help);
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    });

    // After the fix MainControls localizes on the persisted-init path too: a fresh
    // load with de persisted renders the filter label in German. (Formerly this
    // FAILED, proving the panel was hardcoded; now it must PASS.)
    test('main controls ARE in German on a fresh load with de persisted', async ({ page, context }) => {
      test.setTimeout(120000);
      await seedPersistedLocale(context, 'de');

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.locator(LEAFLET).first().waitFor({ state: 'visible', timeout: 60000 });
      // Confirm the wired header localized too, so this is not a "nothing loaded" miss.
      await expect(page.locator(HEADER_REPORT)).toHaveText(STR.de.report, { timeout: 20000 });

      await expect(
        page.locator(FILTRO_LABEL),
        'MainControls "filtro atual:" must render German "aktueller Filter:" on a fresh '
          + 'load in German (t("mainctl.filter.label"))',
      ).toHaveText(STR.de.filterLabel, { timeout: 10000 });
    });
  });

  // ── PERSISTENCE sanity (a picked locale survives a reload) ───────────────────
  // Not a duplicate of language-switch.e2e.js's 7-count check; this confirms the
  // user-facing follow-through: pick German live, RELOAD, the header stays German
  // (localStorage persisted + persisted-init applied it). One reason to fail.
  test.describe('persistence across reload', () => {
    test.beforeEach(async ({ context }) => {
      await seedStartLocale(context, 'pt-BR');
      await dismissOnboardingTour(context);
    });

    test('a picked language PERSISTS across a manual reload', async ({ page }) => {
      test.setTimeout(120000);
      const ok = await openLangPanel(page);
      test.skip(!ok, 'language control not mounted (INTL OFF)');

      const report = page.locator(HEADER_REPORT);
      await expect(report).toHaveText(STR['pt-BR'].report, { timeout: 15000 });

      await pickLocale(page, 'de');
      await expect(page.locator('html')).toHaveAttribute('lang', 'de', { timeout: 8000 });
      await expect(report).toHaveText(STR.de.report, { timeout: 10000 });

      // Now RELOAD: the choice must survive (persisted-init re-applies de).
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator(LEAFLET).first().waitFor({ state: 'visible', timeout: 60000 });
      await expect(
        page.locator(HEADER_REPORT),
        'the picked German locale must persist across a reload (localStorage mdf_locale)',
      ).toHaveText(STR.de.report, { timeout: 20000 });
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    });
  });
});
