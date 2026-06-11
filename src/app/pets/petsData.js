'use client';

// petsData.js — camada de dados do /pets (client-side).
//
// Reaproveita o sheetsClient (mesma planilha do app de fome, sheet índice 0) e o
// domínio puro (petDomain). Discrimina linhas de pet por `kind:'pet'`. Escreve
// APENAS a coluna `Dados` — sem Roaster, sem Categorias, sem campos de need —
// que é exatamente o que mantém a linha invisível ao mapa e aos relatórios de fome.
//
// v5 alignment:
//   • SRP: I/O de planilha fica no sheetsClient; regra de domínio no petDomain;
//     este módulo só orquestra (busca → parse, valida → monta → grava).
//   • DI: a dependência de planilha entra por import (sheetsClient já injetado).
//   • barricade: validateCoordinatePair lança ANTES de qualquer escrita.

import { getSheet, appendRow, validateCoordinatePair } from '../components/compatibility/components/googlesheets/sheetsClient';
import { buildPetDados, parsePetRow, isPetRow, PET_RESOLVED_AT_KEY } from './petDomain';

// Cache de idempotência client-side. Espelha o _idempotencyCache do
// App.writePinToSheets (M5): um double-tap após timeout não grava duas linhas.
// É ESTE conjunto que garante que um flush da fila offline (PET-M1) nunca faça
// duplo-append: a chave já vista devolve sem gravar de novo.
const seenIdempotencyKeys = new Set();

// PET-M1. Timeout na ÚNICA chamada de rede que importa para o usuário (o write).
// Espelha o withTimeout de appPinActions.writePinToSheets: 10s e rejeita com
// 'network_slow' para o chamador distinguir "lento (pode ter salvo)" de "rede
// caída". O write pode ter chegado ao servidor — por isso a fila + idempotência.
const WRITE_TIMEOUT_MS = 10000;
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network_slow')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// Busca todos os pets da planilha. Mapeia cada linha por parsePetRow e descarta
// os nulos — uma linha malformada (ou de fome) nunca derruba o batch, pois
// parsePetRow já retorna null em vez de lançar.
export async function fetchPets() {
  const sheet = await getSheet(0);
  const rows = await sheet.getRows();
  const pets = [];
  for (const row of rows) {
    const pet = parsePetRow(row);
    if (pet) pets.push(pet);
  }
  return pets;
}

// Publica um pet. Retorna o objeto de pet NORMALIZADO para o chamador adicionar
// otimisticamente ao mapa sem refetch. Em republicação idempotente, retorna o
// objeto montado sem gravar de novo.
export async function publishPet({ coords, status, species, size, color, name, contact, detail, photos, idempotency_key }) {
  // 1. Barricada: lança (SheetsValidationError) se fora do bbox Brasil / não-finito.
  validateCoordinatePair(coords);

  // 3. Monta o blob (data carimbada AQUI — runtime real; petDomain fica puro).
  const dateIso = new Date().toISOString();
  const dados = buildPetDados({ coords, status, species, size, color, name, contact, detail, photos, dateIso });
  const normalized = {
    coords,
    status,
    species: dados.species,
    size: dados.size,
    color: dados.color,
    name: dados.name,
    contact: dados.contact,
    detail: dados.Detalhe,
    photos: dados.photos,
    dateIso,
  };

  // 2. Idempotência: se já vimos esta chave, devolve sem gravar de novo.
  if (idempotency_key && seenIdempotencyKeys.has(idempotency_key)) {
    return normalized;
  }

  // 4. Grava SOMENTE a coluna Dados — nada de Roaster/Categorias/need-field.
  // Sob timeout de 10s: um servidor lento rejeita com 'network_slow' (o write
  // pode ter saído), que o chamador classifica como server_slow e enfileira —
  // a chave de idempotência acima evita o duplo-append no flush.
  await withTimeout(appendRow(0, { Dados: JSON.stringify(dados) }), WRITE_TIMEOUT_MS);

  // 5. Marca a chave como vista só após o sucesso da gravação.
  if (idempotency_key) seenIdempotencyKeys.add(idempotency_key);

  return normalized;
}

// ─── PET-M2 — writer coords-keyed (reescreve SÓ a coluna Dados) ──────────────
// Espelha sheetsClient.updatePinDadosByCoords (mesma forma: getSheet(0) → cache
// de rows em envVariables → find por Coordinates → muta o blob → row.save()).
// DUAS diferenças deliberadas, ambas exigidas pelo isolamento kind:'pet':
//   1. O matcher exige isPetRow(dados) ALÉM de Coordinates iguais. Pets e fome
//      compartilham a planilha; sem isso, um resolve de pet poderia reescrever
//      uma linha de FOME que por acaso caiu nas mesmas coords. O guard torna
//      isso impossível (forcing-function, não comentário).
//   2. Reescreve APENAS target.Dados — nunca Roaster/Categorias/campo de need —
//      preservando a invisibilidade da linha às superfícies de fome.
// Reusa o cache envVariables.rows entre chamadas, igual ao writer de fome.
// Retorna a linha atualizada, ou null se nenhuma linha de PET casar as coords.
export async function updatePetByCoords(envVariables, coordsStr, mutator) {
  const sheet = await getSheet(0);
  if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
  const target = envVariables.rows.find((x) => {
    try {
      const dados = JSON.parse(x.Dados);
      // Isolamento: só casa se for linha de pet E as coords baterem.
      return isPetRow(dados) && dados.Coordinates === coordsStr;
    } catch (_e) {
      return false;
    }
  });
  if (!target) return null;
  const dados = JSON.parse(target.Dados);
  mutator(dados);
  target.Dados = JSON.stringify(dados);
  await target.save();
  return target;
}

// Marca um pet como REUNIDO carimbando resolvedAt no blob Dados da linha que
// casa as coords. Conveniência sobre updatePetByCoords: stamping de tempo é
// feito AQUI (runtime real — espelha a disciplina de dateIso em publishPet),
// deixando petDomain puro. O ISO pode ser INJETADO (resolvedAt) — é isto que
// torna o resolve enfileirável: a fila offline do PET-M1 guarda o MESMO payload
// (coords + resolvedAt + idempotency_key) e um flush reaplica com o mesmo
// carimbo, então um reload lê de volta IDÊNTICO ao escrito nesta sessão (LSP).
//
// Idempotente: reusa o seenIdempotencyKeys de publishPet — um flush da fila
// nunca reescreve duas vezes a mesma resolução. Retorna a linha (ou null se a
// linha sumiu/arquivou — o chamador degrada com calma, PET-M18).
export async function resolvePet({ coords, resolvedAt, idempotency_key, envVariables = {} }) {
  // Idempotência: se já aplicamos esta resolução, devolve sem gravar de novo.
  if (idempotency_key && seenIdempotencyKeys.has(idempotency_key)) {
    return null;
  }
  // Carimba o tempo no runtime (não no domínio puro); aceita injeção para a fila.
  const stampIso = resolvedAt || new Date().toISOString();
  const coordsStr = JSON.stringify(coords);
  const row = await updatePetByCoords(envVariables, coordsStr, (dados) => {
    // Escreve SÓ o campo de ciclo de vida; nada mais do blob é tocado.
    dados[PET_RESOLVED_AT_KEY] = stampIso;
  });
  if (idempotency_key) seenIdempotencyKeys.add(idempotency_key);
  return row;
}
