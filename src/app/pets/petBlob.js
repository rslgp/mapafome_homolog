// petBlob.js — round-trip do blob `Dados` de uma linha de pet: build (barricada de
// ESCRITA) + parse (barricada de LEITURA) + o discriminador de motivo de fechamento
// que os dois round-trippeiam. Responsabilidade única: serializar/desserializar uma
// linha de pet. Importa as primitivas/validadores da folha (petTaxonomy) e os
// sanitizers da folha de higiene (petHygiene) — DAG sem ciclo. Re-exportado pelo
// barrel petDomain.js, então todo `import { buildPetDados, parsePetRow, … } from
// './petDomain'` (app E testes) segue casando sem edição no chamador.
//
// Disciplina de fronteira (v5 § defensive_programming.barricade_pattern):
//   • buildPetDados é PURA: valida, mas NÃO carimba data nem chama Date.now() —
//     quem chama (petsData.publishPet) injeta `dateIso`. Determinística/testável.
//   • parsePetRow é a barricada de LEITURA: todo parse é try/catch e retorna null
//     em qualquer entrada malformada — nunca lança (não pode derrubar o batch).

import {
  PET_KIND,
  isPetRow,
  isValidStatus,
  isFiniteCoordPair,
  PET_RESOLVED_AT_KEY,
  PET_FRESHNESS_AT_KEY,
} from './petTaxonomy';
import { sanitizeFreeText, sanitizePhotosUrl, PET_FREETEXT_MAXLEN } from './petHygiene';

// ─── PET-M7b — DISCRIMINADOR de MOTIVO do fechamento (closureReason, SOT) ─────
// `resolvedAt` (PET-M2) diz QUANDO o report saiu do mapa ativo. `closureReason`
// diz POR QUÊ — e os dois desfechos do estágio E da curva (PET_CURVE §1-E) são
// semanticamente DISTINTOS, embora ambos carimbem resolvedAt:
//   • REUNIDO   — o pet voltou (o desfecho mais esperançoso).
//   • ENCERRADO — o dono parou de procurar, um fechamento DIGNO e consciente
//                 (distinto de envelhecer/arquivar em silêncio pela janela do M12).
// Round-trip igual ao resolvedAt: buildPetDados EMITE a chave só quando presente,
// parsePetRow a LÊ de volta, e linhas antigas (sem a chave) leem como undefined
// (backward-compat). Ninguém escreve a string literal 'closureReason' fora deste
// módulo — o writer (petsData.resolvePet) e o parser usam esta constante.
export const PET_CLOSURE_REASON_KEY = 'closureReason';

// Os DOIS motivos válidos (SOT). Ids estáveis (vão pra planilha). Ninguém escreve
// 'reunido'/'encerrado' hardcoded como motivo — importam destas constantes.
export const PET_CLOSURE_REASON = {
  REUNIDO: 'reunido',
  ENCERRADO: 'encerrado',
};

const CLOSURE_REASON_IDS = new Set(Object.values(PET_CLOSURE_REASON));

// Um motivo de fechamento é válido? Defensivo: qualquer valor fora da SOT (lixo,
// undefined) → false. PURO. Usado por buildPetDados (barricada de escrita) e pode
// ser lido por qualquer consumidor que precise distinguir os dois desfechos.
export function isValidClosureReason(reason) {
  return CLOSURE_REASON_IDS.has(reason);
}

