// petDedup.test.js — PET-M12b: dedup de QUASE-DUPLICADOS (o MESMO relato re-postado),
// soft-merge VISUAL only. Implementa o escopo do PET-M12b no PETS_MILESTONES.yaml,
// espelhando a disciplina de Lens-of-Failure do PET_MATCH_SPEC §6.
//
// O contrato que estes testes TRAVAM (forcing-functions do risco de data-loss):
//   • a FORCING-FUNCTION do falso-merge: dois relatos DISTINTOS-mas-próximos NÃO
//     são fundidos abaixo do limiar (cada eixo apertado checado isoladamente) — é
//     o erro mais caro da superfície (dois gatos pretos diferentes), o teste-âncora;
//   • duplicatas ÓBVIAS (mesmo status + espécie concreta + raio apertado + janela
//     curta) SÃO agrupadas num único pino expansível;
//   • o grupo EXPÕE todos os membros (members = [representante, ...absorvidos]) —
//     REVERSÍVEL/EXPANSÍVEL pelo viewer; nada é destruído;
//   • NENHUM pet de entrada é mutado (soft/visual-only — barricada (a));
//   • os limiares vêm de UMA SOT (PET_DEDUP_DEFAULTS), são CONSERVADORES (muito mais
//     apertados que o match do M9b) e overridáveis só para testes determinísticos;
//   • nunca lança em pet malformado; nowMs injetado (determinístico, sem Date.now()).
//
// São funções puras: sem mock, sem timers, sem render. Os ids vêm da SOT
// (PET_STATUSES/SPECIES), nunca 'perdido'/'gato' hardcoded.

import { describe, it, expect } from 'vitest';
import {
  isNearDuplicate,
  groupNearDuplicates,
  PET_DEDUP_DEFAULTS,
  PET_MATCH_DEFAULTS,
  PET_STATUSES,
  PET_SPECIES,
} from './petDomain';

// Ids reais lidos da SOT — se a lista mudar, o teste acompanha (sem literais).
const ST = PET_STATUSES.map((s) => s.id); // ['perdido','encontrado','avistado']
const SP = PET_SPECIES.map((s) => s.id);  // ['cao','gato','outro']
const PERDIDO = ST[0];
const ENCONTRADO = ST[1];
const CAO = SP[0];
const GATO = SP[1];
const OUTRO = SP[2];

// nowMs fixo bem acima de qualquer dateIso de teste (relógio injetado, determinístico).
const NOW = Date.parse('2026-06-11T00:00:00.000Z');

// Ponto base (Recife) e deslocamentos calibrados contra o limiar de ~75 m do SOT.
// 1 grau de latitude ≈ 111 km = 111000 m, então:
//   • 0.0004°  ≈ 44 m   → DENTRO do raio (~75 m): funde
//   • 0.0009°  ≈ 100 m  → FORA do raio (~75 m): NÃO funde (distinto-mas-próximo)
//   • 0.004°   ≈ 444 m  → bem fora: NÃO funde
const BASE = [-8.05, -34.9];
const SAME_44M = [-8.05 + 0.0004, -34.9]; // ~44 m  → dentro do raio
const NEAR_100M = [-8.05 + 0.0009, -34.9]; // ~100 m → FORA do raio (limiar apertado)
const NEAR_444M = [-8.05 + 0.004, -34.9];  // ~444 m → bem fora

// Fábrica de pet parseado (forma do parsePetRow). Defaults "dupe ouro" (mesmo
// status, mesma espécie concreta, mesmo ponto, mesmo dia) para os positivos.
function pet({
  status = PERDIDO,
  species = CAO,
  coords = BASE,
  dateIso = '2026-06-01T00:00:00.000Z',
  // marcador de identidade só p/ os testes assertarem que o objeto não foi mutado
  // nem trocado (preserva referência) — NÃO é um campo do domínio.
  tag,
} = {}) {
  const p = { coords, status, species, dateIso };
  if (tag !== undefined) p.tag = tag;
  return p;
}

// Um par de duplicatas ÓBVIAS: mesmo status, mesma espécie concreta, ~44 m, mesmo dia.
function dupeA() { return pet({ coords: BASE, dateIso: '2026-06-01T08:00:00.000Z', tag: 'A' }); }
function dupeB() { return pet({ coords: SAME_44M, dateIso: '2026-06-01T09:30:00.000Z', tag: 'B' }); }

describe('isNearDuplicate — duplicatas ÓBVIAS fundem (mesmo relato re-postado)', () => {
  it('mesmo status + espécie concreta + ~44 m + mesmo dia = quase-duplicado', () => {
    expect(isNearDuplicate(dupeA(), dupeB(), NOW)).toBe(true);
  });

  it('é simétrico: a ordem dos dois lados não muda o veredito', () => {
    const a = dupeA();
    const b = dupeB();
    expect(isNearDuplicate(a, b, NOW)).toBe(isNearDuplicate(b, a, NOW));
  });
});

