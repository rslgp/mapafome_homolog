// PetFirstRunHint.test.js — PET-M20: the dismissible one-time first-visit hint,
// against the YAML acceptance line:
//   "A first-time visitor sees a dismissible one-glance hint for the tap->Relatar
//    flow; all new states are screen-reader announced."
//
// The component is presentational (open + onDismiss); the "shows ONCE then is
// dismissed" persistence lives in petMapLoadState (covered in its own test). Here
// we wire the two together in a tiny harness that mirrors PetsApp's pattern: the
// hint opens iff !readFirstRunHintSeen(), and dismissing it persists the flag so
// a remount no longer shows it.

import React, { useState } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import PetFirstRunHint from './PetFirstRunHint';
import { readFirstRunHintSeen, markFirstRunHintSeen } from './petMapLoadState';

afterEach(cleanup);

// Harness reproduzindo a fiação do PetsApp: o hint abre só se ainda não foi visto;
// dispensar persiste o flag E fecha nesta sessão.
function HintHarness() {
  const [open, setOpen] = useState(() => !readFirstRunHintSeen());
  return (
    <PetFirstRunHint
      open={open}
      onDismiss={() => { markFirstRunHintSeen(); setOpen(false); }}
    />
  );
}

describe('PetFirstRunHint — mostra UMA vez na 1ª visita, anunciado a AT', () => {
  beforeEach(() => {
    try { window.localStorage.clear(); } catch (_e) { /* noop */ }
  });
  afterEach(() => {
    try { window.localStorage.clear(); } catch (_e) { /* noop */ }
    vi.restoreAllMocks();
  });

  it('na 1ª visita o hint aparece com a cópia do fluxo tocar→Relatar (role=status)', () => {
    render(<HintHarness />);
    const region = screen.getByRole('status');
    expect(region.textContent).toMatch(/toque no mapa onde você viu o pet/i);
    expect(region.textContent).toMatch(/relatar um pet/i);
  });

  it('dispensar (botão "Entendi") esconde o hint nesta sessão E persiste o flag', () => {
    render(<HintHarness />);
    fireEvent.click(screen.getByRole('button', { name: /entendi/i }));
    // some da tela agora.
    expect(screen.queryByRole('status')).toBeNull();
    // e o flag ficou persistido (não reaparece na próxima visita).
    expect(readFirstRunHintSeen()).toBe(true);
  });

  it('numa 2ª visita (flag já marcado) o hint NÃO aparece', () => {
    markFirstRunHintSeen();
    render(<HintHarness />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/toque no mapa/i)).toBeNull();
  });

  it('open=false não renderiza nada (controle do pai)', () => {
    const { container } = render(<PetFirstRunHint open={false} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('o botão "Entendi" é um <button> real operável por teclado', () => {
    render(<HintHarness />);
    const btn = screen.getByRole('button', { name: /entendi/i });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
  });
});
