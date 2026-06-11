/*
 * detectPlatform — pure, framework-free platform classifier for the PWA-lite
 * install flow. It is THE single source of truth for "is this iOS / in-app /
 * standalone" (LBR-D): the shared hook calls it post-mount and every surface
 * consumes the hook, so there is exactly one place that sniffs the UA.
 *
 * SECURITY (LBR-E): navigator.userAgent / platform are attacker-controllable
 * strings. They are treated as DATA only — fed into string tests, never eval'd,
 * never used to fetch or execute anything. This module is the barricade where
 * that untrusted input is normalized into a small set of booleans.
 *
 * PURITY: reads ONLY from the injected `nav` argument (nav.userAgent,
 * nav.platform, nav.maxTouchPoints, nav.standalone). It NEVER touches the global
 * `window`/`navigator`, so it runs in a plain Vitest test against a synthetic
 * object (see detectPlatform.test.js). A missing/partial nav defaults to a safe
 * desktop result with all flags false and never throws.
 *
 * UA PRECEDENCE (documented decisions, in order):
 *   1. Android wins decisively. Any UA containing "android" → platform
 *      'android', isIOS false. This guarantees LBR-A: a real Android Chrome UA
 *      keeps the native beforeinstallprompt branch and is NEVER routed to iOS.
 *   2. "crios" (Chrome on iOS) and "fxios"/"edgios" run on iOS WebKit and, like
 *      Safari, cannot expose a programmatic install API. They are classified iOS
 *      (the manual Add-to-Home / open-in-Safari guidance still applies) — but
 *      only AFTER the Android check above, so an Android device is never caught
 *      here. They are also in-app-ish alt browsers; we still show iOS guidance.
 *   3. Classic iOS: UA matches /iphone|ipad|ipod/.
 *   4. iPadOS 13+ masquerades as desktop Mac (UA says "Macintosh", platform
 *      "MacIntel"). A touch-capable Mac (platform 'MacIntel' && maxTouchPoints
 *      > 1) is an iPad → isIOS true. A genuine desktop Mac (maxTouchPoints 0/1)
 *      stays 'desktop'.
 */

// iOS in-app browser UA tokens. These webviews CANNOT add to home screen (no
// Share -> Add option), so the caller shows "open in Safari" guidance instead of
// Share -> Add steps. Matched case-insensitively as plain substrings.
const IN_APP_TOKENS = [
  'FBAN', // Facebook app (iOS)
  'FBAV', // Facebook app version token
  'FB_IAB', // Facebook in-app browser (Android-style token, harmless on iOS)
  'Instagram',
  'Line', // LINE in-app browser
  'WhatsApp',
  'LinkedIn',
  'LinkedInApp',
  'Twitter',
  'Snapchat',
  'GSA', // Google Search App webview
];

function str(v) {
  return typeof v === 'string' ? v : '';
}

function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

// Pure classifier. `nav` is a navigator-like object (or anything, including
// undefined/null/{}). Never throws.
export default function detectPlatform(nav) {
  const safe = nav && typeof nav === 'object' ? nav : {};
  const ua = str(safe.userAgent);
  const uaLower = ua.toLowerCase();
  const platformStr = str(safe.platform);
  const maxTouch = num(safe.maxTouchPoints);

  // standalone is iOS-specific (Safari sets navigator.standalone === true when
  // launched from the home-screen icon). The caller still OR-s this with
  // matchMedia('(display-mode: standalone)') and window.__mdf_app_installed.
  const isStandalone = safe.standalone === true;

  // (1) Android wins decisively — protects LBR-A.
  const isAndroid = uaLower.indexOf('android') !== -1;

  // (2)+(3) iOS via UA: classic iOS devices and iOS-WebKit alt browsers, but
  // ONLY when not Android.
  const uaSaysIOS =
    !isAndroid &&
    (/iphone|ipad|ipod/.test(uaLower) ||
      uaLower.indexOf('crios') !== -1 ||
      uaLower.indexOf('fxios') !== -1 ||
      uaLower.indexOf('edgios') !== -1);

  // (4) iPadOS-as-Mac: a touch-capable "Mac" is really an iPad.
  const isIPadAsMac =
    !isAndroid && platformStr === 'MacIntel' && maxTouch > 1;

  const isIOS = uaSaysIOS || isIPadAsMac;

  // In-app browser detection is only meaningful on iOS for THIS flow (the
  // Android branch keeps the native prompt regardless). Match tokens
  // case-insensitively as plain substrings.
  const isInAppBrowser =
    isIOS &&
    IN_APP_TOKENS.some((tok) => uaLower.indexOf(tok.toLowerCase()) !== -1);

  let platform = 'desktop';
  if (isAndroid) platform = 'android';
  else if (isIOS) platform = 'ios';

  return { platform, isIOS, isStandalone, isInAppBrowser };
}
