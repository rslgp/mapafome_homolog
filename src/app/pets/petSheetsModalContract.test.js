// petSheetsModalContract.test.js — PET-M5 (render smoke + modal contract).
//
// As suites de reveal/flag já exercitam o COMPORTAMENTO do PetDetailSheet
// (reveal-on-tap, denúncia). O que faltava — e o PET-M5 pede — é um RENDER SMOKE
// das DUAS sheets provando o contrato de modal presente:
//   • role="dialog" + aria-modal="true" + um título associado (aria-labelledby);
//   • o controle de fechar/cancelar RENDERIZA e é um <button> nativo (operável
//     por teclado);
//   • a sheet não renderiza nada quando open=false (hidden-by-default).
//
// É um smoke deliberadamente raso: prova que a sheet MONTA e expõe o contrato,
// não re-testa os fluxos já cobertos. petsData é mockado para o PetDetailSheet
// não tocar o I/O de planilha ao montar. Status/espécie vêm da SOT (petDomain).

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// PetDetailSheet importa flagPet + resolvePet de petsData; mockamos os dois para
// o render ficar puro (sem tocar o I/O de planilha).
vi.mock('./petsData', () => ({ flagPet: vi.fn(), resolvePet: vi.fn() }));

import PetReportSheet from './PetReportSheet';
import PetDetailSheet from './PetDetailSheet';
import { PET_STATUSES, PET_SPECIES } from './petDomain';

afterEach(cleanup);

const COORDS = [-8.0671132, -34.8766719];

const BASE_PET = {
  coords: COORDS,
  status: PET_STATUSES[0].id,     // 'perdido' — lido da SOT, não hardcoded
  species: PET_SPECIES[0].id,
  size: 'medio',
  color: 'caramelo',
  name: 'Rex',
  contact: '',                    // contactless: sem botão de reveal no smoke
  detail: 'visto perto da praça',
  photos: '',
  dateIso: '2026-06-11T12:00:00.000Z',
};

// Asserções de DOM puras (jest-dom NÃO está registrado no setup — espelha o
// estilo das suites de reveal/flag: .tagName / .getAttribute / toBeNull).
describe('PetReportSheet — render smoke + contrato de modal', () => {
  it('não renderiza nada com open=false (hidden-by-default)', () => {
    const { container } = render(
      <PetReportSheet open={false} coords={COORDS} onClose={() => {}} onPublish={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('aberta: é um dialog modal rotulado com um <button> Cancelar operável por teclado', () => {
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // Título associado existe (aria-labelledby aponta para um nó com texto).
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId)).not.toBeNull();
    // O controle de cancelar/fechar é um <button> nativo (teclado-operável).
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    expect(cancel.tagName).toBe('BUTTON');
  });

  it('aberta: expõe a escolha de situação como radiogroup a partir da SOT', () => {
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={() => {}} />);
    // Sanity de que os status vêm do petDomain (um radio por status da SOT).
    const radios = screen.getAllByRole('radio', { checked: false });
    expect(radios.length).toBeGreaterThanOrEqual(PET_STATUSES.length);
  });
});

describe('PetDetailSheet — render smoke + contrato de modal', () => {
  it('não renderiza nada com open=false (hidden-by-default)', () => {
    const { container } = render(
      <PetDetailSheet open={false} pet={BASE_PET} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('não renderiza nada sem pet, mesmo com open=true (guarda defensiva)', () => {
    const { container } = render(
      <PetDetailSheet open pet={null} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('aberta: é um dialog modal rotulado com um <button> Fechar operável por teclado', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId)).not.toBeNull();
    const close = screen.getByRole('button', { name: /fechar/i });
    expect(close.tagName).toBe('BUTTON');
  });

  it('aberta: mostra o status (da SOT) e a descline montada a partir dos campos', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    // O label do status vem do PET_STATUS_MAP (SOT); a descline junta espécie/porte/cor.
    expect(screen.getByText(PET_STATUSES[0].label)).not.toBeNull();
    expect(screen.getByText(/caramelo/i)).not.toBeNull();
  });
});
