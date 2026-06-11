'use client';

// PetMarkers.js — camada de marcadores de pet. Paralelo a ReporterMarkers.js do
// app de fome: um MarkerClusterGroup com um <Marker> por pet.
//
// Contrato .leaflet-interactive (igual ReporterMarkers): buildPetMarkerIcon usa
// L.divIcon; o <Marker> do react-leaflet o envolve em
// .leaflet-marker-icon.leaflet-interactive — então o MapClickHandler do mapa
// pula taps em marcadores (não derruba pin solto ao clicar num pet).

import React, { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import PropTypes from 'prop-types';
import { buildPetMarkerIcon, lifecycleForPet } from './petMarkerIcon';
import { markerClusterOptionsPrecisando } from '../components/compatibility/components/mapUtils';
import { MAP_CONFIG } from '../components/compatibility/components/mapConstants';

const PetMarkers = ({ pets, onPetClick }) => {
  // useMemo para não recalcular a lista (e remontar o cluster) a cada render
  // quando `pets` não mudou — mesmo padrão de ReporterMarkers.
  const validPets = useMemo(() => {
    if (!Array.isArray(pets)) return [];
    return pets.filter((p) => p && Array.isArray(p.coords) && p.coords.length === 2);
  }, [pets]);

  if (validPets.length === 0) return null;

  return (
    <MarkerClusterGroup
      key="pet-pins"
      spiderfyDistanceMultiplier={MAP_CONFIG.SPIDER_DISTANCE_MULTIPLIER}
      showCoverageOnHover={false}
      maxClusterRadius={MAP_CONFIG.CLUSTER_RADIUS}
      iconCreateFunction={markerClusterOptionsPrecisando}
    >
      {validPets.map((pet, i) => (
        <Marker
          key={`pet-${i}-${pet.dateIso || ''}`}
          position={pet.coords}
          icon={buildPetMarkerIcon({
            status: pet.status,
            species: pet.species,
            lifecycle: lifecycleForPet(pet),
          })}
          eventHandlers={{
            click: () => onPetClick?.(pet),
          }}
        />
      ))}
    </MarkerClusterGroup>
  );
};

PetMarkers.propTypes = {
  pets: PropTypes.arrayOf(PropTypes.object),
  onPetClick: PropTypes.func,
};

export default PetMarkers;
