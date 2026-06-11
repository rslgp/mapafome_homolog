'use client';

// PetListView.js — PET-M8: alternativa em LISTA, rolável, ao mapa do /pets.
//
// FORK da ListView de fome (ux/ListView.js): mesma forma "linhas ordenadas,
// operáveis por teclado (<button>), com meta de distância+tempo e um chevron".
// MAS endurecida para o domínio /pets e a disciplina deste módulo:
//   • REUSA visiblePets (a MESMA lista que o mapa — já filtrada pelo PET-M7 e
//     podada por idade pelo PET-M12). A lista NÃO refiltra nada: o pai passa o
//     conjunto já visível, então a lista reflete exatamente o mapa (acceptance 1).
//   • REUSA o badge de status do PET-M11 (.pet-badge--solid + .pet-badge--<status>)
//     — sem re-derivar cor nem escrever 'perdido' hardcoded (lê PET_STATUS_MAP).
//   • REUSA a PetDetailSheet existente: tocar uma linha chama onPetClick(pet), o
//     MESMO handler do marcador do mapa. A sheet (compartilhada, não duplicada)
//     cuida do contrato de modal — captura o foco na abertura e o RESTAURA ao
//     trigger (a própria linha) no fechamento (acceptance 3).
//   • ORDENAÇÃO vem do helper PURO sortPetsForList (petDomain): por DISTÂNCIA
//     quando há centro GPS, senão por RECÊNCIA (acceptance 2). Esta UI não conhece
//     Haversine — só consome a lista ordenada e a distância por linha.
//
// A11y (Yablonski/Fitts + WCAG): cada linha é um <button> real (foco visível,
// operável por teclado, alvo >=44px via CSS), com aria-label que descreve a linha
// inteira para o leitor de tela (status + nome + descrição + tempo + distância),
// já que os spans visuais são fragmentados. A lista é role=list / role=listitem.

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './pets.css';
import { formatRelativeTime } from '../components/compatibility/components/mapUtils';
import {
  PET_STATUS_MAP,
  PET_SPECIES,
  PET_SIZES,
  petCoordsKey,
  sortPetsForList,
  petDistanceKm,
} from './petDomain';

// Lookups O(1) das listas SOT (espelha PetDetailSheet — uma só verdade da forma
// de espécie/porte). Nenhum label é escrito aqui; tudo vem do petDomain.
const SPECIES_MAP = PET_SPECIES.reduce((map, s) => { map[s.id] = s; return map; }, {});
const SIZE_MAP = PET_SIZES.reduce((map, s) => { map[s.id] = s; return map; }, {});

// "Cão · Médio · caramelo" — só as partes que existem, juntas por · (MESMA regra
// da PetDetailSheet.describePet; mantida aqui local porque a sheet não a exporta —
// uma duplicação pequena e deliberada, não vale acoplar a sheet à lista só por
// isto; ambas leem a mesma SOT, então não há risco de divergência de verdade).
function describePet(pet) {
  const parts = [];
  const sp = SPECIES_MAP[pet.species];
  if (sp) parts.push(sp.label);
  const sz = SIZE_MAP[pet.size];
  if (sz) parts.push(sz.label);
  const color = (pet.color || '').trim();
  if (color) parts.push(color);
  return parts.join(' · ');
}

