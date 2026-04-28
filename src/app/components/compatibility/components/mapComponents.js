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

// ─── MapClickHandler ──────────────────────────────────────────────────────────
// V1: anonymous function in whenReady mutating global.lastMarked.
// V2: anonymous arrow in whenReady storing to lastMarkedRef but still inline.
// Extracted here so useMap() is used correctly inside the component tree,
// and onMapClick is bound by the caller (CoffeeMap) to its own ref.

export const MapClickHandler = ({ onMapClick, onMapLongPress }) => {
    const map = useMap();

    useEffect(() => {
        // Tap detection from raw PointerEvents on the map container, NOT from
        // Leaflet's click event. Reason: Leaflet's click pipeline relies on
        // either L.Map.Tap (synthesizes click on iOS, but with clientX/Y
        // that drift to 0 on modern iOS Safari → "fixed" pin) or the
        // browser's native click (which fires reliably on Samsung A23 but
        // not on A54 / iPhone, where Leaflet's tap-detection-and-cancel
        // logic sometimes swallows the click). PointerEvents are unified
        // across mouse/touch/pen on every modern browser since 2018 and
        // give us reliable clientX/Y at down/up time.
        const container = map.getContainer();
        const TAP_MAX_DURATION_MS = 500;
        const TAP_MAX_DISTANCE_PX = 10;
        const LONG_PRESS_MS = 600;

        let downX = 0, downY = 0, downT = 0, downId = null, downPointerType = null;
        let longPressTimer = null;
        let longPressFired = false;
        // Timestamp of the most recent long-press timer fire. Used by the
        // contextmenu handler to suppress the duplicate Android-Chrome
        // long-press event (F8 in map_click_compatibility.yaml).
        let lastLongPressFiredAt = 0;
        const LONG_PRESS_DEDUP_MS = 1000;

        // Walk up the DOM to see if the target is the bare map background.
        // Leaflet attaches `.leaflet-interactive` to markers/clusters/
        // popups/controls — Leaflet's own pipeline handles those clicks,
        // and we must not double-fire.
        const isMapBackground = (el) => {
            let cur = el;
            while (cur && cur !== container) {
                if (cur.classList && cur.classList.contains('leaflet-interactive')) return false;
                cur = cur.parentNode;
            }
            return !!cur;
        };

        const toLatLng = (clientX, clientY) => {
            const rect = container.getBoundingClientRect();
            return map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
        };

        const cancelLongPress = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const onPointerDown = (e) => {
            if (!isMapBackground(e.target)) {
                trackMapTapSkipped({ reason: 'leaflet_interactive', pointerType: e.pointerType });
                return;
            }
            // Non-primary buttons (right/middle mouse click) are owned by the
            // contextmenu path — don't track them here.
            if (e.button !== undefined && e.button !== 0) {
                trackMapTapSkipped({ reason: 'non_primary_button', pointerType: e.pointerType });
                return;
            }
            downX = e.clientX;
            downY = e.clientY;
            downT = Date.now();
            downId = e.pointerId;
            downPointerType = e.pointerType;
            longPressFired = false;
            cancelLongPress();
            // Long-press = ReportSheet shortcut for TOUCH/PEN only. On
            // desktop mouse, the equivalent is right-click (contextmenu),
            // so we don't arm the timer for pointerType === 'mouse'.
            // Without this filter, holding left-click for 600 ms on
            // desktop would silently open ReportSheet — surprising.
            if (e.pointerType === 'mouse') return;
            const startX = e.clientX, startY = e.clientY;
            const startPointerType = e.pointerType;
            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                longPressFired = true;
                lastLongPressFiredAt = Date.now();
                const ll = toLatLng(startX, startY);
                onMapClick(map, ll.lat, ll.lng);
                onMapLongPress?.(map, ll.lat, ll.lng);
                trackMapLongPress({ lat: ll.lat, lng: ll.lng, source: 'timer', pointerType: startPointerType });
            }, LONG_PRESS_MS);
        };

        const onPointerMove = (e) => {
            if (downId === null || e.pointerId !== downId) return;
            if (Math.abs(e.clientX - downX) > TAP_MAX_DISTANCE_PX ||
                Math.abs(e.clientY - downY) > TAP_MAX_DISTANCE_PX) {
                cancelLongPress();
            }
        };

        const onPointerUp = (e) => {
            cancelLongPress();
            if (downId === null || e.pointerId !== downId) return;
            const dt = Date.now() - downT;
            const dx = Math.abs(e.clientX - downX);
            const dy = Math.abs(e.clientY - downY);
            const wasLongPress = longPressFired;
            const pointerType = downPointerType;
            downId = null;
            longPressFired = false;
            if (wasLongPress) return; // already handled by the timer
            if (dt > TAP_MAX_DURATION_MS) {
                trackMapTapSkipped({ reason: 'duration', pointerType });
                return;
            }
            if (dx > TAP_MAX_DISTANCE_PX || dy > TAP_MAX_DISTANCE_PX) {
                trackMapTapSkipped({ reason: 'movement', pointerType });
                return;
            }
            const ll = toLatLng(e.clientX, e.clientY);
            onMapClick(map, ll.lat, ll.lng);
            trackMapTap({ lat: ll.lat, lng: ll.lng, pointerType, durationMs: dt });
        };

        const onPointerCancel = () => {
            cancelLongPress();
            const pointerType = downPointerType;
            downId = null;
            longPressFired = false;
            if (pointerType !== null) {
                trackMapTapSkipped({ reason: 'pointer_cancel', pointerType });
            }
        };

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerCancel);

        // Desktop right-click still goes through Leaflet's contextmenu event.
        // Android Chrome ALSO fires contextmenu on long-press (which our
        // 600 ms PointerEvent timer already handled) — suppress those to
        // avoid F8 (double ReportSheet open).
        const handleContextmenu = (e) => {
            if (Date.now() - lastLongPressFiredAt < LONG_PRESS_DEDUP_MS) {
                trackMapTapSkipped({ reason: 'contextmenu_dedup', pointerType: 'touch' });
                return;
            }
            if (e.originalEvent && e.originalEvent.preventDefault) {
                e.originalEvent.preventDefault();
            }
            const oe = e.originalEvent;
            const ll = (oe && typeof oe.clientX === 'number')
                ? toLatLng(oe.clientX, oe.clientY)
                : e.latlng;
            onMapClick(map, ll.lat, ll.lng);
            onMapLongPress?.(map, ll.lat, ll.lng);
            trackMapLongPress({ lat: ll.lat, lng: ll.lng, source: 'contextmenu', pointerType: oe?.pointerType || 'mouse' });
        };
        map.on('contextmenu', handleContextmenu);

        return () => {
            cancelLongPress();
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerCancel);
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
