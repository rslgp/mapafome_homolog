// mapComponents.js
// React components and Leaflet config that build on top of mapUtils.js and mapConstants.js.
//
// Module boundaries:
//   mapConstants.js  → ICONS (uppercase), ROASTER_TYPES, FILTER_TYPES, MAP_CONFIG,
//                       BRAZIL_BOUNDS, CLUSTER_THRESHOLDS, TILE_LAYERS
//   mapUtils.js      → pure functions: cluster factories, formatPhoneNumber,
//                       calculateRating, formatRelativeTime, createDirectionUrl,
//                       shouldApplyFilter, isWithinTimeThreshold, isMobileDevice
//   SearchField.jsx  → own component (useMemo provider + searchControl)
//   MarkerGroup.jsx  → own component (cluster + popup rendering)
//
// This file owns:
//   ROASTER_CONFIGS  → data-driven marker type registry (icon + clusterFn + getMessage)
//   FILTER_CONFIGS   → UI filter → roaster type mapping
//   TileLayersControl → declarative LayersControl with all 3 tile layers from V1
//   MapClickHandler  → encapsulated map click via useMap() (was anonymous arrow in both V1/V2)

import React, { useEffect } from 'react';
import { TileLayer, LayersControl, useMap } from 'react-leaflet';
import {
    ICONS,
    ROASTER_TYPES,
    FILTER_TYPES,
    MAP_CONFIG,
} from './mapConstants';
import {
    markerClusterOptionsPrecisando,
    markerClusterOptionsAnjos,
    markerClusterOptionsEntrega,
} from './mapUtils';
import {
    trackMapTap,
    trackMapLongPress,
    trackMapTapSkipped,
} from './ux/analytics';

// ─── Marker type registry ─────────────────────────────────────────────────────
// ICONS uses uppercase keys from mapConstants (ICONS.HUB, ICONS.GREEN, etc.)
// clusterFn references imported from mapUtils.
// getMessage receives the full dataItem for flexibility.

export const ROASTER_CONFIGS = {
    [ROASTER_TYPES.DOADOR]: {
        icon: ICONS.HUB,
        clusterFn: markerClusterOptionsAnjos,
        removeOutsideVisibleBounds: false,
        getMessage: (d) => `Recebendo alimento para distribuir${d.URL ?? ''}`,
    },
    [ROASTER_TYPES.PRECISANDO_BUSCAR]: {
        icon: ICONS.GREEN,
        clusterFn: markerClusterOptionsAnjos,
        getMessage: (d) => `Precisando de pessoas para buscar ${d.DiaSemana} pela ${d.Horario} ${d.Mes ?? ''}`,
    },
    [ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO]: {
        icon: ICONS.RED,
        clusterFn: markerClusterOptionsEntrega,
        removeOutsideVisibleBounds: false,
        getMessage: (d) => `Entregando refeições prontas ${d.DiaSemana} pela ${d.Horario} ${d.Mes ?? ''}`,
    },
    [ROASTER_TYPES.ALIMENTO_PRONTO]: {
        icon: ICONS.COFFEE_BEAN,
        clusterFn: markerClusterOptionsPrecisando,
        getMessage: (d) => `Precisando de ${d.Roaster}${d.URL ?? ''}`,
    },
    [ROASTER_TYPES.CESTA_BASICA]: {
        icon: ICONS.COFFEE_BEAN,
        clusterFn: markerClusterOptionsPrecisando,
        getMessage: (d) => `Precisando de ${d.Roaster}${d.URL ?? ''}`,
    },
};

// ─── Filter registry ──────────────────────────────────────────────────────────
// Maps each FILTER_TYPES key to the roaster types it should render.

