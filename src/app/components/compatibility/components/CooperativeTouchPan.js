'use client';

// CooperativeTouchPan — UX-M02 mobile two-finger pan (sibling of
// CooperativeWheelZoom). One finger over the map scrolls the PAGE; the map
// pans/zooms with two fingers (Leaflet touchZoom). When someone drags with
// one finger — the exact moment they expect the map to move — a calm veil
// says "use two fingers to move the map" and fades after 1.5s.
//
// Coarse-pointer devices only (touch); desktop wheel users are UX-M01's
// CooperativeWheelZoom. Veil is decorative reinforcement (aria-hidden +
// pointer-events:none): the one-finger gesture still does something real
// (scrolls the page), and two-finger pan needs no instruction to keep
// working. Flag off (COOP_GESTURES_ENABLED) = renders null, map untouched.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { COOP_GESTURES_ENABLED } from './coopGesturesConfig';
import { attachCooperativeTouch } from './touchGate';
import { t, useLocale } from './ux/strings';
import './CooperativeTouchPan.css';

const VEIL_MS = 1500;

function isCoarsePointer() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

export default function CooperativeTouchPan() {
  useLocale(); // re-render on locale change so t() re-reads
  const map = useMap();
  const [veil, setVeil] = useState(false);
  const [attached, setAttached] = useState(false);
  const veilTimer = useRef(null);

  useEffect(() => {
    if (!COOP_GESTURES_ENABLED || !isCoarsePointer()) return undefined;
    const gate = attachCooperativeTouch(map, {
      onWrongGesture: () => {
        setVeil(true);
        if (veilTimer.current) clearTimeout(veilTimer.current);
        veilTimer.current = setTimeout(() => setVeil(false), VEIL_MS);
      },
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads matchMedia (external state) post-mount on purpose: a render-time read would touch window during SSR prerender and risk a hydration mismatch (same idiom as ViewMoreCue)
    setAttached(true);
    return () => {
      gate.detach();
      if (veilTimer.current) clearTimeout(veilTimer.current);
    };
  }, [map]);

  if (!attached) return null;

  return createPortal(
    <div
      className={'mdf-cooptouch' + (veil ? ' mdf-cooptouch--on' : '')}
      aria-hidden="true"
    >
      <span className="mdf-cooptouch__pill">{t('page.map.touch_hint')}</span>
    </div>,
    map.getContainer()
  );
}
