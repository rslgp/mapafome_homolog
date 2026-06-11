// PetDetailSheet.flag.test.js — PET-M4 (deliverable 2: afordância denunciar).
//
// Prova de RENDER (RTL/jsdom) da denúncia (flag) na sheet de detalhe:
//   • o botão "Denunciar este relato" aparece, é um <button> nativo (operável por
//     teclado) e rotulado;
//   • o fluxo é de DOIS passos calmos: tocar mostra a confirmação; confirmar grava
//     via flagPet (mockado) e mostra um agradecimento, NÃO um alarme;
//   • flagPet é chamado com as coords do pet e uma idempotency_key derivada das
//     coords (re-tap não conta duas vezes);
//   • cancelar volta ao estado ocioso sem chamar flagPet;
//   • a denúncia de um pet não "vaza" para o próximo aberto;
//   • o contrato do modal (título, botão Fechar) permanece intacto.
//
// flagPet é MOCKADO: este teste prova a UI/contrato, não o writer (esse é coberto
// por petFlagWriter.test.js com o sheetsClient mockado). Mantém o teste de
// componente focado no comportamento de tela.

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const { mockFlagPet } = vi.hoisted(() => ({ mockFlagPet: vi.fn() }));

vi.mock('./petsData', () => ({
  flagPet: mockFlagPet,
}));

import PetDetailSheet from './PetDetailSheet';

const BASE_PET = {
  coords: [-8.0671132, -34.8766719],
  status: 'perdido',
  species: 'cao',
  size: 'medio',
  color: 'caramelo',
  name: 'Rex',
  contact: '',
  detail: 'coleira azul',
  photos: '',
  dateIso: '2026-06-11T12:00:00.000Z',
};

const OTHER_PET = {
  ...BASE_PET,
  coords: [-9.0, -35.0],
  name: 'Mia',
  status: 'avistado',
  dateIso: '2026-06-10T08:00:00.000Z',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockFlagPet.mockResolvedValue({ row: {}, flagCount: 1 });
});

describe('PetDetailSheet — denunciar (flag) afordância', () => {
  it('mostra o botão de denúncia, rotulado e operável por teclado', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    const btn = screen.getByRole('button', { name: /denunciar este relato/i });
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON'); // <button> nativo → teclado de graça
  });

  it('fluxo de dois passos: tap → confirmar → grava via flagPet → agradecimento calmo', async () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);

    // Passo 1: abre a confirmação (ainda não gravou nada).
    fireEvent.click(screen.getByRole('button', { name: /denunciar este relato/i }));
    expect(mockFlagPet).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: /confirmar denúncia/i })).toBeTruthy();

    // Passo 2: confirma → chama flagPet com as coords do pet + chave derivada.
    fireEvent.click(screen.getByRole('button', { name: /sim, sinalizar/i }));
    expect(mockFlagPet).toHaveBeenCalledTimes(1);
    const arg = mockFlagPet.mock.calls[0][0];
    expect(arg.coords).toEqual(BASE_PET.coords);
    expect(arg.idempotency_key).toContain('flag:');

    // Estado final: agradecimento calmo (role=status), sem alarme; controle some.
    await waitFor(() => {
      expect(screen.getByText(/recebemos sua sinaliza/i)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /denunciar este relato/i })).toBeNull();
    // Nada punitivo na cópia de sucesso.
    expect(document.body.textContent).not.toMatch(/BLOQUEAD|PROIBID|ERRO!/i);
  });

  it('cancelar volta ao ocioso sem gravar', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /denunciar este relato/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockFlagPet).not.toHaveBeenCalled();
    // Voltou ao botão inicial.
    expect(screen.getByRole('button', { name: /denunciar este relato/i })).toBeTruthy();
  });

  it('o contrato do modal permanece intacto (título + botão Fechar presentes)', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /rex/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeTruthy();
  });

  it('a denúncia NÃO vaza entre pets: reabrir com outro pet zera o fluxo', () => {
    const { rerender } = render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    // Avança para o passo de confirmação no primeiro pet.
    fireEvent.click(screen.getByRole('button', { name: /denunciar este relato/i }));
    expect(screen.getByRole('group', { name: /confirmar denúncia/i })).toBeTruthy();

    // Reabre com OUTRO pet — o fluxo de denúncia volta ao ocioso (sem confirmação presa).
    rerender(<PetDetailSheet open pet={OTHER_PET} onClose={() => {}} />);
    expect(screen.queryByRole('group', { name: /confirmar denúncia/i })).toBeNull();
    expect(screen.getByRole('button', { name: /denunciar este relato/i })).toBeTruthy();
  });
});
