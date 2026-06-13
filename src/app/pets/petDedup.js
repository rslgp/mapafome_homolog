// petDedup.js — PET-M12b: SOFT-merge VISUAL de quase-duplicados (predicado PURO).
//
// Extraído de petMatch.js (que ficou com o PET-M9b "match possível"). Os dois eram
// concerns INDEPENDENTES com limiares e modos-de-falha OPOSTOS — MATCH (5 km / 30 d,
// cujo pior erro é a falsa-esperança) vs DEDUP (~75 m / ~3 d, cujo pior erro é o
// falso-merge) — e já estavam separados na camada de teste (petMatch.test.js vs
// petDedup.test.js). Importa da CAMADA-FOLHA (petTaxonomy): MS_PER_DAY, haversineKm
// e isWildcardSpecies (promovida à folha para que match E dedup leiam a MESMA
// verdade de "espécie coringa", sem ciclo). Re-exportado pelo barrel petDomain.js.
//
// O QUE É: o MESMO relato re-postado (a pessoa publicou duas/três vezes em pânico,
// ou dois vizinhos relataram o MESMÍSSIMO avistamento) vira VÁRIOS pinos quase
// sobrepostos no mapa. Este bloco DETECTA esses quase-duplicados e os AGRUPA num
// cluster de exibição — para o mapa mostrar UM pino expansível em vez de uma pilha.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ NOTA DE LENS-OF-FAILURE (espelha PET_MATCH_SPEC §6 — leia ANTES de mexer)  ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║ O ERRO MAIS CARO desta superfície é o FALSO-MERGE: agrupar dois gatos      ║
// ║ pretos DIFERENTES como se fossem o mesmo relato APAGA, da visão do usuário,║
// ║ um report real (um pet que alguém está procurando some atrás do "dupe").   ║
// ║ Um falso-merge é PIOR que um pino duplicado — por isso o PET-M12b foi      ║
// ║ SEPARADO do PET-M12 (que só arquiva por idade, sem risco de identidade).   ║
// ║                                                                            ║
// ║ As TRÊS barricadas contra o falso-merge (em ordem), análogas às do match:  ║
// ║                                                                            ║
// ║  (a) SOFT / VISUAL-ONLY — esta camada NUNCA deleta, NUNCA reescreve, NUNCA ║
// ║      muta a linha do report "absorvido". É uma transformação de LEITURA    ║
// ║      sobre os pets já parseados (igual a activePetsByAge / filterPets): os ║
// ║      dados crus de TODOS os membros sobrevivem intactos na planilha E no   ║
// ║      grupo devolvido. Nenhuma escrita acontece. Isolação kind:'pet'        ║
// ║      preservada por construção (não há writer aqui).                       ║
// ║                                                                            ║
// ║  (b) CONSERVADOR — o limiar é MUITO mais APERTADO que o match do M9b. O    ║
// ║      M9b casa status DIFERENTES (perdido↔encontrado) a 5 km e 30 dias —    ║
// ║      "pode ser o mesmo bicho". O dedup exige o MESMO relato re-postado:    ║
// ║      MESMO status + MESMA espécie CONCRETA (coringa outro/vazio NUNCA      ║
// ║      funde — incerteza não é identidade) + coords MUITO próximas (~75 m    ║
// ║      default, ~67× mais apertado que os 5 km do match) + janela curta      ║
// ║      (~3 dias). Concordância em VÁRIOS eixos, não um só. Na dúvida, NÃO    ║
// ║      funde (preferimos o pino duplicado ao falso-merge — espelha o        ║
// ║      "prefere o silêncio" do §3.3 do match).                              ║
// ║                                                                            ║
// ║  (c) REVERSÍVEL / EXPANSÍVEL pelo viewer — o grupo EXPÕE todos os membros  ║
// ║      (`group.members` = [representante, ...absorvidos]). A UI mostra um    ║
// ║      pino mas pode SEMPRE re-expandir o cluster e exibir cada membro       ║
// ║      individualmente. Nada é escondido de forma irreversível; o falso-     ║
// ║      merge, se acontecer, é desfeito por um toque do usuário, não por uma  ║
// ║      restauração de dados (porque o dado nunca saiu).                      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// PURO + DETERMINÍSTICO: `nowMs` é INJETADO pelo chamador (nunca Date.now() aqui —
// mesma disciplina de petMatchStrength/isPetArchivedByAge). NUNCA lança: pet
// malformado simplesmente não funde com ninguém (some do agrupamento como singleton
// em vez de derrubar o render).

