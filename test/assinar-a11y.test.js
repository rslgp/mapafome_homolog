// assinar-a11y.test.js — MILESTONE P17 (UI/UX): OPEN-STATE accessibility audit
// for the /assinar (Asaas recurring-support) subscription form.
//
// WHY THIS EXISTS
//   `npm run a11y` runs axe against the dev-server URL, but it cannot reach the
//   form's ERROR state (the role="alert" region mounts only after a failed
//   submit) and does not assert the radiogroup keyboard contract. This harness
//   renders the page component with React Testing Library and runs axe-core
//   (vitest-axe) on (a) the default idle state and (b) the post-validation error
//   state, asserting ZERO serious/critical violations on the structural/ARIA
//   rules jsdom can evaluate. It also asserts the radiogroup roving-tabindex +
//   arrow-key contract directly (axe checks roles, not behaviour).
//
// SCOPE / HONESTY ABOUT jsdom
//   jsdom does no real layout, so axe's color-contrast rule is unreliable here
//   (covered by the static audit + page-level `npm run a11y`). We disable
//   color-contrast and assert only rules jsdom CAN judge: roles, accessible
//   names, labels, aria-*, focus/tabindex, duplicate ids, region semantics.
//   Mirrors overlay-a11y.test.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent, within } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';

import AssinarPage from '../src/app/assinar/page.js';
import { setLocale } from
  '../src/app/components/compatibility/components/ux/strings.js';
import { expectNoSeriousViolations } from './helpers/axeAudit.js';

expect.extend(axeMatchers);

beforeEach(() => { setLocale('pt-BR'); });
afterEach(() => { cleanup(); setLocale('pt-BR'); });

describe('a11y · /assinar subscription form — idle state', () => {
  it('has no serious/critical violations on first render', async () => {
    const { container } = render(<AssinarPage />);
    await expectNoSeriousViolations(container, 'AssinarPage (idle)');
  });

  it('exposes two radiogroups (payment rail + preset values) with accessible names', () => {
    const { getAllByRole } = render(<AssinarPage />);
    const groups = getAllByRole('radiogroup');
    expect(groups.length).toBe(2);
    for (const g of groups) {
      expect(g.getAttribute('aria-label')).toBeTruthy();
    }
  });
});

describe('a11y · /assinar — radiogroup roving tabindex + arrow keys', () => {
  it('rail radiogroup: exactly one radio is tabbable (the checked one)', () => {
    const { getAllByRole } = render(<AssinarPage />);
    const radios = getAllByRole('radio');
    const railRadios = radios.filter((r) => r.classList.contains('mdf-rail'));
    const tabbable = railRadios.filter((r) => r.getAttribute('tabindex') === '0');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].getAttribute('aria-checked')).toBe('true');
  });

  it('ArrowDown on the rail group moves selection to the next radio', () => {
    const { container, getAllByRole } = render(<AssinarPage />);
    const group = container.querySelector('.mdf-rails');
    const before = getAllByRole('radio').filter((r) => r.classList.contains('mdf-rail'))
      .find((r) => r.getAttribute('aria-checked') === 'true');
    fireEvent.keyDown(group, { key: 'ArrowDown' });
    const after = getAllByRole('radio').filter((r) => r.classList.contains('mdf-rail'))
      .find((r) => r.getAttribute('aria-checked') === 'true');
    expect(after).not.toBe(before);
    // exactly one checked radio after navigation (single-select invariant)
    const checked = getAllByRole('radio').filter(
      (r) => r.classList.contains('mdf-rail') && r.getAttribute('aria-checked') === 'true',
    );
    expect(checked.length).toBe(1);
  });

  it('Home/End jump to the first/last preset value', () => {
    const { container } = render(<AssinarPage />);
    const group = container.querySelector('.mdf-chips');
    const chips = within(group).getAllByRole('radio');
    fireEvent.keyDown(group, { key: 'End' });
    expect(chips[chips.length - 1].getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(group, { key: 'Home' });
    expect(chips[0].getAttribute('aria-checked')).toBe('true');
  });
});

describe('a11y · /assinar — error state announces via role="alert"', () => {
  it('renders a role="alert" region with no serious/critical violations after a failed submit', async () => {
    const { container, getByRole } = render(<AssinarPage />);
    // Submit with the form blank → client validation fails → error state mounts.
    fireEvent.submit(container.querySelector('form'));
    const alert = getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent.trim().length).toBeGreaterThan(0);
    await expectNoSeriousViolations(container, 'AssinarPage (error state)');
  });
});
