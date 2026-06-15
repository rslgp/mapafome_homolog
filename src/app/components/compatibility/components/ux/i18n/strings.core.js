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
  'empty.close': 'Fechar o aviso',
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
  // Polite live-region announcement fired when picking a country recenters the
  // map (CountryFlagControl pick -> setView capital). Mechanical/navigational
  // copy (not dignity-sensitive). {country} is the localized country name.
  'map.center_on_country': 'Mapa centralizado em {country}.',
  // ── MainControls.js filter panel + confirm-point control. All MECHANICAL
  // (category names, button/aria labels, loading). The <option value="..."> data
  // keys are NOT translated; only the visible option TEXT lives here. pt-BR is the
  // verbatim current copy (dark-ship: byte-identical default). ──
  'mainctl.loading':              'Carregando...',
  'mainctl.loading_aria':         'Carregando',
  'mainctl.filter.label':         'filtro atual:',
  'mainctl.filter.aria':          'Filtrar por categoria',
  'mainctl.filter.all':           'Todos',
  'mainctl.filter.donors':        'Doadores',
  'mainctl.filter.basket':        'Cesta básica',
  'mainctl.filter.street':        'Situação de rua',
  'mainctl.filter.ready_meal':    'Refeição Pronta',
  'mainctl.filter.social':        'Rede Social',
  'mainctl.filter.has_cnpj':      'possui CNPJ',
  'mainctl.filter.none':          'Nenhum',
  'mainctl.filter.needs_group':   'Necessidades no desastre',
  'mainctl.filter.all_needs':     'Todas as necessidades',
  'mainctl.phone_filter.label':   'Telefone',
  'mainctl.phone_filter.aria':    'Filtrar por telefone',
  'mainctl.confirm.label':        'Confirmar ponto',
  'mainctl.confirm.label_ready':  '✓ Confirmar ponto',
  'mainctl.confirm.aria_ready':   'Confirmar ponto marcado no mapa',
  'mainctl.confirm.aria_pending': 'Confirmar ponto (toque no mapa primeiro)',
  'mainctl.confirm.aria_busy':    'Confirmando ponto',
  // ── NEED categories (needCategories SOT) — reporter-pin needs. id + icon stay
  // in the data file; the display text is i18n-keyed here. `need.label.<id>` is the
  // short chip/detail/filter label; `need.report.<id>` is the fuller public
  // aggregate-report legend label. Resolved DYNAMICALLY by id at the render sites
  // (t(`need.label.${id}`) / t(`need.report.${id}`)), like pets.status.<id>.label,
  // so the dead-key scan lists `need.label.` / `need.report.` as dynamic prefixes.
  // DIGNITY-SENSITIVE (hunger/poverty/health/disaster-relief copy): pt-BR is the
  // verbatim final source; the other six locales are machine drafts carrying
  // `[REVISAR-HUMANO] ` pending human tone review. ids: comida/agua/roupa/higiene/
  // abrigo/remedio/animais/energia. No em-dash.
  'need.label.comida':   'Comida',
  'need.label.agua':     'Água',
  'need.label.roupa':    'Roupa',
  'need.label.higiene':  'Higiene',
  'need.label.abrigo':   'Abrigo',
  'need.label.remedio':  'Remédios',
  'need.label.animais':  'Animais',
  'need.label.energia':  'Carregar',
  'need.report.comida':  'Comida (genérico)',
  'need.report.agua':    'Água',
  'need.report.roupa':   'Roupa',
  'need.report.higiene': 'Higiene',
  'need.report.abrigo':  'Abrigo',
  'need.report.remedio': 'Remédios',
  'need.report.animais': 'Animais (resgate e ração)',
  'need.report.energia': 'Carregar celular / energia',
  // FILTRO_TEMPO Lane B - period (recency) selector that replaced the
  // binary "Esse ano" checkbox. Mechanical duration labels (no em-dash).
  'filter.period.label':      'Período',
  'filter.period.daily':      'Diário (24h)',
  'filter.period.weekly':     'Semanal (7 dias)',
  'filter.period.monthly':    'Mensal (30 dias)',
  'filter.period.semiannual': 'Semestral (6 meses)',
  'filter.period.annual':     'Anual (12 meses)',
  'filter.period.all':        'Todos',
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
  'empty.close': 'Cerrar el aviso',
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
  // Live-region announcement on map recenter after a country pick. {country} is
  // the localized country name.
  'map.center_on_country': 'Mapa centrado en {country}.',
  // ── MainControls.js filter panel + confirm-point control. Mechanical. ──
  'mainctl.loading':              'Cargando...',
  'mainctl.loading_aria':         'Cargando',
  'mainctl.filter.label':         'filtro actual:',
  'mainctl.filter.aria':          'Filtrar por categoría',
  'mainctl.filter.all':           'Todos',
  'mainctl.filter.donors':        'Donantes',
  'mainctl.filter.basket':        'Canasta básica',
  'mainctl.filter.street':        'En situación de calle',
  'mainctl.filter.ready_meal':    'Comida lista',
  'mainctl.filter.social':        'Red social',
  'mainctl.filter.has_cnpj':      'tiene CNPJ',
  'mainctl.filter.none':          'Ninguno',
  'mainctl.filter.needs_group':   'Necesidades en el desastre',
  'mainctl.filter.all_needs':     'Todas las necesidades',
  'mainctl.phone_filter.label':   'Teléfono',
  'mainctl.phone_filter.aria':    'Filtrar por teléfono',
  'mainctl.confirm.label':        'Confirmar punto',
  'mainctl.confirm.label_ready':  '✓ Confirmar punto',
  'mainctl.confirm.aria_ready':   'Confirmar el punto marcado en el mapa',
  'mainctl.confirm.aria_pending': 'Confirmar punto (toca primero en el mapa)',
  'mainctl.confirm.aria_busy':    'Confirmando punto',
  // ── NEED categories — DIGNITY-SENSITIVE draft, `[REVISAR-HUMANO] ` pending
  // human tone review. Short noun labels (no interrogative/exclamatory clause,
  // so no ¿/¡). No em-dash. See the pt block for the field contract. ──
  'need.label.comida':   '[REVISAR-HUMANO] Comida',
  'need.label.agua':     '[REVISAR-HUMANO] Agua',
  'need.label.roupa':    '[REVISAR-HUMANO] Ropa',
  'need.label.higiene':  '[REVISAR-HUMANO] Higiene',
  'need.label.abrigo':   '[REVISAR-HUMANO] Refugio',
  'need.label.remedio':  '[REVISAR-HUMANO] Medicinas',
  'need.label.animais':  '[REVISAR-HUMANO] Animales',
  'need.label.energia':  '[REVISAR-HUMANO] Cargar',
  'need.report.comida':  '[REVISAR-HUMANO] Comida (genérico)',
  'need.report.agua':    '[REVISAR-HUMANO] Agua',
  'need.report.roupa':   '[REVISAR-HUMANO] Ropa',
  'need.report.higiene': '[REVISAR-HUMANO] Higiene',
  'need.report.abrigo':  '[REVISAR-HUMANO] Refugio',
  'need.report.remedio': '[REVISAR-HUMANO] Medicinas',
  'need.report.animais': '[REVISAR-HUMANO] Animales (rescate y alimento)',
  'need.report.energia': '[REVISAR-HUMANO] Cargar teléfono / energía',
  // FILTRO_TEMPO Lane B - selector de período (recencia). Etiquetas
  // mecánicas de duración (sin raya larga).
  'filter.period.label':      'Período',
  'filter.period.daily':      'Diario (24h)',
  'filter.period.weekly':     'Semanal (7 días)',
  'filter.period.monthly':    'Mensual (30 días)',
  'filter.period.semiannual': 'Semestral (6 meses)',
  'filter.period.annual':     'Anual (12 meses)',
  'filter.period.all':        'Todos',
};

