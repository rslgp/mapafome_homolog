// petDeepLink.test.js — PET-M18: deep link de UM pet via param de URL.
//
// Cobre, no DOMÍNIO PURO (petDomain), a IDENTIDADE de report coords-keyed e
// PII-free + o parsing do param, contra as acceptance lines do PET-M18 (YAML):
//   1. A identidade do link é coords-keyed (rounded "lat,lng"), PII-free (NUNCA
//      contato/nome/texto) — uma SOT (petCoordsKey) reusada pelo M18 E pelo M13.
//   2. findPetByCoordsKey acha o pet certo (found) e degrada calmamente (not found
//      → null) — a base da "degradação calma" quando o pet sumiu/arquivou/reuniu.
//   3. parsePetDeepLinkParam desembrulha o param de uma query string (e o ausente
//      vira null) — a base do "não havia param → mapa normal".
//   4. O round-trip é ESTÁVEL: a chave gerada de um pet casa o mesmo pet de volta
//      (um link copiado/colado não depende do último bit de um float).
//
// São funções PURAS: sem mock, sem timers, sem render, sem window (o boundary que
// lê window.location.search vive em PetsApp; aqui injetamos a string de busca).

import { describe, it, expect } from 'vitest';
import {
  petCoordsKey,
  findPetByCoordsKey,
  normalizeCoordsKey,
  parsePetDeepLinkParam,
  PET_COORDS_KEY_PRECISION,
  PET_DEEPLINK_PARAM,
  buildPetDados,
  parsePetRow,
  PET_KIND,
} from './petDomain';

const COORDS = [-8.0671132, -34.8766719];

// Empacota um blob Dados como a planilha o devolve (.Dados = JSON-string), para
// exercitar o round-trip real publish → parse → key (a forma que o PetsApp casa).
function asRow(dados) {
  return { Dados: JSON.stringify(dados) };
}

function petAt(coords, extra = {}) {
  const dados = buildPetDados({
    coords,
    status: 'perdido',
    dateIso: '2026-06-11T00:00:00.000Z',
    ...extra,
  });
  return parsePetRow(asRow(dados));
}

describe('petCoordsKey — identidade coords-keyed, PII-free, determinística (SOT)', () => {
  it('arredonda lat/lng à precisão da chave e junta com vírgula', () => {
    expect(petCoordsKey(COORDS)).toBe('-8.067113,-34.876672');
  });

  it('a precisão é a constante exportada (6 casas — ~11 cm)', () => {
    expect(PET_COORDS_KEY_PRECISION).toBe(6);
    const key = petCoordsKey([1, 2]);
    expect(key).toBe('1.000000,2.000000'); // sempre 6 casas, estável
  });

  it('NÃO contém nenhum dado PII (só números e vírgula — nunca contato/nome)', () => {
    const key = petCoordsKey(COORDS);
    // Apenas dígitos, ponto, sinal e UMA vírgula separadora.
    expect(key).toMatch(/^-?\d+\.\d{6},-?\d+\.\d{6}$/);
  });

  it('é DETERMINÍSTICO: mesma entrada → mesma chave', () => {
    expect(petCoordsKey(COORDS)).toBe(petCoordsKey(COORDS));
  });

  it('é IDEMPOTENTE no round-trip: re-keyar uma chave dá a mesma chave', () => {
    const k1 = petCoordsKey(COORDS);
    const back = normalizeCoordsKey(k1);
    expect(back).toBe(k1);
  });

  it('colapsa pequenas variações de float na MESMA chave (estável a copiar/colar)', () => {
    // Duas representações que diferem além da 6ª casa devem dar a MESMA chave.
    const a = petCoordsKey([-8.06711300001, -34.87667199998]);
    const b = petCoordsKey([-8.0671130, -34.8766720]);
    expect(a).toBe(b);
  });

  it('normaliza -0 para 0 (não emite "-0.000000")', () => {
    const key = petCoordsKey([-0, 0]);
    expect(key).toBe('0.000000,0.000000');
  });

  it('defende contra coords inválidas → null (nunca lança)', () => {
    for (const bad of [null, undefined, [], [1], [1, 2, 3], ['a', 'b'], [NaN, 2], [1, Infinity], 'x', 42]) {
      expect(() => petCoordsKey(bad)).not.toThrow();
      expect(petCoordsKey(bad)).toBeNull();
    }
  });
});

