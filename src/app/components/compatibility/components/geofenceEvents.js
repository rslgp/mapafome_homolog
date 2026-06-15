// geofenceEvents.js — the cross-component geofence-eligibility CustomEvent contract.
//
// The DECOUPLED SIGNAL LAYER for the location/IP geofence, mirroring markerEvents.js
// (SRP): a single document-level event name plus one dispatch helper. App.js OWNS the
// eligibility verdict (it awaits the GPS + IP resolvers and asks geofenceEligibility),
// then BROADCASTS it on `document` so the publish/edit UI can react WITHOUT prop
// drilling — exactly like MARKER_PLACED_EVENT lets MainControls react to a placed pin.
// No React, no Leaflet. CustomEvent has been universal since IE 9.
//
// WHY A DOM EVENT (not props): the publish triggers are scattered across React
// boundaries — MainControls (the "Confirmar ponto" fieldset + InserirEndereco) and
// AppOverlays (the Report FAB + the EmptyViewportOverlay start CTA). Threading an
// `eligible` flag down to every one of them would bloat the prop surface of the whole
// AppMain/AppOverlays tree. Instead each consumer listens on `document` and locally
// SHOWS/HIDES + ENABLES/DISABLES its own publish trigger, identical to how those same
// components already subscribe to MARKER_PLACED_EVENT.
//
// Receivers:
//   document.addEventListener('mdf:geofence-eligibility', (e) => {
//     e.detail.eligible; // bool — show + arm the publish triggers iff true
//     e.detail.country;  // lowercase alpha-2 binding country, or null
//     e.detail.status;   // machine-readable reason (maps to a localized notice)
//   });
//
// The detail shape is the geofenceEligibility() verdict ({ eligible, country, status })
// plus a `ts` timestamp, so the UX gate and the publish gate read the SAME verdict and
// can never drift apart. `status` is one of the resolveBindingCountry reasons
// ('ok' | 'ok_ip_fallback' | 'mismatch' | 'ip_unknown' | 'no_location').
export const GEOFENCE_ELIGIBILITY_EVENT = 'mdf:geofence-eligibility';

// Last-broadcast verdict, cached at module scope. WHY: a few publish funnels are NOT React
// components subscribing to the event (e.g. the legacy address-form write in mylocation.js)
// and need a synchronous read of "are we currently eligible?" at submit time. They read
// peekGeofenceEligibility() — the SAME verdict App.js last broadcast — so enforcement is
// consistent with the UX gate without plumbing App's resolvers into every funnel. Seeds to
// `undefined` (never broadcast = treat as eligible, the dark-ship default a consumer applies).
let _lastEligibility;

// Dispatches the geofence-eligibility event after App.js resolves the binding country, and
// records it for synchronous peek(). EXPORTED for App.js to call once the GPS/IP resolvers
// settle; the event-name constant stays the SOT here. Defensive feature detection —
// SSR/static-export (no document) and legacy webviews without the CustomEvent constructor
// still update the cache and then no-op the dispatch, so a missing signal degrades to "no
// broadcast" rather than throwing.
export const dispatchGeofenceEligibility = ({ eligible, country, status } = {}) => {
    _lastEligibility = { eligible, country, status };
    if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
    try {
        document.dispatchEvent(new CustomEvent(GEOFENCE_ELIGIBILITY_EVENT, {
            detail: { eligible, country, status, ts: Date.now() },
        }));
    } catch (_e) { /* IE/legacy webview without CustomEvent constructor */ }
};

// Synchronous read of the last-broadcast verdict (or undefined if none yet). For non-React
// publish funnels that must enforce eligibility at submit time. Undefined = never broadcast
// (geofence flag OFF, or signals not settled) — callers treat that as the dark-ship default
// (eligible) so the OFF path stays byte-identical to today.
export const peekGeofenceEligibility = () => _lastEligibility;
