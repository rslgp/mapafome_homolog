// UX-M01 — cooperative-wheel gate contract. Pure module, fake map: no
// Leaflet, no react-leaflet, no portal. The contract under test is the one
// the milestone promises: wheel zoom starts DISABLED (page scrolls), first
// click/focus enables it exactly once, a pre-activation wheel nudges the
// hint (throttled), detach removes every listener.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachCooperativeWheel } from '../src/app/components/compatibility/components/wheelGate';

function makeFakeMap() {
  const mapHandlers = {};
  const container = document.createElement('div');
  return {
    container,
    scrollWheelZoom: { enable: vi.fn(), disable: vi.fn() },
    on: vi.fn((evt, fn) => {
      mapHandlers[evt] = mapHandlers[evt] || [];
      mapHandlers[evt].push(fn);
    }),
    off: vi.fn((evt, fn) => {
      mapHandlers[evt] = (mapHandlers[evt] || []).filter((f) => f !== fn);
    }),
    getContainer: () => container,
    fire(evt) {
      (mapHandlers[evt] || []).slice().forEach((fn) => fn());
    },
  };
}

describe('attachCooperativeWheel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables wheel zoom on attach (page scroll wins by default)', () => {
    const map = makeFakeMap();
    attachCooperativeWheel(map);
    expect(map.scrollWheelZoom.disable).toHaveBeenCalledTimes(1);
    expect(map.scrollWheelZoom.enable).not.toHaveBeenCalled();
  });

  it('map click activates wheel zoom exactly once and fires onActivate', () => {
    const map = makeFakeMap();
    const onActivate = vi.fn();
    const gate = attachCooperativeWheel(map, { onActivate });
    map.fire('click');
    map.fire('click');
    expect(gate.isActive()).toBe(true);
    expect(map.scrollWheelZoom.enable).toHaveBeenCalledTimes(1);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('focus entering the container also activates', () => {
    const map = makeFakeMap();
    const gate = attachCooperativeWheel(map);
    map.container.dispatchEvent(new Event('focusin'));
    expect(gate.isActive()).toBe(true);
    expect(map.scrollWheelZoom.enable).toHaveBeenCalledTimes(1);
  });

  it('wheel while locked fires onNudge, throttled to one per 600ms', () => {
    const map = makeFakeMap();
    const onNudge = vi.fn();
    attachCooperativeWheel(map, { onNudge });
    map.container.dispatchEvent(new Event('wheel'));
    map.container.dispatchEvent(new Event('wheel'));
    expect(onNudge).toHaveBeenCalledTimes(1);
    vi.setSystemTime(700);
    map.container.dispatchEvent(new Event('wheel'));
    expect(onNudge).toHaveBeenCalledTimes(2);
  });

  it('wheel after activation does not nudge', () => {
    const map = makeFakeMap();
    const onNudge = vi.fn();
    attachCooperativeWheel(map, { onNudge });
    map.fire('click');
    vi.setSystemTime(5000);
    map.container.dispatchEvent(new Event('wheel'));
    expect(onNudge).not.toHaveBeenCalled();
  });

  it('detach removes listeners: later click/wheel change nothing', () => {
    const map = makeFakeMap();
    const onActivate = vi.fn();
    const onNudge = vi.fn();
    const gate = attachCooperativeWheel(map, { onActivate, onNudge });
    gate.detach();
    map.fire('click');
    map.container.dispatchEvent(new Event('wheel'));
    expect(gate.isActive()).toBe(false);
    expect(map.scrollWheelZoom.enable).not.toHaveBeenCalled();
    expect(onActivate).not.toHaveBeenCalled();
    expect(onNudge).not.toHaveBeenCalled();
    // map.off called for the click handler registered on attach
    expect(map.off).toHaveBeenCalled();
  });
});
