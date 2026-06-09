#!/usr/bin/env node
/*
 * smoke200.mjs — WEB render/smoke gate for the static export.
 *
 * Why this exists: the on-disk export and `next build` exiting 0 prove the
 * BUILD succeeded — they do NOT prove each page actually SERVES and RENDERS.
 * A route can 200 with a fully-formed error shell (Next's "404: This page
 * could not be found.") or serve a truncated/blank body, and every on-disk
 * check still passes. smoke200 serves the real `out/` over HTTP and asserts,
 * per route: HTTP 200 + a non-trivial body + NOT the Next error shell.
 *
 * This is a WEB smoke test (HTTP 200 + real render), not a game render oracle.
 *
 * Contract:
 *   - Runs AFTER a build; it does NOT build. `out/` must already exist.
 *   - Derives the route list by SCANNING out/ for generated *.html pages, so
 *     new pages are covered automatically (no hardcoded count).
 *   - Built-ins only (node:http / node:fs / global fetch). No dependency.
 *   - Ephemeral localhost port; server is ALWAYS closed (try/finally), even
 *     when an assertion throws — no hanging process.
 *
 * Exit: 0 iff every asserted route passes; non-zero otherwise (lists failures).
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');

// ─── Preconditions ─────────────────────────────────────────────────────────
// out/ must exist and contain index.html — otherwise the export never ran.
if (!fs.existsSync(OUT) || !fs.statSync(OUT).isDirectory()) {
    console.error('[smoke200] FATAL: out/ not found. Run `npm run build` first.');
    process.exit(1);
}
if (!fs.existsSync(path.join(OUT, 'index.html'))) {
    console.error('[smoke200] FATAL: out/index.html missing — the static export looks incomplete. Run `npm run build` first.');
    process.exit(1);
}

// ─── Static file server ──────────────────────────────────────────────────
// Minimal, robust enough to resolve the export's two route shapes:
//   out/<route>.html        (page emitted as a sibling .html)
//   out/<route>/index.html  (page emitted as a folder)
//   /                       -> out/index.html
const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.mjs':  'text/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico':  'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.txt':  'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

// Resolve a request URL path to an on-disk file inside OUT, guarding against
// path traversal (a malformed request must never escape out/).
function resolveFile(urlPath) {
    let p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
    if (p === '/' || p === '') {
        return path.join(OUT, 'index.html');
    }
    // Normalise and confine to OUT.
    const safe = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
    let abs = path.join(OUT, safe);
    if (path.relative(OUT, abs).startsWith('..')) return null; // traversal attempt

    // Exact file?
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs;
    // Sibling .html (out/<route>.html)?
    if (fs.existsSync(abs + '.html') && fs.statSync(abs + '.html').isFile()) return abs + '.html';
    // Folder index (out/<route>/index.html)?
    const idx = path.join(abs, 'index.html');
    if (fs.existsSync(idx) && fs.statSync(idx).isFile()) return idx;
    return null;
}

function createServer() {
    return http.createServer((req, res) => {
        const file = resolveFile(req.url);
        if (!file) {
            res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
        }
        const ext = path.extname(file).toLowerCase();
        const type = CONTENT_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'content-type': type });
        fs.createReadStream(file).pipe(res);
    });
}

// ─── Route discovery ─────────────────────────────────────────────────────
// Scan out/ for *.html and map each back to its served URL path. The export
// emits some HTML that is NOT a renderable route and MUST be excluded from
// the asserted set:
//   - 404.html / _not-found.html : the Next error shell BY DESIGN. Asserting
//     "not an error shell" against them is a guaranteed false-fail, so they
//     are skipped (reported, so the exclusion is honest and visible).
//   - google<token>.html : a Google Search Console verification artifact, not
//     a page (its body is the literal verification line). Excluded by pattern.
// Everything else (Next-rendered pages, hand-written public/ HTML, redirect
// landing shells, hand-authored embed fragments) is a real route and gets
// asserted.
const EXCLUDED_BASENAMES = new Set(['404.html', '_not-found.html']);
// Standard Google Search Console verification filename: google<hex token>.html
const VERIFICATION_RE = /^google[0-9a-f]+\.html$/i;

function isExcluded(base) {
    return EXCLUDED_BASENAMES.has(base) || VERIFICATION_RE.test(base);
}

function walkHtml(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // _next holds bundled assets, not routes.
            if (entry.name === '_next') continue;
            out.push(...walkHtml(abs));
        } else if (entry.name.toLowerCase().endsWith('.html')) {
            out.push(abs);
        }
    }
    return out;
}

// Map an on-disk html path to the URL the server resolves it under.
function htmlToUrl(abs) {
    const relPath = path.relative(OUT, abs).split(path.sep).join('/');
    if (relPath === 'index.html') return '/';
    if (relPath.endsWith('/index.html')) return '/' + relPath.slice(0, -'/index.html'.length);
    // out/<route>.html -> /<route>
    return '/' + relPath.replace(/\.html$/, '');
}

const htmlFiles = walkHtml(OUT);
const routes = [];
const skipped = [];
for (const abs of htmlFiles) {
    const base = path.basename(abs).toLowerCase();
    if (isExcluded(base)) {
        const reason = VERIFICATION_RE.test(base)
            ? 'verification artifact, not a page (excluded)'
            : 'intentional error shell (excluded)';
        skipped.push({ url: htmlToUrl(abs), reason });
        continue;
    }
    routes.push({ url: htmlToUrl(abs), file: abs });
}
routes.sort((a, b) => a.url.localeCompare(b.url));

// ─── Render assertions ─────────────────────────────────────────────────────
// Liberal in FORM (Postel): accept Next renders, hand-written static HTML,
// JS/meta redirect shells, and hand-authored embed fragments alike — they are
// all real, intentional pages. Strict on the error SEMANTIC: a page whose own
// <title> is the Next error title is an error shell, full stop. (The string is
// embedded in hydration data on healthy App-Router pages, so we match the TITLE
// tag specifically, not a bare substring — a substring check would false-fail
// every healthy App-Router page.)
const ERROR_TITLE_RE = /<title>\s*404:\s*This page could not be found\.?\s*<\/title>/i;
const MIN_BODY_BYTES = 100; // a truncated/blank shell is shorter than any real page here

function assertRender(url, status, body) {
    if (status !== 200) {
        return `HTTP ${status} (expected 200)`;
    }
    if (!body || body.length < MIN_BODY_BYTES) {
        return `body too small (${body ? body.length : 0} bytes) — looks truncated/blank`;
    }
    if (ERROR_TITLE_RE.test(body)) {
        return 'served the Next error shell ("404: This page could not be found.")';
    }
    return null; // PASS
}

// ─── Run ─────────────────────────────────────────────────────────────────
const server = createServer();
const results = [];
let exitCode = 0;

try {
    const port = await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });
    const base = `http://127.0.0.1:${port}`;

    for (const route of routes) {
        let status = 0;
        let problem = null;
        try {
            // `Connection: close` — do not let undici keep sockets alive past
            // the request; a lingering keep-alive socket racing process exit
            // trips a libuv teardown assertion on Windows.
            const res = await fetch(base + route.url, {
                redirect: 'manual',
                headers: { connection: 'close' },
            });
            status = res.status;
            const body = await res.text();
            problem = assertRender(route.url, status, body);
        } catch (err) {
            problem = `fetch failed: ${err && err.message ? err.message : String(err)}`;
        }
        const pass = problem === null;
        if (!pass) exitCode = 1;
        results.push({ url: route.url, status, pass, problem });
    }
} finally {
    // GUARANTEED close — even if an assertion above threw. No hanging process.
    await new Promise((resolve) => server.close(resolve));
}

// ─── Report ─────────────────────────────────────────────────────────────
const urlWidth = Math.max(5, ...results.map((r) => r.url.length));
console.log(`\n[smoke200] serving ${path.relative(ROOT, OUT)}/ — ${results.length} route(s) asserted` +
    (skipped.length ? `, ${skipped.length} skipped` : '') + ':\n');
console.log('  ' + 'ROUTE'.padEnd(urlWidth) + '  STATUS  RESULT');
console.log('  ' + '-'.repeat(urlWidth) + '  ------  ------');
for (const r of results) {
    const tag = r.pass ? 'PASS' : 'FAIL';
    const detail = r.pass ? '' : ` — ${r.problem}`;
    console.log('  ' + r.url.padEnd(urlWidth) + '  ' + String(r.status || '-').padEnd(6) + '  ' + tag + detail);
}
for (const s of skipped) {
    console.log('  ' + s.url.padEnd(urlWidth) + '  ' + '-'.padEnd(6) + '  SKIP — ' + s.reason);
}

const failures = results.filter((r) => !r.pass);
if (failures.length > 0) {
    console.error(`\n[smoke200] FAILED — ${failures.length}/${results.length} route(s) did not render:`);
    for (const f of failures) console.error(`  ${f.url}: ${f.problem}`);
    console.error('');
} else {
    console.log(`\n[smoke200] OK — all ${results.length} route(s) returned 200 and rendered.\n`);
}

// Set the code and let the event loop drain (server already closed in finally,
// `Connection: close` left no keep-alive sockets) — avoids racing a hard
// process.exit() against socket teardown. A short safety net forces exit only
// if something unexpectedly keeps the loop alive.
process.exitCode = exitCode;
const safety = setTimeout(() => process.exit(exitCode), 2000);
safety.unref();
