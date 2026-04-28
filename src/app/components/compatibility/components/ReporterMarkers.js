'use client';

// M2 — reporter marker layer. Renders pins written through the M1 flow
// (rows with a Categorias array) using the two-axis urgency+type encoding
// from LLM_BRAIN/design_brief.yaml § visual_system.markers.
//
// .leaflet-interactive contract:
//   MapClickHandler in mapComponents.js skips taps whose DOM target is
//   inside any element with class .leaflet-interactive (so marker taps
//   don't drop a stray blue pin — see map_click_compatibility.yaml § F6).
//   buildMarkerIcon() returns L.divIcon-based icons; react-leaflet's
//   <Marker /> wraps them in a .leaflet-marker-icon.leaflet-interactive
//   container by default. If you switch to L.icon or override the
//   interactive flag, keep .leaflet-interactive on every clickable
//   element — otherwise marker taps will start dropping pins instead
//   of opening popups. Tracked as MC-14 in map_click_compatibility.yaml.

import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import PropTypes from 'prop-types';
import { buildMarkerIcon, isArchived } from './ux/mdfMarkers';
import { markerClusterOptionsPrecisando } from './mapUtils';
import { MAP_CONFIG } from './mapConstants';

function getCoords(row) {
  if (Array.isArray(row.mapCoords) && row.mapCoords.length === 2) return row.mapCoords;
  try {
    if (row.Coordinates) return JSON.parse(row.Coordinates);
  } catch (_e) { /* ignore */ }
  return null;
}

const ReporterMarkers = ({ dataMaps, onPinClick, nowTick }) => {
  const reporterPins = useMemo(() => {
    if (!Array.isArray(dataMaps)) return [];
    return dataMaps.filter((row) => {
      if (!Array.isArray(row?.Categorias) || row.Categorias.length === 0) return false;
      const attended = Boolean(row.AlimentoEntregue);
      return !isArchived(row.DateISO, { attended });
    });
    // nowTick — filtering drops archived (>24h attended) pins as time moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMaps, nowTick]);

  if (reporterPins.length === 0) return null;

  return (
    <MarkerClusterGroup
      key="reporter-pins"
      spiderfyDistanceMultiplier={MAP_CONFIG.SPIDER_DISTANCE_MULTIPLIER}
      showCoverageOnHover={false}
      maxClusterRadius={MAP_CONFIG.CLUSTER_RADIUS}
      iconCreateFunction={markerClusterOptionsPrecisando}
    >
      {reporterPins.map((row, i) => {
        const coords = getCoords(row);
        if (!coords) return null;
        const icon = buildMarkerIcon({
          dateIso: row.DateISO,
          type: 'person',
          attended: Boolean(row.AlimentoEntregue),
        });
        return (
          <Marker
            key={`reporter-${i}-${row.DateISO || ''}`}
            position={coords}
            icon={icon}
            eventHandlers={{
              click: () => onPinClick?.(row),
            }}
          />
        );
      })}
    </MarkerClusterGroup>
  );
};

ReporterMarkers.propTypes = {
  dataMaps: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPinClick: PropTypes.func,
  nowTick: PropTypes.number,
};

export default ReporterMarkers;
