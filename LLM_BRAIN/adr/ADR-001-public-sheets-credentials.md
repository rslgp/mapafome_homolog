# ADR-001: NEXT_PUBLIC Google Sheets service-account credentials

**Status:** Proposed
**Date:** 2026-04-25
**v5 anchors:** § security_engineering.secrets_management.never · § security_engineering.threat_modeling.stride_model · § decision_frameworks.type1_type2 (Type-1)
**Bug ref:** v5_audit.yaml V8

## Context

MAPA FOME is a static-export Next.js app. It uses Google Sheets as the only persistence layer. To call Sheets directly from the browser, the project ships service-account credentials via `NEXT_PUBLIC_*` env vars:

- `NEXT_PUBLIC_GOOGLESHEETID`
- `NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`

`NEXT_PUBLIC_*` values are inlined into the client bundle. Every visitor receives the credentials. Per v5 § security_engineering.secrets_management this is a textbook **never** ("Hardcode secrets in source code, config files, or Docker images").

The choice was deliberate: zero backend, free GitHub Pages hosting, community-edit model, no per-user accounts. Removing this would require a server (Edge Function / Cloudflare Worker) that proxies all reads/writes — a significant architectural and operational change.

This ADR documents the trade-off, the threat model, and the mitigations. It is a Type-1 decision (one-way door for the architecture) and must be Accepted before VM-series engineering milestones depend on it.

## STRIDE pass on current architecture

| Threat | Asset | Current control | Residual risk |
|---|---|---|---|
| **Spoofing** | Pin authorship | None — pins have no author | Acceptable: dignity-by-anonymity is intentional |
| **Tampering** | Pin data integrity | Anyone with the leaked credentials can edit/delete any row | **High** — a hostile actor can erase the map |
| **Repudiation** | Audit trail | Sheet revision history (Google-side, last 30 days) | Medium — relies on Google's retention |
| **Information Disclosure** | Telefone (encrypted via AES key in NEXT_PUBLIC_CRYPTSEED) | Encryption key is also public — encryption is theatrical | **High** for any reporter who provided a phone |
| **Denial of Service** | Availability of pins | Sheets API quota (300 req/min/project, 60 req/user). Hostile actor can exhaust quota | **High** — ~1 hour of bot writes can lock the map for legit users |
| **Elevation of Privilege** | Sheet roles | Service account is `Editor` on all sheets | Medium — no admin path exposed |

## Decision options

### Option A — Accept-with-controls (status quo + hardening)

Keep `NEXT_PUBLIC_*` credentials. Layer compensating controls:

1. **Sheet-level ACLs:** restrict the service account to `Editor` on the data sheet only, not the doc.
2. **Append-only audit sheet:** every write also logs to a separate sheet the SA cannot delete from. Tamper detection by diffing.
3. **Daily key rotation:** automate via a scheduled GitHub Action; old key is invalidated within 24h.
4. **Quota canary:** a synthetic monitor (uptime check) that detects DoS-by-flood within 5 minutes.
5. **`gitleaks` pre-commit + CI:** prevent additional secrets being added (already covered by VM9 fitness function FF4).
6. **AES key:** acknowledge it as obfuscation only, NOT a secret. Stop calling encrypted phones "secured" in user-facing copy.

**Pros:** zero backend cost, ships today, preserves the static-export deploy target.
**Cons:** Tampering and Information Disclosure remain High. v5 § corrections.security_phases warns retrofit costs are 30× design-time.

### Option B — Migrate to thin backend proxy

Introduce a small backend (Cloudflare Worker, Vercel Edge, or Deno Deploy):

- Browser sends request to `api.mapafome.com.br/pins`.
- Worker holds the SA credentials in its secret store.
- Worker validates payload (VM6 barricade) and rate-limits per IP.
- Worker writes to Sheets.
- Reads can stay client-side via a public read-only sheet OR also proxy.

**Pros:** Eliminates the v5 § secrets_management violation. Adds rate limiting, abuse logging, IP-based DoS mitigation.
**Cons:** New infrastructure (~$0–5/month at current scale). Static-export build no longer enough — needs a worker deploy. Adds a SPOF.

### Option C — Migrate fully to a managed backend (Supabase, Firebase, etc.)

**Pros:** Eliminates Sheets entirely; gains row-level security, Postgres, real auth.
**Cons:** Major rewrite. Vendor lock-in. Conflicts with the no-backend, community-edit ethos. Out of scope for this ADR.

## Decision

**Option A — Accept-with-controls — for the next 6 months.** Re-evaluate at 2026-10-25.

Rationale:
- Current scale (≤1k pins, ≤100 daily reporters) does not justify operational cost of B.
- Project is in growth phase; the social pitch + reporter flow are higher-leverage than security retrofit.
- Mitigations (1)–(6) bring residual risk to Medium.
- An attack (mass deletion, DoS) is recoverable: Sheet revision history + audit sheet + key rotation can restore state within 24h.

## Consequences

**Easier:**
- Continue static-export deploy via GitHub Pages.
- No infrastructure on-call.
- New contributors edit Sheets directly (community-edit promise stays).

**Harder:**
- Cannot accept reporter PII beyond the already-public Telefone.
- Cannot make "encrypted" claims — copy must be reviewed (todo: audit copy in [parceiros/page.js](src/app/parceiros/page.js), [InfoPanel.js](src/app/components/compatibility/components/InfoPanel.js)).
- Re-evaluation at 2026-10-25 OR sooner if any of these triggers fire:
  - First confirmed tampering incident
  - First DoS that exceeds 6h recovery
  - Reporter count crosses 1000/day
  - GDPR/LGPD complaint regarding the AES key

**Impossible (until reversed):**
- Accepting truly private data (CPF, address, sensitive demographic). Document this in `design_brief.yaml` § dignity_constraints.

## Action items (gating Acceptance)

- [ ] Add `gitleaks` pre-commit hook (covered by VM9)
- [ ] Audit user-facing copy for "encrypted" / "secure" claims and adjust
- [ ] Set up daily key rotation GitHub Action
- [ ] Create append-only audit sheet + write-mirror in `sheetsClient.js`
- [ ] Add quota canary (e.g. UptimeRobot hitting a known pin every 5 min)
- [ ] Document recovery runbook: how to restore pin data from Sheet revision history

## Alternatives considered

Both Option B and Option C above. C deferred indefinitely; B revisited per the 6-month re-eval trigger.
