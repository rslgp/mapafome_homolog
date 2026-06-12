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
    // PET-M22 — header cross-link label to the /pets (achados e perdidos) map.
    // Full pt-BR<->es parity + the dignity-sensitive /pets copy is owned by
    // PET-M23; this navigational label is wired under a stable shared key now
    // (both locales) so it never renders the raw key string.
    'cta.pets':   'Pets perdidos',
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
    'assinar.cta.submitting':  'Processando…',
    'assinar.cta.support':     'Apoiar com R$ {value}/mês',
    'assinar.note':            'Pagamento processado pela Asaas. Você pode cancelar quando quiser.',
    'assinar.error.fallback':  'Não foi possível concluir. Tente novamente.',
    'assinar.success.title':   'Obrigado pelo apoio 💛',
    'assinar.success.sub':     'Sua assinatura de {value} por mês foi criada.',
    'assinar.success.active':  'A cobrança recorrente já está ativa.',
    // Inline payment screen (Pix QR / boleto / card redirect).
    'assinar.pay.loading':       'Gerando seu pagamento…',
    'assinar.pay.error':         'Não foi possível carregar o pagamento.',
    'assinar.pay.retry':         'Tentar novamente',
    'assinar.pay.pix.title':     'Pague com Pix',
    'assinar.pay.pix.help':      'Abra o app do seu banco, escaneie o QR Code ou use o Pix copia e cola.',
    'assinar.pay.pix.copy':      'Copiar código Pix',
    'assinar.pay.pix.copied':    'Código copiado!',
    'assinar.pay.pix.qrAlt':     'QR Code do Pix para pagamento',
    'assinar.pay.boleto.title':  'Pague com boleto',
    'assinar.pay.boleto.help':   'Copie a linha digitável ou abra o boleto em PDF para pagar no seu banco.',
    'assinar.pay.boleto.line':   'Linha digitável',
    'assinar.pay.boleto.copy':   'Copiar linha digitável',
    'assinar.pay.boleto.copied': 'Linha copiada!',
    'assinar.pay.boleto.open':   'Abrir boleto (PDF)',
    'assinar.pay.card.title':    'Pague com cartão',
    'assinar.pay.card.help':     'Você será levado ao ambiente seguro da Asaas para informar os dados do cartão.',
    'assinar.pay.card.cta':      'Ir para o pagamento seguro',
    'assinar.pay.pending':       'Seu pagamento está sendo gerado. Recarregue em instantes.',
    // Rail display copy — RAILS (asaasSubscriptionClient) stays the id/structure
    // SOT; these are pulled in page.js via t() keyed by rail id.
    'assinar.rail.pix.label':     'Pix',
    'assinar.rail.pix.hint':      'Pix Automático — débito recorrente, sem taxa de cartão',
    'assinar.rail.cartao.label':  'Cartão de crédito',
    'assinar.rail.cartao.hint':   'Assinatura no cartão, renovação automática',
    'assinar.rail.boleto.label':  'Boleto',
    'assinar.rail.boleto.hint':   'Um boleto por mês — você paga cada um',
    // ══════════════════════════════════════════════════════════════════════
    // PET-M23 — /pets (achados e perdidos) i18n. Every user-visible /pets string
    // lives here under the `pets.*` namespace, read at the render site via t()
    // (+ useLocale() to re-render on a switch). The petDomain SOT keeps the
    // stable IDS (status/species/size); the LABELS/HINTS resolve by id through
    // these keys (pt-BR values are byte-identical to the petDomain labels so the
    // SOT-importing render tests stay green). Dignity-sensitive lines (status
    // hints, consent/privacy, reunite/encerrar confirms, the safe-contact note,
    // the closure reassurance, the match "pode ser") are HUMAN-authored in both
    // languages — careful es, never a literal machine translation.
    // ── PetsApp — header / lead / nav / view toggle / deep-link note ──
    'pets.back':                 '← Mapa',
    'pets.header.title':         'MapaPets seu pet perdido é encontrado por pessoas do bem',
    'pets.header.lead.pre':      'Toque no mapa onde o pet foi visto e toque em',
    'pets.header.lead.cta':      'Relatar um pet',
    'pets.header.lead.post':     '. Juntos a gente reúne mais bichinhos com suas famílias.',
    'pets.deeplink.missing':     'Esse pet não está mais no mapa — pode já ter sido reencontrado. Veja os outros pets por aqui, ou relate um novo.',
    'pets.deeplink.dismiss':     'Entendi',
    'pets.view.aria':            'Como ver os pets',
    'pets.view.map':             'Mapa',
    'pets.view.list':            'Lista',
    'pets.report.fab':           'Relatar um pet',
    // ── Status / species / size LABELS + HINTS (resolved by id from petDomain) ──
    'pets.status.perdido.label':    'Perdido',
    'pets.status.perdido.hint':     'Meu pet sumiu',
    'pets.status.encontrado.label': 'Encontrado',
    'pets.status.encontrado.hint':  'Achei um pet',
    'pets.status.avistado.label':   'Avistado',
    'pets.status.avistado.hint':    'Vi um pet na rua',
    'pets.species.cao.label':    'Cão',
    'pets.species.gato.label':   'Gato',
    'pets.species.outro.label':  'Outro',
    'pets.size.pequeno.label':   'Pequeno',
    'pets.size.medio.label':     'Médio',
    'pets.size.grande.label':    'Grande',
    // ── COLOR bucket LABELS (resolved by id from petDomain PET_COLORS) ──
    'pets.color.preto.label':    'Preto',
    'pets.color.branco.label':   'Branco',
    'pets.color.caramelo.label': 'Caramelo',
    'pets.color.marrom.label':   'Marrom',
    'pets.color.cinza.label':    'Cinza',
    'pets.color.rajado.label':   'Rajado',
    'pets.color.claro.label':    'Claro',
    'pets.color.outro.label':    'Outra',
    // ── RECENCY window LABELS (resolved by id from petDomain PET_RECENCY_OPTIONS).
    //    NEUTRAL time-windows — never freshness verdicts / clock-against-you. ──
    'pets.recency.7.label':      'Últimos 7 dias',
    'pets.recency.30.label':     'Últimos 30 dias',
    'pets.recency.90.label':     'Últimos 90 dias',
    // ── Lifecycle legend (aged / reunido) ──
    'pets.lifecycle.aged.label':    'Relato antigo',
    'pets.lifecycle.reunido.label': 'Reunido',
    // ── PetReportSheet ──
    'pets.report.title':         'Reportar um pet',
    'pets.report.subtitle':      'Um detalhe ajuda — mas o essencial é marcar o local e a situação.',
    'pets.report.location.set':  'Ponto em: {coords}',
    'pets.report.location.none': 'Toque no mapa para escolher o local',
    'pets.report.error.status':  'Escolha uma situação: perdido, encontrado ou avistado.',
    'pets.report.legend.status': 'Qual é a situação?',
    'pets.report.legend.species':'Espécie',
    'pets.report.legend.size':   'Porte (opcional)',
    'pets.report.aria.status':   'Situação do pet',
    'pets.report.aria.species':  'Espécie do pet',
    'pets.report.aria.size':     'Porte do pet',
    'pets.report.handle.aria':   'Arraste para redimensionar',
    'pets.report.album.label':   'Fotos do pet — o que mais ajuda a reconhecer',
    'pets.report.photo.processing': 'Preparando a foto…',
    'pets.report.photo.change':  'Trocar a foto',
    'pets.report.photo.choose':  'Tirar foto ou escolher da galeria',
    'pets.report.photo.error':   'Não deu para preparar essa imagem. Tente outra foto, ou cole um link no campo abaixo.',
    'pets.report.photo.previewAlt': 'Prévia da foto do pet que você escolheu',
    'pets.report.photo.previewCap': 'Prévia pronta (reduzida no seu aparelho). Para ela aparecer no relato, hospede a foto e cole o link abaixo — por enquanto, é o link que publica.',
    'pets.report.photo.removePreview': 'Remover prévia',
    'pets.report.photo.privacy': 'Evite fotos que mostrem pessoas, placas ou o número da casa — foque no pet. A foto é reduzida no seu aparelho antes de qualquer coisa (até ~{mb} MB).',
    'pets.report.photo.urlLabel': 'Link da foto (o que publica)',
    'pets.report.photo.urlPlaceholder': 'Cole aqui o link da foto ou da pasta do Google Drive',
    'pets.report.photo.urlHelper': 'Uma foto é o que mais ajuda no reencontro. Cole o link de uma foto direta ou de uma pasta do Google Drive (deixe como “qualquer pessoa com o link pode ver”). Sem foto também publica — mas com foto, muito mais gente reconhece.',
    'pets.report.more.summary':  'Mais sobre o pet (opcional)',
    'pets.report.field.name':    'Nome do pet (se souber)',
    'pets.report.field.color':   'Cor / pelagem',
    'pets.report.field.detail':  'Detalhe — onde, coleira, comportamento',
    'pets.report.freetext.warning': 'Esse texto fica visível para todo mundo. Para a segurança de todos, não inclua dados de terceiros, placa de carro nem endereço exato. Se houver um detalhe que só o dono sabe (uma marca, uma manha), guarde-o para confirmar com calma depois — não escreva aqui.',
    'pets.report.contact.summary': 'Seu contato (opcional)',
    'pets.report.contact.help':  'Quem encontrar (ou reconhecer) o pet pode falar direto com você.',
    'pets.report.field.contact': 'Seu contato — WhatsApp/@ (opcional)',
    'pets.report.consent.pre':   'Ao informar um contato, você concorda com os',
    'pets.report.consent.privacyLink': 'Termos de Privacidade',
    'pets.report.consent.post':  '. Seu contato nunca aparece no mapa nem na lista: ele fica escondido e só é mostrado quando alguém abre este pet e toca em “Mostrar contato”, para ajudar no reencontro.',
    'pets.report.consent.below.pre':  'Ao confirmar, você está de acordo com os',
    'pets.report.consent.below.mid':  'e os',
    'pets.report.consent.below.terms': 'Termos de Uso',
    'pets.report.cancel':        'Cancelar',
    'pets.report.btn.publishing': 'Publicando…',
    'pets.report.btn.success':   'Publicado ✓',
    'pets.report.btn.queued':    'Guardado ✓',
    'pets.report.btn.retry':     'Tentar de novo',
    'pets.report.btn.publish':   'Publicar pet',
    // ── Publish-failure copy (resolved by reasonCode; pt-BR == petDomain SOT) ──
    'pets.publish.failed.out_of_bounds': 'Esse ponto está fora da área que a gente atende por aqui. Toque no mapa, dentro da região, para marcar onde o pet foi visto.',
    'pets.publish.failed.offline':       'Você está sem internet agora. Seu relato foi guardado com segurança e vai ser publicado sozinho assim que a conexão voltar.',
    'pets.publish.failed.server_slow':   'A conexão está lenta e seu relato pode já ter sido salvo. Aguarde um instante e recarregue antes de publicar de novo, para não duplicar.',
    'pets.publish.failed.generic':       'Não deu para publicar agora. Seu relato não se perdeu — confira a conexão e tente de novo com calma.',
    // ── Publish throttle copy (resolved by code; pt-BR == petDomain SOT) ──
    'pets.publish.throttle.burst':     'Você publicou vários relatos em pouco tempo. Eles já estão no mapa — espere um instante antes de enviar outro, para a gente manter tudo organizado.',
    'pets.publish.throttle.identical': 'Esse relato parece igual a um que você acabou de publicar. Ele já está no mapa — não precisa enviar de novo.',
    // ── PetDetailSheet ──
    'pets.detail.name.fallback': 'Pet sem nome',
    'pets.detail.status.fallback': 'Pet',
    'pets.detail.species.fallback': 'pet',
    'pets.detail.photo.alt':     'Foto do pet ({desc})',
    'pets.detail.album.title':   'Ver as fotos do pet',
    'pets.detail.album.sub':     'o que mais ajuda a reconhecer',
    'pets.detail.photo.noneAria':'Este relato está sem foto',
    'pets.detail.photo.noneText':'Sem foto neste relato',
    'pets.detail.reported':      'Reportado',
    'pets.detail.match.aria':    'Possível encontro',
    'pets.detail.match.lead.lost':   'Pode ser que alguém tenha visto um pet parecido por perto.',
    'pets.detail.match.lead.found':  'Pode ser que este pet tenha alguém procurando por ele por perto.',
    'pets.detail.match.lead.tail':   'Vale olhar com calma — pode não ser, e tudo bem.',
    'pets.detail.match.open':    'Ver o outro relato',
    'pets.detail.match.dismiss': 'Agora não',
    'pets.detail.reveal':        'Mostrar contato de quem reportou',
    'pets.detail.privacy.note':  'O contato fica escondido até você tocar — para proteger quem reportou. Combine com calma e, se puder, confirme um detalhe que só o dono saberia antes de qualquer acerto.',
    'pets.detail.contact.suffix':'de quem reportou',
    'pets.detail.lifecycle.aria':'Desfecho deste relato',
    'pets.detail.lifecycle.reunido':  'Marcar como reunido',
    'pets.detail.lifecycle.encerrar': 'Encerrar busca',
    'pets.detail.lifecycle.confirmReunido.aria':  'Confirmar reencontro',
    'pets.detail.lifecycle.confirmReunido.note':  'Que notícia boa. Vamos marcar este pet como reunido e tirá-lo do mapa ativo — o relato continua guardado.',
    'pets.detail.lifecycle.confirmReunido.yes':   'Sim, foi reunido',
    'pets.detail.lifecycle.confirmEncerrado.aria':'Confirmar encerramento da busca',
    'pets.detail.lifecycle.confirmEncerrado.note':'Tudo bem encerrar quando você decidir. Vamos tirar este relato do mapa ativo — ele fica guardado, e você pode relatar de novo se precisar.',
    'pets.detail.lifecycle.confirmEncerrado.yes': 'Encerrar a busca',
    'pets.detail.lifecycle.back':   'Voltar',
    'pets.detail.lifecycle.saving': 'Salvando…',
    'pets.detail.lifecycle.done.reunido':  'Que bom — bom reencontro. Este pet saiu do mapa ativo, e o relato fica guardado.',
    'pets.detail.lifecycle.done.encerrado':'Busca encerrada. Foi visto, foi tentado — e tudo bem parar. O relato fica guardado, e você pode voltar quando quiser.',
    'pets.detail.lifecycle.error':  'Não deu para salvar agora. Você pode tentar de novo em instantes.',
    'pets.detail.lifecycle.retry':  'Tentar de novo',
    'pets.detail.flag.aria':     'Confirmar denúncia',
    'pets.detail.flag.btn':      'Denunciar este relato',
    'pets.detail.flag.note':     'Algo parece errado com este relato? Você pode sinalizá-lo para revisão. Obrigado por ajudar a manter o mapa confiável.',
    'pets.detail.flag.yes':      'Sim, sinalizar',
    'pets.detail.flag.cancel':   'Cancelar',
    'pets.detail.flag.sending':  'Enviando sua sinalização…',
    'pets.detail.flag.done':     'Recebemos sua sinalização. Vamos revisar com calma. Obrigado por cuidar do mapa junto com a gente.',
    'pets.detail.flag.error':    'Não deu para enviar a sinalização agora. Você pode tentar de novo em instantes.',
    'pets.detail.flag.retry':    'Tentar de novo',
    'pets.detail.close':         'Fechar',
    'pets.detail.share':         'Compartilhar',
    'pets.detail.share.aria':    'Compartilhar este pet',
    'pets.detail.directions':    'Como chegar',
    // ── PetFilterBar ──
    'pets.filter.heading':       'Filtrar pets no mapa',
    'pets.filter.clear':         'Limpar filtros',
    'pets.filter.legend.status': 'Situação',
    'pets.filter.legend.species':'Espécie',
    'pets.filter.legend.color':  'Cor',
    'pets.filter.legend.size':   'Porte',
    'pets.filter.legend.recency':'Quando foi reportado',
    'pets.filter.group.status':  'Filtrar por situação',
    'pets.filter.group.species': 'Filtrar por espécie',
    'pets.filter.group.color':   'Filtrar por cor',
    'pets.filter.group.size':    'Filtrar por porte',
    'pets.filter.group.recency': 'Filtrar por quando foi reportado',
    'pets.filter.count.noneTotal': 'Nenhum pet reportado por aqui ainda.',
    'pets.filter.count.noneMatch': 'Nenhum pet combina com esses filtros. Toque em limpar para ver todos.',
    // Botão inline de recuperação dentro da própria contagem zero — uma só unidade
    // visual: a contagem 0 sempre tem o "limpar" a um toque, ali mesmo.
    'pets.filter.count.clearInline': 'limpar filtros',
    'pets.filter.count.allOne':  '1 pet no mapa.',
    'pets.filter.count.all':     '{count} pets no mapa.',
    'pets.filter.count.someOne': '1 pet no mapa (de {total}).',
    'pets.filter.count.some':    '{count} pets no mapa (de {total}).',
    // ── PetListView ──
    'pets.list.aria':            'Lista de pets',
    'pets.list.empty':           'Nenhum pet para mostrar aqui agora. Tente afrouxar o filtro, ou relate um pet que você viu.',
    // ── PetMapLoadStates ──
    'pets.loadstate.loading':    'Carregando os pets do mapa…',
    'pets.loadstate.empty.lead.pre': 'Nenhum pet reportado por aqui ainda — seja o primeiro a ajudar.',
    'pets.loadstate.empty.point.pre': 'Toque em',
    'pets.loadstate.empty.point.cta': 'Relatar um pet',
    'pets.loadstate.empty.point.post': ', logo abaixo.',
    'pets.loadstate.error.lead': 'Não foi possível carregar os pets agora. Você ainda pode relatar um — e pode tentar carregar de novo.',
    'pets.loadstate.error.retry':'Tentar de novo',
    // ── PetPublishClosure ──
    'pets.closure.title':        'Seu pet está no mapa',
    'pets.closure.lead':         'Pronto — qualquer pessoa por perto pode reconhecê-lo. A gente cuida daqui; você não precisa ficar atualizando a tela.',
    'pets.closure.seeOnMap':     'Ver no mapa',
    'pets.closure.dismiss':      'Fechar',
    // ── PetFirstRunHint ──
    'pets.hint.aria':            'Como usar o mapa de pets',
    'pets.hint.text.pre':        'Toque no mapa onde você viu o pet, depois toque em',
    'pets.hint.text.cta':        'Relatar um pet',
    'pets.hint.dismiss':         'Entendi',
    // ── PetLegendControl ──
    'pets.legend.title':         'O que cada marcador quer dizer',
    'pets.legend.close':         'Fechar legenda',
    'pets.legend.reopen':        'Mostrar legenda',
    // ── PetSearchField ──
    'pets.search.label':         'Buscar endereço, bairro ou cidade',
    'pets.search.clear':         'Limpar busca',
    'pets.search.notFound':      'Nenhum endereço encontrado. Tente outra busca.',
    // ── PetLocateControl ──
    'pets.locate.label':         'Perto de mim',
    'pets.locate.title':         'Centralizar o mapa na minha localização',
    'pets.locate.locating':      'Procurando sua localização…',
    'pets.locate.denied':        'Não foi possível usar sua localização. Você pode buscar um endereço acima.',
    'pets.locate.unsupported':   'Seu aparelho não permite localização agora. Busque um endereço acima.',
    // ── petShare — the share message (status lead + species + area + invite) ──
    'pets.share.lead.perdido':   'Pet perdido',
    'pets.share.lead.encontrado':'Pet encontrado',
    'pets.share.lead.avistado':  'Pet avistado',
    'pets.share.lead.fallback':  'Pet',
    'pets.share.area':           'perto de {area}',
    'pets.share.invite':         'Veja no mapa e ajude a reunir esse pet com a família:',
    'pets.share.title':          'Pet no MAPA FOME',
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
    // PET-M22 — see the pt-BR note; es value is a provisional twin so the label
    // is never the raw key. PET-M23 owns the human-authored /pets es parity.
    'cta.pets':   'Mascotas perdidas',
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
    'assinar.cta.submitting':  'Procesando…',
    'assinar.cta.support':     'Apoyar con R$ {value}/mes',
    'assinar.note':            'Pago procesado por Asaas. Puedes cancelar cuando quieras.',
    'assinar.error.fallback':  'No se pudo completar. Vuelve a intentarlo.',
    'assinar.success.title':   'Gracias por tu apoyo 💛',
    'assinar.success.sub':     'Tu suscripción de {value} al mes fue creada.',
    'assinar.success.active':  'El cobro recurrente ya está activo.',
    // Pantalla de pago en línea (QR Pix / boleto / redirección de tarjeta).
    'assinar.pay.loading':       'Generando tu pago…',
    'assinar.pay.error':         'No se pudo cargar el pago.',
    'assinar.pay.retry':         'Reintentar',
    'assinar.pay.pix.title':     'Paga con Pix',
    'assinar.pay.pix.help':      'Abre la app de tu banco, escanea el QR o usa el Pix copia y pega.',
    'assinar.pay.pix.copy':      'Copiar código Pix',
    'assinar.pay.pix.copied':    '¡Código copiado!',
    'assinar.pay.pix.qrAlt':     'Código QR de Pix para el pago',
    'assinar.pay.boleto.title':  'Paga con boleto',
    'assinar.pay.boleto.help':   'Copia la línea digitable o abre el boleto en PDF para pagar en tu banco.',
    'assinar.pay.boleto.line':   'Línea digitable',
    'assinar.pay.boleto.copy':   'Copiar línea digitable',
    'assinar.pay.boleto.copied': '¡Línea copiada!',
    'assinar.pay.boleto.open':   'Abrir boleto (PDF)',
    'assinar.pay.card.title':    'Paga con tarjeta',
    'assinar.pay.card.help':     'Te llevaremos al entorno seguro de Asaas para ingresar los datos de la tarjeta.',
    'assinar.pay.card.cta':      'Ir al pago seguro',
    'assinar.pay.pending':       'Tu pago se está generando. Recarga en unos instantes.',
    // Copia de los medios de pago — RAILS (asaasSubscriptionClient) sigue siendo
    // la fuente de ids/estructura; estos textos se leen en page.js vía t().
    'assinar.rail.pix.label':     'Pix',
    'assinar.rail.pix.hint':      'Pix Automático — débito recurrente, sin tarifa de tarjeta',
    'assinar.rail.cartao.label':  'Tarjeta de crédito',
    'assinar.rail.cartao.hint':   'Suscripción con tarjeta, renovación automática',
    'assinar.rail.boleto.label':  'Boleto',
    'assinar.rail.boleto.hint':   'Un boleto por mes — pagas cada uno',
    // ══════════════════════════════════════════════════════════════════════
    // PET-M23 — /pets es parity. Dignity-sensitive lines are HUMAN-authored
    // (careful, warm es — not a literal calque): status hints, consent/privacy,
    // the reunite/encerrar confirms and closures, the safe-contact note, the
    // "puede ser" match copy. The tone-governor (lower the owner's anxiety,
    // never spike it) is preserved in Spanish too.
    // ── PetsApp ──
    'pets.back':                 '← Mapa',
    'pets.header.title':         'MapaPets: tu mascota perdida la encuentran personas de buen corazón',
    'pets.header.lead.pre':      'Toca en el mapa donde viste a la mascota y toca en',
    'pets.header.lead.cta':      'Reportar una mascota',
    'pets.header.lead.post':     '. Juntos devolvemos más animalitos a sus familias.',
    'pets.deeplink.missing':     'Esta mascota ya no está en el mapa — puede que ya se haya reencontrado. Mira las otras mascotas por aquí, o reporta una nueva.',
    'pets.deeplink.dismiss':     'Entendido',
    'pets.view.aria':            'Cómo ver las mascotas',
    'pets.view.map':             'Mapa',
    'pets.view.list':            'Lista',
    'pets.report.fab':           'Reportar una mascota',
    // ── Status / species / size ──
    'pets.status.perdido.label':    'Perdida',
    'pets.status.perdido.hint':     'Mi mascota se perdió',
    'pets.status.encontrado.label': 'Encontrada',
    'pets.status.encontrado.hint':  'Encontré una mascota',
    'pets.status.avistado.label':   'Avistada',
    'pets.status.avistado.hint':    'Vi una mascota en la calle',
    'pets.species.cao.label':    'Perro',
    'pets.species.gato.label':   'Gato',
    'pets.species.outro.label':  'Otro',
    'pets.size.pequeno.label':   'Pequeño',
    'pets.size.medio.label':     'Mediano',
    'pets.size.grande.label':    'Grande',
    // ── COLOR bucket LABELS (resolved by id from petDomain PET_COLORS) ──
    'pets.color.preto.label':    'Negro',
    'pets.color.branco.label':   'Blanco',
    'pets.color.caramelo.label': 'Caramelo',
    'pets.color.marrom.label':   'Marrón',
    'pets.color.cinza.label':    'Gris',
    'pets.color.rajado.label':   'Atigrado',
    'pets.color.claro.label':    'Claro',
    'pets.color.outro.label':    'Otro',
    // ── RECENCY window LABELS (NEUTRAL time-windows; never freshness verdicts) ──
    'pets.recency.7.label':      'Últimos 7 días',
    'pets.recency.30.label':     'Últimos 30 días',
    'pets.recency.90.label':     'Últimos 90 días',
    // ── Lifecycle legend ──
    'pets.lifecycle.aged.label':    'Reporte antiguo',
    'pets.lifecycle.reunido.label': 'Reunida',
    // ── PetReportSheet ──
    'pets.report.title':         'Reportar una mascota',
    'pets.report.subtitle':      'Un detalle ayuda — pero lo esencial es marcar el lugar y la situación.',
    'pets.report.location.set':  'Punto en: {coords}',
    'pets.report.location.none': 'Toca en el mapa para elegir el lugar',
    'pets.report.error.status':  'Elige una situación: perdida, encontrada o avistada.',
    'pets.report.legend.status': '¿Cuál es la situación?',
    'pets.report.legend.species':'Especie',
    'pets.report.legend.size':   'Tamaño (opcional)',
    'pets.report.aria.status':   'Situación de la mascota',
    'pets.report.aria.species':  'Especie de la mascota',
    'pets.report.aria.size':     'Tamaño de la mascota',
    'pets.report.handle.aria':   'Arrastra para cambiar el tamaño',
    'pets.report.album.label':   'Fotos de la mascota — lo que más ayuda a reconocerla',
    'pets.report.photo.processing': 'Preparando la foto…',
    'pets.report.photo.change':  'Cambiar la foto',
    'pets.report.photo.choose':  'Tomar una foto o elegir de la galería',
    'pets.report.photo.error':   'No se pudo preparar esa imagen. Prueba con otra foto, o pega un enlace en el campo de abajo.',
    'pets.report.photo.previewAlt': 'Vista previa de la foto de la mascota que elegiste',
    'pets.report.photo.previewCap': 'Vista previa lista (reducida en tu dispositivo). Para que aparezca en el reporte, sube la foto a un servicio y pega el enlace abajo — por ahora, es el enlace lo que se publica.',
    'pets.report.photo.removePreview': 'Quitar la vista previa',
    'pets.report.photo.privacy': 'Evita fotos que muestren personas, placas o el número de la casa — enfócate en la mascota. La foto se reduce en tu dispositivo antes que nada (hasta ~{mb} MB).',
    'pets.report.photo.urlLabel': 'Enlace de la foto (lo que se publica)',
    'pets.report.photo.urlPlaceholder': 'Pega aquí el enlace de la foto o de la carpeta de Google Drive',
    'pets.report.photo.urlHelper': 'Una foto es lo que más ayuda en el reencuentro. Pega el enlace de una foto directa o de una carpeta de Google Drive (déjala como “cualquier persona con el enlace puede ver”). Sin foto también se publica — pero con foto, mucha más gente la reconoce.',
    'pets.report.more.summary':  'Más sobre la mascota (opcional)',
    'pets.report.field.name':    'Nombre de la mascota (si lo sabes)',
    'pets.report.field.color':   'Color / pelaje',
    'pets.report.field.detail':  'Detalle — dónde, collar, comportamiento',
    'pets.report.freetext.warning': 'Este texto queda visible para todo el mundo. Por la seguridad de todos, no incluyas datos de terceros, placa de auto ni dirección exacta. Si hay un detalle que solo el dueño sabe (una marca, una maña), guárdalo para confirmarlo con calma después — no lo escribas aquí.',
    'pets.report.contact.summary': 'Tu contacto (opcional)',
    'pets.report.contact.help':  'Quien encuentre (o reconozca) a la mascota puede hablar directo contigo.',
    'pets.report.field.contact': 'Tu contacto — WhatsApp/@ (opcional)',
    'pets.report.consent.pre':   'Al indicar un contacto, aceptas los',
    'pets.report.consent.privacyLink': 'Términos de Privacidad',
    'pets.report.consent.post':  '. Tu contacto nunca aparece en el mapa ni en la lista: queda oculto y solo se muestra cuando alguien abre esta mascota y toca en “Mostrar contacto”, para ayudar en el reencuentro.',
    'pets.report.consent.below.pre':  'Al confirmar, aceptas los',
    'pets.report.consent.below.mid':  'y los',
    'pets.report.consent.below.terms': 'Términos de Uso',
    'pets.report.cancel':        'Cancelar',
    'pets.report.btn.publishing': 'Publicando…',
    'pets.report.btn.success':   'Publicado ✓',
    'pets.report.btn.queued':    'Guardado ✓',
    'pets.report.btn.retry':     'Reintentar',
    'pets.report.btn.publish':   'Publicar mascota',
    // ── Publish-failure copy (calm, reassuring; never accusatory) ──
    'pets.publish.failed.out_of_bounds': 'Ese punto está fuera del área que cubrimos por aquí. Toca en el mapa, dentro de la región, para marcar dónde viste a la mascota.',
    'pets.publish.failed.offline':       'Ahora estás sin conexión. Tu reporte se guardó con seguridad y se publicará solo en cuanto vuelva la conexión.',
    'pets.publish.failed.server_slow':   'La conexión está lenta y tu reporte quizá ya se guardó. Espera un momento y recarga antes de publicar de nuevo, para no duplicar.',
    'pets.publish.failed.generic':       'No se pudo publicar ahora. Tu reporte no se perdió — revisa la conexión e inténtalo de nuevo con calma.',
    // ── Publish throttle copy (calm, never punitive) ──
    'pets.publish.throttle.burst':     'Publicaste varios reportes en poco tiempo. Ya están en el mapa — espera un momento antes de enviar otro, para mantener todo ordenado.',
    'pets.publish.throttle.identical': 'Este reporte parece igual a uno que acabas de publicar. Ya está en el mapa — no hace falta enviarlo de nuevo.',
    // ── PetDetailSheet ──
    'pets.detail.name.fallback': 'Mascota sin nombre',
    'pets.detail.status.fallback': 'Mascota',
    'pets.detail.species.fallback': 'mascota',
    'pets.detail.photo.alt':     'Foto de la mascota ({desc})',
    'pets.detail.album.title':   'Ver las fotos de la mascota',
    'pets.detail.album.sub':     'lo que más ayuda a reconocerla',
    'pets.detail.photo.noneAria':'Este reporte no tiene foto',
    'pets.detail.photo.noneText':'Sin foto en este reporte',
    'pets.detail.reported':      'Reportada',
    'pets.detail.match.aria':    'Posible coincidencia',
    'pets.detail.match.lead.lost':   'Puede ser que alguien haya visto una mascota parecida cerca.',
    'pets.detail.match.lead.found':  'Puede ser que esta mascota tenga a alguien buscándola cerca.',
    'pets.detail.match.lead.tail':   'Vale la pena mirar con calma — puede que no sea, y está bien.',
    'pets.detail.match.open':    'Ver el otro reporte',
    'pets.detail.match.dismiss': 'Ahora no',
    'pets.detail.reveal':        'Mostrar el contacto de quien reportó',
    'pets.detail.privacy.note':  'El contacto queda oculto hasta que tú lo toques — para proteger a quien reportó. Ponte de acuerdo con calma y, si puedes, confirma un detalle que solo el dueño sabría antes de cualquier arreglo.',
    'pets.detail.contact.suffix':'de quien reportó',
    'pets.detail.lifecycle.aria':'Desenlace de este reporte',
    'pets.detail.lifecycle.reunido':  'Marcar como reunida',
    'pets.detail.lifecycle.encerrar': 'Cerrar la búsqueda',
    'pets.detail.lifecycle.confirmReunido.aria':  'Confirmar reencuentro',
    'pets.detail.lifecycle.confirmReunido.note':  'Qué buena noticia. Vamos a marcar esta mascota como reunida y la quitamos del mapa activo — el reporte queda guardado.',
    'pets.detail.lifecycle.confirmReunido.yes':   'Sí, se reunió',
    'pets.detail.lifecycle.confirmEncerrado.aria':'Confirmar cierre de la búsqueda',
    'pets.detail.lifecycle.confirmEncerrado.note':'Está bien cerrar cuando tú lo decidas. Vamos a quitar este reporte del mapa activo — queda guardado, y puedes reportar de nuevo si lo necesitas.',
    'pets.detail.lifecycle.confirmEncerrado.yes': 'Cerrar la búsqueda',
    'pets.detail.lifecycle.back':   'Volver',
    'pets.detail.lifecycle.saving': 'Guardando…',
    'pets.detail.lifecycle.done.reunido':  'Qué alegría — buen reencuentro. Esta mascota salió del mapa activo, y el reporte queda guardado.',
    'pets.detail.lifecycle.done.encerrado':'Búsqueda cerrada. Se la vio, se intentó — y está bien parar. El reporte queda guardado, y puedes volver cuando quieras.',
    'pets.detail.lifecycle.error':  'No se pudo guardar ahora. Puedes intentarlo de nuevo en un momento.',
    'pets.detail.lifecycle.retry':  'Reintentar',
    'pets.detail.flag.aria':     'Confirmar denuncia',
    'pets.detail.flag.btn':      'Denunciar este reporte',
    'pets.detail.flag.note':     '¿Algo parece estar mal en este reporte? Puedes señalarlo para revisión. Gracias por ayudar a mantener el mapa confiable.',
    'pets.detail.flag.yes':      'Sí, señalar',
    'pets.detail.flag.cancel':   'Cancelar',
    'pets.detail.flag.sending':  'Enviando tu señalización…',
    'pets.detail.flag.done':     'Recibimos tu señalización. La revisaremos con calma. Gracias por cuidar el mapa junto a nosotros.',
    'pets.detail.flag.error':    'No se pudo enviar la señalización ahora. Puedes intentarlo de nuevo en un momento.',
    'pets.detail.flag.retry':    'Reintentar',
    'pets.detail.close':         'Cerrar',
    'pets.detail.share':         'Compartir',
    'pets.detail.share.aria':    'Compartir esta mascota',
    'pets.detail.directions':    'Cómo llegar',
    // ── PetFilterBar ──
    'pets.filter.heading':       'Filtrar mascotas en el mapa',
    'pets.filter.clear':         'Limpiar filtros',
    'pets.filter.legend.status': 'Situación',
    'pets.filter.legend.species':'Especie',
    'pets.filter.legend.color':  'Color',
    'pets.filter.legend.size':   'Tamaño',
    'pets.filter.legend.recency':'Cuándo se reportó',
    'pets.filter.group.status':  'Filtrar por situación',
    'pets.filter.group.species': 'Filtrar por especie',
    'pets.filter.group.color':   'Filtrar por color',
    'pets.filter.group.size':    'Filtrar por tamaño',
    'pets.filter.group.recency': 'Filtrar por cuándo se reportó',
    'pets.filter.count.noneTotal': 'Aún no hay mascotas reportadas por aquí.',
    'pets.filter.count.noneMatch': 'Ninguna mascota coincide con esos filtros. Toca limpiar para ver todas.',
    // Botón inline de recuperación dentro del propio conteo cero (una sola unidad).
    'pets.filter.count.clearInline': 'limpiar filtros',
    'pets.filter.count.allOne':  '1 mascota en el mapa.',
    'pets.filter.count.all':     '{count} mascotas en el mapa.',
    'pets.filter.count.someOne': '1 mascota en el mapa (de {total}).',
    'pets.filter.count.some':    '{count} mascotas en el mapa (de {total}).',
    // ── PetListView ──
    'pets.list.aria':            'Lista de mascotas',
    'pets.list.empty':           'No hay mascotas para mostrar aquí ahora. Prueba a aflojar el filtro, o reporta una mascota que hayas visto.',
    // ── PetMapLoadStates ──
    'pets.loadstate.loading':    'Cargando las mascotas del mapa…',
    'pets.loadstate.empty.lead.pre': 'Aún no hay mascotas reportadas por aquí — sé la primera persona en ayudar.',
    'pets.loadstate.empty.point.pre': 'Toca en',
    'pets.loadstate.empty.point.cta': 'Reportar una mascota',
    'pets.loadstate.empty.point.post': ', justo abajo.',
    'pets.loadstate.error.lead': 'No se pudo cargar las mascotas ahora. Aún puedes reportar una — y puedes intentar cargar de nuevo.',
    'pets.loadstate.error.retry':'Reintentar',
    // ── PetPublishClosure ──
    'pets.closure.title':        'Tu mascota está en el mapa',
    'pets.closure.lead':         'Listo — cualquier persona cerca puede reconocerla. Nosotros nos encargamos desde aquí; no necesitas estar actualizando la pantalla.',
    'pets.closure.seeOnMap':     'Ver en el mapa',
    'pets.closure.dismiss':      'Cerrar',
    // ── PetFirstRunHint ──
    'pets.hint.aria':            'Cómo usar el mapa de mascotas',
    'pets.hint.text.pre':        'Toca en el mapa donde viste a la mascota, después toca en',
    'pets.hint.text.cta':        'Reportar una mascota',
    'pets.hint.dismiss':         'Entendido',
    // ── PetLegendControl ──
    'pets.legend.title':         'Qué quiere decir cada marcador',
    'pets.legend.close':         'Cerrar leyenda',
    'pets.legend.reopen':        'Mostrar leyenda',
    // ── PetSearchField ──
    'pets.search.label':         'Buscar dirección, barrio o ciudad',
    'pets.search.clear':         'Limpiar búsqueda',
    'pets.search.notFound':      'No se encontró ninguna dirección. Prueba con otra búsqueda.',
    // ── PetLocateControl ──
    'pets.locate.label':         'Cerca de mí',
    'pets.locate.title':         'Centrar el mapa en mi ubicación',
    'pets.locate.locating':      'Buscando tu ubicación…',
    'pets.locate.denied':        'No se pudo usar tu ubicación. Puedes buscar una dirección arriba.',
    'pets.locate.unsupported':   'Tu dispositivo no permite la ubicación ahora. Busca una dirección arriba.',
    // ── petShare ──
    'pets.share.lead.perdido':   'Mascota perdida',
    'pets.share.lead.encontrado':'Mascota encontrada',
    'pets.share.lead.avistado':  'Mascota avistada',
    'pets.share.lead.fallback':  'Mascota',
    'pets.share.area':           'cerca de {area}',
    'pets.share.invite':         'Míralo en el mapa y ayuda a reunir a esta mascota con su familia:',
    'pets.share.title':          'Mascota en MAPA FOME',
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
