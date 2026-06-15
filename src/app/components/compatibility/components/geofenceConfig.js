// geofenceConfig.js - the on/off switches for the LOCATION-BOUND publish geofence.
//
// TWO INDEPENDENT FLAGS live here, both defaulting OFF (SHIP DARK), both following the
// SAME pattern (env var at build time > DEV_DEFAULT constant):
//
//   1. LOCATION_GEOFENCE_ENABLED (NEXT_PUBLIC_GEOFENCE_LOCATION) - the GPS leg: a user
//      PHYSICALLY in country X may only place marks within country X, where the binding
//      country is the user's GPS-detected physical country, NOT the flag-picker
//      selected country.
//
//   2. IP_GEOFENCE_ENABLED (NEXT_PUBLIC_GEOFENCE_IP) - the IP leg: an ADDITIONAL
//      sub-check, layered on top of the GPS leg, that the user's IP-derived country
//      ALSO equals the GPS-physical country (so a VPN / coarse-IP mismatch blocks). It
//      is a SEPARATE flag, by design, so the IP requirement can be toggled
//      INDEPENDENTLY of the GPS geofence: the combined rule the caller enforces is
//        LOCATION_GEOFENCE_ENABLED && <GPS inside-country check>
//          && IP_GEOFENCE_ENABLED && <IP country == GPS country>.
//      With IP_GEOFENCE_ENABLED OFF, the IP leg vanishes entirely and the rule is
//      exactly the GPS-only path. Two separate flags (vs one shared) means: turning on
//      the GPS geofence does NOT silently also require a working IP lookup, and the IP
//      requirement (a stricter, fail-CLOSED gate that can block a legit user behind a
//      VPN) is opt-in on its own. WHY fail-CLOSED here while the offshore guard fails
//      OPEN: the user explicitly chose the strict AND - see geofenceDecision.js.
//
// Flip each in ONE place. Two ways per flag, in priority order:
//   a. Env var at build time (works in Next output:'export'): e.g. set
//      NEXT_PUBLIC_GEOFENCE_LOCATION=on (or 1/true) / =off (or 0/false). NEXT_PUBLIC_
//      is required so the value is inlined into the client bundle.
//   b. The DEV_DEFAULT constant below, used when the env var is unset. Edit it for a
//      quick local toggle without touching your environment.
//
// When BOTH are DISABLED (the SHIP-DARK default): the publish path is byte-identical
// to today. The existing selected-country / Brazil gate (App.handleClickMap →
// dentroLimites and the M4.5 offshore guard) runs exactly as before; neither leg ever
// calls geolocation, the reverse-geocoder, or the IP API, and neither alters the gate.

// Quick local defaults when the env vars are unset. SHIP DARK: keep BOTH false so
// production behavior is unchanged until someone explicitly enables them.
const DEV_DEFAULT = false;
const DEV_DEFAULT_IP = false;

function readEnvFlag(name) {
  // process.env is statically replaced at build time in Next; guard so a bare
  // runtime without process does not throw. Reads the env var by NAME so both flags
  // share one parser (Postel: liberal input form - on/1/true/yes vs off/0/false/no,
  // case/whitespace tolerant).
  const raw =
    typeof process !== 'undefined' && process.env
      ? process.env[name]
      : undefined;
  if (raw === undefined || raw === null || raw === '') return null;
  const v = String(raw).trim().toLowerCase();
  if (['off', '0', 'false', 'no'].includes(v)) return false;
  if (['on', '1', 'true', 'yes'].includes(v)) return true;
  return null; // unrecognized value -> fall through to the DEV_DEFAULT
}

// Resolved once at module load. The env var wins when set to a recognized value;
// otherwise the matching DEV_DEFAULT applies.
const envFlag = readEnvFlag('NEXT_PUBLIC_GEOFENCE_LOCATION');
export const LOCATION_GEOFENCE_ENABLED = envFlag === null ? DEV_DEFAULT : envFlag;

const envFlagIp = readEnvFlag('NEXT_PUBLIC_GEOFENCE_IP');
export const IP_GEOFENCE_ENABLED = envFlagIp === null ? DEV_DEFAULT_IP : envFlagIp;
