'use client';

import React, { useEffect, useMemo } from 'react';
import './ListView.css';
import envVariables from '../variaveisAmbiente';
import { urgencyOf, isArchived } from './mdfMarkers';

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

function coordsOf(row) {
  if (Array.isArray(row?.mapCoords) && row.mapCoords.length === 2) return row.mapCoords;
  try { if (row?.Coordinates) return JSON.parse(row.Coordinates); } catch (_e) {}
  return null;
}

function hoursSince(dateIso) {
  if (!dateIso) return Infinity;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 36e5;
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatRelative(dateIso) {
  const h = hoursSince(dateIso);
  if (!Number.isFinite(h)) return '';
  if (h < 1) return `há ${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `há ${Math.round(h)}h`;
  return `há ${Math.round(h / 24)} dias`;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

const STATUS_COPY = {
  waiting:       'Aguardando',
  someone_going: 'Alguém a caminho',
  done:          'Atendido',
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
      const c = coordsOf(r);
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
          <h2 id="mdf-list-title">Lista de pontos</h2>
          <button type="button" className="mdf-list__close" onClick={() => onClose?.()}>Fechar</button>
        </header>

        {rows.length === 0 ? (
          <p className="mdf-list__empty">
            Ninguém foi mapeado por aqui ainda. Toque em Relatar se você viu alguém precisando.
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
                      {STATUS_COPY[status]}
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