// Distância humana e calma: <1 km em metros, senão km com 1 casa e vírgula pt-BR
// (espelha a ListView de fome). null/Infinity → '' (a distância só aparece quando
// é mensurável — i.e. com GPS). PURA.
function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export default function PetListView({ pets, center, nowMs, onPetClick }) {
  // Ordena pela regra PURA: distância (com centro GPS) senão recência. center
  // ausente/null → o helper cai na recência. Memoizado por (pets, center, nowMs).
  const ordered = useMemo(
    () => sortPetsForList(pets, center, nowMs),
    [pets, center, nowMs],
  );

  if (!Array.isArray(pets) || pets.length === 0) {
    // Vazio CALMO (mesmo tom do filtro): a lista reflete o mapa, então "nada aqui"
    // pode ser "nenhum pet reportado" OU "o filtro não casou nada" — a barra de
    // filtro (PET-M7, acima) já dá a contagem precisa; aqui só uma linha serena.
    return (
      <div className="pet-list" aria-label="Lista de pets">
        <p className="pet-list__empty">
          Nenhum pet para mostrar aqui agora. Tente afrouxar o filtro, ou relate um
          pet que você viu.
        </p>
      </div>
    );
  }

  return (
    <div className="pet-list">
      <ul className="pet-list__rows" role="list">
        {ordered.map((pet) => {
          const statusMeta = PET_STATUS_MAP[pet.status] || null;
          const statusId = statusMeta ? statusMeta.id : null;
          const statusLabel = statusMeta ? statusMeta.label : 'Pet';
          const descline = describePet(pet);
          const timeSince = formatRelativeTime(pet.dateIso);
          const km = petDistanceKm(pet, center);
          const distance = formatDistance(km);
          const name = (pet.name || '').trim() || 'Pet sem nome';
          // Identidade ESTÁVEL da linha (PET-M18 petCoordsKey, coords-keyed e
          // PII-free). Fallback ao dateIso para o caso raro de coords inválidas
          // (não acontece para um pet visível, mas a key do React precisa existir).
          const key = petCoordsKey(pet.coords) || `${pet.dateIso || ''}`;
          // aria-label da linha inteira: o leitor de tela ouve uma frase coesa em
          // vez de spans soltos. Distância só entra quando mensurável (com GPS).
          const aria = [statusLabel, name, descline, timeSince, distance]
            .filter(Boolean)
            .join(', ');
          // A classe de status do badge é DERIVADA do id (sem hardcode); só anexa
          // o modificador quando há status conhecido (degrada para o badge base).
          const badgeStatusClass = statusId ? ` pet-badge--${statusId}` : '';
          return (
            <li key={key} role="listitem">
              <button
                type="button"
                className="pet-list__row"
                onClick={() => onPetClick?.(pet)}
                aria-label={aria}
              >
                {/* Slot de foto (PET-M15) — reservado, ainda SEM imagem: um marcador
                    neutro com o glifo da espécie, para a fileira já ter o lugar da
                    miniatura sem um <img> quebrado. Decorativo (aria-hidden). */}
                <span className="pet-list__thumb" aria-hidden="true">
                  {(SPECIES_MAP[pet.species] && SPECIES_MAP[pet.species].icon) || '🐾'}
                </span>

                <span className="pet-list__body">
                  <span className="pet-list__top">
                    <span className={`pet-badge pet-badge--solid${badgeStatusClass}`}>
                      {statusMeta && (
                        <span className="pet-list__badge-icon" aria-hidden="true">
                          {statusMeta.icon}
                        </span>
                      )}
                      {statusLabel}
                    </span>
                    <span className="pet-list__name">{name}</span>
                  </span>

                  {descline && (
                    <span className="pet-list__descline">{descline}</span>
                  )}

                  <span className="pet-list__meta">
                    {distance && (
                      <>
                        <span className="pet-list__distance">{distance}</span>
                        <span className="pet-list__sep" aria-hidden="true">·</span>
                      </>
                    )}
                    {timeSince && (
                      <span className="pet-list__time">{timeSince}</span>
                    )}
                  </span>
                </span>

                <span className="pet-list__chev" aria-hidden="true">›</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

PetListView.propTypes = {
  // visiblePets do PetsApp — já filtrado (PET-M7) e podado por idade (PET-M12).
  pets: PropTypes.arrayOf(PropTypes.object),
  // Centro GPS do usuário [lat,lng], ou null/ausente quando não há GPS.
  center: PropTypes.arrayOf(PropTypes.number),
  // Relógio injetado (PetsApp) — parte da assinatura pura do sort (reservado).
  nowMs: PropTypes.number,
  // MESMO handler do marcador do mapa: abre a PetDetailSheet compartilhada.
  onPetClick: PropTypes.func,
};
