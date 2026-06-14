// interactions.e2e.js — FOCUSED INTERACTION lane (real Chrome). @interactions
//
// Four things the user asked to verify directly:
//   1. The LANGUAGE disclosure CLOSES (open -> close button -> hidden + collapsed).
//   2. The COUNTRY-flag disclosure CLOSES (open -> close button -> hidden + collapsed).
//   3. Picking a country RECENTERS the map onto that country. Only Brazil carries
//      hard COUNTRY_BOUNDS, so this exercises the real map.fitBounds() path:
//      start the view OFF Brazil (Paris), pick "Brasil", assert the map ends up
//      showing Brazil. (The non-bounds path is a zoom-out fallback, out of scope.)
//   4. The map TILES actually load/hit the provider (not a blank gray box) — the
//      "mapboxhit" check. This app uses NO Mapbox: the default tile layer is Waze
//      (worldtiles1.waze.com/{z}/{x}/{y}.png), with OSM-FR + ArcGIS as the other
//      two layers. We assert a real tile <img> loaded AND a tile request returned
//      200, AND (for recenter) that post-pick tiles decode to Brazilian coords.
//
// Controls are native L.Control instances mounted client-side in a useEffect, so
// they are ABSENT from server HTML and only appear after JS runs — a browser test
// (not jsdom) is the right tool. Each control test SKIPS gracefully when the
// control is not mounted (INTL flag OFF), so the lane is honest on either flag.
const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

// Seed the "returning visitor" cookie BEFORE any navigation so the first-run
// GuidedTutorial does NOT open its full-screen mdf-tour__backdrop over the map.
// That backdrop intercepts every pointer event and was the real cause of the
// disclosure-click failures in the usability lane — NOT disk thrash. Without
// this, every close/recenter test here would false-fail the same way.
test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

// Selectors from the real DOM contract (CountryFlagControl.js / LanguageControl.js):
// both share .mdf-flag; disambiguate the toggle by its aria-controls target.
const LANG_TOGGLE = 'button.mdf-flag__btn[aria-controls="mdf-lang-panel"]';
const LANG_PANEL = '#mdf-lang-panel';
// NOTE: the language panel has NO close (X) button — its close paths are the
// toggle, Escape, and outside-click (LanguageControl.js builds only title+list).
const FLAG_TOGGLE = 'button.mdf-flag__btn[aria-controls="mdf-flag-panel"]';
const FLAG_PANEL = '#mdf-flag-panel';
const FLAG_CLOSE = '#mdf-flag-panel button.mdf-flag__close';

// Brazil's COUNTRY_BOUNDS (countries.js): index 0 = NORTH corner, 1 = SOUTH corner.
// [[lat,lng],[lat,lng]] => N=0.2759 S=-35.558 W=-59.1789 E=-28.9445.
const BR = { N: 0.275901, S: -35.558031, W: -59.178876, E: -28.944502 };

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
  // Wait for at least one tile to have loaded so the map is interactive.
  await page
    .locator('.leaflet-tile-loaded, img.leaflet-tile')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {});
}

