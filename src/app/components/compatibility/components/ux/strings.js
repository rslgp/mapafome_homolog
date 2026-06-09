'use client';

import { useEffect, useReducer } from 'react';

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
    'errors.offline':               'Você está sem internet. O ponto foi salvo e será enviado quando a conexão voltar.',
    'errors.server_slow':           'O servidor demorou a responder. Seu ponto pode ter sido salvo, espere 30s e recarregue antes de tentar de novo.',
    'pin.waiting':        'Aguardando',
    'pin.someone_going':  'Alguém a caminho',
    'pin.attended_today': 'Atendido hoje',
    'pin.going_button':   'Estou indo agora',
    'pin.directions':     'Como chegar',
    'pin.mark_attended':  'Marcar como atendido',
    'pin.after_attended': 'Obrigado. O ponto foi arquivado.',
    'empty.no_pins_in_view':  'Ninguém foi mapeado nesta área ainda. Se você viu alguém precisando, toque em Relatar.',
    'cta.report': 'Relatar',
    'cta.list':   'Lista',
    'cta.help':   'Como funciona',
    // ── /assinar — recurring support subscription (Asaas) ──────────────────
    'assinar.back':            '← Voltar ao mapa',
    'assinar.title':           'Apoie o MAPA FOME',
    'assinar.sub':             'Uma contribuição mensal ajuda a manter o mapa no ar. Escolha a forma que preferir.',
    'assinar.legend.rail':     'Forma de pagamento',
    'assinar.legend.value':    'Valor mensal',
    'assinar.value.presets':   'Valores sugeridos',
    'assinar.value.other':     'Outro valor (R$)',
    'assinar.field.name':      'Nome completo',
    'assinar.field.email':     'E-mail',
    'assinar.field.cpfcnpj':   'CPF ou CNPJ',
    'assinar.field.phone':     'Celular (opcional)',
    'assinar.card.legend':     'Dados do cartão',
    'assinar.card.number':     'Número do cartão',
    'assinar.card.name':       'Nome impresso no cartão',
    'assinar.card.expiry':     'Validade (MM/AA)',
    'assinar.card.cvv':        'CVV',
    'assinar.cta.submitting':  'Processando…',
    'assinar.cta.support':     'Apoiar com R$ {value}/mês',
    'assinar.note':            'Pagamento processado pela Asaas. Você pode cancelar quando quiser.',
    'assinar.error.fallback':  'Não foi possível concluir. Tente novamente.',
    'assinar.success.title':   'Obrigado pelo apoio 💛',
    'assinar.success.sub':     'Sua assinatura de {value} por mês foi criada.',
    'assinar.success.cta.pix':    'Pagar com Pix agora',
    'assinar.success.cta.boleto': 'Abrir o boleto',
    'assinar.success.cta.other':  'Concluir pagamento',
    'assinar.success.active':  'A cobrança recorrente já está ativa.',
    // Rail display copy — RAILS (asaasSubscriptionClient) stays the id/structure
    // SOT; these are pulled in page.js via t() keyed by rail id.
    'assinar.rail.pix.label':     'Pix',
    'assinar.rail.pix.hint':      'Pix Automático — débito recorrente, sem taxa de cartão',
    'assinar.rail.cartao.label':  'Cartão de crédito',
    'assinar.rail.cartao.hint':   'Assinatura no cartão, renovação automática',
    'assinar.rail.boleto.label':  'Boleto',
    'assinar.rail.boleto.hint':   'Um boleto por mês — você paga cada um',
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
    'errors.offline':               'Estás sin conexión. El punto fue guardado y se enviará cuando vuelva la conexión.',
    'errors.server_slow':           'El servidor tardó en responder. Tu punto puede haberse guardado, espera 30s y recarga antes de reintentar.',
    'pin.waiting':        'Esperando',
    'pin.someone_going':  'Alguien en camino',
    'pin.attended_today': 'Atendido hoy',
    'pin.going_button':   'Voy ahora',
    'pin.directions':     'Cómo llegar',
    'pin.mark_attended':  'Marcar como atendido',
    'pin.after_attended': 'Gracias. El punto fue archivado.',
    'empty.no_pins_in_view':  'Nadie ha sido mapeado en esta área aún. Si viste a alguien en necesidad, toca Reportar.',
    'cta.report': 'Reportar',
    'cta.list':   'Lista',
    'cta.help':   'Cómo funciona',
    // ── /assinar — suscripción de apoyo recurrente (Asaas) ─────────────────
    'assinar.back':            '← Volver al mapa',
    'assinar.title':           'Apoya MAPA FOME',
    'assinar.sub':             'Una contribución mensual ayuda a mantener el mapa en línea. Elige la forma que prefieras.',
    'assinar.legend.rail':     'Forma de pago',
    'assinar.legend.value':    'Importe mensual',
    'assinar.value.presets':   'Importes sugeridos',
    'assinar.value.other':     'Otro importe (R$)',
    'assinar.field.name':      'Nombre completo',
    'assinar.field.email':     'Correo electrónico',
    'assinar.field.cpfcnpj':   'CPF o CNPJ',
    'assinar.field.phone':     'Celular (opcional)',
    'assinar.card.legend':     'Datos de la tarjeta',
    'assinar.card.number':     'Número de la tarjeta',
    'assinar.card.name':       'Nombre impreso en la tarjeta',
    'assinar.card.expiry':     'Vencimiento (MM/AA)',
    'assinar.card.cvv':        'CVV',
    'assinar.cta.submitting':  'Procesando…',
    'assinar.cta.support':     'Apoyar con R$ {value}/mes',
    'assinar.note':            'Pago procesado por Asaas. Puedes cancelar cuando quieras.',
    'assinar.error.fallback':  'No se pudo completar. Vuelve a intentarlo.',
    'assinar.success.title':   'Gracias por tu apoyo 💛',
    'assinar.success.sub':     'Tu suscripción de {value} al mes fue creada.',
    'assinar.success.cta.pix':    'Pagar con Pix ahora',
    'assinar.success.cta.boleto': 'Abrir el boleto',
    'assinar.success.cta.other':  'Completar el pago',
    'assinar.success.active':  'El cobro recurrente ya está activo.',
    // Copia de los medios de pago — RAILS (asaasSubscriptionClient) sigue siendo
    // la fuente de ids/estructura; estos textos se leen en page.js vía t().
    'assinar.rail.pix.label':     'Pix',
    'assinar.rail.pix.hint':      'Pix Automático — débito recurrente, sin tarifa de tarjeta',
    'assinar.rail.cartao.label':  'Tarjeta de crédito',
    'assinar.rail.cartao.hint':   'Suscripción con tarjeta, renovación automática',
    'assinar.rail.boleto.label':  'Boleto',
    'assinar.rail.boleto.hint':   'Un boleto por mes — pagas cada uno',
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

// Sorted key list for a locale (defaults to the active one). Read-only view of
// the dictionary intended for parity/dead-key tests; returns [] for an unknown
// locale so callers don't have to guard.
export function localeKeys(locale = currentLocale) {
  const dict = DICT[locale];
  return dict ? Object.keys(dict).sort() : [];
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

// React subscription hook. t() reads the module-level currentLocale at call
// time, so a component that calls t() during render will NOT re-render when
// setLocale fires. A consumer calls useLocale() to subscribe to the
// 'mdf-locale-change' CustomEvent (dispatched by setLocale) and force a
// re-render — then its t() calls re-read the new locale. The returned value is
// the active locale, so it can also key memo/effect deps. SSR-safe: the effect
// only runs in the browser, and getLocale() returns the default on the server.
export function useLocale() {
  const [, force] = useReducer((c) => c + 1, 0);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => force();
    window.addEventListener('mdf-locale-change', handler);
    return () => window.removeEventListener('mdf-locale-change', handler);
  }, []);
  return getLocale();
}
