import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useBackToClose from '../src/app/components/compatibility/components/ux/useBackToClose.js';

// ─────────────────────────────────────────────────────────────────────────────
// useBackToClose (EXT-URLSTATE-01): the Android hardware/gesture Back button must
// dismiss an OPEN sheet instead of navigating away from the site and discarding
// the in-progress report.
//
// Contract pinned here:
//   1. opening pushes exactly one history entry tagged { mdfSheet: true }
//   2. a popstate (Back) while open calls onClose and does NOT push again
//   3. a normal close (open→false) pops our own pushed entry so it never leaks
//   4. Back-triggered close does NOT double-pop (the bug: over-popping leaves
//      the site)
// ─────────────────────────────────────────────────────────────────────────────

describe('useBackToClose', () => {
  let pushSpy;
  let backSpy;

  beforeEach(() => {
    // Reset to a known single-entry history-state before each test.
    window.history.replaceState(null, '');
    pushSpy = vi.spyOn(window.history, 'pushState');
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes one tagged history entry when opened', () => {
    renderHook(({ open }) => useBackToClose(open, () => {}), {
      initialProps: { open: true },
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith({ mdfSheet: true }, '');
  });

  it('does NOT push anything while closed', () => {
    renderHook(({ open }) => useBackToClose(open, () => {}), {
      initialProps: { open: false },
    });
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('calls onClose on Back (popstate) and does not pop again', () => {
    const onClose = vi.fn();
    renderHook(({ open }) => useBackToClose(open, onClose), {
      initialProps: { open: true },
    });
    // Simulate the browser Back: it already popped our entry, then fires popstate.
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Must NOT call history.back() itself — the entry is already gone.
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('pops its own entry on a NORMAL close (open→false) so it never leaks', () => {
    // With a live pushed entry, history.state carries our marker.
    window.history.replaceState({ mdfSheet: true }, '');
    const { rerender } = renderHook(({ open }) => useBackToClose(open, () => {}), {
      initialProps: { open: true },
    });
    // Our push replaced state again with the marker (jsdom keeps last state).
    rerender({ open: false });
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('does not pop when the top entry is not ours (guards over-popping)', () => {
    const { rerender } = renderHook(({ open }) => useBackToClose(open, () => {}), {
      initialProps: { open: true },
    });
    // Simulate that some OTHER navigation replaced the top state after our push.
    window.history.replaceState({ mdfSheet: false }, '');
    rerender({ open: false });
    expect(backSpy).not.toHaveBeenCalled();
  });
});
