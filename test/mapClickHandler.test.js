// MC-16 (LLM_BRAIN/map_click_compatibility.yaml § backlog) —
// Automated guard for the tap → onMapClick pipeline. Six iterations of
// this code shipped with regressions because we had no test. This file
// exercises the PointerEvent rewrite (changelog § map_tap_pointer_event_rewrite)
// and the F8 long-press double-fire fix (MC-4).
//
// Coverage:
//   - touch tap → onMapClick with correct lat/lng
//   - pan (movement > 10 px) → no tap
//   - touch long-press (600 ms still) → onMapClick + onMapLongPress
//   - mouse pointerdown does NOT arm long-press timer (MC-4 desktop UX)
//   - non-primary pointer button (right-click) ignored by tap pipeline
//   - Leaflet contextmenu fires onMapClick + onMapLongPress (desktop right-click)
//   - contextmenu within 1000 ms after long-press timer is suppressed (F8 fix)
//   - taps on .leaflet-interactive children (markers/clusters) are skipped (F6 contract)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

// Mock react-leaflet so the component can be rendered without a real
// MapContainer. useMap returns a fake Leaflet map with just the methods
// MapClickHandler depends on.
vi.mock('react-leaflet', () => ({
    useMap: vi.fn(),
    TileLayer: () => null,
    LayersControl: Object.assign(() => null, { BaseLayer: () => null }),
}));

// Mock analytics so we can assert structured events fire from the tap pipeline
// without exercising sessionStorage / gtag transport.
vi.mock('../src/app/components/compatibility/components/ux/analytics', () => ({
    trackMapTap: vi.fn(),
    trackMapLongPress: vi.fn(),
    trackMapTapSkipped: vi.fn(),
}));

import { useMap } from 'react-leaflet';
import { MapClickHandler } from '../src/app/components/compatibility/components/mapComponents.js';
import {
    trackMapTap,
    trackMapLongPress,
    trackMapTapSkipped,
} from '../src/app/components/compatibility/components/ux/analytics';

// ─── Test harness ─────────────────────────────────────────────────────────

function makeFakeMap(container) {
    const handlers = {};
    return {
        getContainer: () => container,
        // Identity projection: container point [x, y] → { lat: x, lng: y }.
        // Lets us assert exact coords flowing through the pipeline.
        containerPointToLatLng: ([x, y]) => ({ lat: x, lng: y }),
        on: (ev, fn) => { handlers[ev] = fn; },
        off: (ev) => { delete handlers[ev]; },
        _fire: (ev, payload) => handlers[ev]?.(payload),
    };
}

