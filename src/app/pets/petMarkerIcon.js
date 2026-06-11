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
//
// PET-M11 — DIMENSÃO DE CICLO DE VIDA (ortogonal ao status):
//   • fresh   → relato recente: anel cheio na cor do status (--pet-<status>).
//   • aged    → relato envelhecendo (PET-M12/M13): "abafado" porém AINDA >=3:1.
//                NUNCA por opacidade — o abafamento é um DESLOCAMENTO DE VALOR
//                (o anel passa a usar o token --pet-<status>-ink, mais escuro/
//                profundo: contraste AUMENTA, 9–12:1) MAIS uma PISTA SECUNDÁRIA
//                NÃO-opacidade: um arco interno tracejado de "desgaste" que o fresh
//                não tem. Assim o envelhecido se lê por VALOR + FORMA, não por
//                transparência (que daltônicos/baixa-visão não captam).
//   • reunido → pet reunido (PET-M2 resolvedAt): um GLIFO de CORAÇÃO sobreposto,
//                preenchido com --pet-reunido. O coração é uma FORMA que nenhum
//                status ativo usa, então em escala de cinza o reunido é
//                mono-distinguível por SHAPE, não só por cor (governador de tom:
//                caloroso e gentil, sem spike comemorativo).

import L from 'leaflet';

// Largura do anel por status. Tracejado é exclusivo do "avistado".
const RING = {
  perdido:    { width: 2, dash: null },
  encontrado: { width: 5, dash: null },
  avistado:   { width: 3, dash: '4 3' },
};

const FALLBACK_RING = { width: 2, dash: null };

// SOT dos estados de ciclo de vida (chaves estáveis). 'fresh' é o default seguro.
export const PET_LIFECYCLE = {
  FRESH: 'fresh',
  AGED: 'aged',
  REUNIDO: 'reunido',
};

const LIFECYCLE_IDS = new Set(Object.values(PET_LIFECYCLE));

// SOT da LEGENDA de ciclo de vida (PET-M11(a)). A legenda de status vem de
// PET_STATUSES (petDomain); estas entradas explicam as VARIAÇÕES de ciclo de vida
// que o status sozinho não cobre — o marcador envelhecido e o reunido. Cada uma
// nomeia o swatch a renderizar (um status de referência + o lifecycle), então a
// legenda mostra o mini-ícone REAL. PET-M23: o RÓTULO não mora mais aqui como
// string inline — o PetLegendControl resolve via t('pets.lifecycle.<id>.label')
// no idioma ativo. Esta lista guarda só a forma (id estável + qual swatch desenhar).
export const PET_LIFECYCLE_LEGEND = [
  { id: 'aged',    sampleStatus: 'perdido',    lifecycle: PET_LIFECYCLE.AGED },
  { id: 'reunido', sampleStatus: 'encontrado', lifecycle: PET_LIFECYCLE.REUNIDO },
];

// Helper puro: largura do anel para um status (default seguro se desconhecido).
export function ringWidthFor(status) {
  return (RING[status] || FALLBACK_RING).width;
}

// Helper PURO de ciclo de vida — espelha ringWidthFor: mapeia {status, lifecycle}
// para a RECEITA de desenho do anel/glifo, lendo SÓ tokens --pet-* (sem hex cru).
// Determinístico, nunca lança, default seguro para entradas desconhecidas.
//
// Devolve um objeto descritivo (testável sem Leaflet):
//   • ringWidth      — largura do anel (do status; reusa ringWidthFor).
//   • dash           — stroke-dasharray do anel (do status; null = sólido).
//   • strokeVar      — token de cor do ANEL. fresh/reunido: --pet-<status>;
//                      aged: --pet-<status>-ink (mais escuro = "abafado" porém
//                      MAIOR contraste, >=3:1 garantido — nunca opacidade).
//   • agedCue        — true só p/ aged: desenha o arco interno de "desgaste"
//                      (pista secundária NÃO-opacidade que o fresh não tem).
//   • overlayGlyph   — 'heart' só p/ reunido (glifo sobreposto), senão null.
//   • overlayVar     — token de preenchimento do glifo sobreposto (--pet-reunido).
//   • lifecycle      — o id de ciclo de vida normalizado (fresh se desconhecido).
export function lifecycleStyleFor(status, lifecycle) {
  const ring = RING[status] || FALLBACK_RING;
  const lc = LIFECYCLE_IDS.has(lifecycle) ? lifecycle : PET_LIFECYCLE.FRESH;
  const aged = lc === PET_LIFECYCLE.AGED;
  const reunido = lc === PET_LIFECYCLE.REUNIDO;
  return {
    lifecycle: lc,
    ringWidth: ring.width,
    dash: ring.dash,
    // aged abafa por VALOR (token -ink mais escuro), não por opacidade.
    strokeVar: aged ? `var(--pet-${status}-ink)` : `var(--pet-${status})`,
    agedCue: aged,
    overlayGlyph: reunido ? 'heart' : null,
    overlayVar: 'var(--pet-reunido)',
  };
}

