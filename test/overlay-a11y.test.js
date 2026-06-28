// overlay-a11y.test.js — OPEN-STATE accessibility audit for the in-app overlays
// (ROADMAP Phase 3 · P9).
//
// WHY THIS EXISTS
//   `npm run a11y` runs axe against URLs only. But the LIST, REPORT, and pin
//   INFO surfaces are in-app overlays rendered on `/` — they are never their own
//   route, so axe-on-URL never reaches their OPEN state. This harness renders
//   each overlay component in its open/visible state with React Testing Library
//   and runs axe-core programmatically (via vitest-axe), asserting ZERO
//   serious/critical violations on the STRUCTURAL/ARIA rules jsdom can evaluate.
//
// SCOPE / HONESTY ABOUT jsdom
//   jsdom does not do real layout, so axe's color-contrast rule is unreliable
//   here (it cannot resolve computed colors against painted backgrounds). Color
//   contrast for these surfaces is already covered elsewhere — the static audit
//   and the page-level `npm run a11y`. We therefore DISABLE the `color-contrast`
//   rule in this harness and assert only the rules jsdom CAN judge: roles,
//   accessible names, labels, aria-*, focus/tabindex, duplicate ids, list
//   structure, region/landmark semantics, etc. If a genuine contrast problem is
//   suspected it is reported for the coloring specialist, never guessed at here.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import * as axeMatchers from 'vitest-axe/matchers';

import ListView from '../src/app/components/compatibility/components/ux/ListView.js';
import ReportSheet from '../src/app/components/compatibility/components/ux/ReportSheet.js';
import PinDetailSheet from '../src/app/components/compatibility/components/ux/PinDetailSheet.js';
import { expectNoSeriousViolations } from './helpers/axeAudit.js';

expect.extend(axeMatchers);

// analytics.track() touches window.gtag / sessionStorage; stub it so a render
// never has a side effect on the (shared) jsdom window.
vi.mock('../src/app/components/compatibility/components/ux/analytics', () => ({
  track: vi.fn(),
  trackError: vi.fn(),
}));

// axe configuration + the serious/critical assertion live in the shared
// test/helpers/axeAudit.js (single source of truth, serialized to avoid the
// parallel "Axe is already running" flake).

// ─── Fixtures ────────────────────────────────────────────────────────────────
const NOW = Date.now();
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const USER_COORDS = [-8.05428, -34.8813];

// A realistic reporter pin (has Categorias → passes isReporterPin), recent,
// with detail + a contact so the contact action link renders.
const PIN_FRESH = {
  DateISO: iso(20 * MIN),
  Categorias: ['comida', 'agua'],
  Coordinates: JSON.stringify([-8.0631, -34.8711]),
  mapCoords: [-8.0631, -34.8711],
  Detalhe: 'Senhor idoso perto da farmácia, precisa de comida e água.',
  RedeSocial: '(81) 99999-0000',
  Claims: [],
};

// A pin that has an active claim (status = someone_going) — exercises the
// claim-count branch and the "Marcar como atendido" / "Estou indo" actions.
const PIN_CLAIMED = {
  DateISO: iso(3 * HOUR),
  Categorias: ['roupa', 'higiene', 'abrigo'],
  Coordinates: JSON.stringify([-8.0700, -34.8800]),
  mapCoords: [-8.0700, -34.8800],
  Detalhe: '',
  RedeSocial: '@perfil_exemplo',
  Claims: [{ claimedAt: iso(5 * MIN) }],
};

const DATA_MAPS = [PIN_FRESH, PIN_CLAIMED];

beforeEach(() => {
  // Each component reads/writes localStorage (myClaim, locale). Start clean so
  // the open-state render is deterministic across runs.
  try { window.localStorage.clear(); } catch (_e) { /* ignore */ }
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── LIST overlay ────────────────────────────────────────────────────────────
describe('a11y · ListView (LIST overlay) — open state', () => {
  it('has no serious/critical violations with rows', async () => {
    const { container } = render(
      <ListView
        open
        dataMaps={DATA_MAPS}
        userCoords={USER_COORDS}
        onSelectPin={() => {}}
        onClose={() => {}}
      />,
    );
    await expectNoSeriousViolations(container, 'ListView (with rows)');
  });

  it('has no serious/critical violations in the empty state', async () => {
    const { container } = render(
      <ListView
        open
        dataMaps={[]}
        userCoords={USER_COORDS}
        onSelectPin={() => {}}
        onClose={() => {}}
      />,
    );
    await expectNoSeriousViolations(container, 'ListView (empty)');
  });
});

// ─── REPORT overlay ──────────────────────────────────────────────────────────
describe('a11y · ReportSheet (REPORT overlay) — open state', () => {
  it('has no serious/critical violations (default open)', async () => {
    const { container } = render(
      <ReportSheet
        open
        coords={[-8.0631, -34.8711]}
        onClose={() => {}}
        onPublish={async () => {}}
      />,
    );
    await expectNoSeriousViolations(container, 'ReportSheet (default)');
  });

  it('has no serious/critical violations with the optional expanders open', async () => {
    const { container, getAllByText } = render(
      <ReportSheet
        open
        coords={[-8.0631, -34.8711]}
        onClose={() => {}}
        onPublish={async () => {}}
      />,
    );
    // Open both <details> so the labelled inputs are in the tree for axe.
    getAllByText(/opcional/i).forEach((summary) => {
      const details = summary.closest('details');
      if (details) details.open = true;
    });
    await expectNoSeriousViolations(container, 'ReportSheet (expanders open)');
  });
});

// ─── INFO surface (pin detail sheet) ─────────────────────────────────────────
describe('a11y · PinDetailSheet (INFO surface) — open state', () => {
  it('has no serious/critical violations for a fresh waiting pin', async () => {
    const { container } = render(
      <PinDetailSheet
        open
        pin={PIN_FRESH}
        userCoords={USER_COORDS}
        onClose={() => {}}
        onClaim={async () => {}}
        onMarkAttended={async () => {}}
      />,
    );
    await expectNoSeriousViolations(container, 'PinDetailSheet (fresh waiting)');
  });

  it('has no serious/critical violations for a claimed pin (someone going)', async () => {
    const { container } = render(
      <PinDetailSheet
        open
        pin={PIN_CLAIMED}
        userCoords={USER_COORDS}
        onClose={() => {}}
        onClaim={async () => {}}
        onMarkAttended={async () => {}}
      />,
    );
    await expectNoSeriousViolations(container, 'PinDetailSheet (someone going)');
  });
});