function dispatch(target, type, opts = {}) {
    const ev = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(ev, {
        clientX: opts.clientX ?? 0,
        clientY: opts.clientY ?? 0,
        pointerId: opts.pointerId ?? 1,
        pointerType: opts.pointerType ?? 'touch',
        button: opts.button ?? 0,
    });
    target.dispatchEvent(ev);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('MapClickHandler — PointerEvent pipeline', () => {
    let container, map, onMapClick, onMapLongPress;

    beforeEach(() => {
        container = document.createElement('div');
        container.style.cssText = 'position:absolute;left:0;top:0;width:500px;height:400px';
        document.body.appendChild(container);
        // jsdom returns 0s for getBoundingClientRect by default — pin the
        // rect to a deterministic origin so we can assert coords.
        container.getBoundingClientRect = () => ({
            left: 0, top: 0, right: 500, bottom: 400, width: 500, height: 400, x: 0, y: 0, toJSON() {},
        });
        map = makeFakeMap(container);
        useMap.mockReturnValue(map);
        onMapClick = vi.fn();
        onMapLongPress = vi.fn();
    });

    afterEach(() => {
        cleanup();
        document.body.removeChild(container);
        vi.useRealTimers();
        trackMapTap.mockClear();
        trackMapLongPress.mockClear();
        trackMapTapSkipped.mockClear();
    });

    it('drops pin on touch tap (pointerdown → pointerup within tolerance)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, pointerType: 'touch' });
        dispatch(container, 'pointerup',   { clientX: 100, clientY: 200, pointerType: 'touch' });
        expect(onMapClick).toHaveBeenCalledWith(map, 100, 200);
        expect(onMapLongPress).not.toHaveBeenCalled();
    });

    it('does not fire tap when finger moved > 10 px (pan, not a tap)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 100, clientY: 200 });
        dispatch(container, 'pointerup',   { clientX: 200, clientY: 300 });
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('fires long-press at 600 ms with both callbacks (touch path)', async () => {
        vi.useFakeTimers();
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
        await act(async () => { await vi.advanceTimersByTimeAsync(700); });
        expect(onMapClick).toHaveBeenCalledWith(map, 50, 75);
        expect(onMapLongPress).toHaveBeenCalledWith(map, 50, 75);
    });

    it('does NOT arm long-press timer for mouse pointerType (MC-4 desktop UX)', async () => {
        vi.useFakeTimers();
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'mouse' });
        await act(async () => { await vi.advanceTimersByTimeAsync(700); });
        // No tap (no pointerup yet) and no long-press fired
        expect(onMapClick).not.toHaveBeenCalled();
        expect(onMapLongPress).not.toHaveBeenCalled();
    });

    it('mouse tap (down + up < 500 ms) fires onMapClick exactly once', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 250, clientY: 175, pointerType: 'mouse' });
        dispatch(container, 'pointerup',   { clientX: 250, clientY: 175, pointerType: 'mouse' });
        expect(onMapClick).toHaveBeenCalledWith(map, 250, 175);
        expect(onMapClick).toHaveBeenCalledTimes(1);
        expect(onMapLongPress).not.toHaveBeenCalled();
    });

    it('ignores non-primary pointer button (right-click owns its own path)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, button: 2 });
        dispatch(container, 'pointerup',   { clientX: 100, clientY: 200, button: 2 });
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('Leaflet contextmenu fires onMapClick + onMapLongPress (desktop right-click)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        map._fire('contextmenu', {
            originalEvent: { clientX: 150, clientY: 250, preventDefault: () => {} },
            latlng: { lat: 0, lng: 0 },
        });
        expect(onMapClick).toHaveBeenCalledWith(map, 150, 250);
        expect(onMapLongPress).toHaveBeenCalledWith(map, 150, 250);
    });

    it('suppresses contextmenu within 1000 ms after long-press timer (F8 fix)', async () => {
        vi.useFakeTimers();
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
        await act(async () => { await vi.advanceTimersByTimeAsync(700); });
        expect(onMapLongPress).toHaveBeenCalledTimes(1);
        // Android Chrome's emulated contextmenu fires after the long-press —
        // our handler must NOT re-fire onMapLongPress for it.
        map._fire('contextmenu', {
            originalEvent: { clientX: 50, clientY: 75, preventDefault: () => {} },
            latlng: { lat: 0, lng: 0 },
        });
        expect(onMapLongPress).toHaveBeenCalledTimes(1);
        expect(onMapClick).toHaveBeenCalledTimes(1);
    });

    it('contextmenu allowed once dedup window elapses (> 1000 ms)', async () => {
        vi.useFakeTimers();
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
        await act(async () => { await vi.advanceTimersByTimeAsync(700); });
        await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
        map._fire('contextmenu', {
            originalEvent: { clientX: 200, clientY: 300, preventDefault: () => {} },
            latlng: { lat: 0, lng: 0 },
        });
        expect(onMapLongPress).toHaveBeenCalledTimes(2);
    });

    it('skips taps on .leaflet-interactive children (F6 — markers / clusters)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        const marker = document.createElement('div');
        marker.classList.add('leaflet-interactive');
        container.appendChild(marker);
        dispatch(marker, 'pointerdown', { clientX: 100, clientY: 200 });
        dispatch(marker, 'pointerup',   { clientX: 100, clientY: 200 });
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('skips taps on nested children of .leaflet-interactive (popup contents)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        const popup = document.createElement('div');
        popup.classList.add('leaflet-interactive');
        const inner = document.createElement('span');
        popup.appendChild(inner);
        container.appendChild(popup);
        dispatch(inner, 'pointerdown', { clientX: 100, clientY: 200 });
        dispatch(inner, 'pointerup',   { clientX: 100, clientY: 200 });
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('cancels long-press timer on movement > 10 px (allows panning during hold)', async () => {
        vi.useFakeTimers();
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
        // Move 20 px before the 600 ms timer would fire
        await act(async () => { await vi.advanceTimersByTimeAsync(200); });
        dispatch(container, 'pointermove', { clientX: 75, clientY: 100, pointerType: 'touch' });
        await act(async () => { await vi.advanceTimersByTimeAsync(500); });
        // Timer must have been canceled
        expect(onMapLongPress).not.toHaveBeenCalled();
        // Releasing > 10 px from the start is still a pan, not a tap
        dispatch(container, 'pointerup', { clientX: 75, clientY: 100, pointerType: 'touch' });
        expect(onMapClick).not.toHaveBeenCalled();
    });

    it('pointercancel resets state (no spurious tap on subsequent up)', () => {
        render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
        dispatch(container, 'pointerdown',   { clientX: 100, clientY: 200, pointerType: 'touch' });
        dispatch(container, 'pointercancel', { pointerId: 1 });
        dispatch(container, 'pointerup',     { clientX: 100, clientY: 200, pointerType: 'touch' });
        expect(onMapClick).not.toHaveBeenCalled();
    });

    // ─── Analytics observability (every branch should emit a typed event) ───
    // These assertions are the bug-report shortcut: future "tap doesn't work
    // on device X" reports come with sessionStorage events that pinpoint
    // which branch the pipeline took.

    describe('analytics: every pipeline branch emits a typed event', () => {
        it('trackMapTap fires on a successful touch tap', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 123, clientY: 456, pointerType: 'touch' });
            dispatch(container, 'pointerup',   { clientX: 123, clientY: 456, pointerType: 'touch' });
            expect(trackMapTap).toHaveBeenCalledTimes(1);
            const arg = trackMapTap.mock.calls[0][0];
            expect(arg).toMatchObject({ lat: 123, lng: 456, pointerType: 'touch' });
            expect(arg.durationMs).toBeGreaterThanOrEqual(0);
        });

        it('trackMapLongPress fires with source=timer on touch hold', async () => {
            vi.useFakeTimers();
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
            await act(async () => { await vi.advanceTimersByTimeAsync(700); });
            expect(trackMapLongPress).toHaveBeenCalledWith({ lat: 50, lng: 75, source: 'timer', pointerType: 'touch' });
        });

        it('trackMapLongPress fires with source=contextmenu on desktop right-click', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            map._fire('contextmenu', {
                originalEvent: { clientX: 200, clientY: 300, preventDefault: () => {} },
                latlng: { lat: 0, lng: 0 },
            });
            expect(trackMapLongPress).toHaveBeenCalledWith(expect.objectContaining({
                lat: 200, lng: 300, source: 'contextmenu',
            }));
        });

        it('trackMapTapSkipped fires reason=leaflet_interactive when tapping a marker', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            const marker = document.createElement('div');
            marker.classList.add('leaflet-interactive');
            container.appendChild(marker);
            dispatch(marker, 'pointerdown', { clientX: 100, clientY: 200 });
            expect(trackMapTapSkipped).toHaveBeenCalledWith({ reason: 'leaflet_interactive', pointerType: 'touch' });
        });

        it('trackMapTapSkipped fires reason=non_primary_button on right-click pointerdown', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, button: 2, pointerType: 'mouse' });
            expect(trackMapTapSkipped).toHaveBeenCalledWith({ reason: 'non_primary_button', pointerType: 'mouse' });
        });

        it('trackMapTapSkipped fires reason=movement when finger moves > 10 px', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, pointerType: 'touch' });
            dispatch(container, 'pointerup',   { clientX: 200, clientY: 300, pointerType: 'touch' });
            expect(trackMapTapSkipped).toHaveBeenCalledWith({ reason: 'movement', pointerType: 'touch' });
        });

        it('trackMapTapSkipped fires reason=duration when down-up exceeds 500 ms', async () => {
            vi.useFakeTimers();
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, pointerType: 'pen' });
            // 550 ms < 600 ms long-press timer, > 500 ms tap window
            await act(async () => { await vi.advanceTimersByTimeAsync(550); });
            dispatch(container, 'pointerup',   { clientX: 100, clientY: 200, pointerType: 'pen' });
            expect(trackMapTapSkipped).toHaveBeenCalledWith({ reason: 'duration', pointerType: 'pen' });
        });

        it('trackMapTapSkipped fires reason=pointer_cancel when gesture is interrupted', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown',   { clientX: 100, clientY: 200, pointerType: 'touch' });
            dispatch(container, 'pointercancel', { pointerId: 1 });
            expect(trackMapTapSkipped).toHaveBeenCalledWith({ reason: 'pointer_cancel', pointerType: 'touch' });
        });

        it('trackMapTapSkipped fires reason=contextmenu_dedup within F8 window', async () => {
            vi.useFakeTimers();
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
            await act(async () => { await vi.advanceTimersByTimeAsync(700); });
            map._fire('contextmenu', {
                originalEvent: { clientX: 50, clientY: 75, preventDefault: () => {} },
                latlng: { lat: 0, lng: 0 },
            });
            expect(trackMapTapSkipped).toHaveBeenCalledWith({ reason: 'contextmenu_dedup', pointerType: 'touch' });
        });
    });

    // ─── TV-2 (tap_visibility_robustness.yaml) — haptic vibration ───────
    // Asserts dispatchMarkerPlaced calls navigator.vibrate for touch/pen
    // pointers and stays silent for mouse. Tests the integration end-to-end
    // (PointerEvent up → emitTap → dispatchMarkerPlaced → navigator.vibrate).

    describe('TV-2 — haptic vibration boundary', () => {
        let vibrateSpy;
        let prevVibrate;

        beforeEach(() => {
            prevVibrate = navigator.vibrate;
            vibrateSpy = vi.fn();
            Object.defineProperty(navigator, 'vibrate', {
                configurable: true, writable: true, value: vibrateSpy,
            });
        });

        afterEach(() => {
            if (prevVibrate === undefined) {
                delete navigator.vibrate;
            } else {
                Object.defineProperty(navigator, 'vibrate', {
                    configurable: true, writable: true, value: prevVibrate,
                });
            }
        });

        it('vibrates 40 ms on a touch tap', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, pointerType: 'touch' });
            dispatch(container, 'pointerup',   { clientX: 100, clientY: 200, pointerType: 'touch' });
            expect(vibrateSpy).toHaveBeenCalledWith(40);
        });

        it('vibrates 40 ms on a pen tap', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, pointerType: 'pen' });
            dispatch(container, 'pointerup',   { clientX: 100, clientY: 200, pointerType: 'pen' });
            expect(vibrateSpy).toHaveBeenCalledWith(40);
        });

        it('does NOT vibrate on a mouse click (avoid spam on tethered phones)', () => {
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 100, clientY: 200, pointerType: 'mouse' });
            dispatch(container, 'pointerup',   { clientX: 100, clientY: 200, pointerType: 'mouse' });
            expect(vibrateSpy).not.toHaveBeenCalled();
        });

        it('vibrates on long-press timer (touch path)', async () => {
            vi.useFakeTimers();
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 50, clientY: 75, pointerType: 'touch' });
            await act(async () => { await vi.advanceTimersByTimeAsync(700); });
            expect(vibrateSpy).toHaveBeenCalledWith(40);
        });
    });

    // ─── TV-3 / TV-5 — mdf:marker-placed event fires after a tap ────────

    describe('TV-3 / TV-5 — public marker-placed event contract', () => {
        it('fires mdf:marker-placed with lat/lng/source/pointerType/ts after tap', () => {
            const onPlaced = vi.fn();
            document.addEventListener('mdf:marker-placed', onPlaced);
            render(<MapClickHandler onMapClick={onMapClick} onMapLongPress={onMapLongPress} />);
            dispatch(container, 'pointerdown', { clientX: 250, clientY: 175, pointerType: 'touch' });
            dispatch(container, 'pointerup',   { clientX: 250, clientY: 175, pointerType: 'touch' });
            expect(onPlaced).toHaveBeenCalledTimes(1);
            const detail = onPlaced.mock.calls[0][0].detail;
            expect(detail.lat).toBe(250);
            expect(detail.lng).toBe(175);
            expect(detail.source).toBe('tap');
            expect(detail.pointerType).toBe('touch');
            expect(typeof detail.ts).toBe('number');
            document.removeEventListener('mdf:marker-placed', onPlaced);
        });
    });
});
