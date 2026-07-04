'use client';

import React, { useEffect, useState } from 'react';
import './ScrollAffordance.css';

// Page-level scroll affordance. User testing showed ~80% of visitors never
// scroll: the map swallows drag/wheel gestures and nothing on screen says the
// page continues. One DECORATIVE (aria-hidden, pointer-events:none) fixed
// overlay fixes that:
//
// Bottom veil — a soft gradient at the viewport's bottom edge suggesting
// content continues below the fold. Shown only until the first real scroll
// (same dismissal contract as ViewMoreCue), so the bottom cues (veil +
// ViewMoreCue + scrollbar) never stack after the user has already learned the
// page scrolls.
//
// (The reading-progress bar under the header was removed on user request — a
// solid red bar growing on every vertical scroll read as noise, not a cue.)
export default function ScrollAffordance() {
  const [scrollable, setScrollable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;

    const measure = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setScrollable(max > 48);
      if (y > 32) setDismissed(true);
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div
      className={
        'mdf-scrollveil' +
        (scrollable && !dismissed ? '' : ' mdf-scrollveil--off')
      }
      aria-hidden="true"
    />
  );
}
