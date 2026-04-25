# ADR-002: App.js paradigm — class component, functional component, or state machine

**Status:** Proposed
**Date:** 2026-04-25
**v5 anchors:** § decision_frameworks.type1_type2 (Type-1) · § adrs · § rfc_process
**Bug ref:** v5_audit.yaml V3, V5 · v5_milestones.yaml VM4

## Context

`src/app/components/compatibility/App.js` is currently a 1206-LOC React class component. After VM2 (componentDidMount → appBootstrap.js) and VM3 (handleClickMap → publishPinFromMap.js) it should land at ~600 LOC. v5 § critical_metrics.size.files puts the ideal at ≤500. The remaining bloat is class-shape boilerplate: constructor binding, this references, lifecycle methods, an implicit state machine encoded in `this.state` flags.

This ADR picks the destination paradigm so VM2/VM3 extract toward it rather than away from it.

## Options

### Option A — Stay class, finish extraction-only

Keep React.Component. Extract bootstrap + publish into modules. Accept the residual class boilerplate.

**Pros:** zero migration risk; React 19 still supports class components; no consumer changes.
**Cons:** Class binding/this references stay; React 19 idioms (hooks, Suspense, concurrent features) hard to adopt incrementally.

### Option B — Port to functional component with hooks

Convert App to `function App()` using `useState`, `useEffect`, `useCallback`, `useReducer` for grouped state. The 30+ instance methods become module-level functions or memoized callbacks.

**Pros:** Aligns with React 19 idioms (most of the codebase is already functional). Easier to compose with existing hooks (`IosKeyboardInset`, `MapClickHandler`). Removes the entire `this`/binding burden. Smaller LOC after migration.
**Cons:** Risk of subtle effect-cleanup bugs when porting. Requires VM0 tests in place.

### Option C — Hand-rolled state machine module + thin functional shell

Define the implicit state transitions explicitly: `idle → reporting → publishing → confirmed | error`. The state machine is a pure module (testable without React). App becomes a thin functional component that dispatches events and renders states.

**Pros:** Maximum testability per v5 § humble_object_pattern. Eliminates impossible states (publishing AND idle). Documents the actual flow.
**Cons:** Higher up-front cost. New abstraction for contributors to learn. Risk of over-engineering (v5 § anti_patterns.process.premature_opt) at current scale.

## Decision

**Option B — Port to functional component with hooks** — once VM0, VM1, VM2, VM3 are complete.

Rationale:
- Codebase already functional (every component under `components/ux/` is functional).
- React 19 favors hooks; staying class invites future migration debt.
- C is the right answer at higher scale; not now (v5 § corrections — premature optimization).
- B is a Type-2-flavored Type-1: reversible per file, but the cumulative migration is one-way.

## Consequences

**Easier:**
- All children that already accept hook-based handlers wire up cleanly.
- Tests target functions instead of class instances (less mocking).
- File size drops below v5 ideal.

**Harder:**
- Code review on the migration PR — large diff. Mitigate by splitting per state slice (filters, sheets, sponsors, tour, sheets I/O).
- `cookies` (universal-cookie) and `aes` (aes-encryption) are currently module-scoped — keep them that way; don't move into hooks.

## Pre-requisites

1. VM0 — Vitest + RTL + smoke test asserting App mount (catches the SponsorSlot TDZ class of bug).
2. VM1 — sheet I/O fully extracted from App.js.
3. VM2 — componentDidMount split into named services.
4. VM3 — handleClickMap extracted.

After those, the class shell is small enough that the port is mechanical.

## Migration plan (post-prereqs)

1. Add a parallel `App.fn.js` functional component, gated by an env flag.
2. Migrate state slice by slice: filters → form inputs → sponsors/tour → sheets I/O.
3. Run both versions side-by-side under tests for one release.
4. Switch default; remove class shell after one further release with no regressions.

## Alternatives considered

A and C as above. C remains a future option if the state space grows past ~10 named states.
