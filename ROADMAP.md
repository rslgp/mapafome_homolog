# ROADMAP — Multi-Agent Improvement (MAPA FOME)

> Produced by the `/superprompt` multi-agent orchestration over `.claude/agents/`.
> The orchestration **detects** the agent roster at runtime, **routes** each agent only to
> the parts of the project its domain genuinely fits, runs the applicable agents, and gates
> the result on the project's real checks. This file records what that pass shipped and the
> prioritized work that remains.

## How this roadmap was produced

The champion orchestration prompt (selected by `/superprompt`: 3 seed variants → GA-EVOLVE →
champion) follows one loop:

1. **DETECT + DEDUPE** — enumerate `.claude/agents/` recursively, read each agent's
   frontmatter; fold `agent_*` alias stubs into their canonical agent (never assume the roster).
2. **CLASSIFY** the project's real surface from `package.json` scripts / framework / tests.
3. **ROUTE every legitimate partial fit** — an agent applies if its domain has genuine overlap;
   each applied agent gets a scope that **excludes** the non-matching (Defold/Lua) surface;
   zero-overlap agents are skipped with a reason (never forced).
4. **PHASE** — independent slices run in parallel; dependent ones sequential.
5. **VERIFY** — a blocking gate on the repo's real checks (below).

## Detected roster & routing

The roster is a **SOLONE Defold/Lua mobile-game** consultant set; this project is a Next.js 16 /
React 19 web app — so this is a **partial-fit** routing problem. Deduped roster (5 canonical; 5
`agent_*` aliases folded):

| Agent | Domain | Routed? | Slice on this project |
|---|---|---|---|
| `coloring-ict6` | color / contrast / WCAG AA / palette | ✅ applies | WCAG AA contrast of MUI theme + `--mdf-*` tokens + map legibility (excl. vmath/Lua palette) |
| `softwareengineer` | code review / refactor / architecture / testability | ✅ applies | Generic SOLID/testability/architecture + build/deploy scripts on the JS/React source (excl. SOLONE Lua memory) |
| `uiux-defold` | UI/UX layout + Defold engine | ✅ applies | Layout / touch-targets / modal contract / pt-BR-es i18n parity (excl. `.gui`/`msg.post`/Defold engine) |
| `competitive-balance` | game balance.yaml / leaderboard | ❌ skip | No game mechanics, balance, or leaderboard exist |
| `game-designer` | is-this-mechanic-fun advisor | ❌ skip | Not a game; no mechanics/interest-curve to evaluate |

(`git-commit-specialist` is also detected and routed — it owns the versioning + Conventional-Commit
message for every slice below, per `CLAUDE.md`.)

## Status legend
✅ Shipped · 🔜 Next · 🗓️ Later · ⛔ Out of scope (skipped agents)

---

## Phase 1 — Shipped (`v0.1.1`)

All routed agents completed their slice; all four gates green.

| Owner agent | Change | Result |
|---|---|---|
| `softwareengineer` | `vitest.config.mjs` `esbuild`→`oxc` JSX transform | ✅ 2 silently-broken JSX test files now run → test 89/89 |
| `softwareengineer` | `App.js` 1247→989 LOC; extracted `appMainBootstrap.js`; split `render()` | ✅ `fitness` passes (FF1/FF2) |
| `softwareengineer` | ESLint `^10`→`^9` (eslint-config-next compat) | ✅ `lint` no longer crashes |
| `softwareengineer` | Fixed all 25 lint errors (next/link, jsx-key, alt-text, `createRoot`, removed 2 needless effects, justified disables) | ✅ `lint` 0 errors |
| `coloring-ict6` | 8 status-chip AA contrast fixes (`PinDetailSheet.css`, `ListView.css`) — urgency hue text → paired dark "ink" tokens | ✅ e.g. `--going` 1.89→6.24, `--waiting` 2.13→5.73 |
| `uiux-defold` | Escape-key dismissal added to `ListView.js` + `NotificationPrefs.js` modals | ✅ 3-path escape contract aligned |
| `uiux-defold` | Verified pt-BR/es locale key parity (22/22) + touch targets ≥44px | ✅ no fix needed |

---

## Phase 2 — Shipped (this pass)

All six prioritized Phase-2 items implemented, each routed to its owner agent, gated, and
committed atomically through `git-commit-specialist`. Gate green after every slice (lint 0,
test, fitness, build 9/9) — and the live a11y audit (P5) now runs and is **0 violations** on the
audited pages.