export const enUS = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: the tone (ask gently,
  // never command, never accuse) must be human-reviewed before shipping.
  'report.title':      'What does this person need right now?',
  'report.subtitle':   'You can choose more than one.',
  'report.button':     'Publish point',
  'report.publishing': 'Publishing…',
  'report.success':    'Published ✓',
  'report.retry':      'Try again',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Choose at least one need.',
  // Failure/status copy carries reassurance tone (it must calm, not alarm), so
  // it is drafted for human review.
  'errors.publish_failed':        'We could not publish. Check your connection and try again.',
  'errors.offline':               'You are offline. The point was saved and will be sent when the connection comes back.',
  'errors.server_slow':           'The server was slow to respond. Your point may have been saved, wait 30s and reload before trying again.',
  // INTL M3 (UX-1/UX-2): geofence-rejection copy for the FOME map. Country-neutral,
  // names the SELECTED country via {pais}, points at the fix (move the pin or
  // switch the flag). DIGNITY-SENSITIVE (where you may mark): human-reviewed.
  'errors.out_of_country':        'That point is outside {pais}. Tap on the map, inside the selected country, to publish here, or switch the country in the flag picker.',
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
  'empty.close': 'Close the notice',
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
  // Live-region announcement on map recenter after a country pick. Mechanical
  // (navigational status), finalized. {country} is the localized country name.
  'map.center_on_country': 'Map centered on {country}.',
  // ── MainControls.js filter panel + confirm-point control. Mechanical,
  // finalized (category names, button/aria labels, loading). ──
  'mainctl.loading':              'Loading...',
  'mainctl.loading_aria':         'Loading',
  'mainctl.filter.label':         'current filter:',
  'mainctl.filter.aria':          'Filter by category',
  'mainctl.filter.all':           'All',
  'mainctl.filter.donors':        'Donors',
  'mainctl.filter.basket':        'Food basket',
  'mainctl.filter.street':        'Living on the street',
  'mainctl.filter.ready_meal':    'Ready meal',
  'mainctl.filter.social':        'Social media',
  'mainctl.filter.has_cnpj':      'has a CNPJ',
  'mainctl.filter.none':          'None',
  'mainctl.filter.needs_group':   'Needs in the disaster',
  'mainctl.filter.all_needs':     'All needs',
  'mainctl.phone_filter.label':   'Phone',
  'mainctl.phone_filter.aria':    'Filter by phone',
  'mainctl.confirm.label':        'Confirm point',
  'mainctl.confirm.label_ready':  '✓ Confirm point',
  'mainctl.confirm.aria_ready':   'Confirm the point marked on the map',
  'mainctl.confirm.aria_pending': 'Confirm point (tap the map first)',
  'mainctl.confirm.aria_busy':    'Confirming point',
  // ── NEED categories — DIGNITY-SENSITIVE draft, `[REVISAR-HUMANO] ` pending
  // human tone review. Short noun labels. No em-dash. See the pt block. ──
  'need.label.comida':   '[REVISAR-HUMANO] Food',
  'need.label.agua':     '[REVISAR-HUMANO] Water',
  'need.label.roupa':    '[REVISAR-HUMANO] Clothing',
  'need.label.higiene':  '[REVISAR-HUMANO] Hygiene',
  'need.label.abrigo':   '[REVISAR-HUMANO] Shelter',
  'need.label.remedio':  '[REVISAR-HUMANO] Medicine',
  'need.label.animais':  '[REVISAR-HUMANO] Animals',
  'need.label.energia':  '[REVISAR-HUMANO] Charge',
  'need.report.comida':  '[REVISAR-HUMANO] Food (generic)',
  'need.report.agua':    '[REVISAR-HUMANO] Water',
  'need.report.roupa':   '[REVISAR-HUMANO] Clothing',
  'need.report.higiene': '[REVISAR-HUMANO] Hygiene',
  'need.report.abrigo':  '[REVISAR-HUMANO] Shelter',
  'need.report.remedio': '[REVISAR-HUMANO] Medicine',
  'need.report.animais': '[REVISAR-HUMANO] Animals (rescue and pet food)',
  'need.report.energia': '[REVISAR-HUMANO] Charge phone / power',
  // FILTRO_TEMPO Lane B - period (recency) selector. MECHANICAL duration
  // labels, finalized (no [REVISAR-HUMANO] marker, no em-dash).
  'filter.period.label':      'Period',
  'filter.period.daily':      'Daily (24h)',
  'filter.period.weekly':     'Weekly (7 days)',
  'filter.period.monthly':    'Monthly (30 days)',
  'filter.period.semiannual': 'Semiannual (6 months)',
  'filter.period.annual':     'Annual (12 months)',
  'filter.period.all':        'All',
};

