// petMatch.test.js — PET-M9b: predicado PURO do match possível (perdido ↔
// encontrado/avistado), implementando o PET_MATCH_SPEC.md (PET-M9a).
//
// Trava o contrato nomeado no spec §7 / no PET-M9b:
//   • pareamento de STATUS (§1.1) INCL. os NÃO-candidatos (perdido↔perdido NÃO casa);
//   • coringa de ESPÉCIE (§1.2): outro/vazio não bloqueia mas ENFRAQUECE;
//   • FAIXAS de RAIO (§1.3): ≤1 km forte · 1–5 km moderado · >5 km fora;
//   • JANELA de TEMPO (§1.4): |Δrelatos| ≤30 d; fora da janela não casa;
//   • EXCLUSÃO (§4): reunido/encerrado E arquivado por idade são cortados ANTES
//     de parear (dos DOIS lados);
//   • a regra do SILÊNCIO (§3): PELO MENOS um par FRACO (coringa-só / teto-5km-só)
//     é candidato mas NÃO rompe o silêncio (shouldSurface=false) — a forcing-function
//     do erro mais caro da superfície;
//   • nunca lança em pet malformado; nowMs injetado (determinístico, sem Date.now()).
//
// São funções puras: sem mock, sem timers, sem render. Os ids vêm da SOT
// (PET_STATUSES/SPECIES), nunca 'perdido' hardcoded.

import { describe, it, expect } from 'vitest';
import {
  petMatchStrength,
  findPossibleMatches,
  PET_MATCH_DEFAULTS,
  PET_MATCH_STRENGTH,
  PET_STATUSES,
  PET_SPECIES,
} from './petDomain';

// Ids reais lidos da SOT — se a lista mudar, o teste acompanha.
const ST = PET_STATUSES.map((s) => s.id); // ['perdido','encontrado','avistado']
const SP = PET_SPECIES.map((s) => s.id);  // ['cao','gato','outro']
const PERDIDO = ST[0];
const ENCONTRADO = ST[1];
const AVISTADO = ST[2];
const CAO = SP[0];
const GATO = SP[1];
const OUTRO = SP[2];

