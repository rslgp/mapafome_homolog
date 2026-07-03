// wheelGate.js — pure cooperative-wheel state machine (UX-M01), framework-free
// so it unit-tests with a fake map (no Leaflet/jsdom acrobatics).
//
// Contract: on attach, scroll-wheel zoom is DISABLED so a wheel over the map
// scrolls the PAGE (the Google-embed pattern — the map stops being a scroll
// trap). The first real engagement with the map (click inside it, or focus
// entering its container) ACTIVATES wheel zoom for the rest of the session.
// A wheel spun while still locked fires a throttled onNudge so the UI can
// emphasize the "click to enable zoom" hint at the exact moment of intent.

const NUDGE_THROTTLE_MS = 600;

export function attachCooperativeWheel(map, { onActivate, onNudge } = {}) {
  const container = map.getContainer();
  let active = false;
  let detached = false;
  // -Infinity so the FIRST wheel always nudges regardless of clock epoch
  // (a 0 seed would swallow it when Date.now() is small, e.g. fake timers).
  let lastNudge = -Infinity;

  map.scrollWheelZoom.disable();

  const handleNudge = () => {
    if (active || detached) return;
    const now = Date.now();
    if (now - lastNudge < NUDGE_THROTTLE_MS) return;
    lastNudge = now;
    if (onNudge) onNudge();
  };

  const removeListeners = () => {
    map.off('click', activate);
    container.removeEventListener('focusin', activate);
    container.removeEventListener('wheel', handleNudge);
  };

  function activate() {
    if (active || detached) return;
    active = true;
    map.scrollWheelZoom.enable();
    removeListeners();
    if (onActivate) onActivate();
  }

  map.on('click', activate);
  container.addEventListener('focusin', activate);
  container.addEventListener('wheel', handleNudge, { passive: true });

  return {
    isActive: () => active,
    activate,
    detach: () => {
      if (detached) return;
      detached = true;
      removeListeners();
    },
  };
}
