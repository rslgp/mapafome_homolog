'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ContextBar.css';
import envVariables from '../variaveisAmbiente';
import { URGENCY, urgencyOf, isArchived } from './mdfMarkers';
import { t, useLocale } from './strings';
import { coordsFromPin } from '../../domain/pinCoords';

// M2 context bar — live counts for the reporter/donor map surface.
// "X pontos em Y km · N aguardando há mais de 6h"

const RADIUS_KM = 2;

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

  // UX-M14: when the in-flow bar scrolls out ABOVE the viewport, pin a
  // condensed copy under the sticky header so the count + Lista stay one tap
  // away anywhere on the page. IntersectionObserver only (no scroll math);
  // boundingClientRect.top < 0 distinguishes "scrolled past" from "still
  // below the fold" (where pinning would be noise — the map is on screen).
  const rootRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      // Header is 56/64px tall; treat "hidden under the header" as gone too.
      { rootMargin: '-72px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
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

      const coords = coordsFromPin(row);
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
    <>
      <div ref={rootRef} className="mdf-context-bar" role="status" aria-live="polite">
        <span className="mdf-context-bar__count">
          <strong>{nearby}</strong> {t('page.context.points_in').replace('{km}', radiusKm)}
        </span>
        <span className="mdf-context-bar__sep" aria-hidden="true">·</span>
        <span className={`mdf-context-bar__stale${waitingOver6h > 0 ? ' mdf-context-bar__stale--on' : ''}`}>
          <strong>{waitingOver6h}</strong> {t('page.context.waiting_over')}
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
      {/* Condensed pinned copy (UX-M14). The text spans are aria-hidden so
          screen readers do not hear the live region's numbers twice; the
          Lista button stays fully accessible. No aria-live here on purpose. */}
      {pinned && (
        <div className="mdf-context-mini">
          <span aria-hidden="true">
            <strong>{nearby}</strong> {t('page.context.points_in').replace('{km}', radiusKm)}
          </span>
          {onOpenList && (
            <button
              type="button"
              className="mdf-context-mini__list"
              onClick={onOpenList}
            >
              {t('cta.list')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
