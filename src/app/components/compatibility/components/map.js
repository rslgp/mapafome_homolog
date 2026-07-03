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

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, Marker, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import PropTypes from 'prop-types';

import SearchField from './SearchField';
import CountryFlagControl from './CountryFlagControl';
import LanguageControl from './LanguageControl';
import { INTL_ENABLED } from './intlConfig';
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
// Pure Leaflet icon factories (dropped pin + ping ring). mapPinIcons runs
// L.divIcon at module scope and is SSR-safe ONLY via this import — map.js is
// mounted ssr:false — so mapPinIcons must be imported ONLY here. See its header.
import { DROPPED_PIN_DIV_ICON, makePingRingIcon } from './mapPinIcons';
import { MSG } from './mapMessages';
import envVariables from './variaveisAmbiente';
// Dev-only: red outline of the map's tap hitbox, opt-in via ?debug=hitbox.
// Renders null (and adds no class) in every normal session. See its header.
import MapHitboxOutline from './_debug/MapHitboxOutline';
// UX-M01: cooperative wheel — wheel scrolls the page until the map is
// clicked/focused (flagged via coopGesturesConfig; renders its own hint pill).
import CooperativeWheelZoom from './CooperativeWheelZoom';

// F-4 (dropped_pin_invisible_mobile.yaml): hoist the inline style out of
// the JSX so its identity is stable across renders. react-leaflet's
// MapContainer is initial-render-only for most props, but a fresh-
// identity style object on every render still costs reconciliation
// work — and a hypothetical react-leaflet upgrade that DID react to
// style changes would silently remount the map and wipe our
// imperatively-added L.markers (the dropped pin among them).
const MAP_CONTAINER_STYLE = { height: '70vh', width: '100%' };

// The pure Leaflet icon factories (DROPPED_PIN_DIV_ICON + makePingRingIcon) and
// the per-roaster MSG formatters were extracted to ./mapPinIcons and ./mapMessages
// (imported above) so icon/message edits stop colliding with this component.

// ─── CoffeeMap ────────────────────────────────────────────────────────────────