// Decode a standard XYZ tile (z/x/y) to the lat/lng of its NW corner.
// Brazil-area tiles will have negative lng (west) and a lat that spans the BR box.
function tileToLatLng(z, x, y) {
  const n = Math.pow(2, z);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

// Pull z/x/y out of any of the three providers' tile URLs we may see.
// Waze:   worldtiles1.waze.com/tiles/{z}/{x}/{y}.png
// OSM-FR: {s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
// ArcGIS: .../World_Imagery/MapServer/tile/{z}/{y}/{x}  (NOTE y/x order)
function parseTileUrl(url) {
  let m = url.match(/\/tiles\/(\d+)\/(\d+)\/(\d+)\.png/); // Waze
  if (m) return { z: +m[1], x: +m[2], y: +m[3] };
  m = url.match(/\/hot\/(\d+)\/(\d+)\/(\d+)\.png/); // OSM-FR HOT
  if (m) return { z: +m[1], x: +m[2], y: +m[3] };
  m = url.match(/\/MapServer\/tile\/(\d+)\/(\d+)\/(\d+)/); // ArcGIS z/y/x
  if (m) return { z: +m[1], y: +m[2], x: +m[3] };
  return null;
}

test.describe('interactions: disclosures close @interactions', () => {
  // The close CONTRACT has two halves we assert separately so a failure is precise:
  //   (logic)  the control sets the panel's `hidden` attribute + flips the trigger's
  //            aria-expanded to "false". This is what the JS owns.
  //   (visual) the panel actually DISAPPEARS (Playwright toBeHidden / computed
  //            display:none). This is owned by CSS.
  // FINDING (confirmed in CountryFlagControl.css): `.mdf-flag__panel { display:flex }`
  // has NO `[hidden]` override, so the native `hidden` attribute's display:none is
  // overridden — the panel stays laid out when "closed". So we assert the logic
  // STRICTLY (must pass) and report the visual close as a soft, clearly-labelled
  // check so the run pinpoints the CSS gap instead of a vague "click failed".
  const assertClosedLogic = async (panel, toggle, how) => {
    await expect(panel, `${how}: panel did not get the hidden attribute`).toHaveAttribute(
      'hidden',
      '',
    );
    await expect(
      toggle.first(),
      `${how}: trigger aria-expanded not reset to false`,
    ).toHaveAttribute('aria-expanded', 'false');
  };
  const reportVisualClose = async (panel, how) => {
    const visuallyHidden = await panel.isHidden();
    if (!visuallyHidden) {
      // Not a hard failure of the close LOGIC; a known CSS gap. Surface it loudly.
      console.warn(
        `[FINDING] ${how}: panel has hidden="" but is still visually rendered — ` +
          `.mdf-flag__panel lacks a [hidden]{display:none} rule (display:flex wins).`,
      );
    }
    return visuallyHidden;
  };

  test('language disclosure opens then CLOSES (attribute + aria; reports visual)', async ({
    page,
  }) => {
    await gotoHome(page);
    const toggle = page.locator(LANG_TOGGLE);
    if ((await toggle.count()) === 0) test.skip(true, 'language control not mounted (INTL OFF)');

    await toggle.first().click();
    const panel = page.locator(LANG_PANEL);
    await expect(panel).toBeVisible();
    await expect(toggle.first()).toHaveAttribute('aria-expanded', 'true');

    // The language panel has NO close (X) button (LanguageControl.js builds only a
    // title + list); its close paths are the toggle, Escape, and outside-click.
    await toggle.first().click(); // toggle closes
    await assertClosedLogic(panel, toggle, 'toggle');
    const visToggle = await reportVisualClose(panel, 'toggle');

    // Re-open and close via Escape — logic must close AND return focus to trigger.
    await toggle.first().click();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await assertClosedLogic(panel, toggle, 'Escape');
    await expect(toggle.first(), 'Escape did not return focus to the trigger').toBeFocused();
    const visEsc = await reportVisualClose(panel, 'Escape');

    // Hard-assert the visual close LAST so the logic + focus assertions above are
    // always reported. This is the line that catches the CSS [hidden] gap.
    expect(
      visToggle && visEsc,
      'panel hidden attribute is set but it remains visually rendered (CSS [hidden] gap)',
    ).toBe(true);
  });

  test('country disclosure opens then CLOSES via the X button and via Escape', async ({ page }) => {
    await gotoHome(page);
    const toggle = page.locator(FLAG_TOGGLE);
    if ((await toggle.count()) === 0) test.skip(true, 'country control not mounted (INTL OFF)');

    // Close via the discoverable X button.
    await toggle.first().click();
    const panel = page.locator(FLAG_PANEL);
    await expect(panel).toBeVisible();
    await expect(toggle.first()).toHaveAttribute('aria-expanded', 'true');
    const closeBtn = page.locator(FLAG_CLOSE);
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await assertClosedLogic(panel, toggle, 'X button');
    await expect(toggle.first(), 'X button did not return focus to the trigger').toBeFocused();
    const visX = await reportVisualClose(panel, 'X button');

    // Re-open and close via Escape too.
    await toggle.first().click();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await assertClosedLogic(panel, toggle, 'Escape');
    const visEsc = await reportVisualClose(panel, 'Escape');

    expect(
      visX && visEsc,
      'panel hidden attribute is set but it remains visually rendered (CSS [hidden] gap)',
    ).toBe(true);
  });
});

test.describe('interactions: map recenters on country pick @interactions', () => {
  test('zoom out to a world view, pick Brasil -> map recenters/zooms onto Brazil (fitBounds)', async ({
    page,
  }) => {
    await gotoHome(page);
    const toggle = page.locator(FLAG_TOGGLE);
    if ((await toggle.count()) === 0) test.skip(true, 'country control not mounted (INTL OFF)');

    // The home map defaults to Brazil (DEFAULT_COUNTRY='br'), so to PROVE the pick
    // actually drove a fitBounds we must first move the view to a clearly DIFFERENT
    // state, then show the pick changed it. We can't reach the Leaflet instance
    // (no window.L handle), but we CAN drive the view with real UI gestures: zoom
    // the map all the way OUT with the mouse wheel so the pre-pick state is a low-
    // zoom world view. Then picking Brazil must fitBounds back IN onto Brazil — a
    // higher zoom whose tiles decode to Brazilian coordinates.
    const tilesAt = (arr) => (req) => {
      const t = parseTileUrl(req.url());
      if (t) arr.push({ ...tileToLatLng(t.z, t.x, t.y), z: t.z });
    };
    const preTiles = [];
    const preHandler = tilesAt(preTiles);
    page.on('request', preHandler);

    // Zoom OUT to a world view by wheeling up over the map center.
    const mapBox = await page.locator('.leaflet-container').first().boundingBox();
    const cx = mapBox.x + mapBox.width / 2;
    const cy = mapBox.y + mapBox.height / 2;
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 600); // wheel down = zoom out in Leaflet default
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(1500);

    // Swap to a post-pick collector.
    page.off('request', preHandler);
    const postTiles = [];
    page.on('request', tilesAt(postTiles));

    // Open the picker and choose Brazil by its data-code.
    await toggle.first().click();
    await expect(page.locator(FLAG_PANEL)).toBeVisible();
    const brOption = page.locator('#mdf-flag-panel button.mdf-flag__option[data-code="br"]');
    await brOption.scrollIntoViewIfNeeded().catch(() => {});
    await brOption.click();

    // After fitBounds(Brazil): the control sets the panel's hidden attribute and
    // the map repaints a Brazil viewport. We assert the close LOGIC by attribute
    // (the panel stays visually rendered due to the known .mdf-flag__panel CSS
    // [hidden] gap, so toBeHidden would false-fail before the recenter checks run).
    await expect(page.locator(FLAG_PANEL)).toHaveAttribute('hidden', '');
    await page.waitForTimeout(2500);

    // (a) At least one post-pick tile must fall inside the Brazil box (a tile
    //     covers area, so allow a tolerant expansion for a border-straddling tile).
    const TOL = 8;
    const inBrazil = postTiles.some(
      ({ lat, lng }) => lat <= BR.N + TOL && lat >= BR.S - TOL && lng >= BR.W - TOL && lng <= BR.E + TOL,
    );
    expect(
      inBrazil,
      `no post-pick tile fell within Brazil bounds. sampled post-pick corners: ` +
        JSON.stringify(postTiles.slice(0, 8)),
    ).toBe(true);

    // (b) Recenter PROOF that does NOT assume a zoom DIRECTION: from a zoomed-out
    //     world view, fitBounds(Brazil) lands at a whole-country zoom that may be a
    //     LOWER number than the pre-pick max (a previous flawed assertion assumed
    //     it always zooms IN and false-failed when pre=z7 -> post=z5). The honest
    //     contract is: the VIEW CENTER MOVED onto Brazil. Compare the average tile
    //     center before vs after; after the pick it must sit inside the Brazil box,
    //     and it must have moved a non-trivial distance from the pre-pick center.
    const avg = (arr) =>
      arr.length
        ? {
            lat: arr.reduce((s, t) => s + t.lat, 0) / arr.length,
            lng: arr.reduce((s, t) => s + t.lng, 0) / arr.length,
          }
        : null;
    const preC = avg(preTiles);
    const postC = avg(postTiles);
    expect(postC, 'no post-pick tiles were requested — map did not repaint').toBeTruthy();
    const postCenterInBrazil =
      postC.lat <= BR.N + TOL &&
      postC.lat >= BR.S - TOL &&
      postC.lng >= BR.W - TOL &&
      postC.lng <= BR.E + TOL;
    expect(
      postCenterInBrazil,
      `post-pick view center (${postC.lat.toFixed(1)},${postC.lng.toFixed(1)}) is not over Brazil — fitBounds did not recenter`,
    ).toBe(true);
    if (preC) {
      const moved = Math.abs(postC.lat - preC.lat) + Math.abs(postC.lng - preC.lng);
      expect(
        moved,
        `view center barely moved (delta=${moved.toFixed(1)} deg) from pre=(${preC.lat.toFixed(1)},${preC.lng.toFixed(1)}) — recenter may be a no-op`,
      ).toBeGreaterThan(2);
    }
  });

  // A NON-Brazil pick must zoom IN to that country's CAPITAL CITY (setView at the
  // fixed CAPITAL_PICK_ZOOM=11), NOT frame the whole country (that fitBounds path
  // is Brazil-only) and NOT stay at the world view. We pick France and prove the
  // post-pick viewport sits over PARIS at a city-level zoom. Brazil's own capital
  // (Brasília) is deliberately NOT used — Brazil keeps fitBounds — so this test is
  // the one that exercises the new setView(capital) branch end-to-end.
  const PARIS = { lat: 48.8566, lng: 2.3522 }; // COUNTRY_CAPITALS['fr']
  test('pick France -> map zooms IN onto Paris (capital setView, not whole-country)', async ({
    page,
  }) => {
    await gotoHome(page);
    const toggle = page.locator(FLAG_TOGGLE);
    if ((await toggle.count()) === 0) test.skip(true, 'country control not mounted (INTL OFF)');

    // Collect tile coords AFTER the pick so we can decode where the camera landed.
    const postTiles = [];
    const collect = (req) => {
      const t = parseTileUrl(req.url());
      if (t) postTiles.push({ ...tileToLatLng(t.z, t.x, t.y), z: t.z });
    };

    // Open the picker and choose France by its data-code, then start collecting.
    await toggle.first().click();
    await expect(page.locator(FLAG_PANEL)).toBeVisible();
    const frOption = page.locator('#mdf-flag-panel button.mdf-flag__option[data-code="fr"]');
    await frOption.scrollIntoViewIfNeeded().catch(() => {});
    page.on('request', collect);
    await frOption.click();

    // Close LOGIC asserted by attribute (the .mdf-flag__panel [hidden] CSS gap means
    // toBeHidden would false-fail; the camera assertions are what this test is for).
    await expect(page.locator(FLAG_PANEL)).toHaveAttribute('hidden', '');
    await page.waitForTimeout(2500);

    expect(postTiles.length, 'no tiles requested after the France pick — map did not repaint').toBeGreaterThan(0);

    // (a) The view is at a CITY-level zoom, not a country/world view. CAPITAL_PICK_ZOOM
    //     is 11; tiles at the new viewport must be high-zoom. Allow a small margin for
    //     a transient lower-zoom tile fetched mid-animation: require the MAX seen z>=9.
    const maxZ = Math.max(...postTiles.map((t) => t.z));
    expect(maxZ, `expected a city-level zoom (>=9) after capital pick, saw max z=${maxZ}`).toBeGreaterThanOrEqual(9);

    // (b) At the city zoom, at least one tile must decode to within ~1.5° of Paris —
    //     proof the camera centered on the CAPITAL, not merely "somewhere in France".
    const TOL = 1.5;
    const nearParis = postTiles.some(
      (t) => Math.abs(t.lat - PARIS.lat) <= TOL && Math.abs(t.lng - PARIS.lng) <= TOL,
    );
    expect(
      nearParis,
      `no post-pick tile landed near Paris (${PARIS.lat},${PARIS.lng}). sampled: ` +
        JSON.stringify(postTiles.slice(0, 8)),
    ).toBe(true);

    // (c) Negative guard: the view is NOT over Brazil (would mean the pick wrongly
    //     kept the default-country viewport). No high-zoom tile should sit in the BR box.
    const overBrazil = postTiles.some(
      ({ lat, lng, z }) => z >= 9 && lat <= BR.N && lat >= BR.S && lng >= BR.W && lng <= BR.E,
    );
    expect(overBrazil, 'a city-zoom tile fell inside Brazil after picking France — wrong viewport').toBe(false);

    page.off('request', collect);
  });
});

test.describe('interactions: map tiles load/hit @interactions', () => {
  test('the default tile layer actually fetches + renders tiles (not a blank map)', async ({
    page,
  }) => {
    let tile200 = false;
    page.on('response', (resp) => {
      if (parseTileUrl(resp.url()) && resp.status() === 200) tile200 = true;
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // A real tile <img> must be in the loaded state (map is not a gray box).
    await expect(page.locator('.leaflet-tile-loaded, img.leaflet-tile').first()).toBeVisible({
      timeout: 30000,
    });
    // And the network must show a tile request that returned 200.
    await page.waitForTimeout(1500);
    expect(tile200, 'no map-tile request returned HTTP 200 (tiles never hit a provider)').toBe(true);
  });
});