export const FILTER_CONFIGS = {
    [FILTER_TYPES.TODOS]:           [ROASTER_TYPES.DOADOR, ROASTER_TYPES.PRECISANDO_BUSCAR, ROASTER_TYPES.ALIMENTO_PRONTO, ROASTER_TYPES.CESTA_BASICA, ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO],
    [FILTER_TYPES.CESTA_BASICA]:    [ROASTER_TYPES.CESTA_BASICA],
    [FILTER_TYPES.MORADOR_RUA]:     [ROASTER_TYPES.ALIMENTO_PRONTO],
    [FILTER_TYPES.DOADORES]:        [ROASTER_TYPES.DOADOR, ROASTER_TYPES.PRECISANDO_BUSCAR, ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO],
    [FILTER_TYPES.REFEICAO_PRONTA]: [ROASTER_TYPES.PRECISANDO_BUSCAR, ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO],
};

// ─── TileLayersControl ────────────────────────────────────────────────────────
// V1 had LayersControl with 3 tile layers; V2 had a single hardcoded TileLayer.
// V1's LayersControl is kept: users can switch between Waze, OSM, and Satellite.

const TILE_LAYER_DEFS = [
    {
        name: 'Waze',
        checked: true,
        url: 'https://worldtiles1.waze.com/tiles/{z}/{x}/{y}.png',
        attribution: " &copy; <a href='https://www.waze.com/pt-BR/live-map' target='_blank' rel='noreferrer'>Waze</a>",
    },
    {
        name: 'Mapa',
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: " &copy; <a href='http://openstreetmap.org' target='_blank' rel='noreferrer'>OSM</a>",
    },
    {
        name: 'Satelite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: " &copy; <a href='https://www.arcgis.com/apps/mapviewer/index.html' target='_blank' rel='noreferrer'>Esri</a>",
    },
];

export const TileLayersControl = () => (
    <LayersControl style={{ opacity: '0.5' }} position="bottomleft">
        {TILE_LAYER_DEFS.map(({ name, checked, url, attribution }) => (
            <LayersControl.BaseLayer key={name} name={name} checked={!!checked}>
                <TileLayer
                    url={url}
                    attribution={attribution}
                    maxZoom={MAP_CONFIG.MAX_ZOOM}
                />
            </LayersControl.BaseLayer>
        ))}
    </LayersControl>
);

// ─── Tap pipeline — v5 refactor ───────────────────────────────────────────────
// Per LLM_BRAIN/v5_0_compact_software_engineer_principles.yaml:
//   • SRP / Extract Function — pure helpers lifted to module scope so they
//     are unit-testable in isolation
//   • Humble Object pattern — DOM/Leaflet binding stays in the hook; logic
//     is pure functions and a small encapsulated tracker
//   • Defensive programming at boundary — every event guarded for clientX/Y
//   • Replace Primitive with Object — TapTracker encapsulates 8 mutable
//     vars that were primitive obsession in earlier iterations
//
// Behavior identical to the previous in-hook implementation. Production
// path for map_click_compatibility.yaml § ios_safari_modern,
// android_samsung_a54, android_samsung_a23 + Leaflet click fallback that
// mirrors rslgp/mapafome's old whenReady → map.on('click') flow.

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
// pointerId is already released.
const safeCapturePointer = (target, pointerId) => {
    try { target.setPointerCapture?.(pointerId); } catch (_e) { /* unsupported */ }
};
const safeReleasePointer = (target, pointerId) => {
    try { target.releasePointerCapture?.(pointerId); } catch (_e) { /* not captured */ }
};

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

