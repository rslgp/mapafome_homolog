// intlConfig.js — single on/off switch for the INTL feature (the flag-driven
// country geocoder + the country and language pickers on the map).
//
// Flip it in ONE place. Two ways, in priority order:
//   1. Env var at build time (works in Next output:'export'): set
//      NEXT_PUBLIC_INTL=off (or 0/false) to disable, =on (or 1/true) to enable.
//      NEXT_PUBLIC_ is required so the value is inlined into the client bundle.
//   2. The DEV_DEFAULT constant below, used when the env var is unset. Edit this
//      line for a quick local toggle without touching your environment.
//
// When DISABLED: the address search stays pinned to Brazil exactly as before
// (SearchField forces 'br' and ignores the selected country), and neither the
// country flag picker nor the language picker mounts. Nothing else changes.

// Quick local default when NEXT_PUBLIC_INTL is unset. Set to false to ship the
// feature dark while keeping all the code in place.
const DEV_DEFAULT = true;

function readEnvFlag() {
  // process.env is statically replaced at build time in Next; guard so a bare
  // runtime without process does not throw.
  const raw =
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_INTL
      : undefined;
  if (raw === undefined || raw === null || raw === '') return null;
  const v = String(raw).trim().toLowerCase();
  if (['off', '0', 'false', 'no'].includes(v)) return false;
  if (['on', '1', 'true', 'yes'].includes(v)) return true;
  return null; // unrecognized value -> fall through to DEV_DEFAULT
}

// Resolved once at module load. The env var wins when set to a recognized value;
// otherwise the DEV_DEFAULT applies.
const envFlag = readEnvFlag();
export const INTL_ENABLED = envFlag === null ? DEV_DEFAULT : envFlag;
