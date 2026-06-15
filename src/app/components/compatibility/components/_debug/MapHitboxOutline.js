'use client';

// MapHitboxOutline — dev-only red delimiter of the COUNTRY publish geofence.
//
// Opt-in diagnostic, activated only when the URL has `?debug=hitbox`
// (same convention as TapDebugOverlay's `?debug=tap`) — it never ships
// any visible signal to production users.
//
// WHAT IT DRAWS, and WHY this is the real "hitbox":
// A publish (Confirmar ponto / report sheet / address form) is only
// allowed when the dropped pin sits INSIDE the active country's geofence.
// That geofence is COUNTRY_PUBLISH_BOUNDS[code] in countries.js — a set
// of { N, S, W, E } rectangles — and isInsideCountry(coords, code) is the
// strict-edge predicate the publish guards run. So those rectangles ARE
// the trigger area: a tap inside a box would be accepted; a tap outside
// would be blocked (geofenceBlockMessage). This overlay draws each of the
// active country's rectangles as a red L.rectangle so a developer can SEE,
// directly on the map, which areas trigger in-country vs out-of-country.
//
// It tracks the SELECTED country (countryStore) and re-subscribes, so
// switching the flag re-draws the boxes for the newly selected country.
// When a country has no publish shape (COUNTRY_PUBLISH_BOUNDS[code] is
// absent) nothing is drawn — which is itself the correct signal: every
// pin there is blocked (countries.js D6: "no bounds → blocked").
//
// The rectangles are non-interactive (interactive:false) so they never
// steal the taps the user is trying to test, and live on the overlayPane
// below markers. We add them imperatively via useMap() and remove them on
// unmount / country change, mirroring how map.js manages its L.markers.

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { COUNTRY_PUBLISH_BOUNDS } from '../countries';
import { getSelectedCountry, subscribe } from '../countryStore';

// Hardcoded red on purpose: this is a diagnostic delimiter, not a palette hue.
const HITBOX_RECT_STYLE = {
    color: 'red',
    weight: 2,
    fill: false,
    interactive: false,
};

// Hardcoded blue for the all-countries view: distinct from the per-country red
// so you can tell at a glance which mode is active.
const HITBOX_ALL_RECT_STYLE = {
    color: '#0077ff',
    weight: 1,
    fill: false,
    interactive: false,
    opacity: 0.55,
};

const getDebugMode = () => {
    if (typeof window === 'undefined') return null;
    try {
        return new URLSearchParams(window.location.search).get('debug');
    } catch (_e) {
        return null;
    }
};

const MapHitboxOutline = () => {
    const map = useMap();
    // Re-render (and so re-draw the boxes) when the selected country changes.
    const [country, setCountry] = useState(getSelectedCountry);
    useEffect(() => subscribe(setCountry), []);

    useEffect(() => {
        const mode = getDebugMode();
        if (mode !== 'hitbox' && mode !== 'hitbox_all') return undefined;
        if (!map || typeof map.getContainer !== 'function') return undefined;

        let layers;
        if (mode === 'hitbox_all') {
            // Draw every country's publish rectangles at once in blue.
            layers = Object.values(COUNTRY_PUBLISH_BOUNDS).flatMap((rects) =>
                rects.map((r) =>
                    L.rectangle([[r.S, r.W], [r.N, r.E]], HITBOX_ALL_RECT_STYLE).addTo(map),
                ),
            );
        } else {
            // A country's publish geofence is an array of { N, S, W, E } rects.
            // Each maps to L.rectangle([[S, W], [N, E]]) — SW corner then NE
            // corner, the [lat, lng] pair shape Leaflet expects.
            const rects = COUNTRY_PUBLISH_BOUNDS[country] || [];
            layers = rects.map((r) =>
                L.rectangle([[r.S, r.W], [r.N, r.E]], HITBOX_RECT_STYLE).addTo(map),
            );
        }

        return () => layers.forEach((layer) => layer.remove());
    }, [map, country]);

    return null;
};

export default MapHitboxOutline;
