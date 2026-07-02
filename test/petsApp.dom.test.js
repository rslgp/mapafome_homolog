// petsApp.dom.test.js, characterization net for the /pets composition (M10a).
//
// WHY THIS EXISTS
//   PetsApp is the /pets god-component: ~20 useState, many useCallback handlers,
//   useMemo derivations, and the map/list/sheet wiring. Before M10 decomposes its
//   state + handlers into a usePetsApp() hook, this harness PINS the current
//   observable behavior so the extraction can be proven behavior-preserving:
//     • the surface arranca no estado LOADING (skeleton), not a blank map;
//     • a successful load flips to the map + filter bar (READY), the report FAB,
//       and (with >=1 pet) the map/list tab toggle;
//     • the report sheet opens on the FAB and closes on onClose;
//     • the detail sheet opens on a pet click and closes on onClose;
//     • the filter panel toggles open/closed via the filter bar;
//     • a deep-link that resolves to a missing pet shows the calm dismissable note;
//     • a load ERROR shows the retry affordance and retrying re-fetches (recovers).
//
//   Test-only. Heavy / side-effectful children (Leaflet map, the shared Header,
//   the three bottom-sheets, the load-state UI) are stubbed with stable markers so
//   the render is deterministic and isolated to PetsApp's own wiring. The network
//   (petsData), analytics (petAnalytics), and the offline queue (petPublishQueue)
//   are mocked, exactly as the InfoPanel harness stubs sugestao/analytics. The PURE
//   state logic (petMapLoadState, petDomain) is left REAL because it is the very
//   behavior this net pins (load-state precedence, filter/deeplink derivations).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';

// ─── Network / analytics / queue: mocked so no real fetch or IndexedDB runs ────
// fetchPets is the one seam the load-state depends on; each test sets its
// resolution/rejection. publishPet is unused by these paths but mocked for safety.
const fetchPets = vi.fn();
const publishPet = vi.fn();
vi.mock('../src/app/pets/petsData', () => ({
  fetchPets: (...a) => fetchPets(...a),
  publishPet: (...a) => publishPet(...a),
}));
vi.mock('../src/app/pets/petAnalytics', () => ({
  trackReportStarted: () => {},
  trackReportPublished: () => {},
  trackReportFailed: () => {},
  trackPetOpened: () => {},
  trackMarkedReunido: () => {},
  trackEncerrouBusca: () => {},
}));
vi.mock('../src/app/pets/petPublishQueue', () => ({
  enqueue: async () => {},
  bindOnlineFlush: () => () => {},
  isOfflineNow: () => false,
  // PetPublishError is thrown by handlePublish; a plain Error subclass suffices.
  PetPublishError: class PetPublishError extends Error {},
}));
vi.mock('../src/app/components/compatibility/components/ux/analytics', () => ({
  trackError: () => {},
}));

