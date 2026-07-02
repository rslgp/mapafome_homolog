// petDetailSheet.dom.test.js, characterization net for the /pets detail sheet (M10b).
//
// WHY THIS EXISTS
//   PetDetailSheet is the /pets read-only detail god-component (~630-LOC single
//   render function: five reset-on-pet-change useState machines, three focus
//   effects, three memos, three handlers, all inline in one function). Before M10b
//   extracts that logic into a usePetDetailSheet() hook, this harness PINS the
//   current observable behavior so the extraction can be proven behavior-preserving:
//     • closed / no-pet renders nothing (the early return guard);
//     • an open sheet renders its key sections: the dialog, the status badge, the
//       name/title, the description line, and the close + share actions;
//     • the reveal-on-tap contact gate: the raw contact is NOT a link until the
//       reveal tap, and after the tap the resolved contact link appears;
//     • the lifecycle (resolve) two-step: idle actions to a confirm step to a DONE
//       state, and onResolved fires with the optimistic resolved pet;
//     • the flag (denuncia) two-step confirm to a done state;
//     • the possible-match hint renders and its open/dismiss actions work;
//     • the Escape key path and the backdrop + close button both call onClose.
//
//   Test-only. The component is NOT modified by this file. Heavy / side-effectful
//   seams are stubbed exactly as the petsApp harness mocks the network / gesture
//   actuator: petsData (flagPet/resolvePet touch the sheet writer over the network)
//   and petShare (sharePet touches navigator.share / window.open). The PURE domain
//   (petDomain, strings, mapUtils, contactLink, petPhoto) is left REAL because it is
//   the very behavior this net pins (the describePet line, the status/species meta,
//   the reveal contact resolution, the deep-link keying).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';

// The write seam: flagPet / resolvePet persist over the network (sheetsClient).
// Mocked so no real fetch runs; resolvePet resolves so the lifecycle reaches DONE.
const flagPet = vi.fn();
const resolvePet = vi.fn();
vi.mock('../src/app/pets/petsData', () => ({
  flagPet: (...a) => flagPet(...a),
  resolvePet: (...a) => resolvePet(...a),
}));
// The gesture actuator: sharePet touches navigator.share / window.open, and
// buildPetShareMessage is pure but pulled in through the same module. Mocked so the
// share button is inert here (its own contract is covered in petShare's own tests).
const sharePet = vi.fn();
const buildPetShareMessage = vi.fn(() => ({ text: 'x', url: 'y', title: 'z' }));
vi.mock('../src/app/pets/petShare', () => ({
  sharePet: (...a) => sharePet(...a),
  buildPetShareMessage: (...a) => buildPetShareMessage(...a),
}));

import PetDetailSheet from '../src/app/pets/PetDetailSheet.js';
import { setLocale, t } from '../src/app/components/compatibility/components/ux/strings.js';
import { PET_CLOSURE_REASON } from '../src/app/pets/petDomain.js';

// A representative pet: a lost dog with a raw contact, coords (so directions + a
// stable deep-link key exist), a name, and a recent report time. No `photos` so the
// no-photo placeholder path renders (the direct-image / album paths are their own
// behavior, out of scope for the load-bearing section assertions).
const basePet = () => ({
  status: 'perdido',
  species: 'cao',
  coords: [-8.05, -34.9],
  name: 'Rex',
  detail: 'sumiu perto da praca',
  contact: '81999998888',
  dateIso: new Date().toISOString(),
});

// A candidate for the possible-match hint: its own coords key must resolve so the
// open link is offered (matchHint degrades to null without a stable key).
const oneMatch = () => [{ pet: { status: 'encontrado', species: 'cao', coords: [-8.06, -34.91] } }];

beforeEach(() => {
  setLocale('pt-BR');
  flagPet.mockReset();
  resolvePet.mockReset();
  sharePet.mockReset();
  flagPet.mockResolvedValue(undefined);
  resolvePet.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  setLocale('pt-BR');
  vi.clearAllMocks();
});

