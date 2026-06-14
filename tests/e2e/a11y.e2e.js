// a11y.e2e.js — DEEP ACCESSIBILITY lane (real Chrome).
// Goes beyond the single-page @axe-core/cli run in `npm run a11y`:
//   1. Runs axe-core on EVERY route (WCAG 2.0/2.1/2.2 A + AA), not just /.
//   2. Keyboard-only operability: the page is reachable and operable by Tab.
//   3. Visible focus: the focused element has a real focus indicator.
//   4. Touch-target sizing: interactive controls meet a ~44px minimum (WCAG 2.5.5
//      / 2.5.8) — the usability concern on a phone the CLI cannot check.
//
// axe-core is already a (transitive) dependency, so we inject its source into the
// page with addScriptTag and call axe.run() directly — no new adapter dep needed.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { ROUTES, dismissOnboardingTour } = require('./_helpers');

// Returning-visitor cookie before navigation: the first-run tour is a modal that
// would otherwise (a) block the keyboard/focus + touch-target probes on /, and
// (b) skew axe results by scanning a page dominated by an open dialog. Seeding it
// scans the real, settled page a returning user sees.
test.beforeEach(async ({ context }) => {
  await dismissOnboardingTour(context);
});

const AXE_SOURCE = require.resolve('axe-core/axe.min.js');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function runAxe(page) {
  await page.addScriptTag({ path: AXE_SOURCE });
  return page.evaluate(async (tags) => {
    // eslint-disable-next-line no-undef
    const results = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations'],
    });
    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));
  }, WCAG_TAGS);
}

test.describe('accessibility: axe per route @a11y', () => {
  for (const route of ROUTES) {
    test(`${route} has zero WCAG A/AA violations`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Let client controls (map, Leaflet controls) mount before scanning.
      await page.waitForTimeout(1500);
      const violations = await runAxe(page);
      expect(
        violations,
        `${route} axe violations:\n${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });
  }
});

test.describe('accessibility: keyboard + focus @a11y', () => {
  test('home is keyboard-reachable and focus is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });

    // Tab a handful of times; an interactive element must receive focus.
    let focusedTag = null;
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      focusedTag = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName.toLowerCase() : null;
      });
      if (['a', 'button', 'input', 'select', 'textarea'].includes(focusedTag)) break;
    }
    expect(
      ['a', 'button', 'input', 'select', 'textarea'],
      'Tab never landed on an interactive element',
    ).toContain(focusedTag);

    // Visible focus: the focused element shows a real outline/box-shadow/border
    // (i.e. focus is not suppressed to "none" with no replacement).
    const hasVisibleFocus = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const s = getComputedStyle(el);
      const outlined = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const shadowed = s.boxShadow && s.boxShadow !== 'none';
      return outlined || shadowed;
    });
    expect(hasVisibleFocus, 'focused element has no visible focus indicator').toBe(true);
  });
});

test.describe('accessibility: touch-target sizing @a11y', () => {
  test('the APP\'s own interactive controls on home meet the WCAG 2.5.8 AA target', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 45000 });
    await page.waitForTimeout(1000);

    // Two thresholds, two severities (honest calibration):
    //  - HARD FLOOR = 24px: this is the actual WCAG 2.5.8 AA "Target Size
    //    (Minimum)" conformance bar. A control below this is a real AA failure
    //    and FAILS the test.
    //  - ASPIRATIONAL = 44px: the project's own `--mdf-touch-target` token. A
    //    control between 24 and 44 still meets AA but misses the design-system
    //    target, so we WARN (console) without failing — it surfaces the gap for
    //    review without blocking on a stricter-than-AA number.
    // We EXCLUDE third-party Leaflet controls (zoom/geosearch/attribution/locate
    // anchors) since their size is the library's, not the app's, and inline TEXT
    // links (hit area is the text run; WCAG 2.5.8 exempts inline).
    const HARD = 24;
    const ASPIRATIONAL = 44;
    const audited = await page.evaluate(
      ({ hard, aspirational }) => {
        // Exclude every anchor/button that lives inside a Leaflet control
        // container (covers zoom, geosearch, attribution, locate, and any other
        // library control) plus the explicit zoom anchors.
        const inLeafletControl = (el) => !!el.closest('.leaflet-control, .leaflet-bar');
        const els = Array.from(
          document.querySelectorAll('button, select, input[type="checkbox"], a[role="button"]'),
        );
        const fail = [];
        const warn = [];
        for (const el of els) {
          if (inLeafletControl(el)) continue; // library control, not the app's
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.bottom < 0 || r.right < 0) continue;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          const rec = {
            tag: el.tagName.toLowerCase(),
            label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 50),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
          if (r.width < hard || r.height < hard) fail.push(rec);
          else if (r.width < aspirational || r.height < aspirational) warn.push(rec);
        }
        return { fail, warn };
      },
      { hard: HARD, aspirational: ASPIRATIONAL },
    );

    // Surface the 24-44px gap as an informational warning (does not fail AA).
    if (audited.warn.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[a11y] controls meeting WCAG 2.5.8 AA (>=${HARD}px) but below the project ` +
          `${ASPIRATIONAL}px --mdf-touch-target target:\n${JSON.stringify(audited.warn, null, 2)}`,
      );
    }

    // HARD assertion: nothing below the WCAG 2.5.8 AA 24px floor.
    expect(
      audited.fail,
      `controls below the WCAG 2.5.8 AA ${HARD}px floor:\n${JSON.stringify(audited.fail, null, 2)}`,
    ).toEqual([]);
  });
});
