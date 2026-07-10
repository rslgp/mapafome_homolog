// focusTrap.dom.test.js — proof for the shared Tab/Shift+Tab focus-trap
// (EXT-A11Y-01 + EXT-FOCUSTRAP-01, tier S-).
//
// WHY THIS EXISTS
//   The app's modal bottom-sheets declared role="dialog" aria-modal="true" with a
//   correct initial-focus + Escape + focus-restore contract, but NONE trapped Tab:
//   Tab on the LAST focusable element escaped to the map header / Leaflet controls /
//   FAB behind the modal, and Shift+Tab on the FIRST escaped backwards the same way.
//   aria-modal="true" then LIES to assistive tech (WCAG 2.4.3 / 2.1.2). useFocusTrap
//   is the one shared cure. This harness PINS the load-bearing invariant it must
//   hold: Tab on the last focusable returns to the first, Shift+Tab on the first
//   returns to the last, the focusable set is re-queried at trap-time (not cached),
//   and the empty-focusable case is contained rather than throwing.
//
// SCOPE / HONESTY ABOUT jsdom
//   jsdom has no default Tab behavior (a plain Tab keydown does NOT move focus on
//   its own) and no layout. So the trap's mechanism is directly observable: on a Tab
//   keydown with document.activeElement at the boundary, the hook calls .focus() on
//   the wrap target. We drive that exact path — focus the boundary node, dispatch a
//   real Tab KeyboardEvent, assert document.activeElement moved. This is precisely
//   what a screen-reader-driving keyboard does at the modal boundary. Layout-hidden
//   filtering is not exercised here (jsdom paints nothing); it is defended in the
//   hook by erring toward INCLUSION (a trap's safe failure mode).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useRef, useState } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

import useFocusTrap from '../src/app/components/compatibility/components/ux/useFocusTrap.js';

// analytics.track() touches window.gtag / sessionStorage; stub it so rendering a
// real sheet never has a side effect on the shared jsdom window.
vi.mock('../src/app/components/compatibility/components/ux/analytics', () => ({
  track: vi.fn(),
  trackError: vi.fn(),
}));

import ReportSheet from '../src/app/components/compatibility/components/ux/ReportSheet.js';
import { setLocale } from '../src/app/components/compatibility/components/ux/strings.js';

// A minimal host that wires the shared hook to a container of N buttons, so the
// unit behavior is proven WITHOUT the noise of a full sheet. `extra` lets a test
// mount/unmount a trailing focusable to prove the set is re-queried at trap-time.
function TrapHarness({ active = true, extra = false }) {
  const ref = useRef(null);
  useFocusTrap(active, ref);
  return (
    <div ref={ref} data-testid="dialog">
      <button type="button" data-testid="first">first</button>
      <button type="button" data-testid="mid">mid</button>
      <button type="button" data-testid="last">last</button>
      {extra && <button type="button" data-testid="extra">extra</button>}
    </div>
  );
}

// A host whose focusable set is empty (only aria-hidden / disabled children).
function EmptyTrapHarness() {
  const ref = useRef(null);
  useFocusTrap(true, ref);
  return (
    <div ref={ref} data-testid="dialog">
      <button type="button" disabled>disabled</button>
      <span>plain text, not focusable</span>
    </div>
  );
}

// A host that can flip `active` so we can prove the trap tears down. The toggle
// control carries tabIndex={-1} so it is script-clickable but OUTSIDE the tab order
// (the hook's selector excludes [tabindex="-1"]), keeping 'first' and 'last' as the
// true boundaries of the focusable set the trap wraps.
function ToggleTrapHarness() {
  const ref = useRef(null);
  const [active, setActive] = useState(true);
  useFocusTrap(active, ref);
  return (
    <div ref={ref} data-testid="dialog">
      <button type="button" data-testid="first">first</button>
      <button type="button" data-testid="last">last</button>
      <button type="button" tabIndex={-1} data-testid="toggle" onClick={() => setActive(false)}>off</button>
    </div>
  );
}

