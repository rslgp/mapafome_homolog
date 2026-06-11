// petPublishQueue.test.js — PET-M1.
//
// Cobre a fila offline de PUBLICAÇÃO de pet: enqueue persiste, flush drena na
// ORDEM, para na primeira falha, e — o ponto-chave da aceitação — um flush
// NUNCA causa duplo-append quando o write original já tinha chegado (o caminho
// de idempotência via idempotency_key). Também valida o isolamento kind:'pet':
// a fila usa um banco IndexedDB SEPARADO do M7 de fome.
//
// IndexedDB é MOCKADO por um shim em memória mínimo (jsdom não o implementa e
// não trazemos fake-indexeddb pra não mexer no node_modules). O shim cobre só o
// que o petPublishQueue usa: open + objectStore('add' autoIncrement / getAll /
// delete) + os callbacks onsuccess/onerror/oncomplete.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Shim de IndexedDB em memória ────────────────────────────────────────────
// Um único "banco" por DB_NAME, com um store keyPath:'id' autoIncrement.
function installFakeIndexedDB() {
  const dbs = new Map(); // dbName -> { stores: Map(storeName -> { rows: Map(id,val), seq }) }

  function getDb(name) {
    if (!dbs.has(name)) dbs.set(name, { stores: new Map() });
    return dbs.get(name);
  }

  function makeStore(storeState) {
    return {
      add(value) {
        const req = {};
        queueMicrotask(() => {
          storeState.seq = (storeState.seq || 0) + 1;
          const id = storeState.seq;
          storeState.rows.set(id, { ...value, id });
          req.result = id;
          req.onsuccess && req.onsuccess();
        });
        return req;
      },
      getAll() {
        const req = {};
        queueMicrotask(() => {
          req.result = Array.from(storeState.rows.values());
          req.onsuccess && req.onsuccess();
        });
        return req;
      },
      delete(id) {
        const req = {};
        queueMicrotask(() => {
          storeState.rows.delete(id);
          req.onsuccess && req.onsuccess();
        });
        return req;
      },
    };
  }

  const fake = {
    open(name /*, version */) {
      const req = {};
      queueMicrotask(() => {
        const db = getDb(name);
        const result = {
          objectStoreNames: { contains: (s) => db.stores.has(s) },
          createObjectStore(s) {
            db.stores.set(s, { rows: new Map(), seq: 0 });
            return makeStore(db.stores.get(s));
          },
          transaction(storeName /*, mode */) {
            const tx = {};
            const storeState = db.stores.get(storeName);
            tx.objectStore = () => makeStore(storeState);
            // delete() resolve via tx.oncomplete no código real.
            queueMicrotask(() => { tx.oncomplete && tx.oncomplete(); });
            return tx;
          },
        };
        req.result = result;
        // O upgrade cria o store na primeira abertura.
        if (!db.stores.has('pending')) {
          req.onupgradeneeded && req.onupgradeneeded();
        }
        req.onsuccess && req.onsuccess();
      });
      return req;
    },
    __dbs: dbs,
  };

  globalThis.indexedDB = fake;
  return fake;
}

let queue;

beforeEach(async () => {
  vi.resetModules();
  installFakeIndexedDB();
  // Import fresh APÓS instalar o shim (o módulo lê `indexedDB` no openDb).
  queue = await import('./petPublishQueue.js');
});

describe('petPublishQueue — enqueue/flush', () => {
  it('enfileira um payload e o flush o publica e remove (drena a fila)', async () => {
    const payload = { coords: [-8, -34], status: 'perdido', idempotency_key: 'k1' };
    await queue.enqueue(payload, 1000); // queuedAt injetado (determinístico)

    expect(await queue.queueSize()).toBe(1);

    const publishFn = vi.fn().mockResolvedValue(undefined);
    const result = await queue.flush(publishFn);

    expect(publishFn).toHaveBeenCalledTimes(1);
    expect(publishFn).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    expect(await queue.queueSize()).toBe(0);
  });

  it('preserva o idempotency_key no payload enfileirado (re-publish idempotente)', async () => {
    await queue.enqueue({ coords: [-8, -34], status: 'avistado', idempotency_key: 'idem-42' }, 1000);
    const seen = [];
    const publishFn = vi.fn(async (p) => { seen.push(p.idempotency_key); });
    await queue.flush(publishFn);
    // O flush entrega o MESMO idempotency_key — é o que deixa publishPet
    // reconhecer "já gravei" e devolver sem duplo-append.
    expect(seen).toEqual(['idem-42']);
  });

  it('para na PRIMEIRA falha sem remover o item (o próximo online tenta de novo)', async () => {
    await queue.enqueue({ idempotency_key: 'a' }, 1000);
    await queue.enqueue({ idempotency_key: 'b' }, 2000);

    const publishFn = vi.fn().mockRejectedValue(new Error('failed to fetch'));
    const result = await queue.flush(publishFn);

    expect(result).toEqual({ attempted: 2, succeeded: 0, failed: 1 });
    expect(publishFn).toHaveBeenCalledTimes(1); // parou no primeiro
    expect(await queue.queueSize()).toBe(2);    // nada removido
  });

  it('flush em fila vazia é no-op', async () => {
    const publishFn = vi.fn();
    const result = await queue.flush(publishFn);
    expect(publishFn).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
  });
});

describe('petPublishQueue — idempotência no flush (sem duplo-write)', () => {
  it('um flush APÓS o write original ter chegado NÃO grava de novo (idempotency_key)', async () => {
    // Simula o cenário server_slow: o write ORIGINAL chegou ao servidor (timeout
    // no cliente mascarou isso), o relato foi enfileirado, e agora o flush
    // reenvia o MESMO payload. publishPet de verdade consulta seenIdempotencyKeys;
    // aqui modelamos esse contrato com um publishFn idempotente por chave.
    const written = new Set();      // o que "chegou na planilha"
    const appendCalls = [];         // toda tentativa de append

    const publishFn = vi.fn(async (p) => {
      appendCalls.push(p.idempotency_key);
      if (written.has(p.idempotency_key)) return; // já vista → não grava (idempotente)
      written.add(p.idempotency_key);
    });

    const payload = { coords: [-8, -34], status: 'perdido', idempotency_key: 'dup-key' };
    // O write original "já aconteceu" antes do flush.
    written.add('dup-key');

    await queue.enqueue(payload, 1000);
    const result = await queue.flush(publishFn);

    // O flush chamou publishFn (e portanto removeu da fila), mas como a chave já
    // estava vista, NENHUM segundo append ocorreu — sem linha duplicada.
    expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    expect(appendCalls).toEqual(['dup-key']);
    expect(written.size).toBe(1);            // continua UMA linha
    expect(await queue.queueSize()).toBe(0); // item drenado
  });

  it('usa um banco IndexedDB SEPARADO do M7 de fome (isolamento kind:pet)', async () => {
    await queue.enqueue({ idempotency_key: 'pet-only' }, 1000);
    // O shim indexa por DB_NAME; a fila de pet deve usar a sua, não a de fome.
    const dbNames = Array.from(globalThis.indexedDB.__dbs.keys());
    expect(dbNames).toContain('mdf_pet_publish_queue');
    expect(dbNames).not.toContain('mdf_publish_queue');
  });
});
