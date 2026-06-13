// mapComponents.js
// React components + Leaflet glue that build on top of mapUtils.js and mapConstants.js.
//
// ─── STRUCTURE (SRP split) ────────────────────────────────────────────────────
// The pure/data layers were extracted into siblings; this file is now the thin
// React-component layer plus a BARREL that re-exports the moved symbols, so every
// `import { X } from './mapComponents'` (app + tests) keeps working unchanged:
//   tapRecognition.js → pure tap/long-press logic, the TapTracker state machine,
//                        the timing/distance constants, and the pointer-capture
//                        helpers (no React, no Leaflet).
//   markerEvents.js   → the document-level marker CustomEvent contract (event-name
//                        constants + place/clear dispatchers).
//   mapRegistries.js  → static ROASTER_CONFIGS / FILTER_CONFIGS data registries.
//
// This file OWNS the React components:
//   TileLayersControl → declarative LayersControl with all 3 tile layers
//   MapClickHandler   → encapsulated tap pipeline via useMap() (Humble Object)
//   MapSizeInvalidator→ invalidateSize on mount + viewport resize
//   MapViewUpdater    → imperative panning when the `center` prop changes

import React, { useEffect } from 'react';
import { TileLayer, LayersControl, useMap } from 'react-leaflet';
import { MAP_CONFIG } from './mapConstants';
import {
    trackMapTap,
    trackMapLongPress,
    trackMapTapSkipped,
} from './ux/analytics';
import {
    TAP_MAX_DURATION_MS,
    resolveTapDistancePx,
    isMapBackground,
    clientToLatLng,
    hasClientCoords,
    isPrimaryPointer,
    isFiniteLatLng,
    safeCapturePointer,
    safeReleasePointer,
    createTapTracker,
} from './tapRecognition';
import {
    MARKER_PLACED_EVENT,
    MARKER_CLEARED_EVENT,
    MARKER_CLEAR_REQUEST_EVENT,
    dispatchMarkerPlaced,
    dispatchMarkerCleared,
} from './markerEvents';
import { ROASTER_CONFIGS, FILTER_CONFIGS } from './mapRegistries';

// ─── BARREL — re-export the extracted symbols so the public surface is INTACT ──
// Named re-exports (not `export *`): every consumer that imports these from
// './mapComponents' (map.js, PetMap.js, PinReadout.js, MainControls.js,
// _debug/TapDebugOverlay.js, test/tapVisibility.test.js, test/mapClickHandler.test.js)
// keeps resolving them here, with zero call-site edits.
export {
    resolveTapDistancePx,
    isMapBackground,
    clientToLatLng,
    hasClientCoords,
    isPrimaryPointer,
    isFiniteLatLng,
    createTapTracker,
} from './tapRecognition';
export {
    MARKER_PLACED_EVENT,
    MARKER_CLEARED_EVENT,
    MARKER_CLEAR_REQUEST_EVENT,
    dispatchMarkerCleared,
} from './markerEvents';
export { ROASTER_CONFIGS, FILTER_CONFIGS } from './mapRegistries';

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

// ─── MapClickHandler ──────────────────────────────────────────────────────────
// Thin orchestration layer (Humble Object). The pure logic lives in
// tapRecognition.js (helpers + the TapTracker) and the event contract in
// markerEvents.js; this hook only binds DOM/Leaflet events.
//
// Behavior identical to the previous in-file implementation. Production path for
// map_click_compatibility.yaml § ios_safari_modern, android_samsung_a54,
// android_samsung_a23 + Leaflet click fallback that mirrors rslgp/mapafome's old
// whenReady → map.on('click') flow.

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
