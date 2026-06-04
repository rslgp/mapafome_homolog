'use client';

/*
 * M7 — service worker registration. Kept off the render path: caller invokes
 * registerOnce() after mount so the SW lifecycle does not block first paint.
 *
 * B16 — when a new SW is found post-deploy, surface a non-blocking toast so
 * the returning user can adopt the new build with a single tap instead of
 * hard-reloading twice. The default flow has the new SW sit in `waiting`
 * indefinitely; we postMessage SKIP_WAITING when the user accepts.
 */

let registered = false;

function showUpdateToast(reg) {
  if (typeof document === 'undefined') return;
  // Idempotent: don't stack toasts if updatefound fires twice.
  if (document.getElementById('mdf-sw-toast')) return;
  const el = document.createElement('div');
  el.id = 'mdf-sw-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = [
    'position:fixed',
    'left:50%',
    'transform:translateX(-50%)',
    'bottom:calc(16px + env(safe-area-inset-bottom, 0px))',
    'z-index:2300',
    'display:flex',
    'gap:12px',
    'align-items:center',
    'max-width:calc(100vw - 24px)',
    'padding:10px 16px',
    'background:#1A1A1A',
    'color:#FFF',
    'border-radius:999px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.18)',
    'font:500 14px/1.4 system-ui, sans-serif',
  ].join(';');
  // Force-update mode (per user requirement 2026-04-30): the dismiss
  // button is removed so users cannot stay on a stale build. The toast
  // also auto-accepts after a 30-second grace period — long enough to
  // finish a sentence in the report sheet, short enough that a user
  // who walks away returns to the new build.
  el.innerHTML = `
    <span>Nova versão disponível.</span>
    <button type="button" style="appearance:none;border:none;background:#D64545;color:#FFF;padding:6px 12px;border-radius:999px;font:600 13px/1 system-ui,sans-serif;cursor:pointer;min-height:32px">Recarregar</button>
  `;
  const reloadBtn = el.querySelector('button');
  let reloadingOnce = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Fired once SKIP_WAITING activates the new worker — reload to pick up
    // the new shell. Guard against the double-fire race.
    if (reloadingOnce) return;
    reloadingOnce = true;
    window.location.reload();
  });
  const adoptUpdate = () => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  };
  reloadBtn.addEventListener('click', adoptUpdate);
  // Auto-accept after 30s of inactivity — user has had time to see the
  // toast and choose to tap. After that the new build is forced in.
  const FORCE_RELOAD_MS = 30000;
  setTimeout(adoptUpdate, FORCE_RELOAD_MS);
  document.body.appendChild(el);
}

export function registerOnce() {
  if (registered) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Skip registration ONLY under the Next.js dev server, where the HMR runtime
  // conflicts with a cache-first shell (stale bundles). Any PRODUCTION-built
  // bundle registers — whether deployed (HTTPS) or served locally via
  // `npm run build && npx serve out` (http://localhost is a secure context).
  // This is what makes the PWA installable + the install flow testable without
  // a deploy. (NODE_ENV is inlined at build time by Next.)
  if (process.env.NODE_ENV !== 'production') return;

  registered = true;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      // updateViaCache:'none' stops the HTTP cache from masking a new sw.js so
      // a fresh deploy is picked up (PWA-lite builder PWAL-A2).
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        if (!reg) return;
        // Force an update check on every load: a freshly deployed sw.js is
        // adopted promptly and Chrome re-evaluates installability criteria
        // (so `beforeinstallprompt` can fire for the install button).
        try { reg.update(); } catch (e) { /* update is best-effort */ }
        // Already-waiting SW from a previous visit — show toast immediately.
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg);
        // New SW arrives mid-session — wait for installation, then prompt.
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });
      })
      .catch((err) => {
        // SW failure must never break the page. Downgrade to plain warning.
        console.warn('[sw] registration failed:', err && err.message);
      });
  });
}
