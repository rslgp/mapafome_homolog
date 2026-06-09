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

## Phase 3 — Next (prioritized)

What this pass deliberately left open, with the owner and acceptance criterion.

### 🔜 P7 — reconcile the `errors.offline` i18n copy (small, blocks an i18n gap)
- **Owner:** `uiux-defold` (copy/parity) + `softwareengineer` (wire)
- **Problem:** P1 left `errors.offline` **unwired** because the live UI copy in `App.js`
  (`"O ponto foi salvo e será enviado quando a conexão voltar"`) differs from the dictionary value
  (`"Tente de novo quando a conexão voltar"`). Wiring it as-is would regress pt-BR.
- **Acceptance:** a single agreed pt-BR string (and its es pair) in `strings.js`, wired via `t()`;
  pt-BR copy intentionally chosen (not silently changed); test + build green.

### 🔜 P8 — resolve the two dead dictionary keys
- **Owner:** `softwareengineer` (+ `uiux` copy call)
- **Problem:** `errors.server_slow` and `empty.no_pins_anywhere` exist in `strings.js` (both locales)
  but have **no UI call site**. Either wire them to the real surface that should show them, or remove
  them so the dictionary has no dead entries.
- **Acceptance:** every dictionary key has a call site OR is removed; parity preserved; tests green.

### 🗓️ P9 — a11y-audit the in-app overlays (list / report / info)
- **Owner:** `uiux-defold` + `coloring-ict6`
- **Note:** `npm run a11y` audits **URLs**; the list, report, and info surfaces are in-app overlays
  on `/`, not separate routes, so axe-on-URL never reaches their open state. They were verified
  statically (Phase 1 chip fixes) but not live.
- **Acceptance:** each overlay audited in its open state (axe-devtools manual pass, or a test
  harness/Playwright step that opens the overlay then runs axe) → 0 serious/critical violations.

### 🗓️ P10 — further `App.js` extraction (continue P3)
- **Owner:** `softwareengineer`
- **Note:** P3 took the one provably-safe extraction. The remaining surface (`handleChangeTelefone`
  normalization vs `domain/Telefone.js`; `setTipoAlimento`; `writePinToSheets` row shaping) is
  `this`-/side-effect-bound — extract only with a behavior-preserving plan + tests, not mechanically.
  The new `domain/pinCoords.js` is also positioned for the 4 other files with near-identical
  coord logic to adopt in a separate reviewed pass.
- **Acceptance:** extracted modules, behavior unchanged, fitness green, suite still green.

### ⛔ Out of scope (skipped agents)
`competitive-balance` and `game-designer` have no surface on this web app and are not part of
any phase. They would only re-activate if game mechanics were ever added.

---

## Verification gate (definition of done for every phase)

A change ships only when all of these pass (blocking):

| Check | Command | Current |
|---|---|---|
| Unit tests | `npm run test` | ✅ 105/105 |
| Build | `npm run build` | ✅ 9/9 pages, 0 metadata advisories |
| Fitness functions | `npm run fitness` | ✅ pass |
| Lint | `npm run lint` | ✅ 0 errors, **0 warnings** |
| Accessibility | `npm run a11y` (served build) | ✅ 0 violations on `/`, `/imprensa`, `/parceiros`, `/relatorios` (overlays pending P9) |

## Running the next phase

Re-invoke the orchestration (or the saved champion prompt) and approve the emitted plan; it
will re-detect the roster, route the applicable agents to the next prioritized slice above,
and re-run this gate. Each completed pass should end with a what/why table (see `CLAUDE.md`).
