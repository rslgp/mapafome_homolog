// PetDetailSheet.match.test.js — PET-M9b: render do hint "possível encontro".
//
// Prova de RENDER (RTL/jsdom) do surfacing calmo/opt-in/nunca-certo (spec §2):
//   • sem candidatos (matches=[]) → NENHUM hint aparece (silêncio é o default);
//   • com um candidato (já filtrado pelo predicado) → um hint discreto, em tom
//     "pode ser" (nunca "encontramos"/"match"/porcentagem — §2.2);
//   • UMA próxima decisão calma: "Ver o outro relato" chama onOpenMatch com o pet
//     candidato (§2.3), e é operável por teclado (<button> nativo);
//   • DISPENSÁVEL: "Agora não" some o hint sem culpa (§2.1);
//   • o link carrega a identidade M18 (petCoordsKey) do candidato no DOM.
//
// O LIMIAR DE SILÊNCIO é responsabilidade do predicado (testado em petMatch.test.js);
// aqui a sheet recebe `matches` já filtrado e só prova o SURFACING.

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PetDetailSheet from './PetDetailSheet';
import { petCoordsKey } from './petDomain';

afterEach(cleanup);

const OPEN_PET = {
  coords: [-8.05, -34.9],
  status: 'perdido',
  species: 'cao',
  size: 'medio',
  color: 'caramelo',
  name: 'Rex',
  detail: 'coleira azul',
  contact: '',
  photos: '',
  dateIso: '2026-05-20T00:00:00.000Z',
};

const CANDIDATE_PET = {
  coords: [-8.0455, -34.9], // ~0.5 km do OPEN_PET
  status: 'encontrado',
  species: 'cao',
  size: 'medio',
  color: 'caramelo',
  name: 'Cãozinho achado',
  contact: '5581999990000',
  photos: '',
  dateIso: '2026-05-22T00:00:00.000Z',
};

// `matches` na forma que findPossibleMatches devolve (já com o silêncio aplicado).
const MATCHES = [{ pet: CANDIDATE_PET, strength: 'strong', distanceKm: 0.5 }];

describe('PetDetailSheet — hint "possível encontro" (PET-M9b)', () => {
  it('sem candidatos (matches=[]) NÃO mostra hint algum (silêncio é o default)', () => {
    render(<PetDetailSheet open pet={OPEN_PET} matches={[]} onClose={() => {}} />);
    expect(screen.queryByRole('note', { name: /possível encontro/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ver o outro relato/i })).toBeNull();
  });

  it('com candidato, mostra um hint calmo em tom "pode ser" — NUNCA "encontramos"', () => {
    render(<PetDetailSheet open pet={OPEN_PET} matches={MATCHES} onClose={() => {}} />);

    const note = screen.getByRole('note', { name: /possível encontro/i });
    expect(note).toBeTruthy();
    // Tom de POSSIBILIDADE.
    expect(note.textContent.toLowerCase()).toContain('pode ser');
    // Copy/score BANIDOS (§2.2): nada de certeza nem porcentagem.
    const txt = note.textContent.toLowerCase();
    expect(txt).not.toContain('encontramos');
    expect(txt).not.toContain('match');
    expect(txt).not.toContain('%');
    expect(txt).not.toMatch(/\bé o seu pet\b/);
  });

  it('"Ver o outro relato" é UMA próxima decisão calma e chama onOpenMatch com o candidato', () => {
    const onOpenMatch = vi.fn();
    render(<PetDetailSheet open pet={OPEN_PET} matches={MATCHES} onOpenMatch={onOpenMatch} onClose={() => {}} />);

    const openBtn = screen.getByRole('button', { name: /ver o outro relato/i });
    expect(openBtn.tagName).toBe('BUTTON'); // operável por teclado
    fireEvent.click(openBtn);

    expect(onOpenMatch).toHaveBeenCalledTimes(1);
    expect(onOpenMatch).toHaveBeenCalledWith(CANDIDATE_PET);
  });

  it('o link carrega a identidade M18 (petCoordsKey) do candidato', () => {
    render(<PetDetailSheet open pet={OPEN_PET} matches={MATCHES} onClose={() => {}} />);
    const openBtn = screen.getByRole('button', { name: /ver o outro relato/i });
    expect(openBtn.getAttribute('data-match-key')).toBe(petCoordsKey(CANDIDATE_PET.coords));
  });

  it('é DISPENSÁVEL: "Agora não" some o hint sem culpa (opt-in §2.1)', () => {
    render(<PetDetailSheet open pet={OPEN_PET} matches={MATCHES} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /agora não/i }));
    expect(screen.queryByRole('note', { name: /possível encontro/i })).toBeNull();
  });

  it('espelha o registro do lado ACHADOR quando o pet aberto é um achado', () => {
    const finderOpen = { ...OPEN_PET, status: 'encontrado' };
    const lostCandidate = { ...CANDIDATE_PET, status: 'perdido' };
    const matches = [{ pet: lostCandidate, strength: 'strong', distanceKm: 0.5 }];
    render(<PetDetailSheet open pet={finderOpen} matches={matches} onClose={() => {}} />);
    const note = screen.getByRole('note', { name: /possível encontro/i });
    // Tom espelhado: "este pet pode ter alguém procurando".
    expect(note.textContent.toLowerCase()).toContain('procurando');
    expect(note.textContent.toLowerCase()).toContain('pode ser');
  });
});
