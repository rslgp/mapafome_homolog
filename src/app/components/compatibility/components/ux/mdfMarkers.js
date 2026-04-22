// M2 — marker system (LLM_BRAIN/design_brief.yaml § visual_system.markers).
//
// Two-axis encoding:
//   • urgency-age  → ring thickness + color (fresh / waiting / stale / done)
//   • type         → interior glyph: circle = individual person, house = initiative
//
// Ring thickness is the PRIMARY signal; color reinforces it. This matches the
// exit criterion "identify stale vs fresh without color alone" — a monochrome
// render still distinguishes the states by ring weight.

import L from 'leaflet';

export const URGENCY = {
  FRESH:   'fresh',
  WAITING: 'waiting',
  STALE:   'stale',
  DONE:    'done',
};

const THRESH_FRESH_H = 2;
const THRESH_WAITING_H = 6;
const ARCHIVE_AFTER_H = 24;

export function hoursSince(dateIso) {
  if (!dateIso) return Infinity;
  const then = Date.parse(dateIso);
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 36e5;
}

export function urgencyOf(dateIso, { attended = false } = {}) {
  if (attended) return URGENCY.DONE;
  const h = hoursSince(dateIso);
  if (h < THRESH_FRESH_H)   return URGENCY.FRESH;
  if (h < THRESH_WAITING_H) return URGENCY.WAITING;
  return URGENCY.STALE;
}

export function isArchived(dateIso, { attended = false } = {}) {
  if (!attended) return false;
  return hoursSince(dateIso) >= ARCHIVE_AFTER_H;
}

// Ring specs per urgency level. Thickness is 2 / 3 / 5 / 2 px.
// These resolve against CSS tokens at render time so theme updates propagate.
const RING = {
  [URGENCY.FRESH]:   { stroke: 'var(--mdf-urgency-fresh)',   width: 2, opacity: 1 },
  [URGENCY.WAITING]: { stroke: 'var(--mdf-urgency-waiting)', width: 3, opacity: 1 },
  [URGENCY.STALE]:   { stroke: 'var(--mdf-urgency-stale)',   width: 5, opacity: 1 },
  [URGENCY.DONE]:    { stroke: 'var(--mdf-urgency-done)',    width: 2, opacity: 0.4 },
};

function personGlyph(color) {
  // Filled inner disc — reads as a single-person pin.
  return `<circle cx="16" cy="16" r="5" fill="${color}" />`;
}

function initiativeGlyph(color) {
  // House silhouette — reads as a fixed-location initiative.
  // Path chosen to stay within a 14×14 box centered at (16,16).
  return `
    <path fill="${color}" d="
      M16 9 L23 15
      L23 22
      L18 22
      L18 18
      L14 18
      L14 22
      L9  22
      L9  15
      Z" />
  `;
}

function svg({ urgency, type }) {
  const r = RING[urgency];
  const glyph = type === 'initiative' ? initiativeGlyph(r.stroke) : personGlyph(r.stroke);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"
         style="opacity:${r.opacity}">
      <circle cx="16" cy="16" r="13"
              fill="var(--mdf-surface-1)"
              stroke="${r.stroke}"
              stroke-width="${r.width}" />
      ${glyph}
    </svg>
  `;
}

export function buildMarkerIcon({ dateIso, type = 'person', attended = false }) {
  const urgency = urgencyOf(dateIso, { attended });
  return L.divIcon({
    className: `mdf-marker mdf-marker--${urgency} mdf-marker--${type}`,
    html: svg({ urgency, type }),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
}
