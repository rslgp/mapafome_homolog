/*
 * MAPA FOME — service worker (M7 offline/PWA).
 *
 * Caching contracts:
 *   • app-shell  → cache-first (HTML/CSS/JS/fonts). Refreshed on new SW install.
 *   • tiles      → stale-while-revalidate, bounded size. Only caches public OSM
 *                  tiles per operations.osmfoundation.org usage policy. Waze
 *                  and Esri tiles are passed through uncached.
 *   • pin data   → network-first with fallback to cache (the Google Sheets
 *                  reads). Keeps donor views usable offline.
 *
 * The publish queue does NOT live here — it lives in IndexedDB in the page so
 * the user sees UI feedback. This SW is read-biased.
 */

const SW_VERSION = '1.0.0-1783219489648-55748d4';
const SHELL_CACHE = `${SW_VERSION}-shell`;
const TILE_CACHE  = `${SW_VERSION}-tiles`;
const DATA_CACHE  = `${SW_VERSION}-data`;

const MAX_TILES = 250;

self.addEventListener('install', (_event) => {
  // B16: do NOT skipWaiting here. We let the new SW sit in `waiting` so the
  // currently-loaded page (running the old code) keeps using the old SW
  // until the user opts in via the update toast — which postMessages
  // SKIP_WAITING and reloads. This avoids hydration mismatches caused by
  // serving new hashed assets to an old HTML shell.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => !k.startsWith(SW_VERSION))
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isTileUrl(url) {
  // Only OSM HOT (tile.openstreetmap.fr) is allowed to cache per licensing.
  return /\.tile\.openstreetmap\.fr\//.test(url);
}

function isDataUrl(url) {
  // Google Sheets reads.
  return /sheets\.googleapis\.com|spreadsheets\.google\.com/.test(url);
}

function isShellRequest(request) {
  // Same-origin GET for HTML/CSS/JS/fonts/images.
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return true;
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  const toDrop = keys.length - max;
  for (let i = 0; i < toDrop; i += 1) {
    await cache.delete(keys[i]);
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        trimCache(cacheName, MAX_TILES);
      }
      return response;
    })
    .catch(() => cached); // fall back to cache on network error
  return cached || networkPromise;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  if (isTileUrl(url)) {
    event.respondWith(staleWhileRevalidate(TILE_CACHE, request));
    return;
  }

  if (isDataUrl(url)) {
    event.respondWith(networkFirst(DATA_CACHE, request));
    return;
  }

  if (isShellRequest(request)) {
    event.respondWith(cacheFirst(SHELL_CACHE, request));
    return;
  }
  // Everything else (Waze/Esri tiles, third-party scripts) is untouched.
});

// Page → SW messaging: lets the page ask the SW to skip waiting.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
