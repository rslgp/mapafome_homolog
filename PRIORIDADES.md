# PRIORIDADES DE EXECUCAO — MAPA FOME

Ordem recomendada pra IMPLEMENTAR o backlog `MILESTONES_EXTENDED.yaml`
(163 itens / 84 areas / 12 passes de gap-scan). Gerado em 2026-07-09.

**Criterio de ordenacao:** severidade primeiro (S+ > S > S-), depois puxa pra
frente o que e BARATO + TESTAVEL + SEM human-gate + SEM dep aberta. Cada item
so vira `shipped` com o gate verde lido (`lint / test / fitness / build /
smoke200`). Trabalhar de cima pra baixo; parar se a qualidade cair.

**Escopo desta lista:** so os COMMITAVEIS (pending, sem `human_gate`). Os 24
human-gated ficam num bloco separado no fim — vao pro humano JUNTOS, nao um a
um.

---

## ONDA 1 — S+ / S commitaveis (fazer primeiro, alto impacto, sem gate humano)

Cinco itens. Os dois primeiros sao fixes pequenos e cirurgicos de alto retorno.

| # | id | tier | o que | por que primeiro | custo |
|---|---|---|---|---|---|
| 1 | **EXT-DBLSUBMIT-01** | S+ | Desabilitar o botao de publicar fome durante o publish + guard de re-entrada em `handleClickMap` | Double-tap grava 2 pontos identicos, poluindo o mapa e TODA contagem/relatorio. Fix pequeno (`MainControls.js:325` ramo `{false ?}` morto + `App.js:471`). O unico S+ commitavel. | baixo |
| 2 | **EXT-GEOLOC-01** | S | Guard `if (navigator.geolocation)` antes do `getCurrentPosition` e garantir `runMain` no fallback | Webview sem geolocation (`appLifecycle.js:132`) estoura o mount e o mapa NUNCA carrega pin. O `/pets` ja tem o guard — copiar. | baixo |
| 3 | **EXT-PWA2-01** | S | Try/catch em torno do IndexedDB da fila offline (fome + pets) | Safari private mode faz `throw` ao abrir IndexedDB — a fila offline inteira quebra pro usuario iOS. | medio |
| 4 | **EXT-OWNERSHIP-01** (parte client) | S | Mint do token `petReport:<id>` no publish (o enforcement real fica pro SEC-01 human-gated) | Posse de pin hoje e 100% nocional. A parte CLIENT (escrever o token) e commitavel; so o enforcement server depende do proxy. | medio |

> Nota: EXT-OWNERSHIP-01 tem uma metade human-gated (enforcement). Fazer so a
> metade client (mint do token) — deixar o resto no bloco humano.

---

## ONDA 2 — S- de custo baixo e alto valor (quick wins)

Puxados pra frente por serem baratos, testaveis e de risco real. Seguranca e
integridade de dinheiro/dados primeiro.

| # | id | tier | o que | por que |
|---|---|---|---|---|
| 5 | **EXT-CSV-01** | S- | `csvEsc()` escapar formula-injection (`=`,`+`,`-`,`@` no inicio de celula) | CWE-1236: um export de relatorio abre no Excel e executa formula. Fix de 1 funcao. |
| 6 | **EXT-FORM-01** | S- | Validar telefone do doador em `/assinar` (digito minimo; `undefined` passa hoje) | Path de dinheiro real; doacao com telefone invalido/vazio quebra o contato. Barato. |
| 7 | **EXT-REP2-01** | S | k-anonimizacao (k=5) faltando em 2 tabelas do relatorio publico | Viola a POLITICA declarada da propria pagina; re-identificacao de PII. (Era o top do COMECE AQUI ate o pass 12.) |
| 8 | **EXT-SEC-04** | S- | Rate-limit no `create-subscription` do asaas-backend (hoje so dedupe email+rail) | Sem throttle real = burst de assinaturas. Path de dinheiro. |
| 9 | **EXT-TIMEOUT-01** | S- | AbortController + timeout nos fetches de doacao Asaas | Backend que aceita mas nao responde trava o spinner do doador pra sempre = doacao perdida em silencio. |
| 10 | **EXT-EH-05** | S- | `endereco.js`: nao gravar a linha quando o geocode falha | Hoje grava sem `Coordinates`, silenciosamente — polui o Sheet com linhas sem geo. |

---

## ONDA 3 — S- a11y + i18n do "ultimo metro" (alcance internacional/inclusao)

Todos hardcoded pt-BR ou barreiras de AT que derrotam o trabalho de 12 locales
e a11y ja feito. Agrupar porque muitos compartilham o padrao (mover string pra
`t()` nos 12 locales via `agent_translation-localization`).

