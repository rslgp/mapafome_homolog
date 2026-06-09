'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SponsorSlot.css';
import envVariables from '../variaveisAmbiente';
import { resolveRegion } from './regionResolver';
import { eligibleSponsors, clampDescription, PLACEMENTS } from './sponsors';
import { trackSponsorImpression, trackSponsorClick } from './analytics';

// First-party sponsor banner with built-in carousel. Lives below the map in
// non-core surfaces only (InfoPanel today). Never mounts inside the reporter
// or donor sheets.
//
// Carousel behavior:
//   • 1 eligible sponsor  → static render, no rotation
//   • >1 eligible         → auto-advance every `rotateMs` (default 7s)
//   • Pauses on hover + keyboard focus so the reader can finish the description
//   • Honors prefers-reduced-motion: shows only the first pick, no rotation
//   • Fires sponsor_impression once per unique sponsor shown in the session

const DEFAULT_ROTATE_MS = 7000;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SponsorSlot({
  placement = PLACEMENTS.INFO_PANEL_FOOTER,
  rotateMs = DEFAULT_ROTATE_MS,
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // nowTick bumps every 10 min so a long-running session automatically drops
  // sponsors that crossed their expiresAt date without requiring a reload.
  const [nowTick, setNowTick] = useState(() => Date.now());
  const impressionsFiredRef = useRef(new Set());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Resolve region + paid-reach filter. GPS coords arrive asynchronously
  // via App.js; if they're missing we fall back to 'global' sponsors (no
  // precise-reach sponsor will match without coords — that is by design).
  // Re-runs on each nowTick so expired sponsors drop live.
  const { region, pool } = useMemo(() => {
    if (typeof window === 'undefined') return { region: 'global', pool: [] };
    const coords = envVariables.currentLocation?.length === 2
      ? envVariables.currentLocation
      : null;
    const slug = resolveRegion(coords);
    return { region: slug, pool: eligibleSponsors(placement, slug, coords, nowTick) };
  }, [placement, nowTick]);

  // B11: schedule a precise tick at the next sponsor expiresAt boundary so
  // expired sponsors disappear within seconds of their contract end, not up
  // to 10 minutes later. Recomputed every render — cheap, one timer at a time.
  // Must come AFTER the pool useMemo above (TDZ).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let nextDelta = Infinity;
    for (const s of pool) {
      const end = s && s.expiresAt ? Date.parse(s.expiresAt) : NaN;
      if (Number.isFinite(end) && end > Date.now() && end - Date.now() < nextDelta) {
        nextDelta = end - Date.now();
      }
    }
    if (!Number.isFinite(nextDelta)) return;
    const delay = Math.min(nextDelta + 1000, 10 * 60 * 1000);
    const t = setTimeout(() => setNowTick(Date.now()), delay);
    return () => clearTimeout(t);
  }, [pool]);

  // Keep index in bounds if the pool shrinks (e.g. a sponsor just expired) by
  // CLAMPING during render instead of correcting it in an effect. The previous
  // effect (setIndex(0) when out of range) cost an extra render and left one
  // frame where pool[index] was undefined. The stored `index` may briefly be
  // stale; it is never read raw — every read below uses `safeIndex`, and the
  // auto-advance modulo keeps it in range going forward.
  const safeIndex = index < pool.length ? index : 0;

  // Fire an impression for whatever sponsor the carousel is currently on,
  // deduped per session so repeat views of the same sponsor don't inflate.
  useEffect(() => {
    const current = pool[safeIndex];
    if (!current) return;
    const key = `${current.id}|${placement}`;
    if (impressionsFiredRef.current.has(key)) return;
    impressionsFiredRef.current.add(key);
    trackSponsorImpression({ id: current.id, region, placement });
  }, [pool, safeIndex, region, placement]);

  // Auto-advance. Disabled for single-entry pools and reduced-motion users.
  useEffect(() => {
    if (pool.length <= 1) return;
    if (prefersReducedMotion()) return;
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, Math.max(2000, rotateMs));
    return () => clearInterval(t);
  }, [pool.length, rotateMs, paused]);

  if (pool.length === 0) return null;
  const sponsor = pool[safeIndex];
  if (!sponsor) return null;

  const external = /^https?:\/\//i.test(sponsor.href);
  // Use the sponsor's real URL directly. Click attribution is handled by the
  // onClick handler below (fires for left-click and auxclick). If a sponsor
  // wants a tracked interstitial, they can set their href to '/go/{id}/' and
  // ship a static redirector under public/go/{id}/index.html themselves.
  const linkHref = sponsor.href;
  const description = clampDescription(sponsor.description);

  return (
    <section
      className="mdf-sponsor"
      role="complementary"
      aria-label="Parceiro local"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <header className="mdf-sponsor__head">
        <span className="mdf-sponsor__label">Parceiro local</span>
        {pool.length > 1 && (
          <span className="mdf-sponsor__counter" aria-live="off">
            {safeIndex + 1} / {pool.length}
          </span>
        )}
      </header>

      <a
        className="mdf-sponsor__link"
        href={linkHref}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer sponsored' : undefined}
        onClick={() => trackSponsorClick({ id: sponsor.id, region, placement })}
        onAuxClick={() => trackSponsorClick({ id: sponsor.id, region, placement })}
      >
        <img
          className="mdf-sponsor__img"
          src={sponsor.img}
          alt={sponsor.alt}
          loading="lazy"
          decoding="async"
        />
        {description && (
          <p className="mdf-sponsor__desc">{description}</p>
        )}
      </a>

      {pool.length > 1 && (
        <div className="mdf-sponsor__dots" role="tablist" aria-label="Trocar parceiro">
          {pool.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Mostrar ${s.label || s.id}`}
              className={`mdf-sponsor__dot${i === safeIndex ? ' mdf-sponsor__dot--on' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