const CoffeeMap = ({
    location,
    filtro,
    telefoneFilterActive,
    periodId,
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
    // `center` and `filter` are pure mirrors of the `location` / `filtro` props
    // with no independent writers, so they are derived directly instead of being
    // copied into state via an effect (you-might-not-need-an-effect). This drops
    // the cascading set-state-in-effect plus its exhaustive-deps warning, and
    // the rendered values stay identical to the props on every render.
    const center = location;
    const filter = filtro;
    const lastMarkedRef          = useRef(null);
    const mapRef                 = useRef(null);

    // Encapsulated map click: was anonymous arrow in whenReady in both V1 and V2.
    // V2 stored to lastMarkedRef but still inline; now a proper named callback
    // delegated to MapClickHandler so useMap() hook works correctly.
    //
    // Mobile-robustness fixes (dropped_pin_invisible_mobile.yaml):
    //   F-2 idempotent: skip remove+re-add when the requested coords match
    //       the current marker's position within float epsilon. Prevents a
    //       second emitTap (if one slipped past the upstream dedup) from
    //       wiping the just-placed pin.
    //   F-8: pin pane explicitly to 'markerPane' so a pane-allocation
    //       glitch under preferCanvas can never park the marker behind tiles.
    //   F-9: re-apply .mdf-dropped-pin on the next animation frame in
    //       case Leaflet's _icon attachment is deferred on slow mobile devices.
    //   F-10: pulse goes to 'shadowPane' (z-index 500) instead of the
    //       default markerPane (600), so the pin is ALWAYS painted above
    //       the pulse — never visually occluded during the 600 ms animation.
    const handleMapClick = useCallback((map, lat, lng) => {
        // F-2 idempotent guard — same coords ⇒ no-op, keep existing marker
        if (lastMarkedRef.current) {
            const cur = lastMarkedRef.current.getLatLng();
            if (Math.abs(cur.lat - lat) < 1e-9 && Math.abs(cur.lng - lng) < 1e-9) {
                envVariables.lastMarked = lastMarkedRef.current;
                return;
            }
            lastMarkedRef.current.remove();
        }

        // F-12: divIcon path. The .mdf-dropped-pin class is supplied by
        // the divIcon's className — no post-creation classList.add needed
        // (the previous F-9 RAF retry workaround for L.Icon timing is
        // structurally unnecessary on this path). The visible dot is
        // rendered by CSS on the inner <span>.
        const marker = L.marker([lat, lng], {
            icon: DROPPED_PIN_DIV_ICON,
            draggable: false,
            pane: 'markerPane', // F-8
        }).addTo(map);

        // TV-1: pulse halo. Lives in shadowPane so it cannot occlude the
        // pin (F-10). interactive:false + non-interactive CSS rule ⇒ no
        // pointer events.
        const pulse = L.marker([lat, lng], {
            interactive: false,
            keyboard: false,
            pane: 'shadowPane', // F-10
            icon: makePingRingIcon(),
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
            icon: makePingRingIcon(),
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
    // only a module-scoped value (envVariables.telefoneFilter / periodMaxHours)
    // changes. Rekeying on the active filter inputs forces a clean remount so
    // the filter predicate in MarkerGroup actually takes effect.
    //
    // FILTRO_TEMPO Lane B: the period window keys on periodId. We ALSO fold the
    // minute-bucketed nowTick into the signature so the groups remount as time
    // passes - a marker can age OUT of the chosen window between user actions,
    // and nowTick (bumped once a minute in App) is what makes that re-filter
    // happen with no prop/flag change. The bucket keeps the key stable within a
    // minute so we don't thrash the cluster tree every render.
    const tickBucket = nowTick ? Math.floor(nowTick / 60000) : 0;
    const filterSig = `t${telefoneFilterActive ? 1 : 0}p${periodId || 'todos'}n${tickBucket}`;

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

    // F-4: memoize the initial-render-only zoom value so that repeated
    // re-renders don't re-evaluate isMobileDevice() and don't pass a
    // freshly-allocated number to MapContainer (a hypothetical
    // react-leaflet upgrade reacting to zoom changes by remount would
    // wipe our imperative L.markers).
    const screensizeZoom = useMemo(
        () => (isMobileDevice() ? MAP_CONFIG.DEFAULT_ZOOM_MOBILE : MAP_CONFIG.DEFAULT_ZOOM_DESKTOP),
        []
    );

    return (
        <div>
            <MapContainer
                style={MAP_CONTAINER_STYLE}
                zoom={screensizeZoom}
                maxZoom={MAP_CONFIG.MAX_ZOOM}
                center={center}
                attributionControl={false}
                preferCanvas={true}
                // Disable Leaflet's legacy L.Map.Tap shim. MapClickHandler
                // owns tap recognition via PointerEvent + a native-click
                // fallback (map.on('click')); leaving tap:true on enables
                // a third path (touchstart→touchend synthesizes a click)
                // that can race with our pointerup, double-firing emitTap
                // and replacing the just-placed dropped pin. Mobile-only
                // because L.Map.Tap is touch-device-only.
                tap={false}
            >
                {/* V1 LayersControl with 3 tile options (Waze/OSM/Satellite) */}
                <TileLayersControl />

                <SearchField />

                {/* INTL (dev-toggle INTL_ENABLED): flag selector re-scopes the
                    address search to any country, plus a UI language picker.
                    Both mount only when the feature is on; otherwise search
                    stays pinned to Brazil and neither control renders. */}
                {INTL_ENABLED && <CountryFlagControl />}
                {INTL_ENABLED && <LanguageControl />}

                {/* Pans map when GPS location arrives — MapContainer.center is not reactive */}
                <MapViewUpdater center={center} />

                {/* Keeps Leaflet's container-size cache in sync with iOS viewport shifts
                    (address bar appearing/disappearing changes actual map height) so that
                    containerPoint→latlng conversion stays accurate on every tap. */}
                <MapSizeInvalidator />

                {/* Encapsulated click handler: was inline whenReady arrow in V1 and V2 */}
                <MapClickHandler onMapClick={handleMapClick} onMapLongPress={handleMapLongPress} />

                {/* UX-M01: wheel-over-map scrolls the page until first click/focus
                    (kills the desktop scroll-trap). Flag-gated; null when off. */}
                <CooperativeWheelZoom />

                {/* Dev-only: outlines the tap hitbox in red when ?debug=hitbox. */}
                <MapHitboxOutline />

                <AttributionControl position="bottomleft" prefix={false} />

                <Marker
                    icon={ICONS.CURRENT_LOCATION}
                    position={center}
                    interactive={false}
                />

                {renderMarkerGroups()}

                {/* M2 — reporter pins with urgency-age encoding. `filtro` lets a
                    need filter (need:agua, need:abrigo, …) narrow this layer. */}
                <ReporterMarkers
                    dataMaps={dataMapsProp}
                    filtro={filtro}
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
    periodId:              PropTypes.string,
};

export default CoffeeMap;