// publishQueue.test.js — INTL milestone M4b unit tests (STATE-1 / R3b /
// R3b-offline-flush). Covers the offline-queue-freeze blocker:
//
//   • CAPTURE: the publish payload carries the country it was created in
//       (stamped at enqueue time), so the flush can key validation to it.
//   • PAYLOAD-KEYED VALIDATION: the flush write gate validates against the
//       PAYLOAD's captured country, NEVER re-reading getSelectedCountry() — so
//       switching the flag-control AFTER queueing cannot invalidate the pin.
//   • POISON-PILL QUARANTINE: a genuinely un-flushable item is moved aside and
//       the loop CONTINUES, so one bad pin can no longer freeze the whole queue.
//   • TRANSIENT KEEP-AND-RETRY: a network/offline failure still STOPS the batch
//       and keeps the pin (a blip must never drop a user's pin).
//   • BACKWARD COMPAT: a queued item with NO captured country defaults to 'br'
//       (same default as M2.5's missing-Pais).
//
// IndexedDB is unavailable under jsdom, so flush() takes an injectable I/O seam
// (peekAll/remove/quarantine); these tests drive it with an in-memory store that
// mirrors the production IndexedDB behavior, exercising the freeze-prevention
// LOGIC directly without a DB.

import { describe, it, expect, beforeEach } from 'vitest';

import { flush, isPermanentFailure } from
  '../src/app/components/compatibility/components/ux/publishQueue.js';
import { activeCountryFor } from
  '../src/app/components/compatibility/components/geofence.js';
import { isInsideCountry, DEFAULT_COUNTRY } from
  '../src/app/components/compatibility/components/countries.js';
import * as countryStore from
  '../src/app/components/compatibility/components/countryStore.js';

// Coordinates known to the curated COUNTRY_PUBLISH_BOUNDS (countries.js):
//   • SP_BR is inside Brazil's rect2 but OUTSIDE Portugal's box.
//   • LISBON_PT is inside Portugal's box but OUTSIDE Brazil.
const SP_BR = [-23.55, -46.63];
const LISBON_PT = [38.72, -9.13];

// An in-memory stand-in for the IndexedDB-backed store, with the SAME shape the
// flush loop calls: peekAll() → rows, remove(id) → drop a drained row,
// quarantine(row, reason) → move a poison pill aside. Lets us assert exactly
// which rows ended up flushed / kept / quarantined.
function makeMemStore(initialRows) {
  let nextId = 1;
  const pending = initialRows.map((r) => ({
    id: r.id ?? nextId++,
    payload: r.payload,
    queuedAt: r.queuedAt ?? Date.now(),
  }));
  const quarantined = [];
  return {
    pending,
    quarantined,
    io: {
      async peekAll() { return pending.slice(); },
      async remove(id) {
        const i = pending.findIndex((r) => r.id === id);
        if (i >= 0) pending.splice(i, 1);
      },
      async quarantine(row, reason) {
        const i = pending.findIndex((r) => r.id === row.id);
        if (i >= 0) pending.splice(i, 1);
        quarantined.push({ payload: row.payload, reason });
      },
    },
  };
}

// The flush write gate, mirroring appPinActions.writePinToSheets EXACTLY for the
// part this milestone changed: it validates against the PAYLOAD's captured
// country (country || DEFAULT_COUNTRY), NEVER getSelectedCountry(). A `network`
// payload simulates a transient failure so we can test keep-and-retry.
function makePayloadGatedPublish() {
  return async (payload) => {
    if (payload.simulateNetwork) throw new Error('network_slow');
    if (!payload.coords || !isInsideCountry(payload.coords, payload.country || DEFAULT_COUNTRY)) {
      throw new Error('out_of_bounds');
    }
    return true;
  };
}

