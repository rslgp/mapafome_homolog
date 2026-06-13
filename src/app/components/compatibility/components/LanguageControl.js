'use client';

// LanguageControl.js — UI language (localization) picker overlaid on the map
// (INTL feature). The site already supports pt-BR + es via the strings module
// (setLocale persists to localStorage and dispatches mdf-locale-change; useLocale
// re-renders subscribers). This control just surfaces the choice: a button shows
// the active language, and a short disclosure list switches it.
//
// Built as a native L.Control (same pattern as CountryFlagControl /
// PetLocateControl) so it coexists with Leaflet; React mounts/unmounts via
// useEffect. disableClickPropagation keeps a control click from dropping a map
// pin. Buttons are activated via pointerup+click (see CountryFlagControl) so the
// Leaflet wrapper's mousedown stopPropagation cannot swallow them.
//
// A11y: a real <button> trigger with aria-expanded/haspopup; a non-modal
// disclosure (role=group) holding one <button> per locale the user Tabs through;
// Esc and an outside click both close and return focus to the trigger.

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './CountryFlagControl.css';
import {
  t,
  getLocale,
  setLocale,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
} from './ux/strings';

const hasDocument = () => typeof document !== 'undefined';

const labelFor = (locale) => (LOCALE_LABELS[locale] && LOCALE_LABELS[locale].label) || locale;
const flagFor = (locale) => (LOCALE_LABELS[locale] && LOCALE_LABELS[locale].flag) || '🌐';

// Create the static DOM tree; no behavior attached. Exported for unit tests.
export function createLanguageDom() {
  const wrap = L.DomUtil.create('div', 'leaflet-bar mdf-flag mdf-lang');

  const button = L.DomUtil.create('button', 'mdf-flag__btn', wrap);
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-controls', 'mdf-lang-panel');

  const panel = L.DomUtil.create('div', 'mdf-flag__panel', wrap);
  panel.hidden = true;
  panel.id = 'mdf-lang-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-labelledby', 'mdf-lang-title');

  const head = L.DomUtil.create('div', 'mdf-flag__head', panel);
  const title = L.DomUtil.create('p', 'mdf-flag__title', head);
  title.id = 'mdf-lang-title';
  title.textContent = t('lang.title');

  const list = L.DomUtil.create('ul', 'mdf-flag__list', panel);

  return { wrap, button, panel, list };
}

// Attach behavior; returns the teardown for the document outside-click listener.
// Exported for unit tests.
export function wireLanguageControl(dom) {
  const { wrap, button, panel, list } = dom;

  const renderButton = () => {
    const loc = getLocale();
    button.setAttribute('aria-label', t('lang.button').replace('{name}', labelFor(loc)));
    button.title = t('lang.open');
    button.innerHTML =
      '<span class="mdf-flag__glyph" aria-hidden="true">' + flagFor(loc) + '</span>' +
      '<span class="mdf-flag__name">' + labelFor(loc) + '</span>';
  };

  const onOutsidePointer = (ev) => {
    if (!wrap.contains(ev.target)) closePanel(false);
  };
  function openPanel() {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    if (hasDocument()) document.addEventListener('pointerdown', onOutsidePointer, true);
  }
  function closePanel(returnFocus) {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (hasDocument()) document.removeEventListener('pointerdown', onOutsidePointer, true);
    if (returnFocus) button.focus();
  }
  const togglePanel = () => (panel.hidden ? openPanel() : closePanel(true));

  // pointerup+click activation, de-duped per press, so Leaflet's wrapper
  // mousedown-stopPropagation can never swallow a button (see CountryFlagControl).
  const onActivate = (el, action) => {
    let firing = false;
    const run = (ev) => {
      L.DomEvent.stop(ev);
      if (firing) return;
      firing = true;
      action();
      setTimeout(() => { firing = false; }, 0);
    };
    L.DomEvent.on(el, 'pointerup', run);
    L.DomEvent.on(el, 'click', run);
  };

  const pick = (locale) => {
    setLocale(locale);       // persists + dispatches mdf-locale-change
    renderButton();          // reflect the new language on the trigger now
    closePanel(true);
  };

  // One option per supported locale, labeled in its own language (endonym).
  for (const locale of SUPPORTED_LOCALES) {
    const li = L.DomUtil.create('li', 'mdf-flag__item', list);
    const opt = L.DomUtil.create('button', 'mdf-flag__option', li);
    opt.type = 'button';
    opt.dataset.locale = locale;
    opt.innerHTML =
      '<span class="mdf-flag__glyph" aria-hidden="true">' + flagFor(locale) + '</span>' +
      '<span class="mdf-flag__name">' + labelFor(locale) + '</span>';
    onActivate(opt, () => pick(locale));
  }

  L.DomEvent.on(panel, 'keydown', (ev) => {
    if (ev.key === 'Escape') { L.DomEvent.stop(ev); closePanel(true); }
  });
  onActivate(button, togglePanel);

  renderButton();

  L.DomEvent.disableClickPropagation(wrap);
  L.DomEvent.disableScrollPropagation(wrap);

  return () => {
    if (hasDocument()) document.removeEventListener('pointerdown', onOutsidePointer, true);
  };
}

const LanguageControl = () => {
  const map = useMap();

  useEffect(() => {
    const LangControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const dom = createLanguageDom();
        this._cleanup = wireLanguageControl(dom);
        return dom.wrap;
      },
      onRemove() {
        if (this._cleanup) this._cleanup();
      },
    });

    const control = new LangControl();
    map.addControl(control);
    return () => map.removeControl(control);
  }, [map]);

  return null;
};

export default LanguageControl;
