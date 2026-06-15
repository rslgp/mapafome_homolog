// emptyViewportOverlay.dom.test.js — the dismissable "no one mapped here" overlay.
//
// Covers the dismiss affordances added on top of the original render:
//   • an X close button sits next to the Report CTA and hides the overlay;
//   • a swipe on the card (past the threshold, any direction) hides it;
//   • dismissal is per-empty-area: when `visible` goes false -> true again
//     (a fresh empty viewport), the overlay re-arms and reappears;
//   • the Report CTA still fires onStartReport;
//   • the close button carries an accessible name (empty.close, 7-locale key).
//
// Uses React Testing Library like the other overlay harnesses (overlay-a11y).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

import EmptyViewportOverlay from '../src/app/components/compatibility/components/ux/EmptyViewportOverlay.js';
import { setLocale, t } from '../src/app/components/compatibility/components/ux/strings.js';

const card = (container) => container.querySelector('.mdf-empty__card');

beforeEach(() => {
  setLocale('pt-BR');
});
afterEach(() => {
  cleanup();
  setLocale('pt-BR');
});

describe('EmptyViewportOverlay — dismiss affordances', () => {
  it('renders the message + Report CTA + a close button when visible', () => {
    const { container, getByText } = render(
      <EmptyViewportOverlay visible onStartReport={() => {}} />,
    );
    expect(container.querySelector('.mdf-empty')).toBeTruthy();
    expect(getByText(t('cta.report'))).toBeTruthy();
    const close = container.querySelector('.mdf-empty__close');
    expect(close).toBeTruthy();
    // accessible name comes from empty.close (present in all 7 locales)
    expect(close.getAttribute('aria-label')).toBe(t('empty.close'));
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <EmptyViewportOverlay visible={false} onStartReport={() => {}} />,
    );
    expect(container.querySelector('.mdf-empty')).toBeNull();
  });

  it('the X button dismisses the overlay', () => {
    const { container } = render(
      <EmptyViewportOverlay visible onStartReport={() => {}} />,
    );
    fireEvent.click(container.querySelector('.mdf-empty__close'));
    expect(container.querySelector('.mdf-empty')).toBeNull();
  });

  it('the Report CTA fires onStartReport', () => {
    let fired = 0;
    const { container } = render(
      <EmptyViewportOverlay visible onStartReport={() => { fired += 1; }} />,
    );
    fireEvent.click(container.querySelector('.mdf-empty__cta'));
    expect(fired).toBe(1);
  });

  it('a swipe past the threshold dismisses the overlay', () => {
    const { container } = render(
      <EmptyViewportOverlay visible onStartReport={() => {}} />,
    );
    const el = card(container);
    fireEvent.touchStart(el, { touches: [{ clientX: 200, clientY: 200 }] });
    // travel 100px horizontally (> 60px threshold)
    fireEvent.touchMove(el, { touches: [{ clientX: 100, clientY: 205 }] });
    expect(container.querySelector('.mdf-empty')).toBeNull();
  });

  it('a small drag below the threshold does NOT dismiss', () => {
    const { container } = render(
      <EmptyViewportOverlay visible onStartReport={() => {}} />,
    );
    const el = card(container);
    fireEvent.touchStart(el, { touches: [{ clientX: 200, clientY: 200 }] });
    fireEvent.touchMove(el, { touches: [{ clientX: 185, clientY: 190 }] }); // <60px
    fireEvent.touchEnd(el, {});
    expect(container.querySelector('.mdf-empty')).toBeTruthy();
  });

  it('re-arms when a fresh empty viewport is entered (visible false -> true)', () => {
    const { container, rerender } = render(
      <EmptyViewportOverlay visible onStartReport={() => {}} />,
    );
    // dismiss it
    fireEvent.click(container.querySelector('.mdf-empty__close'));
    expect(container.querySelector('.mdf-empty')).toBeNull();
    // viewport leaves the empty condition...
    rerender(<EmptyViewportOverlay visible={false} onStartReport={() => {}} />);
    expect(container.querySelector('.mdf-empty')).toBeNull();
    // ...then re-enters it: overlay must reappear (dismissal was per-area)
    rerender(<EmptyViewportOverlay visible onStartReport={() => {}} />);
    expect(container.querySelector('.mdf-empty')).toBeTruthy();
  });

  it('stays dismissed while still visible (no flicker back on re-render)', () => {
    const { container, rerender } = render(
      <EmptyViewportOverlay visible onStartReport={() => {}} />,
    );
    fireEvent.click(container.querySelector('.mdf-empty__close'));
    // a re-render with the SAME visible=true must keep it dismissed
    rerender(<EmptyViewportOverlay visible onStartReport={() => {}} />);
    expect(container.querySelector('.mdf-empty')).toBeNull();
  });
});
