// rateLimitStore.js — the durable "how many hits from this key in this window?" seam.
//
// EXT-SEC-04 (tier S-): create-subscription.js dedupes only by externalRef
// (email+rail), so a script that VARIES the email defeats the dedupe and creates
// real Asaas customers/subscriptions on every POST (cost + quota burn). This store
// adds a per-IP, fixed-window request COUNTER in front of that, independent of the
// body — the abuse vector is the caller, not the payload.
//
// It deliberately MIRRORS idempotencyStore.js's dual-path shape (Dependency
// Inversion + the same env selection), rather than inventing a new mechanism:
//   • createMemoryRateLimitStore() — per-instance Map of fixed windows. Zero-dep,
//     resets on cold start. The documented dev/sandbox FALLBACK.
//   • createUpstashRateLimitStore() — Upstash Redis over REST (plain `fetch`, no
//     npm dep), the SAME endpoint Vercel KV is built on. Cross-instance +
//     cross-cold-start, so the throttle holds across serverless instances.
// selectRateLimitStore() picks the durable adapter when its env vars are present
// (the same KV_REST_API_* / UPSTASH_REDIS_REST_* pair idempotencyStore reads),
// else logs ONCE and returns the memory fallback. A test can always inject its own.
//
// The interface is ONE async method — a counter, not the idempotency store's
// isProcessed/markProcessed (different operation → separate seam, SRP):
//
//   hit(key, windowSeconds) -> Promise<{ count, limitedByStore? }>
//     count = the request count INCLUDING this hit, within the current window.
//     The caller compares count against its own limit and decides 429 vs allow.
//
// FAIL-OPEN: hit() never throws. A rate limiter is a cost/abuse control, not a
// correctness control — if the KV is unreachable, blocking every donation is worse
// than briefly losing throttle protection (a KV blip would take down all legitimate
// donations). This is the OPPOSITE of the webhook idempotency store, which fails
// CLOSED because a KV outage THERE risks a double-CHARGE (money correctness). On a
// store error the memory path can't run either, so hit() returns count=1 (allow)
// and flags limitedByStore so the caller/logs can see the throttle degraded open.

// Namespace so rate-limit keys never collide with idempotency keys in a shared KV.
const KEY_PREFIX = 'asaas:ratelimit:';

// A fixed window is bucketed by floor(now / windowSeconds): every caller in the
// same wall-clock bucket shares one counter that expires when the bucket rolls.
// Fixed-window (vs sliding) is chosen for KV-cheapness: one INCR + one EXPIRE per
// hit, no sorted-set bookkeeping. Its known burst edge (up to 2×limit across a
// window boundary) is acceptable for an abuse throttle on a donation endpoint.
function windowBucket(nowMs, windowSeconds) {
  return Math.floor(nowMs / (windowSeconds * 1000));
}

function namespaced(key, bucket) {
  return `${KEY_PREFIX}${key}:${bucket}`;
}

// ── In-memory fallback (NOT durable; resets on cold start) ──────────────────
function createMemoryRateLimitStore(nowFn = Date.now) {
  // Map<namespacedKey, count>. Old buckets are pruned lazily on access so the Map
  // does not grow unbounded across windows for a busy key.
  const counts = new Map();
  let lastPruneBucket = -1;

  return {
    durable: false,
    async hit(key, windowSeconds) {
      const bucket = windowBucket(nowFn(), windowSeconds);
      // Cheap lazy prune: when the bucket advances, drop every entry not in the
      // current bucket (keys carry their bucket in the string, so we match on it).
      if (bucket !== lastPruneBucket) {
        const suffix = `:${bucket}`;
        for (const k of counts.keys()) {
          if (!k.endsWith(suffix)) counts.delete(k);
        }
        lastPruneBucket = bucket;
      }
      const nsKey = namespaced(key, bucket);
      const next = (counts.get(nsKey) || 0) + 1;
      counts.set(nsKey, next);
      return { count: next };
    },
    // exposed for tests/diagnostics only
    _counts: counts,
  };
}

// ── Upstash Redis REST adapter (durable) ────────────────────────────────────
// Two REST commands per hit (the SAME command/encoding pattern as
// idempotencyStore.createUpstashStore):
//   INCR   <key>            -> the new count (1 on the first hit of the window)
//   EXPIRE <key> <window>   -> bound the bucket's TTL so it self-cleans
// EXPIRE is (re)set every hit; that is harmless (it just keeps the window's own
// length) and avoids a race where an INCR without a TTL would live forever.
function createUpstashRateLimitStore({ url, token, fetchImpl = fetch } = {}) {
  if (!url || !token) {
    throw new Error('createUpstashRateLimitStore requires url + token');
  }
  const base = url.replace(/\/+$/, '');

  async function command(parts) {
    const path = parts.map((p) => encodeURIComponent(String(p))).join('/');
    const res = await fetchImpl(`${base}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`rate-limit store ${parts[0]} -> ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    const json = await res.json();
    return json?.result;
  }

  return {
    durable: true,
    async hit(key, windowSeconds) {
      // FAIL-OPEN: any KV error here allows the request (count=1) and flags it, so a
      // KV outage degrades the throttle open rather than blocking all donations.
      try {
        const bucket = windowBucket(Date.now(), windowSeconds);
        const nsKey = namespaced(key, bucket);
        const count = await command(['INCR', nsKey]);
        // Set the TTL every hit; on the first hit it establishes the window, on
        // later hits it is a harmless refresh to the same fixed length.
        await command(['EXPIRE', nsKey, windowSeconds]);
        return { count: Number(count) || 1 };
      } catch (err) {
        console.error(
          '[asaas-ratelimit] store hit failed — failing OPEN (allowing request):',
          err?.message
        );
        return { count: 1, limitedByStore: true };
      }
    },
  };
}

// ── Selection ───────────────────────────────────────────────────────────────
// Choose the durable adapter when its env vars exist; otherwise fall back to the
// in-memory store and log ONCE so an operator sees durability is OFF. Reads the
// SAME env pair as selectIdempotencyStore so one KV configures both.
let _warnedNoDurable = false;

function selectRateLimitStore(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return createUpstashRateLimitStore({ url, token });
  }
  if (!_warnedNoDurable) {
    _warnedNoDurable = true;
    console.warn(
      '[asaas-ratelimit] DURABLE RATE LIMIT OFF — no KV_REST_API_URL/TOKEN ' +
        '(or UPSTASH_REDIS_REST_URL/TOKEN). Using in-memory per-IP counters, which ' +
        'RESET on cold start and are NOT shared across serverless instances, so the ' +
        'throttle is only best-effort in prod without a KV. Set the store env vars.'
    );
  }
  return createMemoryRateLimitStore();
}

module.exports = {
  KEY_PREFIX,
  windowBucket,
  createMemoryRateLimitStore,
  createUpstashRateLimitStore,
  selectRateLimitStore,
};
