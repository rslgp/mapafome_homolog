// petShare.js — PET-M19: compartilhar um relato de pet (WhatsApp / native share).
//
// DUAS responsabilidades, separadas de propósito:
//   1. buildPetShareMessage — PURA + DETERMINÍSTICA: dado um pet (forma do
//      parsePetRow) + a URL-base do /pets, devolve { text, url } — a mensagem
//      calma pt-BR (status + espécie + área) e o deep-link M18 (?pet=<coordsKey>)
//      que faz o link cair EXATAMENTE no pet. SEM PII: nenhum contato, nome ou
//      texto-livre do relato entra na mensagem (o contato é revelado só no tap do
//      M3 no destino). Testável sem DOM/navigator.
//   2. sharePet — o ATUADOR de gesto: chama navigator.share quando existe, senão
//      abre o deep-link wa.me. CRÍTICO (PET-M19): tem de ser chamado
//      SÍNCRONAMENTE de dentro do handler do toque — NENHUM await antes dele, ou
//      o browser mobile descarta o gesto (perde a "user activation"). Por isso o
//      payload é montado pela fn PURA acima ANTES, e este atuador só dispara.
//
// Quem chama (PetDetailSheet) monta { text, url } síncrono e passa a sharePet
// no MESMO tick do clique. A Promise do navigator.share é IGNORADA aqui
// (cancelamento do usuário não é um erro) — nunca a aguardamos antes de abrir o
// fallback, e o fallback wa.me só roda quando navigator.share NEM EXISTE
// (feature-detect), nunca como catch-após-await (isso já seria fora do gesto).

import {
  PET_STATUS_MAP,
  PET_SPECIES,
  petCoordsKey,
  PET_DEEPLINK_PARAM,
} from './petDomain';

// Lookup espécie→entrada (id → { label, icon }) montado da SOT — nunca um literal
// de espécie hardcoded aqui (mesma disciplina do PetDetailSheet).
const SPECIES_MAP = PET_SPECIES.reduce((map, s) => { map[s.id] = s; return map; }, {});

// URL-base canônica do /pets (espelha o canonical do layout.js M17). Quem chama
// pode injetar outra base (ex.: a origin de runtime), mas o default é a verdade
// publicada para o link prévia sensato (PET-M17) mesmo se a origin de runtime
// vier estranha.
export const PETS_BASE_URL = 'https://mapafome.com.br/pets';

// Registro de tom por status (pt-BR calmo). NÃO reusa o label cru do PET_STATUS_MAP
// ('Perdido'/'Encontrado'/'Avistado') porque a mensagem precisa de uma frase
// inteira serena ("Pet perdido perto daqui"), não de um rótulo de chip. A SOT
// continua sendo o status id (validado abaixo); aqui só damos a moldura da frase.
const STATUS_LEAD = {
  perdido: 'Pet perdido',
  encontrado: 'Pet encontrado',
  avistado: 'Pet avistado',
};

// Precisão GROSSA da "área" no TEXTO (2 casas ≈ 1 km). Deliberadamente mais grossa
// que a chave do deep-link (6 casas, ~11 cm): o texto humano não deve estampar um
// ponto preciso (que poderia ser perto de uma casa) — quem quiser o ponto exato
// abre o link, que cai no pin via a chave M18. É uma referência de bairro/área,
// não um endereço. PURA.
const AREA_PRECISION = 2;

// Referência de ÁREA legível e PII-free a partir das coords (já públicas no mapa).
// Coarse (2 casas) de propósito (ver AREA_PRECISION). Devolve '' se as coords
// forem inválidas — a mensagem degrada para sem-área, nunca lança.
function describeArea(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return '';
  const lat = Number(coords[0]);
  const lng = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `${lat.toFixed(AREA_PRECISION)}, ${lng.toFixed(AREA_PRECISION)}`;
}

// Monta o deep-link M18 (?pet=<coordsKey>) sobre a URL-base. PURA. Devolve a
// URL-base sem param se as coords não derem uma chave estável (degrada calmo: o
// link ainda abre o /pets, só não foca um pet) — nunca lança.
function buildDeepLinkUrl(baseUrl, coords) {
  const base = String(baseUrl || PETS_BASE_URL);
  const key = petCoordsKey(coords);
  if (!key) return base;
  // Anexa o param respeitando uma query existente na base (defensivo). Não usamos
  // a classe URL aqui para manter a saída idêntica e previsível para o teste e
  // para um runtime sem URL absoluta — base já é uma URL https conhecida.
  const sep = base.indexOf('?') === -1 ? '?' : '&';
  return `${base}${sep}${PET_DEEPLINK_PARAM}=${encodeURIComponent(key)}`;
}

