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
  'mainctl.year_filter.aria':     'Filtrar pelo último ano',
  'mainctl.year_filter.title':    'Esse ano',
  'mainctl.year_filter.info_aria':'Por que existe o filtro Esse ano?',
  'mainctl.year_filter.caption':  'pedido na enchente do RS · 2024',
  'mainctl.year_filter.note':     'Filtro pedido por pessoas atingidas pela enchente do Rio Grande do Sul, em 2024, para ver só os pedidos recentes do desastre. Mostra apenas as marcações deste ano.',
  'mainctl.confirm.label':        'Confirmar ponto',
  'mainctl.confirm.label_ready':  '✓ Confirmar ponto',
  'mainctl.confirm.aria_ready':   'Confirmar ponto marcado no mapa',
  'mainctl.confirm.aria_pending': 'Confirmar ponto (toque no mapa primeiro)',
  'mainctl.confirm.aria_busy':    'Confirmando ponto',
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
  'mainctl.year_filter.aria':     'Filtrar por el último año',
  'mainctl.year_filter.title':    'Este año',
  'mainctl.year_filter.info_aria':'¿Por qué existe el filtro Este año?',
  'mainctl.year_filter.caption':  'pedido en la inundación de RS · 2024',
  'mainctl.year_filter.note':     'Filtro pedido por personas afectadas por la inundación de Rio Grande do Sul, en 2024, para ver solo los pedidos recientes del desastre. Muestra solo las marcaciones de este año.',
  'mainctl.confirm.label':        'Confirmar punto',
  'mainctl.confirm.label_ready':  '✓ Confirmar punto',
  'mainctl.confirm.aria_ready':   'Confirmar el punto marcado en el mapa',
  'mainctl.confirm.aria_pending': 'Confirmar punto (toca primero en el mapa)',
  'mainctl.confirm.aria_busy':    'Confirmando punto',
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
  'mainctl.year_filter.aria':     'Filter by the last year',
  'mainctl.year_filter.title':    'This year',
  'mainctl.year_filter.info_aria':'Why does the This year filter exist?',
  'mainctl.year_filter.caption':  'requested during the RS flood · 2024',
  'mainctl.year_filter.note':     'Filter requested by people affected by the Rio Grande do Sul flood, in 2024, to see only the recent requests from the disaster. Shows only this year\'s points.',
  'mainctl.confirm.label':        'Confirm point',
  'mainctl.confirm.label_ready':  '✓ Confirm point',
  'mainctl.confirm.aria_ready':   'Confirm the point marked on the map',
  'mainctl.confirm.aria_pending': 'Confirm point (tap the map first)',
  'mainctl.confirm.aria_busy':    'Confirming point',
};

// INTL M7 — de/fr/ru/zh added at full key parity with pt. Same DRAFTED vs
// FINALIZED split as enUS: the dignity-sensitive copy (report.* hunger-need
// prompts, the reassuring errors.* status copy, the errors.out_of_country
// geofence note, the empty.* state) carries `[REVISAR-HUMANO] ` so a human
// approves the tone before it ships; mechanical strings ship finalized.
// Placeholders ({pais}, {name}, {country}) preserved verbatim. No em-dash.

export const de = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      '[REVISAR-HUMANO] Was braucht diese Person gerade?',
  'report.subtitle':   '[REVISAR-HUMANO] Du kannst mehr als eines wählen.',
  'report.button':     '[REVISAR-HUMANO] Punkt veröffentlichen',
  'report.publishing': 'Wird veröffentlicht…',
  'report.success':    'Veröffentlicht ✓',
  'report.retry':      'Erneut versuchen',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Wähle mindestens eine Notwendigkeit.',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        '[REVISAR-HUMANO] Veröffentlichung nicht möglich. Prüfe deine Verbindung und versuche es erneut.',
  'errors.offline':               '[REVISAR-HUMANO] Du bist offline. Der Punkt wurde gespeichert und wird gesendet, sobald die Verbindung zurück ist.',
  'errors.server_slow':           '[REVISAR-HUMANO] Der Server hat langsam geantwortet. Dein Punkt wurde vielleicht gespeichert, warte 30s und lade neu, bevor du es erneut versuchst.',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        '[REVISAR-HUMANO] Dieser Punkt liegt außerhalb von {pais}. Tippe auf die Karte, innerhalb des ausgewählten Landes, um hier zu veröffentlichen, oder wechsle das Land im Flaggenwähler.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'Wartet',
  'pin.someone_going':  'Jemand ist unterwegs',
  'pin.attended_today': 'Heute geholfen',
  'pin.going_button':   'Ich bin jetzt unterwegs',
  'pin.directions':     'Wegbeschreibung',
  'pin.mark_attended':  'Als geholfen markieren',
  'pin.after_attended': 'Danke. Der Punkt wurde archiviert.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  '[REVISAR-HUMANO] In diesem Bereich wurde noch niemand kartiert. Wenn du jemanden in Not gesehen hast, tippe auf Melden.',
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
  'mainctl.year_filter.aria':     'Nach dem letzten Jahr filtern',
  'mainctl.year_filter.title':    'Dieses Jahr',
  'mainctl.year_filter.info_aria':'Warum gibt es den Filter Dieses Jahr?',
  'mainctl.year_filter.caption':  'angefragt bei der RS-Flut · 2024',
  'mainctl.year_filter.note':     'Filter angefragt von Menschen, die von der Flut in Rio Grande do Sul 2024 betroffen sind, um nur die aktuellen Anfragen aus der Katastrophe zu sehen. Zeigt nur die Markierungen dieses Jahres.',
  'mainctl.confirm.label':        'Punkt bestätigen',
  'mainctl.confirm.label_ready':  '✓ Punkt bestätigen',
  'mainctl.confirm.aria_ready':   'Den auf der Karte markierten Punkt bestätigen',
  'mainctl.confirm.aria_pending': 'Punkt bestätigen (zuerst auf die Karte tippen)',
  'mainctl.confirm.aria_busy':    'Punkt wird bestätigt',
};

