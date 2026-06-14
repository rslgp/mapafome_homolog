'use client';

// LocationLocaleDetect — the single mount host for first-session location-derived
// UI language (LOC-LANG). Rendered once at the app root (layout.js), next to
// LocaleAutoDetect, so every route gets it without per-page wiring. It renders
// nothing and does all its work in a mount-effect (useLocationLocale), so:
//   • SSR / static export prerenders the DEFAULT_LOCALE (pt-BR) HTML, this
//     component contributes no markup, and the first client render matches the
//     prerendered HTML => no hydration mismatch (R12), same reasoning as the
//     browser-language LocaleAutoDetect.
//   • The location->locale path obeys the SAME 'stored/manual choice wins' gate as
//     useAutoDetectLocale: it never overrides a stored mdf_locale. A manual pick
//     (or a prior auto-detected, now-persisted choice) always wins.
//   • On ANY failure (geolocation denied/timeout, no fetch, ocean/network reverse-
//     geocode miss) it does nothing: today's default locale behavior is unchanged.
//
// COMPOSITION ROOT (DI): the engine hook stays free of the geocoder so there is no
// import cycle (the geocoder imports getLocale from the strings barrel). This host
// injects the concrete reverseGeocodeCountry — the SAME Nominatim reverse-geocode
// surface the publish-offshore guard and the address search already use, so NO new
// geocoding dependency is added.

import { useLocationLocale } from './compatibility/components/ux/strings';
import { reverseGeocodeCountry } from './compatibility/components/reverseGeocodeGuard';

export default function LocationLocaleDetect() {
  useLocationLocale(reverseGeocodeCountry);
  return null;
}
