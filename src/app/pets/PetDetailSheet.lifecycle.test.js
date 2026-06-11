// PetDetailSheet.lifecycle.test.js — PET-M7b (ações de fechamento: reunido /
// encerrar busca).
//
// Prova de RENDER (RTL/jsdom) das PRIMEIRAS ações de escrita da sheet:
//   • os DOIS botões ("Marcar como reunido" / "Encerrar busca") aparecem, são
//     <button> nativos (operáveis por teclado) e rotulados;
//   • cada fluxo é de DOIS passos calmos (<=2 taps): tocar mostra a confirmação;
//     confirmar grava via resolvePet (mockado) com o MOTIVO certo (reunido vs
//     encerrado) + idempotency_key derivada das coords;
//   • o estado de sucesso é MORNO, não um spike — role=status, sem confete, sem
//     cópia punitiva/celebratória; o controle de ação some;
//   • o sucesso AVISA onResolved com o pet resolvido (PetsApp atualiza o estado);
//   • "Voltar" cancela sem gravar;
//   • o fechamento de um pet NÃO vaza para o próximo aberto;
//   • o foco é capturado no open e RESTAURADO ao trigger no close;
//   • o contrato do modal (título, Fechar) permanece intacto.
//
// resolvePet é MOCKADO: este teste prova a UI/contrato, não o writer (coberto por
// petResolveWriter.test.js com o sheetsClient mockado). flagPet também é mockado
// porque a sheet o importa do mesmo módulo.

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const { mockResolvePet, mockFlagPet } = vi.hoisted(() => ({
  mockResolvePet: vi.fn(),
  mockFlagPet: vi.fn(),
}));

vi.mock('./petsData', () => ({
  resolvePet: mockResolvePet,
  flagPet: mockFlagPet,
}));

import PetDetailSheet from './PetDetailSheet';
import { PET_CLOSURE_REASON } from './petDomain';

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
  resolved: false,
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
  mockResolvePet.mockResolvedValue({});
});

describe('PetDetailSheet — fechamento (reunido / encerrar busca)', () => {
  it('mostra os dois botões de ação, rotulados e operáveis por teclado', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    const reunido = screen.getByRole('button', { name: /marcar como reunido/i });
    const encerrar = screen.getByRole('button', { name: /encerrar busca/i });
    expect(reunido.tagName).toBe('BUTTON');
    expect(encerrar.tagName).toBe('BUTTON');
  });

  it('reunido em <=2 taps: tap → confirmar → resolvePet com motivo reunido + estado morno', async () => {
    const onResolved = vi.fn();
    render(<PetDetailSheet open pet={BASE_PET} onResolved={onResolved} onClose={() => {}} />);

    // Tap 1: abre a confirmação (nada gravado ainda).
    fireEvent.click(screen.getByRole('button', { name: /marcar como reunido/i }));
    expect(mockResolvePet).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: /confirmar reencontro/i })).toBeTruthy();

    // Tap 2: confirma → grava com o motivo CERTO + chave derivada das coords.
    fireEvent.click(screen.getByRole('button', { name: /sim, foi reunido/i }));
    expect(mockResolvePet).toHaveBeenCalledTimes(1);
    const arg = mockResolvePet.mock.calls[0][0];
    expect(arg.coords).toEqual(BASE_PET.coords);
    expect(arg.closureReason).toBe(PET_CLOSURE_REASON.REUNIDO);
    expect(arg.idempotency_key).toContain('resolve:reunido:');

    // Sucesso MORNO (role=status), sem spike; onResolved avisado com o pet resolvido.
    await waitFor(() => {
      expect(screen.getByText(/bom reencontro/i)).toBeTruthy();
    });
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved.mock.calls[0][0].resolved).toBe(true);
    expect(onResolved.mock.calls[0][0].closureReason).toBe(PET_CLOSURE_REASON.REUNIDO);
    // Não há pico celebratório nem cópia de payout.
    expect(document.body.textContent).not.toMatch(/parabéns|🎉|\+1|herói/i);
  });

  it('encerrar busca em <=2 taps: grava com motivo encerrado + fechamento DIGNO (sem culpa)', async () => {
    const onResolved = vi.fn();
    render(<PetDetailSheet open pet={BASE_PET} onResolved={onResolved} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /encerrar busca/i }));
    expect(screen.getByRole('group', { name: /confirmar encerramento/i })).toBeTruthy();
    // Sem confirm-shaming: nenhuma cópia coercitiva de "desistir".
    expect(document.body.textContent).not.toMatch(/desistir|tem certeza que quer/i);

    fireEvent.click(screen.getByRole('button', { name: /encerrar a busca/i }));
    expect(mockResolvePet).toHaveBeenCalledTimes(1);
    expect(mockResolvePet.mock.calls[0][0].closureReason).toBe(PET_CLOSURE_REASON.ENCERRADO);

    await waitFor(() => {
      expect(screen.getByText(/busca encerrada/i)).toBeTruthy();
    });
    expect(onResolved.mock.calls[0][0].closureReason).toBe(PET_CLOSURE_REASON.ENCERRADO);
  });

  it('"Voltar" cancela a confirmação sem gravar', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /marcar como reunido/i }));
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockResolvePet).not.toHaveBeenCalled();
    // Voltou aos botões de ação iniciais.
    expect(screen.getByRole('button', { name: /marcar como reunido/i })).toBeTruthy();
  });

  it('o fechamento NÃO vaza entre pets: reabrir com outro pet zera o fluxo', () => {
    const { rerender } = render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /marcar como reunido/i }));
    expect(screen.getByRole('group', { name: /confirmar reencontro/i })).toBeTruthy();

    rerender(<PetDetailSheet open pet={OTHER_PET} onClose={() => {}} />);
    expect(screen.queryByRole('group', { name: /confirmar reencontro/i })).toBeNull();
    expect(screen.getByRole('button', { name: /marcar como reunido/i })).toBeTruthy();
  });

  it('um pet JÁ resolvido não mostra as ações de fechamento', () => {
    render(<PetDetailSheet open pet={{ ...BASE_PET, resolved: true }} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /marcar como reunido/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /encerrar busca/i })).toBeNull();
  });

  it('foco capturado no open e RESTAURADO ao trigger no close (contrato de modal)', async () => {
    // Um "trigger" focado antes de abrir — o foco deve voltar a ele no close.
    const trigger = document.createElement('button');
    trigger.textContent = 'abrir';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    // No open, o foco vai para o botão Fechar (rAF).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /fechar/i })).toBe(document.activeElement);
    });

    // Fecha (open=false) → o effect de cleanup restaura o foco ao trigger.
    rerender(<PetDetailSheet open={false} pet={BASE_PET} onClose={() => {}} />);
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });

    document.body.removeChild(trigger);
  });

  it('o contrato do modal permanece intacto (título + Fechar presentes)', () => {
    render(<PetDetailSheet open pet={BASE_PET} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /rex/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeTruthy();
  });
});