// ─── Heavy children: stubbed with stable markers + minimal prop wiring so the
//     open/close and click behaviors PetsApp owns can be driven and asserted. ───
vi.mock('../src/app/components/compatibility/components/header', () => ({
  default: () => <div data-testid="header-stub" />,
}));
// PetMap mounts Leaflet (jsdom cannot). Expose a button that fires onPetClick so
// the detail-sheet-open behavior can be driven through PetsApp's real handler.
vi.mock('../src/app/pets/PetMap', () => ({
  default: ({ onPetClick }) => (
    <div data-testid="petmap-stub">
      <button
        type="button"
        data-testid="petmap-click-pet"
        onClick={() => onPetClick && onPetClick({ status: 'perdido', coords: [1, 2] })}
      >
        pet
      </button>
    </div>
  ),
}));
vi.mock('../src/app/pets/PetListView', () => ({
  default: () => <div data-testid="petlist-stub" />,
}));
// The filter bar reports open/close toggles; expose the toggle so the disclosure
// behavior PetsApp owns (filterOpen) can be driven.
vi.mock('../src/app/pets/PetFilterBar', () => ({
  default: ({ expanded, onToggleOpen }) => (
    <div data-testid="filterbar-stub" data-expanded={String(!!expanded)}>
      <button type="button" data-testid="filterbar-toggle" onClick={onToggleOpen}>
        filters
      </button>
    </div>
  ),
}));
// The report sheet: render only when open; expose a close button that calls
// onClose (no 'published' reason, so no closure micro-state fires).
vi.mock('../src/app/pets/PetReportSheet', () => ({
  default: ({ open, onClose }) => (open ? (
    <div data-testid="reportsheet-stub">
      <button type="button" data-testid="reportsheet-close" onClick={() => onClose && onClose()}>
        close report
      </button>
    </div>
  ) : null),
}));
// The detail sheet: render only when open; expose a close button.
vi.mock('../src/app/pets/PetDetailSheet', () => ({
  default: ({ open, onClose }) => (open ? (
    <div data-testid="detailsheet-stub">
      <button type="button" data-testid="detailsheet-close" onClick={() => onClose && onClose()}>
        close detail
      </button>
    </div>
  ) : null),
}));
// Load-state UI: render the state id + a retry button that fires onRetry, so the
// LOADING skeleton, EMPTY hint, and ERROR retry are all observable by state id.
vi.mock('../src/app/pets/PetMapLoadStates', () => ({
  default: ({ state, onRetry }) => (
    <div data-testid="loadstate-stub" data-state={state}>
      <button type="button" data-testid="loadstate-retry" onClick={onRetry}>
        retry
      </button>
    </div>
  ),
}));
vi.mock('../src/app/pets/PetPublishClosure', () => ({
  default: ({ open }) => (open ? <div data-testid="closure-stub" /> : null),
}));
vi.mock('../src/app/pets/PetFirstRunHint', () => ({
  default: ({ open }) => (open ? <div data-testid="hint-stub" /> : null),
}));

import PetsApp from '../src/app/pets/PetsApp.js';
import { setLocale } from '../src/app/components/compatibility/components/ux/strings.js';

// A minimal pet row that survives the real petDomain filter + age prune (so the
// READY state is reached). coords is the stable identity; `dateIso` (the field
// petAgeDays reads) is set to now so the report stays inside the age window (a
// missing dateIso would count as infinitely old and be archived → EMPTY, not
// READY, which hides the map/list toggle).
const onePet = () => [{
  status: 'perdido',
  species: 'cao',
  coords: [-8.05, -34.9],
  dateIso: new Date().toISOString(),
}];

beforeEach(() => {
  setLocale('pt-BR');
  fetchPets.mockReset();
  publishPet.mockReset();
  // Ensure the first-run hint + stored view do not leak between tests.
  try { window.localStorage.clear(); } catch (_e) { /* jsdom always has it */ }
  // Default: a resolvable load with one pet (READY). Individual tests override.
  fetchPets.mockResolvedValue(onePet());
});
afterEach(() => {
  cleanup();
  setLocale('pt-BR');
  vi.clearAllMocks();
});

