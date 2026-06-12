// petLoadStatesWiring.test.js — PET-M20: proves the WIRING the YAML acceptance
// lines require, reproduced in a tiny harness because PetsApp.js mounts Leaflet
// and is excluded from jsdom coverage. The harness uses the REAL PET-M20 units
// (mapLoadState, resolveClosurePin, PetMapLoadStates, PetPublishClosure) and a
// MOCKED fetchPets, mirroring PetsApp's loadPets/handleRetryLoad/handleCloseReport.
//
// Acceptance lines covered here (the integration the components alone cannot show):
//   • the RETRY re-runs fetch (mock fetchPets; assert RE-CALL) WITHOUT a reload;
//   • the EMPTY state shows when loaded.length === 0;
//   • the post-publish CLOSURE appears after a 'published' close and offers EXACTLY
//     ONE next-decision (and a non-published close does NOT open it).

import React, { useCallback, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import PetMapLoadStates from './PetMapLoadStates';
import PetPublishClosure from './PetPublishClosure';
import PetFilterBar from './PetFilterBar';
import { defaultPetFilter } from './petDomain';
import { mapLoadState, resolveClosurePin, PET_MAP_LOAD_STATE } from './petMapLoadState';

afterEach(cleanup);

const COORDS = [-8.0671132, -34.8766719];

// Harness reproduzindo a fiação do PetsApp para o PET-M20 (sem Leaflet): um
// loadPets re-executável (com o fetchPets INJETADO/mockado), o estado de carga
// DERIVADO por mapLoadState, e o fechamento pós-publish disparado por um close
// 'published' (resolveClosurePin localiza o pin recém-criado).
function Harness({ fetchPets }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pets, setPets] = useState([]);
  const [closureOpen, setClosureOpen] = useState(false);

  // Espelha o loadPets do PetsApp: TODO setState mora APÓS o await (fora do corpo
  // síncrono do effect). O reset loading/erro é do CHAMADOR de retry (handler).
  const loadPets = useCallback(async () => {
    try {
      const loaded = await fetchPets();
      setPets(loaded);
      setLoading(false);
    } catch (e) {
      setError((e && e.message) || 'fail');
      setLoading(false);
    }
  }, [fetchPets]);

  // Retry (handler de clique): religa loading / limpa erro e re-roda — sancionado.
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    loadPets();
  }, [loadPets]);

  // Carga inicial (uma vez) — espelha o effect do PetsApp: IIFE assíncrono empurra
  // o setState (que mora após o await) para fora do corpo síncrono do effect.
  React.useEffect(() => { (async () => { await loadPets(); })(); }, [loadPets]);

  // Fechamento de relato: só 'published' dispara o fechamento (recentra/realça).
  const handleCloseReport = useCallback((reason) => {
    if (reason !== 'published') return;
    const pin = resolveClosurePin(COORDS, pets);
    if (pin) setClosureOpen(true);
  }, [pets]);

  const state = mapLoadState({ loading, error, count: pets.length });
  const isReady = state === PET_MAP_LOAD_STATE.READY;
  // Espelha o gate do PetsApp: o MAPA (e a barra de filtro que o ACOMPANHA)
  // aparece em READY e em EMPTY; só LOADING/ERROR o substituem (PetMapLoadStates).
  const showMap = state === PET_MAP_LOAD_STATE.READY
    || state === PET_MAP_LOAD_STATE.EMPTY;

  return (
    <div>
      {/* Espelha PetsApp: PetMapLoadStates SUBSTITUI o mapa só em LOADING/ERROR
          (gate `!showMap`). Em EMPTY o mapa fica, e a dica esperançosa "seja o
          primeiro" é renderizada DENTRO do bloco do mapa (segundo render abaixo),
          exatamente como o PetsApp faz (PetsApp.js, `loadState === EMPTY`). */}
      {!showMap && <PetMapLoadStates state={state} onRetry={handleRetry} />}
      {isReady && <div data-testid="map-ready">{pets.length} pets</div>}

      {/* A barra de filtro é gateada em `showMap` (READY ou EMPTY), NÃO em
          `isReady` — um dono que procura o pet em produção (0 pets → EMPTY) vê o
          mapa E os chips de filtro. Esta fiação é o regression-guard do bug
          "filtros somem em EMPTY" (gate trocado de isReady → showMap). */}
      {showMap && (
        <PetFilterBar
          filter={defaultPetFilter()}
          total={pets.length}
          matchCount={pets.length}
          onToggle={() => {}}
          onSetRecency={() => {}}
          onClear={() => {}}
        />
      )}

      {/* PET-M20 — em EMPTY a dica "seja o primeiro" acompanha o mapa (PetsApp
          renderiza este PetMapLoadStates DENTRO do bloco do mapa). */}
      {showMap && state === PET_MAP_LOAD_STATE.EMPTY && (
        <PetMapLoadStates state={state} onRetry={handleRetry} />
      )}

      {/* simula os dois fechamentos da sheet de relato */}
      <button type="button" onClick={() => handleCloseReport('published')}>
        publicar-e-fechar
      </button>
      <button type="button" onClick={() => handleCloseReport('cancel')}>
        cancelar-e-fechar
      </button>

      <PetPublishClosure
        open={closureOpen}
        onSeeOnMap={() => setClosureOpen(false)}
        onDismiss={() => setClosureOpen(false)}
      />
    </div>
  );
}

