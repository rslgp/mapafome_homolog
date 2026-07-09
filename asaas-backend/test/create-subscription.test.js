const { test } = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/asaas/create-subscription.js');
const { createMemoryRateLimitStore } = require('../lib/rateLimitStore');

// Minimal fake res that records status + body — same shape as webhook.test.js.
// status()/setHeader()/send()/end() are the only surface the http helpers touch.
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

// Minimal fake req. `body` is an already-parsed object (Vercel parses JSON for
// us; readJsonBody passes an object through). `socket` is present because the
// http helpers / handler may read it; headers defaults to {} so CORS is a no-op.
function fakeReq({ method = 'POST', headers = {}, body = undefined } = {}) {
  return { method, headers, body, socket: { remoteAddress: '127.0.0.1' } };
}

// A fake req that presents a specific client IP via x-forwarded-for (Vercel's real
// header). The rate-limit key is derived from clientIp(req), so this lets a test
// simulate distinct callers without touching sockets.
function fakeReqFromIp(ip, overrides = {}) {
  return fakeReq({ ...overrides, headers: { 'x-forwarded-for': ip, ...(overrides.headers || {}) } });
}

// A complete, check-digit-valid body the validator accepts (pix rail).
function validBody(overrides = {}) {
  return {
    rail: 'pix',
    value: 25,
    name: 'Maria',
    email: 'maria@example.com',
    cpfCnpj: '52998224725',
    ...overrides,
  };
}

// Records every createSubscription call so we can assert on the args (esp. that
// NO card data is ever forwarded — pins the F2 no-PAN guarantee at the seam).
function makeDeps(overrides = {}) {
  const calls = { ensureCustomer: [], createSubscription: [] };
  const deps = {
    async ensureCustomer(input) {
      calls.ensureCustomer.push(input);
      return { id: 'cus_123' };
    },
    async createSubscription(input) {
      calls.createSubscription.push(input);
      return {
        id: 'sub_123',
        status: 'ACTIVE',
        value: input.value,
        cycle: input.cycle,
        invoiceUrl: 'https://asaas.example/i/abc',
      };
    },
    ...overrides,
  };
  return { deps, calls };
}

test('create-subscription — non-POST is 405 (method_not_allowed)', async () => {
  const { deps } = makeDeps();
  const res = fakeRes();
  await handler(fakeReq({ method: 'GET' }), res, deps);
  assert.equal(res.statusCode, 405);
  assert.match(res.body, /method_not_allowed/);
});

test('create-subscription — invalid body is 400 (validation_failed) and never calls Asaas', async () => {
  const { deps, calls } = makeDeps();
  const res = fakeRes();
  // Bad rail + sub-floor value + bad email/doc -> validator rejects.
  await handler(fakeReq({ body: { rail: 'crypto', value: 2, name: 'A', email: 'no', cpfCnpj: '1' } }), res, deps);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /validation_failed/);
  // The collaborators must never run on an invalid body.
  assert.equal(calls.ensureCustomer.length, 0);
  assert.equal(calls.createSubscription.length, 0);
});

test('create-subscription — missing body is 400 (readJsonBody returns null)', async () => {
  const { deps } = makeDeps();
  const res = fakeRes();
  await handler(fakeReq({ body: undefined }), res, deps);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /validation_failed/);
});

test('create-subscription — happy path returns the documented 200 response shape', async () => {
  const { deps, calls } = makeDeps();
  const res = fakeRes();
  await handler(fakeReq({ body: validBody() }), res, deps);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.deepEqual(payload, {
    ok: true,
    subscriptionId: 'sub_123',
    rail: 'pix',
    status: 'ACTIVE',
    value: 25,
    cycle: 'MONTHLY',
    idempotent: false,
    invoiceUrl: 'https://asaas.example/i/abc',
  });

  // ensureCustomer ran once with the validated/normalized fields + stable ref.
  assert.equal(calls.ensureCustomer.length, 1);
  assert.equal(calls.ensureCustomer[0].externalReference, 'mapafome:pix:maria@example.com');
});

test('create-subscription — NO card data is ever sent to createSubscription (no-PAN guarantee, F2)', async () => {
  const { deps, calls } = makeDeps();
  const res = fakeRes();
  // Even when a client smuggles a card object on the cartão rail, it must never
  // reach the Asaas client: the validator drops it and the handler forwards none.
  await handler(
    fakeReq({
      body: validBody({
        rail: 'cartao',
        creditCard: { number: '4111111111111111', expiryMonth: '12', expiryYear: '2030', ccv: '123', holderName: 'M' },
        creditCardHolderInfo: { name: 'M' },
      }),
    }),
    res,
    deps
  );

  assert.equal(res.statusCode, 200);
  assert.equal(calls.createSubscription.length, 1);
  const sentToAsaas = calls.createSubscription[0];
  assert.equal(sentToAsaas.creditCard, undefined);
  assert.equal(sentToAsaas.creditCardHolderInfo, undefined);
  assert.equal(sentToAsaas.remoteIp, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(sentToAsaas, 'creditCard'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sentToAsaas, 'creditCardHolderInfo'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sentToAsaas, 'remoteIp'), false);
});

test('create-subscription — idempotent:true flows through from sub._idempotent', async () => {
  const { deps } = makeDeps({
    async createSubscription(input) {
      // Asaas already had a subscription with this externalReference: the client
      // returns the existing one tagged _idempotent so we don't double-charge.
      return {
        id: 'sub_existing',
        status: 'ACTIVE',
        value: input.value,
        cycle: input.cycle,
        invoiceUrl: null,
        _idempotent: true,
      };
    },
  });
  const res = fakeRes();
  await handler(fakeReq({ body: validBody() }), res, deps);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.equal(payload.idempotent, true);
  assert.equal(payload.subscriptionId, 'sub_existing');
  assert.equal(payload.invoiceUrl, null); // falsy invoiceUrl coalesces to null
});