describe('normalizeCoordsKey — canoniza uma key crua de URL', () => {
  it('aceita "lat,lng" e devolve a forma canônica de 6 casas', () => {
    expect(normalizeCoordsKey('-8.0671132,-34.8766719')).toBe('-8.067113,-34.876672');
  });

  it('tolera espaços nas pontas dos números', () => {
    expect(normalizeCoordsKey(' -8.0671132 , -34.8766719 ')).toBe('-8.067113,-34.876672');
  });

  it('casa uma key de precisão diferente à mesma forma canônica', () => {
    // Uma fonte que mandou 5 casas ainda casa a chave de 6 do pet.
    expect(normalizeCoordsKey('1.00000,2.00000')).toBe(petCoordsKey([1, 2]));
  });

  it('param lixo/adulterado → null (nunca casa um pet)', () => {
    for (const bad of [null, undefined, '', 'abc', '1', '1,2,3', 'a,b', ',', '1,', ',2', 42, {}]) {
      expect(() => normalizeCoordsKey(bad)).not.toThrow();
      expect(normalizeCoordsKey(bad)).toBeNull();
    }
  });
});

describe('findPetByCoordsKey — acha o pet (found) e degrada calmo (not found)', () => {
  const lost = petAt([-8.0671132, -34.8766719]);
  const found = petAt([-8.05, -34.90], { status: 'encontrado' });
  const pets = [lost, found];

  it('FOUND: a chave de um pet casa exatamente aquele pet', () => {
    const key = petCoordsKey(lost.coords);
    expect(findPetByCoordsKey(pets, key)).toBe(lost);
    expect(findPetByCoordsKey(pets, petCoordsKey(found.coords))).toBe(found);
  });

  it('round-trip de ponta a ponta: key(pet) → findPet → o MESMO pet', () => {
    for (const p of pets) {
      const key = petCoordsKey(p.coords);
      expect(findPetByCoordsKey(pets, key)).toBe(p);
    }
  });

  it('NOT FOUND: uma key que não casa nenhum pet → null (degradação calma)', () => {
    // Coords longe de qualquer pet carregado — simula sumiu/arquivado/reunido.
    expect(findPetByCoordsKey(pets, petCoordsKey([10, 10]))).toBeNull();
  });

  it('NOT FOUND: lista vazia (nenhum pet carregado) → null', () => {
    expect(findPetByCoordsKey([], petCoordsKey(lost.coords))).toBeNull();
  });

  it('aceita uma key crua de URL (re-arredonda via normalizeCoordsKey)', () => {
    // Um link gerado em outra precisão ainda aterrissa no pet certo.
    expect(findPetByCoordsKey(pets, '-8.0671132,-34.8766719')).toBe(lost);
  });

  it('defende contra entradas malformadas → null, nunca lança', () => {
    expect(() => findPetByCoordsKey(null, 'x')).not.toThrow();
    expect(findPetByCoordsKey(null, petCoordsKey(lost.coords))).toBeNull();
    expect(findPetByCoordsKey(pets, null)).toBeNull();
    expect(findPetByCoordsKey(pets, '')).toBeNull();
    expect(findPetByCoordsKey(pets, 'lixo')).toBeNull();
    // pets com elementos malformados na lista não derrubam a busca.
    expect(findPetByCoordsKey([null, undefined, {}, lost], petCoordsKey(lost.coords))).toBe(lost);
  });
});

describe('o deep link ENCONTRA o pet mesmo que um filtro/idade o esconderia', () => {
  // PET-M18 hard constraint: o link é um pedido EXPLÍCITO; honra o pet mesmo que o
  // M7 (filtro) ou o M12 (idade) o tirariam do mapa por padrão. Aqui validamos no
  // nível da SOT: findPetByCoordsKey busca na lista COMPLETA, sem aplicar filtro
  // nem exclusão por idade — então um pet "que sumiria do mapa" ainda é achado.
  it('um pet REUNIDO (sairia do mapa ativo) ainda é encontrado pela sua chave', () => {
    const reunido = petAt([-8.10, -34.95], {
      status: 'encontrado',
      resolvedAt: '2026-06-10T00:00:00.000Z',
    });
    const pets = [reunido];
    // O mapa ativo (PET-M2/M12) o excluiria; o deep link, não.
    expect(findPetByCoordsKey(pets, petCoordsKey(reunido.coords))).toBe(reunido);
  });
});

