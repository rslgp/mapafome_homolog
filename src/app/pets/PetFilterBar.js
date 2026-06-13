'use client';

// PetFilterBar.js — PET-M7: filtro compacto que estreita os PINS do mapa por
// status / espécie / COR / porte / RECÊNCIA. UI burra: NÃO conhece os pets nem
// aplica o predicado — só desenha as opções (lidas da SOT petDomain), reporta
// toggles/seleções ao pai (PetsApp, dono do estado) e ANUNCIA a contagem de
// combinações via aria-live.
//
// Por que aqui e não no PetMap: o estado de filtro mora no PetsApp (que já é dono
// de `pets`), que deriva os pets visíveis com filterPets() e os passa ao
// PetMarkers. Esta barra é uma superfície de CONTROLE pura — testável sem Leaflet.
//
// FONTE ÚNICA: as facetas iteram PET_STATUSES / PET_SPECIES / PET_COLORS /
// PET_SIZES / PET_RECENCY_OPTIONS. Nenhum label/id é escrito aqui — mudar a SOT
// muda os chips sem outra edição. Nenhuma string 'perdido'/'caramelo' hardcoded.
//
// ORDEM das facetas (decisão do game-designer, NÃO reabrir): Situação → Espécie →
// COR → Porte → RECÊNCIA. Certeza primeiro (situação/espécie), aparência depois
// (cor/porte) e o eixo de TEMPO por ÚLTIMO (recência) — é o adjacente à ansiedade,
// então fica no fim, fora do caminho de quem só quer olhar o mapa.
//
// FORMA das facetas (duas famílias):
//   • MULTI-SELEÇÃO (toggle/OR interno): status/espécie/cor/porte. Cada chip é um
//     <button aria-pressed> (um toggle, não um radio — seleção MÚLTIPLA = OR).
//   • SINGLE-SELEÇÃO (radio-like): RECÊNCIA. 7⊂30⊂90 são aninhados — multi não tem
//     significado. Modelado como role=radiogroup + role=radio (aria-checked):
//     escolher um deseleciona os outros; tocar o ATIVO de novo limpa (→ null).
//
// A11y (Yablonski/Fitts + WCAG):
//   • cada faceta é um group/radiogroup rotulado, com aria-label explícito;
//   • alvos >=44px (geometria herdada de .mdf-chip via --mdf-touch-target);
//   • a contagem de combinações vai numa região aria-live="polite" para o leitor
//     de tela anunciar "N pets no mapa" a cada mudança;
//   • "limpar filtros" só aparece quando há faceta ativa (Hick) e é um alvo >=44px.
//     CALM-TONE (PET_CURVE §2): a contagem ZERO nunca é um beco sem saída — quando
//     o filtro estreitou demais, a cópia frama o FILTRO (não a ausência do pet) e
//     um "limpar" inline fica ALI MESMO, a um toque, junto da contagem.

import React from 'react';
import PropTypes from 'prop-types';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_COLORS,
  PET_SIZES,
  PET_RECENCY_OPTIONS,
  countActivePetFilterFacets,
} from './petDomain';
import { t, useLocale } from '../components/compatibility/components/ux/strings';

// Descreve as facetas MULTI-SELEÇÃO de forma declarativa (DRY): cada uma aponta
// para a lista SOT, a chave do estado de filtro (array de ids), a CHAVE i18n do
// rótulo (resolvida via t()) e o NAMESPACE i18n das opções (pets.<optNs>.<id>.
// label). Iterar isto evita repetir o markup de chips e mantém os rótulos fora do
// código. A RECÊNCIA NÃO está aqui: é single-select (radiogroup) e tem o seu
// próprio bloco de render abaixo (forma diferente do estado + semântica ARIA).
//
// A ORDEM deste array É a ordem de cima→baixo na UI: status → espécie → COR →
// porte (a recência, single-select, é renderizada LOGO DEPOIS, fechando a barra).
const FACETS = [
  { key: 'statuses', legendKey: 'pets.filter.legend.status',  groupKey: 'pets.filter.group.status',  optNs: 'status',  options: PET_STATUSES },
  { key: 'species',  legendKey: 'pets.filter.legend.species', groupKey: 'pets.filter.group.species', optNs: 'species', options: PET_SPECIES },
  { key: 'colors',   legendKey: 'pets.filter.legend.color',   groupKey: 'pets.filter.group.color',   optNs: 'color',   options: PET_COLORS },
  { key: 'sizes',    legendKey: 'pets.filter.legend.size',    groupKey: 'pets.filter.group.size',    optNs: 'size',    options: PET_SIZES },
];

