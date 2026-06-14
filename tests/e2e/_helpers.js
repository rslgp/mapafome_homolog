// tests/e2e/_helpers.js — shared utilities for the Chrome E2E suite.
// Kept dependency-light and stateless so every spec can run fully in parallel.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Single source of truth for the route list: read it straight from the same
// parallel YAML the playwright config reads, so routes never drift between the
// config, the smoke gate, and these tests.
function loadParallelYaml() {
  const p = path.join(__dirname, '..', '..', 'playwright.parallel.yaml');
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

const ROUTES = loadParallelYaml().routes;

// Next.js renders an "error shell" (its built-in 404/500 page) that still
// returns 200 under `next dev`. A real render must NOT be that shell. This
// mirrors the heuristic in scripts/smoke200.mjs.
const ERROR_SHELL_MARKERS = [
  'This page could not be found',
  '404',
  'Application error',
  'Internal Server Error',
];

// Attach console + page-error capture to a page. Returns an array that fills
// with any genuinely-bad messages (errors / failed requests), so a test can
// assert "no uncaught console errors on this route".
function captureConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter known-benign noise: favicon 404s, third-party analytics blocked
      // offline, and the React DevTools nag are not app correctness failures.
      if (
        /favicon|gtag|googletagmanager|dataLayer|Download the React DevTools|ERR_INTERNET_DISCONNECTED/i.test(
          text,
        )
      ) {
        return;
      }
      errors.push(`console.error: ${text}`);
    }
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

// True if the rendered DOM looks like Next's error shell rather than a real page.
async function looksLikeErrorShell(page) {
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  // The home/title is "MAPA FOME"; an error shell won't contain real nav/content.
  const trimmed = body.trim();
  if (trimmed.length < 20) return true; // blank body
  return ERROR_SHELL_MARKERS.some((m) => trimmed.includes(m)) && trimmed.length < 400;
}

// Seed the "returning visitor" state so the first-run onboarding tour
// (GuidedTutorial) does NOT open over the map. The tour is gated by the cookie
// `mdf_tour_done` (see GuidedTutorial.js: setCookie/hasSeenTour) and opens 600ms
// after load when the cookie is absent — its `mdf-tour__backdrop` then intercepts
// every pointer event, which is exactly what was false-failing the disclosure
// clicks and starving the map-mount wait. A real returning user has this cookie;
// seeding it makes interaction tests deterministic without touching app code.
// Call with the test's `context` (browser context) BEFORE the first navigation.
async function dismissOnboardingTour(context) {
  // Playwright requires EITHER `url` OR `domain`+`path`, never both. Passing
  // `url` together with `path` throws "Cookie should have either url or path".
  // `url` alone is sufficient: Playwright derives domain+path+secure from it.
  await context.addCookies([
    {
      name: 'mdf_tour_done',
      value: '1',
      url: 'http://localhost:3000',
    },
  ]);
}

module.exports = {
  loadParallelYaml,
  ROUTES,
  captureConsoleErrors,
  looksLikeErrorShell,
  dismissOnboardingTour,
};
