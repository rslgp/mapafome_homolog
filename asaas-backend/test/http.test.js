const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { applyCors, handlePreflight, allowedOrigins } = require('../lib/http');

// CORS characterization for lib/http.js. CORS is currently WILDCARD: applyCors
// sends Access-Control-Allow-Origin: * for every caller regardless of Origin, so
// any site (and Origin-less curl) is allowed. Safe only because no endpoint uses
// cookies/Authorization (credentialed CORS forbids `*`). allowedOrigins() is kept
// as a utility for re-locking later and is still characterized below.

// Minimal fake req/res. res records headers + status the way the handlers set them.
function fakeReq(method, origin) {
  return { method, headers: origin ? { origin } : {} };
}
function fakeRes() {
  return {
    statusCode: null,
    headers: {},
    ended: false,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    end() { this.ended = true; return this; },
  };
}

beforeEach(() => {
  delete process.env.ALLOWED_ORIGINS;
});

// ── allowedOrigins() ──────────────────────────────────────────────────────

test('allowedOrigins — dev fallback covers the ports next dev may use (3000-3002)', () => {
  delete process.env.ALLOWED_ORIGINS;
  const origins = allowedOrigins();
  assert.ok(origins.includes('http://localhost:3000'));
  assert.ok(origins.includes('http://localhost:3001'));
  // :3002 is the regression site — next dev lands here when :3000/:3001 are busy
  // and the backend already owns :3001. This is the origin from the bug report.
  assert.ok(origins.includes('http://localhost:3002'));
  assert.ok(origins.includes('https://mapafome.com.br'));
});

test('allowedOrigins — ALLOWED_ORIGINS env OVERRIDES the dev fallback (prod lock-down)', () => {
  // In production ALLOWED_ORIGINS is always set, so the localhost fallback never
  // applies there — set it to a single origin and the localhost ports drop out.
  process.env.ALLOWED_ORIGINS = 'https://mapafome.com.br';
  const origins = allowedOrigins();
  assert.deepEqual(origins, ['https://mapafome.com.br']);
  assert.ok(!origins.includes('http://localhost:3000'));
  assert.ok(!origins.includes('http://localhost:3002'));
});

test('allowedOrigins — env list is trimmed and blank entries dropped', () => {
  process.env.ALLOWED_ORIGINS = ' https://a.com , , https://b.com ';
  assert.deepEqual(allowedOrigins(), ['https://a.com', 'https://b.com']);
});

// ── applyCors() ───────────────────────────────────────────────────────────

test('applyCors — sets wildcard ACAO (no Vary) for any origin', () => {
  const res = fakeRes();
  applyCors(fakeReq('POST', 'http://localhost:3002'), res);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
  // Wildcard does not vary by Origin, so no Vary header is set.
  assert.equal(res.headers['Vary'], undefined);
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  assert.equal(res.headers['Access-Control-Allow-Headers'], 'Content-Type');
});

test('applyCors — wildcard ACAO is sent even for a previously-disallowed origin', () => {
  const res = fakeRes();
  applyCors(fakeReq('POST', 'http://evil.example'), res);
  // Wildcard: every origin is now allowed.
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
});

test('applyCors — wildcard ACAO is sent even with no Origin header (curl)', () => {
  const res = fakeRes();
  applyCors(fakeReq('POST', undefined), res);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

// ── handlePreflight() ─────────────────────────────────────────────────────

test('handlePreflight — OPTIONS answers 204 WITH wildcard ACAO', () => {
  const res = fakeRes();
  const handled = handlePreflight(fakeReq('OPTIONS', 'http://localhost:3002'), res);
  assert.equal(handled, true);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  // Preflight must echo the CORS headers so the browser permits the real request.
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

test('handlePreflight — returns false for a non-OPTIONS request (handler continues)', () => {
  const res = fakeRes();
  assert.equal(handlePreflight(fakeReq('POST', 'http://localhost:3002'), res), false);
  assert.equal(res.statusCode, null); // untouched — the POST handler runs
});