// Monta o blob `Dados` de uma linha de pet. PURA: lança Error claro se status ou
// coords forem inválidos; exige `dateIso` do chamador (sem Date.now() aqui).
// Campos de texto opcionais caem para string vazia.
//
// PET-M2 — ciclo de vida "reunido": `resolvedAt` é OPCIONAL e, igual a `dateIso`,
// é INJETADO pelo chamador (ISO string; nunca Date.now() aqui — a função segue
// pura/determinística). Só é EMITIDO quando fornecido: uma linha recém-publicada
// (sem resolvedAt) não carrega a chave, e o parser a lê de volta como ATIVA
// (backward-compat). Isto REMOVE a suposição implícita de que todo pet montado
// está ativo — o estado agora é explícito no blob.
export function buildPetDados({ coords, status, species, size, color, name, contact, detail, photos, dateIso, resolvedAt, closureReason, freshnessAt }) {
  if (!isValidStatus(status)) {
    throw new Error(`buildPetDados: status inválido "${status}"`);
  }
  if (!isFiniteCoordPair(coords)) {
    throw new Error('buildPetDados: coords deve ser um par [lat,lng] finito');
  }
  // PET-M3 — texto livre passa pela barricada de higiene (cap + strip de
  // controle), nunca mais cru. `species`/`size` são ids validados contra um Set
  // (não texto livre), então só caem para ''.
  // SEC-03 — `contact` AGORA também passa por sanitizeFreeText. Antes era `||''`
  // cru sob a justificativa de que resolveContact o trata como AÇÃO (nunca texto
  // renderizado). Mas `contact` PERSISTE em Dados.contact — uma string forjada
  // com caracteres de controle entrava intacta na planilha. sanitizeFreeText
  // remove SÓ controle (C0/DEL/C1); os caracteres imprimíveis de um telefone/
  // e-mail (+, (), -, @, dígitos, letras) sobrevivem, então a formatação legítima
  // não é mexida — só o vetor de injeção de controle é fechado, com cap de 60
  // (espelha o maxLength do input).
  const dados = {
    kind: PET_KIND,
    status,
    species: species || '',
    size: size || '',
    color: sanitizeFreeText(color, PET_FREETEXT_MAXLEN.color),
    name: sanitizeFreeText(name, PET_FREETEXT_MAXLEN.name),
    contact: sanitizeFreeText(contact, PET_FREETEXT_MAXLEN.contact),
    Detalhe: sanitizeFreeText(detail, PET_FREETEXT_MAXLEN.detail),
    photos: sanitizePhotosUrl(photos),
    Coordinates: JSON.stringify(coords),
    DateISO: dateIso,
  };
  // Só carimba a chave quando o chamador realmente passou um ISO não-vazio —
  // mantém as linhas ativas LIMPAS (sem campo nulo) e o round-trip simétrico.
  if (resolvedAt) {
    dados[PET_RESOLVED_AT_KEY] = resolvedAt;
  }
  // PET-M7b — `closureReason` segue a MESMA disciplina opcional do resolvedAt:
  // só é emitido quando o chamador passa um motivo VÁLIDO (da SOT). Um motivo
  // lixo/inválido é descartado (não polui o blob) — a barricada de escrita aceita
  // só 'reunido'/'encerrado'. Uma linha ativa (sem fechamento) não carrega a chave
  // e o parser a lê de volta como undefined (backward-compat).
  if (isValidClosureReason(closureReason)) {
    dados[PET_CLOSURE_REASON_KEY] = closureReason;
  }
  // PET-M12/M13 — `freshnessAt` segue a MESMA disciplina opcional do resolvedAt:
  // só é emitido quando o chamador injeta um ISO (o writer de "ainda procurando"
  // do M13). Uma linha recém-publicada NÃO carrega a chave (round-trip limpo) e o
  // parser a lê de volta como undefined → a idade cai no fallback DateISO.
  if (freshnessAt) {
    dados[PET_FRESHNESS_AT_KEY] = freshnessAt;
  }
  return dados;
}

// Lê uma linha da planilha (objeto com `.Dados` em JSON-string) e retorna um pet
// NORMALIZADO ou null. Nunca lança — toda etapa é defensiva (barricada de leitura).
export function parsePetRow(row) {
  if (!row || typeof row.Dados !== 'string') return null;

  let dados;
  try {
    dados = JSON.parse(row.Dados);
  } catch (_e) {
    return null;
  }
  if (!isPetRow(dados)) return null;

  let coords;
  try {
    coords = JSON.parse(dados.Coordinates);
  } catch (_e) {
    return null;
  }
  if (!isFiniteCoordPair(coords)) return null;

  // PET-M2 — ciclo de vida "reunido". Linhas antigas (sem a chave) leem como
  // resolvedAt:undefined → resolved:false → ATIVAS (backward-compat, sem
  // regressão de parse). `resolved` é o discriminador derivado: a fonte é o
  // ISO, mas o consumidor (mapa/lista) só precisa do booleano para descartar
  // ou distinguir um pet reunido (ver também isPetResolved).
  const resolvedAt = dados[PET_RESOLVED_AT_KEY] || undefined;
  // PET-M7b — motivo do fechamento (round-trip, backward-compat). Linhas antigas
  // (sem a chave) E pets ativos leem como undefined. Um valor fora da SOT é
  // descartado na leitura também (só 'reunido'/'encerrado' sobrevivem) — a mesma
  // barricada da escrita, espelhada na leitura, para um blob adulterado não
  // injetar um motivo lixo na UI.
  const rawClosure = dados[PET_CLOSURE_REASON_KEY];
  const closureReason = isValidClosureReason(rawClosure) ? rawClosure : undefined;
  // PET-M12/M13 — carimbo de frescor (round-trip, backward-compat). Linhas sem o
  // campo (todas hoje) leem como undefined → o relógio de idade cai no fallback
  // DateISO (ver isPetArchivedByAge). M13 grava este campo via o writer do M2.
  const freshnessAt = dados[PET_FRESHNESS_AT_KEY] || undefined;
  return {
    coords,
    status: dados.status,
    species: dados.species || '',
    size: dados.size || '',
    color: dados.color || '',
    name: dados.name || '',
    contact: dados.contact || '',
    detail: dados.Detalhe || '',
    photos: sanitizePhotosUrl(dados.photos),
    dateIso: dados.DateISO,
    resolvedAt,
    resolved: Boolean(resolvedAt),
    // PET-M7b — POR QUÊ do fechamento (ou undefined se ativo / linha antiga). O
    // mapa/lista só precisa de `resolved` (booleano) para podar; `closureReason`
    // distingue reunido de encerrado onde o desfecho importa (ex.: PET-M11 pode
    // dar um glifo distinto, ou analytics PET-M21 separar os funis).
    closureReason,
    // `freshnessAt` é exposto para o relógio de idade do M12/M13 medir contra ele
    // com fallback para `dateIso`. Não vira um booleano derivado aqui (diferente
    // de `resolved`): a idade é contínua, então o discriminador `aged` é DERIVADO
    // por isPetArchivedByAge(pet, nowMs) no boundary que tem o relógio (PetsApp),
    // nunca no parse puro (que é determinístico, sem Date.now()).
    freshnessAt,
  };
}
