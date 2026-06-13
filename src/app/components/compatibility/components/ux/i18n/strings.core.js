// strings.core.js — base food-map UI copy (the original COMPAT namespaces that
// do NOT belong to a sharded feature): report.* errors.* pin.* empty.* cta.*
// country.*. Pure data; consumed only by ./dictionary.js. Compat branches that
// touch base map copy edit ONLY this file. See ./engine.js for the runtime and
// ../strings.js for the stable public barrel. pt-BR is the primary language;
// es parity is human-authored (dignity-sensitive copy is never machine-translated).

export const pt = {
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
  // PET-M22 — header cross-link label to the /pets (achados e perdidos) map.
  // Full pt-BR<->es parity + the dignity-sensitive /pets copy is owned by
  // PET-M23; this navigational label is wired under a stable shared key now
  // (both locales) so it never renders the raw key string.
  'cta.pets':   'Pets perdidos',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope ──────────────
  'country.button':      'País da busca: {name}',
  'country.open':        'Trocar o país da busca de endereço',
  'country.title':       'Buscar endereço em qual país?',
  'country.search':      'Buscar país',
  'country.empty':       'Nenhum país encontrado.',
  'country.close':       'Fechar a lista de países',
};

export const es = {
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
  // PET-M22 — see the pt-BR note; es value is a provisional twin so the label
  // is never the raw key. PET-M23 owns the human-authored /pets es parity.
  'cta.pets':   'Mascotas perdidas',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope ──────────────
  'country.button':      'País de búsqueda: {name}',
  'country.open':        'Cambiar el país de la búsqueda de dirección',
  'country.title':       '¿Buscar dirección en qué país?',
  'country.search':      'Buscar país',
  'country.empty':       'No se encontró ningún país.',
  'country.close':       'Cerrar la lista de países',
};
