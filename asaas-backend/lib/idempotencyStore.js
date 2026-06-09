// idempotencyStore.js — the durable "have I already processed this event?" seam.
//
// The webhook handler depends on an INTERFACE, not a concrete store (Dependency
// Inversion), so it stays unit-testable with `node --test` and boots with zero
// external services. The interface is two async methods:
//
//   isProcessed(key) -> Promise<boolean>   // has this key been recorded?
//   markProcessed(key) -> Promise<void>    // record it (idempotent; TTL-bounded)
//
// Two implementations ship here:
//   • createMemoryStore()  — per-instance Set. Fast, zero-dep, but NOT durable:
//     it resets on every serverless cold start, so a retry after a cold start is
//     reprocessed. This is the documented FALLBACK when no durable env is set.
//   • createUpstashStore() — Upstash Redis over its REST API (plain `fetch`, no
//     npm dep). Cross-instance + cross-cold-start durable. Keys carry a TTL so the
//     store never grows unbounded.
//
// selectIdempotencyStore() picks the durable adapter when its env vars are present,
// else logs ONCE that durability is OFF and returns the memory fallback. The host
// (or a test) can always inject its own store instead.

// Idempotency keys live this long in the durable store before expiring. Asaas
// retries a failing webhook for a bounded window (hours→days), so a 60-day TTL
// covers every realistic retry while keeping the keyspace from growing forever.
const DEFAULT_TTL_SECONDS = 60 * 24 * 60 * 60; // 60 days

// Namespace so idempotency keys never collide with anything else in a shared store.
const KEY_PREFIX = 'asaas:webhook:idem:';

function namespaced(key) {
  return KEY_PREFIX + key;
}

// ── In-memory fallback (NOT durable) ────────────────────────────────────────
function createMemoryStore() {
  const seen = new Set();
  return {
    durable: false,
    async isProcessed(key) {
      return seen.has(key);
    },
    async markProcessed(key) {
      seen.add(key);
    },
    // exposed for tests/diagnostics only
    _seen: seen,
  };
}

// ── Upstash Redis REST adapter (durable) ────────────────────────────────────
// Uses Upstash's REST endpoints, which Vercel KV is built on, so the same
// adapter works for a Vercel KV instance configured with REST credentials.
//   isProcessed  -> GET    <key>            (truthy reply = already processed)
//   markProcessed-> SET    <key> 1 EX <ttl> (NX not required: re-marking is fine)
// Env vars (read via loadEnv's process.env, like the rest of the backend):
//   KV_REST_API_URL   (or UPSTASH_REDIS_REST_URL)
//   KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_TOKEN)
function createUpstashStore({ url, token, ttlSeconds = DEFAULT_TTL_SECONDS, fetchImpl = fetch } = {}) {
  if (!url || !token) {
    throw new Error('createUpstashStore requires url + token');
  }
  const base = url.replace(/\/+$/, '');

  async function command(parts) {
    // Upstash REST: GET <base>/<cmd>/<arg>/<arg>... with a bearer token.
    // Path segments are encoded so a key with ':' or '/' is transmitted intact.
    const path = parts.map((p) => encodeURIComponent(String(p))).join('/');
    const res = await fetchImpl(`${base}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`idempotency store ${parts[0]} -> ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    const json = await res.json();
    return json?.result;
  }

  return {
    durable: true,
    async isProcessed(key) {
      const result = await command(['GET', namespaced(key)]);
      return result !== null && result !== undefined;
    },
    async markProcessed(key) {
      // SET key 1 EX <ttl> — value is irrelevant; presence is the signal.
      await command(['SET', namespaced(key), '1', 'EX', ttlSeconds]);
    },
  };
}

// ── Selection ───────────────────────────────────────────────────────────────
// Choose the durable adapter when its env vars exist; otherwise fall back to the
// in-memory store and log ONCE so an operator sees durability is OFF in prod logs.
let _warnedNoDurable = false;

function selectIdempotencyStore(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return createUpstashStore({ url, token });
  }
  if (!_warnedNoDurable) {
    _warnedNoDurable = true;
    console.warn(
      '[asaas-webhook] DURABLE IDEMPOTENCY OFF — no KV_REST_API_URL/TOKEN ' +
        '(or UPSTASH_REDIS_REST_URL/TOKEN). Using in-memory dedupe, which RESETS ' +
        'on cold start; a retried event after a cold start may be processed twice. ' +
        'Set the store env vars in production (see README idempotency note).'
    );
  }
  return createMemoryStore();
}

module.exports = {
  DEFAULT_TTL_SECONDS,
  KEY_PREFIX,
  createMemoryStore,
  createUpstashStore,
  selectIdempotencyStore,
};
