// CoffeeMap.jsx - VERSION MERGED FINAL (functional)
//
// Merge decisions:
//   Component style  → functional (V2): useState/useEffect/useCallback/useRef
//   Tile layers      → V1 LayersControl with 3 options (V2 had only single hardcoded Waze)
//   SearchField      → own component with useMemo provider/searchControl (new)
//   MarkerGroup      → own component from V2 (replaces 5 render* class methods)
//   MapClickHandler  → own component from mapComponents.js (replaces whenReady inline arrow)
//   lastMarked       → useRef (V2 ref pattern) instead of global.lastMarked (V1)
//   Icons            → ICONS uppercase from mapConstants (V2 convention)
//   ROASTER_TYPES    → enum from mapConstants (no more magic strings)
//   PropTypes        → V2 full declarations
//   addGroup helper  → V2 pattern, cleaner than renderSwitch class methods
//   RedeSocial msg   → inline formatter in addGroup (V2 pattern)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, Marker, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import PropTypes from 'prop-types';

import SearchField from './SearchField';
import MarkerGroup from './MarkerGroup';
import ReporterMarkers from './ReporterMarkers';
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
    isMobileDevice,
    isWithinTimeThreshold,
} from './mapUtils';
import {
    TileLayersControl,
    MapClickHandler,
    MapSizeInvalidator,
    MapViewUpdater,
    MARKER_CLEAR_REQUEST_EVENT,
    dispatchMarkerCleared,
} from './mapComponents';
import envVariables from './variaveisAmbiente';

// ─── Message formatters ───────────────────────────────────────────────────────
// Defined outside the component: pure functions, no dependency on props/state,
// no need to recreate on every render.

const MSG = {
    doador:               (_, { URL })                        => `Recebendo alimento para distribuir${URL}`,
    precisandoBuscar:     (_, { DiaSemana, Horario, Mes })    => `Precisando de pessoas para buscar ${DiaSemana} pela ${Horario} ${Mes}`,
    entregaAlimentoPronto:(_, { DiaSemana, Horario, Mes })    => `Entregando refeições prontas ${DiaSemana} pela ${Horario} ${Mes}`,
    alimentoPronto:       (d, { URL })                        => `Precisando de ${d.Roaster}${URL}`,
    cestaBasica:          (d, { URL })                        => `Precisando de ${d.Roaster}${URL}`,
    redeSocial:           (d, { DiaSemana, Horario, Mes, URL }) => {
        if (d.Roaster === ROASTER_TYPES.DOADOR)                return `Recebendo alimento para distribuir${URL}`;
        if (d.Roaster === ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO) return `Entregando refeições prontas ${DiaSemana} pela ${Horario} ${Mes}`;
        return '';
    },
};

// ─── CoffeeMap ────────────────────────────────────────────────────────────────

