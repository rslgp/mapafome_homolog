'use client';

// TapDebugOverlay — D-1 + D-2 (LLM_BRAIN/dropped_pin_invisible_mobile.yaml).
//
// Opt-in mobile diagnostic panel. Activated only when the URL has
// `?debug=tap` — never ships visible signal to production users.
//
// What it captures, per tap:
//   • emitTap call count this session (D-2 — H2 double-fire detector)
//   • last lat/lng (D-1 — H4 invalid-coords detector)
//   • last pointerType
//   • whether envVariables.lastMarked is set 50 ms after the event
//   • whether a .mdf-dropped-pin DOM node exists 50 ms after the event
//     (D-1 — H1 invisible-icon detector: if the class is absent, the
//     filter/box-shadow never applied; if the class IS present but the
//     user reports invisibility, the bug is rendering, not creation)
//
// The user opens the page on a known-broken mobile device with
// ?debug=tap, taps the map once, reads the panel, reports the values
// back. From those four data points we can falsify or confirm every
// hypothesis in §2 of the YAML in a single roundtrip.

import React, { useEffect, useState } from 'react';
import { MARKER_PLACED_EVENT } from '../mapComponents';
import envVariables from '../variaveisAmbiente';

const isDebugEnabled = () => {
    if (typeof window === 'undefined') return false;
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('debug') === 'tap';
    } catch (_e) {
        return false;
    }
};

const TapDebugOverlay = () => {
    const [enabled] = useState(isDebugEnabled);
    const [stats, setStats] = useState({
        count: 0,
        lat: null,
        lng: null,
        pointerType: null,
        ts: null,
        lastMarkedSet: null,
        droppedPinInDom: null,
        source: null,
    });

    useEffect(() => {
        if (!enabled || typeof document === 'undefined') return undefined;
        const onPlaced = (e) => {
            const { lat, lng, source, pointerType, ts } = e.detail || {};
            // Probe DOM presence at +50 ms — gives Leaflet's _icon
            // attachment + paint at least one frame to settle.
            setTimeout(() => {
                setStats((prev) => ({
                    count: prev.count + 1,
                    lat,
                    lng,
                    pointerType,
                    ts,
                    source,
                    lastMarkedSet: !!envVariables.lastMarked,
                    droppedPinInDom: !!document.querySelector('.mdf-dropped-pin'),
                }));
            }, 50);
        };
        document.addEventListener(MARKER_PLACED_EVENT, onPlaced);
        return () => document.removeEventListener(MARKER_PLACED_EVENT, onPlaced);
    }, [enabled]);

    if (!enabled) return null;

    const fmt = (v) => (v === null || v === undefined ? '—' : String(v));
    const finite = (n) => (Number.isFinite(n) ? n.toFixed(5) : '✗');

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                top: 8,
                right: 8,
                zIndex: 9999,
                background: 'rgba(0, 0, 0, 0.82)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: 6,
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 11,
                lineHeight: 1.35,
                pointerEvents: 'none',
                maxWidth: 240,
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>TAP DEBUG</div>
            <div>count: {stats.count}</div>
            <div>lat: {finite(stats.lat)}</div>
            <div>lng: {finite(stats.lng)}</div>
            <div>ptr: {fmt(stats.pointerType)}</div>
            <div>via: {fmt(stats.source)}</div>
            <div>lastMarked: {fmt(stats.lastMarkedSet)}</div>
            <div>pin in DOM: {fmt(stats.droppedPinInDom)}</div>
        </div>
    );
};

export default TapDebugOverlay;