// INTL M7 — de/fr/ru/zh added at full key parity with pt. Same DRAFTED vs
// FINALIZED split as enUS: the dignity-sensitive copy (report.* hunger-need
// prompts, the reassuring errors.* status copy, the errors.out_of_country
// geofence note, the empty.* state) carries `[REVISAR-HUMANO] ` so a human
// approves the tone before it ships; mechanical strings ship finalized.
// Placeholders ({pais}, {name}, {country}) preserved verbatim. No em-dash.

export const de = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      'Was braucht diese Person gerade?',
  'report.subtitle':   'Du kannst mehr als eines wählen.',
  'report.button':     'Punkt veröffentlichen',
  'report.publishing': 'Wird veröffentlicht…',
  'report.success':    'Veröffentlicht ✓',
  'report.retry':      'Erneut versuchen',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Wähle mindestens eine Notwendigkeit.',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        'Veröffentlichung nicht möglich. Prüfe deine Verbindung und versuche es erneut.',
  'errors.offline':               'Du bist offline. Der Punkt wurde gespeichert und wird gesendet, sobald die Verbindung zurück ist.',
  'errors.server_slow':           'Der Server hat langsam geantwortet. Dein Punkt wurde vielleicht gespeichert, warte 30s und lade neu, bevor du es erneut versuchst.',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        'Dieser Punkt liegt außerhalb von {pais}. Tippe auf die Karte, innerhalb des ausgewählten Landes, um hier zu veröffentlichen, oder wechsle das Land im Flaggenwähler.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'Wartet',
  'pin.someone_going':  'Jemand ist unterwegs',
  'pin.attended_today': 'Heute geholfen',
  'pin.going_button':   'Ich bin jetzt unterwegs',
  'pin.directions':     'Wegbeschreibung',
  'pin.mark_attended':  'Als geholfen markieren',
  'pin.after_attended': 'Danke. Der Punkt wurde archiviert.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  'In diesem Bereich wurde noch niemand kartiert. Wenn du jemanden in Not gesehen hast, tippe auf Melden.',
  'empty.close': 'Hinweis schließen',
  // cta.* — navigation/action labels. Mechanical, finalized.
  'cta.report': 'Melden',
  'cta.list':   'Liste',
  'cta.help':   'So funktioniert es',
  'cta.pets':   'Vermisste Tiere',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope. Mechanical. ──
  'country.button':      'Suchland: {name}',
  'country.open':        'Das Land der Adresssuche ändern',
  'country.title':       'In welchem Land eine Adresse suchen?',
  'country.search':      'Land suchen',
  'country.empty':       'Kein Land gefunden.',
  'country.close':       'Die Länderliste schließen',
  // ── LanguageControl (INTL) — UI language picker. Mechanical. ──
  'lang.button':         'Sprache: {name}',
  'lang.open':           'Die Sprache der Website ändern',
  'lang.title':          'Sprache wählen',
  // Live-region announcement on map recenter. Mechanical, finalized.
  'map.center_on_country': 'Karte zentriert auf {country}.',
  // ── MainControls.js filter panel + confirm-point control. Mechanical. ──
  'mainctl.loading':              'Wird geladen...',
  'mainctl.loading_aria':         'Wird geladen',
  'mainctl.filter.label':         'aktueller Filter:',
  'mainctl.filter.aria':          'Nach Kategorie filtern',
  'mainctl.filter.all':           'Alle',
  'mainctl.filter.donors':        'Spender',
  'mainctl.filter.basket':        'Lebensmittelkorb',
  'mainctl.filter.street':        'Obdachlosigkeit',
  'mainctl.filter.ready_meal':    'Fertiges Essen',
  'mainctl.filter.social':        'Soziale Medien',
  'mainctl.filter.has_cnpj':      'hat eine CNPJ',
  'mainctl.filter.none':          'Keine',
  'mainctl.filter.needs_group':   'Bedürfnisse in der Katastrophe',
  'mainctl.filter.all_needs':     'Alle Bedürfnisse',
  'mainctl.phone_filter.label':   'Telefon',
  'mainctl.phone_filter.aria':    'Nach Telefon filtern',
  'mainctl.confirm.label':        'Punkt bestätigen',
  'mainctl.confirm.label_ready':  '✓ Punkt bestätigen',
  'mainctl.confirm.aria_ready':   'Den auf der Karte markierten Punkt bestätigen',
  'mainctl.confirm.aria_pending': 'Punkt bestätigen (zuerst auf die Karte tippen)',
  'mainctl.confirm.aria_busy':    'Punkt wird bestätigt',
  // ── NEED categories — DIGNITY-SENSITIVE draft, `[REVISAR-HUMANO] ` pending
  // human tone review. Short noun labels. No em-dash. See the pt block. ──
  'need.label.comida':   '[REVISAR-HUMANO] Essen',
  'need.label.agua':     '[REVISAR-HUMANO] Wasser',
  'need.label.roupa':    '[REVISAR-HUMANO] Kleidung',
  'need.label.higiene':  '[REVISAR-HUMANO] Hygiene',
  'need.label.abrigo':   '[REVISAR-HUMANO] Unterkunft',
  'need.label.remedio':  '[REVISAR-HUMANO] Medikamente',
  'need.label.animais':  '[REVISAR-HUMANO] Tiere',
  'need.label.energia':  '[REVISAR-HUMANO] Aufladen',
  'need.report.comida':  '[REVISAR-HUMANO] Essen (allgemein)',
  'need.report.agua':    '[REVISAR-HUMANO] Wasser',
  'need.report.roupa':   '[REVISAR-HUMANO] Kleidung',
  'need.report.higiene': '[REVISAR-HUMANO] Hygiene',
  'need.report.abrigo':  '[REVISAR-HUMANO] Unterkunft',
  'need.report.remedio': '[REVISAR-HUMANO] Medikamente',
  'need.report.animais': '[REVISAR-HUMANO] Tiere (Rettung und Tierfutter)',
  'need.report.energia': '[REVISAR-HUMANO] Handy aufladen / Strom',
  // FILTRO_TEMPO Lane B - period (recency) selector. MECHANICAL duration
  // labels, finalized (no [REVISAR-HUMANO] marker, no em-dash).
  'filter.period.label':      'Zeitraum',
  'filter.period.daily':      'Täglich (24 Std.)',
  'filter.period.weekly':     'Wöchentlich (7 Tage)',
  'filter.period.monthly':    'Monatlich (30 Tage)',
  'filter.period.semiannual': 'Halbjährlich (6 Monate)',
  'filter.period.annual':     'Jährlich (12 Monate)',
  'filter.period.all':        'Alle',
};

