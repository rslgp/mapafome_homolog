// PetDetailSheet.reveal.test.js — PET-M3 (deliverable a + render de b/c).
//
// Prova de RENDER (RTL/jsdom) do reveal-on-tap do contato:
//   • ao ABRIR o detalhe, o contato NÃO está no DOM como link clicável — só um
//     botão "Mostrar contato" + a nota de privacidade /pets-específica;
//   • após o TAP, o link de contato aparece (href resolvido só agora);
//   • um pet SEM contato (contactless) renderiza limpo: nenhum botão de reveal,
//     nenhum link de contato, sem quebrar;
//   • o botão de reveal é operável por teclado (é um <button> nativo).
//
// Forcing-function: enquanto não revelado, o valor bruto do contato não vira um
// <a href> no documento — a barricada de PII é temporal, não só visual.

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PetDetailSheet from './PetDetailSheet';

afterEach(cleanup);

const BASE_PET = {
  coords: [-8.0671132, -34.8766719],
  status: 'perdido',
  species: 'cao',
  size: 'medio',
  color: 'caramelo',
  name: 'Rex',
  detail: 'coleira azul',
  photos: '',
  dateIso: '2026-06-11T12:00:00.000Z',
};

const WITH_CONTACT = { ...BASE_PET, contact: '5581999990000' };
const NO_CONTACT = { ...BASE_PET, contact: '' };

describe('PetDetailSheet — reveal-on-tap do contato', () => {
  it('ao abrir, o contato NÃO está no DOM; mostra o botão "Mostrar contato"', () => {
    render(<PetDetailSheet open pet={WITH_CONTACT} onClose={() => {}} />);

    // Botão de reveal presente e rotulado.
    const revealBtn = screen.getByRole('button', { name: /mostrar contato/i });
    expect(revealBtn).toBeTruthy();
    // É um <button> nativo → operável por teclado (foco + Enter/Espaço).
    expect(revealBtn.tagName).toBe('BUTTON');

    // Nenhum link "Abrir WhatsApp" ainda — o href não foi resolvido.
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
    // E o número bruto não está em lugar nenhum do documento.
    expect(document.body.textContent).not.toContain('5581999990000');

    // A nota de privacidade /pets-específica está presente.
    expect(screen.getByText(/escondido até você tocar/i)).toBeTruthy();
  });

  it('após o tap, o link de contato aparece (href resolvido só agora)', () => {
    render(<PetDetailSheet open pet={WITH_CONTACT} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /mostrar contato/i }));

    const link = screen.getByRole('link', { name: /whatsapp/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('wa.me');
    // O botão de reveal some após revelar.
    expect(screen.queryByRole('button', { name: /mostrar contato/i })).toBeNull();
  });

  it('pet SEM contato (contactless) renderiza limpo — sem reveal, sem link', () => {
    render(<PetDetailSheet open pet={NO_CONTACT} onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: /mostrar contato/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /whatsapp/i })).toBeNull();
    // O detalhe ainda renderiza (título, status) — nada quebrou.
    expect(screen.getByRole('heading', { name: /rex/i })).toBeTruthy();
  });
});
