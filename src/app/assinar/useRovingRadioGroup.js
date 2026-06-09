'use client';

// useRovingRadioGroup — APG radiogroup keyboard contract for a small, fixed set
// of single-select options rendered as role="radio" buttons.
//
// WHY: a `role="radio"` with no arrow-key movement + no roving tabindex is a
// worse a11y lie than claiming no role at all — a screen-reader user is told
// "radio, 1 of 4" but cannot move between them with the keys the role promises.
// This hook supplies the missing half of the contract per the WAI-ARIA APG
// "Radio Group" pattern, kept framework-pure and reusable so both the payment
// rail picker and the preset-value picker share ONE correct implementation
// (DRY / SOT) instead of two hand-rolled, drifting handlers.
//
// Roving tabindex: exactly one control in the group is in the Tab sequence
// (tabIndex 0); the rest are -1. Arrow keys move BOTH focus and selection among
// the options; Home/End jump to the first/last. The caller owns selection state
// — this hook only computes the next id and calls back.

import { useCallback } from 'react';

// Keys that move selection within a radiogroup. Down/Right advance; Up/Left go
// back; Home/End jump to the ends. We intentionally support BOTH orientations
// (the group can wrap to two columns at >=480px), matching APG guidance that a
// radiogroup may be navigated with either axis.
const FORWARD = new Set(['ArrowDown', 'ArrowRight']);
const BACKWARD = new Set(['ArrowUp', 'ArrowLeft']);

// Resolve the id of the option that should become selected for a given key.
// `ids` is the ordered list of option ids; `currentId` the selected one. Returns
// null when the key is not a navigation key (caller leaves the event alone).
export function nextRadioId(ids, currentId, key) {
  if (ids.length === 0) return null;
  const i = ids.indexOf(currentId);
  // When nothing in the group is selected yet (e.g. a custom value was typed and
  // no preset is active), arrow keys enter the group at an end rather than no-op.
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids[ids.length - 1];
  if (FORWARD.has(key)) return ids[i < 0 ? 0 : (i + 1) % ids.length];
  if (BACKWARD.has(key)) return ids[i < 0 ? ids.length - 1 : (i - 1 + ids.length) % ids.length];
  return null;
}

// Returns an onKeyDown handler for a radiogroup container. `ids` is the ordered
// option ids, `currentId` the selected one, `onSelect(id)` the state setter.
// Focus follows selection: after selecting, we focus the matching radio so the
// roving tabindex and DOM focus stay in lock-step (APG: selection moves with
// focus in a radiogroup).
export function useRovingRadioGroup(ids, currentId, onSelect) {
  return useCallback(
    (e) => {
      const next = nextRadioId(ids, currentId, e.key);
      if (next == null) return; // not a navigation key — leave the event alone
      e.preventDefault(); // stop the page from scrolling on Arrow/Home/End
      if (next !== currentId) onSelect(next);
      // Move DOM focus to the target radio within this container so the roving
      // tabindex and DOM focus stay in lock-step (focus follows selection).
      const target = e.currentTarget.querySelector(`[data-radio-id="${next}"]`);
      if (target && typeof target.focus === 'function') target.focus();
    },
    [ids, currentId, onSelect],
  );
}
