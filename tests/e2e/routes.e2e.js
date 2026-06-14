// routes.e2e.js — CODE/ROUTE VALIDATION lane.
// For every route in the SOT list: 200 + a real render (not Next's error shell)
// + no uncaught console errors / page errors. This is the browser-level cousin
// of scripts/smoke200.mjs, but run in real Chromium so it also catches client
// hydration/runtime errors a static-HTML check cannot see.
const { test, expect } = require('@playwright/test');
const { ROUTES, captureConsoleErrors, looksLikeErrorShell } = require('./_helpers');

test.describe('route validation @code', () => {
  for (const route of ROUTES) {
    test(`${route} renders 200 + real content, no console errors`, async ({ page }) => {
      const errors = captureConsoleErrors(page);

      const resp = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(resp, `no response for ${route}`).toBeTruthy();
      expect(resp.status(), `${route} HTTP status`).toBe(200);

      // Wait for the client render to actually produce content before judging
      // "real render vs error shell". Without this, a route still compiling under
      // `next dev` on a slow HDD reads as a blank body and false-fails — the body
      // is empty only because React has not hydrated yet, not because the page is
      // broken. Give it a generous budget; THEN apply the shell heuristic.
      await page
        .waitForFunction(() => (document.body.innerText || '').trim().length > 20, null, {
          timeout: 45000,
        })
        .catch(() => {});

      // Real render: a non-trivial <body> that is not the Next error shell.
      const isShell = await looksLikeErrorShell(page);
      expect(isShell, `${route} rendered Next error shell / blank body`).toBe(false);

      // Give client JS a beat to throw any runtime/hydration error.
      await page.waitForTimeout(500);
      expect(errors, `${route} emitted console/page errors:\n${errors.join('\n')}`).toEqual([]);
    });
  }

  test('home page exposes the app title (real render proof) @code', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MAPA FOME/i);
  });
});