import {
  MS_PER_DAY,
  haversineKm,
  isWildcardSpecies,
} from './petTaxonomy';

// ── Os limiares vivem em UMA SOT (espelha PET_MATCH_DEFAULTS / PET_ARCHIVE_WINDOW_DAYS),
//    lidos pelo predicado E pelos testes — nunca espalhados. CONSERVADORES por
//    design: muito mais apertados que o match, porque o custo do erro é maior. ──
//
// radiusMeters (~75 m): dois relatos do MESMO episódio caem praticamente no mesmo
//   ponto (a pessoa toca o mapa quase no mesmo lugar / o GPS varia poucos metros).
//   75 m absorve o jitter de um pino solto à mão sem alcançar o quarteirão vizinho
//   — ~67× mais apertado que os 5 km do match (intencional: dedup ≠ match).
// windowDays (~3): o mesmo relato re-postado acontece em horas/poucos dias, não em
//   semanas. 3 dias cobre "publiquei, não vi aparecer, publiquei de novo amanhã"
//   sem fundir dois episódios distantes no tempo — ~10× mais apertado que os 30
//   dias do match.
export const PET_DEDUP_DEFAULTS = {
  radiusMeters: 75, // ~75 m: jitter do mesmo episódio, NÃO o quarteirão vizinho
  windowDays: 3,    // ~3 dias: re-post em horas/poucos dias, não um novo episódio
};

// Metros por km — fator local (evita o número mágico 1000 espalhado).
const METERS_PER_KM = 1000;

