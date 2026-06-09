const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { applyCors, handlePreflight, allowedOrigins } = require('../lib/http');

// CORS characterization for lib/http.js. This is the contract a browser relies
// on: the actual POST is only allowed if the PREFLIGHT echoed an
// Access-Control-Allow-Origin matching the caller's Origin. The original dev
// default listed only :3000, so a site on :3002 (next dev's common fallback when
// :3000/:3001 are busy) got NO ACAO header and the browser blocked the POST with
// ERR_FAILED — exactly the failure these tests now guard against.

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

test('applyCors — echoes ACAO + Vary for an allowed origin', () => {
  const res = fakeRes();
  applyCors(fakeReq('POST', 'http://localhost:3002'), res);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'http://localhost:3002');
  assert.equal(res.headers['Vary'], 'Origin');
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  assert.equal(res.headers['Access-Control-Allow-Headers'], 'Content-Type');
});

test('applyCors — does NOT set ACAO for a disallowed origin (still sets method/header)', () => {
  const res = fakeRes();
  applyCors(fakeReq('POST', 'http://evil.example'), res);
  // No ACAO -> the browser blocks the response. Methods/headers are still set,
  // but without ACAO they are inert (this is the secure default).
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(res.headers['Vary'], undefined);
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
});

test('applyCors — no Origin header (same-origin / curl) sets no ACAO', () => {
  const res = fakeRes();
  applyCors(fakeReq('POST', undefined), res);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
});

// ── handlePreflight() ─────────────────────────────────────────────────────

test('handlePreflight — OPTIONS from an allowed origin answers 204 WITH ACAO', () => {
  const res = fakeRes();
  const handled = handlePreflight(fakeReq('OPTIONS', 'http://localhost:3002'), res);
  assert.equal(handled, true);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  // The header that was missing in the bug report — its presence is the fix.
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'http://localhost:3002');
});

test('handlePreflight — returns false for a non-OPTIONS request (handler continues)', () => {
  const res = fakeRes();
  assert.equal(handlePreflight(fakeReq('POST', 'http://localhost:3002'), res), false);
  assert.equal(res.statusCode, null); // untouched — the POST handler runs
});
