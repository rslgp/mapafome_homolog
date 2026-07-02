# loops/ : loop-engineering design for MAPA FOME

This directory holds **design YAMLs** for one autonomous / semi-autonomous coding
loop, modeled on Addy Osmani's *Loop Engineering* essay: the loop is
**FIND** work, **DISPATCH** it to agents, **CHECK** the result, **RECORD** state,
**DECIDE** the next item, all bounded by a **GUARD**.

These files **describe** a loop. They do **not** run one. Authoring or reading
them spends zero tokens and ships no code.

## Files

| File | What it is |
|---|---|
| `loop.yaml` | The engine spec: the six primitives, each anchored to a real repo file, with its exact STOP condition; plus the one-iteration control flow. |
| `backlog.yaml` | The tier-list (S+/S/A/B) the loop runs on. `LP-*` = build the loop machinery; `MF-*` = real product work mirrored from `MILESTONES.yaml`. |
| `roadmap.yaml` | The phased plan: guard first, then maker/checker, then (gated) run. |
| `STOP` | **Kill switch.** If this file exists, the loop halts at the top of the next iteration. Create it to stop a run; delete it to allow one. |
| `runlog.jsonl` | Spend log. Each run appends one line: item id, tokens, calls, wall-clock, gate result. (Created when the guard is built, `LP-0`.) |

## Autonomy stance (read this before running anything)

- **Default: report-only, zero autonomous spend.** Nothing here runs on its own.
- **An unattended run is REFUSED today** because the budget **guard is missing**.
  The next thing to build is `LP-0`: a per-run cap (token/call/wall-clock ceiling
  that halts), the `STOP` kill switch, and the `runlog.jsonl` spend log.
- **Two preconditions before any unattended run, both required:**
  1. `guard.complete == true` in `loop.yaml` (cap + kill-switch + spend-log all wired).
  2. An **explicit human opt-in, in words** ("let it run", "schedule it"). "Set it
     up" is design only.

## Repo-specific constraints

- **Builds are serialized.** This machine OOMs on parallel builds, so the loop
  never runs two `npm run build` (or two full-suite agents) at once.
- **GREEN is not VERIFIED.** A green gate
  (`lint -> test -> fitness -> build -> smoke200 -> a11y`) means "no known check
  failed", not "a human confirmed the behavior". A human signs off, and confirms
  `smoke200` was a real render and not a 200 error shell, before a `shipped` flip
  is trusted.
- **Commits** route through the git-commit-specialist agent; never `git add -A`;
  never push / open a PR / bump a version unless explicitly asked.

## Status

`GUARD` is the only missing primitive and is the next item (`LP-0`). `FIND`,
`CHECK`, and `RECORD` are strong (verified against `package.json`,
`.claude/skills/gate/SKILL.md`, and `MILESTONES.yaml`); `DISPATCH` and `DECIDE`
are thin and tracked as `LP-1` / `LP-2`.
