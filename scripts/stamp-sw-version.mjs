#!/usr/bin/env node
/*
 * stamp-sw-version.mjs — runs as `prebuild` (npm hook) before `next build`.
 *
 * Why this exists: public/sw.js is a STATIC file served as-is from /sw.js.
 * Service-worker update detection is byte-comparison: if sw.js bytes are
 * identical between deploys, the browser keeps the OLD SW running and the
 * client never sees the existing "Nova versão disponível" toast — meaning
 * cached bundles never get refreshed and users stay stuck on stale code
 * (e.g., the F-12 fix in dropped_pin_invisible_mobile.yaml never reaches
 * users on the broken Samsung devices).
 *
 * What it does: rewrites the SW_VERSION constant in public/sw.js to embed
 *   `<package.json version>-<build timestamp>-<git short SHA>`
 * Every build → different version → sw.js bytes differ → updatefound fires
 * → the toast appears → the user adopts the new build with one tap.
 *
 * Also writes public/version.json so the running page can fetch its own
 * "current build" identifier — useful for the debug overlay and for any
 * future "stale shell, please reload" heuristic at the page level.
 *
 * Idempotent: safe to run twice. Source-controlled sw.js stays untouched
 * apart from the SW_VERSION line; running this script again with the same
 * inputs produces the same output (modulo timestamp).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '..');
const swPath        = path.join(repoRoot, 'public', 'sw.js');
const versionJsonPath = path.join(repoRoot, 'public', 'version.json');
const pkgPath       = path.join(repoRoot, 'package.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Git SHA is best-effort: fail-soft if git isn't available or this isn't
// a repo (e.g., a CI runner unpacking a tarball).
let gitSha = 'nogit';
try {
    gitSha = execSync('git rev-parse --short HEAD', {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim() || 'nogit';
} catch (_e) { /* not a git repo or git not installed — keep 'nogit' */ }

const buildTs = Date.now();
const version = `${pkg.version}-${buildTs}-${gitSha}`;

// ─── Stamp public/sw.js ────────────────────────────────────────────────────
let sw = fs.readFileSync(swPath, 'utf8');
const swVersionRe = /const\s+SW_VERSION\s*=\s*'[^']*';/;
if (!swVersionRe.test(sw)) {
    console.error(`[sw-stamp] FATAL: could not find SW_VERSION line in ${swPath}`);
    console.error(`[sw-stamp] Expected pattern: const SW_VERSION = '...';`);
    process.exit(1);
}
sw = sw.replace(swVersionRe, `const SW_VERSION = '${version}';`);
fs.writeFileSync(swPath, sw, 'utf8');

// ─── Write public/version.json (page-readable build identifier) ──────────
const versionJson = {
    version,
    pkgVersion: pkg.version,
    buildTs,
    gitSha,
    builtAt: new Date(buildTs).toISOString(),
};
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n', 'utf8');

console.log(`[sw-stamp] SW_VERSION stamped: ${version}`);
console.log(`[sw-stamp] public/version.json written`);
