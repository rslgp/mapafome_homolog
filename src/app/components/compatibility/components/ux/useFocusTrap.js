'use client';

// useFocusTrap.js — the SHARED Tab/Shift+Tab focus-trap for the app's modal
// bottom-sheets (EXT-A11Y-01 + EXT-FOCUSTRAP-01, both tier S-, same root cause).
//
// WHY THIS EXISTS
//   Several sheets declare role="dialog" aria-modal="true" with a correct
//   initial-focus + Escape + focus-restore contract, but NONE trap Tab inside the
//   dialog. Tab on the LAST focusable element escapes to the map header / Leaflet
//   controls / the FAB rendered BEHIND the modal, and Shift+Tab on the FIRST
//   escapes backwards the same way. aria-modal="true" then LIES to assistive tech:
//   a screen reader announces "dialog" (and its virtual cursor is scoped) but the
//   physical keyboard walks out the back. That is a WCAG 2.4.3 (Focus Order) and
//   2.1.2 (No Keyboard Trap — here the INVERSE: no keyboard CONTAINMENT) defect.
//
//   This hook is the one shared cure applied to every real aria-modal sheet: while
//   `active`, it wraps Tab so focus cycles WITHIN the dialog's focusable set
//   (Tab on last -> first; Shift+Tab on first -> last). It ADDS ONLY the Tab-wrap.
//   It does NOT set initial focus, does NOT handle Escape, and does NOT restore
//   focus on close — each sheet already owns that contract byte-for-byte, and this
//   hook is deliberately orthogonal to it (no double-focus fights, no rewrite of
//   the existing focus effect).
//
// FRAMEWORK-CORRECTNESS INVARIANTS (the three the reviewer must hold)
//   1. QUERY AT TRAP-TIME, never cache. These sheets mount/unmount focusable
//      children conditionally (reveal-on-tap contact, the lifecycle/flag state
//      machines, the publish-phase disabling of every control). A node set cached
//      at mount would go stale and wrap to a detached or now-hidden node. So the
//      focusable list is recomputed on EVERY Tab keydown.
//   2. EMPTY-FOCUSABLE EDGE CASE. If the dialog currently has zero focusable
//      elements (e.g. mid-publish with everything disabled), Tab is swallowed
//      (preventDefault) so focus cannot leave the dialog, rather than throwing on
//      a read of first/last of an empty list.
//   3. DON'T FIGHT THE FIRST-FOCUS EFFECT. This hook only reacts to a Tab keydown;
//      it never moves focus on mount. The sheet's own requestAnimationFrame
//      first-focus runs untouched.

import { useEffect } from 'react';

// The focusable-candidate selector. Deliberately conservative and standard:
// links/areas with href, form controls, contenteditable, and any element with an
// explicit non-negative tabindex. `:not([disabled])` drops disabled controls (the
// publish-in-flight case), and `[tabindex="-1"]` is excluded because a -1 element
// is focusable by script (the sheets use it for the "focus the result message"
// pattern) but is intentionally OUT of the Tab order.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Collect the currently-focusable, currently-visible descendants of `container`,
// in DOM order. Visibility is checked cheaply (offsetParent + rect) because jsdom
// has no layout, so we treat a missing offsetParent as "possibly hidden" ONLY when
// the element also reports a zero-sized rect — in a real browser a display:none
// node has neither; in jsdom (no layout) offsetParent is null for everything, so
// the rect fallback keeps the test environment from filtering out every node.
function getFocusable(container) {
  if (!container) return [];
  const nodes = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // tabindex="-1" is programmatically focusable but DELIBERATELY out of the Tab
    // order — a <button tabindex="-1"> matches the `button:not([disabled])` clause
    // of the selector, so exclude it here or it lands in the cycle as a phantom
    // first/last and the wrap targets the wrong element.
    if (el.getAttribute('tabindex') === '-1') return false;
    // Hidden via inline display/visibility or an ancestor: offsetParent is null
    // for display:none in a real browser. Guard with a rect check so jsdom (which
    // reports offsetParent null for ALL nodes, having no layout) does not wrongly
    // filter everything out.
    if (typeof el.offsetParent !== 'undefined' && el.offsetParent === null) {
      const rect = el.getClientRects ? el.getClientRects() : null;
      if (rect && rect.length === 0 && el.getBoundingClientRect) {
        const box = el.getBoundingClientRect();
        // In jsdom every box is 0x0; only treat as hidden if the browser gave us a
        // real layout elsewhere (we cannot know here), so err toward INCLUDING the
        // node. A false include at worst cycles focus onto an off-screen control;
        // a false exclude would let focus escape the trap. Inclusion is the safe
        // failure for a trap.
        if (box.width === 0 && box.height === 0) return true;
      }
    }
    return true;
  });
}

// Wrap Tab / Shift+Tab so focus cycles within `containerRef.current` while
// `active`. All other keys pass through untouched (Escape stays the sheet's job).
export default function useFocusTrap(active, containerRef) {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef && containerRef.current;
    if (!container) return undefined;

    function onKeyDown(e) {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable(container);

      // Empty-focusable edge case: keep focus contained by swallowing Tab rather
      // than dereferencing first/last of an empty list.
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        // Shift+Tab on the first (or on something outside the set) -> wrap to last.
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab on the last (or on something outside the set) -> wrap to first.
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // Listen on the container (not window) so the trap is scoped to this dialog and
    // torn down cleanly with it. `keydown` (not keyup) so preventDefault stops the
    // browser's own focus move before it happens.
    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- containerRef is a stable ref object; re-run only on `active` toggles
  }, [active]);
}
