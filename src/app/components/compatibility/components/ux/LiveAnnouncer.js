'use client';

import React, { useEffect, useRef, useState } from 'react';

// M4 — single aria-live="polite" region. Kept out of the main layout so it
// never shifts visual content. Debounces updates to avoid noise: we only
// announce net-new pins and status flips, not every re-render.

export default function LiveAnnouncer({ dataMaps }) {
  const [msg, setMsg] = useState('');
  const seenRef = useRef(null);

  useEffect(() => {
    if (!Array.isArray(dataMaps)) return;
    const snapshot = new Map();
    for (const row of dataMaps) {
      if (!row) continue;
      const key = row.DateISO || JSON.stringify(row.Coordinates || '');
      if (!key) continue;
      snapshot.set(key, Boolean(row.AlimentoEntregue));
    }
    const prev = seenRef.current;
    seenRef.current = snapshot;
    if (!prev) return; // first render: don't announce the whole world.

    let newPins = 0;
    let newlyAttended = 0;
    snapshot.forEach((attended, key) => {
      if (!prev.has(key)) newPins += 1;
      else if (!prev.get(key) && attended) newlyAttended += 1;
    });

    const parts = [];
    if (newPins > 0) parts.push(newPins === 1 ? 'Novo ponto publicado.' : `${newPins} pontos publicados.`);
    if (newlyAttended > 0) parts.push(newlyAttended === 1 ? 'Um ponto foi atendido.' : `${newlyAttended} pontos atendidos.`);
    // Announces the delta between the current and previous dataMaps snapshot to
    // the aria-live region — an intentional change-driven update (synchronizing
    // an external system: assistive tech). It is not a render-derivable value:
    // it depends on the cross-render diff held in seenRef.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- change-diff announcement to aria-live region; depends on cross-render prev snapshot
    if (parts.length > 0) setMsg(parts.join(' '));
  }, [dataMaps]);

  return (
    <div aria-live="polite" aria-atomic="true" className="mdf-sr-only" role="status">
      {msg}
    </div>
  );
}
