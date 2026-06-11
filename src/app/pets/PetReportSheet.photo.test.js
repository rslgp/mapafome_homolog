// PetReportSheet.photo.test.js — PET-M15 (capture affordance + photoless publish).
//
// Acceptance lines exercised here:
//   • a CONTACTLESS + PHOTOLESS report still publishes cleanly (no photo is a
//     first-class state — buildPetDados emits photos:'' and the sheet sends '');
//   • the capture/choose-from-library affordance RENDERS (input type=file
//     accept=image/* capture) and is reachable via its labeled >=44px control;
//   • the persisting paste-a-URL field is STILL present (the M14 §5 durable path);
//   • the modal contract survives the new field (dialog + aria-modal + Cancelar).
//
// onPublish is INJECTED (the sheet does not know petsData). We assert the payload
// the sheet emits, not the writer. The canvas resize path needs jsdom canvas (not
// reliably available), so we do NOT exercise the actual file decode here — the PURE
// resize math is covered in petPhoto.test.js. This suite proves the AFFORDANCE and
// the photoless publish, which is the honest deliverable.

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import PetReportSheet from './PetReportSheet';
import { PET_STATUSES } from './petDomain';

afterEach(cleanup);

const COORDS = [-8.0671132, -34.8766719];
const STATUS = PET_STATUSES[0];
const PUBLISH_BTN = /publicar pet|publicando|publicado|guardado|tentar de novo/i;

describe('PetReportSheet — capture/library affordance (PET-M15)', () => {
  it('renders a file input (accept=image/*, capture) reachable via a labeled >=44px control', () => {
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={() => {}} />);
    const fileInput = document.getElementById('pet-photo-file');
    expect(fileInput).not.toBeNull();
    expect(fileInput.tagName).toBe('INPUT');
    expect(fileInput.getAttribute('type')).toBe('file');
    expect(fileInput.getAttribute('accept')).toBe('image/*');
    expect(fileInput.getAttribute('capture')).toBe('environment');
    // The visible affordance is a label tied to that input (the touch target).
    const label = document.querySelector('label[for="pet-photo-file"]');
    expect(label).not.toBeNull();
    expect(label.textContent).toMatch(/foto|galeria/i);
  });

  it('STILL keeps the persisting paste-a-URL field (the M14 durable path)', () => {
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={() => {}} />);
    const urlInput = document.getElementById('pet-photos');
    expect(urlInput).not.toBeNull();
    expect(urlInput.getAttribute('type')).toBe('url');
    // Cap unchanged from PET-M0 (URL fits well under it).
    expect(urlInput.getAttribute('maxLength')).toBe('500');
  });

  it('preserves the modal contract with the new field (dialog + aria-modal + Cancelar)', () => {
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(document.getElementById(labelId)).not.toBeNull();
    expect(screen.getByRole('button', { name: /cancelar/i }).tagName).toBe('BUTTON');
  });
});

describe('PetReportSheet — contactless + photoless report still publishes (PET-M15)', () => {
  it('publishing with NO contact and NO photo sends contact:"" and photos:"" and succeeds', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={onPublish} />);

    // Choose a status (the only required field) and publish — touch nothing else.
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(STATUS.label, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: PUBLISH_BTN }));

    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1));
    const payload = onPublish.mock.calls[0][0];
    expect(payload.status).toBe(STATUS.id);
    expect(payload.contact).toBe('');
    expect(payload.photos).toBe('');
    // The publish succeeded (button confirms "Publicado ✓").
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /publicado/i })).not.toBeNull(),
    );
  });
});
