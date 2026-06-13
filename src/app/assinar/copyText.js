// copyText.js — clipboard write with a legacy execCommand fallback for insecure/
// old contexts (no navigator.clipboard). A generic, side-effecting browser util
// with no React. Extracted from page.js (SRP) so the payment-render cluster
// (PaymentArtifacts) owns it via CopyButton. Returns Promise<boolean> success.
// No 'use client' needed by itself, but it only runs client-side (touches
// navigator/document) — its sole caller is the 'use client' PaymentArtifacts.

export async function copyText(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
