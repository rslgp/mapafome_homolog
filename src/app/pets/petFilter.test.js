// petFilter.test.js — PET-M7: predicado PURO do filtro do mapa.
//
// Cobre o contrato do matchesPetFilter (e dos helpers de filtro) nomeado no
// PET-M7 / no playbook de engenharia:
//   • filtro VAZIO combina com TODOS (estado inicial = todos os pets);
//   • uma única faceta estreita (status / espécie / porte);
//   • DENTRO de uma faceta é OR (perdido OU encontrado);
//   • ENTRE facetas é AND (status E espécie E porte);
//   • NUNCA lança em pet "lixo" (null, sem campos, tipos errados);
//   • as OPÇÕES vêm da SOT (PET_STATUSES/SPECIES/SIZES) — mudar a SOT muda o
//     filtro sem outra edição (ids lidos das listas, nunca 'perdido' hardcoded);
//   • nowMs é injetado: o predicado é determinístico (sem Date.now() dentro).
//
// São funções puras: sem mock, sem timers, sem render.

import { describe, it, expect } from 'vitest';
import {
  defaultPetFilter,
  matchesPetFilter,
  filterPets,
  countActivePetFilterFacets,
  togglePetFilterValue,
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
} from './petDomain';

// nowMs fixo: o predicado não usa o tempo hoje (faceta de recência é futura),
// mas injetamos um valor estável para travar a determinância da assinatura.
const NOW = 1_700_000_000_000;

// Ids reais lidos da SOT (não hardcoded) — se a lista crescer/mudar, o teste
// acompanha. Usamos os dois primeiros de cada faceta onde precisamos de "outro".
const ST = PET_STATUSES.map((s) => s.id);     // ['perdido','encontrado','avistado']
const SP = PET_SPECIES.map((s) => s.id);       // ['cao','gato','outro']
const SZ = PET_SIZES.map((s) => s.id);         // ['pequeno','medio','grande']

// Fábrica de pet parseado (forma do parsePetRow) com defaults sãos.
function pet({ status = ST[0], species = SP[0], size = SZ[0] } = {}) {
  return { coords: [-8, -34], status, species, size, dateIso: '2026-06-11T00:00:00.000Z' };
}

describe('defaultPetFilter — SOT da forma do filtro vazio', () => {
  it('devolve as três facetas vazias', () => {
    expect(defaultPetFilter()).toEqual({ statuses: [], species: [], sizes: [] });
  });

  it('devolve uma cópia NOVA a cada chamada (sem aliasing entre montagens)', () => {
    const a = defaultPetFilter();
    const b = defaultPetFilter();
    expect(a).not.toBe(b);
    expect(a.statuses).not.toBe(b.statuses);
    a.statuses.push(ST[0]);
    expect(b.statuses).toEqual([]); // mutar um não vaza para o outro
  });
});

describe('matchesPetFilter — filtro VAZIO combina com tudo', () => {
  it('todo pet (incl. ids de cada faceta) passa pelo filtro vazio', () => {
    const empty = defaultPetFilter();
    for (const s of ST) {
      for (const sp of SP) {
        for (const sz of SZ) {
          expect(matchesPetFilter(pet({ status: s, species: sp, size: sz }), empty, NOW)).toBe(true);
        }
      }
    }
  });

  it('filtro ausente (null/undefined) também combina com tudo', () => {
    expect(matchesPetFilter(pet(), null, NOW)).toBe(true);
    expect(matchesPetFilter(pet(), undefined, NOW)).toBe(true);
  });
});

describe('matchesPetFilter — uma única faceta estreita', () => {
  it('status: só o status escolhido combina', () => {
    const f = { ...defaultPetFilter(), statuses: [ST[0]] };
    expect(matchesPetFilter(pet({ status: ST[0] }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: ST[1] }), f, NOW)).toBe(false);
  });

  it('espécie: só a espécie escolhida combina', () => {
    const f = { ...defaultPetFilter(), species: [SP[1]] };
    expect(matchesPetFilter(pet({ species: SP[1] }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ species: SP[0] }), f, NOW)).toBe(false);
  });

  it('porte: só o porte escolhido combina', () => {
    const f = { ...defaultPetFilter(), sizes: [SZ[2]] };
    expect(matchesPetFilter(pet({ size: SZ[2] }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ size: SZ[0] }), f, NOW)).toBe(false);
  });
});

describe('matchesPetFilter — OR dentro de uma faceta', () => {
  it('status: combinar com QUALQUER um dos selecionados é suficiente', () => {
    const f = { ...defaultPetFilter(), statuses: [ST[0], ST[1]] };
    expect(matchesPetFilter(pet({ status: ST[0] }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: ST[1] }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: ST[2] }), f, NOW)).toBe(false);
  });
});

describe('matchesPetFilter — AND entre facetas', () => {
  it('precisa combinar em TODAS as facetas ativas', () => {
    const f = { statuses: [ST[0]], species: [SP[0]], sizes: [SZ[0]] };
    expect(matchesPetFilter(pet({ status: ST[0], species: SP[0], size: SZ[0] }), f, NOW)).toBe(true);
    // diverge em UMA faceta → exclui
    expect(matchesPetFilter(pet({ status: ST[1], species: SP[0], size: SZ[0] }), f, NOW)).toBe(false);
    expect(matchesPetFilter(pet({ status: ST[0], species: SP[1], size: SZ[0] }), f, NOW)).toBe(false);
    expect(matchesPetFilter(pet({ status: ST[0], species: SP[0], size: SZ[2] }), f, NOW)).toBe(false);
  });

  it('faceta vazia não restringe mesmo com outra ativa', () => {
    // só status ativo; espécie/porte vazios → qualquer espécie/porte passa
    const f = { ...defaultPetFilter(), statuses: [ST[0]] };
    expect(matchesPetFilter(pet({ status: ST[0], species: SP[2], size: SZ[1] }), f, NOW)).toBe(true);
  });
});

