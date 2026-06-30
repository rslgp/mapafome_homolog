// installToast.dom.test.js, load-bearing behavior of the InstallToast PWA-lite
// install invitation (M11).
//
// WHY THIS EXISTS
//   InstallToast auto-surfaces the native install prompt and shipped with ZERO
//   tests. Its visibility logic (a captured beforeinstallprompt + a settle
//   delay + a 14-day dismiss back-off) is exactly the kind of subtle gate that
//   silently regresses. This harness renders it with React Testing Library and
//   fake timers and asserts:
//     • it renders nothing before the settle delay elapses (no first-paint pounce);
//     • after the delay, with a captured native event, the native toast appears
//       with the Install + "Agora não" buttons;
//     • Install fires the captured event's prompt() (the real install gesture);
//     • "Agora não" hides the toast AND writes the 14-day back-off to localStorage;
//     • a recent dismiss back-off suppresses the toast entirely.
//
//   Test-only. The component is NOT modified (M11 Exclude). useInstallPrompt is
//   stubbed to a plain desktop result so the NATIVE branch is the one under test
//   (the iOS branch has its own gate); the captured event is injected through the
//   real window.__mdf_install_prompt bridge the component reads.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent, act } from '@testing-library/react';

// Desktop, installable, not iOS / not standalone -> the native toast branch.
vi.mock('../src/app/components/compatibility/components/ux/useInstallPrompt', () => ({
  default: () => ({
    canInstall: true,
    isInstalled: false,
    promptInstall: vi.fn(),
    platform: 'desktop',
    isIOS: false,
    isStandalone: false,
    isInAppBrowser: false,
  }),
}));

import InstallToast from '../src/app/components/compatibility/components/ux/InstallToast.js';
import { setLocale, t } from '../src/app/components/compatibility/components/ux/strings.js';

const SHOW_DELAY_MS = 1500;

// A stand-in for the BeforeInstallPromptEvent the browser hands us.
function makePromptEvent() {
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn(),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
  };
}

beforeEach(() => {
  setLocale('pt-BR');
  vi.useFakeTimers();
  try { window.localStorage.clear(); } catch (_e) { /* ignore */ }
  delete window.__mdf_install_prompt;
  delete window.__mdf_app_installed;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setLocale('pt-BR');
  vi.clearAllMocks();
  delete window.__mdf_install_prompt;
  delete window.__mdf_app_installed;
});

describe('InstallToast: settle delay + native invite', () => {
  it('renders nothing before the settle delay (no first-paint pounce)', () => {
    window.__mdf_install_prompt = makePromptEvent();
    const { container } = render(<InstallToast />);
    expect(container.querySelector('.mdf-install-toast')).toBeNull();
    // Advance just short of the delay, still hidden.
    act(() => { vi.advanceTimersByTime(SHOW_DELAY_MS - 1); });
    expect(container.querySelector('.mdf-install-toast')).toBeNull();
  });

  it('shows the native toast (Install + later) after the settle delay', () => {
    window.__mdf_install_prompt = makePromptEvent();
    const { container, getByText } = render(<InstallToast />);
    act(() => { vi.advanceTimersByTime(SHOW_DELAY_MS); });
    const toast = container.querySelector('.mdf-install-toast');
    expect(toast).toBeTruthy();
    expect(getByText(t('page.install.title'))).toBeTruthy();
    expect(getByText(t('page.install.btn'))).toBeTruthy();   // Instalar
    expect(getByText(t('page.install.later'))).toBeTruthy(); // Agora não
  });

  it('does NOT show when a recent dismiss back-off is set', () => {
    window.localStorage.setItem(
      'mdf_install_dismissed_until',
      String(Date.now() + 60 * 60 * 1000),
    );
    window.__mdf_install_prompt = makePromptEvent();
    const { container } = render(<InstallToast />);
    act(() => { vi.advanceTimersByTime(SHOW_DELAY_MS); });
    expect(container.querySelector('.mdf-install-toast')).toBeNull();
  });
});

describe('InstallToast: actions', () => {
  it('Install fires the captured event prompt() (the real install gesture)', async () => {
    const ev = makePromptEvent();
    window.__mdf_install_prompt = ev;
    const { getByText } = render(<InstallToast />);
    act(() => { vi.advanceTimersByTime(SHOW_DELAY_MS); });
    await act(async () => { fireEvent.click(getByText(t('page.install.btn'))); });
    expect(ev.prompt).toHaveBeenCalledTimes(1);
  });

  it('"Agora não" hides the toast and persists the 14-day back-off', () => {
    window.__mdf_install_prompt = makePromptEvent();
    const { container, getByText } = render(<InstallToast />);
    act(() => { vi.advanceTimersByTime(SHOW_DELAY_MS); });
    expect(container.querySelector('.mdf-install-toast')).toBeTruthy();

    fireEvent.click(getByText(t('page.install.later')));
    expect(container.querySelector('.mdf-install-toast')).toBeNull();

    const until = Number(window.localStorage.getItem('mdf_install_dismissed_until'));
    expect(until).toBeGreaterThan(Date.now());
  });
});
