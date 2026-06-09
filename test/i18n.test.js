// i18n.test.js — ROADMAP P1 verification: the i18n system is actually wired.
//
// The dictionary in strings.js was dead code (no component imported t). This
// suite is the machine-checkable proof that:
//   • t() resolves the active locale's string (pt-BR default + es).
//   • useLocale() subscribes a rendered component to the 'mdf-locale-change'
//     CustomEvent so it RE-RENDERS in place (no remount) when the locale flips.
//   • pt-BR remains the default and is restored when switching back.
//
// The crux being guarded: t() reads a module-level currentLocale at call time,
// so without the useLocale() subscription a component renders the old locale
// forever. setLocale() dispatches 'mdf-locale-change'; useLocale() listens.

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

import { t, getLocale, setLocale, useLocale, localeKeys, SUPPORTED_LOCALES } from
  '../src/app/components/compatibility/components/ux/strings.js';
import EmptyViewportOverlay from
  '../src/app/components/compatibility/components/ux/EmptyViewportOverlay.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPAT = join(HERE, '..', 'src', 'app', 'components', 'compatibility');

// pt-BR is the default; reset to it after each test so order is irrelevant and
// no test leaks a locale into the next (module-level currentLocale is shared).
beforeEach(() => { act(() => setLocale('pt-BR')); });
afterEach(() => { cleanup(); act(() => setLocale('pt-BR')); });

describe('strings.t() — locale resolution', () => {
  it('defaults to pt-BR', () => {
    expect(getLocale()).toBe('pt-BR');
    expect(t('cta.report')).toBe('Relatar');
    expect(t('empty.no_pins_in_view')).toContain('Ninguém foi mapeado');
  });

  it('returns es strings after setLocale("es")', () => {
    act(() => setLocale('es'));
    expect(getLocale()).toBe('es');
    expect(t('cta.report')).toBe('Reportar');
    expect(t('empty.no_pins_in_view')).toContain('Nadie ha sido mapeado');
  });

  it('falls back to the key for an unknown id', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('ignores an unsupported locale (stays on the previous one)', () => {
    act(() => setLocale('fr'));
    expect(getLocale()).toBe('pt-BR');
  });
});

describe('useLocale() — re-render on locale change (the crux)', () => {
  // A converted component must show es after the switch AND pt-BR after
  // switching back, WITHOUT being remounted, proving the live subscription.
  it('re-renders EmptyViewportOverlay in place across pt-BR -> es -> pt-BR', () => {
    const { container } = render(<EmptyViewportOverlay visible onStartReport={() => {}} />);

    // 1) pt-BR (default).
    expect(container.querySelector('.mdf-empty__text').textContent)
      .toContain('Ninguém foi mapeado');
    expect(container.querySelector('.mdf-empty__cta').textContent.trim())
      .toBe('Relatar');

    // 2) Flip to es — setLocale dispatches 'mdf-locale-change'; useLocale forces
    //    a re-render so t() re-reads. No remount, no re-render() call here.
    act(() => setLocale('es'));
    expect(container.querySelector('.mdf-empty__text').textContent)
      .toContain('Nadie ha sido mapeado');
    expect(container.querySelector('.mdf-empty__cta').textContent.trim())
      .toBe('Reportar');

    // 3) Flip back to pt-BR — default copy is restored (no regression).
    act(() => setLocale('pt-BR'));
    expect(container.querySelector('.mdf-empty__text').textContent)
      .toContain('Ninguém foi mapeado');
    expect(container.querySelector('.mdf-empty__cta').textContent.trim())
      .toBe('Relatar');
  });

  it('a t()-consuming probe that calls useLocale() updates on the event', () => {
    function Probe() {
      useLocale();
      return <span data-testid="probe">{t('report.button')}</span>;
    }
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('probe').textContent).toBe('Publicar ponto');
    act(() => setLocale('es'));
    expect(getByTestId('probe').textContent).toBe('Publicar punto');
  });
});

// ── ROADMAP P7 — errors.offline is wired and says the truth ────────────────
// The offline publish path (App.handlePublishFromSheet) enqueues to IndexedDB
// (publishQueue.enqueue) and drains on the 'online' event (bindOnlineFlush), so
// the user's point is SAVED and AUTO-RETRIED — not lost. The copy must reflect
// "saved, will send when back online", NOT "try again later". This guards both
// the resolved copy and that App.js renders it via t() (no hardcoded string).
describe('errors.offline — P7: queue-and-retry copy, wired via t()', () => {
  it('pt-BR resolves to the save-and-send copy (not "try again later")', () => {
    expect(t('errors.offline')).toBe(
      'Você está sem internet. O ponto foi salvo e será enviado quando a conexão voltar.',
    );
    expect(t('errors.offline')).toContain('foi salvo');
    expect(t('errors.offline')).not.toContain('Tente de novo'); // the old, wrong copy
  });

  it('es resolves to the parallel save-and-send copy', () => {
    act(() => setLocale('es'));
    expect(t('errors.offline')).toBe(
      'Estás sin conexión. El punto fue guardado y se enviará cuando vuelva la conexión.',
    );
    expect(t('errors.offline')).toContain('fue guardado');
  });

  it('App.js renders errors.offline via t(), with no hardcoded offline string', () => {
    const app = readFileSync(join(COMPAT, 'App.js'), 'utf8');
    expect(app).toContain("t('errors.offline')");
    expect(app).toContain("t('errors.server_slow')");
    // The previously-hardcoded offline copy must no longer live in the source.
    expect(app).not.toContain('será enviado quando a conexão voltar.');
  });
});

// ── ROADMAP P8 — no dead keys, parity holds ────────────────────────────────
describe('dictionary — P8: parity + zero dead keys', () => {
  it('pt-BR and es expose the exact same key set (no orphans either side)', () => {
    const pt = localeKeys('pt-BR');
    const es = localeKeys('es');
    expect(es).toEqual(pt); // both are sorted; deep-equal proves 1:1 parity
  });

  it('the retired empty.no_pins_anywhere key is gone from both locales', () => {
    expect(localeKeys('pt-BR')).not.toContain('empty.no_pins_anywhere');
    expect(localeKeys('es')).not.toContain('empty.no_pins_anywhere');
  });

  it('every dictionary key is referenced in compat source (no dead keys)', () => {
    // Recursively collect compat source EXCEPT the dictionary itself (strings.js
    // — where every key appears as a DICT property and would self-satisfy) and
    // test files. A key counts as live if it appears as a quoted string literal
    // anywhere: most via t('key'), but a few are resolved dynamically (e.g.
    // PinDetailSheet's STATUS_COPY maps a status to { key: 'pin.attended_today' }
    // and later calls t(entry.key)). Matching the quoted literal covers both.
    const files = [];
    (function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!/\.(js|jsx)$/.test(entry.name)) continue;
        if (entry.name.endsWith('.test.js')) continue;
        if (entry.name === 'strings.js') continue; // the dictionary itself
        files.push(full);
      }
    })(COMPAT);
    const corpus = files.map((f) => readFileSync(f, 'utf8')).join('\n');

    const dead = localeKeys('pt-BR').filter(
      (key) => !corpus.includes(`'${key}'`) && !corpus.includes(`"${key}"`),
    );
    expect(dead).toEqual([]);
  });
});
