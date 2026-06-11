// petAnalytics.test.js — PET-M21.
//
// Cobre o FUNIL de observabilidade do /pets sobre o seam analytics.track EXISTENTE.
// `analytics.track` é MOCKADO: provamos (1) que cada emissor chama track com o NOME
// de evento certo e a propriedade esperada (incl. o reasonCode DIFERENCIADO do
// PET-M1 na falha); e (2) a INVARIANTE DURA de PII — nenhum contato, texto livre
// (name/color/detail) ou nome do pet aparece em NENHUM payload de evento, MESMO
// quando o chamador passa o pet/payload inteiro (a allow-list barra). Status/espécie/
// motivo de fechamento/reasonCode vêm da SOT petDomain — nunca hardcoded aqui.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do seam de transporte EXISTENTE — não testamos o gtag/dataLayer/sessionStorage
// (isso é do analytics.js), só que o FUNIL chama o seam com a forma certa.
const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }));
vi.mock('../components/compatibility/components/ux/analytics', () => ({
  track: mockTrack,
}));

import {
  PET_EVENT,
  roundCoord,
  trackReportStarted,
  trackReportPublished,
  trackReportFailed,
  trackPetOpened,
  trackMarkedReunido,
  trackEncerrouBusca,
} from './petAnalytics';
import { PET_PUBLISH_FAILURE, PET_CLOSURE_REASON } from './petDomain';

beforeEach(() => {
  mockTrack.mockClear();
});

// Helpers de leitura do mock: nome do evento + propriedades do último track().
function lastCall() {
  expect(mockTrack).toHaveBeenCalled();
  const calls = mockTrack.mock.calls;
  return calls[calls.length - 1];
}
function lastName() {
  return lastCall()[0];
}
function lastProps() {
  return lastCall()[1] || {};
}

// Strings de PII semeadas nos payloads de entrada para provar que NÃO vazam.
const PII = {
  contact: '+55 81 99999-0000',
  name: 'Rex',
  color: 'caramelo com mancha branca',
  detail: 'visto na Rua das Flores 123, perto da padaria',
};

// Junta TODOS os valores de string de um payload (recursivo) para a varredura de PII.
function flattenStrings(obj, acc = []) {
  if (obj == null) return acc;
  if (typeof obj === 'string') { acc.push(obj); return acc; }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      acc.push(k); // a CHAVE também não pode ser 'contact'/'name'/'detail'/'color'
      flattenStrings(obj[k], acc);
    }
  }
  return acc;
}

// Asserção central da invariante: nenhum valor/chave do payload contém PII semeada.
function assertNoPii(props) {
  const haystack = flattenStrings(props).join(' || ').toLowerCase();
  for (const v of Object.values(PII)) {
    expect(haystack).not.toContain(v.toLowerCase());
  }
  // E nenhuma CHAVE de PII (contact/name/color/detail) no payload.
  for (const banned of ['contact', 'name', 'color', 'detail']) {
    expect(Object.prototype.hasOwnProperty.call(props, banned)).toBe(false);
  }
}

describe('petAnalytics — nomes de evento do funil (SOT)', () => {
  it('cada emissor dispara o NOME de evento estável do PET_EVENT', () => {
    trackReportStarted({});
    expect(lastName()).toBe(PET_EVENT.REPORT_STARTED);

    trackReportPublished({ status: 'perdido', species: 'cao' });
    expect(lastName()).toBe(PET_EVENT.REPORT_PUBLISHED);

    trackReportFailed({ reasonCode: PET_PUBLISH_FAILURE.OFFLINE, queued: true });
    expect(lastName()).toBe(PET_EVENT.REPORT_FAILED);

    trackPetOpened({ status: 'encontrado' });
    expect(lastName()).toBe(PET_EVENT.OPENED);

    trackMarkedReunido({ status: 'perdido' });
    expect(lastName()).toBe(PET_EVENT.MARKED_REUNIDO);

    trackEncerrouBusca({ status: 'perdido' });
    expect(lastName()).toBe(PET_EVENT.ENCERROU_BUSCA);

    // Seis eventos do funil, seis nomes distintos com prefixo pet_.
    const names = Object.values(PET_EVENT);
    expect(new Set(names).size).toBe(6);
    for (const n of names) expect(n.startsWith('pet_')).toBe(true);
  });
});

