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
// Persisting events to a real store (KV/DB) is a deploy-specific concern — this
// handler exposes a `processEvent` seam the host wires to its store. With no
// store configured it logs and still 200s (so retries stop), which is safe for
// a first cutover.

const { sendJson, readJsonBody } = require('../../lib/http');
const { isAuthentic } = require('../../lib/webhookAuth');

// In-memory dedupe is per-instance only and resets on cold start — adequate as
// a backstop, NOT as the durable idempotency store. Wire a KV in processEvent
// for cross-instance correctness (see asaas-backend/README.md).
const seen = new Set();

async function defaultProcessEvent(event) {
  // Override via PROCESS_EVENT_HOOK in a host-specific wrapper, or replace this
  // body to update your DB / notify / grant access. Kept side-effect-free here.
  const id = event?.payment?.id || event?.id;
  const type = event?.event;
  console.log(`[asaas-webhook] ${type} for payment ${id} (no store configured — logged only)`);
}

async function handler(req, res, processEvent = defaultProcessEvent) {
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
  if (seen.has(key)) {
    return sendJson(res, 200, { ok: true, deduped: true });
  }

  try {
    await processEvent(event);
    seen.add(key);
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    // Return 500 so Asaas RETRIES — we did not successfully apply the effect.
    console.error('[asaas-webhook] processing failed:', err?.message);
    return sendJson(res, 500, { error: 'processing_failed' });
  }
}

module.exports = handler;
module.exports.defaultProcessEvent = defaultProcessEvent;
module.exports._seen = seen; // exposed for tests