// Timestamp (ms) de um pet para a janela de dedup. PURO: usa o DateISO de
// publicação (o fato histórico de QUANDO o relato entrou — NÃO freshnessAt, que é
// o "fato vivo" do M13; dois posts do mesmo episódio são próximos na PUBLICAÇÃO,
// não na última renovação). Data ausente/ilegível → null (não funde por tempo —
// degrada com calma, igual ao Infinity de petAgeDays). PURO, nunca lança.
function petPublishMs(pet) {
  const iso = pet && pet.dateIso;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

// Predicado PURO e DETERMINÍSTICO: dois pets são QUASE-DUPLICADOS (o MESMO relato
// re-postado)? `nowMs` é parte da assinatura (injetado, nunca Date.now() aqui) por
// simetria com os outros predicados puros do módulo; a janela mede Δ ENTRE as duas
// publicações (não a idade absoluta), então `nowMs` não é consultado hoje — fica
// reservado e documenta a injeção. NUNCA lança.
//
// CONSERVADOR por construção (Lens-of-Failure barricada (b)): exige concordância em
// QUATRO eixos, TODOS apertados — um único eixo frouxo já NÃO funde:
//   1. MESMO status (perdido com perdido; não cruza status como o match faz);
//   2. MESMA espécie CONCRETA — coringa (outro/vazio) NUNCA funde (incerteza de
//      identidade não pode apagar um report; espelha a regra do coringa do §1.2,
//      mas aqui ainda mais dura: lá o coringa só enfraquece, aqui ele BLOQUEIA);
//   3. coords dentro de radiusMeters (~75 m — muito mais apertado que o match);
//   4. publicações dentro de windowDays (~3 dias — muito mais apertado que o match).
// Default em DÚVIDA = NÃO funde (qualquer eixo que falhe → false): preferimos o
// pino duplicado ao falso-merge (espelha "prefere o silêncio" do §3.3).
export function isNearDuplicate(petA, petB, nowMs, defaults = PET_DEDUP_DEFAULTS) {
  void nowMs;
  const a = petA || {};
  const b = petB || {};

  // 1) MESMO status (string igual; status ausente/lixo de um lado → não funde).
  if (!a.status || a.status !== b.status) return false;

  // 2) MESMA espécie CONCRETA — coringa (outro/vazio) NUNCA funde. Se qualquer
  //    lado é coringa, a identidade é incerta e fundir poderia apagar um report
  //    distinto (barricada (b) do Lens-of-Failure). Espécies concretas precisam
  //    ser IGUAIS (cao com cao); cao≠gato obviamente não funde.
  if (isWildcardSpecies(a.species) || isWildcardSpecies(b.species)) return false;
  if (a.species !== b.species) return false;

  // 3) coords MUITO próximas (~75 m). haversineKm devolve km (Infinity p/ par
  //    inválido → nunca funde). Converte o limiar SOT de metros p/ km e compara.
  const km = haversineKm(a.coords, b.coords);
  const radiusKm = defaults.radiusMeters / METERS_PER_KM;
  if (!(km <= radiusKm)) return false; // inclui Infinity/NaN: par inválido não funde

  // 4) janela de tempo curta (~3 dias) entre as DUAS publicações. Data ilegível de
  //    qualquer lado → não funde (degrada com calma).
  const tA = petPublishMs(a);
  const tB = petPublishMs(b);
  if (tA === null || tB === null) return false;
  const deltaDays = Math.abs(tA - tB) / MS_PER_DAY;
  return deltaDays <= defaults.windowDays;
}

// SOFT-CONSOLIDA uma lista de pets em GRUPOS de quase-duplicados, para EXIBIÇÃO.
// PURA + DETERMINÍSTICA (`nowMs` injetado). NÃO muta nenhum pet de entrada, NÃO
// deleta, NÃO reescreve — devolve uma NOVA estrutura de grupos sobre os MESMOS
// objetos de pet (barricada (a) do Lens-of-Failure: visual/soft only).
//
// Forma de cada grupo (REVERSÍVEL/EXPANSÍVEL — barricada (c)):
//   {
//     representative,  // o pet mostrado como pino único (o 1º membro, ordem estável)
//     members,         // [representative, ...absorvidos] — TODOS os membros, sempre
//     duplicateCount,  // members.length - 1 (quantos foram absorvidos; 0 = singleton)
//   }
// `members` SEMPRE contém todos os relatos do cluster, então a UI pode re-expandir
// o grupo e mostrar cada um individualmente — o falso-merge (se ocorrer) é desfeito
// por um toque, porque NADA foi destruído.
//
// AGRUPAMENTO conservador (single-linkage simples e determinístico): varre os pets
// na ORDEM dada; cada pet ou abre um grupo novo (vira representante) ou entra no
// PRIMEIRO grupo existente cujo REPRESENTANTE seja seu quase-duplicado. Casar contra
// o REPRESENTANTE (não contra qualquer membro) mantém o cluster APERTADO em torno de
// um ponto único — evita o "encadeamento" (drift) onde A~B e B~C arrastariam C para
// longe de A. Na dúvida (sem representante quase-duplicado), o pet vira seu próprio
// grupo (singleton) — preferir não-fundir é a barricada (b).
//
// Defensiva: `pets` não-array → []; um pet null/lixo nunca casa (isNearDuplicate é
// defensivo) e simplesmente forma um singleton — nunca derruba o agrupamento.
export function groupNearDuplicates(pets, nowMs, defaults = PET_DEDUP_DEFAULTS) {
  if (!Array.isArray(pets)) return [];
  const groups = [];
  for (const pet of pets) {
    let placed = false;
    for (const g of groups) {
      // Casa contra o REPRESENTANTE do grupo (cluster apertado, sem drift).
      if (isNearDuplicate(g.representative, pet, nowMs, defaults)) {
        g.members.push(pet);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Novo grupo: este pet é o representante (members começa com ele mesmo).
      groups.push({ representative: pet, members: [pet] });
    }
  }
  // Carimba o duplicateCount derivado em cada grupo (DEPOIS de fechar os membros),
  // sem mutar nenhum pet — só os objetos de grupo recém-criados aqui.
  return groups.map((g) => ({
    representative: g.representative,
    members: g.members,
    duplicateCount: g.members.length - 1,
  }));
}
