// petFreetextHygiene.test.js — PET-M3 (deliverable d).
//
// Cobre o sanitizer PURO de texto livre (petDomain.sanitizeFreeText) e a sua
// aplicação dentro de buildPetDados sobre name/color/detail. As três garantias
// que importam:
//   1. CAP de comprimento por campo (PET_FREETEXT_MAXLEN é a SOT do limite);
//   2. STRIP de caracteres de CONTROLE (C0/DEL/C1) — a barricada de higiene;
//   3. pt-BR SOBREVIVE — acentos, ç, ã, é... NÃO são tocados (corromper idioma
//      seria um bug, não uma defesa). Inclui emoji (par substituto) para provar
//      que o cap por code point não parte um caractere ao meio.
//
// O sanitizer é DETERMINÍSTICO (sem Date.now()): a mesma entrada → a mesma saída,
// então as asserções de igualdade são estáveis.

import { describe, it, expect } from 'vitest';
import {
  sanitizeFreeText,
  buildPetDados,
  PET_FREETEXT_MAXLEN,
} from './petDomain';

const COORDS = [-8.0671132, -34.8766719];
const ISO = '2026-06-11T12:00:00.000Z';

describe('sanitizeFreeText — strip de controle + cap, sem corromper pt-BR', () => {
  it('preserva acentos, ç e ã (Unicode imprimível intacto)', () => {
    const input = 'Açaí é ótimo, cão grandão João';
    expect(sanitizeFreeText(input, 100)).toBe('Açaí é ótimo, cão grandão João');
  });

  it('remove caracteres de controle C0 (\\x00–\\x1F incl. \\t \\n \\r)', () => {
    const input = 'linha1\nlinha2\tcom\rtabs\x00\x07e nulos';
    const out = sanitizeFreeText(input, 100);
    // Nenhum caractere de controle sobra.
    expect(/[\x00-\x1f]/.test(out)).toBe(false);
    // As palavras NÃO colam (o controle vira espaço, depois colapsa).
    expect(out).toBe('linha1 linha2 com tabs e nulos');
  });

  it('remove DEL (\\x7F) e controles C1 (\\x80–\\x9F), mantém imprimível >= \\xA0', () => {
    const input = 'a\x7Fb\x85c';            // DEL + NEL (C1)
    expect(sanitizeFreeText(input, 100)).toBe('a b c');
    // é = é (imprimível, NÃO é controle) sobrevive.
    expect(sanitizeFreeText('café', 100)).toBe('café');
  });

  it('aplica o cap de comprimento (corta no limite)', () => {
    const input = 'x'.repeat(200);
    expect(sanitizeFreeText(input, 40).length).toBe(40);
  });

  it('não parte um emoji (par substituto) ao aplicar o cap por code point', () => {
    // 🐶 é um par substituto (2 unidades UTF-16). Capando em 3 code points,
    // ou ele entra inteiro ou não entra — nunca metade (que viraria �).
    const input = 'ab🐶cd';
    const out = sanitizeFreeText(input, 3);
    expect(out).toBe('ab🐶');
    expect(out.includes('�')).toBe(false);
  });

  it('é determinístico: mesma entrada → mesma saída', () => {
    const input = 'detalhe\tcom  espaços   e\ncontrole';
    expect(sanitizeFreeText(input, 50)).toBe(sanitizeFreeText(input, 50));
  });

  it('entrada vazia/nula → string vazia (nunca lança)', () => {
    expect(sanitizeFreeText('', 40)).toBe('');
    expect(sanitizeFreeText(null, 40)).toBe('');
    expect(sanitizeFreeText(undefined, 40)).toBe('');
  });
});

describe('buildPetDados — name/color/detail passam pela higiene (não mais cru)', () => {
  it('strip de controle em name/color/detail; pt-BR preservado', () => {
    const dados = buildPetDados({
      coords: COORDS,
      status: 'perdido',
      name: 'Rex\x00\x07',
      color: 'caramelo\té dourado',
      detail: 'visto na pra\nça; coleira ç ã',
      dateIso: ISO,
    });
    expect(dados.name).toBe('Rex');
    expect(dados.color).toBe('caramelo é dourado');
    expect(dados.Detalhe).toBe('visto na pra ça; coleira ç ã');
    // Nenhum campo carrega caractere de controle.
    for (const v of [dados.name, dados.color, dados.Detalhe]) {
      expect(/[\x00-\x1f\x7f-\x9f]/.test(v)).toBe(false);
    }
  });

  it('respeita o cap por campo (SOT PET_FREETEXT_MAXLEN)', () => {
    const dados = buildPetDados({
      coords: COORDS,
      status: 'avistado',
      name: 'n'.repeat(100),
      color: 'c'.repeat(100),
      detail: 'd'.repeat(300),
      dateIso: ISO,
    });
    expect(dados.name.length).toBe(PET_FREETEXT_MAXLEN.name);
    expect(dados.color.length).toBe(PET_FREETEXT_MAXLEN.color);
    expect(dados.Detalhe.length).toBe(PET_FREETEXT_MAXLEN.detail);
  });

  it('campos ausentes caem para string vazia (sem regressão do || \'\')', () => {
    const dados = buildPetDados({ coords: COORDS, status: 'encontrado', dateIso: ISO });
    expect(dados.name).toBe('');
    expect(dados.color).toBe('');
    expect(dados.Detalhe).toBe('');
  });
});
