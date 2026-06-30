// Cross-repo parity for the payment-rail allowlist (M16).
//
// The supported recurring-donation rails are ONE contract written in two separate
// deploy units that share no package (see docs/payment-rails-contract.md):
//   - front-end: src/app/.../payments/asaasSubscriptionClient.js  (export const RAILS)
//   - backend:   asaas-backend/lib/validate.js                    (const RAILS = [...])
// They can silently drift. This test asserts the two id lists are identical and in
// the same order.
//
// Approach: the backend is a SEPARATE CommonJS package and importing it would execute
// the whole module under vitest's Oxc transform across a package boundary (fragile).
// Instead we read asaas-backend/lib/validate.js as TEXT and parse out the RAILS array
// literal, so this test depends on nothing the backend requires and runs cleanly under
// the existing vitest config.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { RAILS } from '../src/app/components/compatibility/components/payments/asaasSubscriptionClient.js';

// Resolve the backend file relative to THIS test file, not the cwd, so the test is
// independent of where vitest is invoked from.
const here = dirname(fileURLToPath(import.meta.url));
const backendValidatePath = resolve(here, '../asaas-backend/lib/validate.js');

// Parse the `const RAILS = [ ... ]` string-array literal out of the backend source
// text. We match the literal and pull each single- or double-quoted id, preserving
// source order.
function readBackendRails(source) {
  const match = source.match(/const\s+RAILS\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    throw new Error('Could not find a `const RAILS = [ ... ]` literal in asaas-backend/lib/validate.js');
  }
  const ids = [];
  const idRe = /['"]([^'"]+)['"]/g;
  let m;
  while ((m = idRe.exec(match[1])) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

describe('payment-rail allowlist parity (front-end vs backend)', () => {
  const frontendIds = RAILS.map((r) => r.id);
  const backendSource = readFileSync(backendValidatePath, 'utf8');
  const backendIds = readBackendRails(backendSource);

  it('the backend RAILS literal is parsed as a non-empty id list', () => {
    expect(Array.isArray(backendIds)).toBe(true);
    expect(backendIds.length).toBeGreaterThan(0);
  });

  it('front-end RAILS ids match the canonical contract set in order', () => {
    // Anchored to the canonical set documented in docs/payment-rails-contract.md.
    expect(frontendIds).toEqual(['pix', 'cartao', 'boleto']);
  });

  it('front-end and backend RAILS ids are identical and in the same order', () => {
    // This is the parity assertion: if either deploy unit drifts, this fails.
    expect(backendIds).toEqual(frontendIds);
  });
});
