'use client';

import React, { useEffect, useRef, useState } from 'react';
import './ViewMoreCue.css';

// Persistent scroll-affordance between the map and the InfoPanel. Without it,
// users only see the map and never discover the legend, acknowledgments, and
// sponsor slot below. Disappears the moment the user actually scrolls.

export default function ViewMoreCue({ label = 'Veja mais abaixo' }) {
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      if (window.scrollY > 32) setDismissed(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // If the user is already mid-page on first mount (e.g. back-nav), hide.
    // Reads window.scrollY (external state) post-mount on purpose: a lazy
    // useState initializer would touch window during render and risk an SSR
    // hydration mismatch in this 'use client' component.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads window.scrollY (external state) post-mount to avoid hydration mismatch
    if (window.scrollY > 32) setDismissed(true);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleClick() {
    setDismissed(true);
    // Scroll to the element right after the cue — that's whatever comes next
    // in the DOM (InfoPanel). Using the sibling avoids a magic selector.
    const el = rootRef.current;
    const next = el && el.nextElementSibling;
    if (next && typeof next.scrollIntoView === 'function') {
      next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof window !== 'undefined') {
      window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
    }
  }

  if (dismissed) return <div ref={rootRef} aria-hidden="true" />;

  return (
    <button
      ref={rootRef}
      type="button"
      className="mdf-viewmore"
      onClick={handleClick}
      aria-label={label}
    >
      <span className="mdf-viewmore__text">{label}</span>
      <span className="mdf-viewmore__chev" aria-hidden="true">⌄</span>
    </button>
  );
}
