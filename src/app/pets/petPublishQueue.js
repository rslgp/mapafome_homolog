'use client';

/*
 * petPublishQueue.js — fila offline-tolerante para RELATOS DE PET que não
 * chegaram à planilha (PET-M1). Fork enxuto do M7 publishQueue.js de fome
 * (mesma forma de seam: openDb/enqueue/peekAll/flush/bindOnlineFlush) com UMA
 * diferença deliberada: um BANCO IndexedDB SEPARADO (DB_NAME 'mdf_pet_publish_queue').
 *
 * Por que um store próprio (kind:'pet' isolation — restrição dura do PET-M0):
 *   Se pets e fome compartilhassem a mesma fila, um flush de fome drenaria um
 *   payload de pet pelo writePinToSheets (e vice-versa) — escrevendo a linha
 *   pela função ERRADA, vazando o relato de pet para uma superfície de fome.
 *   Cada fila guarda só os seus, e cada bindOnlineFlush recebe SUA publishFn.
 *
 * EXCLUI (PET-M1 scope): payload de FOTO no blob enfileirado (PET-M13/M14) — o
 * chamador (PetsApp) já não passa bytes de imagem; só o link sanitizado em
 * `photos`, que é leve. A fila guarda exatamente o mesmo payload de publishPet,
 * inclusive idempotency_key — é ELE que garante "flush nunca duplica".
 *
 * Survives reload e process-kill (IndexedDB). Drenado de forma oportunista
 * quando a aba volta a ficar online (evento 'online') ou no bind inicial.
 */

const DB_NAME = 'mdf_pet_publish_queue';
const DB_VERSION = 1;
const STORE = 'pending';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb_unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Enfileira um payload de publicação. `queuedAt` é injetado pelo chamador
// (determinismo — sem Date.now() no corpo da função pura; espelha a disciplina
// de dateIso em publishPet/buildPetDados). Default só pra ergonomia em runtime.
export async function enqueue(payload, queuedAt = Date.now()) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add({ payload, queuedAt });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function peekAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Dada uma função de publicação, drena a fila. Para na PRIMEIRA falha para não
// queimar os retries do usuário — o próximo evento 'online' tenta de novo.
//
// Idempotência (PET-M1, restrição dura): o payload enfileirado carrega o
// idempotency_key original. publishPet consulta seenIdempotencyKeys, então um
// flush DEPOIS de o write original ter chegado (caso server_slow) devolve sem
// gravar de novo — nunca há duplo-append. removemos da fila SÓ após o publishFn
// resolver, então um flush interrompido reprocessa o mesmo item (idempotente).
export async function flush(publishFn) {
  let pending;
  try {
    pending = await peekAll();
  } catch (_err) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }
  if (pending.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const row of pending) {
    try {
      await publishFn(row.payload);
      await remove(row.id);
      succeeded += 1;
    } catch (_err) {
      failed += 1;
      break;
    }
  }
  return { attempted: pending.length, succeeded, failed };
}

// Liga o flush ao evento 'online'. Devolve a função de desligar (o chamador
// guarda e chama no unmount). Faz um flush eager no bind caso a aba já tenha
// voltado a ficar online durante o carregamento do script.
export function bindOnlineFlush(publishFn, { onResult } = {}) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    const result = await flush(publishFn);
    if (result.attempted > 0 && onResult) onResult(result);
  };
  window.addEventListener('online', handler);
  handler();
  return () => window.removeEventListener('online', handler);
}

export async function queueSize() {
  try {
    const all = await peekAll();
    return all.length;
  } catch (_err) {
    return 0;
  }
}
