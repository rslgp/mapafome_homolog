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

  const provider = useMemo(() => new OpenStreetMapProvider({
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
  }), []);

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