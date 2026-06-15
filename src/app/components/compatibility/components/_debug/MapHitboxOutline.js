'use client';

// MapHitboxOutline — dev-only red outline of the map's tap hitbox.
//
// Opt-in diagnostic, activated only when the URL has `?debug=hitbox`
// (same convention as TapDebugOverlay's `?debug=tap`) — it never ships
// any visible signal to production users.
//
// What it draws: a 2 px red line around the Leaflet map container, i.e.
// the exact region whose pointer/click events MapClickHandler captures
// and where `isMapBackground` decides a tap is "on the map background".
// That container's bounding rect IS the hitbox the tap pipeline reads:
//   • container.getBoundingClientRect() in clientToLatLng()
//   • container.addEventListener('pointerdown' | 'pointerup' | …)
// so outlining the container shows the true hit area, accounting for any
// iOS viewport / invalidateSize shift the user is trying to debug.
//
// Implementation: a child of <MapContainer> so it can reach the live
// L.Map via useMap() and style its real DOM container. We toggle a CSS
// class (not an inline style) so the outline is trivially removable on
// unmount and never fights Leaflet's own inline container styles. The
// rule lives in globals.css under `.mdf-hitbox-debug`.

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const HITBOX_CLASS = 'mdf-hitbox-debug';

const isHitboxDebugEnabled = () => {
    if (typeof window === 'undefined') return false;
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('debug') === 'hitbox';
    } catch (_e) {
        return false;
    }
};

const MapHitboxOutline = () => {
    const map = useMap();

    useEffect(() => {
        if (!isHitboxDebugEnabled()) return undefined;
        if (!map || typeof map.getContainer !== 'function') return undefined;
        const container = map.getContainer();
        if (!container) return undefined;

        container.classList.add(HITBOX_CLASS);
        return () => container.classList.remove(HITBOX_CLASS);
    }, [map]);

    return null;
};

export default MapHitboxOutline;
