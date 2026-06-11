// PetDetailSheet.photo.test.js — PET-M15 (the photo DISPLAY on the detail sheet).
//
// Acceptance lines exercised here:
//   • a photoLESS pet renders a tasteful PLACEHOLDER, never a broken <img>;
//   • a DIRECT-image URL renders a real <img> with accessible alt + a loading
//     skeleton; onError degrades back to the placeholder (never a broken image);
//   • an ALBUM/folder URL keeps the "Ver as fotos do pet" link (no <img>);
//   • the <img> src is the photos string AFTER it has passed sanitizePhotosUrl —
//     a dangerous scheme never becomes an <img src>.
//
// Plain-DOM assertions (no jest-dom registered — mirrors the modal-contract suite).
// petsData is mocked so the sheet does not touch sheet I/O on mount. parsePetRow is
// the real barricade: we feed it a row and assert the parsed photos drives the UI.

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('./petsData', () => ({ flagPet: vi.fn(), resolvePet: vi.fn() }));

import PetDetailSheet from './PetDetailSheet';
import { parsePetRow, buildPetDados, PET_STATUSES, PET_SPECIES } from './petDomain';

afterEach(cleanup);

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

// Build a real parsed pet via the SAME path the app uses (buildPetDados →
// parsePetRow), so `photos` is exactly what sanitizePhotosUrl produced.
function petWith(photos, extra = {}) {
  const dados = buildPetDados({
    coords: COORDS,
    status: PET_STATUSES[0].id,      // 'perdido' — from the SOT
    species: PET_SPECIES[0].id,      // 'cao'
    name: extra.name || '',
    photos,
    dateIso: ISO,
  });
  return parsePetRow({ Dados: JSON.stringify(dados) });
}

describe('PetDetailSheet — photo display (PET-M15)', () => {
  it('photoLESS pet shows a tasteful placeholder, NEVER a broken <img>', () => {
    const { container } = render(
      <PetDetailSheet open pet={petWith('')} onClose={() => {}} />,
    );
    // No <img> at all on a photoless report.
    expect(container.querySelector('img')).toBeNull();
    // A labeled placeholder exists (role=img + aria-label, calm text).
    const placeholder = screen.getByRole('img', { name: /sem foto/i });
    expect(placeholder).not.toBeNull();
  });

  it('DIRECT-image URL renders a real <img> with accessible alt + a loading skeleton', () => {
    const url = 'https://host.example/rex.jpg';
    render(<PetDetailSheet open pet={petWith(url, { name: 'Rex' })} onClose={() => {}} />);
    const img = document.querySelector('img.pet-detail__photo-img');
    expect(img).not.toBeNull();
    // alt is descriptive (species + name), not empty.
    expect(img.getAttribute('alt')).toMatch(/foto do pet/i);
    expect(img.getAttribute('alt')).toMatch(/rex/i);
    // The skeleton (loading state) is present before onLoad fires.
    expect(screen.getByTestId('pet-photo-skeleton')).not.toBeNull();
  });

  it('the <img> src passes through sanitizePhotosUrl — a dangerous scheme never becomes an <img src>', () => {
    // A javascript: URL is barricaded to '' by sanitizePhotosUrl in the parse path,
    // so the sheet has NO photos → placeholder, NOT an <img> with a dangerous src.
    const { container } = render(
      <PetDetailSheet open pet={petWith('javascript:alert(1)')} onClose={() => {}} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: /sem foto/i })).not.toBeNull();
  });

  it('a VALID direct-image src is exactly the sanitized https string (no rewrite)', () => {
    const url = 'https://host.example/a.png';
    render(<PetDetailSheet open pet={petWith(url)} onClose={() => {}} />);
    const img = document.querySelector('img.pet-detail__photo-img');
    expect(img.getAttribute('src')).toBe(url);
  });

  it('onError on a direct image degrades to the placeholder (never a broken <img>)', () => {
    render(<PetDetailSheet open pet={petWith('https://host.example/dead.jpg')} onClose={() => {}} />);
    const img = document.querySelector('img.pet-detail__photo-img');
    expect(img).not.toBeNull();
    // Simulate the URL being dead / taken down.
    fireEvent.error(img);
    // The <img> is gone; the calm placeholder takes over.
    expect(document.querySelector('img.pet-detail__photo-img')).toBeNull();
    expect(screen.getByRole('img', { name: /sem foto/i })).not.toBeNull();
  });

  it('ALBUM/folder URL keeps the "Ver as fotos do pet" link (no <img>)', () => {
    render(
      <PetDetailSheet
        open
        pet={petWith('https://drive.google.com/drive/folders/abc')}
        onClose={() => {}}
      />,
    );
    // No <img> — an <img> on a folder URL would be broken.
    expect(document.querySelector('img.pet-detail__photo-img')).toBeNull();
    // The album link is present and points at the folder.
    const link = screen.getByRole('link', { name: /ver as fotos do pet/i });
    expect(link.getAttribute('href')).toBe('https://drive.google.com/drive/folders/abc');
  });
});
