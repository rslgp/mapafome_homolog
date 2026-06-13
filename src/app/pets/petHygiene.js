// petHygiene.js — PET-M3: higiene de ENTRADA do usuário (a barricada de ESCRITA).
// CAMADA-FOLHA pura, sem dependências de domínio de pet (usa só o global URL).
// Limpa texto livre (cap + strip de controle) e a URL de fotos (http/https only)
// ANTES de qualquer coisa entrar no blob `Dados` PÚBLICO. Consumido por petBlob
// (build/parse) e re-exportado pelo barrel petDomain.js — todo `import { X } from
// './petDomain'` segue casando.

// Sanitiza a URL de fotos (ex.: link de pasta do Google Drive). PURA: aceita
// SÓ http/https — qualquer outro esquema (javascript:, data:, ftp:, lixo) vira
// '' . É a barricada que protege o <a href> renderizado no PetDetailSheet de
// carregar um esquema perigoso, já que a URL vem de entrada livre do usuário.
// Roda igual no browser e no Node (URL é global em ambos).
export function sanitizePhotosUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  let parsed;
  try {
    parsed = new URL(v);
  } catch (_e) {
    return '';
  }
  return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? v : '';
}

// ─── PET-M3 — higiene de TEXTO LIVRE (sanitizer puro e determinístico) ───────
// SOT dos limites de comprimento de cada campo de texto livre que vai para o
// blob `Dados` PÚBLICO. Antes, name/color/detail entravam crus com só `|| ''`:
// um achador podia colar uma placa, um endereço exato, dados de terceiros ou
// caracteres de controle (que quebram o JSON renderizado / abrem espaço para
// truques de exibição). Estes limites espelham os maxLength dos inputs do
// PetReportSheet — manter os DOIS em sincronia é a regra; este módulo é a verdade
// que de fato BARRA no momento da montagem (o maxLength do input é só conforto de
// digitação e é contornável colando texto/automação).
export const PET_FREETEXT_MAXLEN = {
  name: 40,
  color: 40,
  detail: 140,
};

// Sanitiza UM campo de texto livre. PURA + DETERMINÍSTICA (sem Date.now()):
//   1. coage para string e apara as pontas;
//   2. REMOVE apenas caracteres de CONTROLE — C0 (\x00–\x1F: inclui \t \n \r),
//      DEL (\x7F) e C1 (\x80–\x9F). NUNCA toca em Unicode imprimível: acentos,
//      ç, ã, emoji e pontuação sobrevivem (a barricada é contra controle, não
//      contra idioma — corromper pt-BR seria um bug, não uma defesa);
//   3. colapsa espaços em branco repetidos (resíduo de uma quebra de linha
//      removida vira um espaço só, não cola duas palavras);
//   4. corta no limite do campo (cap de comprimento) e apara de novo.
// É a forcing-function que substitui o antigo caminho cru `valor || ''` — um
// teste fixa que controle some e que o acento permanece.
//
// Implementação Unicode-safe: itera por code points (spread de string) para não
// partir um par substituto (emoji) ao aplicar o cap; o filtro de controle usa um
// teste por code point, não um regex de classe \p (compat ampla de runtime).
export function sanitizeFreeText(raw, maxLen) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  const cap = Number.isFinite(maxLen) && maxLen > 0 ? maxLen : Infinity;
  const out = [];
  for (const ch of s) {
    const code = ch.codePointAt(0);
    // C0 + DEL + C1: faixas de controle. Tudo o mais (incl. acentos/ç/ã/emoji) passa.
    const isControl = code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    if (isControl) {
      out.push(' '); // vira espaço; o colapso abaixo limpa o excedente
    } else {
      out.push(ch);
    }
    if (out.length >= cap) break;
  }
  // Colapsa espaços repetidos (inclui os criados ao trocar controle por espaço)
  // e apara — entrada determinística → saída determinística.
  return out.join('').replace(/\s{2,}/g, ' ').trim();
}
