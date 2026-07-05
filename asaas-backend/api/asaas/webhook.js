// POST /api/asaas/webhook
//
// Receives Asaas payment events (PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
// PAYMENT_OVERDUE, etc.). Two non-negotiables:
//   1. AUTHENTICATE every event (asaas-access-token) — never trust an unsigned
//      "payment confirmed" POST.
//   2. Be IDEMPOTENT — Asaas retries until it gets a 200, so the same event id
//      can arrive many times. We must process each effect at most once.
//
// Asaas expects a 2xx quickly; we acknowledge fast and keep side effects light.
//
// IDEMPOTENCY is now backed by an injectable store (Dependency Inversion): the
// handler depends on the { isProcessed, markProcessed } INTERFACE, not on a
// concrete KV. In production selectIdempotencyStore() returns a durable Upstash/
// Vercel-KV adapter when its env vars are present; otherwise it falls back to a
// per-instance in-memory Set (which resets on cold start — durability OFF, logged
// once). Tests inject an in-memory fake. See lib/idempotencyStore.js + README.

const { sendJson, readJsonBody } = require('../../lib/http');
const { isAuthentic } = require('../../lib/webhookAuth');
const { selectIdempotencyStore } = require('../../lib/idempotencyStore');
const { assertProductionConfig } = require('../../lib/assertProductionConfig');

// PAY-01 — fail closed at cold-start module init. In production (ASAAS_ENV=
// production) this THROWS if idempotency is not durable (no KV env) or the CORS
// allowlist is missing — the two config hazards that silently degrade payment
// safety. Throwing here crashes the serverless instance before it serves a single
// event, so a misconfigured deploy is caught by the platform (a 500 on cold start)
// instead of quietly reprocessing payments on the in-memory fallback. In sandbox/
// dev it is a no-op, so local boot and `node --test` need zero external services.
assertProductionConfig();

// One store per module instance (per serverless instance). Chosen at module load
// from the env: durable adapter if configured, else in-memory fallback.
const defaultStore = selectIdempotencyStore();

async function defaultProcessEvent(event) {
  // Override via a host-specific wrapper, or replace this body to update your DB /
  // notify / grant access. Kept side-effect-free here. Logs type + payment id
  // only — NEVER card data or secrets.
  const id = event?.payment?.id || event?.id;
  const type = event?.event;
  console.log(`[asaas-webhook] ${type} for payment ${id} (no store configured — logged only)`);
}

// Both seams are injectable so the handler is unit-testable with `node --test`
// and needs no live KV to boot: processEvent (the side effect) and store (the
// durable dedupe). Defaults wire the real implementations.
async function handler(req, res, processEvent = defaultProcessEvent, store = defaultStore) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  const auth = isAuthentic(req);
  if (!auth.ok) {
    // 401 — do NOT reveal which check failed beyond a generic reason.
    return sendJson(res, 401, { error: 'unauthorized' });
  }

  const event = readJsonBody(req);
  if (!event || !event.event) {
    return sendJson(res, 400, { error: 'bad_event' });
  }

  // Idempotency key: prefer the payment id + event type; fall back to event id.
  const key = `${event.event}:${event.payment?.id || event.id || ''}`;

  try {
    // Already processed (durably, if a store is configured)? Ack 200 so Asaas
    // stops retrying, and do NOT re-run the side effect.
    if (await store.isProcessed(key)) {
      return sendJson(res, 200, { ok: true, deduped: true });
    }

    await processEvent(event);

    // Mark AFTER the side effect succeeds: if processEvent throws we never reach
    // here, the key stays unmarked, and Asaas's retry re-processes it. (At-least-
    // once with at-most-one successful apply, given an idempotent processEvent.)
    await store.markProcessed(key);
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    // Return 500 so Asaas RETRIES — we did not successfully apply the effect.
    // (A store outage on isProcessed/markProcessed lands here too: fail closed by
    // retrying rather than risk a silent double- or zero-apply.)
    console.error('[asaas-webhook] processing failed:', err?.message);
    return sendJson(res, 500, { error: 'processing_failed' });
  }
}

module.exports = handler;
module.exports.defaultProcessEvent = defaultProcessEvent;
module.exports.defaultStore = defaultStore; // exposed for diagnostics/tests
