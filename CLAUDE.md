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
