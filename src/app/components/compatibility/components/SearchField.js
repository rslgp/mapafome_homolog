import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { LatLng } from 'leaflet';
import PropTypes from 'prop-types';
import { ICONS } from './mapConstants';
import { getCountry } from './countries';
import { getSelectedCountry, subscribe } from './countryStore';
import { getLocale } from './ux/strings';

/**
 * SearchField Component
 * Adds geosearch functionality to the map.
 *
 * INTL-3: the geocoder scope is no longer hard-pinned to Brazil. The selected
 * country (countryStore, default 'br') drives Nominatim's countrycodes (the
 * load-bearing geographic filter), so the address search returns land in
 * whatever country the user picked via the flag control — "non-water" is
 * inherent, a geocoder never returns open ocean. searchBounds is applied only
 * when the country has known bounds (Brazil keeps its historical clamp);
 * otherwise countrycodes alone keeps results inside the country without an
 * artificial viewport box.
 *
 * accept-language is a SEPARATE axis: it is a BCP-47 LANGUAGE tag that controls
 * the language of the returned place names, NOT a country filter. It must follow
 * the app's UI locale (the strings.js SOT: pt-BR / es), never the country code —
 * a country code like 'jp' or 'us' is not a valid language and yields garbled
 * localized labels. countrycodes does the geographic restriction; accept-language
 * only labels the results.
 *
 * When the country changes we rebuild the provider + control (re-subscribed via
 * countryStore), preserving the 350ms debounce + 50-entry session cache that
 * keeps us under Nominatim's ~1 req/s/IP policy.
 */

// Wrap a leaflet-geosearch provider with a 350ms debounce + a 50-entry session
// cache (B18): provider.search() fires per keystroke, and the OSM Nominatim
// policy is ~1 req/s/IP. Only the last query in a 350ms window goes out; repeat
// queries within the session never hit the network.
function withDebounceCache(base) {
  const cache = new Map();
  const CACHE_LIMIT = 50;
  let pendingTimer = null;
  let pendingResolve = null;

  const originalSearch = base.search.bind(base);
  base.search = (opts) => {
    const key = (opts && opts.query) ? String(opts.query).trim().toLowerCase() : '';
    if (!key) return Promise.resolve([]);
    if (cache.has(key)) return Promise.resolve(cache.get(key));

    // Cancel any in-flight debounce — only the last query in a 350ms window
    // goes out. Earlier promises resolve to [] so the previous dropdown clears
    // rather than showing stale results.
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      if (pendingResolve) pendingResolve([]);
    }

    return new Promise((resolve) => {
      pendingResolve = resolve;
      pendingTimer = setTimeout(async () => {
        pendingTimer = null;
        pendingResolve = null;
        try {
          const results = await originalSearch(opts);
          if (cache.size >= CACHE_LIMIT) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
          }
          cache.set(key, results);
          resolve(results);
        } catch (_e) {
          // On 429 / network failure, resolve to [] so the UI doesn't hang —
          // the user can refine their query.
          resolve([]);
        }
      }, 350);
    });
  };

  return base;
}

// Build a country-scoped, debounced+cached provider. `code` is a lowercase
// ISO-3166 alpha-2 country code; getCountry() always returns a valid country
// (falling back to the default), so the params are never empty.
export function buildCountryProvider(code) {
  const country = getCountry(code);
  const providerOptions = { region: country.code };
  if (country.bounds) {
    providerOptions.searchBounds = [
      new LatLng(country.bounds[0][0], country.bounds[0][1]),
      new LatLng(country.bounds[1][0], country.bounds[1][1]),
    ];
  }
  const base = new OpenStreetMapProvider({
    params: {
      // Result-label language follows the app UI locale (strings.js SOT), NOT
      // the country code. countrycodes below is what restricts results to the
      // chosen country; accept-language only picks the language of the names.
      'accept-language': getLocale(),
      countrycodes: country.code,
      addressdetails: 1,
    },
    providerOptions,
  });
  return withDebounceCache(base);
}

const SearchField = ({ apiKey }) => {
  const map = useMap();

  // Re-render this component when the selected country changes, so the control
  // is rebuilt for the new geocoder scope. We hold the code in state and seed it
  // from the store (default 'br'); the subscription flips it on every change.
  const [countryCode, setCountryCode] = useState(getSelectedCountry);

  useEffect(() => subscribe(setCountryCode), []);

  useEffect(() => {
    const provider = buildCountryProvider(countryCode);
    const searchControl = new GeoSearchControl({
      provider,
      marker: { icon: ICONS.CURRENT_LOCATION, draggable: false },
      autoClose: true,
    });
    map.addControl(searchControl);
    return () => map.removeControl(searchControl);
  }, [map, countryCode]);

  return null;
};

SearchField.propTypes = {
  apiKey: PropTypes.string,
};

export default SearchField;
