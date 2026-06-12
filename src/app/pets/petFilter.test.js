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
  setPetFilterRecency,
  normalizePetColorToBucket,
  PET_STATUSES,
  PET_SPECIES,
  PET_SIZES,
  PET_COLORS,
  PET_RECENCY_OPTIONS,
  PET_RECENCY_MAP,
} from './petDomain';

// nowMs fixo: o predicado AGORA usa o tempo na faceta de recência. Travamos um
// valor estável para que a idade de cada pet seja determinística no teste.
const NOW = 1_700_000_000_000;

// Helper: um ISO a `days` dias ANTES de NOW (idade exata, sem Date.now()).
function isoDaysAgo(days) {
  return new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
}

// Ids reais lidos da SOT (não hardcoded) — se a lista crescer/mudar, o teste
// acompanha. Usamos os dois primeiros de cada faceta onde precisamos de "outro".
const ST = PET_STATUSES.map((s) => s.id);     // ['perdido','encontrado','avistado']
const SP = PET_SPECIES.map((s) => s.id);       // ['cao','gato','outro']
const SZ = PET_SIZES.map((s) => s.id);         // ['pequeno','medio','grande']

// Fábrica de pet parseado (forma do parsePetRow) com defaults sãos. `color` é
// texto livre (como o parsePetRow entrega); `dateIso` default ~1 dia atrás de NOW
// (recente em qualquer janela) para os testes que não focam recência.
function pet({ status = ST[0], species = SP[0], size = SZ[0], color = '', dateIso } = {}) {
  return {
    coords: [-8, -34],
    status,
    species,
    size,
    color,
    dateIso: dateIso || isoDaysAgo(1),
  };
}