// Pluraliza a contagem de combinações com tom calmo (sem alarme). Resolve a cópia
// via t() (i18n) por caso — o número é interpolado em JS para a tradução só
// envolver as palavras ao redor.
function matchCountLabel(count, total) {
  if (total === 0) return t('pets.filter.count.noneTotal');
  if (count === 0) return t('pets.filter.count.noneMatch');
  if (count === total) {
    return count === 1
      ? t('pets.filter.count.allOne')
      : t('pets.filter.count.all').replace('{count}', String(count));
  }
  const key = count === 1 ? 'pets.filter.count.someOne' : 'pets.filter.count.some';
  return t(key).replace('{count}', String(count)).replace('{total}', String(total));
}

export default function PetFilterBar({ filter, total, matchCount, expanded, onToggleOpen, onToggle, onSetRecency, onClear }) {
  // PET-M23 — re-render on a locale switch so every t() re-reads.
  useLocale();
  const activeFacets = countActivePetFilterFacets(filter);
  const hasActive = activeFacets > 0;

  // DISCLOSURE (toggle): a barra inteira colapsa atrás de um botão "Filtros 🐾".
  // O painel CONTINUA MONTADO (só escondido com `hidden`) — o estado de filtro
  // do dono que procura o pet sobrevive ao colapsar/expandir, e o aria-live da
  // contagem não reanuncia do zero. `expanded` é controlado pelo pai (PetsApp);
  // se o pai não passar a prop (uso legado), assume ABERTO para não esconder os
  // filtros por engano (degradação segura). aria-expanded/aria-controls ligam o
  // botão ao corpo para o leitor de tela anunciar o estado.
  const isOpen = expanded !== false; // undefined (legado) → aberto

  // Lê o array de ids selecionados de uma faceta com defesa (faceta ausente → []).
  const selectedFor = (key) => (filter && Array.isArray(filter[key]) ? filter[key] : []);
  // Recência ATIVA = recencyDays é um número finito (null = inativa). Defensivo.
  const activeRecency = filter && Number.isFinite(filter.recencyDays) ? filter.recencyDays : null;

  return (
    <section className="pet-filter" aria-labelledby="pet-filter-heading">
      <div className="pet-filter__head">
        {/* Botão DISCLOSURE — alterna o painel. 🐾 + "Filtros" + (se houver faceta
            ativa) um badge com a contagem, para o dono saber que filtros estão
            ligados mesmo com o painel fechado. Alvo >=44px (geometria do chip).
            aria-expanded reflete o estado; aria-controls aponta o corpo. */}
        <button
          type="button"
          className={`pet-filter__toggle${isOpen ? ' pet-filter__toggle--open' : ''}`}
          aria-expanded={isOpen}
          aria-controls="pet-filter-body"
          aria-label={isOpen ? t('pets.filter.toggle.hide') : t('pets.filter.toggle.show')}
          onClick={onToggleOpen}
        >
          <span className="pet-filter__toggle-icon" aria-hidden="true">🐾</span>
          <span className="pet-filter__toggle-label">{t('pets.filter.toggle')}</span>
          {hasActive && (
            <span
              className="pet-filter__toggle-badge"
              aria-label={t('pets.filter.toggle.active').replace('{count}', String(activeFacets))}
            >
              {activeFacets}
            </span>
          )}
          <span className="pet-filter__toggle-caret" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
        </button>
        {isOpen && hasActive && (
          <button
            type="button"
            className="pet-filter__clear"
            onClick={onClear}
          >
            <span aria-hidden="true">✕</span> {t('pets.filter.clear')}
          </button>
        )}
      </div>

      <h2 id="pet-filter-heading" className="mdf-sr-only">
        {t('pets.filter.heading')}
      </h2>

      {/* CORPO colapsável — montado sempre (estado preservado), escondido com
          `hidden` quando fechado. id casa com o aria-controls do botão acima. */}
      <div id="pet-filter-body" className="pet-filter__body" hidden={!isOpen}>
      {FACETS.map((facet) => {
        const selected = selectedFor(facet.key);
        return (
          <fieldset className="pet-filter__facet" key={facet.key}>
            <legend className="pet-filter__legend">{t(facet.legendKey)}</legend>
            <div className="pet-filter__chips" role="group" aria-label={t(facet.groupKey)}>
              {facet.options.map((opt) => {
                const on = selected.indexOf(opt.id) !== -1;
                // Para a faceta de status, pinta o chip selecionado com o
                // --pet-<status> (mesma identidade visual do marcador/legenda);
                // espécie/cor/porte ficam no realce neutro --mdf (sem token de cor
                // próprio — um agente de coloração é o dono das HUES das cores; aqui
                // só reusamos o realce neutro). A classe de status deriva do id.
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
                    <span className="mdf-chip__label">{t(`pets.${facet.optNs}.${opt.id}.label`)}</span>
                    {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {/* RECÊNCIA — single-select (radio-like). Vem por ÚLTIMO (eixo de TEMPO,
          adjacente à ansiedade — fora do caminho de quem só olha o mapa). Os
          labels são JANELAS NEUTRAS ("Últimos 7 dias"), NUNCA veredictos de
          frescor (CALM-TONE PET_CURVE §2.2: nada de "relógio que corre contra
          você"). Semântica ARIA: role=radiogroup + role=radio (aria-checked) —
          escolher um deseleciona os outros; tocar o ATIVO de novo limpa (→ null,
          via setPetFilterRecency no pai, que detecta o toggle-off). */}
      <fieldset className="pet-filter__facet">
        <legend className="pet-filter__legend">{t('pets.filter.legend.recency')}</legend>
        <div className="pet-filter__chips" role="radiogroup" aria-label={t('pets.filter.group.recency')}>
          {PET_RECENCY_OPTIONS.map((opt) => {
            const on = activeRecency === opt.days;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`pet-filter__chip mdf-chip${on ? ' mdf-chip--on' : ''}`}
                // SINGLE-select: sempre manda o `days` tocado. O setter no domínio
                // (setPetFilterRecency) faz o toggle-off quando o valor já está
                // ativo — a UI manda o id tocado sem checar antes (idempotente).
                onClick={() => onSetRecency?.(opt.days)}
              >
                <span className="mdf-chip__label">{t(`pets.recency.${opt.id}.label`)}</span>
                {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Contagem de combinações — anunciada por AT. aria-live="polite" para não
          interromper; role="status" reforça em leitores que ignoram o atributo.
          A versão visível é calma e a SOT do número vem do pai (matchCount),
          derivado por filterPets — a barra não recomputa nada.

          CALM-TONE (PET_CURVE §2 / guardrail do game-designer): quando a contagem
          é ZERO com filtro ativo, a cópia já frama o FILTRO (não a ausência do
          pet) E um "limpar" INLINE fica ALI MESMO — a contagem 0 nunca é um beco
          sem saída: a recuperação está a um toque, junto do número, não só no topo
          da barra. */}
      <p className="pet-filter__count" role="status" aria-live="polite">
        <span className="pet-filter__count-text">{matchCountLabel(matchCount, total)}</span>
        {matchCount === 0 && hasActive && (
          <button
            type="button"
            className="pet-filter__count-clear"
            onClick={onClear}
          >
            {t('pets.filter.count.clearInline')}
          </button>
        )}
      </p>
      </div>
    </section>
  );
}

PetFilterBar.propTypes = {
  filter: PropTypes.shape({
    statuses: PropTypes.arrayOf(PropTypes.string),
    species: PropTypes.arrayOf(PropTypes.string),
    colors: PropTypes.arrayOf(PropTypes.string),
    sizes: PropTypes.arrayOf(PropTypes.string),
    recencyDays: PropTypes.number,
  }),
  total: PropTypes.number,
  matchCount: PropTypes.number,
  // DISCLOSURE: `expanded` controla o colapso (undefined → aberto, p/ uso legado);
  // `onToggleOpen` é chamado ao tocar o botão "Filtros" (o pai inverte o estado).
  expanded: PropTypes.bool,
  onToggleOpen: PropTypes.func,
  onToggle: PropTypes.func,
  onSetRecency: PropTypes.func,
  onClear: PropTypes.func,
};