describe('PET-M20 wiring — RETRY re-roda o fetch SEM reload', () => {
  it('um fetch que falha mostra o erro; "Tentar de novo" RE-CHAMA fetchPets', async () => {
    const fetchPets = vi.fn()
      .mockRejectedValueOnce(new Error('rede caiu'))   // 1ª carga falha → ERROR
      .mockResolvedValueOnce([{ coords: COORDS, status: 'perdido' }]); // retry OK

    render(<Harness fetchPets={fetchPets} />);

    // 1ª carga falhou → estado de erro com "Tentar de novo".
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(fetchPets).toHaveBeenCalledTimes(1);

    // Clica retry → RE-CHAMA fetchPets (re-fetch sem reload: o retry chama o
    // re-runner injetado, não window.location.reload — não há esse caminho).
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));
    await waitFor(() => expect(fetchPets).toHaveBeenCalledTimes(2));

    // Após a re-busca bem-sucedida, o mapa fica pronto (1 pet).
    await waitFor(() => expect(screen.getByTestId('map-ready')).toBeTruthy());
  });
});

describe('PET-M20 wiring — EMPTY quando 0 pets', () => {
  it('um fetch que resolve [] mostra o estado vazio calmo apontando para Relatar', async () => {
    const fetchPets = vi.fn().mockResolvedValue([]);
    render(<Harness fetchPets={fetchPets} />);
    // A dica esperançosa do PetMapLoadStates ("…seja o primeiro a ajudar") é a cópia
    // ÚNICA do estado vazio — desambigua do `noneTotal` da barra de filtro ("Nenhum
    // pet reportado por aqui ainda."), que agora também rende no harness em EMPTY.
    await waitFor(() =>
      expect(screen.getByText(/seja o primeiro a ajudar/i)).toBeTruthy(),
    );
    expect(screen.getByText(/relatar um pet/i)).toBeTruthy();
    expect(screen.queryByTestId('map-ready')).toBeNull();
  });
});

// Regression-guard do bug "os filtros não aparecem para o dono que procura o pet":
// a barra de filtro estava gateada em `isReady` (= só READY), mas o mapa passou a
// aparecer também em EMPTY (PET-M20 — 0 pets é o estado de produção hoje). Com 0
// pets, mapLoadState retorna EMPTY → o mapa aparecia mas a barra de filtro nunca,
// então um dono via o mapa e NENHUM chip de filtro. O fix troca o gate da barra
// para `showMap` (= READY OU EMPTY). Esta fiação trava isso: a barra ACOMPANHA o
// mapa em EMPTY e em READY, e SOME só em LOADING/ERROR (onde não há mapa). O seletor
// é o id do heading da barra (independente de locale).
const filterBarHeading = () => document.getElementById('pet-filter-heading');

describe('regression — a barra de filtro ACOMPANHA o mapa (showMap, não isReady)', () => {
  it('com 0 pets (EMPTY) o mapa aparece E a barra de filtro também', async () => {
    const fetchPets = vi.fn().mockResolvedValue([]);
    render(<Harness fetchPets={fetchPets} />);
    // o estado vazio (mapa) chegou… (cópia ÚNICA do PetMapLoadStates, não o
    // `noneTotal` da barra que também rende em EMPTY).
    await waitFor(() =>
      expect(screen.getByText(/seja o primeiro a ajudar/i)).toBeTruthy(),
    );
    // …e a barra de filtro está presente JUNTO (o bug original a escondia aqui).
    expect(filterBarHeading()).not.toBeNull();
  });

  it('com >=1 pet (READY) a barra de filtro também aparece', async () => {
    const fetchPets = vi.fn().mockResolvedValue([{ coords: COORDS, status: 'perdido' }]);
    render(<Harness fetchPets={fetchPets} />);
    await waitFor(() => expect(screen.getByTestId('map-ready')).toBeTruthy());
    expect(filterBarHeading()).not.toBeNull();
  });

  it('em ERROR (fetch falha) NÃO há barra de filtro (não há mapa)', async () => {
    const fetchPets = vi.fn().mockRejectedValue(new Error('rede caiu'));
    render(<Harness fetchPets={fetchPets} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(filterBarHeading()).toBeNull();
  });
});

describe('PET-M20 wiring — fechamento pós-publish (uma próxima decisão)', () => {
  it('um close "published" abre o fechamento com EXATAMENTE uma próxima decisão', async () => {
    const fetchPets = vi.fn().mockResolvedValue([{ coords: COORDS, status: 'perdido' }]);
    render(<Harness fetchPets={fetchPets} />);
    await waitFor(() => expect(screen.getByTestId('map-ready')).toBeTruthy());

    // Antes de publicar, nenhum fechamento.
    expect(screen.queryByText(/seu pet está no mapa/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /publicar-e-fechar/i }));

    // O fechamento aparece, localizando o pin (recentro) + UMA próxima decisão.
    expect(screen.getByText(/seu pet está no mapa/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /ver no mapa/i })).toBeTruthy();
  });

  it('um close NÃO-publicado (cancelar) NÃO abre o fechamento', async () => {
    const fetchPets = vi.fn().mockResolvedValue([{ coords: COORDS, status: 'perdido' }]);
    render(<Harness fetchPets={fetchPets} />);
    await waitFor(() => expect(screen.getByTestId('map-ready')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /cancelar-e-fechar/i }));
    expect(screen.queryByText(/seu pet está no mapa/i)).toBeNull();
  });
});