// Builder PURO da mensagem de compartilhamento. Recebe um pet (forma do
// parsePetRow) + a URL-base e devolve { text, url, title }:
//   • text  — a mensagem calma pt-BR (status + espécie + área), SEM o link colado
//             (o navigator.share recebe text E url separados; o wa.me concatena);
//   • url   — o deep-link M18 que faz o link cair NO pet;
//   • title — título curto para o native share sheet.
// SEM PII: contato/nome/detalhe do relato NÃO entram (o contato é revelado só no
// tap do M3 no destino — PET_CURVE §5). Defensiva: pet ausente/malformado ainda
// produz uma mensagem genérica + a URL-base (nunca lança).
export function buildPetShareMessage(pet, baseUrl = PETS_BASE_URL) {
  const p = pet || {};
  const lead = STATUS_LEAD[p.status] || 'Pet';
  const speciesMeta = SPECIES_MAP[p.species] || null;
  const speciesLabel = speciesMeta ? speciesMeta.label.toLowerCase() : null;
  const area = describeArea(p.coords);

  // Frase calma: "Pet perdido (cão) na área 8.05, 34.90." — só o que é público.
  let text = lead;
  if (speciesLabel) text += ` (${speciesLabel})`;
  if (area) {
    text += ` perto de ${area}`;
  }
  text += '.';
  // Convite sereno para o destino (sem urgência, sem "URGENTE!!!" — governador de
  // tom). O link em si vem em `url` (navigator.share) e é concatenado no fallback.
  text += ' Veja no mapa e ajude a reunir esse pet com a família:';

  const url = buildDeepLinkUrl(baseUrl, p.coords);
  const title = 'Pet no MAPA FOME';
  return { text, url, title };
}

// Monta o deep-link wa.me com a mensagem + URL já concatenadas (fallback quando
// navigator.share não existe). PURA. wa.me/?text= abre o seletor de conversa do
// WhatsApp com o texto pronto. encodeURIComponent escapa tudo (incl. a própria
// URL) — o WhatsApp re-detecta o link no texto e o torna clicável.
export function buildWhatsappShareUrl({ text, url }) {
  const body = `${text || ''}\n${url || ''}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

// ATUADOR de gesto (impuro — toca navigator/window). DEVE ser chamado
// SÍNCRONAMENTE de dentro do handler do toque (sem await antes). Recebe o payload
// JÁ MONTADO por buildPetShareMessage (a parte pura roda antes, fora do caminho
// sensível). Decide UMA vez, no tick do clique:
//   • navigator.share existe → dispara o share sheet nativo com {title,text,url}.
//     A Promise é IGNORADA de propósito (um cancelamento do usuário NÃO é erro e
//     NÃO deve cair no fallback — abrir o wa.me depois de o usuário cancelar seria
//     hostil; além disso, qualquer ação pós-await já estaria fora do gesto).
//   • senão → abre o deep-link wa.me numa nova aba (window.open), SÍNCRONO.
// Devolve 'share' | 'whatsapp' | 'none' para o teste afirmar qual caminho rodou,
// sem efeito colateral observável a mais. Defensiva: sem navigator E sem window
// (SSR/Node) → 'none' (nunca lança).
//
// `opener` é injetável só para teste (default window.open); em produção é window.
export function sharePet(payload, opener) {
  const data = payload || {};
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  // Feature-detect SÍNCRONO: a existência de navigator.share decide o caminho ANTES
  // de qualquer await — o fallback wa.me NUNCA é um catch pós-await (isso já estaria
  // fora do gesto e seria descartado no mobile).
  if (nav && typeof nav.share === 'function') {
    // Dispara e ESQUECE: não aguardamos (manteria o gesto, mas não precisamos do
    // resultado; um .catch silencioso evita um unhandled-rejection se o usuário
    // cancelar). A chamada em si já aconteceu no tick do clique — é o que importa.
    try {
      const ret = nav.share({ title: data.title, text: data.text, url: data.url });
      if (ret && typeof ret.then === 'function') ret.then(undefined, () => {});
    } catch (_e) {
      // Alguns browsers lançam síncronos (ex.: share inválido); degrada para wa.me
      // AINDA NO MESMO TICK (sem await), então o gesto continua válido.
      const open = opener || (typeof window !== 'undefined' ? window.open : null);
      if (open) open(buildWhatsappShareUrl(data), '_blank', 'noopener,noreferrer');
      return 'whatsapp';
    }
    return 'share';
  }
  const open = opener || (typeof window !== 'undefined' ? window.open.bind(window) : null);
  if (open) {
    open(buildWhatsappShareUrl(data), '_blank', 'noopener,noreferrer');
    return 'whatsapp';
  }
  return 'none';
}