// nowMs fixo bem acima de qualquer dateIso de teste (relógio injetado, determinístico).
const NOW = Date.parse('2026-06-11T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

// Ponto base (Recife) e deslocamentos calibrados:
//   • ~0.5 km  → faixa FORTE  (≤1 km)
//   • ~3 km    → faixa MODERADA (1–5 km)
//   • ~8 km    → FORA (>5 km)
// 1 grau de latitude ≈ 111 km, então 0.0045° ≈ 0.5 km, 0.027° ≈ 3 km, 0.072° ≈ 8 km.
const BASE = [-8.05, -34.9];
const NEAR_05KM = [-8.05 + 0.0045, -34.9]; // ~0.5 km
const MID_3KM = [-8.05 + 0.027, -34.9];    // ~3 km
const FAR_8KM = [-8.05 + 0.072, -34.9];    // ~8 km

// Fábrica de pet parseado (forma do parsePetRow). Defaults "fortes" (mesma espécie
// concreta, perto, achado posterior à perda) para os testes positivos.
function pet({
  status = PERDIDO,
  species = CAO,
  coords = BASE,
  dateIso = '2026-05-20T00:00:00.000Z',
  resolvedAt,
  freshnessAt,
} = {}) {
  const p = { coords, status, species, dateIso };
  if (resolvedAt) p.resolvedAt = resolvedAt;
  if (freshnessAt) p.freshnessAt = freshnessAt;
  return p;
}

// Um par "ouro": perdido(cão) + encontrado(cão), ~0.5 km, achado 2 dias DEPOIS da
// perda → todas as facetas fortes → candidato E shouldSurface.
function lostGold() {
  return pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: '2026-05-20T00:00:00.000Z' });
}
function foundGold() {
  return pet({ status: ENCONTRADO, species: CAO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
}

describe('petMatchStrength — pareamento de STATUS (§1.1)', () => {
  it('perdido ↔ encontrado é candidato', () => {
    const v = petMatchStrength(lostGold(), foundGold(), NOW);
    expect(v.candidate).toBe(true);
  });

  it('perdido ↔ avistado é candidato', () => {
    const a = pet({ status: PERDIDO, coords: BASE });
    const b = pet({ status: AVISTADO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
    expect(petMatchStrength(a, b, NOW).candidate).toBe(true);
  });

  it('perdido ↔ perdido NÃO é candidato (duas perdas não se resolvem)', () => {
    const a = pet({ status: PERDIDO, coords: BASE });
    const b = pet({ status: PERDIDO, coords: NEAR_05KM });
    const v = petMatchStrength(a, b, NOW);
    expect(v.candidate).toBe(false);
    expect(v.shouldSurface).toBe(false);
  });

  it('encontrado ↔ encontrado NÃO é candidato (dois achadores, nenhum dono)', () => {
    const a = pet({ status: ENCONTRADO, coords: BASE });
    const b = pet({ status: ENCONTRADO, coords: NEAR_05KM });
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });

  it('avistado ↔ avistado NÃO é candidato', () => {
    const a = pet({ status: AVISTADO, coords: BASE });
    const b = pet({ status: AVISTADO, coords: NEAR_05KM });
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });

  it('encontrado ↔ avistado NÃO é candidato (nenhum dos lados é a perda)', () => {
    const a = pet({ status: ENCONTRADO, coords: BASE });
    const b = pet({ status: AVISTADO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });

  it('é simétrico: a ordem dos dois lados não muda o veredito de candidatura', () => {
    const lost = lostGold();
    const found = foundGold();
    expect(petMatchStrength(lost, found, NOW).candidate)
      .toBe(petMatchStrength(found, lost, NOW).candidate);
    expect(petMatchStrength(lost, found, NOW).shouldSurface)
      .toBe(petMatchStrength(found, lost, NOW).shouldSurface);
  });
});

describe('petMatchStrength — ESPÉCIE: exato + coringa que ENFRAQUECE (§1.2)', () => {
  it('mesma espécie concreta (cão=cão) é candidato e pode romper o silêncio', () => {
    const v = petMatchStrength(lostGold(), foundGold(), NOW);
    expect(v.candidate).toBe(true);
    expect(v.shouldSurface).toBe(true);
  });

  it('espécies concretas diferentes (cão≠gato) NÃO são candidato (contradição dura)', () => {
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE });
    const b = pet({ status: ENCONTRADO, species: GATO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });

  it('coringa outro/vazio é candidato MAS, sozinho, NÃO rompe o silêncio (§3.1)', () => {
    // Tudo forte (perto, no tempo, achado posterior), MAS espécie só casa por coringa.
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: '2026-05-20T00:00:00.000Z' });
    const bOutro = pet({ status: ENCONTRADO, species: OUTRO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
    const vOutro = petMatchStrength(a, bOutro, NOW);
    expect(vOutro.candidate).toBe(true);     // coringa não bloqueia
    expect(vOutro.shouldSurface).toBe(false); // mas não é evidência de identidade → silêncio

    // Espécie VAZIA também é coringa (mesmo comportamento).
    const bEmpty = pet({ status: ENCONTRADO, species: '', coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
    const vEmpty = petMatchStrength(a, bEmpty, NOW);
    expect(vEmpty.candidate).toBe(true);
    expect(vEmpty.shouldSurface).toBe(false);
  });
});

describe('petMatchStrength — RAIO: faixas forte/moderado/fora (§1.3)', () => {
  it('≤1 km é a faixa FORTE (rompe o silêncio com espécie+tempo fortes)', () => {
    const v = petMatchStrength(lostGold(), foundGold(), NOW); // ~0.5 km
    expect(v.candidate).toBe(true);
    expect(v.shouldSurface).toBe(true);
    expect(v.distanceKm).toBeLessThanOrEqual(PET_MATCH_DEFAULTS.radiusStrongKm);
  });

  it('1–5 km é MODERADO: candidato e ainda rompe o silêncio quando o tempo é forte', () => {
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: '2026-05-20T00:00:00.000Z' });
    const b = pet({ status: ENCONTRADO, species: CAO, coords: MID_3KM, dateIso: '2026-05-22T00:00:00.000Z' });
    const v = petMatchStrength(a, b, NOW);
    expect(v.candidate).toBe(true);
    expect(v.distanceKm).toBeGreaterThan(PET_MATCH_DEFAULTS.radiusStrongKm);
    expect(v.distanceKm).toBeLessThanOrEqual(PET_MATCH_DEFAULTS.radiusMaxKm);
    expect(v.shouldSurface).toBe(true); // moderado + tempo forte rompe o silêncio
  });

  it('>5 km NÃO é candidato (fora do teto)', () => {
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE });
    const b = pet({ status: ENCONTRADO, species: CAO, coords: FAR_8KM, dateIso: '2026-05-22T00:00:00.000Z' });
    const v = petMatchStrength(a, b, NOW);
    expect(v.candidate).toBe(false);
    expect(v.distanceKm).toBeGreaterThan(PET_MATCH_DEFAULTS.radiusMaxKm);
  });
});

describe('petMatchStrength — JANELA de tempo: |Δrelatos| ≤30 d (§1.4)', () => {
  it('dentro da janela com achado POSTERIOR à perda rompe o silêncio', () => {
    const v = petMatchStrength(lostGold(), foundGold(), NOW); // Δ = 2 dias
    expect(v.shouldSurface).toBe(true);
  });

  it('fora da janela (>30 d entre os relatos) NÃO é candidato', () => {
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: '2026-01-01T00:00:00.000Z' });
    const b = pet({ status: ENCONTRADO, species: CAO, coords: NEAR_05KM, dateIso: '2026-03-01T00:00:00.000Z' }); // ~59 d
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });

  it('data de relato ilegível em qualquer lado → não candidato (degrada com calma)', () => {
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: 'não-é-data' });
    const b = foundGold();
    expect(() => petMatchStrength(a, b, NOW)).not.toThrow();
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });
});

