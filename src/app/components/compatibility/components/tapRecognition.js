// tapRecognition.js — pure, framework-free tap/long-press recognition.
//
// Extracted from mapComponents.js (SRP): no React, no Leaflet component imports —
// just the tap timing/distance constants, the boundary guards, the coord
// projection helper, the pointer-capture wrappers, and the TapTracker state
// machine. This is the highest-risk, most-tested surface of the tap pipeline, and
// isolating it makes it unit-testable without mounting a map. mapComponents.js
// re-exports the public helpers (so test/tapVisibility.test.js keeps importing them
// from mapComponents) and MapClickHandler imports the constants + safeCapture
// helpers from here.
//
// Per LLM_BRAIN/v5_0_compact_software_engineer_principles.yaml:
//   • SRP / Extract Function — pure helpers at module scope, unit-testable
//   • Humble Object pattern — DOM/Leaflet binding stays in the hook (mapComponents)
//   • Defensive programming at boundary — every event guarded for clientX/Y
//   • Replace Primitive with Object — TapTracker encapsulates 8 mutable vars

const TAP_MAX_DURATION_MS = 500;
// Tap-vs-pan movement threshold. Tighter for fine pointers (mouse, trackpad)
// where accidental drift is rare; looser for coarse pointers (touchscreen)
// where finger pads cover several pixels and natural micro-tremor exceeds
// 10 px. Keeps 10 px fixed if matchMedia is unavailable (very old browsers).
const TAP_MAX_DISTANCE_FINE_PX = 10;
const TAP_MAX_DISTANCE_COARSE_PX = 14;
const LONG_PRESS_MS = 600;
const LONG_PRESS_DEDUP_MS = 1000;
const NATIVE_CLICK_DEDUP_MS = 1000;

// MapClickHandler (in mapComponents.js) reads TAP_MAX_DURATION_MS directly in its
// pointerup duration check, so it is exported alongside the helpers.
export { TAP_MAX_DURATION_MS };

// Coarse-pointer detection. `(pointer: coarse)` matches touchscreens and
// stylus-only devices; `(pointer: fine)` matches mouse/trackpad. Reliable
// since 2017 across all evergreen browsers. Falls back to fine threshold
// when matchMedia is missing (defensive).
export const resolveTapDistancePx = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return TAP_MAX_DISTANCE_FINE_PX;
    }
    try {
        return window.matchMedia('(pointer: coarse)').matches
            ? TAP_MAX_DISTANCE_COARSE_PX
            : TAP_MAX_DISTANCE_FINE_PX;
    } catch (_e) {
        return TAP_MAX_DISTANCE_FINE_PX;
    }
};

// Walks up the DOM ruling out clicks that landed on something interactive
// inside the map. Returns true only when the target is the bare map tile
// canvas (i.e. a real "tap on the map background" the user wants to mark).
//
// Three classes of ancestor disqualify a target:
//   • .leaflet-interactive — markers, shapes, polygons, popups (set by
//     L.Map.addInteractiveTarget). Click belongs to the marker's handler.
//   • .leaflet-control      — built-in controls (zoom, layers,
//     attribution) and add-ons like the geosearch widget. These do NOT
//     have .leaflet-interactive but are still children of the map
//     container. Capturing their pointer events steals input from the
//     control's button and visibly drops a marker behind it.
//   • .leaflet-popup        — popup body / tip. Belongs to the popup,
//     not the map. (Popup ancestors sometimes lack leaflet-interactive
//     on the wrapper element, even when the popup itself is interactive.)
//
// EXPORTED for unit testing (GOOS: listen-to-tests; pure logic stays
// addressable from outside the component).
const NON_BACKGROUND_CLASSES = ['leaflet-interactive', 'leaflet-control', 'leaflet-popup'];

export const isMapBackground = (el, container) => {
    let cur = el;
    while (cur && cur !== container) {
        if (cur.classList) {
            for (const cls of NON_BACKGROUND_CLASSES) {
                if (cur.classList.contains(cls)) return false;
            }
        }
        cur = cur.parentNode;
    }
    return !!cur;
};

// Converts viewport coords to lat/lng using Leaflet's public API.
// Compensates for the container's bounding rect — same math Leaflet
// uses internally for its native click event.
//
// F-5 (dropped_pin_invisible_mobile.yaml): guard against a collapsed
// container rect (width or height === 0). On iOS, a transient layout
// state can produce a 0-sized rect during orientation change or
// keyboard show/hide; projecting through it yields garbage coords that
// land the marker off-screen. Returns null in that case so the caller
// can skip the tap with a typed analytics reason.
export const clientToLatLng = (map, container, clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
};

