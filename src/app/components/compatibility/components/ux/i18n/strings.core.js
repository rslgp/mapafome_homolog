// strings.core.js — base food-map UI copy (the original COMPAT namespaces that
// do NOT belong to a sharded feature): report.* errors.* pin.* empty.* cta.*
// country.*. Pure data; consumed only by ./dictionary.js. Compat branches that
// touch base map copy edit ONLY this file. See ./engine.js for the runtime and
// ../strings.js for the stable public barrel. pt-BR is the primary language;
// es parity is human-authored (dignity-sensitive copy is never machine-translated).
//
// INTL M6 — en-US (`enUS`) is the third UI locale. MECHANICAL/neutral strings
// (button labels, view toggles, plain validation prompts) are finalized. Copy
// that carries dignity/tone (the hunger-need prompts in report.*, the reassuring
// offline/slow/failed status copy, the geofence-rejection note, the empty-view
// note) is DRAFTED and prefixed `[REVISAR-HUMANO] ` so a human approves the tone
// before it ships (honors plan D7 — never machine-translate sensitive copy).
// New en-US strings avoid the em-dash on purpose (use commas/parentheses).

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
  // INTL M3 (UX-1/UX-2): geofence-rejection copy for the FOME map. Country-neutral,
  // names the SELECTED country via {pais}, and points at the fix (move the pin or
  // switch the flag) instead of the old pt-BR-only "Região não suportada".
  'errors.out_of_country':        'Esse ponto está fora de {pais}. Toque no mapa, dentro do país selecionado, para publicar aqui, ou troque o país no seletor de bandeira.',
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
  // ── LanguageControl (INTL) — UI language picker ─────────────────────────
  'lang.button':         'Idioma: {name}',
  'lang.open':           'Trocar o idioma do site',
  'lang.title':          'Escolha o idioma',
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
  // INTL M3 (UX-1/UX-2): copia de rechazo del geofence para el mapa de FOME. Neutral
  // respecto al país, nombra el país SELECCIONADO con {pais} y apunta al arreglo
  // (mover el pin o cambiar la bandera) en vez del antiguo "Región no admitida".
  'errors.out_of_country':        'Ese punto está fuera de {pais}. Toca en el mapa, dentro del país seleccionado, para publicar aquí, o cambia el país en el selector de bandera.',
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
  // ── LanguageControl (INTL) — UI language picker ─────────────────────────
  'lang.button':         'Idioma: {name}',
  'lang.open':           'Cambiar el idioma del sitio',
  'lang.title':          'Elige el idioma',
};

export const enUS = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: the tone (ask gently,
  // never command, never accuse) must be human-reviewed before shipping.
  'report.title':      '[REVISAR-HUMANO] What does this person need right now?',
  'report.subtitle':   '[REVISAR-HUMANO] You can choose more than one.',
  'report.button':     '[REVISAR-HUMANO] Publish point',
  'report.publishing': 'Publishing…',
  'report.success':    'Published ✓',
  'report.retry':      'Try again',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Choose at least one need.',
  // Failure/status copy carries reassurance tone (it must calm, not alarm), so
  // it is drafted for human review.
  'errors.publish_failed':        '[REVISAR-HUMANO] We could not publish. Check your connection and try again.',
  'errors.offline':               '[REVISAR-HUMANO] You are offline. The point was saved and will be sent when the connection comes back.',
  'errors.server_slow':           '[REVISAR-HUMANO] The server was slow to respond. Your point may have been saved, wait 30s and reload before trying again.',
  // INTL M3 (UX-1/UX-2): geofence-rejection copy for the FOME map. Country-neutral,
  // names the SELECTED country via {pais}, points at the fix (move the pin or
  // switch the flag). DIGNITY-SENSITIVE (where you may mark): human-reviewed.
  'errors.out_of_country':        '[REVISAR-HUMANO] That point is outside {pais}. Tap on the map, inside the selected country, to publish here, or switch the country in the flag picker.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'Waiting',
  'pin.someone_going':  'Someone on the way',
  'pin.attended_today': 'Helped today',
  'pin.going_button':   'I am on my way now',
  'pin.directions':     'Directions',
  'pin.mark_attended':  'Mark as helped',
  'pin.after_attended': 'Thank you. The point has been archived.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  '[REVISAR-HUMANO] No one has been mapped in this area yet. If you saw someone in need, tap Report.',
  // cta.* — navigation/action labels. Mechanical, finalized.
  'cta.report': 'Report',
  'cta.list':   'List',
  'cta.help':   'How it works',
  'cta.pets':   'Lost pets',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope. Mechanical. ──
  'country.button':      'Search country: {name}',
  'country.open':        'Change the address-search country',
  'country.title':       'Search an address in which country?',
  'country.search':      'Search country',
  'country.empty':       'No country found.',
  'country.close':       'Close the country list',
  // ── LanguageControl (INTL) — UI language picker. Mechanical. ──
  'lang.button':         'Language: {name}',
  'lang.open':           'Change the site language',
  'lang.title':          'Choose the language',
};
