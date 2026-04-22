'use client';

/*
 * M7 — service worker registration. Kept off the render path: caller invokes
 * registerOnce() after mount so the SW lifecycle does not block first paint.
 */

let registered = false;

export function registerOnce() {
  if (registered) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Only register in production-style served contexts. In Next.js dev the HMR
  // runtime conflicts with cache-first shells and you see stale bundles.
  if (window.location.hostname === 'localhost' && window.location.port) return;

  registered = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // SW failure must never break the page. Downgrade to plain warning.
        console.warn('[sw] registration failed:', err && err.message);
      });
  });
}
