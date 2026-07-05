// assertProductionConfig.js — PAY-01: fail-closed production config guard.
//
// Today the two production hazards are only SOFT-signalled:
//   • idempotencyStore.selectIdempotencyStore() falls back to a per-instance
//     in-memory Set with a one-time console.warn when no KV env is set — so a
//     retried webhook after a cold start is reprocessed (double-apply of a
//     payment side effect), and nothing stops the deploy.
//   • http.applyCors() only restricts the origin in production when ALLOWED_ORIGINS
//     is set; if it is unset in production the DEV_FALLBACK_ORIGINS (which include
//     localhost) apply — a production CORS misconfiguration that passes silently.
//
// This module turns those two soft signals into a HARD boot check, mirroring the
// webhookAuth fail-closed discipline (reject when the server secret is missing).
// It is a PURE function of the env: it throws with a precise message so a boot
// wrapper can crash the process before serving a single request in a misconfigured
// production. In non-production (sandbox/dev) it is a no-op so `next dev` and the
// test harness boot with zero external services.
//
// NOTE: it validates PRESENCE/shape of config, never live connectivity (a pure,
// offline check — no network). A KV that is set but unreachable still surfaces at
// request time via the webhook's fail-closed 500-and-retry path.

// Production is signalled by ASAAS_ENV=production (the project's existing signal,
// same one http.isProduction / asaasClient read). Anything else = non-production.
function isProductionEnv(env) {
  return (env.ASAAS_ENV || 'sandbox').toLowerCase() === 'production';
}

// Durable idempotency requires BOTH a KV REST url and token (either the Vercel KV
// names or the Upstash names — mirrors selectIdempotencyStore's lookup exactly).
function hasDurableKv(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(url && token);
}

// A non-empty, explicitly-set CORS allowlist. In production ALLOWED_ORIGINS must
// be set (comma-separated), else applyCors would fall back to the dev origins.
function hasProductionCorsAllowlist(env) {
  const list = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0;
}

// Collect EVERY production-config problem (so the operator sees all at once, not
// one-at-a-time across restarts) and throw a single aggregated error. Returns a
// summary object when the config is OK (or when not in production).
//
// Throws Error with `.code = 'PRODUCTION_CONFIG_INVALID'` and `.problems` (array
// of machine-readable ids) so a caller/test can assert on it precisely.
function assertProductionConfig(env = process.env) {
  if (!isProductionEnv(env)) {
    return { production: false, ok: true, problems: [] };
  }

  const problems = [];
  if (!hasDurableKv(env)) {
    problems.push('idempotency_not_durable'); // no KV_REST_API_URL/TOKEN (or UPSTASH_*)
  }
  if (!hasProductionCorsAllowlist(env)) {
    problems.push('cors_allowlist_missing'); // ALLOWED_ORIGINS unset -> dev fallback applies
  }

  if (problems.length) {
    const detail = problems
      .map((p) =>
        p === 'idempotency_not_durable'
          ? 'idempotency is not durable (set KV_REST_API_URL + KV_REST_API_TOKEN, ' +
            'or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) — a retried ' +
            'webhook after a cold start would be processed twice'
          : 'CORS allowlist is missing (set ALLOWED_ORIGINS, comma-separated) — ' +
            'without it production would fall back to the dev origins incl. localhost'
      )
      .join('; ');
    const err = new Error(
      `ASAAS_ENV=production but the config is unsafe: ${detail}. ` +
        'Refusing to boot (PAY-01 fail-closed).'
    );
    err.code = 'PRODUCTION_CONFIG_INVALID';
    err.problems = problems;
    throw err;
  }

  return { production: true, ok: true, problems: [] };
}

module.exports = {
  assertProductionConfig,
  // exported for focused unit tests
  isProductionEnv,
  hasDurableKv,
  hasProductionCorsAllowlist,
};