describe('defaultPetFilter — SOT da forma do filtro vazio', () => {
  it('devolve as cinco facetas no estado vazio (colors:[] + recencyDays:null)', () => {
    expect(defaultPetFilter()).toEqual({
      statuses: [], species: [], sizes: [], colors: [], recencyDays: null,
    });
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

  it('opera independentemente por faceta (incl. colors), preservando recência', () => {
    let f = defaultPetFilter();
    f = togglePetFilterValue(f, 'statuses', ST[0]);
    f = togglePetFilterValue(f, 'species', SP[1]);
    f = togglePetFilterValue(f, 'sizes', SZ[2]);
    f = togglePetFilterValue(f, 'colors', 'preto');
    expect(f).toEqual({
      statuses: [ST[0]], species: [SP[1]], sizes: [SZ[2]], colors: ['preto'], recencyDays: null,
    });
  });

  it('faceta desconhecida é no-op seguro (devolve um clone com TODAS as facetas)', () => {
    const f = { ...defaultPetFilter(), statuses: [ST[0]] };
    const after = togglePetFilterValue(f, 'inexistente', 'x');
    expect(after).toEqual({
      statuses: [ST[0]], species: [], sizes: [], colors: [], recencyDays: null,
    });
    expect(after).not.toBe(f);
  });

  it("'recencyDays' NÃO é toggle-ável aqui (single-select usa setPetFilterRecency)", () => {
    // Passar a chave de recência ao toggle de array é no-op seguro: não deve
    // crashar tentando .indexOf num número, e não altera a recência.
    const f = setPetFilterRecency(defaultPetFilter(), 30);
    const after = togglePetFilterValue(f, 'recencyDays', 7);
    expect(after.recencyDays).toBe(30); // inalterada
    expect(after).not.toBe(f);
  });

  it('togglePetFilterValue preserva uma recência já ativa (não a derruba)', () => {
    const withRecency = setPetFilterRecency(defaultPetFilter(), 7);
    const after = togglePetFilterValue(withRecency, 'colors', 'caramelo');
    expect(after.colors).toEqual(['caramelo']);
    expect(after.recencyDays).toBe(7); // a recência sobreviveu ao toggle de cor
  });

  it('filtro de partida ausente parte do filtro vazio (cinco facetas)', () => {
    const after = togglePetFilterValue(null, 'statuses', ST[0]);
    expect(after).toEqual({
      statuses: [ST[0]], species: [], sizes: [], colors: [], recencyDays: null,
    });
  });
});

describe('normalizePetColorToBucket — texto livre → bucket de PET_COLORS', () => {
  const BUCKET_IDS = new Set(PET_COLORS.map((c) => c.id));

  it('mapeia variações conhecidas para o bucket esperado', () => {
    const cases = [
      ['preto', 'preto'], ['Pretinho', 'preto'], ['PRETO', 'preto'], ['negro', 'preto'],
      ['branco', 'branco'], ['Branquinho', 'branco'], ['albino', 'branco'],
      ['caramelo', 'caramelo'], ['caramelado', 'caramelo'], ['Dourado', 'caramelo'],
      ['amarelo', 'caramelo'], ['laranja', 'caramelo'], ['mel', 'caramelo'],
      ['marrom', 'marrom'], ['castanho', 'marrom'], ['chocolate', 'marrom'], ['marron', 'marrom'],
      ['cinza', 'cinza'], ['Cinzento', 'cinza'], ['grafite', 'cinza'], ['prata', 'cinza'],
      ['rajado', 'rajado'], ['tigrado', 'rajado'], ['malhado', 'rajado'], ['listrado', 'rajado'],
      ['claro', 'claro'], ['clarinho', 'claro'],
    ];
    for (const [input, expected] of cases) {
      expect(normalizePetColorToBucket(input)).toBe(expected);
    }
  });

  it('é insensível a ACENTO e CAIXA', () => {
    // "cinzá"/"CÁRÁMÉLO" não são pt-BR real, mas provam o strip de diacrítico+caixa.
    expect(normalizePetColorToBucket('Cinzá')).toBe('cinza');
    expect(normalizePetColorToBucket('CARÁMÉLADO')).toBe('caramelo');
    expect(normalizePetColorToBucket('  Preto  ')).toBe('preto');
  });

  it('precedência: cor concreta vence o genérico "claro" numa frase composta', () => {
    // "marrom claro" contém ambas as pistas; a cor dominante (marrom) vence.
    expect(normalizePetColorToBucket('marrom claro')).toBe('marrom');
    expect(normalizePetColorToBucket('caramelo claro')).toBe('caramelo');
    // "rajado preto": o PADRÃO domina a percepção → rajado, não preto.
    expect(normalizePetColorToBucket('gato rajado preto')).toBe('rajado');
  });

  it("vazio / desconhecido → 'outro' (balde-âncora)", () => {
    expect(normalizePetColorToBucket('')).toBe('outro');
    expect(normalizePetColorToBucket('   ')).toBe('outro');
    expect(normalizePetColorToBucket('roxo-neon-inventado')).toBe('outro');
  });

  it('NUNCA lança e SEMPRE devolve um id válido de PET_COLORS', () => {
    for (const garbage of [null, undefined, 123, {}, [], true, NaN]) {
      let result;
      expect(() => { result = normalizePetColorToBucket(garbage); }).not.toThrow();
      expect(BUCKET_IDS.has(result)).toBe(true);
    }
  });
});

describe('matchesPetFilter — faceta de COR (via bucket do texto livre)', () => {
  it('um pet marrom casa colors:[marrom] mas não colors:[preto]', () => {
    const brownPet = pet({ color: 'marrom escuro' });
    expect(matchesPetFilter(brownPet, { ...defaultPetFilter(), colors: ['marrom'] }, NOW)).toBe(true);
    expect(matchesPetFilter(brownPet, { ...defaultPetFilter(), colors: ['preto'] }, NOW)).toBe(false);
  });

  it('o texto livre é normalizado: "caramelado" casa o chip caramelo', () => {
    const p = pet({ color: 'Caramelado' });
    expect(matchesPetFilter(p, { ...defaultPetFilter(), colors: ['caramelo'] }, NOW)).toBe(true);
  });

  it('OR dentro da faceta de cor (preto OU caramelo)', () => {
    const f = { ...defaultPetFilter(), colors: ['preto', 'caramelo'] };
    expect(matchesPetFilter(pet({ color: 'pretinho' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ color: 'dourado' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ color: 'cinza' }), f, NOW)).toBe(false);
  });

  it('faceta de cor VAZIA = sem restrição (pet sem cor ainda aparece)', () => {
    expect(matchesPetFilter(pet({ color: '' }), defaultPetFilter(), NOW)).toBe(true);
    expect(matchesPetFilter(pet({ color: 'qualquer coisa' }), defaultPetFilter(), NOW)).toBe(true);
  });

  it("um pet sem cor reconhecível casa colors:['outro']", () => {
    expect(matchesPetFilter(pet({ color: 'roxo-inventado' }), { ...defaultPetFilter(), colors: ['outro'] }, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ color: '' }), { ...defaultPetFilter(), colors: ['outro'] }, NOW)).toBe(true);
  });
});

