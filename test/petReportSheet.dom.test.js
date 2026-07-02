// petReportSheet.dom.test.js, characterization net for the /pets report sheet (M10c).
//
// WHY THIS EXISTS
//   PetReportSheet is the /pets reporter bottom-sheet god-component (~673-LOC
//   single render function: fourteen useState machines, a per-open reset effect
//   that also owns focus + Escape + drag lifecycle, a preview-revoke unmount
//   effect, the pointer drag-resize handlers, the photo-choose handler, and the
//   publish path). Before M10c relocates that logic into a usePetReportSheet()
//   hook, this harness PINS the current observable behavior so the extraction can
//   be proven behavior-preserving:
//     • closed renders nothing (the `if (!open) return null` guard);
//     • an open sheet renders its key sections: the dialog, the status /
//       species / size / color radiogroups, the album photo field, and the
//       cancel + publish actions;
//     • field entry: typing into the photos-url input and the name/detail inputs
//       reflects the value back (controlled inputs);
//     • validation: pressing publish with NO status shows the inline status
//       error and does NOT call onPublish;
//     • the publish path: choosing a status then publishing calls onPublish with
//       the collected payload, and the button reaches the success label;
//     • the close paths: the cancel button, the backdrop, and the Escape key all
//       call onClose.
//
//   Test-only. The component is NOT modified by this file. Heavy / side-effectful
//   seams are stubbed exactly as the petDetailSheet / infoPanel harnesses stub
//   their network / gesture / analytics children: petPhoto (resizeImageFile
//   drives an Image decode + canvas toBlob that jsdom cannot run) and
//   idempotencyKey (crypto.randomUUID) are mocked so the render is deterministic
//   and no browser-only API is touched. The PURE domain (petDomain, strings) is
//   left REAL because it is the very behavior this net pins (the status /
//   species chip ids, the failure copy resolution, the i18n labels).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';

// The photo seam: resizeImageFile drives an Image decode + canvas toBlob that
// jsdom cannot run, and maxPhotoMb feeds a helper copy. Mocked so the album
// field renders inertly (the resize contract is covered in petPhoto's own tests).
const resizeImageFile = vi.fn();
vi.mock('../src/app/pets/petPhoto', () => ({
  resizeImageFile: (...a) => resizeImageFile(...a),
  maxPhotoMb: () => 1.5,
}));
// The idempotency key seam: newIdempotencyKey calls crypto.randomUUID. Mocked to
// a stable value so the published payload is deterministic (its own generation
// contract is covered in idempotencyKey's own tests).
vi.mock('../src/app/components/compatibility/components/ux/idempotencyKey', () => ({
  newIdempotencyKey: () => 'test-idem-key',
}));

import PetReportSheet from '../src/app/pets/PetReportSheet.js';
import { setLocale, t } from '../src/app/components/compatibility/components/ux/strings.js';

// Representative coords so the "location set" copy renders (null coords take the
// "location none" branch, out of scope for the section assertions).
const coords = [-8.05, -34.9];

beforeEach(() => {
  setLocale('pt-BR');
  resizeImageFile.mockReset();
  resizeImageFile.mockResolvedValue({ previewUrl: 'blob:x', width: 10, height: 10 });
});
afterEach(() => {
  cleanup();
  setLocale('pt-BR');
  vi.clearAllMocks();
});

describe('PetReportSheet: render guard, sections, field entry, validation, publish, close', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<PetReportSheet open={false} coords={coords} />);
    expect(container.querySelector('.mdf-sheet')).toBeNull();
  });

  it('renders the dialog, the four radiogroups, the album field, and the actions when open', () => {
    const { container, getByText } = render(<PetReportSheet open coords={coords} />);
    const dialog = container.querySelector('.mdf-sheet[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // The status group is required + single-select; its three status chips render.
    expect(container.querySelectorAll('.pet-chip').length).toBe(3);
    // Four radiogroups render (status, species, size, color).
    expect(container.querySelectorAll('[role="radiogroup"]').length).toBe(4);
    // The always-visible album (photo) field renders.
    expect(container.querySelector('.pet-album-field')).toBeTruthy();
    expect(container.querySelector('#pet-photos')).toBeTruthy();
    // Cancel + publish actions render.
    expect(getByText(t('pets.report.cancel'))).toBeTruthy();
    expect(container.querySelector('.mdf-sheet__publish')).toBeTruthy();
  });

  it('reflects typed values back into the controlled photos-url and detail inputs', () => {
    const { container, getByText } = render(<PetReportSheet open coords={coords} />);
    // The photos url input is always visible.
    const photos = container.querySelector('#pet-photos');
    fireEvent.change(photos, { target: { value: 'https://example.com/rex.jpg' } });
    expect(photos.value).toBe('https://example.com/rex.jpg');
    // The detail input lives inside the "more details" expander; open it first.
    fireEvent.click(getByText(t('pets.report.more.summary')));
    const detail = container.querySelector('#pet-detail');
    expect(detail).toBeTruthy();
    fireEvent.change(detail, { target: { value: 'coleira azul' } });
    expect(detail.value).toBe('coleira azul');
  });

  it('blocks publish with no status: shows the inline status error and does not call onPublish', () => {
    const onPublish = vi.fn();
    const { container } = render(<PetReportSheet open coords={coords} onPublish={onPublish} />);
    // No status chosen yet: no inline error, publish not yet attempted.
    expect(container.querySelector('.mdf-sheet__inline-error')).toBeNull();
    fireEvent.click(container.querySelector('.mdf-sheet__publish'));
    // The required-status validation fires: inline error appears, onPublish is not called.
    expect(container.querySelector('.mdf-sheet__inline-error[role="alert"]')).toBeTruthy();
    expect(onPublish).not.toHaveBeenCalled();
  });

  it('publishes with the collected payload once a status is chosen and reaches the success label', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const { container, getByText } = render(
      <PetReportSheet open coords={coords} onPublish={onPublish} />,
    );
    // Choose a status (the required field) via its real chip label.
    fireEvent.click(getByText(t('pets.status.perdido.label')));
    // Publish.
    fireEvent.click(container.querySelector('.mdf-sheet__publish'));
    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledTimes(1);
    });
    // The payload carries the chosen status, the defaulted species, the coords,
    // and the (mocked) idempotency key.
    expect(onPublish.mock.calls[0][0]).toMatchObject({
      status: 'perdido',
      species: 'outro',
      coords,
      idempotency_key: 'test-idem-key',
    });
    // The button reaches the success label after a resolved publish.
    await waitFor(() => {
      expect(getByText(t('pets.report.btn.success'))).toBeTruthy();
    });
  });

  it('calls onClose from the cancel button, the backdrop, and the Escape key', () => {
    const onClose = vi.fn();
    const { container } = render(
      <PetReportSheet open coords={coords} onClose={onClose} />,
    );
    // Cancel button.
    fireEvent.click(container.querySelector('.mdf-sheet__cancel'));
    // Backdrop.
    fireEvent.click(container.querySelector('.mdf-sheet__backdrop'));
    // Escape key (the window keydown listener the open effect binds).
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