// Deriva o id de ciclo de vida de um pet PARSEADO (forma do parsePetRow). PURO,
// nunca lança. Precedência: reunido (resolvedAt presente — PET-M2) vence aged.
// `aged` é lido de um flag que PET-M12 (arquivamento por idade) vai gravar; até
// lá, todo pet ativo não-reunido lê como 'fresh'. Mantém o vocabulário de ciclo
// de vida nesta SOT (não espalha a regra pelos componentes).
export function lifecycleForPet(pet) {
  const p = pet || {};
  if (p.resolved || p.resolvedAt) return PET_LIFECYCLE.REUNIDO;
  if (p.aged) return PET_LIFECYCLE.AGED;
  return PET_LIFECYCLE.FRESH;
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

// Pista secundária NÃO-opacidade do estado "aged": um arco interno tracejado de
// "desgaste" que o marcador fresh NUNCA desenha. É uma FORMA adicional (não uma
// transparência), então sobrevive a escala de cinza e a baixa visão. Desenhado na
// cor do anel (já o token -ink mais escuro) para manter o contraste.
function agedCueArc(color) {
  return `<path d="M16 6.5 A 9.5 9.5 0 0 1 25.5 16" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2 2.5" opacity="1" />`;
}

// Glifo sobreposto de "reunido": um CORAÇÃO preenchido com --pet-reunido. Forma
// exclusiva (nenhum status ativo a usa) → mono-distinguível em cinza por SHAPE.
// Um disco de fundo na cor do marcador (--mdf-surface-1) dá folga visual para o
// coração se destacar sobre o glifo de status por baixo.
function reunidoOverlay(fillVar) {
  return `
    <circle cx="16" cy="16" r="7.5" fill="var(--mdf-surface-1)" />
    <path d="M16 21.5 C 12 18.2 10 16 10 13.4 C 10 11.5 11.5 10.2 13.2 10.2 C 14.4 10.2 15.4 10.9 16 11.9 C 16.6 10.9 17.6 10.2 18.8 10.2 C 20.5 10.2 22 11.5 22 13.4 C 22 16 20 18.2 16 21.5 Z" fill="${fillVar}" />
  `;
}

// SVG do marcador. `size` (px) só ajusta width/height — o viewBox 0 0 32 32 e toda
// a geometria são idênticos, então o mini-ícone da LEGENDA (PET-M11(a)) é o MESMO
// marcador, em escala menor (a legenda mostra o glifo+anel+dash REAL, não um
// desenho paralelo que poderia divergir). Exportado para a legenda reusar.
export function petMarkerSvg({ status, species, lifecycle, size = 32 }) {
  const style = lifecycleStyleFor(status, lifecycle);
  const stroke = style.strokeVar;
  const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : '';
  const aged = style.agedCue ? agedCueArc(stroke) : '';
  // No reunido, o coração sobreposto carrega o significado; o glifo de status fica
  // por baixo (continua presente p/ quem zoom). Espécie só decora, como sempre.
  const overlay = style.overlayGlyph === 'heart' ? reunidoOverlay(style.overlayVar) : '';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13"
              fill="var(--mdf-surface-1)"
              stroke="${stroke}"
              stroke-width="${style.ringWidth}"${dashAttr} />
      ${speciesHint(species, stroke)}
      ${statusGlyph(status, stroke)}
      ${aged}
      ${overlay}
    </svg>
  `;
}

export function buildPetMarkerIcon({ status, species, lifecycle }) {
  const style = lifecycleStyleFor(status, lifecycle);
  return L.divIcon({
    className: `pet-marker pet-marker--${status} pet-marker--lc-${style.lifecycle}`,
    html: petMarkerSvg({ status, species, lifecycle, size: 32 }),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
}
