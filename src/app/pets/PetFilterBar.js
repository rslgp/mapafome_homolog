'use client';

// PetFilterBar.js — PET-M7: filtro compacto que estreita os PINS do mapa por
// status / espécie / porte. UI burra: NÃO conhece os pets nem aplica o predicado
// — só desenha as opções (lidas da SOT petDomain), reporta toggles ao pai
// (PetsApp, dono do estado) e ANUNCIA a contagem de combinações via aria-live.
//
// Por que aqui e não no PetMap: o estado de filtro mora no PetsApp (que já é dono
// de `pets`), que deriva os pets visíveis com filterPets() e os passa ao
// PetMarkers. Esta barra é uma superfície de CONTROLE pura — testável sem Leaflet.
//
// FONTE ÚNICA: as três facetas iteram PET_STATUSES / PET_SPECIES / PET_SIZES.
// Nenhum label/id de status é escrito aqui — mudar a SOT muda os chips sem outra
// edição (acceptance PET-M7). Nenhuma string 'perdido' hardcoded.
//
// A11y (Yablonski/Fitts + WCAG):
//   • cada faceta é um group rotulado (role implícito do <fieldset>/<legend>),
//     com aria-label explícito no grupo de chips;
//   • cada chip é um <button> real (operável por teclado, foco visível) com
//     aria-pressed refletindo seleção — um toggle, não um radio (seleção MÚLTIPLA
//     dentro da faceta = OR);
//   • alvos >=44px (geometria herdada de .mdf-chip via --mdf-touch-target);
//   • a contagem de combinações vai num região aria-live="polite" para o leitor
//     de tela anunciar "N pets no mapa" a cada mudança (acceptance PET-M7);
//   • "limpar filtros" só aparece quando há faceta ativa (Hick: não polui quando
//     não há o que limpar) e é um alvo >=44px operável por teclado.

import React from 'react';
import PropTypes from 'prop-types';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  countActivePetFilterFacets,
} from './petDomain';

// Descreve as três facetas de forma declarativa (DRY): cada uma aponta para a
// lista SOT, a chave do estado de filtro e os rótulos pt-BR do grupo. Iterar isto
// evita repetir o markup de chips três vezes.
const FACETS = [
  { key: 'statuses', legend: 'Situação', groupLabel: 'Filtrar por situação', options: PET_STATUSES },
  { key: 'species', legend: 'Espécie', groupLabel: 'Filtrar por espécie', options: PET_SPECIES },
  { key: 'sizes', legend: 'Porte', groupLabel: 'Filtrar por porte', options: PET_SIZES },
];

// Pluraliza a contagem de combinações com tom calmo (sem alarme). pt-BR.
function matchCountLabel(count, total) {
  if (total === 0) return 'Nenhum pet reportado por aqui ainda.';
  if (count === 0) return 'Nenhum pet combina com o filtro. Tente afrouxar a busca.';
  if (count === total) {
    return count === 1 ? '1 pet no mapa.' : `${count} pets no mapa.`;
  }
  const pet = count === 1 ? 'pet' : 'pets';
  return `${count} ${pet} no mapa (de ${total}).`;
}

export default function PetFilterBar({ filter, total, matchCount, onToggle, onClear }) {
  const activeFacets = countActivePetFilterFacets(filter);
  const hasActive = activeFacets > 0;

  // Lê o array de ids selecionados de uma faceta com defesa (faceta ausente → []).
  const selectedFor = (key) => (filter && Array.isArray(filter[key]) ? filter[key] : []);

  return (
    <section className="pet-filter" aria-labelledby="pet-filter-heading">
      <div className="pet-filter__head">
        <h2 id="pet-filter-heading" className="pet-filter__heading">
          Filtrar pets no mapa
        </h2>
        {hasActive && (
          <button
            type="button"
            className="pet-filter__clear"
            onClick={onClear}
          >
            <span aria-hidden="true">✕</span> Limpar filtros
          </button>
        )}
      </div>

      {FACETS.map((facet) => {
        const selected = selectedFor(facet.key);
        return (
          <fieldset className="pet-filter__facet" key={facet.key}>
            <legend className="pet-filter__legend">{facet.legend}</legend>
            <div className="pet-filter__chips" role="group" aria-label={facet.groupLabel}>
              {facet.options.map((opt) => {
                const on = selected.indexOf(opt.id) !== -1;
                // Para a faceta de status, pinta o chip selecionado com o
                // --pet-<status> (mesma identidade visual do marcador/legenda);
                // espécie/porte ficam no realce neutro --mdf (sem token de cor
                // próprio). A classe de status é derivada do id (sem hardcode).
                const statusClass = facet.key === 'statuses' ? ` pet-chip--${opt.id}` : '';
                const onClass = on
                  ? (facet.key === 'statuses' ? ' pet-chip--on' : ' mdf-chip--on')
                  : '';
                const baseClass = facet.key === 'statuses' ? 'pet-chip' : 'mdf-chip';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={on}
                    className={`pet-filter__chip ${baseClass}${statusClass}${onClass}`}
                    onClick={() => onToggle?.(facet.key, opt.id)}
                  >
                    {opt.icon && (
                      <span className="mdf-chip__icon" aria-hidden="true">{opt.icon}</span>
                    )}
                    <span className="mdf-chip__label">{opt.label}</span>
                    {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* Contagem de combinações — anunciada por AT. aria-live="polite" para não
          interromper; role="status" reforça em leitores que ignoram o atributo.
          A versão visível é calma e a SOT do número vem do pai (matchCount),
          derivado por filterPets — a barra não recomputa nada. */}
      <p className="pet-filter__count" role="status" aria-live="polite">
        {matchCountLabel(matchCount, total)}
      </p>
    </section>
  );
}

PetFilterBar.propTypes = {
  filter: PropTypes.shape({
    statuses: PropTypes.arrayOf(PropTypes.string),
    species: PropTypes.arrayOf(PropTypes.string),
    sizes: PropTypes.arrayOf(PropTypes.string),
  }),
  total: PropTypes.number,
  matchCount: PropTypes.number,
  onToggle: PropTypes.func,
  onClear: PropTypes.func,
};