describe('petMatchStrength — a regra do SILÊNCIO (§3): pares FRACOS ficam silenciosos', () => {
  it('coringa de espécie + tudo o mais forte = candidato porém SILENCIOSO (fraco)', () => {
    // ESTE é o teste do silêncio exigido pelo spec §3/§7: um par que só casa por
    // coringa de espécie NÃO rompe o limiar, mesmo perto e no tempo.
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: '2026-05-20T00:00:00.000Z' });
    const b = pet({ status: ENCONTRADO, species: OUTRO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' });
    const v = petMatchStrength(a, b, NOW);
    expect(v.candidate).toBe(true);
    expect(v.shouldSurface).toBe(false);
    expect(v.strength).toBe(PET_MATCH_STRENGTH.WEAK);
  });

  it('teto de 5 km SOZINHO (distância moderada + tempo só moderado) fica SILENCIOSO', () => {
    // Espécie concreta, MAS distância moderada (3 km) E achado ANTERIOR à perda
    // (tempo moderado, fora de ordem). Nenhuma proximidade forte para sustentar o
    // achado fora de ordem → não move a esperança na direção da verdade → silêncio.
    const a = pet({ status: PERDIDO, species: CAO, coords: BASE, dateIso: '2026-05-22T00:00:00.000Z' });
    const b = pet({ status: ENCONTRADO, species: CAO, coords: MID_3KM, dateIso: '2026-05-20T00:00:00.000Z' }); // achado ANTES
    const v = petMatchStrength(a, b, NOW);
    expect(v.candidate).toBe(true);     // dentro de §1 (raio/janela/espécie/status)
    expect(v.shouldSurface).toBe(false); // mas não rompe o silêncio
    expect(v.strength).toBe(PET_MATCH_STRENGTH.WEAK);
  });

  it('força STRONG só quando espécie+raio+tempo são TODOS fortes', () => {
    expect(petMatchStrength(lostGold(), foundGold(), NOW).strength).toBe(PET_MATCH_STRENGTH.STRONG);
  });
});

describe('petMatchStrength — EXCLUSÃO de resolvidos/arquivados (§4) no nível do par', () => {
  it('um pet REUNIDO (resolvedAt) como par não casa (mas o predicado par-a-par não exclui sozinho)', () => {
    // O predicado par-a-par NÃO conhece o eixo de elegibilidade — a EXCLUSÃO de §4
    // é responsabilidade de findPossibleMatches (filtra ANTES de parear). Aqui só
    // documentamos que petMatchStrength puro continua avaliando facetas; a exclusão
    // é testada no bloco de findPossibleMatches abaixo (a barricada certa).
    const a = lostGold();
    const bResolved = { ...foundGold(), resolvedAt: '2026-05-25T00:00:00.000Z' };
    // petMatchStrength puro ainda casa por facetas (não é o lugar da exclusão)…
    expect(petMatchStrength(a, bResolved, NOW).candidate).toBe(true);
  });
});

