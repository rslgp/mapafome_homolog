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
import { needFilterId } from './ux/needCategories';
import { markerClusterOptionsPrecisando } from './mapUtils';
import { MAP_CONFIG } from './mapConstants';
import { coordsFromPin } from '../domain/pinCoords';

const ReporterMarkers = ({ dataMaps, onPinClick, nowTick, filtro }) => {
  // When the "filtro atual" menu emits a need filter (`need:agua`, `need:*`, …)
  // narrow the reporter pins to that need. `need:*` (needId === '*') and any
  // non-need filter keep every reporter pin — matching the prior always-show
  // behaviour under "Todos" and the legacy donor filters.
  const needId = needFilterId(filtro);
  const reporterPins = useMemo(() => {
    if (!Array.isArray(dataMaps)) return [];
    return dataMaps.filter((row) => {
      if (!Array.isArray(row?.Categorias) || row.Categorias.length === 0) return false;
      const attended = Boolean(row.AlimentoEntregue);
      if (isArchived(row.DateISO, { attended })) return false;
      if (needId && needId !== '*' && !row.Categorias.includes(needId)) return false;
      return true;
    });
    // nowTick — filtering drops archived (>24h attended) pins as time moves.
    // needId — re-filter when the active need filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMaps, nowTick, needId]);

  if (reporterPins.length === 0) return null;

  return (
    <MarkerClusterGroup
      // Rekey on the active need filter: MarkerClusterGroup caches its internal
      // layer tree and won't re-evaluate children when only the filtered set
      // changes, so a stable key would leave stale markers clustered. Same
      // remount-on-filter pattern the legacy groups use via filterSig in map.js.
      key={`reporter-pins-${needId || 'all'}`}
      spiderfyDistanceMultiplier={MAP_CONFIG.SPIDER_DISTANCE_MULTIPLIER}
      showCoverageOnHover={false}
      maxClusterRadius={MAP_CONFIG.CLUSTER_RADIUS}
      iconCreateFunction={markerClusterOptionsPrecisando}
    >
      {reporterPins.map((row, i) => {
        const coords = coordsFromPin(row);
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
  filtro: PropTypes.string,
};

export default ReporterMarkers;
