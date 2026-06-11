// petMarkerIcon.test.js — PET-M5 (gap-fill for the marker-icon factory).
//
// petContactPrivacy já prova que o ícone é construído SÓ de {status, species}
// (não vaza PII). ESTE arquivo cobre o MAPEAMENTO visual que ainda faltava:
//   • ringWidthFor — a largura do anel por status E o fallback seguro para um
//     status desconhecido (a regra-chave nomeada no PET-M5);
//   • status → glifo/forma — cada status emite a sua FORMA distinta (a segurança
//     para daltônicos: a forma carrega o significado, não só a cor);
//   • avistado usa anel TRACEJADO (stroke-dasharray); perdido/encontrado não;
//   • a cor do anel referencia var(--pet-<status>) — nunca hex cru (SOT de cor);
//   • o reforço de espécie (cao/gato) entra como decorativo, sem mudar o status.
//
// Os ids de status vêm da SOT (PET_STATUS_MAP), não hardcoded. Asserções sobre o
// HTML do divIcon (options.html) — leaflet roda em jsdom para construir o divIcon,
// mas NÃO renderizamos um mapa (excluído no PET-M5).

import { describe, it, expect } from 'vitest';
import {
  buildPetMarkerIcon,
  ringWidthFor,
  lifecycleStyleFor,
  lifecycleForPet,
  petMarkerSvg,
  PET_LIFECYCLE,
} from './petMarkerIcon';
import { PET_STATUSES } from './petDomain';

function html(status, species, lifecycle) {
  return buildPetMarkerIcon({ status, species, lifecycle }).options.html;
}

describe('ringWidthFor — largura do anel por status + fallback', () => {
  it('encontrado tem o anel mais grosso; perdido o mais fino; avistado no meio', () => {
    // Encoda a relação como detector (não um comentário que pede pra lembrar):
    // pet a salvo = anel forte; sumiu = anel fino+urgente; visto = intermediário.
    expect(ringWidthFor('encontrado')).toBeGreaterThan(ringWidthFor('avistado'));
    expect(ringWidthFor('avistado')).toBeGreaterThan(ringWidthFor('perdido'));
  });

  it('status DESCONHECIDO cai no fallback seguro (largura > 0, nunca lança)', () => {
    // A regra nomeada no PET-M5: nenhum status quebra o ícone.
    expect(() => ringWidthFor('inexistente')).not.toThrow();
    expect(ringWidthFor('inexistente')).toBeGreaterThan(0);
    expect(ringWidthFor(undefined)).toBeGreaterThan(0);
    expect(ringWidthFor(null)).toBeGreaterThan(0);
  });

  it('todo status da SOT tem uma largura de anel finita e positiva', () => {
    for (const s of PET_STATUSES) {
      expect(Number.isFinite(ringWidthFor(s.id))).toBe(true);
      expect(ringWidthFor(s.id)).toBeGreaterThan(0);
    }
  });
});

