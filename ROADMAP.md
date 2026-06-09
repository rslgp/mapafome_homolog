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

## Phase 2 — Next (prioritized)

Each item names the **owner agent(s)**, effort, risk, and the **acceptance criterion** (its
definition of done under the verification gate).

### 🔜 P1 — i18n wiring: make the `es` locale actually render (highest value)
- **Owner:** `softwareengineer` (refactor) + `uiux-defold` (string review)
- **Problem:** `strings.js` has perfect pt-BR/es parity, but only `LocaleSwitch` imports it —
  every component hardcodes pt-BR, so the `es` translations **never render**.
- **Effort:** medium-large (multi-file) · **Risk:** medium (touches many components)
- **Acceptance:** switching locale to `es` renders translated strings across the user-facing
  components; pt-BR/es key parity maintained; no missing/orphaned keys; test + build green.

### 🔜 P2 — `next/image` migration (clear the 24 `no-img-element` warnings)
- **Owner:** `uiux-defold` (UX) + `softwareengineer` (impl)
- **Effort:** medium · **Risk:** medium for data-URI / Leaflet-popup / static-export images
- **Acceptance:** `no-img-element` warnings reduced to 0 where safe (each remaining one
  documented with why); build green; no visual regression on the affected views.

### 🗓️ P3 — Further `App.js` decomposition
- **Owner:** `softwareengineer`
- **Note:** under fitness limits now (989 LOC), but `componentDidMount`/`render` remain large;
  extract cohesive feature modules to improve testability.
- **Effort:** medium · **Risk:** medium (behavior-preserving extraction only)
- **Acceptance:** extracted modules, behavior unchanged, fitness still green, test 89/89.

### 🗓️ P4 — Marker-ring non-text contrast (WCAG 1.4.11)
- **Owner:** `coloring-ict6` (+ UI/game-feel for the thickness encoding)
- **Note:** `coloring-ict6` deferred this — urgency is encoded primarily by ring thickness
  (2/3/5px), color as reinforcement; re-tuning the hue must not break that two-axis encoding.
- **Effort:** small · **Risk:** low-medium · **Acceptance:** marker rings meet 3:1 non-text
  contrast without weakening the thickness encoding; visual review.

### 🗓️ P5 — Live a11y audit (`npm run a11y`)
- **Owner:** `coloring-ict6` + `uiux-defold`
- **Note:** the contrast fixes were verified statically; run axe against the served build.
- **Effort:** small · **Acceptance:** `npm run a11y` reports 0 wcag2aa/wcag22aa violations on
  the key pages (home/map, list, report, info).

### 🗓️ P6 — Resolve Next metadata advisories
- **Owner:** `softwareengineer`
- **Note:** pre-existing build advisories (`metadataBase` not set; `themeColor` → `viewport`
  export). **Effort:** trivial · **Acceptance:** build emits no metadata advisories.

### ⛔ Out of scope (skipped agents)
`competitive-balance` and `game-designer` have no surface on this web app and are not part of
any phase. They would only re-activate if game mechanics were ever added.

---

## Verification gate (definition of done for every phase)

A change ships only when all of these pass (blocking):

| Check | Command | Current |
|---|---|---|
| Unit tests | `npm run test` | ✅ 89/89 |
| Build | `npm run build` | ✅ 9/9 pages |
| Fitness functions | `npm run fitness` | ✅ pass |
| Lint | `npm run lint` | ✅ 0 errors (24 img warnings) |
| Accessibility | `npm run a11y` (served build) | 🔜 run in P5 |

## Running the next phase

Re-invoke the orchestration (or the saved champion prompt) and approve the emitted plan; it
will re-detect the roster, route the applicable agents to the next prioritized slice above,
and re-run this gate. Each completed pass should end with a what/why table (see `CLAUDE.md`).