describe('isPermanentFailure — permanent vs transient classification', () => {
  it('treats geofence/validation rejections as PERMANENT (poison pills)', () => {
    expect(isPermanentFailure(new Error('out_of_bounds'))).toBe(true);
    expect(isPermanentFailure(new Error('OUT_OF_COUNTRY_BBOX'))).toBe(true);
    expect(isPermanentFailure({ reason: 'OUT_OF_COUNTRY_BBOX' })).toBe(true);
  });

  it('treats network-shaped failures as TRANSIENT (keep-and-retry)', () => {
    expect(isPermanentFailure(new Error('network_slow'))).toBe(false);
    expect(isPermanentFailure(new Error('timeout'))).toBe(false);
    expect(isPermanentFailure(new Error('Failed to fetch'))).toBe(false);
    expect(isPermanentFailure(new Error('offline'))).toBe(false);
    expect(isPermanentFailure(new Error('network error'))).toBe(false);
  });

  it('defaults an UNKNOWN error to TRANSIENT (never silently drop a pin)', () => {
    expect(isPermanentFailure(new Error('something weird'))).toBe(false);
    expect(isPermanentFailure(null)).toBe(false);
    expect(isPermanentFailure(undefined)).toBe(false);
  });

  it('a transient signal WINS over a permanent one if both appear', () => {
    // Defensive: a network error must never be mistaken for a poison pill.
    expect(isPermanentFailure(new Error('network: out_of_bounds'))).toBe(false);
  });
});

describe('flush — validates against the PAYLOAD country, NOT getSelectedCountry', () => {
  beforeEach(() => {
    countryStore.__resetCountryStoreForTests();
  });

  it('a pin queued under PT still validates against PT after the flag-control switches to BR', async () => {
    // 1) Enqueue a Portugal pin while the selected country is PT. The capture
    //    point (ReportSheet) would stamp country via activeCountryFor; we stamp
    //    it directly here to isolate the queue logic.
    countryStore.setSelectedCountry('pt');
    const capturedCountry = activeCountryFor(true, countryStore); // 'pt'
    expect(capturedCountry).toBe('pt');
    const mem = makeMemStore([
      { payload: { coords: LISBON_PT, country: capturedCountry, idempotency_key: 'a' } },
    ]);

    // 2) The user later switches the flag-control to Brazil BEFORE the flush.
    countryStore.setSelectedCountry('br');
    expect(countryStore.getSelectedCountry()).toBe('br');

    // 3) Flush. The gate reads payload.country ('pt'), NOT the live 'br', so the
    //    Lisbon pin still passes and drains — the STATE-1 freeze cannot happen.
    const result = await flush(makePayloadGatedPublish(), mem.io);

    expect(result).toMatchObject({ attempted: 1, succeeded: 1, failed: 0, quarantined: 0 });
    expect(mem.pending).toHaveLength(0);
    expect(mem.quarantined).toHaveLength(0);
  });

  it('a BR pin queued under BR validates against BR even after switching to PT', async () => {
    countryStore.setSelectedCountry('br');
    const mem = makeMemStore([
      { payload: { coords: SP_BR, country: 'br', idempotency_key: 'b' } },
    ]);
    countryStore.setSelectedCountry('pt'); // switch AFTER queueing

    const result = await flush(makePayloadGatedPublish(), mem.io);

    // If the gate had re-read getSelectedCountry() (='pt'), the SP pin would be
    // out of PT's box and throw — the old freeze. Keyed to the payload, it drains.
    expect(result).toMatchObject({ attempted: 1, succeeded: 1, quarantined: 0 });
    expect(mem.pending).toHaveLength(0);
  });
});

describe('flush — poison-pill quarantine (the freeze is gone)', () => {
  it('quarantines one un-flushable pin and STILL flushes the rest of the queue', async () => {
    // Middle row is a genuine poison pill: a BR pin whose captured country is PT
    // (e.g. produced by the offline-create path), so isInsideCountry([SP], 'pt')
    // fails forever. The two flanking pins are valid.
    const mem = makeMemStore([
      { id: 1, payload: { coords: SP_BR, country: 'br', idempotency_key: 'good-1' } },
      { id: 2, payload: { coords: SP_BR, country: 'pt', idempotency_key: 'poison' } },
      { id: 3, payload: { coords: LISBON_PT, country: 'pt', idempotency_key: 'good-2' } },
    ]);

    const result = await flush(makePayloadGatedPublish(), mem.io);

    // The poison pill did NOT break the loop: both good pins drained.
    expect(result).toMatchObject({ attempted: 3, succeeded: 2, quarantined: 1, failed: 0 });
    expect(mem.pending).toHaveLength(0); // pending fully drained — no freeze
    expect(mem.quarantined).toHaveLength(1);
    expect(mem.quarantined[0].payload.idempotency_key).toBe('poison');
    expect(mem.quarantined[0].reason).toMatch(/out_of_bounds/);
  });

  it('quarantine PRESERVES the bad pin (moved aside, not silently dropped)', async () => {
    const mem = makeMemStore([
      { id: 1, payload: { coords: SP_BR, country: 'pt', idempotency_key: 'poison' } },
    ]);

    await flush(makePayloadGatedPublish(), mem.io);

    expect(mem.pending).toHaveLength(0);
    // The payload still exists in the quarantine store for inspection/replay.
    expect(mem.quarantined).toHaveLength(1);
    expect(mem.quarantined[0].payload.coords).toEqual(SP_BR);
  });
});

