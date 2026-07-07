# EXT-SEC-03 — Migration plan: google-spreadsheet 3.0.10 → 4.x/5.x

**Status:** REPORT-ONLY (no code changed). Prepared 2026-07-07. Verified against
the live tree + the official migration guide (context7 `/theoephraim/node-google-spreadsheet`).

## 1. Why

`package.json:31` pins `google-spreadsheet: "3.0.10"` (exact, no `^`). v3 depends on
`axios@0.19.2` (SSRF/CSRF/ReDoS CVEs) plus a chain of stale transitive deps
(follow-redirects, node-forge, lodash, undici, json-bigint…). Because the sheets
callsites are `'use client'`, that axios chain enters the **client bundle** and blocks
`EXT-SEC-02` (restoring the `npm audit` gate at `--audit-level=high`).

v4+ dropped the bundled axios/lodash auth in favor of `google-auth-library` (JWT) and a
leaner internal http path.

## 2. Load-bearing caveat (read before starting)

The upgrade removes the vulnerable axios chain from the bundle but does **NOT** fix the
deeper defect that `SEC-01` owns: the service-account **private key still ships to the
browser** (`NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`). Any client can still authenticate as the
service account. EXT-SEC-03 is a dependency-hygiene win (kills known CVEs in the bundle),
NOT a fix for the credential exposure. Do not conflate the two in the commit message.
The real fix (a server-side proxy so the key never reaches the client) is SEC-01 / human-gated.

## 3. Breaking API deltas (v3 → v4/v5)

| Area | v3 (today) | v4/v5 (target) |
|---|---|---|
| Import | `const { GoogleSpreadsheet } = require('google-spreadsheet')` | `import { GoogleSpreadsheet } from 'google-spreadsheet'` — **package is ESM-only in v4+**; CommonJS `require()` will throw `ERR_REQUIRE_ESM` |
| Auth | `new GoogleSpreadsheet(id)` then `await doc.useServiceAccountAuth({ client_email, private_key })` | `new JWT({ email, key, scopes })` from `google-auth-library`, passed to `new GoogleSpreadsheet(id, jwt)` — `useServiceAccountAuth` is REMOVED |
| Scopes | implicit | must pass `scopes: ['https://www.googleapis.com/auth/spreadsheets']` explicitly on the JWT |
| Row read | `row.Dados` (direct property) | `row.get('Dados')` |
| Row write | `row.Dados = x` | `row.set('Dados', x)` (then `await row.save()`) |
| `loadInfo` / `sheetsByIndex` / `getRows` / `addRow` / `row.save()` | same | **unchanged** |

`private_key` handling: the `\n`-escaped env value passed to `JWT({ key })` behaves the
same as v3 passed to `useServiceAccountAuth` — no change to how the key string is stored,
only where it is handed in.

## 4. Deps

- Bump `google-spreadsheet` `3.0.10` → latest 4.x or 5.x (targeted `npm install google-spreadsheet@^4` — narrowest, reversible; do NOT nuke node_modules).
- Add/bump `google-auth-library` (present transitively at 5.10.1; add it as a DIRECT dep and let the sheets lib pin the compatible range — v4/5 expects a modern google-auth-library, verify the peer range after install).
- After install: `npm audit --audit-level=high` should drop the axios/follow-redirects/node-forge findings. Record the before/after finding count.

## 5. ESM gotcha (the real risk, not the API)

Every v3 callsite uses `require('google-spreadsheet')`. v4+ is ESM-only. Two callsites
already use the right shape and are LOW risk:
- `relatorio-marketing/page.js:35` already does `await import('google-spreadsheet')` (dynamic import) — only the auth + row API inside it changes.

The `require()` sites must convert to `import` (static, since these are `'use client'`
modules bundled by Next, which handles ESM) OR `await import()` if kept lazy. Verify each
still bundles — a stray `require` of an ESM-only pkg fails at build, not lint. `npm run build`
is the forcing gate here.

## 6. Callsite inventory (what to change, by file)