describe('petAnalytics — report_failed carrega o reasonCode DIFERENCIADO (PET-M1)', () => {
  it('cada classe de falha da SOT vira a propriedade `reason` do evento', () => {
    for (const code of Object.values(PET_PUBLISH_FAILURE)) {
      trackReportFailed({ reasonCode: code, queued: false });
      const props = lastProps();
      expect(props.reason).toBe(code);
      expect(props.queued).toBe(false);
    }
  });

  it('o flag `queued` (confiabilidade do PET-M1) é booleano e é refletido', () => {
    trackReportFailed({ reasonCode: PET_PUBLISH_FAILURE.OFFLINE, queued: true });
    expect(lastProps().queued).toBe(true);
  });

  it('reasonCode lixo/ausente cai no fallback GENERIC (nunca um código cru)', () => {
    trackReportFailed({ reasonCode: 'lixo_desconhecido', queued: false });
    expect(lastProps().reason).toBe(PET_PUBLISH_FAILURE.GENERIC);

    trackReportFailed({});
    expect(lastProps().reason).toBe(PET_PUBLISH_FAILURE.GENERIC);
  });
});

describe('petAnalytics — desfechos reunido/encerrar carregam o motivo da SOT', () => {
  it('marked_reunido usa PET_CLOSURE_REASON.REUNIDO', () => {
    trackMarkedReunido({ status: 'perdido' });
    expect(lastProps().reason).toBe(PET_CLOSURE_REASON.REUNIDO);
  });
  it('encerrou_busca usa PET_CLOSURE_REASON.ENCERRADO', () => {
    trackEncerrouBusca({ status: 'perdido' });
    expect(lastProps().reason).toBe(PET_CLOSURE_REASON.ENCERRADO);
  });
});

describe('petAnalytics — status/espécie enumerados são preservados', () => {
  it('report_published mantém status + species (ids da SOT, não texto livre)', () => {
    trackReportPublished({ status: 'avistado', species: 'gato' });
    expect(lastProps().status).toBe('avistado');
    expect(lastProps().species).toBe('gato');
  });
  it('campos enumerados vazios são OMITIDOS (payload enxuto)', () => {
    trackReportStarted({});
    expect(Object.prototype.hasOwnProperty.call(lastProps(), 'species')).toBe(false);
  });
});

// ─── A INVARIANTE DURA: ZERO PII em QUALQUER evento ──────────────────────────
// Cada emissor é chamado com um objeto que CONTÉM PII semeada (contato, nome, cor,
// detalhe). A allow-list de cada emissor deve descartar tudo isso — provamos que
// nenhum valor/chave de PII chega ao payload de track. Esta é a forcing-function da
// PET-M21 (um teste, não um comentário "lembre-se de não vazar").
describe('petAnalytics — NENHUM contato/texto-livre/nome vaza para um evento (PII)', () => {
  const cases = [
    ['report_started', () => trackReportStarted({ species: 'cao', ...PII })],
    ['report_published', () => trackReportPublished({ status: 'perdido', species: 'cao', ...PII })],
    ['report_failed', () => trackReportFailed({ reasonCode: PET_PUBLISH_FAILURE.GENERIC, queued: false, ...PII })],
    ['pet_opened', () => trackPetOpened({ status: 'encontrado', ...PII })],
    ['marked_reunido', () => trackMarkedReunido({ status: 'perdido', ...PII })],
    ['encerrou_busca', () => trackEncerrouBusca({ status: 'perdido', ...PII })],
  ];

  for (const [label, emit] of cases) {
    it(`${label}: payload não contém contato/nome/cor/detalhe`, () => {
      emit();
      assertNoPii(lastProps());
    });
  }

  it('mesmo recebendo um PET INTEIRO (forma do parsePetRow), só sai o enumerado', () => {
    // Simula um chamador que, por engano, passa o pet inteiro — incl. coords, contato,
    // nome, detalhe. A allow-list deve manter SÓ status (e nada de coords/PII).
    const wholePet = {
      coords: [-8.0671132, -34.8766719],
      status: 'perdido',
      species: 'cao',
      name: PII.name,
      color: PII.color,
      contact: PII.contact,
      detail: PII.detail,
      dateIso: '2026-06-10T00:00:00.000Z',
    };
    trackPetOpened(wholePet);
    const props = lastProps();
    expect(props.status).toBe('perdido');
    // Nenhuma coord no payload (omitidas por design).
    expect(Object.prototype.hasOwnProperty.call(props, 'coords')).toBe(false);
    assertNoPii(props);
  });
});

describe('petAnalytics — roundCoord espelha a precisão do analytics.js (paridade)', () => {
  it('arredonda a 6 casas (~11 cm) e devolve null para não-número', () => {
    expect(roundCoord(-8.06711321234)).toBe(-8.067113);
    expect(roundCoord(NaN)).toBe(null);
    expect(roundCoord('-8.06')).toBe(null);
    expect(roundCoord(undefined)).toBe(null);
  });
});
