# CLAUDE.md — MAPA FOME (project conventions)

Project-local instructions for Claude Code sessions in this repo. These travel with the
repository, so they apply for any contributor, independent of user-global config.

## Always end changes with a what/why table

After ANY set of code/file changes, ALWAYS end the response with a summary that includes a
**table** of what changed and why. One row per file (or per logical change), with columns:
`File / Change` · `What` · `Why` — plus a `Result`/check-status column when checks were run.

- For multi-agent or multi-pass work, give a **per-agent or per-file** what/why table.
- Add a **separate short table for verification/gate results** when checks were run (e.g.
  `npm run lint` / `test` / `fitness` / `build` / `a11y`).
- List any **deferred items** (what was intentionally NOT changed, and why) so the review is honest.

**Why:** review happens by scanning a what/why table, not prose — it makes the diff and its
rationale legible at a glance before deciding to commit or discard.

## Commits & releases: use the git-commit-specialist agent

At the **end of every task** and at **every milestone** (a shippable, gates-green state — a
feature done, a release/version bump, a roadmap phase complete), use the
[`agent_git-commit-specialist`](.claude/agents/agent_git-commit-specialist.md) agent to handle
the versioning and commits. Do not hand-write commit messages or stage a grab-bag working tree
ad hoc — route it through that agent so it:

- classifies the working tree and emits a **SPLIT_PLAN** when there is more than one logical
  change (one atomic commit per concern, with the staging commands);
- drafts **Conventional Commits** messages (`type(scope): subject`) whose body carries the
  **WHY**, with correct footers (`BREAKING CHANGE:`, issue refs, the repo's `Co-Authored-By:`
  trailer for AI-assisted work);
- recommends the **semver bump type** for release commits (`chore(release): X.Y.Z`) — the human
  maintainer sets the actual number;
- self-checks each message against its acceptance checklist before returning.

Run it before committing; apply its `COMMIT_MESSAGE` / `SPLIT_PLAN` verbatim. Code correctness
and multi-file refactors stay with the software-engineer agent — the commit specialist commits
the change, it does not author the code.

**Why:** commit history is a first-class, reviewable artifact (read during a 2am `git bisect`);
centralizing commit/versioning craft in one specialist keeps `git log` atomic, conventional,
and honest about WHY instead of drifting per-session.

## Verification gate — always run `smoke200`

A change ships only when the full gate is green. **`npm run smoke200` is part of that gate and
must ALWAYS be run** (after `npm run build`) — never skip it:

| Check | Command |
|---|---|
| Lint | `npm run lint` (0 errors) |
| Unit tests | `npm run test` |
| Fitness functions | `npm run fitness` |
| Build | `npm run build` |
| **Render smoke** | **`npm run smoke200`** — serves the static `out/` and asserts every discovered route returns **HTTP 200 + a real render** (not the Next error shell) |
| Accessibility | `npm run a11y` (served build) + the overlay `vitest-axe` harness in `npm run test` |

`smoke200` is load-bearing because `next build` exiting 0 proves the BUILD ran, not that every
page actually serves and renders — a route can return 200 with an error shell or a blank body
while every on-disk check still passes. Run `build` then `smoke200` on every pass and report its
per-route result in the gate table.
