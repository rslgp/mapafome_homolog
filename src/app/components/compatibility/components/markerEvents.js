// markerEvents.js — the cross-component marker CustomEvent contract.
//
// Extracted from mapComponents.js (SRP): the document-level event-name constants
// and the dispatch helpers (place / clear) are the DECOUPLED SIGNAL LAYER that
// PinReadout, MainControls, TapDebugOverlay and map.js depend on independently of
// the map components. No React, no Leaflet. mapComponents.js re-exports the public
// surface so every consumer keeps importing the event names from there, and the
// MapClickHandler hook imports dispatchMarkerPlaced from here.

// Public DOM event fired after a successful tap chain. Any UI component
// (e.g. the "Confirmar ponto" button) can listen on `document` without
// prop drilling and react — disable, highlight, hint, or clear errors.
// Decoupled signal: works across React boundaries, portals, and even
// non-React components. CustomEvent has been universal since IE 9.
//
// Receivers:
//   document.addEventListener('mdf:marker-placed', (e) => { e.detail.lat, e.detail.lng });
//
// This is the cross-device confirmation that the entire pipeline
// (touch → coord resolution → marker placement) completed successfully.
// Listeners can use it to confirm to the user that the tap was received,
// regardless of which input path (PointerEvent, Leaflet click, contextmenu)
// drove it.
export const MARKER_PLACED_EVENT = 'mdf:marker-placed';

// Public DOM event fired when the marker is cleared (TV-6 in
// tap_visibility_robustness.yaml — reset/undo affordance). Receivers
// (PinReadout, MainControls Confirmar ponto button) flip back to the
// "no marker" state.
export const MARKER_CLEARED_EVENT = 'mdf:marker-cleared';
// Counterpart REQUEST event — UI components dispatch this to ask the
// map owner (CoffeeMap) to clear the current marker. CoffeeMap listens
// and dispatches MARKER_CLEARED_EVENT when done.
export const MARKER_CLEAR_REQUEST_EVENT = 'mdf:marker-clear-request';

// Dispatches the marker-placed event after the tap pipeline completes, plus a
// short haptic pulse on touch/pen. EXPORTED for the MapClickHandler hook (in
// mapComponents.js) to call; the event-name constants stay the SOT here.
export const dispatchMarkerPlaced = (lat, lng, source, pointerType) => {
    if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
    try {
        document.dispatchEvent(new CustomEvent(MARKER_PLACED_EVENT, {
            detail: { lat, lng, source, pointerType, ts: Date.now() },
        }));
    } catch (_e) { /* IE/legacy webview without CustomEvent constructor */ }
    // TV-2 (tap_visibility_robustness.yaml): single 40 ms haptic pulse on
    // touch/pen taps. Cheapest cross-device confirmation that the system
    // registered the action. Gated to non-mouse pointers so a desktop
    // user with a Bluetooth-tethered phone doesn't get spam vibrations
    // on every mouse click. Defensive feature detection — iOS Safari
    // outside PWA mode + low-end devices without vibration motors are
    // silent no-ops.
    if (pointerType === 'mouse') return;
    if (typeof navigator === 'undefined') return;
    if (typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(40); } catch (_e) { /* permission denied or motor missing */ }
};

export const dispatchMarkerCleared = () => {
    if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
    try {
        document.dispatchEvent(new CustomEvent(MARKER_CLEARED_EVENT, {
            detail: { ts: Date.now() },
        }));
    } catch (_e) { /* legacy webview */ }
};
