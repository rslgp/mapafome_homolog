'use client';

import React, { useEffect, useRef, useState } from 'react';
import './ScrollAffordance.css';

// Page-level scroll affordances. User testing showed ~80% of visitors never
// scroll: the map swallows drag/wheel gestures and nothing on screen says the
// page continues. Two DECORATIVE (aria-hidden, pointer-events:none) fixed
// overlays fix that:
//
// 1. Progress bar — a thin brand-colored bar under the sticky header whose
//    width tracks reading position. Constant, quiet proof that the page is
//    taller than the screen (and feedback while scrolling). Driven by direct
//    DOM writes inside requestAnimationFrame (no per-frame React render).
// 2. Bottom veil — a soft gradient at the viewport's bottom edge suggesting
//    content continues below the fold. Shown only until the first real
//    scroll (same dismissal contract as ViewMoreCue), so the three bottom
//    cues (veil + ViewMoreCue + scrollbar) never stack after the user has
//    already learned the page scrolls.
export default function ScrollAffordance() {
  const barRef = useRef(null);
  const [scrollable, setScrollable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf = 0;

    const measure = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      if (barRef.current) {
        const p = max > 0 ? Math.min(y / max, 1) : 0;
        barRef.current.style.transform = `scaleX(${p})`;
      }
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
    <>
      <div
        className={
          'mdf-scrollprogress' + (scrollable ? '' : ' mdf-scrollprogress--off')
        }
        aria-hidden="true"
      >
        <div className="mdf-scrollprogress__bar" ref={barRef} />
      </div>
      <div
        className={
          'mdf-scrollveil' +
          (scrollable && !dismissed ? '' : ' mdf-scrollveil--off')
        }
        aria-hidden="true"
      />
    </>
  );
}
