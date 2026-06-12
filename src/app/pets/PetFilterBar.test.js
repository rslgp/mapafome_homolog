// PetFilterBar.test.js — PET-M7: prova de RENDER (RTL/jsdom) da barra de filtro.
//
// A barra é UI burra: não conhece os pets nem aplica o predicado (isso é o
// petFilter.test.js puro). Aqui verificamos o CONTRATO DE SUPERFÍCIE/A11y:
//   • desenha um chip por opção das facetas SOT MULTI-SELEÇÃO (status/espécie/COR/
//     porte) — mudar a SOT muda os chips (ids/labels lidos das listas, sem hardcode);
//   • cada chip multi é um <button> com aria-pressed refletindo a seleção (toggle,
//     operável por teclado por ser um button nativo);
//   • a RECÊNCIA é single-select (role=radiogroup + role=radio/aria-checked):
//     escolher um chama onSetRecency(days); tocar o ATIVO de novo manda o mesmo
//     days (o setter PURO do domínio faz o toggle-off → null);
//   • a ORDEM das facetas é Situação → Espécie → COR → Porte → Recência;
//   • cada faceta é um group/radiogroup rotulado;
//   • tocar um chip multi chama onToggle(facetKey, id);
//   • "limpar filtros" só aparece com faceta ativa e chama onClear;
//   • a contagem zero com filtro ativo oferece um "limpar" INLINE (CALM-TONE: a
//     contagem 0 nunca é beco sem saída);
//   • a contagem de combinações está numa região aria-live (role=status).
//
// Não há Leaflet aqui — a barra é testável em jsdom (por isso NÃO está no
// exclude de coverage; este teste mantém a cobertura do arquivo).

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import PetFilterBar from './PetFilterBar';
import {
  defaultPetFilter,
  PET_STATUSES,
  PET_SPECIES,
  PET_COLORS,
  PET_SIZES,
  PET_RECENCY_OPTIONS,
} from './petDomain';

afterEach(cleanup);

const EMPTY = defaultPetFilter();
// Todos os chips multi-seleção (status + espécie + cor + porte) + os chips de
// recência (single-select) — todos são <button> no DOM.
const MULTI_CHIPS = PET_STATUSES.length + PET_SPECIES.length + PET_COLORS.length + PET_SIZES.length;
const TOTAL_CHIPS = MULTI_CHIPS + PET_RECENCY_OPTIONS.length;

