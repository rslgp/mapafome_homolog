// GET /api/asaas/health
//
// Liveness probe for the Asaas backend. Returns 200 with a tiny status object so
// an uptime monitor / load balancer / deploy check can confirm the function is
// serving WITHOUT spending an Asaas API call or touching donor data.
//
// This is a LIVENESS check (is this process up and serving?), NOT a readiness
// check (can it reach Asaas?). It deliberately does not call upstream, so a
// transient Asaas outage never makes our own health flap — and a monitor hitting
// it every minute costs zero Asaas quota.
//
// Safe to expose publicly: it reports only WHETHER the env is configured, never
// the key. `apiKey: "set" | "missing"` is a boolean-grade signal (does the deploy
// have a key at all) — the secret value never appears in the response.

const { handlePreflight, applyCors, sendJson } = require('../../lib/http');

// Pure builder for the status body (minus the timestamp, which is non-deterministic
// and stamped by the handler). Exported so a unit test can assert the shape
// without clock flakiness.
function buildHealth({ asaasEnv, hasKey } = {}) {
  return {
    ok: true,
    service: 'asaas-backend',
    env: asaasEnv || 'sandbox',
    apiKey: hasKey ? 'set' : 'missing',
  };
}

module.exports = async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'method_not_allowed', message: 'use GET' });
  }

  const body = buildHealth({
    asaasEnv: process.env.ASAAS_ENV,
    hasKey: Boolean(process.env.ASAAS_API_KEY),
  });
  body.time = new Date().toISOString();

  return sendJson(res, 200, body);
};

// Pure helper exported for unit tests.
module.exports.buildHealth = buildHealth;