describe('flush — transient failure keeps the item for retry (not dropped)', () => {
  it('STOPS the batch and keeps the pin on a network failure (no drop, no quarantine)', async () => {
    const mem = makeMemStore([
      { id: 1, payload: { coords: SP_BR, country: 'br', simulateNetwork: true, idempotency_key: 'n1' } },
      { id: 2, payload: { coords: LISBON_PT, country: 'pt', idempotency_key: 'after' } },
    ]);

    const result = await flush(makePayloadGatedPublish(), mem.io);

    // Breaks on the first (network) failure: nothing dropped, nothing quarantined,
    // BOTH rows remain pending for the next online retry.
    expect(result).toMatchObject({ attempted: 2, succeeded: 0, failed: 1, quarantined: 0 });
    expect(mem.pending).toHaveLength(2);
    expect(mem.quarantined).toHaveLength(0);
  });

  it('retrying after the network recovers drains the previously-stuck batch', async () => {
    const payload1 = { coords: SP_BR, country: 'br', simulateNetwork: true, idempotency_key: 'n1' };
    const mem = makeMemStore([
      { id: 1, payload: payload1 },
      { id: 2, payload: { coords: LISBON_PT, country: 'pt', idempotency_key: 'after' } },
    ]);

    await flush(makePayloadGatedPublish(), mem.io); // first attempt: network down
    expect(mem.pending).toHaveLength(2);

    // Network recovers — clear the simulated failure and retry the same batch.
    payload1.simulateNetwork = false;
    const result2 = await flush(makePayloadGatedPublish(), mem.io);

    expect(result2).toMatchObject({ attempted: 2, succeeded: 2, failed: 0, quarantined: 0 });
    expect(mem.pending).toHaveLength(0);
  });
});

describe('flush — backward compat: a missing captured country defaults to "br"', () => {
  it('a legacy queued item with NO country field validates as BR', async () => {
    // Pre-M4b queued payloads have no `country`. The gate defaults to 'br'.
    const mem = makeMemStore([
      { id: 1, payload: { coords: SP_BR, idempotency_key: 'legacy' } }, // no country
    ]);

    const result = await flush(makePayloadGatedPublish(), mem.io);

    expect(result).toMatchObject({ attempted: 1, succeeded: 1, quarantined: 0 });
    expect(mem.pending).toHaveLength(0);
  });

  it('activeCountryFor with the flag OFF always yields "br" (capture stamp under OFF)', () => {
    // The capture site stamps activeCountryFor(INTL_ENABLED, store). With the
    // flag OFF that is 'br' regardless of any selected country in storage, so the
    // single-country / no-freeze posture is byte-identical to today.
    countryStore.__resetCountryStoreForTests();
    countryStore.setSelectedCountry('pt'); // even with a non-BR selection…
    expect(activeCountryFor(false, countryStore)).toBe(DEFAULT_COUNTRY); // …OFF → 'br'
    expect(DEFAULT_COUNTRY).toBe('br');
  });
});

describe('flush — empty / unavailable queue is a no-op', () => {
  it('returns zeros for an empty queue', async () => {
    const mem = makeMemStore([]);
    const result = await flush(makePayloadGatedPublish(), mem.io);
    expect(result).toMatchObject({ attempted: 0, succeeded: 0, failed: 0, quarantined: 0 });
  });

  it('returns zeros (does not throw) when the store cannot be read', async () => {
    const io = {
      async peekAll() { throw new Error('indexeddb_unavailable'); },
      async remove() {},
      async quarantine() {},
    };
    const result = await flush(makePayloadGatedPublish(), io);
    expect(result).toMatchObject({ attempted: 0, succeeded: 0 });
  });
});
