'use client';

import React, { useEffect, useMemo } from 'react';
import './ListView.css';
import envVariables from '../variaveisAmbiente';
import { urgencyOf, isArchived } from './mdfMarkers';
import { t, useLocale } from './strings';
import { coordsFromPin } from '../../domain/pinCoords';

// M4 — accessible list alternative to the Leaflet map. Ranking:
//   rank = (distance_norm × 0.6) + (age_norm × 0.4)
// Sorted ascending by rank so close-and-recent rises, but far-but-stale
// still surfaces. Rows are keyboard-navigable by default (<button>).

const CATEGORY_ICONS = {
  comida: '🍞', agua: '💧', roupa: '👕', higiene: '🧼', abrigo: '🏠',
};

const LEGACY_NEED_ROASTERS = new Set(['Alimento pronto', 'CestaBasica', 'MoradorRua']);

function isReporterPin(row) {
  if (!row) return false;
  if (Array.isArray(row.Categorias) && row.Categorias.length > 0) return true;
  return LEGACY_NEED_ROASTERS.has(row.Roaster);
}

function hoursSince(dateIso) {
  if (!dateIso) return Infinity;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 36e5;
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return t('page.list.dist_m').replace('{n}', Math.round(km * 1000));
  return t('page.list.dist_km').replace('{n}', km.toFixed(1).replace('.', ','));
}

function formatRelative(dateIso) {
  const h = hoursSince(dateIso);
  if (!Number.isFinite(h)) return '';
  if (h < 1) return t('page.list.ago_min').replace('{n}', Math.max(1, Math.round(h * 60)));
  if (h < 24) return t('page.list.ago_hours').replace('{n}', Math.round(h));
  return t('page.list.ago_days').replace('{n}', Math.round(h / 24));
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

// waiting/someone_going come from the i18n dictionary (resolved via t() at
// render). 'done' here is the short 'Atendido' label, which has no dictionary
// key (the dict's pin.attended_today is the longer 'Atendido hoje'), so it
// stays a literal and is not localized.
const STATUS_LABEL = {
  waiting:       () => t('pin.waiting'),
  someone_going: () => t('pin.someone_going'),
  done:          () => t('page.list.status_done'),
};

function statusOf(row) {
  if (row.AlimentoEntregue) return 'done';
  const claims = Array.isArray(row.Claims) ? row.Claims : [];
  const now = Date.now();
  const active = claims.some((c) => {
    const t = Date.parse(c?.claimedAt || '');
    return Number.isFinite(t) && (now - t) < 30 * 60 * 1000;
  });
  return active ? 'someone_going' : 'waiting';
}

export default function ListView({ open, dataMaps, userCoords, onSelectPin, onClose }) {
  useLocale(); // re-render on locale change so t() re-reads
  const rows = useMemo(() => {
    if (!open) return [];
    if (!Array.isArray(dataMaps)) return [];
    const origin = Array.isArray(userCoords) && userCoords.length === 2 ? userCoords : null;
    const candidates = dataMaps.filter((r) => {
      if (!isReporterPin(r)) return false;
      const attended = Boolean(r.AlimentoEntregue);
      return !isArchived(r.DateISO, { attended });
    });
    // Normalise distance and age to [0,1] within this batch so the weighted
    // ranking is stable regardless of overall scale.
    const enriched = candidates.map((r) => {
      const c = coordsFromPin(r);
      const km = (origin && c)
        ? envVariables.distanceInKmBetweenEarthCoordinates(origin[0], origin[1], c[0], c[1])
        : null;
      return { row: r, km: Number.isFinite(km) ? km : null, age: hoursSince(r.DateISO) };
    });
    const maxKm = enriched.reduce((m, e) => Math.max(m, e.km ?? 0), 1);
    const maxAge = enriched.reduce((m, e) => Math.max(m, e.age ?? 0), 1);
    enriched.forEach((e) => {
      const dn = e.km != null ? e.km / maxKm : 1;
      const an = 1 - Math.min(1, e.age / maxAge); // fresher = higher; invert so low rank wins
      e.rank = dn * 0.6 + an * 0.4;
    });
    enriched.sort((a, b) => a.rank - b.rank);
    return enriched;
  }, [open, dataMaps, userCoords]);

  // Escape closes the dialog — matches the dismissal contract of the other
  // modal sheets (close button, backdrop tap, Esc).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mdf-list" role="dialog" aria-modal="true" aria-labelledby="mdf-list-title">
      <div className="mdf-list__backdrop" aria-hidden="true" onClick={() => onClose?.()} />
      <section className="mdf-list__panel">
        <header className="mdf-list__header">
          <h2 id="mdf-list-title">{t('page.list.title')}</h2>
          <button type="button" className="mdf-list__close" onClick={() => onClose?.()}>{t('page.list.close')}</button>
        </header>

        {rows.length === 0 ? (
          <p className="mdf-list__empty">
            {t('page.list.empty')}
          </p>
        ) : (
          <ul className="mdf-list__rows" role="list">
            {rows.map(({ row, km }, i) => {
              const cats = Array.isArray(row.Categorias) ? row.Categorias : [];
              const status = statusOf(row);
              return (
                <li key={`${row.DateISO || ''}-${i}`} role="listitem">
                  <button
                    type="button"
                    className="mdf-list__row"
                    onClick={() => onSelectPin?.(row)}
                  >
                    <span className="mdf-list__cats" aria-hidden="true">
                      {cats.length > 0
                        ? cats.map((id) => CATEGORY_ICONS[id] || '•').join(' ')
                        : '•'}
                    </span>
                    <span className="mdf-list__meta">
                      <span className="mdf-list__distance">{formatDistance(km)}</span>
                      <span className="mdf-list__sep" aria-hidden="true">·</span>
                      <span className="mdf-list__time">{formatRelative(row.DateISO)}</span>
                    </span>
                    <span className={`mdf-list__status mdf-list__status--${status}`}>
                      {(STATUS_LABEL[status] || STATUS_LABEL.waiting)()}
                    </span>
                    {row.Detalhe && (
                      <span className="mdf-list__detail">{truncate(row.Detalhe, 80)}</span>
                    )}
                    <span className="mdf-list__chev" aria-hidden="true">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