export const fr = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      'De quoi cette personne a-t-elle besoin maintenant ?',
  'report.subtitle':   'Tu peux en choisir plusieurs.',
  'report.button':     'Publier le point',
  'report.publishing': 'Publication…',
  'report.success':    'Publié ✓',
  'report.retry':      'Réessayer',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Choisis au moins un besoin.',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        'Publication impossible. Vérifie ta connexion et réessaie.',
  'errors.offline':               'Tu es hors ligne. Le point a été enregistré et sera envoyé dès que la connexion reviendra.',
  'errors.server_slow':           'Le serveur a mis du temps à répondre. Ton point a peut-être été enregistré, attends 30s et recharge avant de réessayer.',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        'Ce point est en dehors de {pais}. Touche la carte, à l\'intérieur du pays sélectionné, pour publier ici, ou change de pays dans le sélecteur de drapeau.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'En attente',
  'pin.someone_going':  'Quelqu\'un est en chemin',
  'pin.attended_today': 'Aidé aujourd\'hui',
  'pin.going_button':   'J\'y vais maintenant',
  'pin.directions':     'Itinéraire',
  'pin.mark_attended':  'Marquer comme aidé',
  'pin.after_attended': 'Merci. Le point a été archivé.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  'Personne n\'a encore été cartographié dans cette zone. Si tu as vu quelqu\'un dans le besoin, touche Signaler.',
  'empty.close': 'Fermer l\'avis',
  // cta.* — navigation/action labels. Mechanical, finalized.
  'cta.report': 'Signaler',
  'cta.list':   'Liste',
  'cta.help':   'Comment ça marche',
  'cta.pets':   'Animaux perdus',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope. Mechanical. ──
  'country.button':      'Pays de recherche : {name}',
  'country.open':        'Changer le pays de la recherche d\'adresse',
  'country.title':       'Chercher une adresse dans quel pays ?',
  'country.search':      'Chercher un pays',
  'country.empty':       'Aucun pays trouvé.',
  'country.close':       'Fermer la liste des pays',
  // ── LanguageControl (INTL) — UI language picker. Mechanical. ──
  'lang.button':         'Langue : {name}',
  'lang.open':           'Changer la langue du site',
  'lang.title':          'Choisir la langue',
  // Live-region announcement on map recenter. Mechanical, finalized.
  'map.center_on_country': 'Carte centrée sur {country}.',
  // ── MainControls.js filter panel + confirm-point control. Mechanical. ──
  'mainctl.loading':              'Chargement...',
  'mainctl.loading_aria':         'Chargement',
  'mainctl.filter.label':         'filtre actuel :',
  'mainctl.filter.aria':          'Filtrer par catégorie',
  'mainctl.filter.all':           'Tous',
  'mainctl.filter.donors':        'Donateurs',
  'mainctl.filter.basket':        'Panier alimentaire',
  'mainctl.filter.street':        'Sans-abri',
  'mainctl.filter.ready_meal':    'Repas prêt',
  'mainctl.filter.social':        'Réseaux sociaux',
  'mainctl.filter.has_cnpj':      'a un CNPJ',
  'mainctl.filter.none':          'Aucun',
  'mainctl.filter.needs_group':   'Besoins lors de la catastrophe',
  'mainctl.filter.all_needs':     'Tous les besoins',
  'mainctl.phone_filter.label':   'Téléphone',
  'mainctl.phone_filter.aria':    'Filtrer par téléphone',
  'mainctl.confirm.label':        'Confirmer le point',
  'mainctl.confirm.label_ready':  '✓ Confirmer le point',
  'mainctl.confirm.aria_ready':   'Confirmer le point marqué sur la carte',
  'mainctl.confirm.aria_pending': 'Confirmer le point (touchez d\'abord la carte)',
  'mainctl.confirm.aria_busy':    'Confirmation du point',
  // ── NEED categories — DIGNITY-SENSITIVE draft, `[REVISAR-HUMANO] ` pending
  // human tone review. Short noun labels (no : ; ! ? high marks, so no narrow
  // NBSP needed). No em-dash. See the pt block. ──
  'need.label.comida':   '[REVISAR-HUMANO] Nourriture',
  'need.label.agua':     '[REVISAR-HUMANO] Eau',
  'need.label.roupa':    '[REVISAR-HUMANO] Vêtements',
  'need.label.higiene':  '[REVISAR-HUMANO] Hygiène',
  'need.label.abrigo':   '[REVISAR-HUMANO] Abri',
  'need.label.remedio':  '[REVISAR-HUMANO] Médicaments',
  'need.label.animais':  '[REVISAR-HUMANO] Animaux',
  'need.label.energia':  '[REVISAR-HUMANO] Recharger',
  'need.report.comida':  '[REVISAR-HUMANO] Nourriture (générique)',
  'need.report.agua':    '[REVISAR-HUMANO] Eau',
  'need.report.roupa':   '[REVISAR-HUMANO] Vêtements',
  'need.report.higiene': '[REVISAR-HUMANO] Hygiène',
  'need.report.abrigo':  '[REVISAR-HUMANO] Abri',
  'need.report.remedio': '[REVISAR-HUMANO] Médicaments',
  'need.report.animais': '[REVISAR-HUMANO] Animaux (sauvetage et nourriture)',
  'need.report.energia': '[REVISAR-HUMANO] Recharger un téléphone / énergie',
  // FILTRO_TEMPO Lane B - period (recency) selector. MECHANICAL duration
  // labels, finalized (no [REVISAR-HUMANO] marker). Short option labels with
  // no : ; ! ? high marks, so no narrow NBSP needed. No em-dash.
  'filter.period.label':      'Période',
  'filter.period.daily':      'Quotidien (24 h)',
  'filter.period.weekly':     'Hebdomadaire (7 jours)',
  'filter.period.monthly':    'Mensuel (30 jours)',
  'filter.period.semiannual': 'Semestriel (6 mois)',
  'filter.period.annual':     'Annuel (12 mois)',
  'filter.period.all':        'Tous',
};