describe('PetsApp: load states, view toggle, sheets, filter, deep link', () => {
  it('arranca no estado LOADING (skeleton) antes de os pets chegarem', () => {
    // A never-resolving fetch keeps the surface in the initial loading state.
    fetchPets.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<PetsApp />);
    expect(getByTestId('loadstate-stub').getAttribute('data-state')).toBe('loading');
  });

  it('after a successful load shows the map, the filter bar, and the report FAB', async () => {
    const { getByTestId, container } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('petmap-stub')).toBeTruthy());
    expect(getByTestId('filterbar-stub')).toBeTruthy();
    expect(container.querySelector('.mdf-pets__report-btn')).toBeTruthy();
  });

  it('renders the map|list view toggle in READY (>=1 pet)', async () => {
    const { getByTestId, container } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('petmap-stub')).toBeTruthy());
    const toggle = container.querySelector('.pet-viewtoggle[role="tablist"]');
    expect(toggle).toBeTruthy();
    expect(container.querySelector('#pet-viewtoggle-map')).toBeTruthy();
    expect(container.querySelector('#pet-viewtoggle-list')).toBeTruthy();
  });

  it('toggling to LIST shows the list view and back to MAP shows the map', async () => {
    const { getByTestId, queryByTestId, container } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('petmap-stub')).toBeTruthy());
    fireEvent.click(container.querySelector('#pet-viewtoggle-list'));
    expect(getByTestId('petlist-stub')).toBeTruthy();
    expect(queryByTestId('petmap-stub')).toBeNull();
    fireEvent.click(container.querySelector('#pet-viewtoggle-map'));
    expect(getByTestId('petmap-stub')).toBeTruthy();
  });

  it('the report sheet opens on the FAB and closes on onClose', async () => {
    const { getByTestId, queryByTestId, container } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('petmap-stub')).toBeTruthy());
    expect(queryByTestId('reportsheet-stub')).toBeNull();
    fireEvent.click(container.querySelector('.mdf-pets__report-btn'));
    expect(getByTestId('reportsheet-stub')).toBeTruthy();
    fireEvent.click(getByTestId('reportsheet-close'));
    expect(queryByTestId('reportsheet-stub')).toBeNull();
  });

  it('the detail sheet opens on a pet click and closes on onClose', async () => {
    const { getByTestId, queryByTestId } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('petmap-stub')).toBeTruthy());
    expect(queryByTestId('detailsheet-stub')).toBeNull();
    fireEvent.click(getByTestId('petmap-click-pet'));
    expect(getByTestId('detailsheet-stub')).toBeTruthy();
    fireEvent.click(getByTestId('detailsheet-close'));
    expect(queryByTestId('detailsheet-stub')).toBeNull();
  });

  it('the filter panel toggles open and closed via the filter bar', async () => {
    const { getByTestId } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('filterbar-stub')).toBeTruthy());
    // starts collapsed (filterOpen=false)
    expect(getByTestId('filterbar-stub').getAttribute('data-expanded')).toBe('false');
    fireEvent.click(getByTestId('filterbar-toggle'));
    expect(getByTestId('filterbar-stub').getAttribute('data-expanded')).toBe('true');
    fireEvent.click(getByTestId('filterbar-toggle'));
    expect(getByTestId('filterbar-stub').getAttribute('data-expanded')).toBe('false');
  });

  it('a deep link to a missing pet shows the calm dismissable note', async () => {
    // A param present at mount (?pet=...) whose coords key is NOT in the loaded
    // list flips deepLinkMissing → the calm note. window.location.search is read
    // once by the lazy useState initializer, so set it before render.
    const orig = window.location.search;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, search: '?pet=%5B99%2C99%5D' },
    });
    try {
      const { container } = render(<PetsApp />);
      await waitFor(() => {
        const note = container.querySelector('.mdf-pets__status--calm');
        expect(note).toBeTruthy();
      });
      const dismiss = container.querySelector('.mdf-pets__status-dismiss');
      expect(dismiss).toBeTruthy();
      fireEvent.click(dismiss);
      expect(container.querySelector('.mdf-pets__status--calm')).toBeNull();
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, search: orig },
      });
    }
  });

  it('a load error shows the retry affordance and retrying re-fetches (recovers)', async () => {
    // First load rejects → ERROR state with a retry; the retry succeeds → READY.
    fetchPets.mockRejectedValueOnce(new Error('load_failed'));
    fetchPets.mockResolvedValueOnce(onePet());
    const { getByTestId, queryByTestId } = render(<PetsApp />);
    await waitFor(() => expect(getByTestId('loadstate-stub').getAttribute('data-state')).toBe('error'));
    fireEvent.click(getByTestId('loadstate-retry'));
    await waitFor(() => expect(queryByTestId('petmap-stub')).toBeTruthy());
    expect(fetchPets).toHaveBeenCalledTimes(2);
  });
});