test('create-subscription — an Asaas 422 surfaces as 422 (asaas_error) with the upstream messages', async () => {
  const { deps } = makeDeps({
    async createSubscription() {
      const err = new Error('asaas rejected');
      err.status = 422;
      err.body = { errors: [{ description: 'valor inválido' }] };
      throw err;
    },
  });
  const res = fakeRes();
  await handler(fakeReq({ body: validBody() }), res, deps);

  assert.equal(res.statusCode, 422);
  const payload = JSON.parse(res.body);
  assert.equal(payload.error, 'asaas_error');
  assert.deepEqual(payload.messages, ['valor inválido']);
});

test('create-subscription — a generic upstream throw is a 502 (asaas_error)', async () => {
  const { deps } = makeDeps({
    async ensureCustomer() {
      throw new Error('network down'); // no .status -> upstream failure
    },
  });
  const res = fakeRes();
  await handler(fakeReq({ body: validBody() }), res, deps);

  assert.equal(res.statusCode, 502);
  const payload = JSON.parse(res.body);
  assert.equal(payload.error, 'asaas_error');
  assert.deepEqual(payload.messages, ['network down']);
});

// ── EXT-SEC-04: per-IP rate limiting ────────────────────────────────────────
// Default limit is 8 requests / 60s per client IP (SUBSCRIBE_RATE_LIMIT_MAX). The
// throttle runs AFTER validation and BEFORE any Asaas call. We inject a fresh
// in-memory store with a FROZEN clock so the whole test sits in one fixed window
// (deterministic — no wall-clock flakiness).
const DEFAULT_LIMIT = 8;

test('create-subscription — the (N+1)th request from ONE IP in the window is throttled (429)', async () => {
  const { deps, calls } = makeDeps();
  const store = createMemoryRateLimitStore(() => 1_000_000); // frozen clock

  // The first DEFAULT_LIMIT requests from the same IP pass and reach Asaas.
  for (let i = 0; i < DEFAULT_LIMIT; i++) {
    const res = fakeRes();
    await handler(fakeReqFromIp('203.0.113.7', { body: validBody() }), res, deps, store);
    assert.equal(res.statusCode, 200, `request ${i + 1} should be allowed`);
  }
  assert.equal(calls.createSubscription.length, DEFAULT_LIMIT);

  // The (N+1)th from the SAME IP in the SAME window is throttled: 429, a clear
  // message, a Retry-After header, and — critically — NO extra Asaas call.
  const res = fakeRes();
  await handler(fakeReqFromIp('203.0.113.7', { body: validBody() }), res, deps, store);
  assert.equal(res.statusCode, 429);
  const payload = JSON.parse(res.body);
  assert.equal(payload.error, 'rate_limited');
  assert.match(payload.message, /Too many requests/);
  assert.equal(res.headers['Retry-After'], '60');
  // The throttle short-circuits before Asaas: still only DEFAULT_LIMIT calls.
  assert.equal(calls.createSubscription.length, DEFAULT_LIMIT);
});

test('create-subscription — a DIFFERENT IP is not throttled by another IP\'s usage', async () => {
  const { deps } = makeDeps();
  const store = createMemoryRateLimitStore(() => 2_000_000); // frozen clock, own store

  // Exhaust IP A's whole window.
  for (let i = 0; i < DEFAULT_LIMIT; i++) {
    const res = fakeRes();
    await handler(fakeReqFromIp('198.51.100.1', { body: validBody() }), res, deps, store);
    assert.equal(res.statusCode, 200);
  }
  // One more from A is throttled...
  let res = fakeRes();
  await handler(fakeReqFromIp('198.51.100.1', { body: validBody() }), res, deps, store);
  assert.equal(res.statusCode, 429);

  // ...but a request from a DIFFERENT IP has its own fresh counter -> allowed.
  res = fakeRes();
  await handler(fakeReqFromIp('198.51.100.2', { body: validBody() }), res, deps, store);
  assert.equal(res.statusCode, 200);
});

test('create-subscription — the throttle FAILS OPEN when the store errors (donations not blocked)', async () => {
  const { deps, calls } = makeDeps();
  // A store whose hit() itself returns the fail-open shape (count=1, flagged): the
  // durable adapter maps a KV outage to exactly this, so the handler must allow.
  const failOpenStore = {
    async hit() {
      return { count: 1, limitedByStore: true };
    },
  };
  const res = fakeRes();
  await handler(fakeReqFromIp('203.0.113.9', { body: validBody() }), res, deps, failOpenStore);
  // Fail-open: the request is served normally, Asaas is called — a KV blip must not
  // become a donation outage (the deliberate opposite of the webhook fail-closed).
  assert.equal(res.statusCode, 200);
  assert.equal(calls.createSubscription.length, 1);
});

test('create-subscription — an invalid body is 400 BEFORE the throttle (no slot spent)', async () => {
  const { deps } = makeDeps();
  let hits = 0;
  const countingStore = {
    async hit() {
      hits += 1;
      return { count: hits };
    },
  };
  const res = fakeRes();
  // Garbage body -> 400 at the validation gate, which precedes the throttle.
  await handler(
    fakeReqFromIp('203.0.113.11', { body: { rail: 'crypto', value: 2, name: 'A', email: 'no', cpfCnpj: '1' } }),
    res,
    deps,
    countingStore
  );
  assert.equal(res.statusCode, 400);
  assert.equal(hits, 0, 'a rejected body must not consume a rate-limit slot');
});