export const ru = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      'Что этому человеку нужно прямо сейчас?',
  'report.subtitle':   'Можно выбрать несколько.',
  'report.button':     'Опубликовать точку',
  'report.publishing': 'Публикуется…',
  'report.success':    'Опубликовано ✓',
  'report.retry':      'Попробовать снова',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Выберите хотя бы одну потребность.',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        'Не удалось опубликовать. Проверьте соединение и попробуйте снова.',
  'errors.offline':               'Вы офлайн. Точка сохранена и будет отправлена, когда соединение вернётся.',
  'errors.server_slow':           'Сервер ответил медленно. Ваша точка могла сохраниться, подождите 30 секунд и обновите страницу, прежде чем пробовать снова.',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        'Эта точка находится вне {pais}. Нажмите на карту, внутри выбранной страны, чтобы опубликовать здесь, или смените страну в выборе флага.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'Ожидает',
  'pin.someone_going':  'Кто-то уже в пути',
  'pin.attended_today': 'Помогли сегодня',
  'pin.going_button':   'Я уже иду',
  'pin.directions':     'Как добраться',
  'pin.mark_attended':  'Отметить как помогли',
  'pin.after_attended': 'Спасибо. Точка отправлена в архив.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  'В этой области пока никого не отметили. Если вы видели человека в нужде, нажмите Сообщить.',
  'empty.close': 'Закрыть уведомление',
  // cta.* — navigation/action labels. Mechanical, finalized.
  'cta.report': 'Сообщить',
  'cta.list':   'Список',
  'cta.help':   'Как это работает',
  'cta.pets':   'Потерянные питомцы',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope. Mechanical. ──
  'country.button':      'Страна поиска: {name}',
  'country.open':        'Сменить страну поиска адреса',
  'country.title':       'В какой стране искать адрес?',
  'country.search':      'Искать страну',
  'country.empty':       'Страна не найдена.',
  'country.close':       'Закрыть список стран',
  // ── LanguageControl (INTL) — UI language picker. Mechanical. ──
  'lang.button':         'Язык: {name}',
  'lang.open':           'Сменить язык сайта',
  'lang.title':          'Выберите язык',
  // Live-region announcement on map recenter. Mechanical, finalized.
  'map.center_on_country': 'Карта центрирована на {country}.',
  // ── MainControls.js filter panel + confirm-point control. Mechanical. ──
  'mainctl.loading':              'Загрузка...',
  'mainctl.loading_aria':         'Загрузка',
  'mainctl.filter.label':         'текущий фильтр:',
  'mainctl.filter.aria':          'Фильтровать по категории',
  'mainctl.filter.all':           'Все',
  'mainctl.filter.donors':        'Жертвователи',
  'mainctl.filter.basket':        'Продуктовая корзина',
  'mainctl.filter.street':        'Без жилья',
  'mainctl.filter.ready_meal':    'Готовая еда',
  'mainctl.filter.social':        'Соцсети',
  'mainctl.filter.has_cnpj':      'есть CNPJ',
  'mainctl.filter.none':          'Нет',
  'mainctl.filter.needs_group':   'Потребности при бедствии',
  'mainctl.filter.all_needs':     'Все потребности',
  'mainctl.phone_filter.label':   'Телефон',
  'mainctl.phone_filter.aria':    'Фильтровать по телефону',
  'mainctl.confirm.label':        'Подтвердить точку',
  'mainctl.confirm.label_ready':  '✓ Подтвердить точку',
  'mainctl.confirm.aria_ready':   'Подтвердить точку, отмеченную на карте',
  'mainctl.confirm.aria_pending': 'Подтвердить точку (сначала нажмите на карту)',
  'mainctl.confirm.aria_busy':    'Подтверждение точки',
  // ── NEED categories — DIGNITY-SENSITIVE draft, `[REVISAR-HUMANO] ` pending
  // human tone review. Nominative citation forms only: these are standalone UI
  // labels with no numeral-driven case, so no case/declension was applied (that
  // transform is human-review-only). No em-dash. See the pt block. ──
  'need.label.comida':   '[REVISAR-HUMANO] Еда',
  'need.label.agua':     '[REVISAR-HUMANO] Вода',
  'need.label.roupa':    '[REVISAR-HUMANO] Одежда',
  'need.label.higiene':  '[REVISAR-HUMANO] Гигиена',
  'need.label.abrigo':   '[REVISAR-HUMANO] Кров',
  'need.label.remedio':  '[REVISAR-HUMANO] Лекарства',
  'need.label.animais':  '[REVISAR-HUMANO] Животные',
  'need.label.energia':  '[REVISAR-HUMANO] Зарядка',
  'need.report.comida':  '[REVISAR-HUMANO] Еда (общее)',
  'need.report.agua':    '[REVISAR-HUMANO] Вода',
  'need.report.roupa':   '[REVISAR-HUMANO] Одежда',
  'need.report.higiene': '[REVISAR-HUMANO] Гигиена',
  'need.report.abrigo':  '[REVISAR-HUMANO] Кров',
  'need.report.remedio': '[REVISAR-HUMANO] Лекарства',
  'need.report.animais': '[REVISAR-HUMANO] Животные (спасение и корм)',
  'need.report.energia': '[REVISAR-HUMANO] Зарядить телефон / электричество',
  // FILTRO_TEMPO Lane B - period (recency) selector. MECHANICAL duration
  // labels, finalized. Fixed citation forms for a standalone dropdown option
  // (not a {n}-count plural message), so no numeral-driven case/declension was
  // applied (that transform stays human-review-only). No em-dash.
  'filter.period.label':      'Период',
  'filter.period.daily':      'Ежедневно (24 ч)',
  'filter.period.weekly':     'Еженедельно (7 дней)',
  'filter.period.monthly':    'Ежемесячно (30 дней)',
  'filter.period.semiannual': 'Раз в полгода (6 месяцев)',
  'filter.period.annual':     'За год (12 месяцев)',
  'filter.period.all':        'Все',
};

