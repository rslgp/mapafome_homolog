// PetReportSheet.publish.test.js — PET-M5 (gap-fill: o fluxo de publicação).
//
// O smoke de contrato de modal (petSheetsModalContract) prova que a sheet MONTA;
// ESTE arquivo exercita o COMPORTAMENTO de publicar, que era a maior lacuna de
// cobertura do componente:
//   • validação: publicar SEM escolher situação mostra o erro inline (role=alert)
//     e NÃO chama onPublish;
//   • caminho feliz: escolher um status e publicar chama onPublish com o payload
//     (campos aparados) + uma idempotency_key, e o botão vira "Publicado ✓";
//   • falha enfileirada (offline/lento): a cópia CALMA do reasonCode aparece via
//     role=alert e o botão vira "Guardado ✓" (reassegura, não cobra);
//   • falha NÃO-enfileirada (genérica): a cópia calma aparece e o botão vira
//     "Tentar de novo".
//
// onPublish é INJETADO (o componente não conhece petsData) — provamos o contrato
// da sheet, não o writer. Status/cópia vêm da SOT (petDomain), nunca hardcoded.

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import PetReportSheet from './PetReportSheet';
import {
  PET_STATUSES,
  PET_PUBLISH_FAILURE,
  PET_PUBLISH_FAILURE_COPY,
} from './petDomain';

afterEach(cleanup);

const COORDS = [-8.0671132, -34.8766719];
const STATUS = PET_STATUSES[0];           // 'perdido' — da SOT
const PUBLISH_BTN = /publicar pet|publicando|publicado|guardado|tentar de novo/i;

// Erro tipado como o PetsApp lança: carrega reasonCode estável + flag queued.
function publishError(reasonCode, queued) {
  const e = new Error('publish failed');
  e.reasonCode = reasonCode;
  e.queued = queued;
  return e;
}

describe('PetReportSheet — validação de situação obrigatória', () => {
  it('publicar SEM status mostra o erro inline e NÃO chama onPublish', () => {
    const onPublish = vi.fn();
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('button', { name: PUBLISH_BTN }));

    // role=alert com a cópia de "escolha uma situação"; nada foi publicado.
    expect(screen.getByRole('alert').textContent).toMatch(/situação|perdido/i);
    expect(onPublish).not.toHaveBeenCalled();
  });
});

describe('PetReportSheet — caminho feliz de publicação', () => {
  it('escolher um status e publicar chama onPublish com payload aparado + idempotency_key', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={onPublish} />);

    // Escolhe a situação (radio da SOT).
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(STATUS.label, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: PUBLISH_BTN }));

    await waitFor(() => expect(onPublish).toHaveBeenCalledTimes(1));
    const payload = onPublish.mock.calls[0][0];
    expect(payload.status).toBe(STATUS.id);
    expect(payload.coords).toEqual(COORDS);
    // idempotency_key presente (sobrevive a retries — sem duplo-write).
    expect(typeof payload.idempotency_key).toBe('string');
    expect(payload.idempotency_key.length).toBeGreaterThan(0);

    // Sucesso: o botão confirma "Publicado ✓".
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /publicado/i })).not.toBeNull(),
    );
  });
});

describe('PetReportSheet — cópia calma por classe de falha (PET-M1)', () => {
  it('falha ENFILEIRADA (offline) → cópia calma + botão "Guardado ✓"', async () => {
    const onPublish = vi.fn().mockRejectedValue(
      publishError(PET_PUBLISH_FAILURE.OFFLINE, true),
    );
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(STATUS.label, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: PUBLISH_BTN }));

    // A cópia exata vem da SOT (petDomain) — não duplicamos a string aqui.
    const expected = PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.OFFLINE];
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(expected));
    // Enfileirado → reassegura "Guardado ✓" em vez de cobrar "Tentar de novo".
    expect(screen.getByRole('button', { name: /guardado/i })).not.toBeNull();
  });

  it('falha NÃO-enfileirada (genérica) → cópia calma + botão "Tentar de novo"', async () => {
    const onPublish = vi.fn().mockRejectedValue(
      publishError(PET_PUBLISH_FAILURE.GENERIC, false),
    );
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(STATUS.label, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: PUBLISH_BTN }));

    const expected = PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.GENERIC];
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(expected));
    expect(screen.getByRole('button', { name: /tentar de novo/i })).not.toBeNull();
  });

  it('erro SEM reasonCode cai no fallback genérico (nunca mostra "publish_failed" cru)', async () => {
    const onPublish = vi.fn().mockRejectedValue(new Error('boom'));
    render(<PetReportSheet open coords={COORDS} onClose={() => {}} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(STATUS.label, 'i') }));
    fireEvent.click(screen.getByRole('button', { name: PUBLISH_BTN }));

    const expected = PET_PUBLISH_FAILURE_COPY[PET_PUBLISH_FAILURE.GENERIC];
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(expected));
  });
});

describe('PetReportSheet — cancelar e fechar', () => {
  it('Cancelar chama onClose sem publicar', () => {
    const onClose = vi.fn();
    const onPublish = vi.fn();
    render(<PetReportSheet open coords={COORDS} onClose={onClose} onPublish={onPublish} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onPublish).not.toHaveBeenCalled();
  });
});
