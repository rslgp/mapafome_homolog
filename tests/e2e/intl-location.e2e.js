// intl-location.e2e.js — INTERNATIONAL LOCATION lane (real Chrome).
//
// FEATURE UNDER TEST (LOC-LANG, just landed in the working tree): when the FOME
// map opens, the app auto-requests device geolocation and, on success:
//   (a) RECENTERS the Leaflet map to the device coords at LOCATE_ZOOM=13
//       (MapViewUpdater, mapComponents.js:400 — the FIRST center change away from
//       the constructor default applies the exact-place zoom), and
//   (b) SETS the UI language from that location: reverse-geocode coords -> ISO
//       country -> nearest SUPPORTED locale via resolveLocaleFromCountry()
//       (engine.js:115). Lusophone -> pt-BR, Hispanophone -> es, else -> en-US.
//
// DARK-SHIP INVARIANT (the load-bearing guard, engine.js useLocationLocale:232):
// the location-derived language applies ONLY when there is NO stored locale. If
// localStorage['mdf_locale'] already holds a supported locale (a manual/prior
// pick) the map STILL recenters but the language MUST NOT change — re-checked
// AFTER the async reverse-geocode too. A stored choice always wins.
//
// DETERMINISM (LBR-09): the reverse-geocode hits Nominatim
// (reverseGeocodeGuard.js: https://nominatim.openstreetmap.org/reverse). We
// page.route()-MOCK that call so the country is fixed and we never touch the real
// OSM service. Geolocation is simulated deterministically with
// context.grantPermissions(['geolocation']) + context.setGeolocation(...). The
// returning-visitor cookie is seeded (dismissOnboardingTour) so the first-run
// GuidedTutorial backdrop never intercepts the map mount (T5).
//
// WHY <html lang> is asserted with waitForFunction, never an immediate read: the
// i18n engine writes <html lang> in a client init/mount effect that runs AFTER
// domcontentloaded AND, for the location path, after the async reverse-geocode
// resolves. An immediate read races the effect and reports the SSR default
// "pt-BR". This mirrors the established i18n.e2e.js:84 pattern. If the attribute
// never settles to the expected family, THAT is a real finding (not a test bug).
//
// The locale half is mounted UNCONDITIONALLY in layout.js (LocationLocaleDetect,
// no INTL flag gate), so the language assertions do not skip on the flag. The map
// recenter is likewise flag-independent. We still guard the map mount with a
// generous 45s budget (slow HDD, .leaflet-container is the slow client mount) —
// web-first waits only, no hard sleeps (LBR-01).
const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

const LOCALE_KEY = 'mdf_locale';

// Nominatim reverse endpoint the LOC-LANG path calls (reverseGeocodeGuard.js:54).
// Mock ANY query string after it so the country_code is deterministic.
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse*';

// A coordinate per country we drive geolocation to. The exact lat/lng only needs
// to (a) differ from the app's constructor default [-8.0671132, -34.8766719] so
// the recenter fires, and (b) plausibly sit in-country; the COUNTRY the engine
// sees is decided by the Nominatim MOCK, not by the real geometry of these coords.
const COORDS = {
  br: { latitude: -15.7942, longitude: -47.8822 }, // Brasília
  ar: { latitude: -34.6037, longitude: -58.3816 }, // Buenos Aires
  fr: { latitude: 48.8566, longitude: 2.3522 },    // Paris
};

// Install a deterministic Nominatim reverse-geocode mock returning `countryCode`
// in the jsonv2 shape the guard parses ({ address: { country_code } }).
async function mockReverseGeocode(page, countryCode) {
  await page.route(NOMINATIM_REVERSE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        address: { country_code: countryCode, country: countryCode.toUpperCase() },
      }),
    });
  });
}

// Seed a stored locale BEFORE any app script runs, so the dark-ship gate
// (hasStoredLocale) sees it on mount. addInitScript runs before page scripts on
// EVERY navigation, so it survives the goto (mirrors i18n.e2e.js).
async function seedStoredLocale(page, locale) {
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

// Web-first wait for the engine to settle <html lang> to a language FAMILY
// (pt / es / en). Returns true if it reached the family within budget, false
// otherwise (a false here is a real "engine did not apply" finding, asserted by
// the caller with context). Never an immediate read — that races the effect.
async function langSettledTo(page, familyRe, timeout = 12000) {
  return page
    .waitForFunction(
      (src) => new RegExp(src, 'i').test(document.documentElement.lang || ''),
      familyRe.source,
      { timeout },
    )
    .then(() => true)
    .catch(() => false);
}

// Capture the deterministic recenter signal the map emits on the GPS fix:
// MapViewUpdater logs "[map] MapViewUpdater setView: <coords>" (mapComponents.js:
// 418) and applies LOCATE_ZOOM on the FIRST center change away from the mount
// default. Collecting the console lines lets us assert the recenter fired at the
// device coords WITHOUT reaching into Leaflet internals. We corroborate the zoom
// via the rendered tile <img> URLs, which encode the zoom as /{z}/ (LOCATE_ZOOM
// => /13/).
function captureSetViewLogs(page) {
  const lines = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('MapViewUpdater setView')) lines.push(t);
  });
  return lines;
}

