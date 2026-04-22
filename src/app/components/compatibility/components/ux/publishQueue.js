'use client';

/*
 * M7 publish queue — offline-tolerant storage for reporter pins that failed
 * to reach Google Sheets. Uses IndexedDB so state survives reload and process
 * kill. Flushed opportunistically when the tab goes online or on SW message.
 */

const DB_NAME = 'mdf_publish_queue';
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

export async function enqueue(payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add({ payload, queuedAt: Date.now() });
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

// Given a publish function, drain the queue. Stop on the first failure so we
// don't burn the user's retries — the next `online` event will try again.
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

export function bindOnlineFlush(publishFn, { onResult } = {}) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    const result = await flush(publishFn);
    if (result.attempted > 0 && onResult) onResult(result);
  };
  window.addEventListener('online', handler);
  // Also flush eagerly on bind in case we came back online while script loaded.
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
