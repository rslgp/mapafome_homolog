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
const TAP_MAX_DISTANCE_PX = 10;
const LONG_PRESS_MS = 600;
const LONG_PRESS_DEDUP_MS = 1000;
const NATIVE_CLICK_DEDUP_MS = 1000;

// Walks up the DOM checking for .leaflet-interactive (markers, clusters,
// popups, controls). Returns true only when the target is the bare map.
// F6 contract — see MarkerGroup.js header comment.
const isMapBackground = (el, container) => {
    let cur = el;
    while (cur && cur !== container) {
        if (cur.classList && cur.classList.contains('leaflet-interactive')) return false;
        cur = cur.parentNode;
    }
    return !!cur;
};

// Converts viewport coords to lat/lng using Leaflet's public API.
// Compensates for the container's bounding rect — same math Leaflet
// uses internally for its native click event.
const clientToLatLng = (map, container, clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    return map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
};

// Defensive guard at the event boundary (Code Complete ch.8 barricade).
// Some synthetic dispatches (older webviews, jsdom) lack clientX/Y.
const hasClientCoords = (e) => e
    && typeof e.clientX === 'number'
    && typeof e.clientY === 'number';

// Encapsulates the mutable state machine that drives tap recognition.
// Replaces 8 free `let` bindings — closes a primitive-obsession smell
// and gives every mutation a named entry point.
const createTapTracker = () => {
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
    };
};

// ─── MapClickHandler ──────────────────────────────────────────────────────────
// Thin orchestration layer (Humble Object). Logic lives in pure helpers
// and the tracker above; the hook only binds DOM/Leaflet events.

export const MapClickHandler = ({ onMapClick, onMapLongPress }) => {
    const map = useMap();

    useEffect(() => {
        const container = map.getContainer();
        const tracker = createTapTracker();

        const onPointerDown = (e) => {
            if (!hasClientCoords(e)) return;
            if (!isMapBackground(e.target, container)) {
                trackMapTapSkipped({ reason: 'leaflet_interactive', pointerType: e.pointerType });
                return;
            }
            if (e.button !== undefined && e.button !== 0) {
                trackMapTapSkipped({ reason: 'non_primary_button', pointerType: e.pointerType });
                return;
            }
            tracker.recordPointerDown(e);
            // Long-press for TOUCH/PEN only — desktop mouse uses contextmenu.
            if (e.pointerType === 'mouse') return;
            const { clientX: x, clientY: y, pointerType } = e;
            tracker.armLongPress(() => {
                const ll = clientToLatLng(map, container, x, y);
                onMapClick(map, ll.lat, ll.lng);
                onMapLongPress?.(map, ll.lat, ll.lng);
                trackMapLongPress({ lat: ll.lat, lng: ll.lng, source: 'timer', pointerType });
            });
        };

        const onPointerMove = (e) => {
            const { state } = tracker;
            if (state.downId === null || e.pointerId !== state.downId) return;
            if (Math.abs(e.clientX - state.downX) > TAP_MAX_DISTANCE_PX ||
                Math.abs(e.clientY - state.downY) > TAP_MAX_DISTANCE_PX) {
                tracker.cancelLongPress();
            }
        };

        const onPointerUp = (e) => {
            tracker.cancelLongPress();
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
            if (dx > TAP_MAX_DISTANCE_PX || dy > TAP_MAX_DISTANCE_PX) {
                trackMapTapSkipped({ reason: 'movement', pointerType });
                return;
            }
            const ll = clientToLatLng(map, container, e.clientX, e.clientY);
            onMapClick(map, ll.lat, ll.lng);
            tracker.markTapFired();
            trackMapTap({ lat: ll.lat, lng: ll.lng, pointerType, durationMs: dt });
        };

        const onPointerCancel = () => {
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
            if (tracker.isNativeClickDedupActive()) return;
            if (tracker.isLongPressDedupActive()) return;
            const oe = e.originalEvent;
            if (oe && oe.target && !isMapBackground(oe.target, container)) return;
            const ll = hasClientCoords(oe)
                ? clientToLatLng(map, container, oe.clientX, oe.clientY)
                : e.latlng;
            onMapClick(map, ll.lat, ll.lng);
            trackMapTap({
                lat: ll.lat,
                lng: ll.lng,
                pointerType: oe?.pointerType || 'leaflet_click_fallback',
                durationMs: 0,
            });
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
            onMapClick(map, ll.lat, ll.lng);
            onMapLongPress?.(map, ll.lat, ll.lng);
            trackMapLongPress({
                lat: ll.lat,
                lng: ll.lng,
                source: 'contextmenu',
                pointerType: oe?.pointerType || 'mouse',
            });
        };

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerCancel);
        map.on('click', handleLeafletClick);
        map.on('contextmenu', handleContextmenu);

        return () => {
            tracker.clearGesture();
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerCancel);
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
