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
  el.innerHTML = `
    <span>Nova versão disponível.</span>
    <button type="button" style="appearance:none;border:none;background:#D64545;color:#FFF;padding:6px 12px;border-radius:999px;font:600 13px/1 system-ui,sans-serif;cursor:pointer;min-height:32px">Recarregar</button>
    <button type="button" aria-label="Adiar" style="appearance:none;border:none;background:transparent;color:rgba(255,255,255,0.6);padding:6px 8px;font:400 18px/1 system-ui,sans-serif;cursor:pointer;min-height:32px">×</button>
  `;
  const [reloadBtn, dismissBtn] = el.querySelectorAll('button');
  let reloadingOnce = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Fired once SKIP_WAITING activates the new worker — reload to pick up
    // the new shell. Guard against the double-fire race.
    if (reloadingOnce) return;
    reloadingOnce = true;
    window.location.reload();
  });
  reloadBtn.addEventListener('click', () => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    el.remove();
  });
  dismissBtn.addEventListener('click', () => el.remove());
  document.body.appendChild(el);
}

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
      .then((reg) => {
        if (!reg) return;
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
