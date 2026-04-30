#!/usr/bin/env node
/*
 * bump-version.mjs — bump the project version and re-stamp the service worker.
 *
 * Usage:
 *   node scripts/bump-version.mjs patch     # 0.1.0 → 0.1.1
 *   node scripts/bump-version.mjs minor     # 0.1.0 → 0.2.0
 *   node scripts/bump-version.mjs major     # 0.1.0 → 1.0.0
 *   node scripts/bump-version.mjs 1.2.3     # explicit set
 *   node scripts/bump-version.mjs           # defaults to patch
 *
 * Wrapper scripts:
 *   update-version.bat <arg>   (Windows cmd)
 *   update-version.sh  <arg>   (bash / WSL / macOS / Linux)
 *
 * What it does, in order:
 *   1. Validate the bump argument (or compute next-patch).
 *   2. Rewrite package.json with the new version (preserves indentation
 *      and trailing newline so the diff stays clean).
 *   3. Invoke scripts/stamp-sw-version.mjs so public/sw.js + public/version.json
 *      reflect the new version immediately — no need to also run `npm run build`
 *      just to refresh those files in dev.
 *
 * Why this exists alongside `npm version`: this command also stamps the
 * service-worker file, which is the load-bearing piece for forcing every
 * browser to update. `npm version` alone bumps package.json but leaves
 * sw.js stale until the next build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '..');
const pkgPath    = path.join(repoRoot, 'package.json');
const stampPath  = path.join(__dirname, 'stamp-sw-version.mjs');

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const ARG_KEYWORDS = new Set(['major', 'minor', 'patch']);

function parseSemver(s) {
    const m = SEMVER_RE.exec(s);
    if (!m) return null;
    return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function fmtSemver(v) {
    return `${v.major}.${v.minor}.${v.patch}`;
}

function bump(current, kind) {
    if (kind === 'major') return { major: current.major + 1, minor: 0, patch: 0 };
    if (kind === 'minor') return { major: current.major, minor: current.minor + 1, patch: 0 };
    if (kind === 'patch') return { major: current.major, minor: current.minor, patch: current.patch + 1 };
    throw new Error(`unknown bump kind: ${kind}`);
}

function main() {
    const arg = (process.argv[2] || 'patch').trim();

    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    const currentSemver = parseSemver(pkg.version);
    if (!currentSemver) {
        console.error(`[bump] FATAL: package.json version is not semver: ${pkg.version}`);
        process.exit(1);
    }

    let nextSemver;
    if (ARG_KEYWORDS.has(arg)) {
        nextSemver = bump(currentSemver, arg);
    } else {
        const explicit = parseSemver(arg);
        if (!explicit) {
            console.error(`[bump] FATAL: arg must be major|minor|patch or X.Y.Z (got: ${arg})`);
            console.error('[bump] Examples:');
            console.error('   node scripts/bump-version.mjs patch');
            console.error('   node scripts/bump-version.mjs 1.2.3');
            process.exit(1);
        }
        nextSemver = explicit;
    }

    const nextVersion = fmtSemver(nextSemver);
    if (nextVersion === pkg.version) {
        console.log(`[bump] noop: version already ${nextVersion}`);
    } else {
        pkg.version = nextVersion;
        // Preserve original indentation by rewriting via JSON.stringify with
        // 2-space indent (matches the existing package.json style) and a
        // trailing newline (POSIX text-file convention).
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        console.log(`[bump] package.json: ${currentSemver ? fmtSemver(currentSemver) : '?'} → ${nextVersion}`);
    }

    // Re-stamp public/sw.js + public/version.json so dev environments see the
    // new version without needing a full next build.
    const stamp = spawnSync(process.execPath, [stampPath], {
        cwd: repoRoot,
        stdio: 'inherit',
    });
    if (stamp.status !== 0) {
        console.error(`[bump] FATAL: stamp-sw-version.mjs exited with code ${stamp.status}`);
        process.exit(stamp.status || 1);
    }

    console.log(`[bump] done. Next: commit, push, and run \`npm run build\` to ship.`);
}

main();