// ─── A FORCING-FUNCTION do risco de FALSO-MERGE (PET_MATCH_SPEC §6 espelhado) ──
// Cada eixo do limiar checado ISOLADAMENTE: um único eixo que falha já impede a
// fusão. Dois relatos DISTINTOS-mas-próximos NUNCA somem um atrás do outro.
describe('isNearDuplicate — NÃO funde dois relatos DISTINTOS-mas-próximos (forcing-function)', () => {
  it('coords além de ~75 m (mesma espécie/status/dia) NÃO fundem — o gato preto vizinho', () => {
    // Dois gatos pretos no mesmo bairro, a ~100 m: tudo igual MENOS a distância.
    // Fundi-los apagaria um report real. O limiar APERTADO (~75 m) os mantém separados.
    const a = pet({ species: GATO, coords: BASE });
    const b = pet({ species: GATO, coords: NEAR_100M });
    expect(isNearDuplicate(a, b, NOW)).toBe(false);
  });

  it('coords a ~444 m NÃO fundem (bem além do raio)', () => {
    const a = pet({ coords: BASE });
    const b = pet({ coords: NEAR_444M });
    expect(isNearDuplicate(a, b, NOW)).toBe(false);
  });

  it('janela além de ~3 dias (mesmo ponto/espécie/status) NÃO funde — dois episódios', () => {
    const a = pet({ coords: BASE, dateIso: '2026-06-01T00:00:00.000Z' });
    const b = pet({ coords: SAME_44M, dateIso: '2026-06-06T00:00:00.000Z' }); // ~5 dias
    expect(isNearDuplicate(a, b, NOW)).toBe(false);
  });

  it('status DIFERENTE (perdido vs encontrado) NÃO funde — eixos do match, não do dedup', () => {
    // É justamente o par do M9b (perdido↔encontrado). Dedup NÃO cruza status:
    // são dois relatos de naturezas diferentes, não o mesmo re-postado.
    const a = pet({ status: PERDIDO, coords: BASE });
    const b = pet({ status: ENCONTRADO, coords: SAME_44M });
    expect(isNearDuplicate(a, b, NOW)).toBe(false);
  });

  it('espécies CONCRETAS diferentes (cao≠gato) NÃO fundem', () => {
    const a = pet({ species: CAO, coords: BASE });
    const b = pet({ species: GATO, coords: SAME_44M });
    expect(isNearDuplicate(a, b, NOW)).toBe(false);
  });

  it('CORINGA de espécie (outro/vazio) NUNCA funde — incerteza não é identidade', () => {
    // Tudo o mais idêntico (mesmo ponto, mesmo dia, mesmo status), MAS um lado é
    // coringa. Aqui o dedup é MAIS DURO que o match: lá o coringa enfraquece; aqui
    // ele BLOQUEIA — não se pode apagar um report por uma identidade incerta.
    const a = pet({ species: CAO, coords: BASE });
    const bOutro = pet({ species: OUTRO, coords: SAME_44M });
    expect(isNearDuplicate(a, bOutro, NOW)).toBe(false);

    const bEmpty = pet({ species: '', coords: SAME_44M });
    expect(isNearDuplicate(a, bEmpty, NOW)).toBe(false);

    // dois coringas também não fundem (ausência de classe concreta dos dois lados).
    const c1 = pet({ species: OUTRO, coords: BASE });
    const c2 = pet({ species: OUTRO, coords: SAME_44M });
    expect(isNearDuplicate(c1, c2, NOW)).toBe(false);
  });
});

describe('isNearDuplicate — limiar CONSERVADOR (muito mais apertado que o match M9b)', () => {
  it('o raio de dedup é >>> menor que o raio do match (SOT, não espalhado)', () => {
    const dedupKm = PET_DEDUP_DEFAULTS.radiusMeters / 1000;
    expect(dedupKm).toBeLessThan(PET_MATCH_DEFAULTS.radiusMaxKm);
    // ~67× mais apertado (75 m vs 5 km) — dedup ≠ match, por construção.
    expect(dedupKm).toBeLessThan(PET_MATCH_DEFAULTS.radiusStrongKm / 10);
  });

  it('a janela de dedup é >>> menor que a janela do match', () => {
    expect(PET_DEDUP_DEFAULTS.windowDays).toBeLessThan(PET_MATCH_DEFAULTS.windowDays);
  });

  it('overrides de limiar (só p/ teste) são respeitados — limiares vêm de UM lugar', () => {
    const a = pet({ coords: BASE });
    const b = pet({ coords: NEAR_100M }); // ~100 m: fora do default 75 m
    // Com o default NÃO funde…
    expect(isNearDuplicate(a, b, NOW)).toBe(false);
    // …mas alargando o raio via override (200 m) funde — prova que o predicado lê
    // o limiar do parâmetro/SOT, não um número hardcoded.
    expect(isNearDuplicate(a, b, NOW, { radiusMeters: 200, windowDays: 3 })).toBe(true);
  });
});

