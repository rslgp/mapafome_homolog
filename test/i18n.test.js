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
// PET-M23 — the /pets surfaces (and petDomain/petShare) read pets.* keys, so the
// no-dead-key scan must include them too (otherwise every new pets.* key would
// look "dead" — it is referenced under src/app/pets, outside the compat tree).
const PETS = join(HERE, '..', 'src', 'app', 'pets');
// The /assinar route reads assinar.* keys outside the compat tree as well.
const ASSINAR = join(HERE, '..', 'src', 'app', 'assinar');

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

  it('returns en-US strings after setLocale("en-US") (INTL M6)', () => {
    act(() => setLocale('en-US'));
    expect(getLocale()).toBe('en-US');
    // A finalized mechanical label.
    expect(t('cta.report')).toBe('Report');
    // A dignity-sensitive line is DRAFTED, not final: it must still carry the
    // [REVISAR-HUMANO] marker until a human approves the tone (plan D7/M6.3).
    expect(t('empty.no_pins_in_view')).toContain('[REVISAR-HUMANO] ');
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
  // INTL M6.4: data-driven over SUPPORTED_LOCALES (was a hard-coded pt-BR/es
  // deep-equal), so adding a 3rd locale (en-US) is covered automatically and a
  // 4th would be too. pt-BR is the reference key set; EVERY locale must match it
  // 1:1 — no orphan keys on any side, no missing keys on a new locale.
  it('every supported locale exposes the exact same key set as pt-BR (full parity)', () => {
    const reference = localeKeys('pt-BR');
    // Guard against a vacuous pass (an empty filter / missing dict).
    expect(reference.length).toBeGreaterThan(0);
    for (const locale of SUPPORTED_LOCALES) {
      expect(localeKeys(locale), `${locale} key set must equal pt-BR 1:1`).toEqual(reference);
    }
  });

  it('all three UI locales are wired (pt-BR, es, en-US)', () => {
    expect(SUPPORTED_LOCALES).toContain('pt-BR');
    expect(SUPPORTED_LOCALES).toContain('es');
    expect(SUPPORTED_LOCALES).toContain('en-US');
  });

  it('the retired empty.no_pins_anywhere key is gone from every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(localeKeys(locale)).not.toContain('empty.no_pins_anywhere');
    }
  });

  it('every dictionary key is referenced in source (no dead keys)', () => {
    // Recursively collect source EXCEPT the dictionary itself (strings.js — where
    // every key appears as a DICT property and would self-satisfy) and test files.
    // PET-M23: walk COMPAT + the /pets and /assinar routes too — both read keys
    // (pets.* / assinar.*) outside the compat tree, so a COMPAT-only scan would
    // wrongly flag them dead.
    const files = [];
    function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip the i18n shard directory wholesale: engine.js, dictionary.js and
          // the per-feature strings.*.js shards live here and each key appears as a
          // DICT property literal — walking them would make EVERY key self-satisfy
          // and the no-dead-key assertion pass vacuously. (Previously only the
          // single strings.js dictionary file was skipped; the shards replace it.)
          if (entry.name === 'i18n') continue;
          walk(full); continue;
        }
        if (!/\.(js|jsx)$/.test(entry.name)) continue;
        if (entry.name.endsWith('.test.js')) continue;
        if (entry.name === 'strings.js') continue; // the public barrel (re-exports only)
        files.push(full);
      }
    }
    walk(COMPAT);
    walk(PETS);
    walk(ASSINAR);
    const corpus = files.map((f) => readFileSync(f, 'utf8')).join('\n');

    // A key counts as live if it appears as a quoted string literal anywhere
    // (most via t('key'); some via a { key: 'pin.attended_today' } indirection).
    // PET-M23 also resolves some keys DYNAMICALLY by id — e.g.
    // t(`pets.status.${s.id}.label`) — so the full literal never appears. For
    // those the composing TEMPLATE PREFIX appears instead (e.g. `pets.status.`),
    // so a key is also live when its dotted prefix (up to and including the last
    // dot before a known dynamic segment) is present as a template literal.
    const present = (key) => corpus.includes(`'${key}'`) || corpus.includes(`"${key}"`);
    // Dynamic prefixes used by the /pets render sites (t(`<prefix>${id}...`)).
    const DYNAMIC_PREFIXES = [
      'pets.status.', 'pets.species.', 'pets.size.', 'pets.lifecycle.',
      'pets.publish.failed.', 'pets.publish.throttle.', 'pets.share.lead.',
    ];
    const liveViaDynamic = (key) =>
      DYNAMIC_PREFIXES.some((p) => key.startsWith(p) && (corpus.includes(`\`${p}`) || corpus.includes(`'${p}`)));

    const dead = localeKeys('pt-BR').filter((key) => !present(key) && !liveViaDynamic(key));
    expect(dead).toEqual([]);
  });
});
