// UX-M35 shareLink contract. Pure module, fake navigator — the discriminated
// result the sheet UI maps to calm copy must be stable.
import { describe, it, expect, vi } from 'vitest';
import { shareOrCopy } from '../src/app/components/compatibility/components/ux/shareLink';

const payload = { title: 'MAPA FOME', text: 'veja este ponto', url: 'https://mapafome.com.br/#x' };

describe('shareOrCopy', () => {
  it('uses native share when available and it resolves', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const r = await shareOrCopy(payload, { share });
    expect(share).toHaveBeenCalledWith(payload);
    expect(r.kind).toBe('shared');
  });

  it('treats an AbortError (user cancel) as a no-op cancel, does not copy', async () => {
    const err = Object.assign(new Error('cancel'), { name: 'AbortError' });
    const writeText = vi.fn();
    const r = await shareOrCopy(payload, { share: vi.fn().mockRejectedValue(err), clipboard: { writeText } });
    expect(r.kind).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when share is absent', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const r = await shareOrCopy(payload, { clipboard: { writeText } });
    expect(writeText).toHaveBeenCalledWith(payload.url);
    expect(r.kind).toBe('copied');
  });

  it('falls back to clipboard when share throws a non-cancel error', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const r = await shareOrCopy(payload, {
      share: vi.fn().mockRejectedValue(new Error('NotAllowed')),
      clipboard: { writeText },
    });
    expect(writeText).toHaveBeenCalledWith(payload.url);
    expect(r.kind).toBe('copied');
  });

  it('reports unavailable when neither share nor clipboard exist', async () => {
    const r = await shareOrCopy(payload, {});
    expect(r.kind).toBe('unavailable');
    expect(r.url).toBe(payload.url);
  });
});
