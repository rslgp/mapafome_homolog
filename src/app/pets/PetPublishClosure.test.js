// PetPublishClosure.test.js — PET-M20 / PET_CURVE §4: the post-publish CLOSURE
// micro-state, against the YAML acceptance line:
//   "After publish, the owner sees a calm closure state that locates their
//    just-dropped pin and offers EXACTLY ONE next-decision (no nag/streak/timer)."
//
// We assert:
//   • it appears only when open (the parent opens it on a 'published' close);
//   • it confirms calmly ("seu pet está no mapa") and is announced (role=status);
//   • it offers EXACTLY ONE primary next-decision ("Ver no mapa") — not a menu;
//   • it is dismissible (Fechar button + Escape) and silent after;
//   • NO nag/streak/timer/confetti copy leaks in (calm-tone governor §2).

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import PetPublishClosure from './PetPublishClosure';

afterEach(cleanup);

describe('PetPublishClosure — só aparece quando aberto', () => {
  it('open=false não renderiza nada', () => {
    const { container } = render(
      <PetPublishClosure open={false} onSeeOnMap={() => {}} onDismiss={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('PetPublishClosure — confirmação calma anunciada a AT', () => {
  it('mostra "seu pet está no mapa" e comunica alcance (role=status)', () => {
    render(<PetPublishClosure open onSeeOnMap={() => {}} onDismiss={() => {}} />);
    const region = screen.getByRole('status');
    expect(region.textContent).toMatch(/seu pet está no mapa/i);
    // reasseguramento de ALCANCE — o que desinfla o estágio B da curva.
    expect(region.textContent).toMatch(/qualquer pessoa por perto pode reconhecê-lo/i);
  });
});

describe('PetPublishClosure — EXATAMENTE UMA próxima decisão', () => {
  it('oferece UM botão primário ("Ver no mapa"); o outro botão é só a dispensa', () => {
    render(<PetPublishClosure open onSeeOnMap={() => {}} onDismiss={() => {}} />);
    // A próxima-decisão primária.
    const seeOnMap = screen.getByRole('button', { name: /ver no mapa/i });
    expect(seeOnMap).toBeTruthy();
    // O único OUTRO botão é a dispensa ("Fechar") — não uma 2ª CTA competindo
    // nem um "convide amigos". Total de botões = 2 (1 decisão + 1 dispensa).
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /fechar/i })).toBeTruthy();
  });

  it('clicar "Ver no mapa" chama onSeeOnMap (a única próxima decisão)', () => {
    const onSeeOnMap = vi.fn();
    render(<PetPublishClosure open onSeeOnMap={onSeeOnMap} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /ver no mapa/i }));
    expect(onSeeOnMap).toHaveBeenCalledTimes(1);
  });
});

describe('PetPublishClosure — dispensável (Fechar + Escape)', () => {
  it('clicar "Fechar" chama onDismiss', () => {
    const onDismiss = vi.fn();
    render(<PetPublishClosure open onSeeOnMap={() => {}} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Escape também dispensa (caminho de dismissal por teclado)', () => {
    const onDismiss = vi.fn();
    render(<PetPublishClosure open onSeeOnMap={() => {}} onDismiss={onDismiss} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('PetPublishClosure — contrato de foco (captura na abertura, restaura ao fechar)', () => {
  it('foca a próxima-decisão na abertura e restaura o foco ao trigger ao desmontar', async () => {
    // Um botão "trigger" simula o que tinha foco antes de abrir (o publish da sheet).
    const trigger = document.createElement('button');
    trigger.textContent = 'trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <PetPublishClosure open onSeeOnMap={() => {}} onDismiss={() => {}} />,
    );
    // requestAnimationFrame move o foco para "Ver no mapa".
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /ver no mapa/i })),
    );

    // Fechar (open=false) roda a cleanup do effect → restaura o foco ao trigger.
    rerender(<PetPublishClosure open={false} onSeeOnMap={() => {}} onDismiss={() => {}} />);
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});

describe('PetPublishClosure — governador de tom: NADA de nag/streak/timer/confete', () => {
  it('a cópia não contém pressão de retorno, sequência, contagem ou comemoração', () => {
    render(<PetPublishClosure open onSeeOnMap={() => {}} onDismiss={() => {}} />);
    const text = screen.getByRole('status').textContent.toLowerCase();
    // banidos (PET_CURVE §2): streak/sequência, countdown/dias-restantes,
    // "volte amanhã", badge/herói, confete/parabéns.
    expect(text).not.toMatch(/sequência|streak|volte amanhã|dias? restante|herói|badge|parabéns|confete|🎉/);
  });
});