describe('parsePetDeepLinkParam — desembrulha o param de uma query string', () => {
  it('o nome do param é a constante SOT exportada', () => {
    expect(PET_DEEPLINK_PARAM).toBe('pet');
  });

  it('extrai o valor cru de "?pet=<key>"', () => {
    expect(parsePetDeepLinkParam('?pet=-8.067113,-34.876672')).toBe('-8.067113,-34.876672');
  });

  it('aceita a query SEM a "?" inicial', () => {
    expect(parsePetDeepLinkParam('pet=-8.067113,-34.876672')).toBe('-8.067113,-34.876672');
  });

  it('decodifica a vírgula percent-encoded (%2C) — um link real escapa a vírgula', () => {
    expect(parsePetDeepLinkParam('?pet=-8.067113%2C-34.876672')).toBe('-8.067113,-34.876672');
  });

  it('ignora outros params e pega só o "pet"', () => {
    expect(parsePetDeepLinkParam('?foo=1&pet=1.000000,2.000000&bar=2')).toBe('1.000000,2.000000');
  });

  it('SEM o param → null (o "não havia param → mapa normal")', () => {
    expect(parsePetDeepLinkParam('?foo=1&bar=2')).toBeNull();
    expect(parsePetDeepLinkParam('')).toBeNull();
    expect(parsePetDeepLinkParam('?pet=')).toBeNull();   // presente mas vazio
    expect(parsePetDeepLinkParam('?pet=%20%20')).toBeNull(); // só espaços → null
  });

  it('defende contra entrada não-string → null, nunca lança', () => {
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(() => parsePetDeepLinkParam(bad)).not.toThrow();
      expect(parsePetDeepLinkParam(bad)).toBeNull();
    }
  });
});

describe('FLUXO COMPLETO — param de URL → pet (ou degradação calma)', () => {
  // Simula o que o PetsApp faz, sem o React: ler o param e casar contra os pets.
  const lost = petAt([-8.0671132, -34.8766719]);
  const pets = [lost];

  function resolveFromSearch(search, loadedPets) {
    const raw = parsePetDeepLinkParam(search);
    if (raw === null) return { kind: 'no-param' };
    const target = findPetByCoordsKey(loadedPets, raw);
    return target ? { kind: 'found', pet: target } : { kind: 'missing' };
  }

  it('um link válido aterrissa no pet (found)', () => {
    const search = `?${PET_DEEPLINK_PARAM}=${petCoordsKey(lost.coords)}`;
    const out = resolveFromSearch(search, pets);
    expect(out.kind).toBe('found');
    expect(out.pet).toBe(lost);
  });

  it('um link cujo pet sumiu degrada calmo (missing → a nota pt-BR)', () => {
    const search = `?${PET_DEEPLINK_PARAM}=${petCoordsKey([10, 10])}`;
    expect(resolveFromSearch(search, pets).kind).toBe('missing');
  });

  it('sem param: nenhuma ação (no-param → mapa normal)', () => {
    expect(resolveFromSearch('?foo=1', pets).kind).toBe('no-param');
  });

  it('param lixo: degrada calmo (missing), nunca crash', () => {
    expect(resolveFromSearch('?pet=lixo', pets).kind).toBe('missing');
  });

  it('legado: uma linha antiga (kind:pet, sem campos novos) ainda casa por coords', () => {
    const legacy = parsePetRow(asRow({
      kind: PET_KIND,
      status: 'perdido',
      Coordinates: JSON.stringify([-8.0671132, -34.8766719]),
      DateISO: '2026-01-01T00:00:00.000Z',
    }));
    const search = `?${PET_DEEPLINK_PARAM}=${petCoordsKey(legacy.coords)}`;
    expect(resolveFromSearch(search, [legacy]).kind).toBe('found');
  });
});
