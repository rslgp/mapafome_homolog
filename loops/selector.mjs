// loops/selector.mjs: the DECIDE primitive (LP-2), an explicit, testable
// highest-tier-first selector over the loop backlog.
//
// This turns the orchestrator R7 convention ("highest-tier-first, shipped only
// on real green evidence") into a pure function a runner can call and a test can
// pin. It does NOT run the loop, build, or dispatch anything: it only answers
// "given these items, which one is eligible next, and what is the full eligible
// set, in order?" No em-dash anywhere.
//
// Eligibility rules (must match loops/loop.yaml + AUTONOMOUS_LOOP_PROMPT.md):
//   - status must be 'pending' or 'open'
//   - report_only items are NEVER eligible (binding handoff mandate)
//   - 'later', 'shipped', 'blocked', 'design-only' are excluded
//   - an item is eligible only if every depends_on id is already 'shipped'
// Ordering: tier S+ > S > A > B; ties broken by depends_on depth then input order.

export const TIER_RANK = { "S+": 0, S: 1, A: 2, B: 3 };

const ELIGIBLE_STATUS = new Set(["pending", "open"]);

/** Is this single item eligible, given the set of already-shipped ids? */
export function isEligible(item, shippedIds) {
  if (!item || typeof item !== "object") return false;
  if (!ELIGIBLE_STATUS.has(item.status)) return false;
  if (item.report_only === true) return false;
  const deps = Array.isArray(item.depends_on) ? item.depends_on : [];
  for (const d of deps) {
    if (!shippedIds.has(d)) return false; // a dependency is not yet shipped
  }
  return true;
}

/** Stable sort key: lower is picked first. */
function sortKey(item, index) {
  const tier = TIER_RANK[item.tier];
  const tierRank = tier === undefined ? 99 : tier;
  const depth = Array.isArray(item.depends_on) ? item.depends_on.length : 0;
  return [tierRank, depth, index];
}

function cmp(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Return the full eligible set, highest-priority first.
 * @param {Array} items  all backlog items
 * @returns {Array} eligible items in selection order
 */
export function eligibleSet(items) {
  const list = Array.isArray(items) ? items : [];
  const shippedIds = new Set(
    list.filter((it) => it && it.status === "shipped").map((it) => it.id)
  );
  return list
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => isEligible(it, shippedIds))
    .sort((a, b) => cmp(sortKey(a.it, a.i), sortKey(b.it, b.i)))
    .map(({ it }) => it);
}

/**
 * Pick the single next item to work, or null if the eligible set is empty
 * (the GOAL is met, modulo later/report_only/design-only).
 */
export function selectNext(items) {
  const set = eligibleSet(items);
  return set.length > 0 ? set[0] : null;
}