const CoffeeMap = ({
    location,
    filtro,
    telefoneFilterActive,
    ultimoAnoFilterActive,
    dataMapsProp,
    clicouTelefone,
    contabilizarClicado,
    avaliar,
    verificarPonto,
    removerPonto,
    entregarAlimento,
    onPinDropped,
    pingCoords,
    onReporterPinClick,
    nowTick,
}) => {
    const [center, setCenter]   = useState(location);
    const [filter, setFilter]   = useState(filtro);
    const lastMarkedRef          = useRef(null);
    const mapRef                 = useRef(null);

    useEffect(() => { if (filtro !== filter) setFilter(filtro); }, [filtro]);
    useEffect(() => { setCenter(location); }, [location]);

    // Encapsulated map click: was anonymous arrow in whenReady in both V1 and V2.
    // V2 stored to lastMarkedRef but still inline; now a proper named callback
    // delegated to MapClickHandler so useMap() hook works correctly.
    const handleMapClick = useCallback((map, lat, lng) => {
        if (lastMarkedRef.current) lastMarkedRef.current.remove();
        const marker = L.marker([lat, lng], {
            icon: ICONS.CURRENT_LOCATION_SMALL,
            draggable: false,
        }).addTo(map);

        // M1 drop-in animation — scale 0→1.1→1.0 over 240ms ease-out-back.
        // Apply the class after Leaflet has attached _icon to the DOM.
        if (marker._icon) marker._icon.classList.add('mdf-dropped-pin');

        // TV-1 (tap_visibility_robustness.yaml): pulse halo on every tap.
        // Reuses the .mdf-ping-ring CSS that fires after a publish — scale
        // 0.4→3, opacity 1→0 over 600ms. The expanding ring stays visible
        // past the user's finger so they can SEE the marker landed at the
        // correct spot even on small phones where the 20px pin is occluded.
        const pulse = L.marker([lat, lng], {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
                className: 'mdf-ping-ring',
                html: '<span></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
        }).addTo(map);
        setTimeout(() => pulse.remove(), 700);

        lastMarkedRef.current = marker;
        mapRef.current = map;

        // Backward compatibility: envVariables.lastMarked used by parent components
        envVariables.lastMarked = marker;
    }, []);

    // M1 long-press / right-click → drop the pin AND surface the report sheet.
    const handleMapLongPress = useCallback((_map, lat, lng) => {
        onPinDropped?.([lat, lng]);
    }, [onPinDropped]);

    // TV-6 (tap_visibility_robustness.yaml): listen for clear-request
    // events from UI components (e.g., PinReadout reset button) and
    // remove the current marker. Owning this here keeps the marker
    // lifecycle in one place — the CoffeeMap component that created it.
    useEffect(() => {
        const handleClearRequest = () => {
            if (lastMarkedRef.current) {
                lastMarkedRef.current.remove();
                lastMarkedRef.current = null;
            }
            envVariables.lastMarked = undefined;
            dispatchMarkerCleared();
        };
        document.addEventListener(MARKER_CLEAR_REQUEST_EVENT, handleClearRequest);
        return () => document.removeEventListener(MARKER_CLEAR_REQUEST_EVENT, handleClearRequest);
    }, []);

    // M1 post-publish ping-ring. Parent bumps `pingCoords`; we drop a one-shot
    // marker with a CSS ring animation and recenter the map onto it.
    useEffect(() => {
        if (!pingCoords || pingCoords.length !== 2) return;
        const map = mapRef.current;
        if (!map) return;
        map.setView(pingCoords, Math.max(map.getZoom(), MAP_CONFIG.DEFAULT_ZOOM_MOBILE));

        const ring = L.marker(pingCoords, {
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
                className: 'mdf-ping-ring',
                html: '<span></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            }),
        }).addTo(map);

        const timer = setTimeout(() => ring.remove(), 700);
        return () => {
            clearTimeout(timer);
            ring.remove();
        };
    }, [pingCoords]);

    // Shared props for every MarkerGroup to avoid repetition
    const groupHandlers = {
        onContabilizarClicado: contabilizarClicado,
        onAvaliar:             avaliar,
        onVerificarPonto:      verificarPonto,
        onRemoverPonto:        removerPonto,
        onEntregarAlimento:    entregarAlimento,
        onClicouTelefone:      clicouTelefone,
    };

    // ── Marker group builder ──────────────────────────────────────────────────
    // addGroup returns a <MarkerGroup /> or null if the filtered set is empty.
    // Keeps the render block declarative without repeating MarkerGroup boilerplate.

    // Filter state must participate in the cluster key: MarkerClusterGroup
    // caches its internal layer tree and does not re-evaluate children when
    // only a module-scoped flag (envVariables.telefoneFilter / ultimoAnoFilter)
    // changes. Rekeying on the active filter flags forces a clean remount so
    // the filter predicate in MarkerGroup actually takes effect.
    const filterSig = `t${telefoneFilterActive ? 1 : 0}a${ultimoAnoFilterActive ? 1 : 0}`;

    const addGroup = (key, filterFn, icon, clusterFn, msgFormatter, removeOutside = false) => {
        const filtered = dataMapsProp.filter(filterFn);
        if (filtered.length === 0) return null;

        const fullKey = `${key}-${filterSig}`;
        return (
            <MarkerGroup
                key={fullKey}
                componentKey={fullKey}
                dataItems={filtered}
                icon={icon}
                clusterIconFunction={clusterFn}
                messageFormatter={msgFormatter}
                removeOutsideVisibleBounds={removeOutside}
                {...groupHandlers}
            />
        );
    };

    // ── Marker groups per filter ──────────────────────────────────────────────

    const renderMarkerGroups = () => {
        const groups = [];

        switch (filter) {

            case FILTER_TYPES.TODOS:
                groups.push(addGroup('doadores-azul',    x => x.Roaster === ROASTER_TYPES.DOADOR,                 ICONS.HUB,         markerClusterOptionsAnjos,     MSG.doador,               true));
                groups.push(addGroup('doadores-verde',   x => x.Roaster === ROASTER_TYPES.PRECISANDO_BUSCAR,      ICONS.GREEN,       markerClusterOptionsAnjos,     MSG.precisandoBuscar));
                groups.push(addGroup('necessitados',     x => x.Roaster === ROASTER_TYPES.ALIMENTO_PRONTO,        ICONS.COFFEE_BEAN, markerClusterOptionsPrecisando, MSG.alimentoPronto));
                groups.push(addGroup('cesta-basica',     x => x.Roaster === ROASTER_TYPES.CESTA_BASICA,           ICONS.COFFEE_BEAN, markerClusterOptionsPrecisando, MSG.cestaBasica));
                groups.push(addGroup('doadores-vermelho',x => x.Roaster === ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO,ICONS.RED,         markerClusterOptionsEntrega,   MSG.entregaAlimentoPronto, true));
                break;

            case FILTER_TYPES.CESTA_BASICA:
                groups.push(addGroup('cesta-basica', x => x.Roaster === ROASTER_TYPES.CESTA_BASICA, ICONS.COFFEE_BEAN, markerClusterOptionsPrecisando, MSG.cestaBasica));
                break;

            case FILTER_TYPES.MORADOR_RUA:
                groups.push(addGroup('necessitados', x => x.Roaster === ROASTER_TYPES.ALIMENTO_PRONTO, ICONS.COFFEE_BEAN, markerClusterOptionsPrecisando, MSG.alimentoPronto));
                break;

            case FILTER_TYPES.DOADORES:
                groups.push(addGroup('doadores-azul',    x => x.Roaster === ROASTER_TYPES.DOADOR,                 ICONS.HUB,   markerClusterOptionsAnjos,   MSG.doador,               true));
                groups.push(addGroup('doadores-verde',   x => x.Roaster === ROASTER_TYPES.PRECISANDO_BUSCAR,      ICONS.GREEN, markerClusterOptionsAnjos,   MSG.precisandoBuscar));
                groups.push(addGroup('doadores-vermelho',x => x.Roaster === ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO,ICONS.RED,   markerClusterOptionsEntrega, MSG.entregaAlimentoPronto, true));
                break;

            case FILTER_TYPES.REFEICAO_PRONTA:
                groups.push(addGroup('doadores-verde',   x => x.Roaster === ROASTER_TYPES.PRECISANDO_BUSCAR,      ICONS.GREEN, markerClusterOptionsAnjos,   MSG.precisandoBuscar));
                groups.push(addGroup('doadores-vermelho',x => x.Roaster === ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO,ICONS.RED,   markerClusterOptionsEntrega, MSG.entregaAlimentoPronto, true));
                break;

            case FILTER_TYPES.REDE_SOCIAL:
                // Cross-roaster: filters on RedeSocial presence, icon resolved per item inside MarkerGroup
                groups.push(addGroup('rede-social', x => x.RedeSocial, ICONS.HUB, markerClusterOptionsAnjos, MSG.redeSocial));
                break;

            case FILTER_TYPES.VERIFICADOS:
                groups.push(addGroup('verificados', x => x.RedeSocial && x.verificado === 1, ICONS.HUB, markerClusterOptionsAnjos, MSG.redeSocial));
                break;

            case FILTER_TYPES.NENHUM:
            default:
                break;
        }

        // Test markers: always rendered regardless of filter, age-gated by isWithinTimeThreshold
        const testMarkers = dataMapsProp.filter(
            x => x.Roaster === ROASTER_TYPES.TESTE && isWithinTimeThreshold(x.DateISO, MAP_CONFIG.TEST_MARKER_MAX_HOURS)
        );
        if (testMarkers.length > 0) {
            const testesKey = `testes-${filterSig}`;
            groups.push(
                <MarkerGroup
                    key={testesKey}
                    componentKey={testesKey}
                    dataItems={testMarkers}
                    icon={ICONS.TEST}
                    clusterIconFunction={markerClusterOptionsPrecisando}
                    messageFormatter={() => ''}
                    {...groupHandlers}
                />
            );
        }

        return groups;
    };

    const screensizeZoom = isMobileDevice()
        ? MAP_CONFIG.DEFAULT_ZOOM_MOBILE
        : MAP_CONFIG.DEFAULT_ZOOM_DESKTOP;

    return (
        <div>
            <MapContainer
                style={{ height: MAP_CONFIG.MAP_HEIGHT, width: MAP_CONFIG.MAP_WIDTH }}
                zoom={screensizeZoom}
                maxZoom={MAP_CONFIG.MAX_ZOOM}
                center={center}
                attributionControl={false}
                preferCanvas={true}
                tap={true}
                tapTolerance={15}
            >
                {/* V1 LayersControl with 3 tile options (Waze/OSM/Satellite) */}
                <TileLayersControl />

                <SearchField />

                {/* Pans map when GPS location arrives — MapContainer.center is not reactive */}
                <MapViewUpdater center={center} />

                {/* Keeps Leaflet's container-size cache in sync with iOS viewport shifts
                    (address bar appearing/disappearing changes actual map height) so that
                    containerPoint→latlng conversion stays accurate on every tap. */}
                <MapSizeInvalidator />

                {/* Encapsulated click handler: was inline whenReady arrow in V1 and V2 */}
                <MapClickHandler onMapClick={handleMapClick} onMapLongPress={handleMapLongPress} />

                <AttributionControl position="bottomleft" prefix={false} />

                <Marker
                    icon={ICONS.CURRENT_LOCATION}
                    position={center}
                    interactive={false}
                />

                {renderMarkerGroups()}

                {/* M2 — reporter pins with urgency-age encoding */}
                <ReporterMarkers
                    dataMaps={dataMapsProp}
                    onPinClick={onReporterPinClick}
                    nowTick={nowTick}
                />
            </MapContainer>
        </div>
    );
};

CoffeeMap.propTypes = {
    location:              PropTypes.arrayOf(PropTypes.number).isRequired,
    filtro:                PropTypes.string.isRequired,
    dataMapsProp:          PropTypes.arrayOf(PropTypes.object).isRequired,
    clicouTelefone:        PropTypes.func.isRequired,
    contabilizarClicado:   PropTypes.func.isRequired,
    avaliar:               PropTypes.func.isRequired,
    verificarPonto:        PropTypes.func.isRequired,
    removerPonto:          PropTypes.func.isRequired,
    entregarAlimento:      PropTypes.func.isRequired,
    onPinDropped:          PropTypes.func,
    pingCoords:            PropTypes.arrayOf(PropTypes.number),
    onReporterPinClick:    PropTypes.func,
    nowTick:               PropTypes.number,
};

export default CoffeeMap;