export const fr = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      '[REVISAR-HUMANO] De quoi cette personne a-t-elle besoin maintenant ?',
  'report.subtitle':   '[REVISAR-HUMANO] Tu peux en choisir plusieurs.',
  'report.button':     '[REVISAR-HUMANO] Publier le point',
  'report.publishing': 'Publication…',
  'report.success':    'Publié ✓',
  'report.retry':      'Réessayer',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Choisis au moins un besoin.',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        '[REVISAR-HUMANO] Publication impossible. Vérifie ta connexion et réessaie.',
  'errors.offline':               '[REVISAR-HUMANO] Tu es hors ligne. Le point a été enregistré et sera envoyé dès que la connexion reviendra.',
  'errors.server_slow':           '[REVISAR-HUMANO] Le serveur a mis du temps à répondre. Ton point a peut-être été enregistré, attends 30s et recharge avant de réessayer.',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        '[REVISAR-HUMANO] Ce point est en dehors de {pais}. Touche la carte, à l\'intérieur du pays sélectionné, pour publier ici, ou change de pays dans le sélecteur de drapeau.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'En attente',
  'pin.someone_going':  'Quelqu\'un est en chemin',
  'pin.attended_today': 'Aidé aujourd\'hui',
  'pin.going_button':   'J\'y vais maintenant',
  'pin.directions':     'Itinéraire',
  'pin.mark_attended':  'Marquer comme aidé',
  'pin.after_attended': 'Merci. Le point a été archivé.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  '[REVISAR-HUMANO] Personne n\'a encore été cartographié dans cette zone. Si tu as vu quelqu\'un dans le besoin, touche Signaler.',
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
  'mainctl.year_filter.aria':     'Filtrer par la dernière année',
  'mainctl.year_filter.title':    'Cette année',
  'mainctl.year_filter.info_aria':'Pourquoi le filtre Cette année existe-t-il ?',
  'mainctl.year_filter.caption':  'demandé lors de l\'inondation du RS · 2024',
  'mainctl.year_filter.note':     'Filtre demandé par les personnes touchées par l\'inondation du Rio Grande do Sul, en 2024, pour ne voir que les demandes récentes de la catastrophe. Affiche uniquement les points de cette année.',
  'mainctl.confirm.label':        'Confirmer le point',
  'mainctl.confirm.label_ready':  '✓ Confirmer le point',
  'mainctl.confirm.aria_ready':   'Confirmer le point marqué sur la carte',
  'mainctl.confirm.aria_pending': 'Confirmer le point (touchez d\'abord la carte)',
  'mainctl.confirm.aria_busy':    'Confirmation du point',
};