| Item | Owner agent(s) | Commit | Change | Result |
|---|---|---|---|---|
| **P1** i18n: render the `es` locale | `softwareengineer` + `uiux-defold` | `feat(i18n)` | The i18n system was **dead code** (full pt-BR+es dict, but no component called `t()`). Added a `useLocale()` re-render hook (subscribes to `mdf-locale-change`) and wired ~18 dictionary keys across `ReportSheet`/`PinDetailSheet`/`ListView`/`EmptyViewportOverlay`/`ContextBar`/`header`/`App`. `uiux` review raised the LocaleSwitch to the 44px touch floor. | ✅ es renders live; pt-BR pass-through unchanged; new `test/i18n.test.js` proves it; suite 89→95 |
| **P2** `no-img-element` warnings | `softwareengineer` (+ `uiux` n/a) | `chore(lint)` | The app is `output:'export'` + `images.unoptimized:true`, so `next/image` gives **zero** optimization and real layout risk; all 25 `<img>` exempt for the same reason (remote CDN, Leaflet popup, data-URI, deliberate static imgs). Disabled the rule once with a justification + REVISIT trigger rather than 24 drifting inline disables. | ✅ lint 25 warnings → **0**; zero DOM/visual change |
| **P3** `App.js` decomposition | `softwareengineer` | `refactor(app)` | Extracted the byte-for-byte-duplicated `coordsFromPin` transform to `domain/pinCoords.js` (DRY retired + testable). Behavior-preserving (value + reference identity); risky `this`-bound candidates deliberately deferred. | ✅ `App.js` 990→983; +10 unit tests (suite 95→105) |
| **P4** marker-ring non-text contrast (SC 1.4.11) | `coloring-ict6` | `fix(a11y)` | The amber "waiting" map-marker ring (`--mdf-urgency-waiting` `#D4A017`) was 2.07–2.38:1 (FAIL 3:1). Darkened to `#A07410` (≥3.66:1) holding the hue; the 2/3/5px thickness encoding (primary signal) left untouched. | ✅ ring meets 3:1 on all adjacencies; thickness encoding intact |
| **P5** live a11y audit (`npm run a11y`) | `coloring-ict6` (+ `uiux`) | `fix(a11y)` | Served the build and ran axe-core (WCAG 2.2 AA). Home/map = **0**. Audit **surfaced 10 real color-contrast fails** on `/imprensa` (4) and `/parceiros` (6) — brand red `#D64545` at 4.38:1. Fixed page-scoped via `--mdf-brand-hover` (5.70:1); no global token mutated (home/map not regressed). | ✅ re-audit: `/`, `/imprensa`, `/parceiros` all **0 violations** |
| **P6** Next metadata advisories | `softwareengineer` | `chore(metadata)` | Moved `themeColor` out of the root `metadata` export (Next 16 reads it only from `viewport`, where it already lived) and set `metadataBase`. One root-layout edit clears all 7 inheriting routes. | ✅ build emits **0** metadata advisories |

---

## Phase 3 — Shipped (this pass)

All four Phase-3 items implemented, each routed to its owner agent, gated, and committed
atomically through `git-commit-specialist`. Suite grew 105 → 131; gate green throughout.

| Item | Owner agent(s) | Commit | Change | Result |
|---|---|---|---|---|
| **P7** reconcile + wire `errors.offline` | `uiux-defold` | `fix(i18n)` | Read the real offline path — it enqueues to IndexedDB and auto-drains on the `online` event, so a point is **saved and auto-retried**. The live copy was correct; the dictionary was wrong. Corrected `errors.offline` (pt-BR + es) and routed it through `t()`. pt-BR user-visible meaning unchanged. | ✅ renders via `t()`; parity held |
| **P8** resolve two dead dictionary keys | `uiux-defold` | `fix(i18n)` | Wired `errors.server_slow` to the real 10s `network_slow` timeout branch (slow-server ≠ offline); **removed** `empty.no_pins_anywhere` (no UI surface; `no_pins_in_view` already serves the one empty state). | ✅ zero dead keys; parity test added |
| **P9** a11y-audit in-app overlays | `uiux-defold` (+ `coloring-ict6` n/a) | `test(a11y)` | Added a `vitest-axe` harness rendering List/Report/Info overlays in their **open** state (the state axe-on-URL can't reach), asserting 0 serious/critical. **0 violations** — overlays were already aria-sound; harness pins it against regression. | ✅ +6 tests; locked in |
| **P10** further `App.js` decomposition | `softwareengineer` | `refactor(pins)` + `refactor(app)` | Adopted shared `domain/pinCoords.js` in 4 consumers (retired 4 duplicated coord helpers; made it null-safe = strict superset). Extracted a pure `normalizeTelefoneInput` from `handleChangeTelefone`. | ✅ +14 tests; behavior preserved |

### 🗓️ Deferred (judged unsafe to extract without risk — documented, not churned)
- `App.js` `setTipoAlimento` (DOM-ref + `setState` + analytics side effects) and `writePinToSheets`
  (idempotency cache + network + bounds, interleaved with `envVariables.criarRow`) have **no
  self-contained pure core** worth extracting — lifting them would couple a domain module to side
  effects and not improve coverage. Left in place with reasons (P10 report).
- `reports.js` / `marketingReports.js` coord helpers use a **different contract** (parse a `Dados`
  blob, extra validation) — not equivalent to `coordsFromPin`, intentionally not consolidated.

### ⛔ Out of scope (skipped agents)
`competitive-balance` and `game-designer` have no surface on this web app and are not part of
any phase. They would only re-activate if game mechanics were ever added.

---

## Verification gate (definition of done for every phase)

A change ships only when all of these pass (blocking):

| Check | Command | Current |
|---|---|---|
| Unit tests | `npm run test` | ✅ 131/131 |
| Build | `npm run build` | ✅ 9/9 pages, 0 metadata advisories |
| Fitness functions | `npm run fitness` | ✅ pass |
| Lint | `npm run lint` | ✅ 0 errors, **0 warnings** |
| Accessibility | `npm run a11y` (served build) | ✅ 0 violations on `/`, `/imprensa`, `/parceiros`, `/relatorios`; in-app overlays covered by the P9 `vitest-axe` open-state harness in `npm run test` |

## Running the next phase

Re-invoke the orchestration (or the saved champion prompt) and approve the emitted plan; it
will re-detect the roster, route the applicable agents to the next prioritized slice above,
and re-run this gate. Each completed pass should end with a what/why table (see `CLAUDE.md`).
