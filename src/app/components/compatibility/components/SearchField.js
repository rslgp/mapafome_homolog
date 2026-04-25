import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { LatLng } from 'leaflet';
import PropTypes from 'prop-types';
import { BRAZIL_BOUNDS, ICONS } from './mapConstants';

/**
 * SearchField Component
 * Adds geosearch functionality to the map.
 * Uses V1 inline providerOptions (searchBounds + region) — V2 accepted those
 * props from parent but never forwarded them into OpenStreetMapProvider.
 * provider and searchControl are memoized to prevent recreation on every render.
 */
const SearchField = ({ apiKey }) => {
  const map = useMap();

  // B18: leaflet-geosearch fires provider.search() on every keystroke. The
  // OSM Foundation Nominatim usage policy is ~1 req/sec/IP — sustained
  // typing risks a block. We wrap the provider with:
  //   • a 350ms debounce so a single hit goes out after the user pauses
  //   • a small in-memory cache (last 50 query→result pairs) so repeat
  //     queries within the session don't hit the network at all
  const provider = useMemo(() => {
    const base = new OpenStreetMapProvider({
      params: {
        'accept-language': 'br',
        countrycodes: 'br',
        addressdetails: 1,
      },
      providerOptions: {
        searchBounds: [
          new LatLng(BRAZIL_BOUNDS.NORTH[0], BRAZIL_BOUNDS.NORTH[1]),
          new LatLng(BRAZIL_BOUNDS.SOUTH[0], BRAZIL_BOUNDS.SOUTH[1]),
        ],
        region: 'br',
      },
    });

    const cache = new Map();
    const CACHE_LIMIT = 50;
    let pendingTimer = null;
    let pendingResolve = null;

    const originalSearch = base.search.bind(base);
    base.search = (opts) => {
      const key = (opts && opts.query) ? String(opts.query).trim().toLowerCase() : '';
      if (!key) return Promise.resolve([]);
      if (cache.has(key)) return Promise.resolve(cache.get(key));

      // Cancel any in-flight debounce — only the last query in a 350ms
      // window goes out. Earlier promises resolve to [] so the previous
      // dropdown clears rather than showing stale results.
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
            // Eviction: drop the oldest entry once we hit the limit.
            if (cache.size >= CACHE_LIMIT) {
              const firstKey = cache.keys().next().value;
              cache.delete(firstKey);
            }
            cache.set(key, results);
            resolve(results);
          } catch (_e) {
            // On 429 / network failure, resolve to [] so the UI doesn't
            // hang — the user can refine their query.
            resolve([]);
          }
        }, 350);
      });
    };

    return base;
  }, []);

  const searchControl = useMemo(() => new GeoSearchControl({
    provider,
    marker: {
      icon: ICONS.CURRENT_LOCATION,
      draggable: false,
    },
    autoClose: true,
  }), [provider]);

  useEffect(() => {
    map.addControl(searchControl);
    return () => map.removeControl(searchControl);
  }, [map, searchControl]);

  return null;
};

SearchField.propTypes = {
  apiKey: PropTypes.string,
};

export default SearchField;