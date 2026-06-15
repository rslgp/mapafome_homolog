import React from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import PropTypes from 'prop-types';
import PopupContent from './PopupContent';
import {
  formatPhoneNumber,
  calculateRating,
  formatRelativeTime,
  createDirectionUrl,
  shouldApplyFilter,
} from './mapUtils';
import { MAP_CONFIG } from './mapConstants';
import envVariables from './variaveisAmbiente';

// ─── .leaflet-interactive contract ────────────────────────────────────────
// MapClickHandler.isMapBackground() in mapComponents.js walks up the DOM
// from the tap target looking for the .leaflet-interactive class. If
// found, the tap is treated as "owned by Leaflet" and our PointerEvent
// pipeline does NOT drop a new blue pin (otherwise tapping a marker would
// drop a pin AND open its popup — see map_click_compatibility.yaml § F6).
// Leaflet 1.9.4 attaches .leaflet-interactive automatically to L.Marker
// (and every <Marker /> that react-leaflet renders here). If you replace
// these with a custom L.divIcon or override `interactive: false`, you
// MUST keep the class on every clickable marker element — or the popup
// will stop opening and a stray pin will drop instead.
// Tracked as MC-14 in LLM_BRAIN/map_click_compatibility.yaml.

/**
 * MarkerGroup Component
 * Renders a cluster of markers based on provided data and configuration
 */
const MarkerGroup = ({
  dataItems,
  icon,
  clusterIconFunction,
  messageFormatter,
  filterConfig,
  onContabilizarClicado,
  onAvaliar,
  onVerificarPonto,
  onRemoverPonto,
  onEntregarAlimento,
  onClicouTelefone,
  componentKey,
  removeOutsideVisibleBounds = false,
}) => {
  const renderMarker = (dataItem, k) => {
    const {
      mapCoords,
      Roaster,
      URL = '',
      DateISO,
      Telefone,
      DiaSemana,
      Mes = '',
      Horario,
      AlimentoEntregue,
      Avaliacao,
      RedeSocial,
      verificado,
    } = dataItem;

    // Validation: skip if no coordinates
    if (!mapCoords) return null;

    // Format data using utilities
    const googleDirection = createDirectionUrl(mapCoords);
    const dateMarked = formatRelativeTime(DateISO);
    const phoneData = formatPhoneNumber(Telefone);
    const ratingData = calculateRating(Avaliacao);

    // Apply filters
    const contactDisplay = phoneData.isLink ? (
      <span onClick={() => onClicouTelefone(mapCoords)}>
        contato:
        <a href={phoneData.url} target='_blank' rel='noreferrer'>
          {phoneData.formatted}
        </a>
      </span>
    ) : (
      phoneData.formatted ? (
        <span onClick={() => onClicouTelefone(mapCoords)}>
          contato:{phoneData.formatted}
        </span>
      ) : ''
    );

    // Period filter keys on the marker's REAL ISO date (DateISO), not the
    // relative display string `dateMarked` - see FILTRO_TEMPO_PLAN §2.2. The
    // old signature took dateMarked and matched `.includes("ano")`; the new one
    // compares DateISO against the chosen window via isWithinTimeThreshold.
    if (shouldApplyFilter(envVariables, contactDisplay, DateISO)) {
      return null;
    }

    // Apply custom filter if provided
    if (filterConfig && !filterConfig(dataItem)) {
      return null;
    }

    // Generate message
    const precisandoMsg = messageFormatter(dataItem, { DiaSemana, Horario, Mes, URL });

    // Prepare popup data
    const popupData = {
      googleDirection,
      precisandoMsg,
      dateMarked,
      contato: contactDisplay,
      redeSocial: RedeSocial,
      avaliacao: ratingData,
      alimentoEntregue: AlimentoEntregue,
      roaster: Roaster,
      verificado,
      mapCoords,
    };

    return (
      <Marker
        eventHandlers={{
          click: (e) => {
            onContabilizarClicado(mapCoords);
            console.log(`indo para [${mapCoords[0]},${mapCoords[1]}]`);
          },
        }}
        icon={icon}
        key={k}
        center={[mapCoords[0], mapCoords[1]]}
        position={[mapCoords[0], mapCoords[1]]}
      >
        <PopupContent
          {...popupData}
          onAvaliar={onAvaliar}
          onVerificarPonto={onVerificarPonto}
          onRemoverPonto={onRemoverPonto}
          onEntregarAlimento={onEntregarAlimento}
        />
      </Marker>
    );
  };

  return (
    <MarkerClusterGroup
      key={componentKey}
      spiderfyDistanceMultiplier={MAP_CONFIG.SPIDER_DISTANCE_MULTIPLIER}
      showCoverageOnHover={false}
      maxClusterRadius={MAP_CONFIG.CLUSTER_RADIUS}
      iconCreateFunction={clusterIconFunction}
      removeOutsideVisibleBounds={removeOutsideVisibleBounds}
    >
      {dataItems.map((dataItem, k) => renderMarker(dataItem, k))}
    </MarkerClusterGroup>
  );
};

MarkerGroup.propTypes = {
  dataItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  icon: PropTypes.object.isRequired,
  clusterIconFunction: PropTypes.func.isRequired,
  messageFormatter: PropTypes.func.isRequired,
  filterConfig: PropTypes.func,
  onContabilizarClicado: PropTypes.func.isRequired,
  onAvaliar: PropTypes.func.isRequired,
  onVerificarPonto: PropTypes.func.isRequired,
  onRemoverPonto: PropTypes.func.isRequired,
  onEntregarAlimento: PropTypes.func.isRequired,
  onClicouTelefone: PropTypes.func.isRequired,
  componentKey: PropTypes.string.isRequired,
  removeOutsideVisibleBounds: PropTypes.bool,
};

export default MarkerGroup;
