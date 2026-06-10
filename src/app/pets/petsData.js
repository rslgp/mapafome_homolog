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
import { buildPetDados, parsePetRow } from './petDomain';

// Cache de idempotência client-side. Espelha o _idempotencyCache do
// App.writePinToSheets (M5): um double-tap após timeout não grava duas linhas.
const seenIdempotencyKeys = new Set();

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
  await appendRow(0, { Dados: JSON.stringify(dados) });

  // 5. Marca a chave como vista só após o sucesso da gravação.
  if (idempotency_key) seenIdempotencyKeys.add(idempotency_key);

  return normalized;
}
