// petAgeArchive.test.js — PET-M12: amortecedor MECÂNICO de staleness (age-archive).
//
// Cobre, no DOMÍNIO PURO (petDomain), a EXCLUSÃO de mapa ativo por idade + a SOT
// do limiar, contra as acceptance lines do PET-M12 (YAML):
//   1. Reports além da janela configurável NÃO entram no mapa ativo, mas
//      permanecem na "sheet" (a fonte — os pets parseados — não é mutada/encurtada
//      pela exclusão: ela é READ-side; o report continua existindo).
//   2. O limiar vive em UMA SOT (PET_ARCHIVE_WINDOW_DAYS), lido pelo filtro E por
//      este teste — nunca um número mágico repetido.
//   3. Nenhuma linha é deletada; a invariante de isolação se mantém (o predicado
//      é puro/de-leitura — não muta o pet de entrada nem chama nenhum writer).
// Mais: a idade mede contra `freshnessAt` (M13) com fallback p/ DateISO; um pet
// REUNIDO não é "arquivado por idade" (sai por outro eixo); o flag `aged` derivado
// alimenta petMarkerIcon.lifecycleForPet (o cue do PET-M11); a ordem M13<M12.
//
// São funções puras: sem mock, sem timers, sem render. `nowMs` é SEMPRE injetado.

import { describe, it, expect } from 'vitest';
import {
  buildPetDados,
  parsePetRow,
  isPetArchivedByAge,
  activePetsByAge,
  withAgedFlag,
  petAgeDays,
  isPetResolved,
  PET_ARCHIVE_WINDOW_DAYS,
  PET_FRESHNESS_AT_KEY,
  PET_KIND,
} from './petDomain';
import { lifecycleForPet, PET_LIFECYCLE } from './petMarkerIcon';

// Limiar de FRESCOR do M13 (PET_FRESHNESS_SPEC §2.1). Não é uma const exportada
// (M13 ainda é design), mas a ORDEM dura M13 < M12 é uma invariante de design que
// travamos aqui: o convite humano precede o machado mecânico.
const M13_FRESHNESS_THRESHOLD_DAYS = 30;

const COORDS = [-8.0671132, -34.8766719];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// "Agora" fixo e determinístico (todo nowMs é injetado — nenhuma chamada a
// Date.now() nos predicados; o teste é estável no tempo).
const NOW = Date.parse('2026-06-11T12:00:00.000Z');

// ISO de "N dias atrás de NOW".
function isoDaysAgo(days) {
  return new Date(NOW - days * MS_PER_DAY).toISOString();
}

// Empacota um blob Dados como a planilha o devolve (.Dados = JSON-string).
function asRow(dados) {
  return { Dados: JSON.stringify(dados) };
}

// Pet parseado real "publicado há N dias" (sem freshnessAt → cai no DateISO).
function petPublishedDaysAgo(days, extra = {}) {
  const dados = buildPetDados({
    coords: COORDS,
    status: 'perdido',
    dateIso: isoDaysAgo(days),
    ...extra,
  });
  return parsePetRow(asRow(dados));
}

describe('PET_ARCHIVE_WINDOW_DAYS — a SOT do limiar (acceptance: UMA SOT)', () => {
  it('default ~90 dias (o spec §2.1: maior balde de recência)', () => {
    expect(PET_ARCHIVE_WINDOW_DAYS).toBe(90);
  });

  it('é MAIOR que o limiar de frescor do M13 (ordem dura: convidar antes de arquivar)', () => {
    // PET_FRESHNESS_SPEC §2.1: LIMIAR_DIAS (M13) < JANELA_ARQUIVO (M12).
    expect(PET_ARCHIVE_WINDOW_DAYS).toBeGreaterThan(M13_FRESHNESS_THRESHOLD_DAYS);
  });
});

