// PetDetailSheet.share.test.js — PET-M19: o botão "Compartilhar" na sheet.
//
// Prova de RENDER (RTL/jsdom) + o contrato de gesto SÍNCRONO:
//   • o botão "Compartilhar" aparece, é um <button> NATIVO (operável por teclado),
//     rotulado para o AT (aria-label) e fica na linha de ações (Fechar / Como chegar);
//   • o CLIQUE invoca navigator.share NO MESMO TICK do clique (sem await gateando) —
//     a correção load-bearing do mobile: medimos que a chamada acontece na MESMA
//     pilha síncrona do fireEvent.click;
//   • sem navigator.share, o clique abre o wa.me (window.open) com o deep-link M18;
//   • o contrato do modal (título + Fechar) permanece intacto.
//
// petShare NÃO é mockado aqui de propósito: queremos provar o fio inteiro do gesto
// (handler -> builder puro -> navigator.share) com o navigator real-stubbado, que é
// onde o "síncrono" importa. O builder puro já é testado isolado em petShare.test.js.

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PetDetailSheet from './PetDetailSheet';
import { petCoordsKey } from './petDomain';

const PET = {
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PetDetailSheet — Compartilhar (PET-M19)', () => {
  it('mostra o botão Compartilhar, <button> nativo e rotulado para o AT', () => {
    vi.stubGlobal('navigator', { share: vi.fn(() => Promise.resolve()) });
    render(<PetDetailSheet open pet={PET} onClose={() => {}} />);

    const btn = screen.getByRole('button', { name: /compartilhar/i });
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON'); // teclado de graça
    expect(btn.getAttribute('aria-label')).toMatch(/compartilhar/i);
  });

  it('o clique invoca navigator.share NO MESMO TICK (síncrono, sem await gateando)', () => {
    let calledSynchronously = false;
    const shareSpy = vi.fn(() => { calledSynchronously = true; return Promise.resolve(); });
    vi.stubGlobal('navigator', { share: shareSpy });

    render(<PetDetailSheet open pet={PET} onClose={() => {}} />);
    // fireEvent.click roda o handler de forma síncrona; ao retornar, navigator.share
    // JÁ tem de ter sido chamado (mesma pilha) — se estivesse atrás de um await, a
    // flag ainda seria false aqui.
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));

    expect(calledSynchronously).toBe(true);
    expect(shareSpy).toHaveBeenCalledTimes(1);
    const arg = shareSpy.mock.calls[0][0];
    // O deep-link M18 vai na URL compartilhada (cai NO pet). A vírgula da coordsKey
    // é percent-encoded (%2C) no param ?pet=.
    expect(arg.url).toContain(`pet=${encodeURIComponent(petCoordsKey(PET.coords))}`);
    // SEM PII: o detalhe livre não vai no texto compartilhado.
    expect(`${arg.text} ${arg.url}`).not.toContain('coleira');
  });

  it('sem navigator.share, o clique abre o wa.me com o deep-link M18 (fallback)', () => {
    vi.stubGlobal('navigator', {}); // sem .share
    // Sobrescreve só window.open (sharePet lê window.open no tick do clique); não
    // re-stubba o window inteiro (quebraria o RTL/screen).
    const realOpen = window.open;
    const openSpy = vi.fn();
    window.open = openSpy;

    render(<PetDetailSheet open pet={PET} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0];
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    // A vírgula da coordsKey é percent-encoded (%2C) no param ?pet= e sobrevive a
    // UM decode (o wrapper wa.me) — casamos a forma codificada do deep-link M18.
    expect(decodeURIComponent(url)).toContain(`pet=${encodeURIComponent(petCoordsKey(PET.coords))}`);

    window.open = realOpen; // restaura
  });

  it('o contrato do modal permanece intacto (título + Fechar presentes)', () => {
    vi.stubGlobal('navigator', { share: vi.fn(() => Promise.resolve()) });
    render(<PetDetailSheet open pet={PET} onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: /rex/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeTruthy();
  });
});
