// petPhoto.test.js — PET-M15 (the PURE resize math + the direct-image URL test).
//
// The canvas part of resizeImageFile needs the DOM, so the dimension math is
// factored OUT as a pure fn (computeResizedDimensions) and tested ALONE here —
// "client-side resize" proven without a browser. We also test looksLikeDirectImageUrl
// (decides <img> vs the album-link path) and the §4.3 limits SOT.
//
// All pure: no DOM, no mocks. The cap is read from the PET_PHOTO_LIMITS SOT (not
// hardcoded) so a change to the M14 dimension lands here automatically.

import { describe, it, expect } from 'vitest';
import {
  computeResizedDimensions,
  looksLikeDirectImageUrl,
  maxPhotoMb,
  PET_PHOTO_LIMITS,
} from './petPhoto';

const CAP = PET_PHOTO_LIMITS.maxEdgePx; // 1600 — the M14 §4.3 longest-side cap

describe('computeResizedDimensions — downscale preserving aspect ratio', () => {
  it('returns the source UNCHANGED when already within the cap (downscale-only)', () => {
    // A small photo is never upscaled — that adds bytes/blur, never recognition.
    expect(computeResizedDimensions(800, 600, CAP)).toEqual({ width: 800, height: 600 });
    expect(computeResizedDimensions(CAP, CAP, CAP)).toEqual({ width: CAP, height: CAP });
  });

  it('downscales a LANDSCAPE image so the WIDTH lands exactly on the cap', () => {
    // 4000x2000 (2:1) → width pinned to 1600, height scaled to 800 (aspect kept).
    const out = computeResizedDimensions(4000, 2000, CAP);
    expect(out.width).toBe(CAP);
    expect(out.height).toBe(800);
  });

  it('downscales a PORTRAIT image so the HEIGHT lands exactly on the cap', () => {
    // 2000x4000 (1:2) → height pinned to 1600, width scaled to 800.
    const out = computeResizedDimensions(2000, 4000, CAP);
    expect(out.height).toBe(CAP);
    expect(out.width).toBe(800);
  });

  it('a SQUARE over the cap scales both sides to the cap', () => {
    expect(computeResizedDimensions(3200, 3200, CAP)).toEqual({ width: CAP, height: CAP });
  });

  it('NEVER exceeds the cap on the longest side (no 1px overflow)', () => {
    // Awkward ratio that could round up without the explicit pin.
    const out = computeResizedDimensions(3333, 1777, CAP);
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(CAP);
    // Aspect ratio stays close to the source (within a pixel of rounding).
    const srcRatio = 3333 / 1777;
    const outRatio = out.width / out.height;
    expect(Math.abs(srcRatio - outRatio)).toBeLessThan(0.02);
  });

  it('preserves aspect ratio within rounding for a tall sliver', () => {
    // 100x4000 → height to 1600, width scaled to >=1 (never 0).
    const out = computeResizedDimensions(100, 4000, CAP);
    expect(out.height).toBe(CAP);
    expect(out.width).toBeGreaterThanOrEqual(1);
  });

  it('is DEFENSIVE: non-finite / non-positive dimensions → {0,0} (never throws)', () => {
    for (const bad of [
      [0, 100], [100, 0], [-10, 50], [NaN, 100], [100, Infinity], ['x', 100], [null, null],
    ]) {
      expect(() => computeResizedDimensions(bad[0], bad[1], CAP)).not.toThrow();
      expect(computeResizedDimensions(bad[0], bad[1], CAP)).toEqual({ width: 0, height: 0 });
    }
  });

  it('with an unusable cap, returns the source unchanged (never throws)', () => {
    expect(computeResizedDimensions(4000, 2000, 0)).toEqual({ width: 4000, height: 2000 });
    expect(computeResizedDimensions(4000, 2000, NaN)).toEqual({ width: 4000, height: 2000 });
  });

  it('defaults the cap to the SOT when omitted', () => {
    // Calling without maxEdge uses PET_PHOTO_LIMITS.maxEdgePx.
    expect(computeResizedDimensions(4000, 2000)).toEqual({ width: CAP, height: 800 });
  });
});

describe('looksLikeDirectImageUrl — <img> vs album-link decision', () => {
  it('TRUE for a direct image path (known raster extension, http/https)', () => {
    for (const u of [
      'https://host.example/abc.jpg',
      'http://host.example/photo.JPEG',
      'https://cdn.example/x/y/z.png',
      'https://host.example/p.webp',
      'https://host.example/a.gif',
      'https://host.example/a.avif',
    ]) {
      expect(looksLikeDirectImageUrl(u)).toBe(true);
    }
  });

  it('TRUE even with a cache-busting query string (extension is on the path)', () => {
    expect(looksLikeDirectImageUrl('https://cdn.example/cat.jpg?v=42&w=800')).toBe(true);
  });

  it('FALSE for an album/folder/page link (would be a broken <img>)', () => {
    for (const u of [
      'https://drive.google.com/drive/folders/abcdef',     // Drive FOLDER, not an image
      'https://www.instagram.com/p/abc/',
      'https://photos.app.goo.gl/xyz',
      'https://host.example/gallery',
      'https://host.example/image-page.html',
    ]) {
      expect(looksLikeDirectImageUrl(u)).toBe(false);
    }
  });

  it('FALSE for non-http(s) schemes and junk (mirrors the sanitize barricade)', () => {
    for (const u of ['', null, undefined, 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'not a url', 'ftp://h/a.jpg']) {
      expect(looksLikeDirectImageUrl(u)).toBe(false);
    }
  });
});

describe('PET_PHOTO_LIMITS SOT + maxPhotoMb', () => {
  it('exposes the M14 §4.3 caps and a human MB label derived from the same number', () => {
    expect(PET_PHOTO_LIMITS.maxEdgePx).toBe(1600);
    expect(maxPhotoMb()).toBe(1.5); // 1.5 MB derived from maxBytes, one source
  });
});
