// petPhoto.js — SOT + helpers for PET-M15 (photo capture / resize / display).
//
// CONTRACT THIS BUILDS AGAINST (PET-M14, PET_PHOTO_STORAGE_SPIKE.md):
//   The photo BYTES live in an EXTERNAL image host; the sheet holds only a short
//   https URL in Dados.photos (already barricaded by sanitizePhotosUrl). PET-M14
//   §4.4 invariant #5 is the load-bearing honesty here: **there is NO image-host
//   backend wired in this repo, and no no-secret anonymous upload endpoint is
//   configured.** So PET-M15 does NOT invent one. What this module delivers:
//     1. The pure dimension math (computeResizedDimensions) — downscale preserving
//        aspect ratio to the M14 max longest-side (§4.3). PURE + unit-tested.
//     2. The SOT of the §4.3 photo limits (one place, mirroring PET_RECENCY_OPTIONS
//        / the M12 window — never scattered).
//     3. A DOM-bound resize helper (resizeImageFile) that produces a RESIZED,
//        EXIF-stripped JPEG preview client-side — the canvas part needs the DOM, so
//        the dimension math is factored OUT as a pure fn (above) and tested alone.
//     4. looksLikeDirectImageUrl — decides whether Dados.photos is a DIRECT image
//        (render an <img>) or an album/folder link (keep "Ver as fotos do pet").
//
// WHAT ACTUALLY PERSISTS (be honest — surfaced in UI copy + comments):
//   The resized preview is shown LOCALLY only. It is NEVER written to Dados as
//   base64 (PET-M14 rejects base64-in-Dados: fetchPets full-scans every row). The
//   DURABLE published link is still the paste-a-URL field (the M14 low-friction
//   fallback). Real byte-upload to a host is the NAMED HANDOFF (server write proxy,
//   PET-M14 §7 / PET-M4) — when it exists, the preview's blob/dataURL feeds it and
//   the SAME Dados.photos string shape is unchanged.

// ─── §4.3 photo limits — ONE SOT (read by the resize helper AND the tests) ────
// Longest side <= 1600 px (downscale preserving aspect — enough to recognize a
// snout/coat/collar, cheap to serve). Target <= ~1.5 MB after JPEG re-encode at
// quality ~0.82 (the re-encode also DROPS EXIF/GPS — a free PII mitigation, §6).
// These numbers are the PET-M14 starting point; they live here, never spread.
export const PET_PHOTO_LIMITS = {
  maxEdgePx: 1600,        // §4.3 — longest side cap (downscale only, never upscale)
  maxBytes: 1.5 * 1024 * 1024, // ~1.5 MB hard cap after compression
  // JPEG quality ladder: start high, step down until under maxBytes (or floor).
  qualityStart: 0.82,
  qualityMin: 0.5,
  qualityStep: 0.12,
  mimeType: 'image/jpeg', // re-encode to JPEG → strips EXIF (incl. GPS), §6
};

// Pure dimension math: given a source WxH and a max longest-side, compute the
// target WxH preserving aspect ratio. PURE + DETERMINISTIC (no DOM, no canvas) so
// it is unit-tested in isolation — the heart of "client-side resize" without the
// browser. Rules:
//   • DOWNSCALE ONLY: a photo already within the cap is returned UNCHANGED (we
//     never upscale — that would only add bytes and blur, never aid recognition).
//   • Preserve aspect ratio: scale by the longest side; round to whole pixels.
//   • Defensive: non-finite / non-positive dimensions → a safe { width:0,height:0 }
//     (the caller treats a 0-area result as "nothing to draw" and degrades calmly,
//     never throws — mirrors the barricade discipline of petDomain).
//   • Rounded edge never EXCEEDS the cap (we floor the scaled side, then guarantee
//     the constrained edge lands exactly on maxEdge to avoid a 1px overflow).
export function computeResizedDimensions(srcW, srcH, maxEdge = PET_PHOTO_LIMITS.maxEdgePx) {
  const w = Number(srcW);
  const h = Number(srcH);
  const cap = Number(maxEdge);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 0, height: 0 };
  }
  if (!Number.isFinite(cap) || cap <= 0) {
    // No usable cap → return the source unchanged (defensive; never throws).
    return { width: Math.round(w), height: Math.round(h) };
  }
  const longest = Math.max(w, h);
  // Already within the cap → DOWNSCALE-ONLY: return unchanged (rounded).
  if (longest <= cap) {
    return { width: Math.round(w), height: Math.round(h) };
  }
  const scale = cap / longest;
  if (w >= h) {
    // Width is the longest side → pin it exactly to the cap, scale height.
    return { width: Math.round(cap), height: Math.max(1, Math.round(h * scale)) };
  }
  // Height is the longest side → pin it exactly to the cap, scale width.
  return { width: Math.max(1, Math.round(w * scale)), height: Math.round(cap) };
}

