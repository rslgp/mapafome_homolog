const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const auth = require('../lib/webhookAuth');
const { timingSafeEqual, isAuthentic } = auth;

// P20 characterization — unit-level tests against webhookAuth.js DIRECTLY.
// webhook.test.js (P19) covers the handler integration + the happy-path auth
// assertions; this file pins the lib's edge behavior + the exact reason strings
// each rejection branch returns, which the handler tests don't assert.

beforeEach(() => {
  delete process.env.ASAAS_WEBHOOK_TOKEN;
});

test('module exports the two public helpers', () => {
  assert.equal(typeof auth.isAuthentic, 'function');
  assert.equal(typeof auth.timingSafeEqual, 'function');
});

// --- timingSafeEqual ---

test('timingSafeEqual — length mismatch returns false WITHOUT throwing', () => {
  // crypto.timingSafeEqual throws on differing lengths; the wrapper guards it.
  assert.doesNotThrow(() => timingSafeEqual('a', 'abcdef'));
  assert.equal(timingSafeEqual('a', 'abcdef'), false);
  assert.equal(timingSafeEqual('abcdef', 'a'), false);
});

test('timingSafeEqual — coerces non-string / nullish args via String(x || "")', () => {
  // null/undefined both become '' so two nullish args compare EQUAL (both '').
  assert.equal(timingSafeEqual(null, null), true);
  assert.equal(timingSafeEqual(undefined, undefined), true);
  assert.equal(timingSafeEqual(null, ''), true);
  assert.equal(timingSafeEqual('', undefined), true);
  // a real token vs a nullish header is unequal (length differs -> false).
  assert.equal(timingSafeEqual('secret', null), false);
  assert.equal(timingSafeEqual(null, 'secret'), false);
});

test('timingSafeEqual — non-ASCII / UTF-8 tokens compared by bytes', () => {
  assert.equal(timingSafeEqual('café', 'café'), true);
  assert.equal(timingSafeEqual('café', 'cafe'), false); // differing byte length
});

test('timingSafeEqual — equal vs one-character-off (same length)', () => {
  assert.equal(timingSafeEqual('tok-123456', 'tok-123456'), true);
  assert.equal(timingSafeEqual('tok-123456', 'tok-123457'), false);
});

// --- isAuthentic: exact reason strings per branch ---

test('isAuthentic — no server token configured: ok=false, reason names the env var', () => {
  // No ASAAS_WEBHOOK_TOKEN set (cleared in beforeEach). Fails closed even when a
  // header IS present — the missing server secret is the dominant failure.
  const r = isAuthentic({ headers: { 'asaas-access-token': 'anything' } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'ASAAS_WEBHOOK_TOKEN not configured on server');
});

test('isAuthentic — token configured but header missing: reason names the header', () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';
  const r = isAuthentic({ headers: {} });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing asaas-access-token header');
});

test('isAuthentic — token configured, header present but wrong: reason is token mismatch', () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';
  const r = isAuthentic({ headers: { 'asaas-access-token': 'wrong-token' } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'token mismatch');
});

test('isAuthentic — matching token: ok=true and no reason field', () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';
  const r = isAuthentic({ headers: { 'asaas-access-token': 'secret-token' } });
  assert.equal(r.ok, true);
  assert.equal(r.reason, undefined);
});

test('isAuthentic — empty-string header is treated as present and mismatches', () => {
  // An empty header is truthy-falsy: '' is falsy, so it hits the "missing"
  // branch, NOT "mismatch". Locked in so the distinction stays intentional.
  process.env.ASAAS_WEBHOOK_TOKEN = 'secret-token';
  const r = isAuthentic({ headers: { 'asaas-access-token': '' } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'missing asaas-access-token header');
});
