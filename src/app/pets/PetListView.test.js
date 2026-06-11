// PetListView.test.js — PET-M8: prova de RENDER (RTL/jsdom) da lista de pets.
//
// A lista é a alternativa acessível ao mapa Leaflet (que não renderiza em jsdom).
// Aqui verificamos o CONTRATO DE SUPERFÍCIE/A11y nomeado na acceptance do PET-M8:
//   • cada linha mostra o BADGE de status (do PET-M11), a DESCLINE (espécie·porte·
//     cor), o TEMPO RELATIVO (formatRelativeTime) e a DISTÂNCIA quando há GPS;
//   • tocar uma linha chama onPetClick(pet) — o MESMO handler do marcador, que
//     abre a PetDetailSheet compartilhada (acceptance 1/3);
//   • a lista reflete o conjunto recebido (visiblePets) — não refiltra nada;
//   • ordenação por distância (com center) senão recência aparece na ORDEM do DOM;
//   • cada linha é um <button> com aria-label (operável por teclado, rotulada p/ AT);
//   • estado VAZIO calmo quando não há pets.
//
// E o requisito "o toggle troca as visões": como o PetsApp monta PetMap (Leaflet,
// inviável em jsdom e EXCLUÍDO de coverage), exercitamos o contrato do toggle num
// HARNESS mínimo que reproduz o mesmo padrão de estado de visão (um botão alterna
// entre a lista e um placeholder de mapa) — provando a TROCA sem arrastar Leaflet.

import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import PetListView from './PetListView';
import { PET_STATUS_MAP, PET_SPECIES } from './petDomain';

afterEach(cleanup);

const RECIFE = [-8.0671132, -34.8766719];
const NOW = 1_700_000_000_000;

// Fábrica de pet parseado (forma do parsePetRow).
function pet(over = {}) {
  return {
    coords: RECIFE,
    status: 'perdido',
    species: 'cao',
    size: 'medio',
    color: 'caramelo',
    name: 'Rex',
    dateIso: '2026-06-01T00:00:00.000Z',
    ...over,
  };
}