const dispatchMarkerPlaced = (lat, lng, source, pointerType) => {
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

// Public DOM event fired when the marker is cleared (TV-6 in
// tap_visibility_robustness.yaml — reset/undo affordance). Receivers
// (PinReadout, MainControls Confirmar ponto button) flip back to the
// "no marker" state.
export const MARKER_CLEARED_EVENT = 'mdf:marker-cleared';
// Counterpart REQUEST event — UI components dispatch this to ask the
// map owner (CoffeeMap) to clear the current marker. CoffeeMap listens
// and dispatches MARKER_CLEARED_EVENT when done.
export const MARKER_CLEAR_REQUEST_EVENT = 'mdf:marker-clear-request';

export const dispatchMarkerCleared = () => {
    if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
    try {
        document.dispatchEvent(new CustomEvent(MARKER_CLEARED_EVENT, {
            detail: { ts: Date.now() },
        }));
    } catch (_e) { /* legacy webview */ }
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

// ─── MapClickHandler ──────────────────────────────────────────────────────────
// Thin orchestration layer (Humble Object). Logic lives in pure helpers
// and the tracker above; the hook only binds DOM/Leaflet events.

export const MapClickHandler = ({ onMapClick, onMapLongPress }) => {
    const map = useMap();

    useEffect(() => {
        // Defensive: useMap can theoretically return null briefly under
        // React Strict Mode double-effect mounting, or when MapContainer
        // is still initializing. Bail without binding rather than crash.
        if (!map || typeof map.getContainer !== 'function') return undefined;
        const container = map.getContainer();
        if (!container) return undefined;
        const tracker = createTapTracker();
        // Resolved once at mount; matchMedia change listeners during a single
        // session are an over-engineering edge case (user does not switch
        // input modality mid-tap).
        const tapMaxDistancePx = resolveTapDistancePx();

        // Emits onMapClick + analytics if the resolved coords are finite.
        // Centralizes the boundary guard so every emit path is safe.
        // After the parent's onMapClick returns (which drops the marker
        // and sets envVariables.lastMarked), dispatch the public
        // mdf:marker-placed CustomEvent so any UI listener (e.g. the
        // "Confirmar ponto" button) can confirm the chain completed.
        //
        // F-2: gesture-token dedup at the boundary. Any caller that
        // routes through emitTap is guaranteed to fire at most once per
        // gesture, regardless of how many event paths (pointerup,
        // native click, contextmenu) reach this function.
        const emitTap = (lat, lng, pointerType, durationMs) => {
            if (tracker.isGestureAlreadyEmitted()) {
                trackMapTapSkipped({ reason: 'gesture_already_emitted', pointerType });
                return;
            }
            if (!isFiniteLatLng({ lat, lng })) {
                trackMapTapSkipped({ reason: 'non_finite_latlng', pointerType });
                return;
            }
            tracker.markTapFired();
            onMapClick(map, lat, lng);
            trackMapTap({ lat, lng, pointerType, durationMs });
            dispatchMarkerPlaced(lat, lng, 'tap', pointerType);
        };

        const emitLongPress = (lat, lng, source, pointerType) => {
            if (tracker.isGestureAlreadyEmitted()) {
                trackMapTapSkipped({ reason: 'gesture_already_emitted', pointerType });
                return;
            }
            if (!isFiniteLatLng({ lat, lng })) {
                trackMapTapSkipped({ reason: 'non_finite_latlng', pointerType });
                return;
            }
            tracker.markTapFired();
            onMapClick(map, lat, lng);
            onMapLongPress?.(map, lat, lng);
            trackMapLongPress({ lat, lng, source, pointerType });
            dispatchMarkerPlaced(lat, lng, source, pointerType);
        };

        const onPointerDown = (e) => {
            if (!hasClientCoords(e)) return;
            // Multitouch hardware: ignore secondary contacts (pinch-zoom's
            // second finger, palm rejection misfires). Without this, a
            // two-finger gesture could swap our tracked pointer mid-flight
            // and produce a tap at the wrong coordinates.
            if (!isPrimaryPointer(e)) {
                trackMapTapSkipped({ reason: 'non_primary_pointer', pointerType: e.pointerType });
                return;
            }
            if (!isMapBackground(e.target, container)) {
                trackMapTapSkipped({ reason: 'leaflet_interactive', pointerType: e.pointerType });
                return;
            }
            if (e.button !== undefined && e.button !== 0) {
                trackMapTapSkipped({ reason: 'non_primary_button', pointerType: e.pointerType });
                return;
            }
            tracker.recordPointerDown(e);
            // Pin events to the container — finger drags off the map element
            // (onto a sheet, control, edge) will still fire pointerup here.
            safeCapturePointer(container, e.pointerId);
            // Long-press for TOUCH/PEN only — desktop mouse uses contextmenu.
            if (e.pointerType === 'mouse') return;
            const { clientX: x, clientY: y, pointerType } = e;
            tracker.armLongPress(() => {
                const ll = clientToLatLng(map, container, x, y);
                if (!ll) {
                    trackMapTapSkipped({ reason: 'rect_collapsed', pointerType });
                    return;
                }
                emitLongPress(ll.lat, ll.lng, 'timer', pointerType);
            });
        };

        const onPointerMove = (e) => {
            const { state } = tracker;
            if (state.downId === null || e.pointerId !== state.downId) return;
            if (Math.abs(e.clientX - state.downX) > tapMaxDistancePx ||
                Math.abs(e.clientY - state.downY) > tapMaxDistancePx) {
                tracker.cancelLongPress();
            }
        };

        const onPointerUp = (e) => {
            tracker.cancelLongPress();
            safeReleasePointer(container, e.pointerId);
            const { state } = tracker;
            if (state.downId === null || e.pointerId !== state.downId) return;
            const dt = Date.now() - state.downT;
            const dx = Math.abs(e.clientX - state.downX);
            const dy = Math.abs(e.clientY - state.downY);
            const { downPointerType: pointerType, longPressFired } = state;
            tracker.clearGesture();
            if (longPressFired) return;
            if (dt > TAP_MAX_DURATION_MS) {
                trackMapTapSkipped({ reason: 'duration', pointerType });
                return;
            }
            if (dx > tapMaxDistancePx || dy > tapMaxDistancePx) {
                trackMapTapSkipped({ reason: 'movement', pointerType });
                return;
            }
            // Bidirectional dedup with handleLeafletClick. On some mobile
            // browsers the native click fires BEFORE pointerup (touchend
            // → click → pointerup). Without this, both paths call emitTap;
            // the second call removes the marker that the first just
            // placed and re-adds one. Note: F-2's gesture-token dedup
            // also catches this at emitTap level — kept here as an
            // earlier fast-path so we skip the projection math entirely.
            if (tracker.isGestureAlreadyEmitted() || tracker.isNativeClickDedupActive()) {
                trackMapTapSkipped({ reason: 'pointerup_dedup_after_click', pointerType });
                return;
            }
            const ll = clientToLatLng(map, container, e.clientX, e.clientY);
            if (!ll) {
                trackMapTapSkipped({ reason: 'rect_collapsed', pointerType });
                return;
            }
            emitTap(ll.lat, ll.lng, pointerType, dt);
        };

        const onPointerCancel = (e) => {
            if (e?.pointerId !== undefined) safeReleasePointer(container, e.pointerId);
            const { downPointerType: pointerType } = tracker.state;
            tracker.clearGesture();
            if (pointerType !== null) {
                trackMapTapSkipped({ reason: 'pointer_cancel', pointerType });
            }
        };

        // Leaflet native click — fallback for devices where PointerEvents
        // do not fire reliably but the native click does (Samsung A23 was
        // the canonical "click works, pointerup doesn't" case). Mirrors
        // rslgp/mapafome's old whenReady → map.on('click') flow.
        const handleLeafletClick = (e) => {
            if (tracker.isGestureAlreadyEmitted()) return;
            if (tracker.isNativeClickDedupActive()) return;
            if (tracker.isLongPressDedupActive()) return;
            const oe = e.originalEvent;
            if (oe && oe.target && !isMapBackground(oe.target, container)) return;
            const ll = hasClientCoords(oe)
                ? clientToLatLng(map, container, oe.clientX, oe.clientY)
                : e.latlng;
            if (!ll) {
                trackMapTapSkipped({ reason: 'rect_collapsed', pointerType: oe?.pointerType });
                return;
            }
            emitTap(ll.lat, ll.lng, oe?.pointerType || 'leaflet_click_fallback', 0);
        };

        // Desktop right-click + Android Chrome long-press contextmenu.
        const handleContextmenu = (e) => {
            if (tracker.isLongPressDedupActive()) {
                trackMapTapSkipped({ reason: 'contextmenu_dedup', pointerType: 'touch' });
                return;
            }
            if (e.originalEvent && e.originalEvent.preventDefault) {
                e.originalEvent.preventDefault();
            }
            const oe = e.originalEvent;
            const ll = hasClientCoords(oe)
                ? clientToLatLng(map, container, oe.clientX, oe.clientY)
                : e.latlng;
            if (!ll) {
                trackMapTapSkipped({ reason: 'rect_collapsed', pointerType: oe?.pointerType });
                return;
            }
            emitLongPress(ll.lat, ll.lng, 'contextmenu', oe?.pointerType || 'mouse');
        };

        // Stuck-pointer recovery: if the user backgrounds the tab or the
        // OS swallows pointerup (iOS notification, Android system gesture),
        // our state stays armed and the next tap could be lost. Clearing
        // on visibility change ensures we always return to a clean slate.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') tracker.clearGesture();
        };

        // lostpointercapture fires when the OS / browser reclaims pointer
        // focus (system gesture, screen pin, accessibility tool, browser
        // back-swipe). Without this, downId stays set and the next gesture
        // is lost. Mirrors pointercancel for completeness — capture loss
        // is a superset of cancel on some platforms.
        const handleLostPointerCapture = (e) => {
            const { state } = tracker;
            if (state.downId !== null && e.pointerId === state.downId) {
                tracker.clearGesture();
                trackMapTapSkipped({ reason: 'pointer_capture_lost', pointerType: state.downPointerType });
            }
        };

        // pointermove is `{ passive: true }` so the browser does not have
        // to wait for our handler before scrolling/zooming — this is a
        // ~16ms-per-frame win on touch devices and prevents iOS's input
        // jank when fingers move quickly. We never call preventDefault()
        // here, so passive is correct.
        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove, { passive: true });
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerCancel);
        container.addEventListener('lostpointercapture', handleLostPointerCapture);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        map.on('click', handleLeafletClick);
        map.on('contextmenu', handleContextmenu);

        return () => {
            tracker.clearGesture();
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerCancel);
            container.removeEventListener('lostpointercapture', handleLostPointerCapture);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            map.off('click', handleLeafletClick);
            map.off('contextmenu', handleContextmenu);
        };
    }, [map, onMapClick, onMapLongPress]);

    return null;
};

