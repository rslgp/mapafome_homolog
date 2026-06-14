'use client';

// PinReadout — TV-3 + TV-6 in tap_visibility_robustness.yaml.
//
// Renders a small fixed-position pill above the InfoPanel showing the
// resolved lat/lng of the dropped pin. Users on any device can verify
// which coordinates will be submitted before pressing "Confirmar ponto".
// A "Limpar" button resets the marker via a public event.
//
// Decoupled signal flow:
//   • mdf:marker-placed   → show pill with coords
//   • mdf:marker-cleared  → hide pill
//   • Reset click         → dispatch mdf:marker-clear-request (CoffeeMap listens)
//
// No props, no prop drilling. Mount once in the layout — App.js or
// InfoPanel.js. Listens to document-level CustomEvents that mapComponents.js
// publishes; this is the Humble Object pattern (Clean Architecture ch.23):
// the component is purely UI; all state transitions originate elsewhere.

import React, { useEffect, useState } from 'react';
import { t, useLocale } from './ux/strings';
import {
    MARKER_PLACED_EVENT,
    MARKER_CLEARED_EVENT,
    MARKER_CLEAR_REQUEST_EVENT,
} from './mapComponents';

const formatCoord = (n) => Number.isFinite(n) ? n.toFixed(5) : '—';

const COPY_FEEDBACK_MS = 1500;

const PinReadout = () => {
    useLocale(); // re-render on locale change so t() re-reads
    const [coords, setCoords] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const onPlaced = (e) => {
            const { lat, lng } = e.detail || {};
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setCoords({ lat, lng });
                setCopied(false);
            }
        };
        const onCleared = () => {
            setCoords(null);
            setCopied(false);
        };
        document.addEventListener(MARKER_PLACED_EVENT, onPlaced);
        document.addEventListener(MARKER_CLEARED_EVENT, onCleared);
        return () => {
            document.removeEventListener(MARKER_PLACED_EVENT, onPlaced);
            document.removeEventListener(MARKER_CLEARED_EVENT, onCleared);
        };
    }, []);

    if (!coords) return null;

    const handleReset = () => {
        if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
        try {
            document.dispatchEvent(new CustomEvent(MARKER_CLEAR_REQUEST_EVENT, {
                detail: { ts: Date.now() },
            }));
        } catch (_e) { /* legacy webview */ }
    };

    // TV-4 (tap_visibility_robustness.yaml): tap on the coord text copies
    // "lat,lng" to clipboard. Useful for: (a) bug reports — users can paste
    // the exact coords they saw; (b) quick lat/lng lookup for power users.
    // Defensive fallback chain:
    //   1) navigator.clipboard.writeText (modern, requires HTTPS or localhost)
    //   2) document.execCommand('copy') via hidden textarea (legacy webviews)
    //   3) silent no-op (very old browsers — feature is purely additive)
    const handleCopyCoords = async () => {
        const text = `${coords.lat},${coords.lng}`;
        const showFeedback = () => {
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        };
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                showFeedback();
                return;
            } catch (_e) { /* permission denied — fall through */ }
        }
        if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.setAttribute('readonly', '');
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showFeedback();
            } catch (_e) { /* very old webview — give up silently */ }
        }
    };

    return (
        <div className="mdf-pin-readout" role="status" aria-live="polite">
            <span className="mdf-pin-readout__icon" aria-hidden="true">📍</span>
            <button
                type="button"
                className="mdf-pin-readout__coords"
                onClick={handleCopyCoords}
                aria-label={t('page.readout.copy_coords_aria').replace('{coords}', `${formatCoord(coords.lat)}, ${formatCoord(coords.lng)}`)}
                title={t('page.readout.copy_coords_title')}
            >
                {copied
                    ? t('page.readout.copied')
                    : `${formatCoord(coords.lat)}, ${formatCoord(coords.lng)}`}
            </button>
            <button
                type="button"
                className="mdf-pin-readout__reset"
                onClick={handleReset}
                aria-label={t('page.readout.clear_aria')}
            >
                {t('page.readout.clear')}
            </button>
        </div>
    );
};

export default PinReadout;