describe('petMatchStrength — NUNCA lança em pet malformado', () => {
  it('pets null/lixo/sem campos → não candidato, sem throw', () => {
    for (const garbage of [null, undefined, {}, { status: 123 }, [], 'pet', 42]) {
      expect(() => petMatchStrength(garbage, foundGold(), NOW)).not.toThrow();
      expect(petMatchStrength(garbage, foundGold(), NOW).candidate).toBe(false);
      expect(() => petMatchStrength(lostGold(), garbage, NOW)).not.toThrow();
      expect(petMatchStrength(lostGold(), garbage, NOW).candidate).toBe(false);
    }
  });

  it('coords ausentes/não-finitas → não candidato (distância Infinity)', () => {
    const a = pet({ status: PERDIDO, coords: [NaN, -34] });
    const b = foundGold();
    expect(petMatchStrength(a, b, NOW).candidate).toBe(false);
  });
});

describe('findPossibleMatches — exclusão §4 ANTES de parear + só pares que rompem o silêncio', () => {
  const lost = lostGold();

  it('devolve só os pares que ROMPEM O SILÊNCIO (não candidatos fracos)', () => {
    const strong = foundGold();                                              // forte → mostra
    const weakWildcard = pet({ status: ENCONTRADO, species: OUTRO, coords: NEAR_05KM, dateIso: '2026-05-22T00:00:00.000Z' }); // coringa → silêncio
    const farAway = pet({ status: ENCONTRADO, species: CAO, coords: FAR_8KM, dateIso: '2026-05-22T00:00:00.000Z' });          // >5 km → não candidato
    const matches = findPossibleMatches(lost, [strong, weakWildcard, farAway], NOW);
    expect(matches).toHaveLength(1);
    expect(matches[0].pet).toBe(strong);
    expect(matches[0].strength).toBe(PET_MATCH_STRENGTH.STRONG);
  });

  it('EXCLUI um candidato REUNIDO (resolvedAt) ANTES de parear (§4)', () => {
    const resolved = { ...foundGold(), resolvedAt: '2026-05-25T00:00:00.000Z' };
    const matches = findPossibleMatches(lost, [resolved], NOW);
    expect(matches).toHaveLength(0); // reunido nunca é candidato
  });

  it('EXCLUI um candidato ARQUIVADO por idade (M12) ANTES de parear (§4)', () => {
    // dateIso muito antigo (>90 d antes de NOW) → arquivado por idade → cortado.
    const aged = pet({ status: ENCONTRADO, species: CAO, coords: NEAR_05KM, dateIso: '2025-01-01T00:00:00.000Z' });
    // (também estaria fora da janela de 30 d; o ponto é a EXCLUSÃO por elegibilidade)
    const matches = findPossibleMatches(lost, [aged], NOW);
    expect(matches).toHaveLength(0);
  });

  it('se o PRÓPRIO pet aberto está resolvido/arquivado, não há matches (sai de cena)', () => {
    const resolvedSelf = { ...lostGold(), resolvedAt: '2026-05-25T00:00:00.000Z' };
    expect(findPossibleMatches(resolvedSelf, [foundGold()], NOW)).toEqual([]);
  });

  it('nunca casa o pet consigo mesmo', () => {
    expect(findPossibleMatches(lost, [lost], NOW)).toEqual([]);
  });

  it('lista não-array / vazia → [] (defensivo, nunca lança)', () => {
    expect(findPossibleMatches(lost, null, NOW)).toEqual([]);
    expect(findPossibleMatches(lost, undefined, NOW)).toEqual([]);
    expect(findPossibleMatches(lost, [], NOW)).toEqual([]);
    expect(() => findPossibleMatches(lost, [null, {}, 42], NOW)).not.toThrow();
    expect(findPossibleMatches(lost, [null, {}, 42], NOW)).toEqual([]);
  });

  it('ordena do mais forte/mais perto ao mais fraco', () => {
    const strongNear = foundGold(); // forte, ~0.5 km
    const moderate = pet({ status: ENCONTRADO, species: CAO, coords: MID_3KM, dateIso: '2026-05-22T00:00:00.000Z' }); // moderado 3 km + tempo forte
    const matches = findPossibleMatches(lost, [moderate, strongNear], NOW);
    expect(matches).toHaveLength(2);
    expect(matches[0].pet).toBe(strongNear); // forte vem primeiro
    expect(matches[1].pet).toBe(moderate);
  });
});
