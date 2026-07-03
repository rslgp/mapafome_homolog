// coopGesturesConfig.js — single on/off switch for cooperative map gestures
// (UX-M01 desktop cooperative-wheel; UX-M02 mobile two-finger pan will read
// the same flag). Mirrors the intlConfig.js house pattern.
//
// Flip it in ONE place. Two ways, in priority order:
//   1. Env var at build time (works in Next output:'export'): set
//      NEXT_PUBLIC_COOP_GESTURES=off (or 0/false) to disable, =on to enable.
//      NEXT_PUBLIC_ is required so the value is inlined into the client bundle.
//   2. The DEV_DEFAULT constant below, used when the env var is unset.
//
// When DISABLED: the map's wheel/drag behavior is byte-identical to the
// legacy behavior (scrollWheelZoom always on); the hint pill never mounts.
// Rollback = flip the env var and rebuild (feature-flags-build-time house
// decision — no runtime kill switch in a static export).

const DEV_DEFAULT = true;

function readEnvFlag() {
  const raw =
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_COOP_GESTURES
      : undefined;
  if (raw === undefined || raw === null || raw === '') return null;
  const v = String(raw).trim().toLowerCase();
  if (['off', '0', 'false', 'no'].includes(v)) return false;
  if (['on', '1', 'true', 'yes'].includes(v)) return true;
  return null; // unrecognized value -> fall through to DEV_DEFAULT
}

const envFlag = readEnvFlag();
export const COOP_GESTURES_ENABLED = envFlag === null ? DEV_DEFAULT : envFlag;
