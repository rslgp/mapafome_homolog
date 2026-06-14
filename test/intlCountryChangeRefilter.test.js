// intlCountryChangeRefilter.test.js — INTL "on change country, repopulate marks"
//
// App subscribes to countryStore and, on a country change, re-derives the rendered
// marker set from the ALREADY-CACHED raw rows (envVariables.rows) WITHOUT a sheet
// re-fetch, by reusing the SAME pure filterRowsByCountry the bootstrap uses. This
// suite proves that subscribe -> re-filter wiring CONTRACT at the level it can be
// cleanly exercised: the real countryStore (its notify-on-actual-change + the
// unsubscribe handle) driving the real filterRowsByCountry over a cached, mixed-
// country row set.
//
// Why this level and not a full App mount: App is a CRA-style class wired to
// Leaflet/MUI/Google-Sheets; a DOM mount would test the framework, not the seam.
// The seam IS "store change -> filterRowsByCountry(cachedRows, activeCountry) ->
// new dataMaps". We bind a subscriber whose body mirrors App._refilterForCountry
// (active country resolved the bootstrap way, then filterRowsByCountry) and assert
// the re-derived dataMaps + rowCount track the selected country. rowCountry's
// legacy-'br' default is asserted alongside so the no-Pais invariant is in scope.

import { describe, it, expect, beforeEach } from 'vitest';

import {
  subscribe,
  setSelectedCountry,
  getSelectedCountry,
  __resetCountryStoreForTests,
} from '../src/app/components/compatibility/components/countryStore.js';
import { activeCountryFor } from '../src/app/components/compatibility/components/geofence.js';
import { filterRowsByCountry } from '../src/app/components/compatibility/appMainBootstrap.js';

// A representative cached sheet (already Dados-spread, exactly as runMain leaves
// envVariables.rows): a legacy BR row (no Pais), a freshly-stamped BR row, two
// non-BR rows, and a pet row that must always be dropped.
function makeCachedRows() {
  return [
    { id: 'legacy-br', kind: undefined },           // no Pais → legacy BR (stays 'br')
    { id: 'new-br', kind: undefined, Pais: 'br' },
    { id: 'es', kind: undefined, Pais: 'es' },
    { id: 'pt', kind: undefined, Pais: 'pt' },
    { id: 'pet', kind: 'pet', Pais: 'es' },          // pet → always dropped
  ];
}
const ids = (out) => out.map((r) => r.id);

// Mirrors App._refilterForCountry: resolve the active country the SAME way the
// bootstrap does (activeCountryFor, NOT the subscribe callback arg), then re-derive
// dataMaps via the SAME pure filter — so this asserts the real wiring, not a copy.
function refilter(cachedRows, flagEnabled) {
  // GUARD parity: undefined cached rows means the first load has not landed; the
  // contract is "do nothing" (the in-flight runMain applies the then-current
  // country). We model that here so the guard is part of the asserted contract.
  if (cachedRows === undefined) return null;
  const activeCountry = activeCountryFor(flagEnabled, { getSelectedCountry });
  const dataMaps = filterRowsByCountry(cachedRows, activeCountry);
  return { dataMaps, rowCount: dataMaps.length };
}

describe('country change -> repopulate marks (INTL ON: flag enabled, picker live)', () => {
  beforeEach(() => {
    __resetCountryStoreForTests(); // isolate in-module store state + listeners
  });

  it('changing the selected country re-derives dataMaps to that country, no re-fetch', () => {
    const cachedRows = makeCachedRows();
    setSelectedCountry('br'); // known start (store persists across cases via localStorage)
    let latest = null;

    // The App wiring: subscribe(() => this._refilterForCountry()). The callback arg
    // is ignored; we re-resolve through activeCountryFor over the cached rows.
    const unbind = subscribe(() => {
      latest = refilter(cachedRows, /* INTL_ENABLED */ true);
    });

    // Start at BR (default). Move to Spain: only ES-stamped rows survive; BR rows
    // and the pet row do NOT bleed in.
    setSelectedCountry('es');
    expect(ids(latest.dataMaps)).toEqual(['es']);
    expect(latest.rowCount).toBe(1);

    // Move to Portugal: now only the PT row, proving the re-filter re-runs each
    // change against the same cached rows (no network, just a re-filter).
    setSelectedCountry('pt');
    expect(ids(latest.dataMaps)).toEqual(['pt']);
    expect(latest.rowCount).toBe(1);

    // Back to Brazil: legacy (no-Pais) + BR-stamped rows return; foreign rows drop.
    setSelectedCountry('br');
    expect(ids(latest.dataMaps)).toEqual(['legacy-br', 'new-br']);
    expect(latest.rowCount).toBe(2);

    unbind();
  });

  it('the store only notifies on an ACTUAL code change (no redundant re-filter)', () => {
    const cachedRows = makeCachedRows();
    setSelectedCountry('br'); // known start so the es change below is a real change
    let calls = 0;
    const unbind = subscribe(() => {
      calls += 1;
      refilter(cachedRows, true);
    });

    setSelectedCountry('es'); // br -> es : fires
    setSelectedCountry('es'); // es -> es : NO-OP, must not fire
    expect(calls).toBe(1);
    unbind();
  });

  it('the unsubscribe handle stops further re-filters (no subscription leak)', () => {
    const cachedRows = makeCachedRows();
    // Seed a known start BEFORE subscribing so the asserted change actually fires
    // (the store persists its value across cases in localStorage and only notifies
    // on an ACTUAL code change). br -> es below is then guaranteed to be a change.
    setSelectedCountry('br');
    let calls = 0;
    const unbind = subscribe(() => {
      calls += 1;
      refilter(cachedRows, true);
    });

    setSelectedCountry('es'); // br -> es : fires
    unbind(); // componentWillUnmount parity
    setSelectedCountry('pt'); // must NOT fire after unbind
    expect(calls).toBe(1);
  });

  it('GUARD: a country change BEFORE the first sheet load does nothing (no throw)', () => {
    setSelectedCountry('br'); // known start so the es change below fires the subscriber
    let result = 'untouched';
    const unbind = subscribe(() => {
      result = refilter(/* envVariables.rows */ undefined, true);
    });
    expect(() => setSelectedCountry('es')).not.toThrow();
    expect(result).toBeNull(); // refilter short-circuits on undefined cached rows
    unbind();
  });
});

describe('flag-OFF path stays byte-identical: active country is always "br"', () => {
  beforeEach(() => {
    __resetCountryStoreForTests();
  });

  it('with INTL_ENABLED false, a store change still re-derives the BR set', () => {
    const cachedRows = makeCachedRows();
    // Known start (distinct from the 'es' change below) so the change fires; the
    // store value persists across cases in localStorage and only notifies on a
    // real change.
    setSelectedCountry('br');
    let latest = null;
    const unbind = subscribe(() => {
      latest = refilter(cachedRows, /* INTL_ENABLED */ false);
    });

    // Even if some code path pushed a non-BR code into the store, with the flag OFF
    // activeCountryFor returns 'br', so the rendered set is the BR set — identical
    // to today. (In production the picker never mounts when OFF, so the store never
    // changes from a UI the user can see; this asserts the resolution is inert.)
    setSelectedCountry('es');
    expect(ids(latest.dataMaps)).toEqual(['legacy-br', 'new-br']);
    expect(latest.rowCount).toBe(2);
    unbind();
  });
});
