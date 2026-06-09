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
import React from 'react';
import { render, act, cleanup } from '@testing-library/react';

import { t, getLocale, setLocale, useLocale } from
  '../src/app/components/compatibility/components/ux/strings.js';
import EmptyViewportOverlay from
  '../src/app/components/compatibility/components/ux/EmptyViewportOverlay.js';

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
