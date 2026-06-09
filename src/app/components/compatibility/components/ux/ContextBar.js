'use client';

import React, { useMemo } from 'react';
import './ContextBar.css';
import envVariables from '../variaveisAmbiente';
import { URGENCY, urgencyOf, isArchived } from './mdfMarkers';
import { t, useLocale } from './strings';

// M2 context bar — live counts for the reporter/donor map surface.
// "X pontos em Y km · N aguardando há mais de 6h"

const RADIUS_KM = 2;

function extractCoords(row) {
  if (!row) return null;
  if (Array.isArray(row.mapCoords) && row.mapCoords.length === 2) return row.mapCoords;
  try {
    if (row.Coordinates) return JSON.parse(row.Coordinates);
  } catch (_e) { /* ignore */ }
  return null;
}

// Any row that represents an individual person's need (not a fixed initiative).
// Covers M1 writes (Categorias array) AND legacy roasters so the count matches
// what the donor actually sees on the map today.
const LEGACY_NEED_ROASTERS = new Set([
  'Alimento pronto',
  'CestaBasica',
  'MoradorRua',
]);

function isReporterPin(row) {
  if (!row) return false;
  if (Array.isArray(row.Categorias) && row.Categorias.length > 0) return true;
  return LEGACY_NEED_ROASTERS.has(row.Roaster);
}

export default function ContextBar({ dataMaps, userCoords, radiusKm = RADIUS_KM, onOpenList }) {
  useLocale(); // re-render on locale change so t() re-reads
  const { nearby, waitingOver6h } = useMemo(() => {
    if (!Array.isArray(dataMaps) || dataMaps.length === 0) {
      return { nearby: 0, waitingOver6h: 0 };
    }
    const origin = Array.isArray(userCoords) && userCoords.length === 2 ? userCoords : null;

    let nearbyCount = 0;
    let staleCount = 0;

    for (const row of dataMaps) {
      if (!isReporterPin(row)) continue;
      const attended = Boolean(row.AlimentoEntregue);
      if (isArchived(row.DateISO, { attended })) continue;

      const coords = extractCoords(row);
      if (origin && coords) {
        const km = envVariables.distanceInKmBetweenEarthCoordinates(
          origin[0], origin[1], coords[0], coords[1],
        );
        if (km <= radiusKm) nearbyCount += 1;
      }

      if (urgencyOf(row.DateISO, { attended }) === URGENCY.STALE) staleCount += 1;
    }

    return { nearby: nearbyCount, waitingOver6h: staleCount };
  }, [dataMaps, userCoords, radiusKm]);

  return (
    <div className="mdf-context-bar" role="status" aria-live="polite">
      <span className="mdf-context-bar__count">
        <strong>{nearby}</strong> pontos em {radiusKm} km
      </span>
      <span className="mdf-context-bar__sep" aria-hidden="true">·</span>
      <span className={`mdf-context-bar__stale${waitingOver6h > 0 ? ' mdf-context-bar__stale--on' : ''}`}>
        <strong>{waitingOver6h}</strong> aguardando há mais de 6h
      </span>
      {onOpenList && (
        <button
          type="button"
          className="mdf-context-bar__list"
          onClick={onOpenList}
        >
          {t('cta.list')}
        </button>
      )}
    </div>
  );
}
