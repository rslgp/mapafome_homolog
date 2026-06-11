// petPublishQueueBind.test.js — PET-M5 (gap-fill for petPublishQueue).
//
// petPublishQueue.test.js já cobre enqueue/flush/dedupe/isolamento. As LACUNAS
// que restavam (branches/functions abaixo de 70%) eram os caminhos de borda:
//   • bindOnlineFlush — faz um flush eager no bind, re-flusha no evento 'online',
//     chama onResult só quando há item, e devolve um unbind que remove o listener;
//   • queueSize / peekAll quando o IndexedDB está INDISPONÍVEL → degrada para 0 /
//     resultado vazio em vez de lançar (barricada);
//   • flush quando o peekAll rejeita → { attempted:0 } (não derruba o bind).
//
// Reusa o MESMO shim de IndexedDB em memória do teste irmão (jsdom não implementa
// IndexedDB; não trazemos fake-indexeddb pra não mexer no node_modules).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Shim de IndexedDB em memória (idêntico ao de petPublishQueue.test.js) ────
function installFakeIndexedDB() {
  const dbs = new Map();
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
    open(name) {
      const req = {};
      queueMicrotask(() => {
        const db = getDb(name);
        const result = {
          objectStoreNames: { contains: (s) => db.stores.has(s) },
          createObjectStore(s) {
            db.stores.set(s, { rows: new Map(), seq: 0 });
            return makeStore(db.stores.get(s));
          },
          transaction(storeName) {
            const tx = {};
            const storeState = db.stores.get(storeName);
            tx.objectStore = () => makeStore(storeState);
            queueMicrotask(() => { tx.oncomplete && tx.oncomplete(); });
            return tx;
          },
        };
        req.result = result;
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
  queue = await import('./petPublishQueue.js');
});

afterEach(() => {
  delete globalThis.indexedDB;
});

describe('bindOnlineFlush — flush eager no bind + no evento online + unbind', () => {
  it('faz um flush EAGER no bind: drena o que já estava na fila e chama onResult', async () => {
    await queue.enqueue({ idempotency_key: 'eager' }, 1000);
    const publishFn = vi.fn().mockResolvedValue(undefined);
    const onResult = vi.fn();

    const unbind = queue.bindOnlineFlush(publishFn, { onResult });
    // bindOnlineFlush chama o handler imediatamente (flush eager). Espera os
    // microtasks do shim resolverem.
    await new Promise((r) => setTimeout(r, 0));

    expect(publishFn).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0]).toMatchObject({ attempted: 1, succeeded: 1 });
    expect(typeof unbind).toBe('function');
    unbind();
  });

  it('re-flusha quando a aba volta a ficar ONLINE; o unbind para de ouvir', async () => {
    const publishFn = vi.fn().mockResolvedValue(undefined);
    const onResult = vi.fn();
    // Fila vazia no bind → o flush eager não chama onResult (attempted:0).
    const unbind = queue.bindOnlineFlush(publishFn, { onResult });
    await new Promise((r) => setTimeout(r, 0));
    expect(onResult).not.toHaveBeenCalled();

    // Chega um item e o evento 'online' dispara → flush real.
    await queue.enqueue({ idempotency_key: 'after-online' }, 2000);
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 0));
    expect(publishFn).toHaveBeenCalledWith({ idempotency_key: 'after-online' });
    expect(onResult).toHaveBeenCalledTimes(1);

    // Após o unbind, um novo 'online' não dispara mais flush.
    publishFn.mockClear();
    unbind();
    await queue.enqueue({ idempotency_key: 'post-unbind' }, 3000);
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 0));
    expect(publishFn).not.toHaveBeenCalled();
  });
});

describe('degradação quando o IndexedDB está indisponível (barricada)', () => {
  beforeEach(() => {
    // Remove o shim para forçar o caminho de "indexeddb_unavailable".
    delete globalThis.indexedDB;
  });

  it('queueSize → 0 em vez de lançar quando não há IndexedDB', async () => {
    await expect(queue.queueSize()).resolves.toBe(0);
  });

  it('flush → { attempted:0 } quando o peekAll rejeita (sem derrubar o bind)', async () => {
    const publishFn = vi.fn();
    const result = await queue.flush(publishFn);
    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(publishFn).not.toHaveBeenCalled();
  });

  it('enqueue rejeita com indexeddb_unavailable (o chamador classifica como falha)', async () => {
    await expect(queue.enqueue({ idempotency_key: 'x' }, 1000)).rejects.toThrow(/indexeddb_unavailable/);
  });
});