describe('matchesPetFilter — faceta de RECÊNCIA (nowMs injetado, determinístico)', () => {
  it('recencyDays null combina com TODOS (sem restrição), mesmo um pet bem antigo', () => {
    const oldPet = pet({ dateIso: isoDaysAgo(400) });
    expect(matchesPetFilter(oldPet, { ...defaultPetFilter(), recencyDays: null }, NOW)).toBe(true);
    expect(matchesPetFilter(oldPet, defaultPetFilter(), NOW)).toBe(true);
  });

  it('um pet de 5 dias casa a janela de 7, 30 e 90', () => {
    const p = pet({ dateIso: isoDaysAgo(5) });
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 7 }, NOW)).toBe(true);
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 30 }, NOW)).toBe(true);
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 90 }, NOW)).toBe(true);
  });

  it('um pet de 40 dias casa 90 mas NÃO 7 nem 30', () => {
    const p = pet({ dateIso: isoDaysAgo(40) });
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 7 }, NOW)).toBe(false);
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 30 }, NOW)).toBe(false);
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 90 }, NOW)).toBe(true);
  });

  it('o limite é INCLUSIVO: um pet de exatamente 7 dias casa a janela de 7', () => {
    const p = pet({ dateIso: isoDaysAgo(7) });
    expect(matchesPetFilter(p, { ...defaultPetFilter(), recencyDays: 7 }, NOW)).toBe(true);
  });

  it('FAIL-CLOSED: dateIso ausente/ilegível é EXCLUÍDO quando a recência está ativa', () => {
    const noDate = { coords: [-8, -34], status: ST[0], species: SP[0], size: SZ[0], color: '', dateIso: undefined };
    const badDate = { ...noDate, dateIso: 'não-é-uma-data' };
    expect(matchesPetFilter(noDate, { ...defaultPetFilter(), recencyDays: 30 }, NOW)).toBe(false);
    expect(matchesPetFilter(badDate, { ...defaultPetFilter(), recencyDays: 30 }, NOW)).toBe(false);
    // ...mas SEM a recência ativa, o mesmo pet aparece (a exclusão é só sob o filtro).
    expect(matchesPetFilter(noDate, defaultPetFilter(), NOW)).toBe(true);
  });

  it('os baldes de recência são SUBCONJUNTOS da janela de arquivo (todos ≤ 90)', () => {
    for (const r of PET_RECENCY_OPTIONS) {
      expect(r.days).toBeLessThanOrEqual(90);
      expect(PET_RECENCY_MAP[r.id]).toBe(r); // lookup O(1) espelha a lista
    }
  });
});

