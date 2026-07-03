// UX-M02 — cooperative-touch gate contract. Pure module, fake map. Contract:
// one-finger dragging DISABLED on attach (page scroll wins) + the
// .mdf-coop-touch class applied (touch-action handoff); a one-finger DRAG
// past slop warns (throttled), a tap-sized move does not, multi-touch never
// warns (touchZoom's territory); detach restores dragging and the class.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachCooperativeTouch } from '../src/app/components/compatibility/components/touchGate';

function makeFakeMap() {
  const container = document.createElement('div');
  return {
    container,
    dragging: { enable: vi.fn(), disable: vi.fn() },
    getContainer: () => container,
  };
}

function fireTouch(el, type, touches) {
  const evt = new Event(type, { bubbles: true });
  Object.defineProperty(evt, 'touches', { value: touches });
  el.dispatchEvent(evt);
}

const touch = (x, y) => ({ clientX: x, clientY: y });

describe('attachCooperativeTouch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables one-finger dragging and tags the container on attach', () => {
    const map = makeFakeMap();
    attachCooperativeTouch(map);
    expect(map.dragging.disable).toHaveBeenCalledTimes(1);
    expect(map.container.classList.contains('mdf-coop-touch')).toBe(true);
  });

  it('one-finger drag past slop fires onWrongGesture once per gesture', () => {
    const map = makeFakeMap();
    const onWrongGesture = vi.fn();
    attachCooperativeTouch(map, { onWrongGesture });
    fireTouch(map.container, 'touchstart', [touch(100, 100)]);
    fireTouch(map.container, 'touchmove', [touch(100, 130)]); // 30px > slop
    fireTouch(map.container, 'touchmove', [touch(100, 160)]); // same gesture
    expect(onWrongGesture).toHaveBeenCalledTimes(1);
  });

  it('tap-sized movement (under slop) does not warn', () => {
    const map = makeFakeMap();
    const onWrongGesture = vi.fn();
    attachCooperativeTouch(map, { onWrongGesture });
    fireTouch(map.container, 'touchstart', [touch(100, 100)]);
    fireTouch(map.container, 'touchmove', [touch(103, 104)]); // 5px < 10px slop
    expect(onWrongGesture).not.toHaveBeenCalled();
  });

  it('two-finger gestures never warn (touchZoom territory)', () => {
    const map = makeFakeMap();
    const onWrongGesture = vi.fn();
    attachCooperativeTouch(map, { onWrongGesture });
    fireTouch(map.container, 'touchstart', [touch(100, 100), touch(200, 100)]);
    fireTouch(map.container, 'touchmove', [touch(100, 200), touch(200, 200)]);
    expect(onWrongGesture).not.toHaveBeenCalled();
  });

  it('warnings are throttled across gestures (1.5s window)', () => {
    const map = makeFakeMap();
    const onWrongGesture = vi.fn();
    attachCooperativeTouch(map, { onWrongGesture });
    fireTouch(map.container, 'touchstart', [touch(100, 100)]);
    fireTouch(map.container, 'touchmove', [touch(100, 130)]);
    fireTouch(map.container, 'touchstart', [touch(100, 100)]); // new gesture, t=0
    fireTouch(map.container, 'touchmove', [touch(100, 130)]);
    expect(onWrongGesture).toHaveBeenCalledTimes(1); // throttled
    vi.setSystemTime(1600);
    fireTouch(map.container, 'touchstart', [touch(100, 100)]);
    fireTouch(map.container, 'touchmove', [touch(100, 130)]);
    expect(onWrongGesture).toHaveBeenCalledTimes(2);
  });

  it('detach restores dragging, removes the class, goes inert', () => {
    const map = makeFakeMap();
    const onWrongGesture = vi.fn();
    const gate = attachCooperativeTouch(map, { onWrongGesture });
    gate.detach();
    expect(map.dragging.enable).toHaveBeenCalledTimes(1);
    expect(map.container.classList.contains('mdf-coop-touch')).toBe(false);
    fireTouch(map.container, 'touchstart', [touch(100, 100)]);
    fireTouch(map.container, 'touchmove', [touch(100, 130)]);
    expect(onWrongGesture).not.toHaveBeenCalled();
  });
});
