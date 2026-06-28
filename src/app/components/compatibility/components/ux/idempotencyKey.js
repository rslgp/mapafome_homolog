// idempotencyKey.js — single home for the publish idempotency key.
//
// WHY THIS EXISTS
//   Both report sheets (the hunger ReportSheet and the /pets PetReportSheet)
//   defined a byte-identical key generator inline (SOT/DRY drift). The key
//   survives retries so a double-tap after a slow/timed-out publish does not
//   double-write the pin. crypto.randomUUID is used when available; the
//   timestamp+random fallback covers the rare environment without it.
//
// Pure (no DOM, no I/O beyond the platform crypto) so it is unit-testable.

export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