describe('matchesPetFilter — AND entre as NOVAS facetas e as antigas', () => {
  it('status AND cor: precisa casar AMBAS', () => {
    const f = { ...defaultPetFilter(), statuses: [ST[0]], colors: ['preto'] };
    expect(matchesPetFilter(pet({ status: ST[0], color: 'preto' }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ status: ST[1], color: 'preto' }), f, NOW)).toBe(false); // status diverge
    expect(matchesPetFilter(pet({ status: ST[0], color: 'caramelo' }), f, NOW)).toBe(false); // cor diverge
  });

  it('cor AND recência: um pet preto recente casa; preto antigo não (recência poda)', () => {
    const f = { ...defaultPetFilter(), colors: ['preto'], recencyDays: 7 };
    expect(matchesPetFilter(pet({ color: 'preto', dateIso: isoDaysAgo(2) }), f, NOW)).toBe(true);
    expect(matchesPetFilter(pet({ color: 'preto', dateIso: isoDaysAgo(20) }), f, NOW)).toBe(false);
  });
});

describe('countActivePetFilterFacets — conta colors + recência', () => {
  it('conta a faceta de cor quando não-vazia', () => {
    expect(countActivePetFilterFacets({ ...defaultPetFilter(), colors: ['preto'] })).toBe(1);
  });

  it('conta a recência só quando recencyDays é finito (null não conta)', () => {
    expect(countActivePetFilterFacets({ ...defaultPetFilter(), recencyDays: null })).toBe(0);
    expect(countActivePetFilterFacets({ ...defaultPetFilter(), recencyDays: 30 })).toBe(1);
  });

  it('soma todas as cinco facetas ativas', () => {
    const f = { statuses: [ST[0]], species: [SP[0]], sizes: [SZ[0]], colors: ['preto'], recencyDays: 7 };
    expect(countActivePetFilterFacets(f)).toBe(5);
  });
});

describe('setPetFilterRecency — single-select PURO e IMUTÁVEL', () => {
  it('define a janela pedida, preservando as outras facetas', () => {
    const base = { ...defaultPetFilter(), statuses: [ST[0]], colors: ['preto'] };
    const after = setPetFilterRecency(base, 30);
    expect(after.recencyDays).toBe(30);
    expect(after.statuses).toEqual([ST[0]]); // outras facetas intactas
    expect(after.colors).toEqual(['preto']);
    expect(after).not.toBe(base);
    expect(base.recencyDays).toBe(null); // original não mutado
  });

  it('SUBSTITUI a janela anterior (single-select: 7 → 30)', () => {
    const a = setPetFilterRecency(defaultPetFilter(), 7);
    const b = setPetFilterRecency(a, 30);
    expect(b.recencyDays).toBe(30); // não acumula; troca
  });

  it('null LIMPA a recência (volta a sem restrição)', () => {
    const a = setPetFilterRecency(defaultPetFilter(), 90);
    const b = setPetFilterRecency(a, null);
    expect(b.recencyDays).toBe(null);
  });

  it('tocar o MESMO valor já ativo LIMPA (toggle-off do chip ativo)', () => {
    const a = setPetFilterRecency(defaultPetFilter(), 7);
    const b = setPetFilterRecency(a, 7); // re-clica o chip já ativo
    expect(b.recencyDays).toBe(null);
  });

  it('valor lixo (não-finito) é tratado como limpar (null)', () => {
    const a = setPetFilterRecency(defaultPetFilter(), 30);
    expect(setPetFilterRecency(a, 'sete').recencyDays).toBe(null);
    expect(setPetFilterRecency(a, NaN).recencyDays).toBe(null);
    expect(setPetFilterRecency(a, undefined).recencyDays).toBe(null);
  });

  it('parte do filtro vazio quando o filtro de entrada é ausente', () => {
    const after = setPetFilterRecency(null, 7);
    expect(after).toEqual({
      statuses: [], species: [], sizes: [], colors: [], recencyDays: 7,
    });
  });
});
