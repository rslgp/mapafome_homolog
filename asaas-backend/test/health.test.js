const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/asaas/health.js');
const { buildHealth } = require('../api/asaas/health.js');

// Minimal fake res that records status + body + headers — same shape the other
// handler tests use. status()/setHeader()/send()/end() are the only surface the
// http helpers touch.
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    send(b) { this.body = b; return this; },
    end() { this.ended = true; return this; },
  };
}

function fakeReq({ method = 'GET', headers = {} } = {}) {
  return { method, headers };
}

beforeEach(() => {
  delete process.env.ASAAS_ENV;
  delete process.env.ASAAS_API_KEY;
});

// ── buildHealth — pure body shape (no clock) ────────────────────────────────

test('buildHealth — reports env + apiKey:set when a key is present', () => {
  assert.deepEqual(buildHealth({ asaasEnv: 'production', hasKey: true }), {
    ok: true,
    service: 'asaas-backend',
    env: 'production',
    apiKey: 'set',
  });
});

test('buildHealth — apiKey:missing when no key, env defaults to sandbox', () => {
  assert.deepEqual(buildHealth({ hasKey: false }), {
    ok: true,
    service: 'asaas-backend',
    env: 'sandbox',
    apiKey: 'missing',
  });
});

test('buildHealth — NEVER includes the key value, only set|missing', () => {
  const body = buildHealth({ asaasEnv: 'sandbox', hasKey: true });
  assert.equal(body.apiKey, 'set');
  // The secret itself must never appear on the status object.
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'key'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'apiKeyValue'), false);
});

// ── handler — HTTP contract ─────────────────────────────────────────────────

test('health — GET returns 200 with ok:true and a timestamp', async () => {
  process.env.ASAAS_ENV = 'sandbox';
  process.env.ASAAS_API_KEY = 'sandbox_key_abc';
  const res = fakeRes();
  await handler(fakeReq(), res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.service, 'asaas-backend');
  assert.equal(payload.env, 'sandbox');
  assert.equal(payload.apiKey, 'set');
  // A real ISO timestamp is stamped per request.
  assert.match(payload.time, /^\d{4}-\d{2}-\d{2}T/);
});

test('health — does NOT leak the key when one is configured', async () => {
  process.env.ASAAS_API_KEY = 'super_secret_value';
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.includes('super_secret_value'), false);
});

test('health — reports apiKey:missing when no key is set', async () => {
  const res = fakeRes();
  await handler(fakeReq(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).apiKey, 'missing');
});

test('health — non-GET is 405 (method_not_allowed)', async () => {
  const res = fakeRes();
  await handler(fakeReq({ method: 'POST' }), res);
  assert.equal(res.statusCode, 405);
  assert.match(res.body, /method_not_allowed/);
});

test('health — sets wildcard CORS header', async () => {
  const res = fakeRes();
  await handler(fakeReq({ headers: { origin: 'http://anywhere.example' } }), res);
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

test('health — OPTIONS preflight is answered 204 and short-circuits', async () => {
  const res = fakeRes();
  await handler(fakeReq({ method: 'OPTIONS', headers: { origin: 'http://x.example' } }), res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
});
