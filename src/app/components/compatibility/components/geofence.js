// geofence.js — INTL M1 publish-geofence seam (INTERNATIONAL_PLAN §4.2).
//
// This is the ONE level above the pure predicate where country resolution is
// allowed to live. It exists so:
//   • the pure predicate (isInsideCountry, in countries.js) stays free of the
//     store/flag (ARCH-5 cycle risk: countryStore imports countries.js), and
//   • the pure POJO (variaveisAmbiente.js, ~10 unrelated importers) never grows
//     a hard import of countryStore/intlConfig — it gets the active country via
//     a single INJECTED accessor instead (§4.2).
//
// activeCountryFor resolves the country the same way SearchField already scopes
// the search: INTL flag ON → the user's selected country; OFF → Brazil. With the
// flag OFF (the dark-ship default) this always returns 'br', so the publish gate
// is byte-identical to today.

import { isInsideCountry, DEFAULT_COUNTRY } from './countries';

export { isInsideCountry };

// activeCountryFor(flag, store) — resolve the active country code.
//   flag  = INTL_ENABLED (a boolean; passed in so this stays pure/testable and
//           does not bind to the module-load-resolved import).
//   store = the countryStore module (or any object with getSelectedCountry()).
// OFF (or a store without a usable getter) → DEFAULT_COUNTRY ('br'); the legacy
// Brazil-only behavior. ON → the selected country, falling back to 'br' if the
// store cannot answer (SSR / no window → getSelectedCountry() returns 'br').
export function activeCountryFor(flag, store) {
  if (!flag) return DEFAULT_COUNTRY;
  const getter = store && typeof store.getSelectedCountry === 'function'
    ? store.getSelectedCountry
    : null;
  if (!getter) return DEFAULT_COUNTRY;
  return getter() || DEFAULT_COUNTRY;
}
