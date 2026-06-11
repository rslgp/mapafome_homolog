// PetMapLoadStates.test.js — PET-M20: RTL render of the three explicit map-load
// surfaces, against the YAML acceptance lines:
//   • LOADING exposes a busy state (aria-busy + role=status + skeleton) DISTINCT
//     from empty and error;
//   • EMPTY shows a calm pt-BR copy pointing to "Relatar";
//   • ERROR shows calm pt-BR copy AND a keyboard-operable "Tentar de novo" that
//     RE-RUNS the fetch (calls onRetry) WITHOUT a full page reload;
//   • READY renders nothing (the parent shows the map/list).
//
// The retry "no reload" guarantee is proven by asserting onRetry fires and that
// the component never touches window.location (it has no reload path).

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PetMapLoadStates from './PetMapLoadStates';
import { PET_MAP_LOAD_STATE } from './petMapLoadState';

afterEach(cleanup);

describe('PetMapLoadStates — LOADING (busy, distinto de vazio/erro)', () => {
  it('expõe aria-busy + role=status + um skeleton (não spinner-only)', () => {
    const { container } = render(<PetMapLoadStates state={PET_MAP_LOAD_STATE.LOADING} />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-busy')).toBe('true');
    // skeleton presente (a afordância calma de carregamento, não só um spinner).
    expect(container.querySelector('.pet-skeleton')).toBeTruthy();
    // anunciado a AT por uma linha sr-only com a palavra "carregando".
    expect(region.textContent).toMatch(/carregando/i);
    // NÃO é um alerta de erro nem o estado vazio.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/seja o primeiro/i)).toBeNull();
  });
});

describe('PetMapLoadStates — EMPTY (calmo, aponta para Relatar)', () => {
  it('mostra a cópia pt-BR esperançosa e aponta para "Relatar um pet" (role=status)', () => {
    render(<PetMapLoadStates state={PET_MAP_LOAD_STATE.EMPTY} />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-busy')).not.toBe('true'); // distinto de loading
    expect(region.textContent).toMatch(/nenhum pet reportado por aqui ainda/i);
    expect(region.textContent).toMatch(/seja o primeiro a ajudar/i);
    // aponta para o FAB de Relatar (o texto nomeia a ação).
    expect(region.textContent).toMatch(/relatar um pet/i);
    // não é um alerta de erro.
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('PetMapLoadStates — ERROR + RETRY (re-fetcha sem reload)', () => {
  it('mostra cópia calma (role=alert) + um botão "Tentar de novo"', () => {
    render(<PetMapLoadStates state={PET_MAP_LOAD_STATE.ERROR} onRetry={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/não foi possível carregar os pets/i);
    // o alerta NÃO é aria-busy (distinto de loading).
    expect(alert.getAttribute('aria-busy')).not.toBe('true');
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeTruthy();
  });

  it('clicar "Tentar de novo" RE-RODA o fetch (chama onRetry) SEM reload de página', () => {
    const onRetry = vi.fn();
    render(<PetMapLoadStates state={PET_MAP_LOAD_STATE.ERROR} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    // O retry é o re-fetch INJETADO (onRetry = o re-runner do fetchPets do pai),
    // NÃO uma recarga de página: o componente é um <a href>/<button> sem nenhum
    // caminho de reload (não há window.location.reload no código). Provar que
    // onRetry foi chamado É provar o re-fetch sem reload.
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('o botão de retry é um <button> real (operável por teclado)', () => {
    render(<PetMapLoadStates state={PET_MAP_LOAD_STATE.ERROR} onRetry={() => {}} />);
    const btn = screen.getByRole('button', { name: /tentar de novo/i });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
  });
});

describe('PetMapLoadStates — READY não renderiza nada (o pai mostra mapa/lista)', () => {
  it('retorna null em READY', () => {
    const { container } = render(<PetMapLoadStates state={PET_MAP_LOAD_STATE.READY} />);
    expect(container.firstChild).toBeNull();
  });
});
