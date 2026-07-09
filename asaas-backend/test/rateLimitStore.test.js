const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  windowBucket,
  createMemoryRateLimitStore,
  createUpstashRateLimitStore,
  selectRateLimitStore,
} = require('../lib/rateLimitStore');
const { clientIp } = require('../lib/http');

// ── clientIp derivation (lib/http.js) ───────────────────────────────────────
test('clientIp — takes the FIRST hop of x-forwarded-for (the real client)', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' } };
  assert.equal(clientIp(req), '203.0.113.7');
});

test('clientIp — trims whitespace around the first hop', () => {
  assert.equal(clientIp({ headers: { 'x-forwarded-for': '  198.51.100.9  , 10.0.0.1' } }), '198.51.100.9');
});

test('clientIp — falls back to x-real-ip, then socket.remoteAddress, then "unknown"', () => {
  assert.equal(clientIp({ headers: { 'x-real-ip': '192.0.2.5' } }), '192.0.2.5');
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
  assert.equal(clientIp({ headers: {} }), 'unknown');
  assert.equal(clientIp({}), 'unknown');
});

// ── windowBucket ─────────────────────────────────────────────────────────────
test('windowBucket — floors to the same bucket within a window, advances across it', () => {
  const w = 60; // seconds
  // Start exactly ON a 60s bucket boundary so +59s stays in-window and +60s rolls.
  const t0 = Math.floor(1_000_000_000_000 / (w * 1000)) * (w * 1000);
  const b0 = windowBucket(t0, w);
  assert.equal(windowBucket(t0 + 59_000, w), b0, 'still same window at +59s');
  assert.equal(windowBucket(t0 + 60_000, w), b0 + 1, 'next window at +60s');
});

// ── memory store: counting + isolation + window roll ─────────────────────────
test('memory store — counts hits per key within a frozen window', async () => {
  const store = createMemoryRateLimitStore(() => 5_000_000);
  assert.deepEqual(await store.hit('a', 60), { count: 1 });
  assert.deepEqual(await store.hit('a', 60), { count: 2 });
  // A different key has its own independent counter.
  assert.deepEqual(await store.hit('b', 60), { count: 1 });
  assert.deepEqual(await store.hit('a', 60), { count: 3 });
});

test('memory store — the counter resets when the window rolls (and prunes old buckets)', async () => {
  let now = 0;
  const store = createMemoryRateLimitStore(() => now);
  assert.equal((await store.hit('k', 60)).count, 1);
  assert.equal((await store.hit('k', 60)).count, 2);
  now += 60_000; // advance one full window
  assert.equal((await store.hit('k', 60)).count, 1, 'new window starts fresh');
  // The old bucket was pruned, so the Map does not accumulate stale windows.
  assert.equal(store._counts.size, 1);
});

// ── upstash adapter: command shape + FAIL-OPEN ───────────────────────────────
test('upstash adapter — INCRs then EXPIREs the namespaced key, returns the count', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    // First call is INCR (-> 3), second is EXPIRE (-> 1). Reply in Upstash shape.
    const result = url.includes('/INCR/') ? 3 : 1;
    return { ok: true, async json() { return { result }; }, async text() { return ''; } };
  };
  const store = createUpstashRateLimitStore({ url: 'https://kv.example', token: 't', fetchImpl });
  const { count } = await store.hit('subscribe:203.0.113.7', 60);
  assert.equal(count, 3);
  assert.equal(seen.length, 2);
  assert.match(seen[0], /\/INCR\/asaas%3Aratelimit%3Asubscribe%3A203\.0\.113\.7%3A/);
  assert.match(seen[1], /\/EXPIRE\/asaas%3Aratelimit%3Asubscribe%3A203\.0\.113\.7%3A.*\/60$/);
});

test('upstash adapter — FAILS OPEN on a store error (count=1, flagged), never throws', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 503,
    async json() { return {}; },
    async text() { return 'service unavailable'; },
  });
  const store = createUpstashRateLimitStore({ url: 'https://kv.example', token: 't', fetchImpl });
  const out = await store.hit('subscribe:1.2.3.4', 60);
  // A KV outage must degrade OPEN: allow (count=1) and flag it, do NOT throw.
  assert.deepEqual(out, { count: 1, limitedByStore: true });
});

test('upstash adapter — requires url + token', () => {
  assert.throws(() => createUpstashRateLimitStore({ url: '', token: 't' }), /requires url \+ token/);
  assert.throws(() => createUpstashRateLimitStore({ url: 'x', token: '' }), /requires url \+ token/);
});

// ── selection ────────────────────────────────────────────────────────────────
test('selectRateLimitStore — durable when KV env present, memory fallback otherwise', () => {
  const durable = selectRateLimitStore({ KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' });
  assert.equal(durable.durable, true);
  const fallback = selectRateLimitStore({});
  assert.equal(fallback.durable, false);
});