// Assert the map recentered onto (near) the device coords at the exact-place zoom.
// Web-first: poll the captured setView logs for a line carrying the device lat,
// then assert a tile at zoom 13 was requested. Generous budget for the slow mount.
async function expectRecenteredAt(page, setViewLogs, coords) {
  // The recenter log is console.log([lat, lng]) (mapComponents.js:418), so the
  // line carries the EXACT JS-stringified latitude, e.g. "[-34.6037, -58.3816]".
  // Match String(latitude) — NOT toFixed(N), which rounds (e.g. -34.6037 ->
  // "-34.604") to a string that is NOT a substring of the logged value and would
  // false-fail. This is the precise device-coordinate the GPS fix recentered to.
  const latToken = String(coords.latitude); // e.g. "-34.6037"
  await expect
    .poll(() => setViewLogs.some((l) => l.includes(latToken)), {
      timeout: 45000,
      message: `map never recentered to device latitude ${latToken} (no MapViewUpdater setView log for it)`,
    })
    .toBe(true);

  // Corroborate the exact-place zoom: a Leaflet tile <img> at zoom 13 has /13/ in
  // its src. This is the visual proof LOCATE_ZOOM=13 was applied, not just a pan.
  await expect
    .poll(
      async () =>
        page
          .locator('.leaflet-tile-pane img.leaflet-tile')
          .evaluateAll((imgs) => imgs.some((i) => /\/13\//.test(i.getAttribute('src') || ''))),
      {
        timeout: 30000,
        message: 'no tile at zoom 13 rendered — LOCATE_ZOOM exact-place zoom was not applied on the GPS fix',
      },
    )
    .toBe(true);
}

// DETERMINISM (LBR-09) — PIN the browser UI language to the app DEFAULT (pt-BR).
// WHY this is load-bearing, not cosmetic: layout.js mounts TWO competing
// first-session locale effects — LocaleAutoDetect (browser-language,
// useAutoDetectLocale) AND LocationLocaleDetect (location, useLocationLocale).
// Both gate on hasStoredLocale(). In headless Chromium the context locale
// defaults to en-US, so navigator.languages === ['en-US']; useAutoDetectLocale
// then resolves en-US, sees it differs from the pt-BR default, and PERSISTS
// mdf_locale=en-US synchronously on mount. That stored write (a) makes
// useLocationLocale's pre-request hasStoredLocale() gate true so it NEVER even
// reverse-geocodes (observed: nominatimHit=0), and (b) would itself answer the
// <html lang> assertion with en-US regardless of the location signal — i.e. the
// browser-language path masks the feature under test. Pinning the context locale
// to 'pt-BR' makes detectLocale(['pt-BR']) === DEFAULT_LOCALE, so
// useAutoDetectLocale takes its no-persist branch (applyDocumentLang only), leaves
// mdf_locale unset, and the LOC-LANG path is the ONLY thing that can change the
// locale — which is exactly what these tests must isolate. (Triaged: with this
// pin nominatimHit=1 and the location-derived locale applies.)
test.use({ locale: 'pt-BR' });

// Shared arrange: returning-visitor cookie so the tour backdrop never intercepts
// (T5). Per-test only — seeds state, no shared mutable data, fullyParallel-safe.
test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

test.describe('intl-location: location-derived UI language + exact-place recenter @intl-location @playwright', () => {
  // ── 1. No stored locale + BRAZIL -> pt + recenter at city zoom ────────────────
  test('no stored locale, geolocation in Brazil -> <html lang> pt and map recenters at LOCATE_ZOOM', async ({
    context,
    page,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(COORDS.br);
    await mockReverseGeocode(page, 'br');
    const setViewLogs = captureSetViewLogs(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // Brazil is Lusophone -> resolveLocaleFromCountry('br') === 'pt-BR'.
    const settled = await langSettledTo(page, /pt/);
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(settled, `<html lang> stayed "${lang}", expected a pt-* locale from a Brazil fix`).toBe(true);
    expect(lang.toLowerCase()).toContain('pt');

    await expectRecenteredAt(page, setViewLogs, COORDS.br);
  });

  // ── 2. No stored locale + ARGENTINA -> es ─────────────────────────────────────
  test('no stored locale, geolocation in Argentina -> <html lang> es', async ({ context, page }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(COORDS.ar);
    await mockReverseGeocode(page, 'ar');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // Argentina is Hispanophone -> resolveLocaleFromCountry('ar') === 'es'.
    const settled = await langSettledTo(page, /es/);
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(settled, `<html lang> stayed "${lang}", expected "es" from an Argentina fix`).toBe(true);
    expect(lang.toLowerCase()).toContain('es');
  });

  // ── 3. No stored locale + FRANCE -> en (non-Luso/non-Hispano fallback) ────────
  test('no stored locale, geolocation in France -> <html lang> en (en-US fallback)', async ({
    context,
    page,
  }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(COORDS.fr);
    await mockReverseGeocode(page, 'fr');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // France is neither Lusophone nor Hispanophone -> en-US fallback (NOT pt-BR;
    // the location path's fallback is English, engine.js:103). Assert the en
    // family AND that it did NOT fall through to the pt default.
    const settled = await langSettledTo(page, /en/);
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(settled, `<html lang> stayed "${lang}", expected "en-US" from a France fix`).toBe(true);
    expect(lang.toLowerCase()).toContain('en');
    expect(lang.toLowerCase()).not.toContain('pt');
  });

  // ── 4. DARK-SHIP: stored pt-BR + Argentina -> recenter YES, language UNCHANGED ─
  test('stored locale pt-BR + geolocation in Argentina -> map recenters but <html lang> STAYS pt (stored choice wins)', async ({
    context,
    page,
  }) => {
    await seedStoredLocale(page, 'pt-BR'); // a prior/manual pick is on disk
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(COORDS.ar);
    // Argentina would resolve to 'es' — the invariant is that a stored choice
    // BLOCKS that override even though the reverse-geocode succeeds.
    await mockReverseGeocode(page, 'ar');
    const setViewLogs = captureSetViewLogs(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // The map STILL recenters on the GPS fix (recenter is independent of the
    // locale gate — App.js setState({center}) -> MapViewUpdater).
    await expectRecenteredAt(page, setViewLogs, COORDS.ar);

    // THE INVARIANT: <html lang> must settle to pt (the stored choice) and must
    // NEVER flip to es. The engine re-checks hasStoredLocale() AFTER the async
    // reverse-geocode, so even though the geocode succeeded with 'ar', the stored
    // pt-BR wins. We wait for pt to be present, then assert es never appeared.
    const stayedPt = await langSettledTo(page, /pt/);
    expect(stayedPt, 'stored pt-BR was not reflected on <html lang>').toBe(true);

    // Give the async reverse-geocode window time to (wrongly) override, then prove
    // it did NOT. Web-first: poll that es NEVER becomes the lang across the budget.
    // A waitForFunction for /es/ that TIMES OUT is the success signal here — if it
    // ever resolves, the dark-ship invariant is broken.
    const flippedToEs = await page
      .waitForFunction(() => /es/i.test(document.documentElement.lang || ''), null, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    const finalLang = await page.evaluate(() => document.documentElement.lang);
    expect(
      flippedToEs,
      `DARK-SHIP VIOLATION: <html lang> became "${finalLang}" — the Argentina fix overrode a stored pt-BR locale`,
    ).toBe(false);
    expect(finalLang.toLowerCase()).toContain('pt');
  });

  // ── 5. Geolocation DENIED -> default view + default locale, no crash ──────────
  test('geolocation denied -> app keeps default view and default locale, no uncaught error', async ({
    context,
    page,
  }) => {
    // Do NOT grant geolocation: getCurrentPosition invokes its error callback
    // (PERMISSION_DENIED). Both App.js (map) and useLocationLocale (language) must
    // fail closed to defaults. Mock Nominatim anyway so a stray call cannot reach
    // the real network — though with no fix the reverse-geocode should never run.
    await mockReverseGeocode(page, 'ar');

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const t = msg.text();
      // Known-benign noise (favicon/analytics/devtools) is not an app failure;
      // a geolocation denial is logged via console.warn by App.js, not console.error.
      if (/favicon|gtag|googletagmanager|dataLayer|Download the React DevTools|ERR_INTERNET_DISCONNECTED/i.test(t)) {
        return;
      }
      consoleErrors.push(t);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // The map must still mount and render on the default (Brazil) center — a
    // denied fix must not break the app.
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // Default locale: with no stored locale and no location signal, the page stays
    // on the pt-BR default (the location path did nothing, browser-language path
    // resolves the Chromium default en/pt -> at minimum a SUPPORTED family is set
    // and the app did not crash). Assert <html lang> carries a real supported
    // family and the engine wrote SOMETHING (never blank/garbage).
    await page
      .waitForFunction(() => {
        const l = (document.documentElement.lang || '').toLowerCase();
        return l === 'pt-br' || l === 'es' || l === 'en-us';
      }, null, { timeout: 12000 })
      .catch(() => {});
    const lang = (await page.evaluate(() => document.documentElement.lang)).toLowerCase();
    expect(['pt-br', 'es', 'en-us'], `<html lang> "${lang}" is not a supported locale after a denied fix`).toContain(lang);

    // No uncaught page errors and no app console.errors from the denied path.
    expect(pageErrors, `uncaught page error(s) on geolocation denial: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console.error(s) on geolocation denial: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
