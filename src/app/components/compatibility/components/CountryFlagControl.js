'use client';

// CountryFlagControl.js — flag-driven country selector for the address search
// (INTL feature). The map's geocoder was hard-pinned to Brazil; this control
// lets the user pick ANY country by its flag. The choice is persisted in
// countryStore (localStorage), and SearchField re-scopes Nominatim to the new
// country. "Non-water" is inherent: a geocoder only returns addressable land.
//
// Built as a native L.Control (same pattern as PetLocateControl / zoom / geo-
// search) so it coexists with Leaflet; React mounts/unmounts via useEffect.
// disableClickPropagation is load-bearing: without it a click on the control
// bubbles to the map and drops a report pin.
//
// A11y: a real <button> shows the current flag + name; activating it opens a
// disclosure panel with a text filter and a keyboard-operable list of <button>
// options. Labels come from the i18n strings module (pt-BR / es parity).
//
// Semantics note: the panel is a NON-MODAL disclosure, not a modal dialog. The
// options are real <button>s the user Tabs through, so the list is a plain
// <ul>/<li> (a menu of buttons), NOT an ARIA listbox/option pattern: that
// pattern needs aria-activedescendant + aria-selected + arrow-key roving on a
// single focusable container, none of which fits a list of focusable buttons.
// Using role=listbox/option on a button list mis-promises that contract to a
// screen reader. Dismissal is honored from anywhere in the panel (Esc), via a
// discoverable close button, and via an outside click; each returns focus to
// the trigger so keyboard focus is never lost behind the map (WCAG 2.4.3).
//
// onAdd stays thin by delegating to two module-level builders (createFlagDom +
// wireFlagControl), each well under the 100-LOC function limit.

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './CountryFlagControl.css';
import { t, getLocale } from './ux/strings';
import { countriesForLocale, getCountry } from './countries';
import { getSelectedCountry, setSelectedCountry, subscribe } from './countryStore';

// Zoom used when recentering on a freshly chosen country that has no bounds: a
// gentle zoom-out so the user sees they switched countries (the next address
// search pans precisely).
const COUNTRY_PICK_FALLBACK_ZOOM = 4;

const hasDocument = () => typeof document !== 'undefined';

// Create the (static) DOM tree for the control and return the nodes the wiring
// needs. No behavior is attached here. Built imperatively because this is a
// Leaflet L.Control, not React-rendered. Exported for unit tests (the map
// instance is imperative, so we test the DOM + wiring directly).
export function createFlagDom() {
  const wrap = L.DomUtil.create('div', 'leaflet-bar mdf-flag');

  const button = L.DomUtil.create('button', 'mdf-flag__btn', wrap);
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-controls', 'mdf-flag-panel');

  // NON-MODAL disclosure: role=group (not dialog) since it neither traps focus
  // nor blocks the page; aria-labelledby points at the heading.
  const panel = L.DomUtil.create('div', 'mdf-flag__panel', wrap);
  panel.hidden = true;
  panel.id = 'mdf-flag-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-labelledby', 'mdf-flag-title');

  const head = L.DomUtil.create('div', 'mdf-flag__head', panel);
  const title = L.DomUtil.create('p', 'mdf-flag__title', head);
  title.id = 'mdf-flag-title';
  title.textContent = t('country.title');

  // Discoverable close affordance (parity with PetLegendControl's close button).
  const closeBtn = L.DomUtil.create('button', 'mdf-flag__close', head);
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', t('country.close'));
  closeBtn.title = t('country.close');
  closeBtn.innerHTML = '<span aria-hidden="true">✕</span>';

  const input = L.DomUtil.create('input', 'mdf-flag__search', panel);
  input.type = 'search';
  input.setAttribute('aria-label', t('country.search'));
  input.placeholder = t('country.search');
  input.autocomplete = 'off';

  // Plain list of buttons (no role=listbox); the user Tabs through real buttons.
  const list = L.DomUtil.create('ul', 'mdf-flag__list', panel);

  // Empty state as a polite live region so a screen-reader user who filters down
  // to zero results hears it (same pattern as PetLocateControl's status).
  const empty = L.DomUtil.create('p', 'mdf-flag__empty', panel);
  empty.setAttribute('role', 'status');
  empty.setAttribute('aria-live', 'polite');
  empty.textContent = t('country.empty');
  empty.hidden = true;

  return { wrap, button, panel, closeBtn, input, list, empty };
}

