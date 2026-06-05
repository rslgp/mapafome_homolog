'use client';

// M9 — i18n scaffolding. Portuguese remains the primary language per the
// brief. Locale is not auto-detected: we never machine-translate dignity-
// sensitive copy, so switching locales is an explicit user decision.
//
// Dictionary structure: DICT[locale][key] = string. Components read via t(key).

const LOCALE_KEY = 'mdf_locale';
const DEFAULT_LOCALE = 'pt-BR';
export const SUPPORTED_LOCALES = ['pt-BR', 'es'];

const DICT = {
  'pt-BR': {
    'report.title':      'O que a pessoa precisa agora?',
    'report.subtitle':   'Você pode escolher mais de uma.',
    'report.button':     'Publicar ponto',
    'report.publishing': 'Publicando…',
    'report.success':    'Publicado ✓',
    'report.retry':      'Tentar de novo',
    'errors.at_least_one_category': 'Escolha pelo menos uma necessidade.',
    'errors.publish_failed':        'Não foi possível publicar. Verifique sua conexão e tente de novo.',
    'errors.offline':               'Você está sem internet. Tente de novo quando a conexão voltar.',
    'errors.server_slow':           'O servidor demorou a responder. Seu ponto pode ter sido salvo, espere 30s e recarregue antes de tentar de novo.',
    'pin.waiting':        'Aguardando',
    'pin.someone_going':  'Alguém a caminho',
    'pin.attended_today': 'Atendido hoje',
    'pin.going_button':   'Estou indo agora',
    'pin.directions':     'Como chegar',
    'pin.mark_attended':  'Marcar como atendido',
    'pin.after_attended': 'Obrigado. O ponto foi arquivado.',
    'empty.no_pins_in_view':  'Ninguém foi mapeado nesta área ainda. Se você viu alguém precisando, toque em Relatar.',
    'empty.no_pins_anywhere': 'Ainda não há pontos mapeados. Seja a primeira pessoa a mapear alguém.',
    'cta.report': 'Relatar',
    'cta.list':   'Lista',
    'cta.help':   'Como funciona',
  },
  'es': {
    'report.title':      '¿Qué necesita la persona ahora?',
    'report.subtitle':   'Puedes elegir más de una.',
    'report.button':     'Publicar punto',
    'report.publishing': 'Publicando…',
    'report.success':    'Publicado ✓',
    'report.retry':      'Reintentar',
    'errors.at_least_one_category': 'Elige al menos una necesidad.',
    'errors.publish_failed':        'No se pudo publicar. Verifica tu conexión y vuelve a intentarlo.',
    'errors.offline':               'Estás sin conexión. Intenta de nuevo cuando vuelvas a conectarte.',
    'errors.server_slow':           'El servidor tardó en responder. Tu punto puede haberse guardado, espera 30s y recarga antes de reintentar.',
    'pin.waiting':        'Esperando',
    'pin.someone_going':  'Alguien en camino',
    'pin.attended_today': 'Atendido hoy',
    'pin.going_button':   'Voy ahora',
    'pin.directions':     'Cómo llegar',
    'pin.mark_attended':  'Marcar como atendido',
    'pin.after_attended': 'Gracias. El punto fue archivado.',
    'empty.no_pins_in_view':  'Nadie ha sido mapeado en esta área aún. Si viste a alguien en necesidad, toca Reportar.',
    'empty.no_pins_anywhere': 'Aún no hay puntos mapeados. Sé la primera persona en mapear a alguien.',
    'cta.report': 'Reportar',
    'cta.list':   'Lista',
    'cta.help':   'Cómo funciona',
  },
};

let currentLocale = DEFAULT_LOCALE;

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) currentLocale = stored;
  } catch (_e) { /* ignore */ }
}

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  currentLocale = locale;
  try { window.localStorage.setItem(LOCALE_KEY, locale); } catch (_e) {}
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', locale);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mdf-locale-change', { detail: { locale } }));
  }
}

export function t(key) {
  const dict = DICT[currentLocale] || DICT[DEFAULT_LOCALE];
  return (dict && dict[key]) || key;
}
