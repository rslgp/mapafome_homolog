'use client';

// CooperativeWheelZoom — UX-M01 desktop cooperative-wheel (Google-embed
// pattern). While the map is "locked", a wheel over it scrolls the PAGE
// (killing the desktop scroll-trap behind the ~80%-never-scroll finding);
// the first click/focus on the map unlocks wheel zoom for the session.
//
// Mounted as a MapContainer child (needs useMap). The hint pill is rendered
// via portal INTO the Leaflet container so this stays fully self-contained
// (CoffeeMap gains exactly one JSX line). Pill is pointer-only instruction:
// aria-hidden + pointer-events:none (zoom buttons and keyboard +/- are
// unaffected by wheel gating, so AT users lose nothing — SC 1.3.1 safe).
// Behind the build-time flag COOP_GESTURES_ENABLED: flag off = legacy
// behavior byte-identical, component renders null and never touches the map.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { COOP_GESTURES_ENABLED } from './coopGesturesConfig';
import { attachCooperativeWheel } from './wheelGate';
import { t, useLocale } from './ux/strings';
import './CooperativeWheelZoom.css';

export default function CooperativeWheelZoom() {
  useLocale(); // re-render on locale change so t() re-reads
  const map = useMap();
  // locked -> nudge (wheel spun while locked, brief emphasis) -> done
  const [phase, setPhase] = useState('locked');
  const nudgeTimer = useRef(null);

  useEffect(() => {
    if (!COOP_GESTURES_ENABLED) return undefined;
    const gate = attachCooperativeWheel(map, {
      onActivate: () => setPhase('done'),
      onNudge: () => {
        setPhase('nudge');
        if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => {
          setPhase((p) => (p === 'nudge' ? 'locked' : p));
        }, 1200);
      },
    });
    return () => {
      gate.detach();
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [map]);

  if (!COOP_GESTURES_ENABLED || phase === 'done') return null;

  return createPortal(
    <div
      className={
        'mdf-coopwheel' + (phase === 'nudge' ? ' mdf-coopwheel--nudge' : '')
      }
      aria-hidden="true"
    >
      {t('page.map.wheel_hint')}
    </div>,
    map.getContainer()
  );
}
