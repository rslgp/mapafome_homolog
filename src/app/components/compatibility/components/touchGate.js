// touchGate.js — pure cooperative-touch state machine (UX-M02),
// framework-free so it unit-tests with a fake map (sibling of wheelGate.js).
//
// Contract: on attach, Leaflet's one-finger dragging is DISABLED and the
// container gets the .mdf-coop-touch class (touch-action: pan-x pan-y), so a
// single finger over the map scrolls the PAGE — the mobile half of the
// scroll-trap fix. Two-finger pan/zoom keeps working through Leaflet's
// touchZoom handler (which owns multi-touch and is untouched here). A
// one-finger DRAG (moved past slop, not a tap) fires a throttled
// onWrongGesture so the UI can flash the "use two fingers" veil at the
// exact moment of intent. Taps and long-presses are NOT touched: this gate
// adds only passive listeners and never calls preventDefault, so the
// PointerEvent tap contract (MapClickHandler) is unaffected.

const DRAG_SLOP_PX = 10;
const WARN_THROTTLE_MS = 1500;

export function attachCooperativeTouch(map, { onWrongGesture } = {}) {
  const container = map.getContainer();
  let detached = false;
  let tracking = false;
  let startX = 0;
  let startY = 0;
  let lastWarn = -Infinity;

  map.dragging.disable();
  container.classList.add('mdf-coop-touch');

  const onTouchStart = (e) => {
    if (detached) return;
    if (e.touches && e.touches.length === 1) {
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else {
      // Multi-touch: touchZoom's territory — never warn on it.
      tracking = false;
    }
  };

  const onTouchMove = (e) => {
    if (detached || !tracking) return;
    if (!e.touches || e.touches.length !== 1) {
      tracking = false;
      return;
    }
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return; // still a tap, not a drag
    tracking = false; // one warning per gesture
    const now = Date.now();
    if (now - lastWarn < WARN_THROTTLE_MS) return;
    lastWarn = now;
    if (onWrongGesture) onWrongGesture();
  };

  // Passive on purpose: the whole point is letting the browser scroll the
  // page with this same gesture.
  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchmove', onTouchMove, { passive: true });

  return {
    detach: () => {
      if (detached) return;
      detached = true;
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.classList.remove('mdf-coop-touch');
      // Restore the legacy behavior for whoever owns the map next.
      map.dragging.enable();
    },
  };
}