describe('PetDetailSheet: render guard, sections, reveal, lifecycle, flag, match, close', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<PetDetailSheet open={false} pet={basePet()} />);
    expect(container.querySelector('.mdf-pin-sheet')).toBeNull();
  });

  it('renders nothing when open but with no pet', () => {
    const { container } = render(<PetDetailSheet open pet={null} />);
    expect(container.querySelector('.mdf-pin-sheet')).toBeNull();
  });

  it('renders the dialog, status badge, name, description line, and actions when open', () => {
    const { container, getByText } = render(<PetDetailSheet open pet={basePet()} />);
    const dialog = container.querySelector('.mdf-pin-sheet[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // Status badge + status label (real petDomain + strings).
    expect(container.querySelector('.pet-detail__status')).toBeTruthy();
    // Name renders as the title.
    expect(container.querySelector('#pet-detail-title').textContent).toBe('Rex');
    // The description line (real describePet) renders.
    expect(container.querySelector('.pet-detail__descline')).toBeTruthy();
    // Close + share actions render.
    expect(getByText(t('pets.detail.close'))).toBeTruthy();
    expect(container.querySelector('.pet-detail__share-btn')).toBeTruthy();
  });

  it('gates the contact behind reveal-on-tap: no contact link until the tap, then it appears', () => {
    const { container, getByText } = render(<PetDetailSheet open pet={basePet()} />);
    // Before the tap: the reveal gate button is present, no resolved contact link.
    expect(container.querySelector('.pet-detail__reveal-btn')).toBeTruthy();
    expect(container.querySelector('.mdf-pin-sheet__contact')).toBeNull();
    // Tap reveal.
    fireEvent.click(getByText(t('pets.detail.reveal')));
    // After the tap: the gate is gone and the resolved contact link (or stub) shows.
    expect(container.querySelector('.pet-detail__reveal-btn')).toBeNull();
    const contact = container.querySelector('.mdf-pin-sheet__contact, .mdf-pin-sheet__stub');
    expect(contact).toBeTruthy();
  });

  it('runs the lifecycle two-step (idle to confirm to DONE) and fires onResolved', async () => {
    const onResolved = vi.fn();
    const { container, getByText } = render(
      <PetDetailSheet open pet={basePet()} onResolved={onResolved} />,
    );
    // Idle: the two lifecycle actions are present.
    const reunido = getByText(t('pets.detail.lifecycle.reunido'));
    expect(reunido).toBeTruthy();
    // Step 1: tap "Marcar como reunido" reveals the confirm step.
    fireEvent.click(reunido);
    expect(container.querySelector('.pet-detail__lifecycle-confirm')).toBeTruthy();
    // Step 2: confirm persists (resolvePet) and transitions to the DONE state.
    fireEvent.click(getByText(t('pets.detail.lifecycle.confirmReunido.yes')));
    await waitFor(() => {
      expect(container.querySelector('.pet-detail__lifecycle-note--done')).toBeTruthy();
    });
    expect(resolvePet).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledTimes(1);
    // onResolved carries the optimistic resolved pet with the closure reason.
    expect(onResolved.mock.calls[0][0]).toMatchObject({
      resolved: true,
      closureReason: PET_CLOSURE_REASON.REUNIDO,
    });
  });

  it('runs the flag two-step (idle to confirm to DONE) and persists via flagPet', async () => {
    const { container, getByText } = render(<PetDetailSheet open pet={basePet()} />);
    // Step 1: the calm flag affordance opens the confirm step.
    fireEvent.click(getByText(t('pets.detail.flag.btn')));
    expect(container.querySelector('.pet-detail__flag-confirm')).toBeTruthy();
    // Step 2: confirm persists (flagPet) and reaches the done note.
    fireEvent.click(getByText(t('pets.detail.flag.yes')));
    await waitFor(() => {
      expect(container.querySelector('.pet-detail__flag-note--done')).toBeTruthy();
    });
    expect(flagPet).toHaveBeenCalledTimes(1);
  });

  it('renders the possible-match hint and its open + dismiss actions work', () => {
    const onOpenMatch = vi.fn();
    const { container, getByText } = render(
      <PetDetailSheet open pet={basePet()} matches={oneMatch()} onOpenMatch={onOpenMatch} />,
    );
    expect(container.querySelector('.pet-detail__match')).toBeTruthy();
    // The open action forwards the candidate pet to onOpenMatch.
    fireEvent.click(getByText(t('pets.detail.match.open')));
    expect(onOpenMatch).toHaveBeenCalledTimes(1);
    // The dismiss action removes the hint (dispensable, opt-in).
    fireEvent.click(getByText(t('pets.detail.match.dismiss')));
    expect(container.querySelector('.pet-detail__match')).toBeNull();
  });

  it('calls onClose from the close button, the backdrop, and the Escape key', () => {
    const onClose = vi.fn();
    const { container, getByText } = render(
      <PetDetailSheet open pet={basePet()} onClose={onClose} />,
    );
    // Close button.
    fireEvent.click(getByText(t('pets.detail.close')));
    // Backdrop.
    fireEvent.click(container.querySelector('.mdf-pin-sheet__backdrop'));
    // Escape key (the window keydown listener the open effect binds).
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
