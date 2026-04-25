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
        // iOS tap precision: works on Android, fails on iOS.
        //
        // Why iOS is different:
        // Android Chrome dispatches `click` with clientX/Y pointing to the
        // actual finger position. iOS Safari sometimes dispatches the
        // synthetic click with coordinates that have drifted — the page may
        // have scrolled between touchend and the deferred click, or the
        // synthetic click is anchored to the element center rather than the
        // touch point. Either way, e.originalEvent.clientX/Y on iOS is not
        // a reliable source of "where the user tapped".
        //
        // Fix: capture pointerdown/touchstart coords on the map container.
        // Those fire BEFORE any drift happens. When Leaflet's click event
        // arrives, prefer the captured coords if they're recent. Falls back
        // to e.originalEvent for non-touch (mouse) clicks where pointerdown
        // matches the click position anyway.
        const container = map.getContainer();
        let captured = null;
        const captureDown = (ev) => {
            const t = (ev.changedTouches && ev.changedTouches[0])
                || (ev.touches && ev.touches[0])
                || ev;
            if (t && Number.isFinite(t.clientX) && Number.isFinite(t.clientY)) {
                captured = { clientX: t.clientX, clientY: t.clientY, ts: Date.now() };
            }
        };
        container.addEventListener('pointerdown', captureDown, { passive: true });
        // Some older iOS Safari builds do not fire pointerdown reliably on
        // bare divs; touchstart is the universal fallback.
        container.addEventListener('touchstart', captureDown, { passive: true });

        const recomputeLatLng = (e) => {
            // Refresh Leaflet's container-size cache before any latlng math —
            // iOS chrome-collapse can leave it stale (changelog § ios_blue_pin_misplaced_fix).
            map.invalidateSize({ animate: false, pan: false });

            // Choose the most-trustworthy coords for THIS tap:
            // 1. Recently-captured pointerdown/touchstart (≤700ms ago) — the
            //    user's actual finger position, immune to iOS click drift.
            // 2. Otherwise the click's own originalEvent.
            // 3. Last resort, e.latlng as Leaflet computed it.
            const now = Date.now();
            let mouseLike = null;
            if (captured && now - captured.ts < 700) {
                mouseLike = { clientX: captured.clientX, clientY: captured.clientY };
            } else if (e.originalEvent) {
                const o = e.originalEvent;
                if (Number.isFinite(o.clientX) && Number.isFinite(o.clientY)) {
                    mouseLike = { clientX: o.clientX, clientY: o.clientY };
                } else if (o.changedTouches && o.changedTouches[0]) {
                    const t = o.changedTouches[0];
                    mouseLike = { clientX: t.clientX, clientY: t.clientY };
                }
            }
            captured = null;
            if (!mouseLike) return e.latlng;
            try {
                const point = map.mouseEventToContainerPoint(mouseLike);
                return map.containerPointToLatLng(point);
            } catch (_err) {
                return e.latlng;
            }
        };

        const handleClick = (e) => {
            const ll = recomputeLatLng(e);
            onMapClick(map, ll.lat, ll.lng);
        };
        const handleLongPress = (e) => {
            // contextmenu fires on desktop right-click and on mobile long-press.
            // Suppress the native menu so the app UI can take over.
            if (e.originalEvent && e.originalEvent.preventDefault) {
                e.originalEvent.preventDefault();
            }
            const ll = recomputeLatLng(e);
            onMapClick(map, ll.lat, ll.lng);
            onMapLongPress?.(map, ll.lat, ll.lng);
        };
        map.on('click', handleClick);
        map.on('contextmenu', handleLongPress);
        return () => {
            map.off('click', handleClick);
            map.off('contextmenu', handleLongPress);
            container.removeEventListener('pointerdown', captureDown);
            container.removeEventListener('touchstart', captureDown);
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
