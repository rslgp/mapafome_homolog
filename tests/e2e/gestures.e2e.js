// gestures.e2e.js — COOPERATIVE GESTURES lane (real Chrome). @gestures
//
// Regression net for UX-M01/UX-M02 (the scroll-trap root-cause fix):
//   1. DESKTOP: wheel over the LOCKED map scrolls the PAGE (not the map);
//      after engaging the map (focus), wheel belongs to the map again and
//      the hint pill goes away.
//   2. TOUCH: a one-finger swipe over the map scrolls the PAGE, and the
//      touch gate is attached (touch-action handoff class + veil overlay
//      present in the DOM).
//
// Each test SKIPS gracefully when the cooperative-gestures flag is OFF
// (NEXT_PUBLIC_COOP_GESTURES): with the flag off the gate artifacts are
// absent and the legacy behavior is covered by the pre-existing lanes.
const { test, expect } = require('@playwright/test');
const { dismissOnboardingTour } = require('./_helpers');

test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

const WHEEL_HINT = '.mdf-coopwheel';
const TOUCH_VEIL = '.mdf-cooptouch';
const COOP_TOUCH_CLASS = /mdf-coop-touch/;

async function gotoHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
  await page
    .locator('.leaflet-tile-loaded, img.leaflet-tile')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {});
}

test.describe('gestures: cooperative wheel @gestures', () => {
  test('wheel over the locked map scrolls the PAGE; focus hands the wheel back to the map', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'wheel is a fine-pointer story (mobile is the touch test)');
    await gotoHome(page);

    // Flag detection: the hint pill only mounts with the flag ON.
    const hint = page.locator(WHEEL_HINT);
    if ((await hint.count()) === 0) {
      test.skip(true, 'cooperative gestures flag OFF (no hint pill) — legacy lanes cover this build');
    }

    // 1. LOCKED: wheel over the map center must scroll the PAGE.
    const mapBox = await page.locator('.leaflet-container').first().boundingBox();
    await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled, 'wheel over the locked map did not scroll the page').toBeGreaterThan(0);

    // 2. ENGAGE: focus the container (the gate's focusin path) — the pill
    //    must unmount (phase done) and the page must stop stealing the wheel.
    //    Scroll back INSTANTLY (html has scroll-behavior:smooth; an animated
    //    scrollTo would still be mid-flight when the next wheel fires and the
    //    residual scrollY would false-fail the assertion below).
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
    // preventScroll: a plain focus() scroll-into-views the container under the
    // sticky header (~170px) and that movement would be misread as "the wheel
    // scrolled the page" below.
    await page
      .locator('.leaflet-container')
      .first()
      .evaluate((el) => el.focus({ preventScroll: true }));
    await expect(hint, 'hint pill should unmount after engagement').toHaveCount(0);

    // Baseline AFTER engagement; assert the wheel adds no page scroll on top.
    const baseY = await page.evaluate(() => window.scrollY);
    await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    const scrolledAfter = await page.evaluate(() => window.scrollY);
    expect(
      scrolledAfter,
      'after engagement the wheel must zoom the MAP, not scroll the page',
    ).toBe(baseY);
  });
});

test.describe('gestures: cooperative touch @gestures', () => {
  // NOTE on method: CDP Input.synthesizeScrollGesture is INERT in this
  // headless environment — a control probe scrolled 0px even OVER PLAIN PAGE
  // CONTENT outside the map — so "the page actually moved" cannot be asserted
  // through the compositor here. The lane asserts the CONTRACT the browser
  // honors instead: (a) computed touch-action includes pan-y on the container
  // (the browser owns one-finger vertical panning), (b) Leaflet's
  // leaflet-touch-drag class is absent (dragging disabled — Leaflet will not
  // preventDefault one-finger moves) while leaflet-touch-zoom remains (two
  // fingers still pan/zoom the map), and (c) the educative veil reacts to a
  // synthetic one-finger drag at the moment of intent.
  test('touch gate hands one finger to the page and keeps two for the map', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'touch gate mounts on coarse pointers only');
    await gotoHome(page);

    const container = page.locator('.leaflet-container').first();
    const hasGateClass = await container.evaluate((el) =>
      el.classList.contains('mdf-coop-touch'),
    );
    if (!hasGateClass) {
      test.skip(true, 'cooperative gestures flag OFF (no gate class) — legacy lanes cover this build');
    }
    await expect(container, 'touch-action handoff class must be on the container').toHaveClass(
      COOP_TOUCH_CLASS,
    );

    // (a) Browser contract: one-finger vertical pan belongs to the page.
    const contract = await container.evaluate((el) => ({
      touchAction: getComputedStyle(el).touchAction,
      touchDrag: el.classList.contains('leaflet-touch-drag'),
      touchZoom: el.classList.contains('leaflet-touch-zoom'),
    }));
    expect(contract.touchAction, 'touch-action must allow page panning').toContain('pan-y');
    // (b) Leaflet contract: dragging off (no preventDefault on one finger),
    //     touchZoom on (two fingers still move the map).
    expect(contract.touchDrag, 'leaflet-touch-drag must be absent (dragging disabled)').toBe(false);
    expect(contract.touchZoom, 'leaflet-touch-zoom must stay enabled (two-finger pan/zoom)').toBe(true);

    // (c) The veil is mounted and reacts to a one-finger drag past the slop.
    await expect(page.locator(TOUCH_VEIL), 'two-finger veil must be mounted').toHaveCount(1);
    await container.evaluate((el) => {
      const mk = (type, x, y) => {
        const evt = new Event(type, { bubbles: true });
        Object.defineProperty(evt, 'touches', { value: [{ clientX: x, clientY: y }] });
        el.dispatchEvent(evt);
      };
      mk('touchstart', 100, 100);
      mk('touchmove', 100, 140); // 40px > 10px slop
    });
    await expect(
      page.locator(`${TOUCH_VEIL}.mdf-cooptouch--on`),
      'veil must light up on a one-finger drag',
    ).toHaveCount(1);
  });
});