export const zh = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      '这个人现在需要什么？',
  'report.subtitle':   '你可以选择多项。',
  'report.button':     '发布地点',
  'report.publishing': '正在发布…',
  'report.success':    '已发布 ✓',
  'report.retry':      '再试一次',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': '请至少选择一项需求。',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        '无法发布。请检查你的网络并重试。',
  'errors.offline':               '你当前离线。地点已保存，将在网络恢复后发送。',
  'errors.server_slow':           '服务器响应较慢。你的地点可能已保存，请等待30秒并重新加载后再重试。',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        '该地点在 {pais} 之外。请在所选国家范围内点击地图以在此发布，或在国旗选择器中切换国家。',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        '等待中',
  'pin.someone_going':  '有人正在赶来',
  'pin.attended_today': '今天已帮助',
  'pin.going_button':   '我现在就去',
  'pin.directions':     '路线',
  'pin.mark_attended':  '标记为已帮助',
  'pin.after_attended': '谢谢。该地点已归档。',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  '这片区域还没有人被标记。如果你看到有人需要帮助，请点击举报。',
  'empty.close': '关闭提示',
  // cta.* — navigation/action labels. Mechanical, finalized.
  'cta.report': '举报',
  'cta.list':   '列表',
  'cta.help':   '使用说明',
  'cta.pets':   '走失宠物',
  // ── CountryFlagControl (INTL) — flag-driven geocoder scope. Mechanical. ──
  'country.button':      '搜索国家：{name}',
  'country.open':        '更改地址搜索的国家',
  'country.title':       '在哪个国家搜索地址？',
  'country.search':      '搜索国家',
  'country.empty':       '未找到国家。',
  'country.close':       '关闭国家列表',
  // ── LanguageControl (INTL) — UI language picker. Mechanical. ──
  'lang.button':         '语言：{name}',
  'lang.open':           '更改网站语言',
  'lang.title':          '选择语言',
  // Live-region announcement on map recenter. Mechanical, finalized.
  'map.center_on_country': '地图已居中至 {country}。',
  // ── MainControls.js filter panel + confirm-point control. Mechanical. ──
  'mainctl.loading':              '加载中...',
  'mainctl.loading_aria':         '加载中',
  'mainctl.filter.label':         '当前筛选：',
  'mainctl.filter.aria':          '按类别筛选',
  'mainctl.filter.all':           '全部',
  'mainctl.filter.donors':        '捐赠者',
  'mainctl.filter.basket':        '基本食品篮',
  'mainctl.filter.street':        '露宿街头',
  'mainctl.filter.ready_meal':    '现成餐食',
  'mainctl.filter.social':        '社交媒体',
  'mainctl.filter.has_cnpj':      '拥有 CNPJ',
  'mainctl.filter.none':          '无',
  'mainctl.filter.needs_group':   '灾害中的需求',
  'mainctl.filter.all_needs':     '所有需求',
  'mainctl.phone_filter.label':   '电话',
  'mainctl.phone_filter.aria':    '按电话筛选',
  'mainctl.confirm.label':        '确认地点',
  'mainctl.confirm.label_ready':  '✓ 确认地点',
  'mainctl.confirm.aria_ready':   '确认在地图上标记的地点',
  'mainctl.confirm.aria_pending': '确认地点（请先点击地图）',
  'mainctl.confirm.aria_busy':    '正在确认地点',
  // ── NEED categories — DIGNITY-SENSITIVE draft, `[REVISAR-HUMANO] ` pending
  // human tone review. No measure-word/full-width-punctuation rewrite was applied
  // beyond matching this shard's existing house style (that transform is
  // human-review-only). No em-dash. See the pt block. ──
  'need.label.comida':   '[REVISAR-HUMANO] 食物',
  'need.label.agua':     '[REVISAR-HUMANO] 水',
  'need.label.roupa':    '[REVISAR-HUMANO] 衣物',
  'need.label.higiene':  '[REVISAR-HUMANO] 卫生用品',
  'need.label.abrigo':   '[REVISAR-HUMANO] 住所',
  'need.label.remedio':  '[REVISAR-HUMANO] 药品',
  'need.label.animais':  '[REVISAR-HUMANO] 动物',
  'need.label.energia':  '[REVISAR-HUMANO] 充电',
  'need.report.comida':  '[REVISAR-HUMANO] 食物（通用）',
  'need.report.agua':    '[REVISAR-HUMANO] 水',
  'need.report.roupa':   '[REVISAR-HUMANO] 衣物',
  'need.report.higiene': '[REVISAR-HUMANO] 卫生用品',
  'need.report.abrigo':  '[REVISAR-HUMANO] 住所',
  'need.report.remedio': '[REVISAR-HUMANO] 药品',
  'need.report.animais': '[REVISAR-HUMANO] 动物（救援与口粮）',
  'need.report.energia': '[REVISAR-HUMANO] 给手机充电 / 电力',
  // FILTRO_TEMPO Lane B - period (recency) selector. MECHANICAL duration
  // labels, finalized (no [REVISAR-HUMANO] marker, no em-dash). Full-width
  // parentheses match this shard's existing zh house style.
  'filter.period.label':      '时间范围',
  'filter.period.daily':      '每日（24小时）',
  'filter.period.weekly':     '每周（7天）',
  'filter.period.monthly':    '每月（30天）',
  'filter.period.semiannual': '每半年（6个月）',
  'filter.period.annual':     '每年（12个月）',
  'filter.period.all':        '全部',
};