export const ru = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      '[REVISAR-HUMANO] Что этому человеку нужно прямо сейчас?',
  'report.subtitle':   '[REVISAR-HUMANO] Можно выбрать несколько.',
  'report.button':     '[REVISAR-HUMANO] Опубликовать точку',
  'report.publishing': 'Публикуется…',
  'report.success':    'Опубликовано ✓',
  'report.retry':      'Попробовать снова',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': 'Выберите хотя бы одну потребность.',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        '[REVISAR-HUMANO] Не удалось опубликовать. Проверьте соединение и попробуйте снова.',
  'errors.offline':               '[REVISAR-HUMANO] Вы офлайн. Точка сохранена и будет отправлена, когда соединение вернётся.',
  'errors.server_slow':           '[REVISAR-HUMANO] Сервер ответил медленно. Ваша точка могла сохраниться, подождите 30 секунд и обновите страницу, прежде чем пробовать снова.',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        '[REVISAR-HUMANO] Эта точка находится вне {pais}. Нажмите на карту, внутри выбранной страны, чтобы опубликовать здесь, или смените страну в выборе флага.',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        'Ожидает',
  'pin.someone_going':  'Кто-то уже в пути',
  'pin.attended_today': 'Помогли сегодня',
  'pin.going_button':   'Я уже иду',
  'pin.directions':     'Как добраться',
  'pin.mark_attended':  'Отметить как помогли',
  'pin.after_attended': 'Спасибо. Точка отправлена в архив.',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  '[REVISAR-HUMANO] В этой области пока никого не отметили. Если вы видели человека в нужде, нажмите Сообщить.',
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
  'mainctl.year_filter.aria':     'Фильтровать за последний год',
  'mainctl.year_filter.title':    'В этом году',
  'mainctl.year_filter.info_aria':'Зачем нужен фильтр В этом году?',
  'mainctl.year_filter.caption':  'запрошено во время наводнения в RS · 2024',
  'mainctl.year_filter.note':     'Фильтр запрошен людьми, пострадавшими от наводнения в Риу-Гранди-ду-Сул в 2024 году, чтобы видеть только недавние запросы по бедствию. Показывает только отметки этого года.',
  'mainctl.confirm.label':        'Подтвердить точку',
  'mainctl.confirm.label_ready':  '✓ Подтвердить точку',
  'mainctl.confirm.aria_ready':   'Подтвердить точку, отмеченную на карте',
  'mainctl.confirm.aria_pending': 'Подтвердить точку (сначала нажмите на карту)',
  'mainctl.confirm.aria_busy':    'Подтверждение точки',
};

export const zh = {
  // report.* — hunger-need prompts. DIGNITY-SENSITIVE: human-reviewed.
  'report.title':      '[REVISAR-HUMANO] 这个人现在需要什么？',
  'report.subtitle':   '[REVISAR-HUMANO] 你可以选择多项。',
  'report.button':     '[REVISAR-HUMANO] 发布地点',
  'report.publishing': '正在发布…',
  'report.success':    '已发布 ✓',
  'report.retry':      '再试一次',
  // Plain validation prompt — mechanical, finalized.
  'errors.at_least_one_category': '请至少选择一项需求。',
  // Failure/status copy carries reassurance tone, drafted for human review.
  'errors.publish_failed':        '[REVISAR-HUMANO] 无法发布。请检查你的网络并重试。',
  'errors.offline':               '[REVISAR-HUMANO] 你当前离线。地点已保存，将在网络恢复后发送。',
  'errors.server_slow':           '[REVISAR-HUMANO] 服务器响应较慢。你的地点可能已保存，请等待30秒并重新加载后再重试。',
  // Geofence-rejection copy. DIGNITY-SENSITIVE: human-reviewed.
  'errors.out_of_country':        '[REVISAR-HUMANO] 该地点在 {pais} 之外。请在所选国家范围内点击地图以在此发布，或在国旗选择器中切换国家。',
  // pin.* — status labels and the action button. Mechanical, finalized.
  'pin.waiting':        '等待中',
  'pin.someone_going':  '有人正在赶来',
  'pin.attended_today': '今天已帮助',
  'pin.going_button':   '我现在就去',
  'pin.directions':     '路线',
  'pin.mark_attended':  '标记为已帮助',
  'pin.after_attended': '谢谢。该地点已归档。',
  // empty.* — hunger-need empty state. DIGNITY-SENSITIVE: human-reviewed.
  'empty.no_pins_in_view':  '[REVISAR-HUMANO] 这片区域还没有人被标记。如果你看到有人需要帮助，请点击举报。',
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
  'mainctl.year_filter.aria':     '按最近一年筛选',
  'mainctl.year_filter.title':    '今年',
  'mainctl.year_filter.info_aria':'为什么有“今年”这个筛选？',
  'mainctl.year_filter.caption':  '在 RS 洪水期间请求 · 2024',
  'mainctl.year_filter.note':     '该筛选由 2024 年里奥格兰德州洪灾的受灾者请求，用于只查看本次灾害的近期请求。仅显示今年的标记。',
  'mainctl.confirm.label':        '确认地点',
  'mainctl.confirm.label_ready':  '✓ 确认地点',
  'mainctl.confirm.aria_ready':   '确认在地图上标记的地点',
  'mainctl.confirm.aria_pending': '确认地点（请先点击地图）',
  'mainctl.confirm.aria_busy':    '正在确认地点',
};
