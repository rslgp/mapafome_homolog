# PARALLELISM_PLAN — running two Claude sessions on MapaFome at once

> Status as of 2026-06-13. The INTL feature work (M0..M6) is **code-complete in the
> working tree**. M6 (en-US + auto-detect) is written but **uncommitted**. The flag
> stays OFF (`DEV_DEFAULT = false`). What is genuinely left is: verify-and-commit M6,
> then pick up the next independent stream (the `FILTRO_TEMPO_PLAN.md` time-filter work).
>
> This document answers the user's question literally: **how many sessions can run in
> parallel, and how to split the work so they never collide.** The machine-readable
> contract is `PARALLELISM_PLAN.yaml` (same folder). This `.md` is the human read.

---

## TL;DR — how many sessions in parallel?

| Setup | Safe parallel sessions | Why |
|---|---|---|
| **Same working tree** (both sessions `cd` into `mapafome_homolog`) | **1 writer + N read-only** | Two writers in one tree race on the same files, the same `git index`, and the same `out/` build dir. Editing + `git add` from two sessions corrupts the staging area and loses edits. |
| **Separate git worktrees** (one branch per worktree) | **2 writers** (one per worktree), comfortably | Each worktree has its own checkout, its own index, its own `out/`. They share only the `.git` object store, which is concurrency-safe for commits. CPU has **8 cores**, so two full gates can run without thrashing (though see the HDD note). |
| Hard ceiling regardless | **2 writer sessions** | The binding constraint is not CPU, it is **disk**: this box is a slow 1TB HDD with ~13GB free. Two simultaneous `next build` + `node_modules` test runs already saturate I/O. A third writer would mostly wait on disk. |

**Recommendation: 2 sessions, each in its OWN git worktree, on DIFFERENT branches,
touching DISJOINT file sets.** That is the only way two sessions both *edit* safely.
If the second session is in the *same* `mapafome_homolog` directory, it must be
**read-only** (review, search, plan) while this session is the sole writer.

---

## The collision model (what actually breaks)

Two Claude sessions are two independent processes. They are NOT coordinated by the
harness. The shared mutable resources that cause corruption:

1. **The working-tree files.** Both sessions `Edit`/`Write` the same path → last writer
   wins, the other's edit is silently lost, and an `old_string` match can fail mid-task.
2. **The git index (`.git/index`).** `git add` from two sessions interleaves → a commit
   captures a half-staged tree, or git aborts with `index.lock` errors.
3. **`index.lock`.** Concurrent `git commit`/`git add` in the SAME worktree → one fails
   with `Unable to create '.../index.lock': File exists`.
4. **The build output `out/`.** Two `npm run build` / `smoke200` runs in the same tree
   clobber each other's `out/` and the `smoke200` server port (default same port).
5. **`public/sw.js` + `public/version.json`.** The PWA stamp step rewrites these every
   commit. Two sessions stamping = a merge headache and a wrong SHA stamp.

Separate worktrees make 1, 2, 3, 4 disjoint (each worktree owns its own copy of all of
these). They share only the immutable `.git` object database, which is append-only and
safe under concurrency. That is *why* worktrees are the answer.

---

## Existing worktrees in this repo (do not stomp)

```
mapafome_homolog        feat/intl-marking          <- THIS session (INTL, primary writer)
mapafome_decouple_wt    refactor/decouple-app
mapafome_pets_wt        pets
mapafome_srp_wt         refactor/srp-decouple-2
.claude/worktrees/pets-milestones  pets-milestones
```

A second writer session should either reuse one of these (if its branch matches the
stream) or `git worktree add` a fresh one for a new stream. **Never** put the second
writer in `mapafome_homolog` while this session is editing there.

---

## Work split — two disjoint lanes

### Lane A (this session, `feat/intl-marking`, `mapafome_homolog`) — FINISH INTL
Owns every `i18n` / INTL file. Sole writer of `feat/intl-marking`.

1. Verify M6 gate green (lint → test → fitness → build → smoke200 → a11y).
2. Route the M6 working tree through `agent_git-commit-specialist` (SPLIT_PLAN: the
   en-US locale + auto-detect feature, the data-driven parity tests, the PWA stamp).
3. Report the final what/why table across M0..M6. Flag stays OFF; en-US sensitive
   copy stays `[REVISAR-HUMANO]` for the user to approve later.

**File ownership (Lane A writes, Lane B must NOT touch):**
`src/app/components/compatibility/components/ux/i18n/**`,
`src/app/components/compatibility/components/ux/strings.js`,
`src/app/components/LocaleAutoDetect.js`, `src/app/layout.js`,
`test/i18n*.test.js`, `public/sw.js`, `public/version.json`, `INTERNATIONAL_PLAN.md`.

### Lane B (second session, NEW worktree + branch) — TIME FILTER
The one genuinely independent, not-yet-started stream is `FILTRO_TEMPO_PLAN.md`.
It has zero file overlap with INTL (it touches pin-rendering / time-window filtering,
not i18n). Give it its own worktree:

```powershell
git worktree add ../mapafome_filtro_wt -b feat/filtro-tempo feat/intl-marking
```

**File ownership (Lane B writes, Lane A must NOT touch):**
the time-filter component(s) named in `FILTRO_TEMPO_PLAN.md`, `FILTRO_TEMPO_PLAN.md`
itself, and Lane-B-only tests. Lane B branches FROM `feat/intl-marking` so it inherits
the finished INTL code read-only but never edits it.

### Shared, append-only, low-contention (coordinate by convention)
`scripts/fitness-functions.mjs`, `package.json`, `ROADMAP.md`. If BOTH lanes must edit
one of these, the rule is: **announce in chat, edit in one lane, the other rebases.**
Do not edit a shared file in two lanes in the same window.

---

## The non-negotiable rules for the second session

1. **Never two writers in one worktree.** If you cannot make a worktree, the second
   session is read-only.
2. **Disjoint file sets** per the ownership lists above. A merge is cheap; a lost edit
   is invisible until it ships.
3. **Each lane runs its OWN gate in its OWN worktree** before committing. Do not trust
   the other lane's green.
4. **Stagger the heavy steps.** `next build` + `smoke200` are disk-bound on this HDD.
   If both lanes hit build at once it will crawl. Whoever starts build first says so;
   the other waits or uses `--only lint,test`.
5. **`smoke200` port:** if both lanes serve `out/` at once, pass a different port in
   the second lane (or run them sequentially). Default collides.
6. **Commits still route through `agent_git-commit-specialist`** in each lane.
7. **The INTL flag stays OFF** in every lane; nobody flips `DEV_DEFAULT`.

---

## Sync points

- **SP1 — before Lane B starts:** Lane A confirms M6 is committed (or at least that
  Lane B's branch point `feat/intl-marking` is stable). Lane B branches from it.
- **SP2 — before either lane merges to the integration branch:** both gates green,
  rebase Lane B onto the latest Lane A tip, resolve any `package.json` / fitness
  overlap, re-run the gate once post-rebase.
- **SP3 — final:** one combined what/why table; verify `DEV_DEFAULT = false` still.
