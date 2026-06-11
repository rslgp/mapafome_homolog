'use client';

// PetLegendControl.js — legenda COMPACTA e DISPENSÁVEL no /pets (PET-M11(a)).
//
// Mapeia cada hue de status + a FORMA do glifo para um rótulo pt-BR, usando o
// MINI-ÍCONE REAL do marcador (petMarkerSvg — o mesmo SVG de petMarkerIcon, em
// escala menor), então a legenda nunca diverge do que aparece no mapa. Os rótulos
// vêm da SOT (PET_STATUSES de petDomain + PET_LIFECYCLE_LEGEND de petMarkerIcon):
// nenhum literal de status/lifecycle é duplicado aqui.
//
// DISPENSÁVEL (governador de tom — o público está em estresse; a legenda ajuda mas
// não pode estorvar): um botão "fechar" >=44px some o card e revela um pill
// "Mostrar legenda" para reabrir. O estado fica no DOM do control (não força
// re-render do React nem novo estado no PetsApp), igual ao PetLocateControl.
//
// Implementado como um L.Control nativo (como o zoom/geosearch/locate) para
// conviver com o Leaflet — o React monta/desmonta via useEffect. Sem hex cru: os
// swatches carregam o stroke --pet-* inline; o card usa só tokens --mdf-*.

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { PET_STATUSES } from './petDomain';
import { petMarkerSvg, PET_LIFECYCLE_LEGEND } from './petMarkerIcon';

// Cópia pt-BR calma (sem string crua espalhada). Tom: informativo, nunca alarme.
const COPY = {
  title: 'O que cada marcador quer dizer',
  close: 'Fechar legenda',
  reopen: 'Mostrar legenda',
};

// Tamanho do swatch (o mini-ícone REAL do marcador), igual ao CSS .pet-legend-card__swatch.
const SWATCH_SIZE = 22;

// Monta UMA linha da legenda: o mini-ícone do marcador + o rótulo pt-BR. PURO
// (string → string). O swatch é o petMarkerSvg do {status, lifecycle} da entrada,
// então mostra o anel+dash+glifo+overlay reais (não um desenho paralelo).
function legendRow({ sampleStatus, lifecycle, label }) {
  const swatch = petMarkerSvg({ status: sampleStatus, lifecycle, size: SWATCH_SIZE });
  return (
    '<li class="pet-legend-card__row">' +
    '<span class="pet-legend-card__swatch" aria-hidden="true">' + swatch + '</span>' +
    '<span class="pet-legend-card__label">' + label + '</span>' +
    '</li>'
  );
}

// Linhas da legenda, montadas a partir das SOTs (status ativos + variações de
// ciclo de vida). Sem literal de id/label duplicado: tudo deriva das listas.
function legendRowsHtml() {
  const statusRows = PET_STATUSES.map((s) =>
    legendRow({ sampleStatus: s.id, lifecycle: 'fresh', label: s.label }),
  );
  const lifecycleRows = PET_LIFECYCLE_LEGEND.map((e) =>
    legendRow({ sampleStatus: e.sampleStatus, lifecycle: e.lifecycle, label: e.label }),
  );
  return statusRows.concat(lifecycleRows).join('');
}

const PetLegendControl = () => {
  const map = useMap();

  useEffect(() => {
    const LegendControl = L.Control.extend({
      options: { position: 'bottomright' },

      onAdd() {
        const wrap = L.DomUtil.create('div', 'leaflet-bar pet-legend-control');

        // Card aberto (default) — título + botão fechar + lista de linhas.
        const card = L.DomUtil.create('div', 'pet-legend-card', wrap);
        const head = L.DomUtil.create('div', 'pet-legend-card__head', card);
        const title = L.DomUtil.create('p', 'pet-legend-card__title', head);
        title.textContent = COPY.title;

        const closeBtn = L.DomUtil.create('button', 'pet-legend-card__close', head);
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', COPY.close);
        closeBtn.title = COPY.close;
        closeBtn.innerHTML = '<span aria-hidden="true">✕</span>';

        const list = L.DomUtil.create('ul', 'pet-legend-card__list', card);
        list.innerHTML = legendRowsHtml();

        // Pill "Mostrar legenda" (escondido enquanto o card está aberto).
        const reopenBtn = L.DomUtil.create('button', 'pet-legend-reopen', wrap);
        reopenBtn.type = 'button';
        reopenBtn.hidden = true;
        reopenBtn.innerHTML =
          '<span aria-hidden="true">🛈</span> ' + COPY.reopen;

        const show = (open) => {
          card.hidden = !open;
          reopenBtn.hidden = open;
        };

        // Toques na legenda não viram clique no mapa (que solta um pin).
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.disableScrollPropagation(wrap);
        L.DomEvent.on(closeBtn, 'click', L.DomEvent.stop);
        L.DomEvent.on(closeBtn, 'click', () => show(false));
        L.DomEvent.on(reopenBtn, 'click', L.DomEvent.stop);
        L.DomEvent.on(reopenBtn, 'click', () => show(true));

        return wrap;
      },
    });

    const control = new LegendControl();
    map.addControl(control);
    return () => { map.removeControl(control); };
  }, [map]);

  return null;
};

export default PetLegendControl;