// ─── MapSizeInvalidator ───────────────────────────────────────────────────────
// iOS browser chrome (address bar) shows/hides as the user scrolls, changing
// the actual rendered height of the map container even though the vh value
// in the inline style stays constant. Leaflet caches the container size at
// init time; if the cache is stale, every containerPoint→latlng conversion
// (i.e. every tap) is off by a fixed Y offset.
//
// Fix: call map.invalidateSize() once on mount and again whenever the viewport
// resizes. iOS exposes window.visualViewport which fires 'resize' more
// reliably than window.resize when the chrome appears/disappears.

export const MapSizeInvalidator = () => {
    const map = useMap();

    useEffect(() => {
        map.invalidateSize({ animate: false });

        const onResize = () => map.invalidateSize({ animate: false });

        // visualViewport fires on iOS when the browser chrome shows/hides;
        // window resize fires on desktop and Android.
        const vv = typeof window !== 'undefined' && window.visualViewport;
        if (vv) {
            vv.addEventListener('resize', onResize);
        }
        window.addEventListener('resize', onResize);

        return () => {
            if (vv) vv.removeEventListener('resize', onResize);
            window.removeEventListener('resize', onResize);
        };
    }, [map]);

    return null;
};

// ─── MapViewUpdater ───────────────────────────────────────────────────────────
// MapContainer.center is only used on first render and is NOT reactive.
// This child component uses useMap() to imperatively pan the map whenever
// the `center` prop changes (i.e. when the device GPS position arrives).

export const MapViewUpdater = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        if (center && center.length === 2) {
            console.log('[map] MapViewUpdater setView:', center);
            map.setView(center);
        }
    }, [center, map]);

    return null;
};
