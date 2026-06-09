const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { timingSafeEqual, isAuthentic } = require('../lib/webhookAuth');
const { mapRail } = require('../lib/asaasClient');

// Minimal fake res that records status + body.
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k] = v; },
    send(b) { this.body = b; return this; },
    end() { return this; },
  };
}

beforeEach(() => {
  delete process.env.ASAAS_WEBHOOK_TOKEN;
});

test('timingSafeEqual matches equal, rejects unequal and length-mismatch', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
});

test('isAuthentic fails closed when no server token configured', () => {
  const req = { headers: { 'asaas-access-token': 'whatever' } };
  const r = isAuthentic(req);
  assert.equal(r.ok, false);
  assert.match(r.reason, /not configured/);
});

test('isAuthentic accepts matching token, rejects mismatch + missing', () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';
  assert.equal(isAuthentic({ headers: { 'asaas-access-token': 'secret-token' } }).ok, true);
  assert.equal(isAuthentic({ headers: { 'asaas-access-token': 'nope' } }).ok, false);
  assert.equal(isAuthentic({ headers: {} }).ok, false);
});

test('mapRail maps the four rails to Asaas billingType', () => {
  assert.equal(mapRail('pix'), 'PIX');
  assert.equal(mapRail('cartao'), 'CREDIT_CARD');
  assert.equal(mapRail('boleto'), 'BOLETO');
  assert.equal(mapRail('debito'), 'DEBIT');
  assert.throws(() => mapRail('crypto'), /unknown rail/);
});

test('webhook handler — rejects unauthenticated, dedupes, processes once', async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'tok';
  // Re-require fresh so the in-memory seen-set is clean for this test file.
  delete require.cache[require.resolve('../api/asaas/webhook.js')];
  const handler = require('../api/asaas/webhook.js');

  // unauthenticated -> 401
  let res = fakeRes();
  await handler({ method: 'POST', headers: {}, body: { event: 'PAYMENT_CONFIRMED', payment: { id: 'p1' } } }, res);
  assert.equal(res.statusCode, 401);

  // authenticated, first time -> 200 ok, processEvent called
  const calls = [];
  const proc = async (ev) => calls.push(ev.event);
  res = fakeRes();
  const goodReq = { method: 'POST', headers: { 'asaas-access-token': 'tok' }, body: { event: 'PAYMENT_CONFIRMED', payment: { id: 'p1' } } };
  await handler(goodReq, res, proc);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, ['PAYMENT_CONFIRMED']);

  // same event again -> deduped, processEvent NOT called again
  res = fakeRes();
  await handler(goodReq, res, proc);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /deduped/);
  assert.deepEqual(calls, ['PAYMENT_CONFIRMED']); // still one
});

test('webhook handler — 500 when processing throws (so Asaas retries)', async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'tok';
  delete require.cache[require.resolve('../api/asaas/webhook.js')];
  const handler = require('../api/asaas/webhook.js');
  const res = fakeRes();
  const boom = async () => { throw new Error('db down'); };
  await handler(
    { method: 'POST', headers: { 'asaas-access-token': 'tok' }, body: { event: 'PAYMENT_RECEIVED', payment: { id: 'pZ' } } },
    res,
    boom
  );
  assert.equal(res.statusCode, 500);
});