Auth boilerplate (`new GoogleSpreadsheet` + `useServiceAccountAuth` + `loadInfo`):
- `components/googlesheets/sheetsClient.js` — the CENTRAL client (`getDoc` L32, `ensureReady` L42). Migrate this FIRST; most paths route through it. New shape: build the `JWT` once, pass to the constructor, delete `useServiceAccountAuth`.
- `App.js:118-121`, `appMainBootstrap.js:52-57`, `components/form.js:28-33`, `components/googlesheets/{cleanold,endereco,form,mylocation,sugestao}.js`, `relatorio-marketing/page.js:36-37` — each has its own copy of the boilerplate (pre-`sheetsClient` legacy). Same constructor+JWT change.

Row field ACCESS — **only where `row` is a `GoogleSpreadsheetRow`** (NOT where it is a
parsed `Dados` JSON object):
- REAL row accesses to convert to `row.get()`/`row.set()`:
  - `appPinActions.js:222` `JSON.parse(row.Dados)` → `JSON.parse(row.get('Dados'))`; `:225` `row.Dados = …` → `row.set('Dados', …)`
  - `appPinActions.js:158` `target.Dados = …` → `target.set('Dados', …)` (`:156` read → `target.get('Dados')`)
  - `sheetsClient.js:199-201` `updatePinDadosByCoords` — read `target.get('Dados')`, write `target.set('Dados', …)`
  - `petsData.js:188,196,198` — same read/mutate/write on `target`
  - `endereco.js:142,151`, `form.js:99` (`row.Coordinates = …` → `row.set('Coordinates', …)`)
- FALSE positives — DO NOT touch (these are `.Dados`/`.Coordinates` on a parsed object, not on a row): `JSON.parse(x.Dados).Coordinates`, `JSON.parse(row.Dados)` where the RESULT is read (only the `.Dados` GET on the row itself becomes `row.get('Dados')`; the `.Coordinates` on the parsed object stays a normal property).

The `.get()` sweep touches ~17 `.Dados` + a few `.Coordinates`/`.DateISO`/`.Avaliacao`
row reads — but each must be inspected to confirm the receiver is a row, not a blob.

## 7. Test / verification strategy

- Unit tests mostly mock the sheet (`sheet.getRows`, `row.get/set` on fakes). Search the test
  suite for fakes that set `row.Dados = …` directly and update them to a `get/set`-shaped fake
  (or a small `makeFakeRow()` helper mirroring the v4 row API). `petResolveWriter.test.js` +
  `petsData` tests + any sheetsClient test are the ones to check first.
- The write paths (`addRow`, `row.save()`) cannot be end-to-end verified without live Sheets
  creds (the `NEXT_PUBLIC_*` service account), which are not guaranteed in a dev session — so
  the gate is: unit tests green with the updated fakes + `npm run build` (catches the ESM/require
  break) + `smoke200` (catches a broken bundle) + `npm audit --audit-level=high` (proves the
  chain shrank). Manual live-write smoke is a human follow-up.

## 8. Gate (per roadmap)

`npm audit` (chain reduced) · `npm run test` · `npm run build` · `npm run smoke200` ·
`cd asaas-backend` unaffected (frontend-only). Add the before/after `npm audit` finding count
to the evidence.

## 9. Rollback point

Single revert unit: the dep bump + the callsite edits are one logical change. If audit/build/
smoke go red and cannot be made green in-session, `git revert` the migration commit — v3 is
byte-identical restore (the pinned `3.0.10` + the `require`/`.Dados`/`useServiceAccountAuth`
shape). Do NOT partially migrate (half `require`, half `import`) — that fails build in a
confusing way; migrate all callsites or none.

## 10. Effort estimate

~10 callsites × (auth block + row access) + test-fake updates. Mechanical but wide; the two
traps are (a) the ESM/require conversion silently failing only at build, and (b) mis-converting
a parsed-blob `.Dados` into a `row.get('Dados')`. Budget it as one focused session with the
full gate, not a quick edit.
