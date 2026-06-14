// geofenceConfig.js — single on/off switch for the LOCATION-BOUND publish geofence
// (the rule that a user PHYSICALLY in country X may only place marks within country
// X, where the binding country is the user's GPS-detected physical country, NOT the
// flag-picker selected country).
//
// Flip it in ONE place. Two ways, in priority order:
//   1. Env var at build time (works in Next output:'export'): set
//      NEXT_PUBLIC_GEOFENCE_LOCATION=off (or 0/false) to disable, =on (or 1/true) to
//      enable. NEXT_PUBLIC_ is required so the value is inlined into the client bundle.
//   2. The DEV_DEFAULT constant below, used when the env var is unset. Edit this line
//      for a quick local toggle without touching your environment.
//
// When DISABLED (the SHIP-DARK default): the publish path is byte-identical to today.
// The existing selected-country / Brazil gate (App.handleClickMap → dentroLimites and
// the M4.5 offshore guard) runs exactly as before; the OFF path NEVER calls
// geolocation or the reverse-geocoder for this feature and NEVER alters the gate.
// Nothing else changes.

// Quick local default when NEXT_PUBLIC_GEOFENCE_LOCATION is unset. SHIP DARK: keep
// this false so production behavior is unchanged until someone explicitly enables it.
const DEV_DEFAULT = false;

function readEnvFlag() {
  // process.env is statically replaced at build time in Next; guard so a bare
  // runtime without process does not throw.
  const raw =
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_GEOFENCE_LOCATION
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
export const LOCATION_GEOFENCE_ENABLED = envFlag === null ? DEV_DEFAULT : envFlag;
