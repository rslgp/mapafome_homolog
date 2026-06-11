'use client';

// PetFilterBar — barra de filtros colapsável acima do mapa de /pets (PET-M7).
//
// Ajuda um dono aflito a estreitar os pins até achar O SEU pet, pelo "conjunto
// completo de reconhecimento": situação + espécie + porte + COR (texto livre) +
// RECÊNCIA (reportado nos últimos N dias).
//
// CONTRATO: componente CONTROLADO. O estado do filtro mora no PetsApp; aqui só
// renderizamos e propagamos `onChange(próximoFiltro)`. NÃO re-derivamos nenhuma
// regra de filtragem — toda a lógica é do petDomain (matchesPetFilter/filterPets);
// esta camada só monta os controles e o objeto de filtro na forma canônica.
//
// Forma do filtro (a ÚNICA forma — ver petDomain.defaultPetFilter):
//   { statuses: string[], species: string[], sizes: string[],
//     color: string, recencyDays: number|null }
// Array vazio / '' / null = "sem restrição nesta faceta".
//
// a11y (equivalente web do rigor de contrato das superfícies):
//   • o expander é um <button> de verdade (aria-expanded + aria-controls);
//   • cada chip é <button type=button aria-pressed> (faceta = multi-seleção,
//     então aria-pressed, NÃO role=radio — distinto do single-select do
//     PetReportSheet);
//   • a contagem viva mora numa região aria-live="polite" (role=status) para o
//     leitor de tela anunciar "Mostrando N de M pets" a cada mudança;
//   • todo alvo >= 44px (var(--mdf-touch-target)); anel de foco sempre visível.
// Cópia pt-BR, calma e digna (sem urgência, sem alarme) — PET-M23 cuida do i18n.

import React, { useId } from 'react';
import PropTypes from 'prop-types';
import {
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_RECENCY_OPTIONS,
  RECENCY_MAP,
  defaultPetFilter,
} from './petDomain';

// Liga/desliga um id numa faceta de multi-seleção, devolvendo um array NOVO
// (puro — não muta a seleção atual). Vazio = "sem restrição".
function toggleInArray(arr, id) {
  const list = Array.isArray(arr) ? arr : [];
  return list.indexOf(id) === -1 ? [...list, id] : list.filter((x) => x !== id);
}

// "Alguma faceta ativa?" — controla a visibilidade do "Limpar filtros" e a
// cópia da contagem. Espelha a semântica do defaultPetFilter (tudo vazio = sem
// restrição), sem re-derivar nenhuma regra de match.
function isAnyFacetActive(filter) {
  const f = filter || {};
  return (
    (Array.isArray(f.statuses) && f.statuses.length > 0)
    || (Array.isArray(f.species) && f.species.length > 0)
    || (Array.isArray(f.sizes) && f.sizes.length > 0)
    || (typeof f.color === 'string' && f.color.trim() !== '')
    || f.recencyDays != null
  );
}

// Plural digno em pt-BR: "1 pet" / "N pets".
function petCountLabel(n) {
  return n === 1 ? '1 pet' : `${n} pets`;
}