describe('PetFilterBar — render + a11y do contrato de superfície', () => {
  it('desenha um chip por opção das facetas SOT (multi=button + recência=radio), sem botões extras quando o filtro está vazio', () => {
    render(<PetFilterBar filter={EMPTY} total={5} matchCount={5} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
    // Os chips MULTI (status + espécie + cor + porte) são <button> (role button);
    // a recência usa role=radio EXPLÍCITO (sobrepõe o button implícito), então não
    // entra em getAllByRole('button'). Filtro vazio → NENHUM "limpar" (sem faceta
    // ativa → sem limpar de topo nem inline). Os dois roles somados = todos os chips.
    const multiChips = screen.getAllByRole('button');
    expect(multiChips).toHaveLength(MULTI_CHIPS);
    const recencyChips = screen.getAllByRole('radio');
    expect(recencyChips).toHaveLength(PET_RECENCY_OPTIONS.length);
    expect(multiChips.length + recencyChips.length).toBe(TOTAL_CHIPS);
    // Os rótulos vêm da SOT — conferimos alguns sem hardcodar 'Perdido' nós mesmos.
    expect(screen.getByText(PET_STATUSES[0].label)).toBeTruthy();
    expect(screen.getByText(PET_SPECIES[0].label)).toBeTruthy();
    expect(screen.getByText(PET_COLORS[0].label)).toBeTruthy();
    expect(screen.getByText(PET_SIZES[0].label)).toBeTruthy();
  });

  it('cada faceta de chips é um group/radiogroup rotulado', () => {
    render(<PetFilterBar filter={EMPTY} total={3} matchCount={3} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
    // Os grupos MULTI de chips são alcançáveis por nome acessível (o <fieldset>
    // também carrega role=group implícito, então não asseguramos um total exato).
    expect(screen.getByRole('group', { name: 'Filtrar por situação' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filtrar por espécie' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filtrar por cor' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Filtrar por porte' })).toBeTruthy();
    // A recência é um radiogroup (single-select), não um group de toggles.
    expect(screen.getByRole('radiogroup', { name: 'Filtrar por quando foi reportado' })).toBeTruthy();
  });

  it('as facetas aparecem na ORDEM certa: Situação → Espécie → Cor → Porte → Recência', () => {
    render(<PetFilterBar filter={EMPTY} total={5} matchCount={5} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
    // As <legend> aparecem em ordem de documento; lê-las prova a ordem vertical.
    const legends = Array.from(document.querySelectorAll('.pet-filter__legend'))
      .map((el) => el.textContent);
    expect(legends).toEqual(['Situação', 'Espécie', 'Cor', 'Porte', 'Quando foi reportado']);
  });

  // ── COR — faceta MULTI-SELEÇÃO (chips, OR interno, aria-pressed) ──
  describe('faceta COR (multi-select)', () => {
    it('desenha um chip por bucket de PET_COLORS com os rótulos da SOT', () => {
      render(<PetFilterBar filter={EMPTY} total={5} matchCount={5} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
      const group = screen.getByRole('group', { name: 'Filtrar por cor' });
      for (const c of PET_COLORS) {
        expect(within(group).getByText(c.label)).toBeTruthy();
      }
    });

    it('tocar um chip de cor chama onToggle("colors", id)', () => {
      const onToggle = vi.fn();
      render(<PetFilterBar filter={EMPTY} total={4} matchCount={4} onToggle={onToggle} onSetRecency={() => {}} onClear={() => {}} />);
      const group = screen.getByRole('group', { name: 'Filtrar por cor' });
      const chip = within(group).getByText(PET_COLORS[2].label).closest('button');
      fireEvent.click(chip);
      expect(onToggle).toHaveBeenCalledWith('colors', PET_COLORS[2].id);
    });

    it('aria-pressed reflete a seleção de cor (toggle, não radio)', () => {
      const selected = { ...defaultPetFilter(), colors: [PET_COLORS[0].id] };
      render(<PetFilterBar filter={selected} total={4} matchCount={2} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
      const group = screen.getByRole('group', { name: 'Filtrar por cor' });
      const onChip = within(group).getByText(PET_COLORS[0].label).closest('button');
      const offChip = within(group).getByText(PET_COLORS[1].label).closest('button');
      expect(onChip.getAttribute('aria-pressed')).toBe('true');
      expect(offChip.getAttribute('aria-pressed')).toBe('false');
    });
  });

  // ── RECÊNCIA — faceta SINGLE-SELECT (radiogroup, aria-checked) ──
  describe('faceta RECÊNCIA (single-select)', () => {
    it('desenha um radio por opção de PET_RECENCY_OPTIONS com os rótulos NEUTROS da SOT', () => {
      render(<PetFilterBar filter={EMPTY} total={5} matchCount={5} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
      const group = screen.getByRole('radiogroup', { name: 'Filtrar por quando foi reportado' });
      const radios = within(group).getAllByRole('radio');
      expect(radios).toHaveLength(PET_RECENCY_OPTIONS.length);
      for (const r of PET_RECENCY_OPTIONS) {
        expect(within(group).getByText(r.label)).toBeTruthy();
      }
    });

    it('tocar um chip de recência chama onSetRecency(days)', () => {
      const onSetRecency = vi.fn();
      render(<PetFilterBar filter={EMPTY} total={5} matchCount={5} onToggle={() => {}} onSetRecency={onSetRecency} onClear={() => {}} />);
      const group = screen.getByRole('radiogroup', { name: 'Filtrar por quando foi reportado' });
      const chip = within(group).getByText(PET_RECENCY_OPTIONS[1].label).closest('button');
      fireEvent.click(chip);
      expect(onSetRecency).toHaveBeenCalledWith(PET_RECENCY_OPTIONS[1].days);
    });

    it('aria-checked reflete a seleção única (só o ativo marcado)', () => {
      const selected = { ...defaultPetFilter(), recencyDays: PET_RECENCY_OPTIONS[0].days };
      render(<PetFilterBar filter={selected} total={5} matchCount={3} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
      const group = screen.getByRole('radiogroup', { name: 'Filtrar por quando foi reportado' });
      const onChip = within(group).getByText(PET_RECENCY_OPTIONS[0].label).closest('button');
      const offChip = within(group).getByText(PET_RECENCY_OPTIONS[1].label).closest('button');
      expect(onChip.getAttribute('aria-checked')).toBe('true');
      expect(offChip.getAttribute('aria-checked')).toBe('false');
    });

    it('tocar o chip de recência JÁ ATIVO manda o mesmo days (o domínio faz o toggle-off → null)', () => {
      const onSetRecency = vi.fn();
      const selected = { ...defaultPetFilter(), recencyDays: PET_RECENCY_OPTIONS[0].days };
      render(<PetFilterBar filter={selected} total={5} matchCount={3} onToggle={() => {}} onSetRecency={onSetRecency} onClear={() => {}} />);
      const group = screen.getByRole('radiogroup', { name: 'Filtrar por quando foi reportado' });
      const active = within(group).getByText(PET_RECENCY_OPTIONS[0].label).closest('button');
      fireEvent.click(active);
      // A UI manda sempre o days tocado; setPetFilterRecency (testado no domínio)
      // detecta que é o valor já ativo e limpa para null. A barra não pré-checa.
      expect(onSetRecency).toHaveBeenCalledWith(PET_RECENCY_OPTIONS[0].days);
    });
  });

  it('"limpar filtros" só aparece com faceta ativa e chama onClear', () => {
    const onClear = vi.fn();
    // Sem faceta ativa: nenhum botão de limpar (nem topo, nem inline).
    const { rerender } = render(
      <PetFilterBar filter={EMPTY} total={4} matchCount={4} onToggle={() => {}} onSetRecency={() => {}} onClear={onClear} />,
    );
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).toBeNull();

    // Com faceta ativa (e matchCount>0, então SEM o limpar inline da contagem
    // zero): o botão de topo é o único "limpar" — aparece e dispara onClear.
    rerender(
      <PetFilterBar
        filter={{ ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] }}
        total={4}
        matchCount={1}
        onToggle={() => {}}
        onSetRecency={() => {}}
        onClear={onClear}
      />,
    );
    const clearBtn = screen.getByRole('button', { name: /limpar filtros/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('a recência ativa também faz "limpar filtros" aparecer (conta como faceta ativa)', () => {
    render(
      <PetFilterBar
        filter={{ ...defaultPetFilter(), recencyDays: PET_RECENCY_OPTIONS[0].days }}
        total={5}
        matchCount={2}
        onToggle={() => {}}
        onSetRecency={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeTruthy();
  });

  it('a contagem está numa região aria-live (role=status) e reflete os números', () => {
    render(<PetFilterBar filter={{ ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] }} total={5} matchCount={2} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
    const live = screen.getByRole('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain('2');
    expect(live.textContent).toContain('5');
  });

  it('contagem zero e total zero têm cópia calma específica', () => {
    const { rerender } = render(
      <PetFilterBar filter={{ ...defaultPetFilter(), statuses: [PET_STATUSES[0].id] }} total={5} matchCount={0} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />,
    );
    expect(screen.getByRole('status').textContent).toMatch(/nenhum pet combina/i);

    rerender(<PetFilterBar filter={EMPTY} total={0} matchCount={0} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
    expect(screen.getByRole('status').textContent).toMatch(/nenhum pet reportado/i);
  });

  it('CALM-TONE: a contagem ZERO com filtro ativo oferece um "limpar" INLINE que chama onClear', () => {
    const onClear = vi.fn();
    render(
      <PetFilterBar
        filter={{ ...defaultPetFilter(), colors: [PET_COLORS[0].id] }}
        total={5}
        matchCount={0}
        onToggle={() => {}}
        onSetRecency={() => {}}
        onClear={onClear}
      />,
    );
    // O "limpar" inline mora DENTRO da região de contagem (role=status), ali mesmo
    // junto do número — uma só unidade visual. Recupera num toque.
    const live = screen.getByRole('status');
    const inline = within(live).getByRole('button', { name: /limpar filtros/i });
    fireEvent.click(inline);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('CALM-TONE: a contagem ZERO SEM filtro ativo (total 0) NÃO mostra limpar inline (não há o que limpar)', () => {
    render(<PetFilterBar filter={EMPTY} total={0} matchCount={0} onToggle={() => {}} onSetRecency={() => {}} onClear={() => {}} />);
    const live = screen.getByRole('status');
    expect(within(live).queryByRole('button')).toBeNull();
  });
});
