// tapRecognition.test.js, M19: direct unit coverage of the TapTracker state
// machine (createTapTracker) in
//   src/app/components/compatibility/components/tapRecognition.js
//
// The tracker is the highest-risk surface of the tap pipeline yet had no
// direct test (the existing mapClickHandler.test.js exercises it only through
// the React/Leaflet hook). This file drives the pure factory in isolation, so
// a regression in the timing/transition logic surfaces here without mounting a
// map.
//
// Determinism: setTimeout (armLongPress) and Date.now() (dedup windows,
// down timestamp) are both controlled by vi.useFakeTimers + vi.setSystemTime,
// so every assertion is time-exact with NO real waits.
//
// Behaviors covered:
//   • tap, a short press whose long-press timer is cancelled before
//                      the LONG_PRESS_MS threshold never fires the callback
//   • long-press, a held press past LONG_PRESS_MS fires the callback once,
//                      sets longPressFired, and opens the long-press dedup window
//   • cancel-on-move, cancelLongPress disarms the timer so the callback never
//                      fires (the path the hook takes when movement exceeds the
//                      tap distance threshold)
//   • reset, recordPointerDown / clearGesture transitions: gestureId
//                      counter, flag resets, prior-timer cancellation, and the
//                      dedup windows expiring on their horizons

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTapTracker } from '../src/app/components/compatibility/components/tapRecognition.js';

// Mirrors of the module-private constants (tapRecognition.js does not export
// them). Kept here only so the test reads intent at a glance; the assertions
// step across these thresholds rather than trusting a copied number on its own.
const LONG_PRESS_MS = 600;
const LONG_PRESS_DEDUP_MS = 1000;
const NATIVE_CLICK_DEDUP_MS = 1000;

// A minimal PointerEvent-shaped object, only the fields recordPointerDown reads.
const downEvent = (over = {}) => ({
    clientX: 100,
    clientY: 200,
    pointerId: 7,
    pointerType: 'touch',
    ...over,
});

beforeEach(() => {
    vi.useFakeTimers();
    // Pin the wall clock so Date.now() is deterministic across dedup windows.
    vi.setSystemTime(new Date('2026-06-30T00:00:00.000Z'));
});

afterEach(() => {
    vi.useRealTimers();
});

// ─── tap: short press, timer cancelled before threshold ─────────────────────

describe('TapTracker: tap (short press)', () => {
    it('records the pointerdown into state without firing anything', () => {
        const t = createTapTracker();
        const e = downEvent();
        t.recordPointerDown(e);

        expect(t.state.downX).toBe(100);
        expect(t.state.downY).toBe(200);
        expect(t.state.downId).toBe(7);
        expect(t.state.downPointerType).toBe('touch');
        expect(t.state.downT).toBe(Date.now());
        expect(t.state.longPressFired).toBe(false);
        expect(t.state.gestureEmitted).toBe(false);
    });

    it('a press released before LONG_PRESS_MS never fires the long-press callback', () => {
        const t = createTapTracker();
        const fire = vi.fn();
        t.recordPointerDown(downEvent());
        t.armLongPress(fire);

        // Pointerup at 200 ms: the hook calls cancelLongPress, then clearGesture.
        vi.advanceTimersByTime(200);
        t.cancelLongPress();
        t.clearGesture();

        // Advance well past the threshold to prove the timer is truly gone.
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(fire).not.toHaveBeenCalled();
        expect(t.state.longPressFired).toBe(false);
    });

    it('markTapFired opens the native-click dedup window and sets gestureEmitted', () => {
        const t = createTapTracker();
        t.recordPointerDown(downEvent());
        expect(t.isNativeClickDedupActive()).toBe(false);

        t.markTapFired();
        expect(t.state.gestureEmitted).toBe(true);
        expect(t.isNativeClickDedupActive()).toBe(true);
        expect(t.isGestureAlreadyEmitted()).toBe(true);
    });
});

// ─── long-press: held past threshold ────────────────────────────────────────

describe('TapTracker: long-press (held past threshold)', () => {
    it('fires the callback exactly at LONG_PRESS_MS and only once', () => {
        const t = createTapTracker();
        const fire = vi.fn();
        t.recordPointerDown(downEvent());
        t.armLongPress(fire);

        // One tick before the threshold: not yet fired.
        vi.advanceTimersByTime(LONG_PRESS_MS - 1);
        expect(fire).not.toHaveBeenCalled();
        expect(t.state.longPressFired).toBe(false);

        // Cross the threshold: fires once.
        vi.advanceTimersByTime(1);
        expect(fire).toHaveBeenCalledTimes(1);
        expect(t.state.longPressFired).toBe(true);
        expect(t.state.longPressTimer).toBeNull();

        // No further fire even if more time elapses (timer self-cleared).
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(fire).toHaveBeenCalledTimes(1);
    });

    it('opens the long-press dedup window when the timer fires', () => {
        const t = createTapTracker();
        t.recordPointerDown(downEvent());
        t.armLongPress(vi.fn());

        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(t.isLongPressDedupActive()).toBe(true);

        // Dedup is exclusive of its horizon: active < window, inactive at/after.
        vi.advanceTimersByTime(LONG_PRESS_DEDUP_MS - 1);
        expect(t.isLongPressDedupActive()).toBe(true);
        vi.advanceTimersByTime(1);
        expect(t.isLongPressDedupActive()).toBe(false);
    });
});

