#!/usr/bin/env node
/*
 * rollback-drill.mjs — INTL M5 (MISS-1) reproducible ROLLBACK DRILL.
 *
 * WHAT ROLLBACK IS (INTERNATIONAL_PLAN §5 M5 "DRILL de rollback"): the INTL flag
 * (INTL_ENABLED in intlConfig.js) is resolved ONCE at MODULE LOAD from
 * NEXT_PUBLIC_INTL / DEV_DEFAULT — it is NOT a runtime kill-switch. So rolling an
 * intl ship back is NOT a toggle: it is a REBUILD with NEXT_PUBLIC_INTL=off and a
 * REDEPLOY. This script proves that rollback target works: under the OFF flag the
 * publish geofence is Brazil-only again and an international pin is REJECTED.
 *
 * EXPOSURE WINDOW (INTERNATIONAL_PLAN intl-r3-sw-cache-rollback): the wall-clock
 * of build+deploy is only PART of the rollback window. Active returning clients
 * adopt at ~(next client load)+30s (swRegister.js calls reg.update() each load,
 * the toast auto-accepts at FORCE_RELOAD_MS=30000). sw.js does NOT skipWaiting on
 * install by design (B16), so a dormant never-reloaded tab is the only unbounded
 * cohort. For a ship judged UNSAFE, decide in the drill: force SKIP_WAITING for a
 * faster rollback, OR accept the bounded lag. On-call note: rollback = rebuild +
 * redeploy, never a runtime toggle.
 *
 * ── THE FAST, ALWAYS-RUN CORE (no build needed) ──────────────────────────────
 * This script PROVES, against the committed source:
 *   1. With NEXT_PUBLIC_INTL=off, INTL_ENABLED resolves to false (intlConfig.js
 *      has no relative imports, so it loads under raw Node directly — the
 *      dark-ship invariant: the flag must stay OFF in source; M5 here does the
 *      wiring + drill, NOT the flip).
 *   2. The OFF publish geofence (variaveisAmbiente.dentroLimites delegating to
 *      isInsideCountry(coords,'br')) REJECTS an international pin (Lisbon) and
 *      ACCEPTS a Brazil pin — i.e. the M0 dark-ship contract holds on the OFF
 *      artifact ("confirm an international pin is rejected again"). The geofence
 *      modules use extensionless (bundler) imports, so this assertion runs in the
 *      VITEST harness (the same resolver the M0 corpus uses), via
 *      test/rollbackDrill.test.js — this script invokes it with `vitest run`.
 *
 * ── THE FULL DRILL (what an operator runs for a real rollback) ───────────────
 * The commands below are the documented, reproducible procedure. This script
 * RUNS the core assertions; the build + full gate are printed (and run with
 * --build) so the wall-clock is captured against the real OFF artifact:
 *
 *   # 1. Build the rollback (OFF) artifact and capture wall-clock:
 *   #    (committed DEV_DEFAULT is already OFF; the env var makes it explicit)
 *   NEXT_PUBLIC_INTL=off npm run build        # PowerShell: $env:NEXT_PUBLIC_INTL='off'; npm run build
 *   # 2. Run the M0 corpus + the rest of the gate against the OFF source:
 *   npm run test                              # includes geofence.characterization (M0) + this drill
 *   npm run lint && npm run fitness
 *   NEXT_PUBLIC_INTL=off npm run smoke200     # serves out/, asserts 200 + real render
 *   # 3. Confirm an international pin is rejected (this script does it directly).
 *   # 4. Redeploy out/ ; note the adoption-lag window above. Leave the flag OFF.
 *
 * Usage:
 *   node scripts/rollback-drill.mjs           # core assertions only (fast)
 *   node scripts/rollback-drill.mjs --build   # also runs `npm run build` OFF + times it
 *
 * Exit non-zero on ANY failed assertion so the drill is a real gate, not a memo.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

let failures = 0;
function check(label, cond) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    console.error(`  FAIL  ${label}`);
    failures += 1;
  }
}

async function main() {
  console.log('[rollback-drill] INTL M5 (MISS-1) — proving the OFF (rollback) artifact.\n');

  // Force the OFF env for the in-process resolution, mirroring the rollback build.
  process.env.NEXT_PUBLIC_INTL = 'off';

  // 1. Committed flag resolves OFF under NEXT_PUBLIC_INTL=off (intlConfig.js has
  //    no relative imports → loads under raw Node directly).
  const intlCfg = await import(
    '../src/app/components/compatibility/components/intlConfig.js'
  );
  check('NEXT_PUBLIC_INTL=off → INTL_ENABLED resolves false', intlCfg.INTL_ENABLED === false);

  // 2. The OFF publish geofence rejects an intl pin — run the M0 corpus + the
  //    drill test in the vitest harness (which resolves the geofence modules'
  //    extensionless imports). A failure here means the OFF artifact does NOT
  //    reject international pins → rollback would NOT be safe.
  console.log('\n[rollback-drill] Running the M0 corpus + drill rejection test (vitest)…');
  try {
    execSync('npx vitest run geofence.characterization rollbackDrill', {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env, NEXT_PUBLIC_INTL: 'off' },
    });
    check('M0 corpus + intl-pin-rejection test green against OFF source', true);
  } catch (_e) {
    check('M0 corpus + intl-pin-rejection test green against OFF source', false);
  }

  // 3. Optional: actually rebuild the OFF artifact and capture wall-clock.
  if (process.argv.includes('--build')) {
    console.log('\n[rollback-drill] Rebuilding the OFF artifact (npm run build, NEXT_PUBLIC_INTL=off)…');
    const t0 = Date.now();
    try {
      execSync('npm run build', {
        cwd: repoRoot,
        stdio: 'inherit',
        env: { ...process.env, NEXT_PUBLIC_INTL: 'off' },
      });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n[rollback-drill] OFF build wall-clock: ${secs}s (build step only; add deploy + adoption lag).`);
    } catch (_e) {
      console.error('[rollback-drill] FAIL  npm run build (OFF) did not exit 0');
      failures += 1;
    }
  } else {
    console.log('\n[rollback-drill] (skipped the OFF rebuild — pass --build to run + time it)');
  }

  console.log('');
  if (failures > 0) {
    console.error(`[rollback-drill] ${failures} assertion(s) FAILED — the OFF artifact does NOT reject intl pins.`);
    process.exit(1);
  }
  console.log('[rollback-drill] OK — OFF artifact is Brazil-only; an international pin is rejected. Leave the flag OFF.');
}

main().catch((e) => {
  console.error('[rollback-drill] crashed:', e);
  process.exit(1);
});