export default function PetFilterBar({ filter, onChange, matchCount, total }) {
  const [open, setOpen] = React.useState(false);
  const baseId = useId();
  const bodyId = `${baseId}-body`;

  const f = filter || defaultPetFilter();
  const anyActive = isAnyFacetActive(f);

  // Cada handler monta o PRÓXIMO filtro na forma canônica e o entrega ao pai.
  function patch(next) {
    onChange?.({ ...f, ...next });
  }

  function toggleStatus(id) { patch({ statuses: toggleInArray(f.statuses, id) }); }
  function toggleSpecies(id) { patch({ species: toggleInArray(f.species, id) }); }
  function toggleSize(id) { patch({ sizes: toggleInArray(f.sizes, id) }); }
  function setColor(value) { patch({ color: value }); }

  // Recência é single-select (uma janela por vez): tocar a ativa de novo limpa.
  function toggleRecency(id) {
    const days = RECENCY_MAP[id] ? RECENCY_MAP[id].days : null;
    patch({ recencyDays: f.recencyDays === days ? null : days });
  }

  function clearAll() { onChange?.(defaultPetFilter()); }

  // Texto da contagem viva. Sem filtro ativo, anuncia o total simples; com
  // filtro, "Mostrando N de M" (e a dica calma quando zera).
  const countText = anyActive
    ? `Mostrando ${petCountLabel(matchCount)} de ${total}`
    : `${petCountLabel(total)} no mapa`;

  return (
    <section className="pet-filterbar" aria-label="Filtrar pets">
      <div className="pet-filterbar__bar">
        <button
          type="button"
          className={`pet-filterbar__toggle${open ? ' pet-filterbar__toggle--open' : ''}`}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="pet-filterbar__toggle-icon" aria-hidden="true">⚲</span>
          <span className="pet-filterbar__toggle-label">Filtrar</span>
          {anyActive && (
            <span className="pet-filterbar__toggle-dot" aria-hidden="true" />
          )}
          <span className="pet-filterbar__toggle-caret" aria-hidden="true">
            {open ? '▴' : '▾'}
          </span>
        </button>

        {/* Contagem viva — anunciada por AT a cada mudança de filtro. */}
        <p className="pet-filterbar__count" role="status" aria-live="polite">
          {countText}
        </p>
      </div>

      <div id={bodyId} className="pet-filterbar__body" hidden={!open}>
        {/* ── Situação ── */}
        <fieldset className="pet-filterbar__group">
          <legend className="pet-filterbar__legend">Situação</legend>
          <div className="pet-filterbar__chips" role="group" aria-label="Filtrar por situação">
            {PET_STATUSES.map((s) => {
              const on = Array.isArray(f.statuses) && f.statuses.indexOf(s.id) !== -1;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  className={`mdf-chip pet-filterbar__chip pet-filterbar__chip--${s.id}${on ? ' mdf-chip--on pet-filterbar__chip--on' : ''}`}
                  onClick={() => toggleStatus(s.id)}
                >
                  <span className="mdf-chip__icon" aria-hidden="true">{s.icon}</span>
                  <span className="mdf-chip__label">{s.label}</span>
                  {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── Espécie ── */}
        <fieldset className="pet-filterbar__group">
          <legend className="pet-filterbar__legend">Espécie</legend>
          <div className="pet-filterbar__chips" role="group" aria-label="Filtrar por espécie">
            {PET_SPECIES.map((s) => {
              const on = Array.isArray(f.species) && f.species.indexOf(s.id) !== -1;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  className={`mdf-chip pet-filterbar__chip${on ? ' mdf-chip--on pet-filterbar__chip--on' : ''}`}
                  onClick={() => toggleSpecies(s.id)}
                >
                  <span className="mdf-chip__icon" aria-hidden="true">{s.icon}</span>
                  <span className="mdf-chip__label">{s.label}</span>
                  {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── Porte ── */}
        <fieldset className="pet-filterbar__group">
          <legend className="pet-filterbar__legend">Porte</legend>
          <div className="pet-filterbar__chips" role="group" aria-label="Filtrar por porte">
            {PET_SIZES.map((s) => {
              const on = Array.isArray(f.sizes) && f.sizes.indexOf(s.id) !== -1;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  className={`mdf-chip pet-filterbar__chip${on ? ' mdf-chip--on pet-filterbar__chip--on' : ''}`}
                  onClick={() => toggleSize(s.id)}
                >
                  <span className="mdf-chip__label">{s.label}</span>
                  {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ── Cor / pelagem (texto livre) ── */}
        <div className="pet-filterbar__group">
          <label className="pet-filterbar__legend" htmlFor={`${baseId}-color`}>
            Cor / pelagem
          </label>
          <input
            id={`${baseId}-color`}
            type="text"
            className="mdf-sheet__input pet-input pet-filterbar__color"
            placeholder="Cor / pelagem — ex.: caramelo"
            maxLength={40}
            value={f.color || ''}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        {/* ── Recência (single-select; tocar a ativa de novo limpa) ── */}
        <fieldset className="pet-filterbar__group">
          <legend className="pet-filterbar__legend">Quando foi reportado</legend>
          <div className="pet-filterbar__chips" role="group" aria-label="Filtrar por recência">
            {PET_RECENCY_OPTIONS.map((r) => {
              const on = f.recencyDays === r.days;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  className={`mdf-chip pet-filterbar__chip${on ? ' mdf-chip--on pet-filterbar__chip--on' : ''}`}
                  onClick={() => toggleRecency(r.id)}
                >
                  <span className="mdf-chip__label">{r.label}</span>
                  {on && <span className="mdf-chip__check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Dica calma quando o filtro não casa ninguém (nenhuma urgência). */}
        {anyActive && matchCount === 0 && (
          <p className="pet-filterbar__empty">
            Nenhum pet com esses filtros — toque em Limpar filtros.
          </p>
        )}

        {/* "Limpar filtros" — secundário e quieto; só aparece com filtro ativo. */}
        {anyActive && (
          <div className="pet-filterbar__actions">
            <button
              type="button"
              className="pet-filterbar__clear"
              onClick={clearAll}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

PetFilterBar.propTypes = {
  filter: PropTypes.shape({
    statuses: PropTypes.arrayOf(PropTypes.string),
    species: PropTypes.arrayOf(PropTypes.string),
    sizes: PropTypes.arrayOf(PropTypes.string),
    color: PropTypes.string,
    recencyDays: PropTypes.number,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  matchCount: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};
