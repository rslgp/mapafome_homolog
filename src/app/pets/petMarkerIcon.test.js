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
import { buildPetMarkerIcon, ringWidthFor } from './petMarkerIcon';
import { PET_STATUSES } from './petDomain';

function html(status, species) {
  return buildPetMarkerIcon({ status, species }).options.html;
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