// Decide whether a (already-sanitized) photos URL points at a DIRECT, renderable
// image (so the detail sheet shows an <img>) vs an album/folder/page link (where
// an <img> would be a BROKEN image — keep the "Ver as fotos do pet" link instead).
// PURE + DETERMINISTIC, never throws. Conservative on purpose: only return true
// when the URL ends in a known raster image extension (optionally with a query
// string), because a wrong "true" produces a broken <img> — exactly what PET-M15
// forbids. A Google Drive FOLDER, an Instagram/profile page, etc. → false → the
// link path. The caller has ALREADY run sanitizePhotosUrl (http/https barricade);
// this is a SEPARATE, narrower test of "is it a direct image file".
const DIRECT_IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i;
export function looksLikeDirectImageUrl(url) {
  const v = String(url || '').trim();
  if (!v) return false;
  let parsed;
  try {
    parsed = new URL(v);
  } catch (_e) {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  // Test the PATHNAME only (ignore the query/hash): a real image path ends in the
  // extension even when a CDN appends ?v=… cache-busting params.
  return DIRECT_IMAGE_EXT_RE.test(parsed.pathname);
}

// Human-readable cap for UI copy (e.g. "até ~1,5 MB"). PURE. Kept here so the
// number and its label share ONE source — the helper and any copy read the same.
export function maxPhotoMb(limits = PET_PHOTO_LIMITS) {
  return Math.round((limits.maxBytes / (1024 * 1024)) * 10) / 10;
}

// ─── DOM-bound resize helper (impure — needs the browser canvas) ──────────────
// Produces a RESIZED + RE-ENCODED (EXIF-stripped) JPEG from a File/Blob chosen via
// the capture/library input, plus a local objectURL for the <img> preview. The
// PURE math (computeResizedDimensions) is delegated above and tested alone; this
// wrapper only orchestrates the unavoidable DOM (Image decode + canvas draw +
// toBlob). It NEVER uploads and NEVER writes to Dados — the resized blob is a
// LOCAL preview only (PET-M14: no base64-in-Dados; upload is the named handoff).
//
// Returns a Promise of { blob, width, height, previewUrl } or rejects with a
// calm Error. The caller is responsible for URL.revokeObjectURL(previewUrl) when
// the preview is cleared/unmounted (avoids a leaked object URL — BUG-115 class).
//
// Defensive: rejects (never throws synchronously) on a missing file, a non-image
// type, an undecodable image, or a canvas that yields no blob.
export function resizeImageFile(file, limits = PET_PHOTO_LIMITS) {
  return new Promise((resolve, reject) => {
    if (!file || (file.type && file.type.indexOf('image/') !== 0)) {
      reject(new Error('not_an_image'));
      return;
    }
    if (typeof URL === 'undefined' || typeof document === 'undefined') {
      reject(new Error('no_dom'));
      return;
    }
    const sourceUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = computeResizedDimensions(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          limits.maxEdgePx,
        );
        if (width <= 0 || height <= 0) {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error('bad_dimensions'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(sourceUrl);
          reject(new Error('no_canvas_context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Quality ladder: step down until the blob is under the byte cap or we hit
        // the quality floor (recognition does not need pristine quality; the cap
        // protects bandwidth on the panicked owner's phone — M14 §4.3).
        const tryEncode = (quality) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                URL.revokeObjectURL(sourceUrl);
                reject(new Error('encode_failed'));
                return;
              }
              if (blob.size > limits.maxBytes && quality - limits.qualityStep >= limits.qualityMin) {
                tryEncode(quality - limits.qualityStep);
                return;
              }
              URL.revokeObjectURL(sourceUrl);
              const previewUrl = URL.createObjectURL(blob);
              resolve({ blob, width, height, previewUrl });
            },
            limits.mimeType,
            quality,
          );
        };
        tryEncode(limits.qualityStart);
      } catch (e) {
        URL.revokeObjectURL(sourceUrl);
        reject(e instanceof Error ? e : new Error('resize_failed'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('decode_failed'));
    };
    img.src = sourceUrl;
  });
}