| # | id | tier | o que |
|---|---|---|---|
| 11 | **EXT-ARIALIVE-01** | S- | Anuncio aria-live do mapa (`LiveAnnouncer.js:34`) → `t()` nos 12 locales |
| 12 | **EXT-A11Y-01 / EXT-FOCUSTRAP-01** | S- | Focus trap real nos sheets/dialogs (Tab escapa do modal escondido) — 2 ids do mesmo tema, fazer juntos |
| 13 | **EXT-I18N-03** | S- | Toast de update do SW (`swRegister.js`) hardcoded pt-BR → `t()` |
| 14 | **EXT-I18N-04** | S- | 4 mensagens de erro de pagamento (`asaasSubscriptionClient.js`) hardcoded pt-BR → `t()` |
| 15 | **EXT-SHARELOC-01** | S- | Texto do share WhatsApp (`InfoPanel.js:37`) hardcoded pt-BR + `encodeURIComponent` |
| 16 | **EXT-CURRENCY-01 / -02** | S- | `R$` hardcoded em `/assinar` + CPF/CNPJ incondicional — fazer o par junto |
| 17 | **EXT-HREFLANG-01** | S- | `hreflang`/`alternates.languages` (zero hoje apesar de 12 locales) |

---

## ONDA 4 — S- de corretude / infra / performance do mapa

| # | id | tier | o que |
|---|---|---|---|
| 18 | **EXT-MAP-01 / -02** | S- | `chunkedLoading` no cluster + parar de remontar TODOS os clusters a cada 60s (key muda por minuto) — par de performance |
| 19 | **EXT-TIMEOUT-02** | A | (puxado junto do -01) `withTimeout` no path de LEITURA do Sheet (`loadInfo`/`getRows`) |
| 20 | **EXT-LEGEND-01** | S- | `ColorsHint` descreve o sistema de cores ANTIGO — o hint MENTE sobre o que os pins significam (corrigir o texto; a mensagem final e decisao de produto) |
| 21 | **EXT-SHEETDB-01 / EXT-READLIMIT-01** | S- | Handling de 429 do Google Sheets (escrita) + throttle advisory na leitura — par de resiliencia do "banco" |
| 22 | **EXT-EH-02** | S- | `error.js` / `global-error.js` (App Router) pras 3 rotas principais (conecta com EXT-ERRBOUND-01 do pass 11) |
| 23 | **EXT-ERRUX-01** | S- | `/relatorios` e `/relatorio-marketing` vazam `e.message` cru pro usuario nao-tecnico |
| 24 | **EXT-REPRO-01** | S- | Matar `bun.lock` divergente + `engines`/`.nvmrc` (reprodutibilidade de build) |
| 25 | **EXT-TZ-01 / EXT-REP2-03** | S- | Timezone: expiry de sponsor no fuso do visitante + bucketing de sazonalidade timezone-naive — par de fuso |

---

## ONDA 5 — testes diretos + o restante dos S- (higiene, cobertura)

Cobertura direta das unidades de risco que so sao testadas indiretamente, +
os S- remanescentes (EXT-T-01/03/04, EXT-PET2-01, EXT-GEO-01, EXT-MOBILE-01,
EXT-DEP-01, EXT-FORM-04, EXT-INIT3-01, EXT-DOC-01, EXT-RACE-02, EXT-TAB-01,
EXT-ENVPAR-01, EXT-URLSTATE-02, EXT-EMBED3P-01, EXT-ANTIABUSE-01, EXT-IOSPWA-01,
EXT-SWNAV-01, EXT-ASAAS2-02, EXT-PWA2-02, EXT-SEC-04...). Pegar por proximidade
de arquivo pra amortizar contexto (ex.: todos os testes de `/pets` juntos).

Depois: os A+ e A commitaveis (polimento/DX) — so quando os S/S- acabarem.

---

## BLOCO HUMANO — levar JUNTOS, nao um a um (24 human-gated)

Uma conversa de arquitetura resolve o nucleo de quase todo o risco de abuso:

- **Nucleo de arquitetura (mesma conversa):** `SEC-01` (chave Google no bundle
  → proxy de escrita) + `EXT-RACE-01` (CAS/locking no `row.save()`) +
  `EXT-DI-01` + `EXT-OWNERSHIP-01` (enforcement). Claude PROPOE o desenho, o
  humano provisiona o segredo.
- **Bump com risco de build (humano confirma o numero):** `EXT-SEC-01` (next
  16.2.4 com 2 CVEs HIGH), `EXT-SEC-02/03`, `EXT-DEP-01`.
- **Decisoes de PRODUTO:** `EXT-IPA-01` (canal iOS sideload), `EXT-TILES2-01`
  (provedor de tiles), `EXT-NOTIF-01` (entregar ou desligar notificacoes),
  `EXT-CRYPTO-01`, `EXT-LEGEND-01` (a MENSAGEM final; o fix do texto e
  commitavel), `EXT-SWRCACHE-01`/`EXT-SAVEDATA-01` (estrategia de degradacao),
  `EXT-DSAR-01`/`EXT-PRIV-01` (politica LGPD).

---

## REGRAS DO LOOP (nao esquecer)

1. `shipped` SO com gate verde LIDO neste turno (nunca por vibe).
2. Commit por `agent_git-commit-specialist`, staging por path explicito, nunca
   `git add -A`. Sem push/PR/bump sem pedido humano.
3. Working tree hoje esta ENTRELACADO com sessoes concorrentes (`App.js`,
   `sponsors.js`, `strings.page.js`, `sw.js`, etc.) — re-baseline antes de todo
   commit, estagiar SO os arquivos do proprio item.
4. Codigo real de correcao → `agent_principalengineer`. Esta lista so ORDENA.
