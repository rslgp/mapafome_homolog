// guidedTutorial.dom.test.js, load-bearing behavior of the GuidedTutorial
// onboarding overlay (M11).
//
// WHY THIS EXISTS
//   GuidedTutorial is the first-run onboarding dialog and shipped with ZERO
//   tests. This harness renders it with React Testing Library and asserts the
//   behavior the user actually depends on:
//     • it renders nothing when open=false (hidden-by-default contract);
//     • open=true shows the chooser (welcome + the two role choices + skip);
//     • picking a role starts that flow at step 1 (the contextual stops);
//     • Next advances and "Entendi" on the last step calls onClose('done');
//     • Back from step 1 returns to the chooser (change profile);
//     • Skip and the backdrop both call onClose('skip').
//
//   Test-only. The component is NOT modified (M11 Exclude). analytics is stubbed
//   (it touches window/sessionStorage on a flow pick) exactly like overlay-a11y
//   stubs it; cookies are written through the real document.cookie (jsdom).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../src/app/components/compatibility/components/ux/analytics', () => ({
  trackReportStarted: vi.fn(),
}));

import GuidedTutorial from '../src/app/components/compatibility/components/ux/GuidedTutorial.js';
import { setLocale, t } from '../src/app/components/compatibility/components/ux/strings.js';

beforeEach(() => {
  setLocale('pt-BR');
  // Clear the tour cookie so each run starts from a clean "not seen" state.
  document.cookie = 'mdf_tour_done=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});
afterEach(() => {
  cleanup();
  setLocale('pt-BR');
  vi.clearAllMocks();
});

const pickReporter = (getByText) => fireEvent.click(getByText(t('page.tutorial.reporter_label')));

describe('GuidedTutorial: visibility + chooser', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<GuidedTutorial open={false} onClose={() => {}} />);
    expect(container.querySelector('.mdf-tour')).toBeNull();
  });

  it('shows the chooser (welcome + both roles + skip) when open', () => {
    const { container, getByText } = render(<GuidedTutorial open onClose={() => {}} />);
    expect(container.querySelector('.mdf-tour')).toBeTruthy();
    expect(getByText(t('page.tutorial.welcome_title'))).toBeTruthy();
    expect(getByText(t('page.tutorial.reporter_label'))).toBeTruthy();
    expect(getByText(t('page.tutorial.helper_label'))).toBeTruthy();
    expect(getByText(t('page.tutorial.skip'))).toBeTruthy();
  });
});

describe('GuidedTutorial: flow navigation', () => {
  it('picking the reporter role starts that flow at step 1', () => {
    const { getByText, container } = render(<GuidedTutorial open onClose={() => {}} />);
    pickReporter(getByText);
    // Step 1 title for the reporter flow + the "step 1 of 3" meta line.
    expect(getByText(t('page.tutorial.rep1_title'))).toBeTruthy();
    expect(container.querySelector('.mdf-tour__meta').textContent)
      .toContain(t('page.tutorial.meta_step').replace('{n}', '1').replace('{total}', '3'));
  });

  it('Next advances reporter step 1 -> step 2', () => {
    const { getByText } = render(<GuidedTutorial open onClose={() => {}} />);
    pickReporter(getByText);
    fireEvent.click(getByText(t('page.tutorial.next')));
    expect(getByText(t('page.tutorial.rep2_title'))).toBeTruthy();
  });

  it('Back from step 1 returns to the chooser (change profile)', () => {
    const { getByText } = render(<GuidedTutorial open onClose={() => {}} />);
    pickReporter(getByText);
    // On step 1 the prev button reads "change profile".
    fireEvent.click(getByText(t('page.tutorial.change_profile')));
    expect(getByText(t('page.tutorial.welcome_title'))).toBeTruthy();
  });

  it('"Entendi" on the final step calls onClose with "done"', () => {
    const onClose = vi.fn();
    const { getByText } = render(<GuidedTutorial open onClose={onClose} />);
    pickReporter(getByText);
    fireEvent.click(getByText(t('page.tutorial.next'))); // step 1 -> 2
    fireEvent.click(getByText(t('page.tutorial.next'))); // step 2 -> 3
    // On the last step the primary button reads "got it" (Entendi).
    fireEvent.click(getByText(t('page.tutorial.got_it')));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('done');
  });
});

describe('GuidedTutorial: dismissal paths', () => {
  it('Skip from the chooser calls onClose with "skip"', () => {
    const onClose = vi.fn();
    const { getByText } = render(<GuidedTutorial open onClose={onClose} />);
    fireEvent.click(getByText(t('page.tutorial.skip')));
    expect(onClose).toHaveBeenCalledWith('skip');
  });

  it('clicking the backdrop calls onClose with "skip"', () => {
    const onClose = vi.fn();
    const { container } = render(<GuidedTutorial open onClose={onClose} />);
    fireEvent.click(container.querySelector('.mdf-tour__backdrop'));
    expect(onClose).toHaveBeenCalledWith('skip');
  });
});
