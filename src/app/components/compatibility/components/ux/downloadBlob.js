// Client-side file download helper — the single home of the Blob → anchor → click
// flow that triggers a browser "Save as" for an in-memory string.
//
// Extracted from the byte-identical `downloadBlob()` that lived in BOTH
// src/app/relatorios/page.js and src/app/relatorio-marketing/page.js (P12,
// SOT/DRY): one fact, one home. SSR-guarded (`typeof window`) so it is a no-op
// during static export / prerender; revokes the object URL after the click.
//
// Touches the DOM, so it is exercised through the report pages rather than a
// pure unit test (see P12 note).

export function downloadBlob(filename, content, mime) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
