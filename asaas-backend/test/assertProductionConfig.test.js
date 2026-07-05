const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertProductionConfig,
  isProductionEnv,
  hasDurableKv,
  hasProductionCorsAllowlist,
} = require('../lib/assertProductionConfig');

// PAY-01 — the production-config fail-closed guard. Pure function of an injected
// env object (never reads process.env in these tests), so no boot / no network.

// A minimal env that would PASS in production: durable KV + explicit allowlist.
function goodProdEnv() {
  return {
    ASAAS_ENV: 'production',
    KV_REST_API_URL: 'https://kv.example.com',
    KV_REST_API_TOKEN: 'tok',
    ALLOWED_ORIGINS: 'https://mapafome.com.br',
  };
}

// --- non-production is always a no-op (dev/sandbox boot with zero services) ---

test('non-production (sandbox default) is a no-op, never throws', () => {
  assert.deepEqual(assertProductionConfig({}), { production: false, ok: true, problems: [] });
});

test('non-production ignores missing KV and missing CORS allowlist', () => {
  const r = assertProductionConfig({ ASAAS_ENV: 'sandbox' });
  assert.equal(r.ok, true);
  assert.equal(r.production, false);
});

test('ASAAS_ENV is case-insensitive for production', () => {
  assert.equal(isProductionEnv({ ASAAS_ENV: 'PRODUCTION' }), true);
  assert.equal(isProductionEnv({ ASAAS_ENV: 'Production' }), true);
  assert.equal(isProductionEnv({ ASAAS_ENV: 'sandbox' }), false);
  assert.equal(isProductionEnv({}), false); // default sandbox
});

// --- production with a complete config passes ---

test('production with durable KV + allowlist passes', () => {
  const r = assertProductionConfig(goodProdEnv());
  assert.deepEqual(r, { production: true, ok: true, problems: [] });
});

test('production accepts the UPSTASH_* KV aliases', () => {
  const env = goodProdEnv();
  delete env.KV_REST_API_URL;
  delete env.KV_REST_API_TOKEN;
  env.UPSTASH_REDIS_REST_URL = 'https://kv.example.com';
  env.UPSTASH_REDIS_REST_TOKEN = 'tok';
  assert.equal(assertProductionConfig(env).ok, true);
});

// --- production fails closed on each hazard ---

test('production without durable KV throws PRODUCTION_CONFIG_INVALID', () => {
  const env = goodProdEnv();
  delete env.KV_REST_API_URL;
  delete env.KV_REST_API_TOKEN;
  assert.throws(
    () => assertProductionConfig(env),
    (err) => {
      assert.equal(err.code, 'PRODUCTION_CONFIG_INVALID');
      assert.deepEqual(err.problems, ['idempotency_not_durable']);
      assert.match(err.message, /retried\s+webhook/);
      return true;
    }
  );
});

test('production with only a URL (token missing) is NOT durable', () => {
  const env = goodProdEnv();
  delete env.KV_REST_API_TOKEN;
  assert.equal(hasDurableKv(env), false);
  assert.throws(() => assertProductionConfig(env), /idempotency is not durable/);
});

test('production without ALLOWED_ORIGINS throws (CORS would fall back to dev)', () => {
  const env = goodProdEnv();
  delete env.ALLOWED_ORIGINS;
  assert.throws(
    () => assertProductionConfig(env),
    (err) => {
      assert.equal(err.code, 'PRODUCTION_CONFIG_INVALID');
      assert.deepEqual(err.problems, ['cors_allowlist_missing']);
      return true;
    }
  );
});

test('production with empty/whitespace ALLOWED_ORIGINS is treated as missing', () => {
  assert.equal(hasProductionCorsAllowlist({ ALLOWED_ORIGINS: '  ,  , ' }), false);
  assert.equal(hasProductionCorsAllowlist({ ALLOWED_ORIGINS: 'https://a.com' }), true);
});

test('production with BOTH hazards reports both problems at once', () => {
  const env = { ASAAS_ENV: 'production' }; // no KV, no allowlist
  assert.throws(
    () => assertProductionConfig(env),
    (err) => {
      assert.deepEqual(err.problems, ['idempotency_not_durable', 'cors_allowlist_missing']);
      // message names both hazards, joined
      assert.match(err.message, /idempotency is not durable/);
      assert.match(err.message, /CORS allowlist is missing/);
      return true;
    }
  );
});
