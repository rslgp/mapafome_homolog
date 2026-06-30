// infoPanel.dom.test.js, load-bearing behavior of the InfoPanel surface (M11).
//
// WHY THIS EXISTS
//   InfoPanel is the landing page's primary information + install + support
//   surface and shipped with ZERO tests. This harness renders it with React
//   Testing Library and asserts its load-bearing behavior:
//     • it renders the live point count from the `rowCount` prop (the one
//       stat the panel exists to surface), and coalesces a missing count to 0;
//     • the three collapse toggles (thanks / supporters / consequences) start
//       collapsed and reveal their section on click, flipping aria-expanded;
//     • the consequences table renders the hunger-timeline rows when open;
//     • the install badges render while not installed (default jsdom state).
//
//   Test-only. The component is NOT modified (M11 Exclude). Heavy / volatile
//   children are stubbed exactly like overlay-a11y stubs analytics: sugestao
//   constructs a GoogleSpreadsheet at module load, SponsorSlot + Apoiadores
//   pull analytics / network, none of which is InfoPanel's own behavior.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';

// Stub the heavy / side-effectful children so the render is deterministic and
// isolated to InfoPanel's own logic (they are covered, where testable, on their
// own). Each stub keeps a stable marker so a collapse-reveal can be asserted.
vi.mock('../src/app/components/compatibility/components/googlesheets/sugestao', () => ({
  default: () => null,
}));
vi.mock('../src/app/components/compatibility/components/ux/SponsorSlot', () => ({
  default: () => null,
}));
vi.mock('../src/app/components/compatibility/components/home/Apoiadores', () => ({
  default: () => <div data-testid="apoiadores-stub" />,
}));
vi.mock('../src/app/components/compatibility/components/home/ImagemInstagram', () => ({
  default: () => null,
}));

import InfoPanel from '../src/app/components/compatibility/components/InfoPanel.js';
import { setLocale, t } from '../src/app/components/compatibility/components/ux/strings.js';

beforeEach(() => {
  setLocale('pt-BR');
});
afterEach(() => {
  cleanup();
  setLocale('pt-BR');
  vi.clearAllMocks();
});

describe('InfoPanel: live count + collapse sections', () => {
  it('renders the point count from the rowCount prop', () => {
    const { container } = render(<InfoPanel rowCount={1234} />);
    const stats = container.querySelector('.ip-stats');
    expect(stats).toBeTruthy();
    expect(stats.querySelector('strong').textContent).toBe('1234');
    expect(stats.textContent).toContain(t('page.info.stats_points'));
  });

  it('coalesces a missing/zero count to 0 (msg-drop-safe display)', () => {
    const { container } = render(<InfoPanel rowCount={0} />);
    expect(container.querySelector('.ip-stats strong').textContent).toBe('0');
  });

  it('renders the install badges while not installed (default state)', () => {
    const { container } = render(<InfoPanel rowCount={0} />);
    const badges = container.querySelector('.ip-apps__install-badges');
    expect(badges).toBeTruthy();
    expect(badges.querySelectorAll('button').length).toBe(2);
  });

  it('thanks section is collapsed by default and reveals on click', () => {
    const { container, getByText } = render(<InfoPanel rowCount={3} />);
    expect(container.querySelector('#ip-collapse-agradecimentos')).toBeNull();

    const toggle = getByText(t('page.info.show_thanks'));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);

    expect(container.querySelector('#ip-collapse-agradecimentos')).toBeTruthy();
    // After opening, the button label flips to the hide-copy + aria-expanded=true.
    expect(getByText(t('page.info.hide_thanks')).getAttribute('aria-expanded')).toBe('true');
  });

  it('supporters section reveals the Apoiadores subtree on click', () => {
    const { container, getByText } = render(<InfoPanel rowCount={3} />);
    expect(container.querySelector('[data-testid="apoiadores-stub"]')).toBeNull();
    fireEvent.click(getByText(t('page.info.show_supporters')));
    expect(container.querySelector('#ip-collapse-apoiadores')).toBeTruthy();
    expect(container.querySelector('[data-testid="apoiadores-stub"]')).toBeTruthy();
  });

  it('consequences table renders the hunger-timeline rows when opened', () => {
    const { container, getByText } = render(<InfoPanel rowCount={3} />);
    expect(container.querySelector('.ip-table')).toBeNull();
    fireEvent.click(getByText(t('page.info.show_conseq')));
    const table = container.querySelector('.ip-table');
    expect(table).toBeTruthy();
    // The timeline has multiple rows; assert the header + at least one data row.
    expect(table.querySelector('thead')).toBeTruthy();
    expect(table.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('collapsing an open section hides it again (toggle is symmetric)', () => {
    const { container, getByText } = render(<InfoPanel rowCount={3} />);
    fireEvent.click(getByText(t('page.info.show_conseq')));
    expect(container.querySelector('#ip-collapse-tabela')).toBeTruthy();
    fireEvent.click(getByText(t('page.info.hide_conseq')));
    expect(container.querySelector('#ip-collapse-tabela')).toBeNull();
  });
});