// ─── cancel-on-move: disarm before the timer fires ──────────────────────────

describe('TapTracker: cancel-on-move', () => {
    it('cancelLongPress disarms the timer so the callback never fires', () => {
        const t = createTapTracker();
        const fire = vi.fn();
        t.recordPointerDown(downEvent());
        t.armLongPress(fire);

        // Movement beyond the tap distance threshold (the hook calls this).
        vi.advanceTimersByTime(LONG_PRESS_MS / 2);
        t.cancelLongPress();
        expect(t.state.longPressTimer).toBeNull();

        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(fire).not.toHaveBeenCalled();
        expect(t.state.longPressFired).toBe(false);
    });

    it('cancelLongPress is idempotent when no timer is armed', () => {
        const t = createTapTracker();
        expect(() => t.cancelLongPress()).not.toThrow();
        expect(t.state.longPressTimer).toBeNull();
    });
});

// ─── reset / boundary transitions ───────────────────────────────────────────

describe('TapTracker: reset and boundary transitions', () => {
    it('recordPointerDown increments gestureId and clears the previous flags', () => {
        const t = createTapTracker();
        expect(t.state.gestureId).toBe(0);

        t.recordPointerDown(downEvent());
        expect(t.state.gestureId).toBe(1);

        // Simulate a completed first gesture: emitted + long-press fired.
        t.markTapFired();
        t.armLongPress(vi.fn());
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(t.state.longPressFired).toBe(true);
        expect(t.state.gestureEmitted).toBe(true);

        // A new pointerdown starts a fresh gesture and resets the per-gesture flags.
        t.recordPointerDown(downEvent({ pointerId: 9 }));
        expect(t.state.gestureId).toBe(2);
        expect(t.state.longPressFired).toBe(false);
        expect(t.state.gestureEmitted).toBe(false);
        expect(t.state.downId).toBe(9);
    });

    it('recordPointerDown cancels a still-armed timer from a prior gesture', () => {
        const t = createTapTracker();
        const firstFire = vi.fn();
        t.recordPointerDown(downEvent());
        t.armLongPress(firstFire);

        // New gesture begins before the first long-press timer elapses.
        vi.advanceTimersByTime(LONG_PRESS_MS / 2);
        t.recordPointerDown(downEvent({ pointerId: 8 }));

        // The first timer must not fire, only a freshly armed one would.
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(firstFire).not.toHaveBeenCalled();
        expect(t.state.longPressTimer).toBeNull();
    });

    it('clearGesture resets downId and longPressFired but preserves dedup timestamps', () => {
        const t = createTapTracker();
        t.recordPointerDown(downEvent());
        t.markTapFired();
        t.armLongPress(vi.fn());
        vi.advanceTimersByTime(LONG_PRESS_MS);
        expect(t.state.longPressFired).toBe(true);

        t.clearGesture();
        expect(t.state.downId).toBeNull();
        expect(t.state.longPressFired).toBe(false);
        expect(t.state.longPressTimer).toBeNull();

        // Dedup windows survive clearGesture (they gate the native click that
        // arrives AFTER pointerup, so they must outlive the gesture reset).
        expect(t.isNativeClickDedupActive()).toBe(true);
        expect(t.isLongPressDedupActive()).toBe(true);
    });

    it('isGestureAlreadyEmitted lapses once the native-click dedup window elapses', () => {
        const t = createTapTracker();
        t.recordPointerDown(downEvent());
        t.markTapFired();
        expect(t.isGestureAlreadyEmitted()).toBe(true);

        // Sticky until its 1000 ms horizon, then false even with the flag set, 
        // this is the (b) escape hatch that stops the flag persisting forever.
        vi.advanceTimersByTime(NATIVE_CLICK_DEDUP_MS - 1);
        expect(t.isGestureAlreadyEmitted()).toBe(true);
        vi.advanceTimersByTime(1);
        expect(t.isGestureAlreadyEmitted()).toBe(false);
        expect(t.isNativeClickDedupActive()).toBe(false);
    });

    it('a fresh tracker reports no active dedup windows', () => {
        const t = createTapTracker();
        // lastLongPressFiredAt / lastTapFiredAt default to 0; with the clock at
        // 2026 the elapsed time is huge, so neither window is active.
        expect(t.isLongPressDedupActive()).toBe(false);
        expect(t.isNativeClickDedupActive()).toBe(false);
        expect(t.isGestureAlreadyEmitted()).toBe(false);
    });
});
