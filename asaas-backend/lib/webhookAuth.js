// webhookAuth.js — authenticate inbound Asaas webhooks.
//
// Asaas authenticates webhooks with a static token: you set an "Access Token"
// when registering the webhook, and Asaas sends it back on every POST in the
// `asaas-access-token` header. We compare it (constant-time) against the
// ASAAS_WEBHOOK_TOKEN server env var. An unauthenticated POST is rejected —
// otherwise anyone could forge "payment confirmed" events.

const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  // timingSafeEqual throws if lengths differ; guard first (length is not secret).
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function isAuthentic(req) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) {
    // Fail closed: if the server wasn't configured with a token, reject all.
    return { ok: false, reason: 'ASAAS_WEBHOOK_TOKEN not configured on server' };
  }
  const received = req.headers['asaas-access-token'];
  if (!received) return { ok: false, reason: 'missing asaas-access-token header' };
  if (!timingSafeEqual(received, expected)) return { ok: false, reason: 'token mismatch' };
  return { ok: true };
}

module.exports = { isAuthentic, timingSafeEqual };
