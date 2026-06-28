// axeAudit.js — shared vitest-axe audit helper (SOT for a11y test runs)
//
// WHY THIS EXISTS
//   Two a11y suites (assinar-a11y, overlay-a11y) defined an IDENTICAL `AXE_OPTS`
//   + `expectNoSeriousViolations` pair (DRY drift surface), AND both call the
//   single global axe instance vitest-axe exposes. vitest runs files in
//   parallel, so two `axe()` calls could overlap and throw the intermittent
//   `Unknown Error: Axe is already running.` flake. Centralizing the options and
//   serializing every audit through one module-level promise chain removes both
//   problems: one source of truth for the rule set, and at most one `axe.run()`
//   in flight at a time across the whole process.
//
// SCOPE / HONESTY ABOUT jsdom
//   jsdom does no real layout, so axe's color-contrast rule is unreliable here
//   (covered by the static audit + page-level `npm run a11y`). We disable
//   color-contrast and assert only rules jsdom CAN judge: roles, accessible
//   names, labels, aria-*, focus/tabindex, duplicate ids, region semantics.

import { expect } from 'vitest';
import { axe } from 'vitest-axe';

// Shared WCAG 2.0/2.1 A + AA structural rule set. color-contrast disabled
// because jsdom has no layout (see header). This is the single source of truth
// for both a11y suites.
export const AXE_OPTS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: {
    'color-contrast': { enabled: false },
  },
};

// Process-wide serialization gate. vitest-axe drives ONE global axe instance, so
// concurrent `axe.run()` calls (across parallel test files) throw "Axe is
// already running". Chaining every audit onto this tail makes overlapping calls
// queue instead of collide. `.catch` keeps a single rejecting audit from
// poisoning the chain for the next caller.
let auditTail = Promise.resolve();

/**
 * Run axe on `container` with the shared options, serialized process-wide, and
 * assert ZERO serious/critical violations. Minor/moderate findings are logged
 * but do not fail the gate (out of the suites' acceptance scope).
 */
export async function expectNoSeriousViolations(container, label) {
  const run = auditTail.then(() => axe(container, AXE_OPTS));
  // keep the chain alive even if THIS audit rejects, without swallowing the
  // result the caller awaits below.
  auditTail = run.catch(() => {});

  const results = await run;
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (seriousOrCritical.length > 0) {
    const summary = seriousOrCritical
      .map((v) => `  • [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} node(s)\n      ${v.nodes.map((n) => n.target.join(' ')).join('\n      ')}`)
      .join('\n');
    console.error(`\naxe serious/critical violations in ${label}:\n${summary}\n`);
  }
  expect(seriousOrCritical).toEqual([]);
}