// Defensive guard at the event boundary (Code Complete ch.8 barricade).
// Some synthetic dispatches (older webviews, jsdom) lack clientX/Y.
export const hasClientCoords = (e) => e
    && typeof e.clientX === 'number'
    && typeof e.clientY === 'number';

// Multitouch safety. PointerEvent.isPrimary is true for the first pointer
// of its type in an interaction. A second finger landing while the first
// is still held must NOT overwrite our tracker (otherwise pinch-zoom or
// two-finger scroll could swap our state mid-gesture and lose the tap).
// Defaults to true when the field is missing (older synthetic events).
export const isPrimaryPointer = (e) =>
    e == null || e.isPrimary === undefined || e.isPrimary === true;

// Final-mile defensive guard before we propagate coordinates into the
// marker placement and analytics. If invalidateSize fires mid-tap, or
// the CRS projection produces a degenerate result, we'd otherwise pass
// NaN/Infinity to L.marker — fail fast at the boundary instead.
export const isFiniteLatLng = (ll) =>
    !!ll && Number.isFinite(ll.lat) && Number.isFinite(ll.lng);

// Pointer capture wrapper. Pins the pointer to a single element so all
// subsequent move/up/cancel events fire there even when the finger drags
// off-map (over the report sheet, off the screen edge, onto a control).
// Without this, a finger that strays a few px during a tap on a small
// phone can cause pointerup to fire on a different element — and our
// listener never sees it, leaving state stuck. Try/catch because
// setPointerCapture throws on browsers that lack the API or when the
// pointerId is already released. EXPORTED for use by the hook in mapComponents.
export const safeCapturePointer = (target, pointerId) => {
    try { target.setPointerCapture?.(pointerId); } catch (_e) { /* unsupported */ }
};
export const safeReleasePointer = (target, pointerId) => {
    try { target.releasePointerCapture?.(pointerId); } catch (_e) { /* not captured */ }
};

// Encapsulates the mutable state machine that drives tap recognition.
// Replaces 8 free `let` bindings — closes a primitive-obsession smell
// and gives every mutation a named entry point.
// EXPORTED for unit testing — the state machine is the highest-risk
// surface and warrants direct coverage (Testing strategy § first_principles).
//
// F-2 (dropped_pin_invisible_mobile.yaml): gesture-token dedup.
// Replaces the timestamp-based dedup with a per-gesture id counter +
// "current gesture already emitted" flag. Bulletproof in any
// pointerdown→pointerup→click ordering and any speed (a rapid double
// tap produces two distinct gestureIds, so each gets its own emit).
// The legacy timestamp dedup remains for handleLeafletClick paths that
// fire WITHOUT a preceding pointerdown (the A23 case where pointer
// events are unreliable but the native click still arrives).
export const createTapTracker = () => {
    const state = {
        downX: 0,
        downY: 0,
        downT: 0,
        downId: null,
        downPointerType: null,
        longPressTimer: null,
        longPressFired: false,
        lastLongPressFiredAt: 0,
        lastTapFiredAt: 0,
        gestureId: 0,
        gestureEmitted: false,
    };
    const cancelLongPress = () => {
        if (state.longPressTimer) clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
    };
    return {
        state,
        cancelLongPress,
        recordPointerDown(e) {
            state.downX = e.clientX;
            state.downY = e.clientY;
            state.downT = Date.now();
            state.downId = e.pointerId;
            state.downPointerType = e.pointerType;
            state.longPressFired = false;
            state.gestureId += 1;
            state.gestureEmitted = false;
            cancelLongPress();
        },
        armLongPress(fire) {
            state.longPressTimer = setTimeout(() => {
                state.longPressTimer = null;
                state.longPressFired = true;
                state.lastLongPressFiredAt = Date.now();
                fire();
            }, LONG_PRESS_MS);
        },
        markTapFired() {
            state.lastTapFiredAt = Date.now();
            state.gestureEmitted = true;
        },
        clearGesture() {
            cancelLongPress();
            state.downId = null;
            state.longPressFired = false;
        },
        isLongPressDedupActive: () =>
            Date.now() - state.lastLongPressFiredAt < LONG_PRESS_DEDUP_MS,
        isNativeClickDedupActive: () =>
            Date.now() - state.lastTapFiredAt < NATIVE_CLICK_DEDUP_MS,
        // Sticky from emit until EITHER (a) a new pointerdown resets the
        // flag (next gesture starts), OR (b) the native-click dedup
        // window has elapsed (1000 ms — same horizon as the timestamp
        // dedup, so the two semantics agree). Without (b) the flag would
        // persist forever across no-pointerup gestures (timer long-press
        // followed by an Android contextmenu emulation 1100 ms later).
        isGestureAlreadyEmitted: () =>
            state.gestureEmitted === true &&
            Date.now() - state.lastTapFiredAt < NATIVE_CLICK_DEDUP_MS,
    };
};
