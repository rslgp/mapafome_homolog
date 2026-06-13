// intlConfig.test.js — INTL dev on/off switch.
// INTL_ENABLED is resolved once at module load from NEXT_PUBLIC_INTL (env wins
// when set to a recognized value) or the DEV_DEFAULT. We verify the env parsing
// by re-importing the module under different env values with vitest's module
// registry reset.

import { describe, it, expect, afterEach, vi } from 'vitest';

const MOD = '../src/app/components/compatibility/components/intlConfig.js';

async function loadWith(envValue) {
  vi.resetModules();
  if (envValue === undefined) delete process.env.NEXT_PUBLIC_INTL;
  else process.env.NEXT_PUBLIC_INTL = envValue;
  const mod = await import(MOD);
  return mod.INTL_ENABLED;
}

describe('intlConfig.INTL_ENABLED', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_INTL;
    vi.resetModules();
  });

  it('is a boolean', async () => {
    expect(typeof (await loadWith(undefined))).toBe('boolean');
  });

  it('defaults to the DEV_DEFAULT (OFF) when the env var is unset', async () => {
    expect(await loadWith(undefined)).toBe(false);
  });

  it('honors explicit off values', async () => {
    for (const v of ['off', '0', 'false', 'no', 'OFF', ' False ']) {
      expect(await loadWith(v)).toBe(false);
    }
  });

  it('honors explicit on values', async () => {
    for (const v of ['on', '1', 'true', 'yes', 'ON']) {
      expect(await loadWith(v)).toBe(true);
    }
  });

  it('falls back to the default (OFF) for an unrecognized value', async () => {
    expect(await loadWith('maybe')).toBe(false);
  });
});