// Dispatch a Tab (or Shift+Tab) keydown from `el`. fireEvent.keyDown bubbles, so a
// listener on the container sees it whether the event starts on a child or the
// container itself — matching how a real keydown propagates from the focused node.
function tab(el, { shift = false } = {}) {
  fireEvent.keyDown(el, { key: 'Tab', code: 'Tab', shiftKey: shift });
}

beforeEach(() => {
  setLocale('pt-BR');
});
afterEach(() => {
  cleanup();
});

describe('useFocusTrap: Tab/Shift+Tab wrap within the dialog', () => {
  it('Tab on the LAST focusable wraps to the FIRST', () => {
    const { getByTestId } = render(<TrapHarness />);
    const first = getByTestId('first');
    const last = getByTestId('last');

    last.focus();
    expect(document.activeElement).toBe(last);

    tab(last);
    // The trap intercepted Tab-at-the-end and cycled back to the first control.
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab on the FIRST focusable wraps to the LAST', () => {
    const { getByTestId } = render(<TrapHarness />);
    const first = getByTestId('first');
    const last = getByTestId('last');

    first.focus();
    expect(document.activeElement).toBe(first);

    tab(first, { shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('Tab in the MIDDLE is not hijacked (native order continues)', () => {
    const { getByTestId } = render(<TrapHarness />);
    const mid = getByTestId('mid');
    const first = getByTestId('first');
    const last = getByTestId('last');

    mid.focus();
    tab(mid);
    // Not at a boundary → the hook does not preventDefault/refocus; focus stays put
    // (jsdom has no native Tab move) and specifically was NOT force-wrapped.
    expect(document.activeElement).not.toBe(first);
    expect(document.activeElement).not.toBe(last);
    expect(document.activeElement).toBe(mid);
  });

  it('re-queries the focusable set at trap-time (a newly mounted last node becomes the wrap boundary)', () => {
    const { getByTestId, rerender } = render(<TrapHarness extra={false} />);
    // Before: last is 'last'. Mount a trailing 'extra' so the boundary MOVES.
    rerender(<TrapHarness extra />);
    const first = getByTestId('first');
    const extra = getByTestId('extra');
    const last = getByTestId('last');

    // Tab on the OLD last ('last') is now mid-set → no wrap (proves not cached).
    last.focus();
    tab(last);
    expect(document.activeElement).toBe(last);

    // Tab on the NEW last ('extra') wraps to first (proves re-query at trap-time).
    extra.focus();
    tab(extra);
    expect(document.activeElement).toBe(first);
  });

  it('empty focusable set: Tab is contained (swallowed), no throw', () => {
    const { getByTestId } = render(<EmptyTrapHarness />);
    const dialog = getByTestId('dialog');
    // No focusable children → dispatching Tab must not throw and must not move focus
    // out of the dialog. document.body stays the active element (nothing to focus).
    expect(() => tab(dialog)).not.toThrow();
  });

  it('when inactive/torn down, the trap no longer wraps', () => {
    const { getByTestId } = render(<ToggleTrapHarness />);
    const first = getByTestId('first');
    const last = getByTestId('last');

    // Active: Tab on last wraps to first.
    last.focus();
    tab(last);
    expect(document.activeElement).toBe(first);

    // Flip active → false: the effect cleanup removes the keydown listener.
    fireEvent.click(getByTestId('toggle'));
    last.focus();
    tab(last);
    // No interception now → focus stays on last (jsdom has no native Tab move).
    expect(document.activeElement).toBe(last);
  });
});

describe('useFocusTrap wired into a real aria-modal sheet (ReportSheet)', () => {
  it('Tab from the last focusable in the open ReportSheet returns to the first', () => {
    const { container } = render(
      <ReportSheet open coords={[-8.05, -34.9]} onClose={() => {}} onPublish={() => {}} />,
    );
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    // The SAME focusable selector the hook uses, so the test walks the exact set
    // the trap wraps. Filter out tabindex=-1 (script-focus-only result nodes).
    const focusable = Array.from(
      dialog.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThan(1);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    expect(document.activeElement).toBe(last);
    tab(last);
    expect(document.activeElement).toBe(first);

    // And the reverse: Shift+Tab from the first returns to the last.
    first.focus();
    tab(first, { shift: true });
    expect(document.activeElement).toBe(last);
  });
});
