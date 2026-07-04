// shareLink.js — UX-M35 native share with a clipboard fallback. Pure, no React,
// so it unit-tests against a fake navigator. The Web Share API (navigator.share)
// opens the OS share sheet (WhatsApp is the product's real growth channel); when
// it is absent OR the user cancels, fall back to copying the URL to the
// clipboard. Returns a discriminated result the caller maps to calm UI copy.
//
// Result.kind:
//   'shared'    — the native share sheet completed.
//   'copied'    — no share sheet (or it threw non-cancel): URL is on the clipboard.
//   'cancelled' — the user dismissed the native share sheet (AbortError). No-op.
//   'unavailable' — neither share nor clipboard is usable. Caller shows the URL.
export async function shareOrCopy({ title, text, url }, nav) {
  const n =
    nav || (typeof navigator !== 'undefined' ? navigator : undefined);
  if (!n) return { kind: 'unavailable', url };

  if (typeof n.share === 'function') {
    try {
      await n.share({ title, text, url });
      return { kind: 'shared', url };
    } catch (err) {
      // User dismissed the sheet — not an error, do nothing further.
      if (err && err.name === 'AbortError') return { kind: 'cancelled', url };
      // Any other failure (e.g. share not allowed here): fall through to copy.
    }
  }

  if (n.clipboard && typeof n.clipboard.writeText === 'function') {
    try {
      await n.clipboard.writeText(url);
      return { kind: 'copied', url };
    } catch (err) {
      // Clipboard blocked — last resort is surfacing the URL itself.
    }
  }

  return { kind: 'unavailable', url };
}