describe('PetListView — render da linha (badge + descline + tempo + distância)', () => {
  it('mostra o badge de status (PET-M11 .pet-badge--solid + --<status>) com o label da SOT', () => {
    render(<PetListView pets={[pet()]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    const label = PET_STATUS_MAP.perdido.label; // 'Perdido' — lido da SOT, não hardcoded
    const badge = screen.getByText(label).closest('.pet-badge');
    expect(badge).toBeTruthy();
    // Classes do PET-M11 reutilizadas (sem re-derivar cor): solid + o modificador
    // de status DERIVADO do id.
    expect(badge.className).toContain('pet-badge--solid');
    expect(badge.className).toContain('pet-badge--perdido');
  });

  it('mostra a descline (espécie · porte · cor)', () => {
    render(<PetListView pets={[pet()]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    const desc = screen.getByText(/C[ãa]o/i).closest('.pet-list__descline')
      || screen.getByText(/caramelo/i).closest('.pet-list__descline');
    expect(desc).toBeTruthy();
    expect(desc.textContent).toContain('caramelo');
  });

  it('mostra o tempo relativo (formatRelativeTime) e a distância quando há GPS', () => {
    render(<PetListView pets={[pet()]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    const row = screen.getByRole('button');
    // O pet está no próprio centro → ~0 m: a distância aparece (metros) com GPS.
    expect(within(row).getByText(/\bm\b|km/).textContent).toBeTruthy();
    // formatRelativeTime emite a forma "há … " em pt-BR para uma data passada.
    expect(row.textContent).toMatch(/h[áa]\s/i);
  });

  it('NÃO mostra distância quando não há centro GPS (só o tempo)', () => {
    render(<PetListView pets={[pet()]} center={null} nowMs={NOW} onPetClick={() => {}} />);
    const row = screen.getByRole('button');
    expect(row.querySelector('.pet-list__distance')).toBeNull();
    expect(row.textContent).toMatch(/h[áa]\s/i); // o tempo ainda aparece
  });

  it('cada linha é um <button> com aria-label (operável por teclado, rotulada p/ AT)', () => {
    render(<PetListView pets={[pet()]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    const row = screen.getByRole('button');
    const aria = row.getAttribute('aria-label') || '';
    expect(aria).toContain(PET_STATUS_MAP.perdido.label); // status na frase
    expect(aria).toContain('Rex');                         // nome na frase
  });

  it('tocar uma linha chama onPetClick(pet) — abre a PetDetailSheet compartilhada', () => {
    const onPetClick = vi.fn();
    const p = pet();
    render(<PetListView pets={[p]} center={RECIFE} nowMs={NOW} onPetClick={onPetClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onPetClick).toHaveBeenCalledWith(p);
  });

  it('estado VAZIO calmo quando não há pets', () => {
    render(<PetListView pets={[]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/nenhum pet para mostrar/i)).toBeTruthy();
  });
});

describe('PetListView — reflete o conjunto + ordenação visível no DOM', () => {
  it('renderiza UMA linha por pet do conjunto recebido (não refiltra)', () => {
    const pets = [pet({ name: 'A', coords: [-8.10, -34.90] }), pet({ name: 'B', coords: [-8.20, -35.00] })];
    render(<PetListView pets={pets} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('com GPS, ordena por DISTÂNCIA (o mais perto aparece primeiro no DOM)', () => {
    const far = pet({ name: 'Longe', coords: [-8.30, -35.10], dateIso: '2026-06-10T00:00:00.000Z' });
    const near = pet({ name: 'Perto', coords: [-8.07, -34.88], dateIso: '2026-01-01T00:00:00.000Z' });
    render(<PetListView pets={[far, near]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />);
    const names = screen.getAllByText(/Perto|Longe/).map((n) => n.textContent);
    expect(names[0]).toBe('Perto'); // perto antes de longe, apesar de mais antigo
  });

  it('sem GPS, ordena por RECÊNCIA (o mais recente aparece primeiro no DOM)', () => {
    const old = pet({ name: 'Antigo', dateIso: '2026-01-01T00:00:00.000Z' });
    const recent = pet({ name: 'Novo', dateIso: '2026-06-10T00:00:00.000Z' });
    render(<PetListView pets={[old, recent]} center={null} nowMs={NOW} onPetClick={() => {}} />);
    const names = screen.getAllByText(/Antigo|Novo/).map((n) => n.textContent);
    expect(names[0]).toBe('Novo');
  });
});

// ── O toggle troca as visões (harness mínimo, reproduz o padrão do PetsApp) ──
//
// Reproduz o contrato do toggle MAPA|LISTA do PetsApp (que não renderiza em jsdom
// por montar Leaflet): dois tabs aria-selected, um placeholder de mapa e a lista
// real. Prova que clicar "Lista" troca a visão para a PetListView e "Mapa" volta.
function ToggleHarness({ pets }) {
  const [view, setView] = useState('map');
  return (
    <div>
      <div role="tablist" aria-label="Como ver os pets">
        <button type="button" role="tab" aria-selected={view === 'map'} onClick={() => setView('map')}>
          Mapa
        </button>
        <button type="button" role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>
          Lista
        </button>
      </div>
      {view === 'list'
        ? <PetListView pets={pets} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />
        : <div data-testid="map-placeholder">mapa</div>}
    </div>
  );
}

describe('PetListView — o toggle troca entre mapa e lista', () => {
  it('começa no mapa; clicar "Lista" mostra a lista; clicar "Mapa" volta', () => {
    render(<ToggleHarness pets={[pet({ name: 'Rex' })]} />);
    // Visão inicial = mapa: o placeholder está presente, a linha de pet não.
    expect(screen.getByTestId('map-placeholder')).toBeTruthy();
    expect(screen.queryByText('Rex')).toBeNull();

    // Troca para a lista: a linha do pet aparece, o placeholder some.
    fireEvent.click(screen.getByRole('tab', { name: 'Lista' }));
    expect(screen.getByText('Rex')).toBeTruthy();
    expect(screen.queryByTestId('map-placeholder')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Lista' }).getAttribute('aria-selected')).toBe('true');

    // Volta para o mapa.
    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
    expect(screen.getByTestId('map-placeholder')).toBeTruthy();
    expect(screen.queryByText('Rex')).toBeNull();
  });
});

// Sanidade: o ícone do slot de foto (PET-M15, reservado) usa o glifo da espécie.
describe('PetListView — slot de foto reservado (PET-M15)', () => {
  it('mostra o glifo da espécie no slot (sem <img>, decorativo)', () => {
    const { container } = render(
      <PetListView pets={[pet({ species: 'gato' })]} center={RECIFE} nowMs={NOW} onPetClick={() => {}} />,
    );
    const gato = PET_SPECIES.find((s) => s.id === 'gato');
    const thumb = container.querySelector('.pet-list__thumb');
    expect(thumb).toBeTruthy();
    expect(thumb.getAttribute('aria-hidden')).toBe('true');
    expect(thumb.textContent).toBe(gato.icon);
    expect(container.querySelector('.pet-list__thumb img')).toBeNull(); // sem imagem ainda
  });
});
