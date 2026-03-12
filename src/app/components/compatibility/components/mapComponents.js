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

export const MapClickHandler = ({ onMapClick }) => {
    const map = useMap();

    useEffect(() => {
        const handleClick = (e) => onMapClick(map, e.latlng.lat, e.latlng.lng);
        map.on('click', handleClick);
        return () => map.off('click', handleClick);
    }, [map, onMapClick]);

    return null;
};
