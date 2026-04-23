// Small helper: turn a free-form reporter-contact string into a tap-to-act
// affordance. Never exposes raw PII text — only an action link.

const WHATSAPP_HINT = /whats|wa\.me/i;
const INSTAGRAM_HINT = /^@[A-Za-z0-9._]+$|instagram\.com\//i;
const EMAIL_HINT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITS_HINT = /^[+()\d\s-]+$/;

function digitsOnly(s) {
  return String(s).replace(/\D+/g, '');
}

export function resolveContact(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;

  if (EMAIL_HINT.test(v)) {
    return { kind: 'email', href: `mailto:${v}`, label: 'Enviar e-mail', icon: '✉' };
  }

  if (INSTAGRAM_HINT.test(v)) {
    const handle = v.replace(/^@/, '').replace(/.*instagram\.com\//, '').replace(/\/$/, '');
    return {
      kind: 'instagram',
      href: `https://instagram.com/${handle}`,
      label: 'Abrir Instagram',
      icon: '📷',
    };
  }

  if (WHATSAPP_HINT.test(v) || DIGITS_HINT.test(v)) {
    const digits = digitsOnly(v);
    if (digits.length >= 8) {
      const waDigits = digits.startsWith('55') ? digits : `55${digits}`;
      return {
        kind: 'whatsapp',
        href: `https://wa.me/${waDigits}`,
        label: 'Abrir WhatsApp',
        icon: '💬',
      };
    }
  }

  // Fallback: generic link/button that triggers nothing PII-exposing.
  return { kind: 'unknown', href: null, label: 'Contato disponível', icon: '•' };
}