describe('isPetArchivedByAge — predicado puro de exclusão por idade', () => {
  it('um report DENTRO da janela permanece ATIVO (não arquivado)', () => {
    const fresh = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS - 1);
    expect(isPetArchivedByAge(fresh, NOW)).toBe(false);
  });

  it('um report ALÉM da janela é arquivado por idade', () => {
    const old = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 1);
    expect(isPetArchivedByAge(old, NOW)).toBe(true);
  });

  it('exatamente NA janela arquiva (>= é inclusivo, espelha isArchived da fome)', () => {
    const atEdge = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS);
    expect(isPetArchivedByAge(atEdge, NOW)).toBe(true);
  });

  it('lê o limiar do SOT — um override só de teste muda o corte sem editar a fonte', () => {
    const pet = petPublishedDaysAgo(40);
    // Com a SOT (90) NÃO arquiva; com um override de 30 (o limiar do M13) arquiva.
    expect(isPetArchivedByAge(pet, NOW)).toBe(false);
    expect(isPetArchivedByAge(pet, NOW, 30)).toBe(true);
  });

  it('é DETERMINÍSTICO: nowMs injetado, mesma entrada → mesma saída (sem Date.now())', () => {
    const pet = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 5);
    expect(isPetArchivedByAge(pet, NOW)).toBe(isPetArchivedByAge(pet, NOW));
  });

  it('nunca lança em entrada lixo (barricada): null/undefined/sem data', () => {
    expect(() => isPetArchivedByAge(null, NOW)).not.toThrow();
    expect(isPetArchivedByAge(null, NOW)).toBe(false);
    // Sem nenhuma data legível → Infinity → arquivado (não vive p/ sempre por dado quebrado).
    expect(isPetArchivedByAge({ status: 'perdido' }, NOW)).toBe(true);
    expect(isPetArchivedByAge({ dateIso: 'lixo-nao-iso' }, NOW)).toBe(true);
  });
});

describe('idade mede contra freshnessAt (M13) com fallback p/ DateISO (§2.1/§5.2)', () => {
  it('sem freshnessAt, a idade cai no DateISO de publicação', () => {
    const old = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 10);
    expect(old.freshnessAt).toBeUndefined();
    expect(petAgeDays(old, NOW)).toBeGreaterThan(PET_ARCHIVE_WINDOW_DAYS);
  });

  it('com freshnessAt recente, a idade RESETA — o M13 ADIA o M12', () => {
    // Publicado há muito (100d), mas "ainda procurando" há 1 dia (M13 grava
    // freshnessAt=ontem). O relógio de arquivo mede contra a última afirmação.
    const dados = buildPetDados({
      coords: COORDS,
      status: 'perdido',
      dateIso: isoDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 10),
      freshnessAt: isoDaysAgo(1),
    });
    const renewed = parsePetRow(asRow(dados));
    expect(renewed.freshnessAt).toBe(isoDaysAgo(1));
    // Idade ~1 dia (contra freshnessAt), não ~100 (contra DateISO) → ATIVO.
    expect(petAgeDays(renewed, NOW)).toBeLessThan(2);
    expect(isPetArchivedByAge(renewed, NOW)).toBe(false);
  });

  it('round-trip de freshnessAt: linhas SEM o campo (legadas) parseiam sem regressão', () => {
    const legacy = {
      kind: PET_KIND,
      status: 'perdido',
      Coordinates: JSON.stringify(COORDS),
      DateISO: isoDaysAgo(5),
    };
    const pet = parsePetRow(asRow(legacy));
    expect(pet).not.toBeNull();
    expect(PET_FRESHNESS_AT_KEY in pet).toBe(true); // exposto como undefined
    expect(pet.freshnessAt).toBeUndefined();
    expect(isPetArchivedByAge(pet, NOW)).toBe(false);
  });
});

