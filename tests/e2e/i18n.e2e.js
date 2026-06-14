// i18n.e2e.js — IN-BROWSER i18n PARITY lane (real Chrome).
// The repo already has a STATIC parity test (test/i18n.test.js deep-equals the
// key tables). This complements it at RUNTIME, in the rendered DOM:
//   1. No raw/missing i18n KEY leaks into the visible text (a t() miss renders
//      the literal "namespace.key" string — catch it on screen).
//   2. Forcing a locale via localStorage actually renders that locale's UI.
//   3. Switching locale at runtime re-renders strings (no stale text).
//
// Locale is persisted under localStorage['mdf_locale'] and a switch dispatches
// the 'mdf-locale-change' event (see ux/i18n/engine.js).
const { test, expect } = require('@playwright/test');

const LOCALE_KEY = 'mdf_locale';

// A raw-key leak looks like a dotted lowercase identifier with no spaces, e.g.
// "lang.button", "country.search", "filter.period.daily". Real copy has spaces
// / accents / punctuation. We scan visible text for tokens matching this shape.
const RAW_KEY_RE = /\b[a-z][a-z0-9]*(?:\.[a-z0-9_]+){1,4}\b/g;
// Allowlist: dotted tokens that are legitimately visible (URLs, file names,
// version strings, domains). Keep tight; expand only with evidence.
const ALLOW = [
  /\.(?:com|br|org|net|io|js|json|png|svg|webp|html)\b/i, // domains / files
  /\bv?\d+\.\d+\.\d+\b/, // semver
  /mapafome\.com/i,
  /\d/, // anything containing a digit (coords, versions, counts)
];

async function setLocale(page, locale) {
  await page.addInitScript(
    ([k, v]) => {
      try {
        window.localStorage.setItem(k, v);
      } catch (_e) {
        /* ignore */
      }
    },
    [LOCALE_KEY, locale],
  );
}

async function visibleText(page) {
  return page.evaluate(() => document.body.innerText || '');
}

function findRawKeyLeaks(text) {
  const hits = (text.match(RAW_KEY_RE) || []).filter((tok) => {
    // Must contain at least one dot-segment that looks like an i18n namespace
    // (e.g. starts with a known-ish namespace) AND not be allowlisted.
    if (ALLOW.some((re) => re.test(tok))) return false;
    // Heuristic: i18n keys we use are namespaced like x.y or x.y.z with short
    // lowercase segments. Require >=2 segments and total length < 40.
    return tok.length < 40 && tok.split('.').length >= 2;
  });
  return Array.from(new Set(hits));
}

test.describe('i18n: no raw key leaks @i18n', () => {
  for (const locale of ['pt-BR', 'es', 'en-US']) {
    test(`home renders real copy (no untranslated keys) in ${locale}`, async ({ page }) => {
      await setLocale(page, locale);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // The raw-key scan does NOT need the Leaflet map (which is the slow part on
      // this HDD) — it needs the translated page chrome. Wait for the body to
      // carry real, substantial text (the i18n pass has run), with a generous
      // budget for a cold-compiling route. This decouples the i18n check from the
      // map mount, so disk-induced map slowness no longer false-fails it.
      await page
        .waitForFunction(() => (document.body.innerText || '').trim().length > 200, null, {
          timeout: 45000,
        })
        .catch(() => {});
      await page.waitForTimeout(500);

      const leaks = findRawKeyLeaks(await visibleText(page));
      expect(
        leaks,
        `${locale}: untranslated i18n keys leaked into the DOM: ${leaks.join(', ')}`,
      ).toEqual([]);
    });
  }
});

test.describe('i18n: locale actually applies + re-renders @i18n', () => {
  test('switching the persisted locale changes the <html lang> and the UI text', async ({
    page,
  }) => {
    // Load pt-BR first.
    await setLocale(page, 'pt-BR');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
    // The i18n engine writes <html lang> in a client init effect (engine.js
    // applyDocumentLang), which runs AFTER domcontentloaded — so we must WAIT
    // for the attribute to settle rather than read it immediately (an immediate
    // read races the effect and reports the SSR default "pt-BR"). waitForFunction
    // gives the engine its beat; if it never sets es, THAT is a real finding.
    await page
      .waitForFunction(() => /pt/i.test(document.documentElement.lang), null, { timeout: 10000 })
      .catch(() => {});
    const langPt = await page.evaluate(() => document.documentElement.lang);
    const textPt = await visibleText(page);

    // Now force es and reload; the rendered text must differ from pt.
    // IMPORTANT: setLocale() registered an addInitScript that re-seeds 'pt-BR' on
    // EVERY navigation (including reload) BEFORE page scripts run — so a plain
    // localStorage.setItem('es') would be clobbered back to pt-BR by that init
    // script on reload. Register a NEW init script that writes 'es' last (init
    // scripts run in registration order, so this one wins), then reload.
    await page.addInitScript(
      ([k, v]) => {
        try {
          window.localStorage.setItem(k, v);
        } catch (_e) {
          /* ignore */
        }
      },
      [LOCALE_KEY, 'es'],
    );
    await page.evaluate((k) => window.localStorage.setItem(k, 'es'), LOCALE_KEY);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
    // Wait for the engine to reflect the persisted es locale onto <html lang>.
    // If this times out, the app is NOT applying a persisted non-default locale
    // to <html lang> at init — a real WCAG 3.1.1 finding worth reporting.
    const langApplied = await page
      .waitForFunction(() => /es/i.test(document.documentElement.lang), null, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    const langEs = await page.evaluate(() => document.documentElement.lang);
    const textEs = await visibleText(page);

    // <html lang> should reflect the chosen locale family (pt vs es).
    expect(langPt.toLowerCase()).toContain('pt');
    expect(
      langApplied,
      `<html lang> stayed "${langEs}" after persisting es — engine did not apply the stored locale at init (WCAG 3.1.1)`,
    ).toBe(true);
    expect(langEs.toLowerCase()).toContain('es');
    // And the visible copy must have actually changed between the two locales.
    expect(textEs, 'UI text did not change when locale switched pt-BR -> es').not.toBe(textPt);
  });
});