// Attach all behavior (render, filter, open/close, pick, listeners) to a DOM
// tree from createFlagDom. Returns the teardown for resources that outlive the
// Leaflet container (the store subscription + the document outside-click hook).
// Exported for unit tests (open/close/pick exercised on the real DOM in jsdom).
export function wireFlagControl(map, dom) {
  const { wrap, button, panel, closeBtn, input, list, empty } = dom;

  // The active country's name in the ACTIVE UI locale (M3.5/I18N-1). getCountry
  // only carries the pt-BR curated name; the locale-aware name comes from the
  // current locale's list (countriesForLocale), falling back to the pt-BR name
  // when the code is somehow absent from the list (it never is in practice).
  const localeName = (code) => {
    const hit = countriesForLocale(getLocale()).find((c) => c.code === code);
    return hit ? hit.name : getCountry(code).name;
  };

  const renderButton = () => {
    const c = getCountry(getSelectedCountry());
    const name = localeName(c.code);
    button.setAttribute('aria-label', t('country.button').replace('{name}', name));
    button.title = t('country.open');
    button.innerHTML =
      '<span class="mdf-flag__glyph" aria-hidden="true">' + c.flag + '</span>' +
      '<span class="mdf-flag__name">' + name + '</span>';
  };

  // Outside-click dismissal, bound to the document only while open. capture-phase
  // sees the original target even though disableClickPropagation stops bubbling,
  // so we test containment explicitly. A click INSIDE the control is left for the
  // control's own handlers; only a click outside closes.
  const onOutsidePointer = (ev) => {
    if (!wrap.contains(ev.target)) closePanel(false);
  };
  function openPanel() {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    input.value = '';
    applyFilter();
    input.focus();
    if (hasDocument()) document.addEventListener('pointerdown', onOutsidePointer, true);
  }
  // returnFocus=true sends focus back to the trigger (keyboard / Esc / close);
  // an outside click passes false so we don't yank focus from the click target.
  function closePanel(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (hasDocument()) document.removeEventListener('pointerdown', onOutsidePointer, true);
    if (returnFocus) button.focus();
  }
  const togglePanel = () => (panel.hidden ? openPanel() : closePanel(true));

  const pick = (code) => {
    setSelectedCountry(code);
    const c = getCountry(code);
    if (map && map.getContainer()) {
      if (c.bounds) map.fitBounds([c.bounds[0], c.bounds[1]]);
      else map.setZoom(Math.min(map.getZoom(), COUNTRY_PICK_FALLBACK_ZOOM));
    }
    closePanel(true);
  };

  // Activate a control button reliably. disableClickPropagation(wrap) binds
  // stopPropagation to mousedown/touchstart on the wrapper, which in some
  // browsers prevents an inner <button> from focusing and can swallow its
  // synthesized click. So we act on BOTH pointerup and click and de-dupe within
  // a tick: whichever fires first runs the action, the other is a no-op. This is
  // why the close (X) button previously did nothing in the browser while it
  // worked in jsdom (jsdom does not reproduce the focus/click suppression).
  const onActivate = (el, action) => {
    let firing = false;
    const run = (ev) => {
      L.DomEvent.stop(ev);
      if (firing) return;
      firing = true;
      action();
      // Release on the next macrotask so the paired pointerup/click for the
      // SAME physical press is swallowed, but a later press fires again.
      setTimeout(() => { firing = false; }, 0);
    };
    L.DomEvent.on(el, 'pointerup', run);
    L.DomEvent.on(el, 'click', run);
  };

  // Build the option list for the ACTIVE locale (M3.5/I18N-1): names + sort come
  // from countriesForLocale(getLocale()), not the eager pt-BR COUNTRIES. The list
  // is rebuilt (not just re-filtered) on a locale change — see the second
  // subscription below; within a locale, filtering toggles <li> visibility with
  // no DOM rebuild. optionEls is rebound on each rebuild.
  let optionEls = [];
  function rebuildList() {
    list.innerHTML = ''; // drop the previous locale's <li>s (their listeners GC with them)
    optionEls = countriesForLocale(getLocale()).map((c) => {
      const li = L.DomUtil.create('li', 'mdf-flag__item', list);
      const opt = L.DomUtil.create('button', 'mdf-flag__option', li);
      opt.type = 'button';
      opt.dataset.code = c.code;
      opt.innerHTML =
        '<span class="mdf-flag__glyph" aria-hidden="true">' + c.flag + '</span>' +
        '<span class="mdf-flag__name">' + c.name + '</span>';
      onActivate(opt, () => pick(c.code));
      return { li, name: c.name.toLowerCase() };
    });
  }
  function applyFilter() {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    for (const { li, name } of optionEls) {
      const match = !q || name.includes(q);
      li.hidden = !match;
      if (match) shown++;
    }
    empty.hidden = shown > 0;
  }

  // Esc closes from ANYWHERE in the panel (input or any option) and returns
  // focus to the trigger (WCAG 2.1.2).
  L.DomEvent.on(panel, 'keydown', (ev) => {
    if (ev.key === 'Escape') { L.DomEvent.stop(ev); closePanel(true); }
  });
  L.DomEvent.on(input, 'input', applyFilter);
  onActivate(button, togglePanel);
  onActivate(closeBtn, () => closePanel(true));

  rebuildList();
  renderButton();
  const unsubscribe = subscribe(renderButton);

  // M3.5 stale-list fix (the real M3.5 bug, not hydration): COUNTRIES was read
  // ONCE at onAdd, and the control only subscribed renderButton to the COUNTRY
  // store — never the LIST to a LOCALE change. So switching the UI language left
  // the picker showing the old language's names/sort. Mirror how renderButton
  // already rebuilds on a country change: a second subscription rebuilds the list
  // (and re-labels the button) on 'mdf-locale-change' (strings.setLocale dispatches
  // it). Preserve the current filter text across the rebuild so an open, filtered
  // panel does not reset. Guarded for SSR/no-window.
  const onLocaleChange = () => {
    rebuildList();
    renderButton();
    applyFilter();
  };
  const hasWindow = typeof window !== 'undefined';
  if (hasWindow) window.addEventListener('mdf-locale-change', onLocaleChange);

  // A click/scroll on the control must not reach the map (pin drop / pan).
  L.DomEvent.disableClickPropagation(wrap);
  L.DomEvent.disableScrollPropagation(wrap);

  // Teardown for resources that outlive `wrap` (its inner listeners are GC'd
  // when Leaflet removes the container).
  return () => {
    if (hasDocument()) document.removeEventListener('pointerdown', onOutsidePointer, true);
    if (hasWindow) window.removeEventListener('mdf-locale-change', onLocaleChange);
    unsubscribe();
  };
}

const CountryFlagControl = () => {
  const map = useMap();

  useEffect(() => {
    const FlagControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const dom = createFlagDom();
        this._cleanup = wireFlagControl(map, dom);
        return dom.wrap;
      },
      onRemove() {
        if (this._cleanup) this._cleanup();
      },
    });

    const control = new FlagControl();
    map.addControl(control);
    // removeControl fires onRemove -> _cleanup (drops the subscription + the
    // document outside-click listener). One resource, one owner: we do not also
    // tear down here.
    return () => map.removeControl(control);
  }, [map]);

  return null;
};

export default CountryFlagControl;
