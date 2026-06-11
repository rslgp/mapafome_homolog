// PetFilterBar.test.js — PET-M7: prova de RENDER (RTL/jsdom) da barra de filtro.
//
// A barra é UI burra: não conhece os pets nem aplica o predicado (isso é o
// petFilter.test.js puro). Aqui verificamos o CONTRATO DE SUPERFÍCIE/A11y:
//   • desenha um chip por opção das três facetas SOT (status/espécie/porte) —
//     mudar a SOT muda os chips (ids/labels lidos das listas, sem hardcode);
//   • cada chip é um <button> com aria-pressed refletindo a seleção (toggle,
//     operável por teclado por ser um button nativo);
//   • cada faceta é um group rotulado (role=group + aria-label);
//   • tocar um chip chama onToggle(facetKey, id);
//   • "limpar filtros" só aparece com faceta ativa e chama onClear;
//   • a contagem de combinações está numa região aria-live (role=status).
//
// Não há Leaflet aqui — a barra é testável em jsdom (por isso NÃO está no
// exclude de coverage; este teste mantém a cobertura do arquivo).

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import PetFilterBar from './PetFilterBar';
import { defaultPetFilter, PET_STATUSES, PET_SPECIES, PET_SIZES } from './petDomain';

afterEach(cleanup);

const EMPTY = defaultPetFilter();
const TOTAL_CHIPS = PET_STATUSES.length + PET_SPECIES.length + PET_SIZES.length;

describe('PetFilterBar — render + a11y do contrato de superfície', () => {
  it('desenha um chip por opção das três facetas SOT', () => {
    render(<PetFilterBar filter={EMPTY} total={5} matchCount={5} onToggle={() => {}} onClear={() => {}} />);
    // Um botão por opção (status + espécie + porte) + nenhum "limpar" (filtro vazio).
    const chips = screen.getAllByRole('button');
    expect(chips).toHaveLength(TOTAL_CHIPS);
    // Os rótulos vêm da SOT — conferimos alguns sem hardcodar 'Perdido' nós mesmos.
    expect(screen.getByText(PET_STATUSES[0].label)).toBeTruthy();
    expect(screen.getByText(PET_SPECIES[0].label)).toBeTruthy();
    expect(screen.getByText(PET_SIZES[0].label)).toBeTruthy();
  });

  it('cada faceta de chips é um group rotulado (role=group + aria-label)', () => {
    render(<PetFilterBar filter={EMPTY} total={3} matchCount={3} onToggle={() => {}} onClear={() => {}} />);
    // Os três grupos de CHIPS são alcançáveis por nome acessível (o <fieldset>
    // também carrega role=group implícito, então não asseguramos um total exato —
    // o que importa é que cada faceta de chips seja nomeada para o AT).
    expect(screen.getByRole('group', { name: 'Filtrar por situação' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filtrar por espécie' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filtrar por porte' })).toBeTruthy();
  });

  it('aria-pressed reflete a seleção (toggle, não radio)', () => {
    const selected = { ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] };
    render(<PetFilterBar filter={selected} total={4} matchCount={2} onToggle={() => {}} onClear={() => {}} />);
    const group = screen.getByRole('group', { name: 'Filtrar por situação' });
    const onChip = within(group).getByText(PET_STATUSES[0].label).closest('button');
    const offChip = within(group).getByText(PET_STATUSES[1].label).closest('button');
    expect(onChip.getAttribute('aria-pressed')).toBe('true');
    expect(offChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('tocar um chip chama onToggle(facetKey, id)', () => {
    const onToggle = vi.fn();
    render(<PetFilterBar filter={EMPTY} total={4} matchCount={4} onToggle={onToggle} onClear={() => {}} />);
    const speciesGroup = screen.getByRole('group', { name: 'Filtrar por espécie' });
    const chip = within(speciesGroup).getByText(PET_SPECIES[1].label).closest('button');
    fireEvent.click(chip);
    expect(onToggle).toHaveBeenCalledWith('species', PET_SPECIES[1].id);
  });

  it('"limpar filtros" só aparece com faceta ativa e chama onClear', () => {
    const onClear = vi.fn();
    // Sem faceta ativa: nenhum botão de limpar.
    const { rerender } = render(
      <PetFilterBar filter={EMPTY} total={4} matchCount={4} onToggle={() => {}} onClear={onClear} />,
    );
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).toBeNull();

    // Com faceta ativa: o botão aparece e dispara onClear.
    rerender(
      <PetFilterBar
        filter={{ ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] }}
        total={4}
        matchCount={1}
        onToggle={() => {}}
        onClear={onClear}
      />,
    );
    const clearBtn = screen.getByRole('button', { name: /limpar filtros/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('a contagem está numa região aria-live (role=status) e reflete os números', () => {
    render(<PetFilterBar filter={{ ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] }} total={5} matchCount={2} onToggle={() => {}} onClear={() => {}} />);
    const live = screen.getByRole('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('2');
    expect(live.textContent).toContain('5');
  });

  it('contagem zero e total zero têm cópia calma específica', () => {
    const { rerender } = render(
      <PetFilterBar filter={{ ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] }} total={5} matchCount={0} onToggle={() => {}} onClear={() => {}} />,
    );
    expect(screen.getByRole('status').textContent).toMatch(/nenhum pet combina/i);

    rerender(<PetFilterBar filter={EMPTY} total={0} matchCount={0} onToggle={() => {}} onClear={() => {}} />);
    expect(screen.getByRole('status').textContent).toMatch(/nenhum pet reportado/i);
  });
});
