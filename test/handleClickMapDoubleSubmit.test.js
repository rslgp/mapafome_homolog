// handleClickMapDoubleSubmit.test.js — EXT-DBLSUBMIT-01 re-entry guard.
//
// Proves that a rapid double-tap of "Confirmar ponto" fires the async publish
// only ONCE: the second App.handleClickMap() call while a publish is already in
// flight is a no-op (the top-of-function `if (this.state.isPublishing) return`
// guard). Two identical Sheet writes was the real bug — the button used to have
// a dead `{false ? <spinner/> : <button/>}` branch so it was never disabled and
// the publish was fire-and-forget, so a double-tap wrote the pin twice.
//
// The guard is exercised on the REAL App.prototype.handleClickMap, bound to a
// minimal fake `this`. handleClickMap only reads this.state.isPublishing,
// this._physicalCountryResolver, this._publishMarkFromMap / setState, and the
// module-level envVariables singleton — so we drive it without booting React /
// leaflet. Both downstream paths are covered:
//   • OFF path  (_physicalCountryResolver === null) → sync _publishMarkFromMap
//   • ON  path  (_physicalCountryResolver set)      → async
//                _enforceLocationGeofenceThenPublish → _publishMarkFromMap

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import envVariables from '../src/app/components/compatibility/components/variaveisAmbiente';
import App from '../src/app/components/compatibility/App';

const IN_BR = [-8.06, -34.87]; // inside Brazil, so dentroLimites passes

// A minimal `this` carrying only what handleClickMap + its two publish paths
// read. setState mutates state synchronously (enough to flip the re-entry guard;
// React batching is irrelevant to the guard logic under test).
function makeApp(overrides = {}) {
  const app = {
    state: { isPublishing: false },
    _physicalCountryResolver: null,
    setState: vi.fn(function (patch) { Object.assign(this.state, patch); }),
    // Spy on the publish tail so we can count real dispatches without a Sheet write.
    _publishMarkFromMap: vi.fn(),
    handleClickMap: App.prototype.handleClickMap,
    _enforceLocationGeofenceThenPublish:
      App.prototype._enforceLocationGeofenceThenPublish,
    ...overrides,
  };
  // Rebind setState so `this` inside it is the app object.
  app.setState = vi.fn((patch) => { Object.assign(app.state, patch); });
  return app;
}

describe('EXT-DBLSUBMIT-01 — handleClickMap re-entry guard', () => {
  let savedLastMarked, savedDentroLimites;

  beforeEach(() => {
    savedLastMarked = envVariables.lastMarked;
    savedDentroLimites = envVariables.dentroLimites;
    // Simulate a pin dropped on the map, inside supported bounds.
    envVariables.lastMarked = { getLatLng: () => ({ lat: IN_BR[0], lng: IN_BR[1] }) };
    envVariables.dentroLimites = () => true;
  });

  afterEach(() => {
    envVariables.lastMarked = savedLastMarked;
    envVariables.dentroLimites = savedDentroLimites;
    vi.restoreAllMocks();
  });

  it('OFF path: a first tap publishes; a second tap while publishing is a no-op', () => {
    const app = makeApp();

    // First tap: guard is open (isPublishing false) → commits.
    app.handleClickMap();
    expect(app._publishMarkFromMap).toHaveBeenCalledTimes(1);
    // The commit set the busy flag (single point in handleClickMap, before dispatch).
    expect(app.state.isPublishing).toBe(true);

    // Second tap while the publish is still in flight → early return, no 2nd write.
    app.handleClickMap();
    expect(app._publishMarkFromMap).toHaveBeenCalledTimes(1);
  });

  it('the flag reopens after a publish settles, allowing a legitimate later publish', () => {
    const app = makeApp();
    app.handleClickMap();
    expect(app._publishMarkFromMap).toHaveBeenCalledTimes(1);

    // Simulate the publish finishing (success reloads; error .catch clears the flag).
    app.setState({ isPublishing: false });

    app.handleClickMap();
    expect(app._publishMarkFromMap).toHaveBeenCalledTimes(2);
  });

  it('ON path (geofence): the busy flag is set before the async check, so a double-tap during it does NOT start a 2nd geofence run', async () => {
    // A geofence resolver whose async check we can control: it resolves eligible +
    // allowed, then publishes. We count how many times the async path is entered.
    const enforceSpy = vi.fn(function (latlng) {
      // Mimic the real method's ALLOW tail: publish once.
      this._publishMarkFromMap(latlng, 'br');
      return Promise.resolve();
    });
    const app = makeApp({
      _physicalCountryResolver: () => 'br',
      _enforceLocationGeofenceThenPublish: enforceSpy,
    });

    // First tap → sets isPublishing=true (before the async dispatch), enters geofence.
    app.handleClickMap();
    expect(app.state.isPublishing).toBe(true);
    expect(enforceSpy).toHaveBeenCalledTimes(1);

    // Second tap while the async geofence check is still pending → guarded out.
    app.handleClickMap();
    expect(enforceSpy).toHaveBeenCalledTimes(1);
    expect(app._publishMarkFromMap).toHaveBeenCalledTimes(1);
  });

  it('the busy flag is NOT set when an early return rejects the click (no coord)', () => {
    envVariables.lastMarked = undefined;
    envVariables.currentLocation = null;
    // With no marker and no GPS, handleClickMap alert()s and returns before commit.
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const app = makeApp();

    app.handleClickMap();
    expect(app._publishMarkFromMap).not.toHaveBeenCalled();
    expect(app.state.isPublishing).toBe(false);
    alertSpy.mockRestore();
  });
});
