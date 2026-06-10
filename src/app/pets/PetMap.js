'use client';

// PetMap.js — fork ENXUTO do CoffeeMap (map.js) para o /pets.
//
// Reaproveita os blocos de construção do mapa de fome (TileLayersControl,
// MapViewUpdater, MapSizeInvalidator, MapClickHandler) e a técnica de pin solto
// via L.divIcon. Diferenças deliberadas vs CoffeeMap:
//   • estado de pin solto fica LOCAL (useRef) — sem envVariables global.
//   • sem SearchField, sem MarkerGroups de fome, sem ping pós-publicação.
//   • marcadores de pet vêm via <PetMarkers/>, não via ReporterMarkers.
//
// Carregado só via dynamic import ssr:false (como CoffeeMap), então o
// `import L from 'leaflet'` no topo é seguro (mesmo padrão de map.js).

import React, { useCallback, useRef, useMemo } from 'react';
import { MapContainer, Marker, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles';
import PropTypes from 'prop-types';

import PetMarkers from './PetMarkers';
import { ICONS, MAP_CONFIG } from '../components/compatibility/components/mapConstants';
import { isMobileDevice } from '../components/compatibility/components/mapUtils';
import {
  TileLayersControl,
  MapClickHandler,
  MapSizeInvalidator,
  MapViewUpdater,
} from '../components/compatibility/components/mapComponents';

// Identidade estável (F-4 do map.js): style fora do JSX para não remontar o mapa
// e apagar marcadores adicionados imperativamente (o pin solto entre eles).
const MAP_CONTAINER_STYLE = { height: '70vh', width: '100%' };

// Pin solto do /pets via L.divIcon (não L.Icon) — mesma classe de robustez do
// F-12 do map.js: sem <img>, sem URL de asset, sem 404 de cache PWA. Patinha
// dentro de uma teardrop. iconAnchor na ponta de baixo (convenção "foi aqui").
const DROPPED_PIN_SVG_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" aria-hidden="true">' +
  '<path fill="var(--pet-perdido, #d8572a)" d="M16 1 C8 1 2 7 2 15 C2 25 16 39 16 39 C16 39 30 25 30 15 C30 7 24 1 16 1 Z"/>' +
  '<circle cx="16" cy="14" r="3" fill="#ffffff"/>' +
  '<circle cx="10.5" cy="11" r="1.6" fill="#ffffff"/>' +
  '<circle cx="21.5" cy="11" r="1.6" fill="#ffffff"/>' +
  '<circle cx="12" cy="6.5" r="1.4" fill="#ffffff"/>' +
  '<circle cx="20" cy="6.5" r="1.4" fill="#ffffff"/>' +
  '</svg>';

const DROPPED_PIN_DIV_ICON = L.divIcon({
  className: 'pet-dropped-pin',
  html: DROPPED_PIN_SVG_HTML,
  iconSize: [32, 40],
  iconAnchor: [16, 40], // ponta inferior na lat/lng
});

const PetMap = ({ center, pets, onPinDropped, onPetClick }) => {
  const lastMarkedRef = useRef(null);
  const mapRef = useRef(null);

  // Drop idempotente de um único pin de pet (igual handleMapClick do map.js):
  // mesmas coords ⇒ no-op; coords novas ⇒ remove o anterior e adiciona o novo.
  const handleMapClick = useCallback((map, lat, lng) => {
    if (lastMarkedRef.current) {
      const cur = lastMarkedRef.current.getLatLng();
      if (Math.abs(cur.lat - lat) < 1e-9 && Math.abs(cur.lng - lng) < 1e-9) {
        return;
      }
      lastMarkedRef.current.remove();
    }

    const marker = L.marker([lat, lng], {
      icon: DROPPED_PIN_DIV_ICON,
      draggable: false,
      pane: 'markerPane',
    }).addTo(map);

    lastMarkedRef.current = marker;
    mapRef.current = map;
    onPinDropped?.([lat, lng]);
  }, [onPinDropped]);

  // Long-press / right-click: reusa o mesmo drop e avisa o pai.
  const handleMapLongPress = useCallback((map, lat, lng) => {
    onPinDropped?.([lat, lng]);
  }, [onPinDropped]);

  // Zoom inicial só uma vez (não re-avaliar isMobileDevice a cada render).
  const screensizeZoom = useMemo(
    () => (isMobileDevice() ? MAP_CONFIG.DEFAULT_ZOOM_MOBILE : MAP_CONFIG.DEFAULT_ZOOM_DESKTOP),
    [],
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
        tap={false}
      >
        <TileLayersControl />

        <MapViewUpdater center={center} />

        <MapSizeInvalidator />

        <MapClickHandler onMapClick={handleMapClick} onMapLongPress={handleMapLongPress} />

        <AttributionControl position="bottomleft" prefix={false} />

        <Marker
          icon={ICONS.CURRENT_LOCATION}
          position={center}
          interactive={false}
        />

        <PetMarkers pets={pets} onPetClick={onPetClick} />
      </MapContainer>
    </div>
  );
};

PetMap.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
  pets: PropTypes.arrayOf(PropTypes.object),
  onPinDropped: PropTypes.func,
  onPetClick: PropTypes.func,
};

export default PetMap;
