// petMarkerIcon.js — fábrica de ícone de marcador de pet (L.divIcon).
//
// Espelha a estrutura SVG de mdfMarkers.js (M2): círculo de fundo
// fill=var(--mdf-surface-1) + anel colorido + glifo interior, 32×32,
// iconAnchor [16,16].
//
// SEGURANÇA PARA DALTÔNICOS (requisito duro, igual ao "identify without color
// alone" de mdfMarkers): o STATUS é codificado pela FORMA do glifo, não só pela
// cor do anel. Em monocromático os três status continuam distinguíveis:
//   • perdido    → "!" (alerta) + anel sólido fino   → pet sumiu, urgência
//   • encontrado → "✓" (casa/check) + anel sólido grosso → pet a salvo
//   • avistado   → "olho" + anel tracejado            → visto, não capturado
// A espécie escolhe um glifo animal interno opcional; o status manda na forma.
//
// A cor do anel referencia var(--pet-<status>) (definida em petPalette.css) —
// NUNCA hardcode hex aqui (SOT de cor mora na CSS var).

import L from 'leaflet';

// Largura do anel por status. Tracejado é exclusivo do "avistado".
const RING = {
  perdido:    { width: 2, dash: null },
  encontrado: { width: 5, dash: null },
  avistado:   { width: 3, dash: '4 3' },
};

const FALLBACK_RING = { width: 2, dash: null };

// Helper puro: largura do anel para um status (default seguro se desconhecido).
export function ringWidthFor(status) {
  return (RING[status] || FALLBACK_RING).width;
}

// Glifo do status — a FORMA que carrega o significado em monocromático.
function statusGlyph(status, color) {
  if (status === 'encontrado') {
    // Check grosso (lê como "✓ / a salvo").
    return `<path d="M11 16.5 L14.5 20 L21 12.5" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  if (status === 'avistado') {
    // Olho: elipse externa + pupila (lê como "👀 / visto").
    return `
      <ellipse cx="16" cy="16" rx="6" ry="3.4" fill="none" stroke="${color}" stroke-width="1.8" />
      <circle cx="16" cy="16" r="1.8" fill="${color}" />
    `;
  }
  // perdido (default): "!" de alerta (lê como "sumiu / urgência").
  return `
    <rect x="14.8" y="9.5" width="2.4" height="8" rx="1.2" fill="${color}" />
    <circle cx="16" cy="21" r="1.5" fill="${color}" />
  `;
}

// Glifo da espécie (decorativo, reforço — o status já é distinguível sem ele).
// Patinha para cão/outro, orelhas pontudas para gato; default = sem reforço.
function speciesHint(species, color) {
  if (species === 'gato') {
    // Duas orelhas triangulares no topo, sugerindo gato.
    return `<path d="M10.5 8 L12.5 11.5 L8.8 11.5 Z M21.5 8 L23.2 11.5 L19.5 11.5 Z" fill="${color}" opacity="0.55" />`;
  }
  if (species === 'cao') {
    // Duas orelhas caídas arredondadas, sugerindo cão.
    return `<path d="M9.5 9 q-2 3 0 5 q1.5 -1 1.5 -3 Z M22.5 9 q2 3 0 5 q-1.5 -1 -1.5 -3 Z" fill="${color}" opacity="0.55" />`;
  }
  return '';
}

function svg({ status, species }) {
  const ring = RING[status] || FALLBACK_RING;
  const stroke = `var(--pet-${status})`;
  const dashAttr = ring.dash ? ` stroke-dasharray="${ring.dash}"` : '';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13"
              fill="var(--mdf-surface-1)"
              stroke="${stroke}"
              stroke-width="${ring.width}"${dashAttr} />
      ${speciesHint(species, stroke)}
      ${statusGlyph(status, stroke)}
    </svg>
  `;
}

export function buildPetMarkerIcon({ status, species }) {
  return L.divIcon({
    className: `pet-marker pet-marker--${status}`,
    html: svg({ status, species }),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
}