describe('isNearDuplicate — NUNCA lança em pet malformado (barricada de leitura)', () => {
  it('pets null/lixo/sem campos → não funde, sem throw', () => {
    for (const garbage of [null, undefined, {}, { status: 123 }, [], 'pet', 42]) {
      expect(() => isNearDuplicate(garbage, dupeA(), NOW)).not.toThrow();
      expect(isNearDuplicate(garbage, dupeA(), NOW)).toBe(false);
      expect(() => isNearDuplicate(dupeA(), garbage, NOW)).not.toThrow();
      expect(isNearDuplicate(dupeA(), garbage, NOW)).toBe(false);
    }
  });

  it('coords não-finitas / data ilegível → não funde (degrada com calma)', () => {
    const badCoords = pet({ coords: [NaN, -34.9] });
    expect(isNearDuplicate(badCoords, dupeA(), NOW)).toBe(false);
    const badDate = pet({ coords: SAME_44M, dateIso: 'não-é-data' });
    expect(isNearDuplicate(dupeA(), badDate, NOW)).toBe(false);
  });
});

describe('groupNearDuplicates — soft-consolida em grupos EXPANSÍVEIS, sem destruir dado', () => {
  it('duplicatas óbvias viram UM grupo que EXPÕE todos os membros (reversível)', () => {
    const a = dupeA();
    const b = dupeB();
    const groups = groupNearDuplicates([a, b], NOW);
    expect(groups).toHaveLength(1);
    const g = groups[0];
    // members = [representante, ...absorvidos] — TODOS os relatos sobrevivem no grupo.
    expect(g.members).toHaveLength(2);
    expect(g.members).toContain(a);
    expect(g.members).toContain(b);
    expect(g.representative).toBe(a); // 1º na ordem dada = representante (estável)
    expect(g.duplicateCount).toBe(1);
  });

  it('dois relatos DISTINTOS-mas-próximos ficam em grupos SEPARADOS (forcing-function)', () => {
    // O gato preto vizinho a ~100 m: dois grupos, dois pinos — nenhum report some.
    const a = pet({ species: GATO, coords: BASE });
    const b = pet({ species: GATO, coords: NEAR_100M });
    const groups = groupNearDuplicates([a, b], NOW);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.duplicateCount === 0)).toBe(true);
    // Cada um é seu próprio representante (nenhum foi absorvido pelo outro).
    expect(groups.map((g) => g.representative)).toEqual([a, b]);
  });

  it('mistura: 2 dupes do mesmo episódio + 1 relato distinto → 2 grupos', () => {
    const a = dupeA();
    const b = dupeB();
    const distinct = pet({ coords: NEAR_444M, tag: 'C' }); // ~444 m: distinto
    const groups = groupNearDuplicates([a, b, distinct], NOW);
    expect(groups).toHaveLength(2);
    // grupo 0 = o cluster {a,b}; grupo 1 = o singleton distinct.
    const cluster = groups.find((g) => g.duplicateCount === 1);
    const single = groups.find((g) => g.duplicateCount === 0);
    expect(cluster.members).toEqual([a, b]);
    expect(single.representative).toBe(distinct);
    expect(single.members).toEqual([distinct]);
  });

  it('três re-posts do MESMO episódio colapsam num único grupo de 3 membros', () => {
    const a = pet({ coords: BASE, dateIso: '2026-06-01T08:00:00.000Z', tag: 'A' });
    const b = pet({ coords: SAME_44M, dateIso: '2026-06-01T12:00:00.000Z', tag: 'B' });
    const c = pet({ coords: BASE, dateIso: '2026-06-02T08:00:00.000Z', tag: 'C' });
    const groups = groupNearDuplicates([a, b, c], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toEqual([a, b, c]);
    expect(groups[0].duplicateCount).toBe(2);
  });

  it('NÃO muta nenhum pet de entrada (soft/visual-only — barricada (a))', () => {
    const a = dupeA();
    const b = dupeB();
    const snapshotA = JSON.stringify(a);
    const snapshotB = JSON.stringify(b);
    const groups = groupNearDuplicates([a, b], NOW);
    // os objetos de pet são os MESMOS (referência preservada) e inalterados.
    expect(groups[0].members[0]).toBe(a);
    expect(groups[0].members[1]).toBe(b);
    expect(JSON.stringify(a)).toBe(snapshotA);
    expect(JSON.stringify(b)).toBe(snapshotB);
  });

  it('lista não-array / vazia → [] (defensivo, nunca lança)', () => {
    expect(groupNearDuplicates(null, NOW)).toEqual([]);
    expect(groupNearDuplicates(undefined, NOW)).toEqual([]);
    expect(groupNearDuplicates([], NOW)).toEqual([]);
    expect(() => groupNearDuplicates([null, {}, 42], NOW)).not.toThrow();
  });

  it('pets malformados na lista viram singletons (nunca derrubam o agrupamento)', () => {
    const good = dupeA();
    const groups = groupNearDuplicates([null, good, {}, 42], NOW);
    // cada lixo é seu próprio grupo (não casa com ninguém) + o bom como singleton.
    expect(groups).toHaveLength(4);
    const goodGroup = groups.find((g) => g.representative === good);
    expect(goodGroup.duplicateCount).toBe(0);
  });
});