describe('buildPetMarkerIcon — status → forma/glifo distinto (segurança p/ daltônicos)', () => {
  it('a cor do anel referencia var(--pet-<status>) — nunca hex cru', () => {
    for (const s of PET_STATUSES) {
      const out = html(s.id, 'outro');
      expect(out).toContain(`var(--pet-${s.id})`);
      // Forcing-function: nenhum literal hex de cor vaza para o SVG do marcador.
      expect(out).not.toMatch(/#[0-9a-fA-F]{6}/);
    }
  });

  it('cada status produz uma FORMA distinta (não só uma cor distinta)', () => {
    const perdido = html('perdido', 'outro');
    const encontrado = html('encontrado', 'outro');
    const avistado = html('avistado', 'outro');
    // encontrado → check (um <path> com d=); avistado → olho (<ellipse>); perdido
    // → "!" (<rect> + <circle> de alerta). As três strings de glifo diferem.
    expect(encontrado).toContain('<path');         // check
    expect(avistado).toContain('<ellipse');        // olho
    expect(perdido).toContain('<rect');            // "!"
    expect(perdido).not.toEqual(encontrado);
    expect(encontrado).not.toEqual(avistado);
    expect(avistado).not.toEqual(perdido);
  });

  it('avistado usa anel TRACEJADO; perdido/encontrado usam anel sólido', () => {
    expect(html('avistado', 'outro')).toContain('stroke-dasharray');
    expect(html('perdido', 'outro')).not.toContain('stroke-dasharray');
    expect(html('encontrado', 'outro')).not.toContain('stroke-dasharray');
  });

  it('a className do divIcon carrega o status (pet-marker--<status>)', () => {
    for (const s of PET_STATUSES) {
      expect(buildPetMarkerIcon({ status: s.id, species: 'outro' }).options.className)
        .toContain(`pet-marker--${s.id}`);
    }
  });
});

describe('buildPetMarkerIcon — reforço de espécie (decorativo, não muda o status)', () => {
  it('cao e gato adicionam um glifo de reforço; outro/desconhecido não', () => {
    // A espécie só DECORA — o status já é distinguível sem ela. Provamos que o
    // reforço aparece para cao/gato e some para 'outro' (mesma forma de status,
    // HTML mais curto sem o <path> extra de orelhas).
    const gato = html('perdido', 'gato');
    const cao = html('perdido', 'cao');
    const outro = html('perdido', 'outro');
    expect(gato.length).toBeGreaterThan(outro.length);
    expect(cao.length).toBeGreaterThan(outro.length);
    expect(gato).not.toEqual(cao); // orelhas de gato ≠ orelhas de cão
  });

  it('o status manda na forma mesmo com espécie variando (gato perdido ≠ gato encontrado)', () => {
    expect(html('perdido', 'gato')).not.toEqual(html('encontrado', 'gato'));
  });
});

// ─── PET-M11(d) — dimensão de CICLO DE VIDA (fresh / aged / reunido) ─────────
//
// O helper PURO lifecycleStyleFor (espelha ringWidthFor) mapeia {status,lifecycle}
// para a receita de anel/glifo, lendo SÓ tokens --pet-* (sem hex). Provamos:
//   • aged abafa por VALOR (token -ink mais escuro), NUNCA por opacidade, e ganha
//     uma PISTA SECUNDÁRIA não-opacidade (o arco de "desgaste");
//   • reunido sobrepõe um GLIFO de CORAÇÃO (forma exclusiva) → mono-distinguível
//     em escala de cinza dos 3 status ativos por SHAPE, não só por cor;
//   • o default seguro é 'fresh' p/ lifecycle desconhecido/ausente;
//   • nenhum hex cru vaza em nenhum estado de ciclo de vida.

describe('lifecycleStyleFor — helper puro de ciclo de vida (espelha ringWidthFor)', () => {
  it('default seguro: lifecycle desconhecido/ausente → fresh, anel na cor do status', () => {
    for (const s of PET_STATUSES) {
      expect(lifecycleStyleFor(s.id, undefined).lifecycle).toBe(PET_LIFECYCLE.FRESH);
      expect(lifecycleStyleFor(s.id, 'inexistente').lifecycle).toBe(PET_LIFECYCLE.FRESH);
      // fresh usa --pet-<status> (não o -ink): sem deslocamento de valor.
      expect(lifecycleStyleFor(s.id, 'fresh').strokeVar).toBe(`var(--pet-${s.id})`);
    }
  });

  it('a largura/dash do anel vêm do STATUS, iguais entre os ciclos de vida (LSP)', () => {
    for (const s of PET_STATUSES) {
      const fresh = lifecycleStyleFor(s.id, 'fresh');
      const aged = lifecycleStyleFor(s.id, 'aged');
      const reunido = lifecycleStyleFor(s.id, 'reunido');
      expect(fresh.ringWidth).toBe(ringWidthFor(s.id));
      expect(aged.ringWidth).toBe(ringWidthFor(s.id));
      expect(reunido.ringWidth).toBe(ringWidthFor(s.id));
      expect(aged.dash).toBe(fresh.dash);
    }
  });

  it('aged abafa por VALOR (token -ink mais escuro), nunca por opacidade', () => {
    for (const s of PET_STATUSES) {
      const aged = lifecycleStyleFor(s.id, 'aged');
      // O anel passa a usar o token -ink (mais escuro = MAIOR contraste, >=3:1),
      // não uma transparência: a regra é "abafar por valor, não por opacidade".
      expect(aged.strokeVar).toBe(`var(--pet-${s.id}-ink)`);
      expect(aged.agedCue).toBe(true); // pista secundária não-opacidade presente
    }
  });

  it('só reunido carrega o glifo sobreposto (coração), preenchido com --pet-reunido', () => {
    for (const s of PET_STATUSES) {
      expect(lifecycleStyleFor(s.id, 'reunido').overlayGlyph).toBe('heart');
      expect(lifecycleStyleFor(s.id, 'reunido').overlayVar).toBe('var(--pet-reunido)');
      expect(lifecycleStyleFor(s.id, 'fresh').overlayGlyph).toBeNull();
      expect(lifecycleStyleFor(s.id, 'aged').overlayGlyph).toBeNull();
    }
  });

  it('nunca lança em entrada desconhecida (status e lifecycle)', () => {
    expect(() => lifecycleStyleFor('inexistente', 'inexistente')).not.toThrow();
    expect(() => lifecycleStyleFor(undefined, undefined)).not.toThrow();
    expect(() => lifecycleStyleFor(null, null)).not.toThrow();
    expect(lifecycleStyleFor(undefined, undefined).ringWidth).toBeGreaterThan(0);
  });
});

describe('petMarkerSvg / buildPetMarkerIcon — render por ciclo de vida', () => {
  it('aged desenha a pista secundária (arco tracejado) que o fresh NÃO tem', () => {
    const fresh = html('perdido', 'outro', 'fresh');
    const aged = html('perdido', 'outro', 'aged');
    // O arco de "desgaste" é um <path> com 'A' (arco) + dasharray que só o aged
    // emite — a distinção não é opacidade, é uma FORMA a mais.
    expect(aged.length).toBeGreaterThan(fresh.length);
    expect(aged).toContain('stroke-dasharray="2 2.5"');
    expect(fresh).not.toContain('stroke-dasharray="2 2.5"');
    // aged pinta o anel com o token -ink (deslocamento de VALOR, não opacidade).
    expect(aged).toContain('var(--pet-perdido-ink)');
  });

  it('reunido sobrepõe o coração (--pet-reunido); fresh/aged não — distinção por SHAPE', () => {
    const reunido = html('encontrado', 'outro', 'reunido');
    const fresh = html('encontrado', 'outro', 'fresh');
    expect(reunido).toContain('var(--pet-reunido)');
    expect(fresh).not.toContain('var(--pet-reunido)');
    // O coração é um <path> a mais (forma exclusiva): reunido ≠ fresh do mesmo status.
    expect(reunido).not.toEqual(fresh);
  });

  it('reunido é mono-distinguível dos 3 status ATIVOS por forma (glifo exclusivo)', () => {
    // O coração de --pet-reunido aparece SÓ no reunido; nenhum status fresh o tem.
    for (const s of PET_STATUSES) {
      expect(html(s.id, 'outro', 'fresh')).not.toContain('var(--pet-reunido)');
    }
    expect(html('perdido', 'outro', 'reunido')).toContain('var(--pet-reunido)');
  });

  it('nenhum estado de ciclo de vida vaza hex cru (SOT de cor fica nas CSS vars)', () => {
    for (const lc of [PET_LIFECYCLE.FRESH, PET_LIFECYCLE.AGED, PET_LIFECYCLE.REUNIDO]) {
      for (const s of PET_STATUSES) {
        // Permite só os tokens; nenhum literal #RRGGBB no SVG (o fundo do disco e
        // o miolo do coração usam var(--mdf-surface-1), também token).
        expect(html(s.id, 'gato', lc)).not.toMatch(/#[0-9a-fA-F]{6}/);
      }
    }
  });

  it('o size do petMarkerSvg só muda width/height; o viewBox 0 0 32 32 é fixo', () => {
    const big = petMarkerSvg({ status: 'perdido', lifecycle: 'fresh', size: 32 });
    const mini = petMarkerSvg({ status: 'perdido', lifecycle: 'fresh', size: 22 });
    expect(big).toContain('width="32"');
    expect(mini).toContain('width="22"');
    expect(big).toContain('viewBox="0 0 32 32"');
    expect(mini).toContain('viewBox="0 0 32 32"');
  });

  it('a className do divIcon carrega o ciclo de vida (pet-marker--lc-<lifecycle>)', () => {
    expect(buildPetMarkerIcon({ status: 'perdido', lifecycle: 'aged' }).options.className)
      .toContain('pet-marker--lc-aged');
    expect(buildPetMarkerIcon({ status: 'encontrado', lifecycle: 'reunido' }).options.className)
      .toContain('pet-marker--lc-reunido');
    // ausência de lifecycle → fresh.
    expect(buildPetMarkerIcon({ status: 'avistado' }).options.className)
      .toContain('pet-marker--lc-fresh');
  });
});

describe('lifecycleForPet — deriva o ciclo de vida de um pet parseado (puro)', () => {
  it('reunido (resolvedAt/resolved) vence aged; ativo não-reunido = fresh', () => {
    expect(lifecycleForPet({ resolved: true })).toBe(PET_LIFECYCLE.REUNIDO);
    expect(lifecycleForPet({ resolvedAt: '2026-01-01T00:00:00Z' })).toBe(PET_LIFECYCLE.REUNIDO);
    // resolvido tem precedência mesmo se também marcado aged.
    expect(lifecycleForPet({ resolved: true, aged: true })).toBe(PET_LIFECYCLE.REUNIDO);
    expect(lifecycleForPet({ aged: true })).toBe(PET_LIFECYCLE.AGED);
    expect(lifecycleForPet({})).toBe(PET_LIFECYCLE.FRESH);
  });

  it('nunca lança em entrada nula/indefinida (barricada de leitura)', () => {
    expect(() => lifecycleForPet(null)).not.toThrow();
    expect(() => lifecycleForPet(undefined)).not.toThrow();
    expect(lifecycleForPet(null)).toBe(PET_LIFECYCLE.FRESH);
  });
});