describe('matchesPetFilter — NUNCA lança em pet malformado', () => {
  it('pet null/undefined/sem campos não derruba e não combina com faceta ativa', () => {
    const active = { ...defaultPetFilter(), statuses: [ST[0]] };
    for (const garbage of [null, undefined, {}, { status: 123 }, { status: null }, [], 'pet', 42]) {
      expect(() => matchesPetFilter(garbage, active, NOW)).not.toThrow();
      expect(matchesPetFilter(garbage, active, NOW)).toBe(false);
    }
  });

  it('pet "lixo" ainda combina com o filtro VAZIO (sem restrição)', () => {
    const empty = defaultPetFilter();
    for (const garbage of [null, {}, { foo: 'bar' }]) {
      expect(matchesPetFilter(garbage, empty, NOW)).toBe(true);
    }
  });

  it('filtro com faceta não-array é tratado como vazia (defensivo)', () => {
    const weird = { statuses: 'perdido', species: null, sizes: undefined };
    expect(() => matchesPetFilter(pet(), weird, NOW)).not.toThrow();
    expect(matchesPetFilter(pet(), weird, NOW)).toBe(true);
  });
});

describe('filterPets — helper fino de array', () => {
  const pets = [
    pet({ status: ST[0], species: SP[0], size: SZ[0] }),
    pet({ status: ST[1], species: SP[1], size: SZ[1] }),
    pet({ status: ST[0], species: SP[1], size: SZ[2] }),
  ];

  it('filtro vazio devolve TODOS', () => {
    expect(filterPets(pets, defaultPetFilter(), NOW)).toHaveLength(3);
  });

  it('estreita por faceta (status) e por AND entre facetas', () => {
    expect(filterPets(pets, { ...defaultPetFilter(), statuses: [ST[0]] }, NOW)).toHaveLength(2);
    expect(filterPets(pets, { statuses: [ST[0]], species: [SP[1]], sizes: [] }, NOW)).toHaveLength(1);
  });

  it('entrada não-array devolve [] (defensivo)', () => {
    expect(filterPets(null, defaultPetFilter(), NOW)).toEqual([]);
    expect(filterPets(undefined, defaultPetFilter(), NOW)).toEqual([]);
    expect(filterPets('nope', defaultPetFilter(), NOW)).toEqual([]);
  });

  it('é determinístico: mesma entrada → mesma saída (nowMs injetado)', () => {
    const a = filterPets(pets, { ...defaultPetFilter(), statuses: [ST[0]] }, NOW);
    const b = filterPets(pets, { ...defaultPetFilter(), statuses: [ST[0]] }, NOW);
    expect(a).toEqual(b);
  });
});

describe('countActivePetFilterFacets — quantas facetas estão ativas', () => {
  it('conta só as facetas não-vazias', () => {
    expect(countActivePetFilterFacets(defaultPetFilter())).toBe(0);
    expect(countActivePetFilterFacets({ ...defaultPetFilter(), statuses: [ST[0]] })).toBe(1);
    expect(countActivePetFilterFacets({ statuses: [ST[0]], species: [SP[0]], sizes: [SZ[0]] })).toBe(3);
  });

  it('defende contra filtro ausente / facetas não-array', () => {
    expect(countActivePetFilterFacets(null)).toBe(0);
    expect(countActivePetFilterFacets({ statuses: 'x', species: null, sizes: undefined })).toBe(0);
  });
});

describe('togglePetFilterValue — toggle PURO e IMUTÁVEL', () => {
  it('adiciona um id ausente sem mutar o filtro anterior', () => {
    const before = defaultPetFilter();
    const after = togglePetFilterValue(before, 'statuses', ST[0]);
    expect(after.statuses).toEqual([ST[0]]);
    expect(before.statuses).toEqual([]); // original intacto
    expect(after).not.toBe(before);
  });

  it('remove um id já presente', () => {
    const f = { ...defaultPetFilter(), statuses: [ST[0], ST[1]] };
    const after = togglePetFilterValue(f, 'statuses', ST[0]);
    expect(after.statuses).toEqual([ST[1]]);
  });

  it('opera independentemente por faceta', () => {
    let f = defaultPetFilter();
    f = togglePetFilterValue(f, 'statuses', ST[0]);
    f = togglePetFilterValue(f, 'species', SP[1]);
    f = togglePetFilterValue(f, 'sizes', SZ[2]);
    expect(f).toEqual({ statuses: [ST[0]], species: [SP[1]], sizes: [SZ[2]] });
  });

  it('faceta desconhecida é no-op seguro (devolve um clone inalterado)', () => {
    const f = { ...defaultPetFilter(), statuses: [ST[0]] };
    const after = togglePetFilterValue(f, 'cor', 'preto');
    expect(after).toEqual({ statuses: [ST[0]], species: [], sizes: [] });
    expect(after).not.toBe(f);
  });

  it('filtro de partida ausente parte do filtro vazio', () => {
    const after = togglePetFilterValue(null, 'statuses', ST[0]);
    expect(after).toEqual({ statuses: [ST[0]], species: [], sizes: [] });
  });
});
