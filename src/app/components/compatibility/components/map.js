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

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// F-4 (dropped_pin_invisible_mobile.yaml): hoist the inline style out of
// the JSX so its identity is stable across renders. react-leaflet's
// MapContainer is initial-render-only for most props, but a fresh-
// identity style object on every render still costs reconciliation
// work — and a hypothetical react-leaflet upgrade that DID react to
// style changes would silently remount the map and wipe our
// imperatively-added L.markers (the dropped pin among them).
const MAP_CONTAINER_STYLE = { height: '70vh', width: '100%' };

// F-12 (dropped_pin_invisible_mobile.yaml § H12): render the dropped
// pin via L.divIcon (a <div> with inline <svg>) instead of L.Icon (an
// <img>). Concrete device evidence: the bug is reproducible on Samsung
// SM-A546E (A54) and SM-G990E (S21 FE) but NOT on SM-A266M (A26) or a
// Motorola — all running Chrome on Android. The user's own pulse halo,
// which is already a divIcon, renders correctly on the broken devices.
// That asymmetry isolates the problem to the <img>-rendering path on
// Samsung's higher-end One UI 6 / WebView 14+ profile.
//
// Inlined visual: the MapaFome brand pin (cyan teardrop containing
// the bowl/steam mascot, viewBox 500×500). Sourced from
// src/app/components/compatibility/images/MapaFome_Icons_Blue.svg —
// the embedded <style class="cls-1"> is replaced with a direct
// fill="#00cfff" attribute so the SVG is fully self-contained when
// inlined into HTML (no global CSS leakage).
//
// Why this is structurally guaranteed to render on the broken devices:
//   • no <img> element — kills H1/H8/H12 bug class
//   • no asset URL — no 404, no PWA cache miss, no network request
//   • same DOM machinery as the pulse halo (which works)
//
// Sizing: 36 px box (taller than the previous 32 px so the brand mark
// is recognisable), iconAnchor [18, 36] so the pin's BOTTOM TIP sits
// on the lat/lng — the conventional "this is where you tapped"
// affordance familiar from Google/Apple Maps. The drop-in animation
// scales from the same anchor point.
const DROPPED_PIN_SVG_HTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" aria-hidden="true">' +
    '<path fill="#00cfff" d="M424.05,138.54C410.43,107,387.31,80,355.32,58.21A184.69,184.69,0,0,0,251.11,25.9h-2.22A184.69,184.69,0,0,0,144.68,58.21C112.69,80,89.57,107,76,138.54c-13.43,31.1-17.54,66.44-12.22,105a197.43,197.43,0,0,0,14.06,50.22,283.61,283.61,0,0,0,23.95,44.41c31.13,47.93,73,90.24,128.07,129.33a33,33,0,0,0,19.28,6.57l.91,0,.91,0a33,33,0,0,0,19.28-6.57c55-39.09,96.94-81.4,128.07-129.33a283.61,283.61,0,0,0,23.95-44.41,197.43,197.43,0,0,0,14.06-50.22C441.59,205,437.48,169.64,424.05,138.54ZM289.77,102.22c-1.77-2.46-3.46-5.15-2.91-8.6.69-4.34,3.15-7.24,7.12-8.42a9.58,9.58,0,0,1,10.8,3.32c7.05,8.62,11,18.43,11.56,28.36.56,11-3.3,21.52-11.16,30.52l-.54.61c-.53.59-1.05,1.19-1.55,1.8-7.6,9.29-7.3,20.07.87,31.18,1.91,2.61,3.58,5.53,2.81,9.23a9.72,9.72,0,0,1-7.63,8,11,11,0,0,1-2.56.31,9.73,9.73,0,0,1-7.64-3.8c-7.75-9.26-11.48-19.62-11.73-32.61.16-7.92,3.5-16.36,9.66-24.43a28.75,28.75,0,0,1,1.93-2.3C298.14,125.41,298.46,114.26,289.77,102.22Zm-46.65,0c-1.72-2.35-3.37-4.93-3-8.27a9.77,9.77,0,0,1,7.09-8.78c4.13-1.3,7.77-.22,10.81,3.2,7.41,8.31,11.48,19.81,11.78,33.26-.06,7.6-3.67,16.29-10.14,24.5-.53.68-1.12,1.37-1.74,2-8.91,9.71-9.23,20.35-1,32.54a18.5,18.5,0,0,1,3.16,7.65c.49,3.94-2.05,7.83-6.18,9.47a10.65,10.65,0,0,1-3.91.76,9.34,9.34,0,0,1-7.15-3.24c-11.73-13.65-19.4-37-2.39-57.94l.19-.23c.55-.67,1.12-1.38,1.74-2C253.92,122.78,249.15,110.39,243.12,102.17Zm-47.24-.29c-1.68-2.28-3.31-5.1-2.58-8.71a10.14,10.14,0,0,1,17.94-4.56c7.63,9.17,11.3,19.47,11.56,32.39-.14,7.61-3.28,15.8-9.09,23.72a30.5,30.5,0,0,1-2.47,3c-9.47,10-9.75,21.26-.84,33.37,1.85,2.52,3.46,5.34,2.76,9a9.76,9.76,0,0,1-7.2,8,11.32,11.32,0,0,1-3.09.45,9.27,9.27,0,0,1-7.25-3.48c-11.66-13.8-19.11-37.32-1.74-58.18l.3-.36c.28-.35.56-.69.87-1C204.62,125.38,204.9,114.08,195.88,101.88Zm186,124c-1.67,46.35-22,83-60.5,109-.41.28-.83.54-1.3.85l.64,0c1.59,0,3.18,0,4.78,0,3,0,6.18,0,9.28.07a10.12,10.12,0,0,1,9.68,10.17,10.24,10.24,0,0,1-9.5,10c-.44,0-.87,0-1.3,0H167.32a17.58,17.58,0,0,1-3.75-.26,10.11,10.11,0,0,1,2-20c3.74-.08,7.52-.06,11.18,0h2.52c-1.7-1.34-3.42-2.65-5.1-3.94a175.3,175.3,0,0,1-14.52-12c-26.63-25.38-40.58-57.08-41.47-94.23-.09-3.69.84-6.56,2.76-8.53s4.93-3,8.79-3H370.19c3.95,0,6.95,1,8.94,3.1S382,222.15,381.83,225.91Z"/>' +
    '</svg>';

const DROPPED_PIN_DIV_ICON = L.divIcon({
    className: 'mdf-dropped-pin',
    html: DROPPED_PIN_SVG_HTML,
    iconSize: [36, 36],
    iconAnchor: [18, 36], // bottom-center: pin's tip sits on the lat/lng
});

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