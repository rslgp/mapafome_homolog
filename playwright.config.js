// playwright.config.js — the APPLIER. All parallelism/serving knobs live in the
// human-editable SOT `playwright.parallel.yaml`; this file just loads that YAML
// and maps it onto Playwright's config shape. Edit parallelism in the YAML, not
// here. (Playwright's config is JS, so a thin loader is the honest way to drive
// it from YAML — Playwright does not read YAML natively.)
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI;

// Load the parallelism SOT.
const yamlPath = path.join(__dirname, 'playwright.parallel.yaml');
const cfg = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

const P = cfg.parallel;
const pick = (obj) => (isCI ? obj.ci : obj.local); // choose ci/local variant

// Map the YAML project entries onto Playwright projects, resolving device presets.
const projects = (cfg.projects || []).map((p) => {
  const use = { ...p.use };
  if (use.device) {
    // Expand a Playwright device preset (e.g. "Pixel 7") into its `use` block,
    // then let any explicit keys in the YAML override the preset.
    const preset = devices[use.device] || {};
    delete use.device;
    return { name: p.name, use: { ...preset, ...use } };
  }
  return { name: p.name, use };
});

module.exports = defineConfig({
  testDir: cfg.discovery.testDir,
  testMatch: cfg.discovery.testMatch,
  outputDir: cfg.discovery.outputDir,

  fullyParallel: P.fullyParallel,
  workers: pick(P.workers),
  retries: pick(P.retries),
  forbidOnly: isCI && !!P.forbidOnly_in_ci,

  timeout: P.timeouts.testMs,
  globalTimeout: P.timeouts.globalMs,
  expect: { timeout: P.timeouts.expectMs },

  // Sharding: only emit a shard object when total > 1 (Playwright rejects 1/1
  // via config; CLI --shard=i/n still works for ad-hoc fan-out).
  ...(P.shard && P.shard.total > 1
    ? { shard: { total: P.shard.total, current: P.shard.index } }
    : {}),

  reporter: (cfg.reporters || ['list']).map((r) => (r === 'html' ? ['html', { open: 'never' }] : [r])),

  use: {
    baseURL: cfg.baseURL,
    actionTimeout: P.timeouts.actionMs,
    navigationTimeout: P.timeouts.navigationMs,
    screenshot: cfg.artifacts.screenshot,
    video: cfg.artifacts.video,
    trace: cfg.artifacts.trace,
  },

  projects,

  webServer: {
    command: cfg.webServer.command,
    url: cfg.webServer.url,
    reuseExistingServer: cfg.webServer.reuseExistingServer,
    timeout: cfg.webServer.timeoutMs,
    cwd: path.resolve(__dirname, cfg.webServer.cwd || '.'),
  },
});

// Re-export the route + meta blocks so specs read the same SOT the config does
// (one source of truth for the route list the code-validation lane iterates).
module.exports.PARALLEL_YAML = cfg;
