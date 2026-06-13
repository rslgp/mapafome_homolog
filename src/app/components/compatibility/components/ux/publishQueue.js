'use client';

/*
 * M7 publish queue — offline-tolerant storage for reporter pins that failed
 * to reach Google Sheets. Uses IndexedDB so state survives reload and process
 * kill. Flushed opportunistically when the tab goes online or on SW message.
 *
 * INTL M4b (STATE-1 / R3b — offline-queue freeze):
 *   The flush used to BREAK the drain loop on the FIRST failure (so the next
 *   `online` event could retry) — correct for a TRANSIENT network failure, but
 *   catastrophic for a PERMANENT one. A pin queued offline while the flag-
 *   control was on country A, then re-validated against country B at flush time
 *   (because the old write gate re-read the live `getSelectedCountry()`), throws
 *   `out_of_bounds` / `OUT_OF_COUNTRY_BBOX` forever, and the single `break`
 *   FROZE the ENTIRE QUEUE behind that one un-flushable pin.
 *
 *   Two-part fix, in this file and in the write path:
 *     1. (write path) The country is captured into the payload AT ENQUEUE TIME
 *        (ReportSheet stamps `payload.country`) and the flush write gate
 *        validates against THAT payload country, never re-reading the live
 *        selected country (see appPinActions.writePinToSheets). So a later
 *        flag-control switch can no longer invalidate an already-queued pin.
 *     2. (here) The flush distinguishes a PERMANENT failure (validation/poison:
 *        out_of_bounds / OUT_OF_COUNTRY_BBOX) from a TRANSIENT one (network/
 *        offline/slow). A permanent failure is QUARANTINED (moved aside, not
 *        silently dropped — the user's input is preserved for inspection) and
 *        the loop CONTINUES so it can never freeze the rest of the queue. A
 *        transient failure still BREAKS (preserve-retries): a network blip must
 *        never cost the user their pin.
 */

const DB_NAME = 'mdf_publish_queue';
// Bumped 1 → 2 to add the `quarantined` store for INTL M4b poison pills. The
// upgrade is additive (only createObjectStore on a missing store), so an
// existing v1 DB with pending rows upgrades in place without data loss.
const DB_VERSION = 2;
const STORE = 'pending';
const QUARANTINE_STORE = 'quarantined';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb_unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(QUARANTINE_STORE)) {
        db.createObjectStore(QUARANTINE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add({ payload, queuedAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function peekAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Move a poison pill out of `pending` and into `quarantined` so the queue can
// drain. The row is preserved (not dropped) so its data is inspectable / can be
// re-played after a fix; the `reason` records WHY it was quarantined.
async function quarantine(row, reason) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE, QUARANTINE_STORE], 'readwrite');
    tx.objectStore(QUARANTINE_STORE).add({
      payload: row.payload,
      queuedAt: row.queuedAt,
      quarantinedAt: Date.now(),
      reason,
    });
    tx.objectStore(STORE).delete(row.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function peekQuarantined() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUARANTINE_STORE, 'readonly');
    const req = tx.objectStore(QUARANTINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// INTL M4b — classify a flush failure as PERMANENT (the write will NEVER
// succeed for this payload as-is) vs TRANSIENT (could succeed on a retry once
// the network is back). Exported pure so the freeze-prevention logic is unit-
// testable without IndexedDB.
//
//   PERMANENT (quarantine + continue): a geofence/validation rejection —
//     `out_of_bounds` (the FOME write gate) or `OUT_OF_COUNTRY_BBOX` (the M3
//     stable Layer-B code). Re-trying these forever is what froze the queue;
//     the country capture (write path) already prevents a flag-control switch
//     from manufacturing them, so a residual one is a genuine poison pill.
//   TRANSIENT (break + keep for retry): anything network-shaped —
//     `network_slow` / `timeout` (the 10s write guard), `network`,
//     `failed to fetch`, `offline`. Dropping a pin on a blip is forbidden.
//
// Default to TRANSIENT for an UNRECOGNIZED error: when unsure, keep-and-retry
// (never silently drop the user's pin). A truly stuck unknown error will keep
// failing transiently rather than vanish.
const PERMANENT_FAILURE = /\b(out_of_bounds|OUT_OF_COUNTRY_BBOX)\b/;
const TRANSIENT_FAILURE = /\b(network_slow|timeout|network|failed to fetch|offline)\b/i;

export function isPermanentFailure(err) {
  const msg = (err && (err.message || err.reason)) || '';
  // A transient signal wins over a permanent one if BOTH somehow match, so a
  // network blip is never mistaken for a poison pill (do-not-drop bias).
  if (TRANSIENT_FAILURE.test(msg)) return false;
  return PERMANENT_FAILURE.test(msg);
}

// Given a publish function, drain the queue.
//   • On a PERMANENT failure: quarantine the poison pill and CONTINUE, so one
//     bad pin can never freeze the rest of the queue (INTL M4b).
//   • On a TRANSIENT failure: STOP (break) so we don't burn the user's retries —
//     the next `online` event will try the whole batch again.
//
// `_io` is an injectable I/O seam (peek/remove/quarantine) defaulting to the
// IndexedDB-backed implementation above; tests inject an in-memory store so the
// freeze-prevention logic is exercisable without IndexedDB (jsdom has none).
export async function flush(publishFn, _io = { peekAll, remove, quarantine }) {
  let pending;
  try {
    pending = await _io.peekAll();
  } catch (_err) {
    return { attempted: 0, succeeded: 0, failed: 0, quarantined: 0 };
  }
  if (pending.length === 0) return { attempted: 0, succeeded: 0, failed: 0, quarantined: 0 };

  let succeeded = 0;
  let failed = 0;
  let quarantined = 0;
  for (const row of pending) {
    try {
      await publishFn(row.payload);
      await _io.remove(row.id);
      succeeded += 1;
    } catch (err) {
      if (isPermanentFailure(err)) {
        // Poison pill: move it aside and keep draining the rest of the queue.
        await _io.quarantine(row, (err && err.message) || 'permanent_failure');
        quarantined += 1;
        continue;
      }
      // Transient (or unknown): keep the row and stop; retry the batch later.
      failed += 1;
      break;
    }
  }
  return { attempted: pending.length, succeeded, failed, quarantined };
}

export function bindOnlineFlush(publishFn, { onResult } = {}) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    const result = await flush(publishFn);
    if (result.attempted > 0 && onResult) onResult(result);
  };
  window.addEventListener('online', handler);
  // Also flush eagerly on bind in case we came back online while script loaded.
  handler();
  return () => window.removeEventListener('online', handler);
}

export async function queueSize() {
  try {
    const all = await peekAll();
    return all.length;
  } catch (_err) {
    return 0;
  }
}