describe('um pet REUNIDO não é "arquivado por idade" (eixos ortogonais)', () => {
  it('resolvedAt presente → sai pelo lifecycle resolvido, não pelo eixo de idade', () => {
    const dados = buildPetDados({
      coords: COORDS,
      status: 'encontrado',
      dateIso: isoDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 30),
      resolvedAt: isoDaysAgo(1),
    });
    const reunido = parsePetRow(asRow(dados));
    expect(isPetResolved(reunido)).toBe(true);
    // Velho o bastante para a janela, mas NÃO é archived-by-age (resolvido vence).
    expect(isPetArchivedByAge(reunido, NOW)).toBe(false);
  });
});

describe('activePetsByAge — EXCLUSÃO de mapa ativo (acceptance: somem do mapa, ficam na sheet)', () => {
  it('exclui os além da janela e mantém os dentro; a FONTE não é mutada/deletada', () => {
    const fresh = petPublishedDaysAgo(2);
    const mid = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS - 1);
    const old = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 5);
    const all = [fresh, mid, old];

    const active = activePetsByAge(all, NOW);

    // O mapa ativo mostra só os 2 dentro da janela.
    expect(active).toHaveLength(2);
    expect(active).toContain(fresh);
    expect(active).toContain(mid);
    expect(active).not.toContain(old);

    // ACCEPTANCE "no row is ever deleted / fica na sheet": a lista-fonte (o
    // equivalente da sheet) NÃO encolheu nem mutou — o report arquivado continua
    // existindo nela; a exclusão é só de LEITURA para o mapa.
    expect(all).toHaveLength(3);
    expect(all).toContain(old);
    expect(old).toBeTruthy(); // o objeto do report arquivado segue intacto
  });

  it('defende contra entrada não-array (→ []) e nunca lança', () => {
    expect(activePetsByAge(null, NOW)).toEqual([]);
    expect(activePetsByAge(undefined, NOW)).toEqual([]);
    expect(activePetsByAge('nope', NOW)).toEqual([]);
  });

  it('lê o MESMO limiar do SOT que o predicado (override de teste afeta os dois)', () => {
    const pet = petPublishedDaysAgo(40);
    expect(activePetsByAge([pet], NOW)).toHaveLength(1);       // SOT 90: ativo
    expect(activePetsByAge([pet], NOW, 30)).toHaveLength(0);   // override 30: excluído
  });
});

describe('withAgedFlag — alimenta o cue de envelhecimento do PET-M11 (lifecycleForPet)', () => {
  it('estampa aged:true num report velho SEM mutar o original (read-side)', () => {
    const old = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 5);
    const flagged = withAgedFlag(old, NOW);
    expect(flagged.aged).toBe(true);
    // Não muta o original — disciplina imutável (nada é deletado/reescrito).
    expect(old.aged).toBeUndefined();
    expect(flagged).not.toBe(old);
  });

  it('estampa aged:false num report fresco', () => {
    const fresh = petPublishedDaysAgo(2);
    expect(withAgedFlag(fresh, NOW).aged).toBe(false);
  });

  it('o flag aged derivado faz o lifecycleForPet (PET-M11) ler AGED', () => {
    const old = petPublishedDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 5);
    const flagged = withAgedFlag(old, NOW);
    expect(lifecycleForPet(flagged)).toBe(PET_LIFECYCLE.AGED);
  });

  it('reunido vence aged no lifecycle (precedência do PET-M11 preservada)', () => {
    const dados = buildPetDados({
      coords: COORDS,
      status: 'encontrado',
      dateIso: isoDaysAgo(PET_ARCHIVE_WINDOW_DAYS + 30),
      resolvedAt: isoDaysAgo(1),
    });
    const reunido = parsePetRow(asRow(dados));
    // withAgedFlag nem marca aged (resolvido não é archived-by-age), e mesmo se
    // marcasse, lifecycleForPet dá precedência a reunido.
    const flagged = withAgedFlag(reunido, NOW);
    expect(flagged.aged).toBe(false);
    expect(lifecycleForPet(flagged)).toBe(PET_LIFECYCLE.REUNIDO);
  });
});
