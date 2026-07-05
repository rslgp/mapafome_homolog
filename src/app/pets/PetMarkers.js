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
import { groupNearDuplicates } from './petDomain';
import { markerClusterOptionsPrecisando } from '../components/compatibility/components/mapUtils';
import { MAP_CONFIG } from '../components/compatibility/components/mapConstants';

const PetMarkers = ({ pets, onPetClick }) => {
  // useMemo para não recalcular a lista (e remontar o cluster) a cada render
  // quando `pets` não mudou — mesmo padrão de ReporterMarkers.
  const validPets = useMemo(() => {
    if (!Array.isArray(pets)) return [];
    return pets.filter((p) => p && Array.isArray(p.coords) && p.coords.length === 2);
  }, [pets]);

  // PET-02 — SOFT-dedup VISUAL: o MESMO relato re-postado (a pessoa publicou em
  // pânico duas/três vezes, ou dois vizinhos relataram o mesmíssimo avistamento)
  // vira vários pinos quase sobrepostos. groupNearDuplicates (predicado PURO já
  // construído e testado em petDedup) agrupa esses quase-duplicados; renderizamos
  // UM pino por grupo (o representante) em vez de um por relato.
  // nowMs = 0 (constante): a janela do dedup mede o Δ ENTRE as duas PUBLICAÇÕES
  // (dateIso de cada pet), não a idade absoluta — `isNearDuplicate` marca nowMs
  // como reservado (`void nowMs`) e NÃO o consulta hoje. Uma constante mantém o
  // render PURO (o React Compiler proíbe Date.now() no render) sem afetar o
  // agrupamento em nada. Barricada anti-falso-merge: o limiar é conservador
  // (~75 m / ~3 d, mesmo status + mesma espécie concreta); na dúvida NÃO funde
  // (fica singleton). O clique ainda entrega o representante — contrato
  // onPetClick inalterado; todos os membros seguem em group.members para uma
  // futura UI de expansão do cluster.
  const groups = useMemo(
    () => groupNearDuplicates(validPets, 0),
    [validPets],
  );

  if (groups.length === 0) return null;

  return (
    <MarkerClusterGroup
      key="pet-pins"
      spiderfyDistanceMultiplier={MAP_CONFIG.SPIDER_DISTANCE_MULTIPLIER}
      showCoverageOnHover={false}
      maxClusterRadius={MAP_CONFIG.CLUSTER_RADIUS}
      iconCreateFunction={markerClusterOptionsPrecisando}
    >
      {groups.map((group, i) => {
        const pet = group.representative;
        return (
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
        );
      })}
    </MarkerClusterGroup>
  );
};

PetMarkers.propTypes = {
  pets: PropTypes.arrayOf(PropTypes.object),
  onPetClick: PropTypes.func,
};

export default PetMarkers;
