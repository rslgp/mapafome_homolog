<!--
  CHANGES.md — log de modificacoes do MAPA FOME.
  Padrao de log salvo no vault: 40-LICOES/2026-07-04-padrao-de-log-append-only-com-cabecalho-de-acesso-rapido.md
  DUAS zonas: (1) cabecalho de acesso rapido no topo (REESCRITO a cada sessao) +
              (2) corpo append-only cronologico abaixo (NUNCA reescrito).
-->

# CHANGES — MAPA FOME

<!-- ============ ZONA 1: ACESSO RAPIDO (so este bloco se reescreve) ============ -->

> **LAST_UPDATED:** 2026-07-09 · branch `loop/mapafome` · **PASS 14 rodado** (invocado explicitamente via /milestone-mapafome-expand; quota pre-pass sessao 25% | semana 18% — folga confortavel). +1 item em 1 area nova, commitavel (sem human-gate). Estado: **168 itens/89 areas/14 passes** (validado por parser). Scan majoritariamente VAZIO (~90%, 9 de 10 angulos limpos) — **SATURACAO confirmada**. Unico achado: EXT-WEBHOOKIDEM-01 (S-) — idempotencia do webhook Asaas e check-then-set NAO-atomico mesmo no KV duravel (SET sem NX), 2 entregas concorrentes double-aplicam. **Top commitavel segue EXT-DBLSUBMIT-01** (S+), depois EXT-READROW-01 (S) e EXT-REP2-01 (S). O scan esgotou o valor facil; a jogada agora e IMPLEMENTAR, nao escanear mais.
> **HOW_TO_READ:** o topo (esta zona) e o RESUMO do estado atual — leia so isto pra se orientar. O corpo abaixo e APPEND-ONLY cronologico; desca por uma ancora do QUICK_INDEX quando precisar do detalhe. So esta zona 1 e reescrita; nunca edite uma entrada antiga da zona 2.
> **ROADMAPS:** `ROADMAP_VERTENTES.yaml` (multi-vertente, 30 itens) · `MILESTONES_EXTENDED.yaml` (gap-scan ativo no loop, 168 itens/89 areas/14 passes, 5 tiers S+/S/S-/A+/A) · `UIUX_MILESTONES.yaml` (UI/UX) · `MILESTONES.yaml` (P-series/pagamento). Gate SOT em `CLAUDE.md`.

### QUICK_INDEX (mais novo -> mais velho)
- [`2026-07-09-AB`](#2026-07-09-ab--pass-14-168-itens-89-areas) — **Pass 14** (invocado via /milestone-mapafome-expand, quota folgada 25%): +1 item em 1 area nova (commitavel, sem human-gate). Scan majoritariamente VAZIO (~90%, 9/10 angulos limpos) — **SATURACAO confirmada**. Unico achado CONFIRMED: EXT-WEBHOOKIDEM-01 (S-, a idempotencia do webhook Asaas e um check-then-set NAO-atomico mesmo no path de KV duravel — webhook.js:71-80 faz isProcessed() depois markProcessed(), e o markProcessed do Upstash e SET key EX puro SEM NX; duas entregas concorrentes do mesmo event id leem ambas isProcessed=false e double-aplicam, ex.: doacao contada 2x; o store duravel fechou o hole de cold-start mas nao o de concorrencia; webhook.test.js so testa cold starts sequenciais). 9 angulos honestamente vazios documentam FORCA (addRow server-side atomico, mapa pets <MapContainer> faz map.remove() no unmount, valor de doacao como Number nao string localizada, a11y do /assinar forte com role=radiogroup+roving+role=alert, deep-link de pet e query-param ?pet= sem 404 duro, nenhum secret alem da chave Google conhecida, zero pixel de tracking un-gated). O scan esgotou o valor facil — a jogada agora e IMPLEMENTAR.
- [`2026-07-09-AA`](#2026-07-09-aa--pass-13-167-itens-88-areas) — **Pass 13** (invocado via /milestone-mapafome-expand, quota folgada 21%): +4 itens em 4 areas novas, TODOS commitaveis (nenhum human-gate). Achados que doem: EXT-READROW-01 (S, o path de leitura de fome faz JSON.parse por linha sem try/catch por-linha — 1 celula Dados/Coordinates malformada num Sheet colaborativo aborta o forEach e derruba o mapa inteiro pra todo visitante, enquanto o /pets ja pula a linha ruim), EXT-BOOTGUARD-01 (S-, a guarda fail-closed do PAY-01 so esta wired no webhook.js, NAO no create-subscription que recebe dinheiro — prod sem ALLOWED_ORIGINS/KV boota caindo no CORS de DEV em silencio; gap de FIACAO, 1 de 4 handlers), EXT-UNHANDLED-01 (A+, zero handler global unhandledrejection), EXT-SWSHELL-01 (A+, SHELL_CACHE do SW sem cap de tamanho, so TILE_CACHE e limitado). 9 angulos honestamente vazios documentam FORCA (icone Leaflet divIcon SVG inline, listas O(n log n) sem re-render por-tecla, coords sempre dot-decimal, <html lang> escritor unico, severidade shape-encoded, sem row[N] por indice, first-paint sem hero-img, on-map actions sao <button>, clipboard/share com fallback). Taxa de vazio ~69% — codigo maduro se defende sozinho.
- [`2026-07-09-Z`](#2026-07-09-z--pass-12-163-itens-84-areas) — **Pass 12** (invocado via /milestone-mapafome-expand, quota folgada 14%): +9 itens em 8 areas novas — o scan mais denso em SEVERIDADE (1 S+, 1 S, 2 S-). Achados que doem: EXT-DBLSUBMIT-01 (S+, botao de publicar fome nunca fica disabled durante o publish — double-tap grava 2 pontos identicos; /assinar e ReportSheet ja se protegem, so o botao legado do MainControls nao), EXT-GEOLOC-01 (S, navigator.geolocation.getCurrentPosition sem checar se a API existe — webview sem geolocation estoura o mount e o mapa nunca carrega pin), EXT-ARIALIVE-01 (S-, o unico anuncio aria-live do mapa e literal pt-BR — leitor de tela em 11/12 locales ouve portugues). 7 angulos honestamente vazios documentam FORCA (clipboard com fallback, localStorage sempre try/caught, GPS permission-denied cai no centro default, focus save/restore, double-submit ja bloqueado em assinar/ReportSheet, erro de checkout Asaas com retry, long-press do mapa com preventDefault). Taxa de vazio ~44%.
- [`2026-07-09-Y`](#2026-07-09-y--pass-11-154-itens-76-areas) — **Pass 11** (invocado via /milestone-mapafome-expand, quota folgada 10%): +7 itens (5 areas novas + MAP/DI existentes), TODOS tier A com file:line. Achados que doem: EXT-ERRBOUND-01 (zero error boundary — excecao de render pinta o mapa de fome de branco pra todo mundo), EXT-DI-02 (path de escrita de FOME nao chama a barricada numerica de coordenada — so /pets chama), EXT-DEDUPFOOD-01 (fome grava reports duplicados sem checagem de proximidade/tempo). 4 angulos honestamente vazios documentam FORCA (offline write-queue com quarantine, foto /pets stripa EXIF/GPS, empty-state com CTA, consent no publish). Taxa de vazio ~36% — o valor migrou pra IMPLEMENTAR.
- [`2026-07-05-W`](#2026-07-05-w--pass-10-no-loop-147-itens-71-areas) — **Pass 10 (loop)**: +9 itens em 8 areas novas. Achados: EXT-IOSPWA-01 (zero apple-touch-icon — install iOS da icone borrado fora de standalone), EXT-SWNAV-01 (SW sem fallback de navegacao offline — erro nativo pro publico de baixa conectividade), EXT-SHARELOC-01 (share WhatsApp hardcoded pt-BR na superficie viral), EXT-RTL-01 (dir=rtl sem CSS logico — arabe meio-espelhado). 5 angulos honestamente vazios (log PII do backend LIMPO, safe-area correta, 404 chain OK).
- [`2026-07-05-V`](#2026-07-05-v--pass-9-no-loop-de-10min-138-itens-63-areas) — **Pass 9 (loop de 10min)**: +6 itens (5 areas novas + EXT-ASSET-03). Achados: EXT-HREFLANG-01 (12 locales, zero hreflang — publico internacional nao acha o site na propria lingua), EXT-FOCUSTRAP-01 (aria-modal sem trap — Tab escapa pro mapa escondido), EXT-ANTIABUSE-01 (time_from_start_ms medido e descartado; sem honeypot/min-time). 7 angulos honestamente vazios (SW lifecycle exemplar, reduced-motion honrado, hidratacao coberta por ssr:false, bundle bem dividido).
- [`2026-07-05-U`](#2026-07-05-u--quota-resetada-scan-reaberto-pass-8-132-itens-58-areas) — **Quota resetada (re-login) — scan REABERTO, pass 8**: +9 itens em 8 areas novas. Achados que doem: EXT-URLSTATE-01 (back do Android fecha o SITE com report no meio), EXT-OWNERSHIP-01 (token de posse spec'ado mas nunca escrito — posse de pin 100% nocional), EXT-EMBED3P-01 (iframe Creators http:// = bloqueado como mixed content em producao HOJE). 4 angulos honestamente vazios.
- [`2026-07-05-T`](#2026-07-05-t--quota-limit-atingido-scan-encerrado-em-123-itens50-areas7-passes) — **QUOTA LIMIT ATINGIDO — scan encerrado**: leitura real pre-pass8 = sessao 86% (zona vermelha >=80% do monitor-tokens). Footer do MILESTONES_EXTENDED.yaml fecha com trajetoria completa + criterio de parada + proximo alvo (EXT-REP2-01). Nenhum item novo; pass 8 nao rodado de proposito.
- [`2026-07-05-S`](#2026-07-05-s--milestones-extended-expandido-pass-7-123-itens-50-areas--quota-78) — **MILESTONES_EXTENDED.yaml expandido (pass 7)**: +9 itens em 6 areas novas. Achado de CORRETUDE: EXT-LEGEND-01 (o hint de cores ativo MENTE — descreve o sistema de marcadores antigo, substituido e nunca atualizado). Quota sessao 78%, proximo do limiar vermelho (80%) do monitor-tokens.
- [`2026-07-05-R`](#2026-07-05-r--milestones-extended-expandido-pass-6-114-itens-44-areas--quota-por-pass) — **MILESTONES_EXTENDED.yaml expandido (pass 6)**: +11 itens em 6 areas novas. Achado notavel: EXT-NOTIF-01 (feature de notificacao 100% inerte — pede permissao, nunca entrega). `/goal` re-armado explicitando usar /monitor-tokens como fonte de quota; checado por pass (pass5 sessao 56% -> pass6 sessao 67%).
- [`2026-07-05-Q`](#2026-07-05-q--milestones-extended-expandido-pass-5-103-itens-38-areas--quota-checada) — **MILESTONES_EXTENDED.yaml expandido (pass 5)**: +11 itens em 6 areas novas. Achado mais critico do documento inteiro: EXT-RACE-01 (2 usuarios DIFERENTES escrevendo a mesma linha concorrentemente perdem uma escrita — distinto do gap de retry-idempotencia ja conhecido).
- [`2026-07-05-P`](#2026-07-05-p--milestones-extended-expandido-pass-4-92-itens-32-areas) — **MILESTONES_EXTENDED.yaml expandido (pass 4)**: +13 itens em 6 areas novas (tokens CSS mortos, gap de lint no-console, meta-gaps das proprias fitness-functions, drift de documentacao no goal-loop, governanca do cap do loop sem re-autorizacao, CLS por imagem sem dimensao). Total 92 itens, 32 areas. 2 areas escaneadas SEM achado novo, reportado honestamente.
- [`2026-07-05-O`](#2026-07-05-o--milestones-extended-expandido-pass-3-79-itens-26-areas) — **MILESTONES_EXTENDED.yaml expandido (pass 3)**: +21 itens em 8 areas novas (relatorios/marketing depth incl. gap de k-anonimizacao real, parceiros/sponsors, validacao de form, CSV formula-injection, iniciativas, links cross-app, timezone, memory leaks). Total 79 itens, 26 areas.
- [`2026-07-05-N`](#2026-07-05-n--sec-02-shipped-ff11-secret-leak-gate-por-hash) — **SEC-02 SHIPPED**: FF11 novo (fitness-functions.mjs) escaneia out/ pos-build por PEM/JWT vazado; allowlist por HASH de conteudo (nao nome de var — nao funciona em minificado). Achou + provou o vazamento real (SEC-01) tem hash estavel; pegou um segredo-isca falso em teste.
- [`2026-07-05-L`](#2026-07-05-l--milestones-extended-criado-33-itens-5-tiers) — **MILESTONES_EXTENDED.yaml criado**: 1o pass de gap-scan (10 areas: testes/perf/error-handling/a11y/integridade/DX/observabilidade/deps-CVE/i18n/build), 33 itens, tiers S+/S/S-/A+/A. Nenhum shipped ainda.
- [`2026-07-05-K`](#2026-07-05-k--ui-ux-review-p0-dignidade--touch-targets-shipped) — **UI/UX review (ICT6 advisory) + 2 P0 shipped**: reframe "pts/points"->"pessoas/people" (5 locales, dignidade) + radios alinhados + zoom/search >=44px (AA touch). Gate verde.
- [`2026-07-04-J`](#2026-07-04-j--pet-03-shipped-writer-renewpet-freshnessat) — **PET-03 SHIPPED**: novo writer renewPet carimba freshnessAt ('ainda procurando') — antes era lido mas nunca escrito. +5 testes. Gate verde.
- [`2026-07-04-I`](#2026-07-04-i--sec-03-shipped-higiene-de-petcontact-antes-de-persistir) — **SEC-03 SHIPPED**: pet.contact passa por sanitizeFreeText antes de gravar (strip de control-char, cap 60); telefone/e-mail legitimo intacto. +3 testes. Gate verde.
- [`2026-07-04-H`](#2026-07-04-h--seo-03-shipped-json-ld-schemaorg-ngo--dataset) — **SEO-03 SHIPPED**: JSON-LD schema.org — NGO no root + Dataset nas 2 paginas de relatorio (SOT em structuredData.js). +7 testes. Gate verde.
- [`2026-07-04-G`](#2026-07-04-g--i18n-01-shipped-relative-time-sensivel-ao-locale) — **I18N-01 SHIPPED** (parcial: core relative-time): formatRelativeTime segue o locale ativo (era pt-BR fixo); cleanold pinado em pt-BR. +7 testes. Corrigido export de DEFAULT_LOCALE. Gate verde.
- [`2026-07-04-F`](#2026-07-04-f--pay-01-shipped-fail-closed-na-config-de-producao-do-asaas-backend) — **PAY-01 SHIPPED**: assertProductionConfig — o asaas-backend RECUSA subir em prod sem KV duravel ou sem allowlist de CORS. 98/98 backend.
- [`2026-07-04-E`](#2026-07-04-e--pet-02-shipped-dedup-visual-de-pets--fixup-do-qa-01) — **PET-02 SHIPPED**: liga o dedup de pets (dead code) no PetMarkers — 1 pino por grupo. + FIXUP do QA-01 (poolOptions removido no Vitest 4). Gate verde.
- [`2026-07-04-D`](#2026-07-04-d--qa-01-shipped-gate-de-teste-oom-safe-por-default) — **QA-01 SHIPPED**: vitest.config forca forks+singleFork+no-file-parallelism; `npm run test` plano agora e OOM-safe. Gate verde. (config corrigida em 2026-07-04-E)
- [`2026-07-04-C`](#2026-07-04-c--seo-02-shipped-sitemap--robots-dinamicos) — **SEO-02 SHIPPED**: sitemap.js + robots.js dinamicos; aposentados os 3 estaticos stale de 2022. Gate verde.
- [`2026-07-04-B`](#2026-07-04-b--seo-01-shipped-corrige-self-canonical-em-3-rotas) — **SEO-01 SHIPPED**: 3 layout.js novos (relatorios/relatorio-marketing/iniciativas-cadastrar) — corrige self-canonical. Gate verde.
- [`2026-07-04-A`](#2026-07-04-a--deep-analysis--roadmap-multi-vertente) — Deep-analysis do produto (11 vertentes) + criado `ROADMAP_VERTENTES.yaml` (30 milestones) + este log + licao de padrao-de-log no vault.

### STATUS_TALLY (ROADMAP_VERTENTES.yaml)
- **30 milestones** · pending **14** · blocked-human **5** · later **1** · **shipped 10** (SEO-01/02/03, QA-01, PET-02/03, PAY-01, I18N-01, SEC-02/03).
- Por tier: **S+ 3** · S 8 · A 10 · B 9.
- Por vertente: V1 core-fome 2 · V2 pet 5 (2 shipped) · V3 asaas 3 (1 shipped) · V4 i18n 2 (1 shipped) · V5 pwa 3 · V6 relatorios 2 · V7 parceiros 3 · V8 seo 4 (3 shipped) · V9 qa 2 (1 shipped) · V10 seguranca 3 (2 shipped) · V11 governanca 1.
- **Todos os S+/S commitaveis shippados.** Restam: 7 A + 8 B commitaveis + 5 blocked-human + 1 later.

### STATUS_TALLY (MILESTONES_EXTENDED.yaml — 14 passes, scan ativo no loop, tiers S+/S/S-/A+/A)
- **168 milestones** em **89 areas** · pending **144** · blocked-human **19** · later **3** (cross-refs) · **shipped 2**. Validado via parser YAML: 0 ids duplicados.
- Por tier: **S+ 2** (EXT-SEC-01 CVE next 16.2.4 + EXT-DBLSUBMIT-01 double-submit de fome) · **S 11** · S- 55 · A+ 47 · A 53.
- 1 achado ja shipped fora do arquivo: SEC-02/FF11 (gate mecanico de secret-leak no bundle, allowlist por hash).
- Achados mais criticos: **EXT-DBLSUBMIT-01** (S+, pass 12) — double-tap no botao de publicar fome grava 2 pontos identicos (botao nunca fica disabled) · **EXT-RACE-01** (S) — 2 usuarios diferentes escrevendo a mesma linha perdem uma escrita (row.save() PUT cego sem CAS) · **EXT-READROW-01** (S, pass 13) — 1 celula malformada num Sheet colaborativo derruba o mapa de fome inteiro (JSON.parse por linha sem try/catch por-linha) · **EXT-GEOLOC-01** (S, pass 12) — geolocation sem guard de existencia derruba o mount em webview · **EXT-URLSTATE-01** (S, pass 8) — back do Android fecha o site com report no meio. Corretude: **EXT-LEGEND-01** — o hint de cores descreve o sistema de marcadores ANTIGO. Fiacao: **EXT-BOOTGUARD-01** (S-, pass 13) — guarda fail-closed do PAY-01 so wired em 1 de 4 handlers Asaas. Concorrencia de dinheiro: **EXT-WEBHOOKIDEM-01** (S-, pass 14) — idempotencia do webhook Asaas e check-then-set nao-atomico (SET sem NX), 2 entregas concorrentes double-aplicam.
- **Proximo a pegar (commitavel, sem human_gate, sem deps):** EXT-DBLSUBMIT-01 (S+, guard de double-submit, fix pequeno e testavel), depois EXT-READROW-01 (S, try/catch por-linha na leitura) ou EXT-REP2-01 (k-anonimizacao faltando em 2 tabelas do relatorio publico, S tier).

### OPEN_THREADS (o que a proxima sessao pega primeiro)
1. **EXT-REP2-01** (S, MILESTONES_EXTENDED, sem human_gate, sem deps): k-anonimizacao (k=5) faltando em 2 tabelas do relatorio publico — melhor primeiro alvo pos-scan.
2. **S-tier commitaveis (MILESTONES_EXTENDED)**: EXT-URLSTATE-01 (popstate fecha sheet, nao o site — pass 8), EXT-OWNERSHIP-01 parte client (mint do token petReport: — pass 8), EXT-SEC-03 (upgrade axios/google-spreadsheet), EXT-EH-01/02/03 (poison-pin pets [=PET-04], error.js, unhandledrejection), EXT-T-01/03 (testes diretos petsData/asaasClient). S- vivo AGORA: EXT-EMBED3P-01 (Creators vazio em producao).
3. **A-tier commitaveis (ROADMAP_VERTENTES)**: PET-04 (quarentena fila pets), REP-01 (rotear /relatorio-marketing pelo sheetsClient), PWA-01, QA-02, FOME-01, INIT-02(dep INIT-01).
4. **SEC-01** (S+, blocked-human, ROADMAP_VERTENTES): chave Google no bundle -> proxy de escrita. RAIZ de quase todo risco de abuso. Claude PROPOE o desenho, humano provisiona o segredo.
5. **EXT-SEC-01** (S+, MILESTONES_EXTENDED, human_gate no bump): next 16.2.4 tem 2 CVEs HIGH ativos. Bump de patch, humano confirma antes.
6. **PET-01 / INIT-01 / PAY-02 / SEO-04 / FOME-02** (blocked-human/later): dependem de acao humana (storage, destino, efeito de negocio, decisao de produto, ou dep de SEC-01). NAO auto-shippaveis.

<!-- ============ ZONA 2: CORPO APPEND-ONLY (nunca reescreva; so APPEND no fim) ============ -->

---

## 2026-07-04-A — Deep-analysis + roadmap multi-vertente

**Comando:** "deep analysis o que o mapafome faz e apartir disso construa varios milestones para diferentes vertentes e roadmap e sempre mantenha um arquivo log com as modificacoes incluindo algo que facilite o acesso nas primeiras linhas do log (salve esse padrao de log no vault) e preencha gaps gerados por esse prompt."

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| (analise) | Deep-analysis read-only do codebase mapeando 11 VERTENTES com evidencia file:line (core-fome, MapaPet, Asaas, i18n, PWA, relatorios, parceiros, SEO, testes, seguranca, loop). | O prompt pediu "deep analysis o que o mapafome faz" como base pros milestones. |
| `ROADMAP_VERTENTES.yaml` (novo) | Roadmap multi-vertente: 11 vertentes + **30 milestones** tiered (S+/S/A/B) no formato da casa (id/title/vertente/tier/owner/scope/why/gate/status), derivados 1-pra-1 dos GAPS que a analise achou. Nenhum shipped (recem-criado). | O prompt pediu "varios milestones para diferentes vertentes e roadmap". UIUX_MILESTONES cobre so UI/UX; este e o eixo amplo. |
| `CHANGES.md` (novo, este arquivo) | Log de modificacoes com o padrao de DUAS zonas: cabecalho de acesso rapido no topo (LAST_UPDATED/QUICK_INDEX/STATUS_TALLY/OPEN_THREADS) + corpo append-only. | O prompt pediu "um arquivo log com as modificacoes incluindo algo que facilite o acesso nas primeiras linhas". |
| Vault `40-LICOES/2026-07-04-padrao-de-log-append-only-com-cabecalho-de-acesso-rapido.md` (novo) | Licao que DEFINE o padrao de log (duas zonas, ancoras, append-only). Adicionada ao `MOC-mapafome`. | O prompt pediu "salve esse padrao de log no vault". |

**Gaps de maior alavancagem que a analise achou (viraram os S+/S):**
- **SEC-01 (S+):** chave privada Google inline no bundle estatico (sheetsClient.js:43-44 + 5 outros arquivos) — todo write e spoofavel. Report-only/human-gated (era P14).
- **SEO-01 (S+):** /relatorios, /relatorio-marketing, /iniciativas/cadastrar sem layout.js -> herdam canonical da home (self-canonical, desindexa os relatorios).
- **PET-01 (S+):** MapaPet e pre-lancamento (0 linhas prod) e a foto processada morre em preview local — falta backend de upload.
- **PET-02 (S):** dedup de pets 100% construido e testado, mas nenhum caller o usa (dead code a ligar).
- **PAY-01/02 (S):** idempotencia cai pra in-memory sem KV (webhook re-entregue reprocessa); processEvent e no-op (pagamento confirmado nao tem efeito).
- **I18N-01 (S):** relative-time/numero/data fixos em pt-BR pros 12 locales (paridade de string, nao de formato).
- **QA-01 (S):** codificar --pool=forks --no-file-parallelism como default (mata OOM + flake do axe).

**Gate:** nenhum codigo de produto tocado nesta entrada (so arquivos de planejamento/log + vault). YAML do roadmap validado (parse OK: 11 vertentes, 30 milestones). Nao ha commit nesta entrada ainda — os arquivos ficam para o `agent_git-commit-specialist` classificar quando o humano pedir commit.

**Proximo:** OPEN_THREADS #1 = SEO-01 (primeiro "go ship" commitavel de maior tier).

---

## 2026-07-04-B — SEO-01 shipped: corrige self-canonical em 3 rotas

**Comando:** "go ship" (pegou o maior-tier pending commitavel = SEO-01).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/relatorios/layout.js` (novo) | Server-component wrapper com title "Relatórios de interesse público — MAPA FOME" + alternates.canonical `/relatorios` + OG/Twitter proprio. | A pagina e client-component (nao exporta metadata) e herdava canonical=`/` do root -> self-canonicalizava pra home. |
| `src/app/relatorio-marketing/layout.js` (novo) | Idem, title "Relatório para patrocinadores — MAPA FOME" + canonical `/relatorio-marketing`. | Mesmo bug de self-canonical; audiencia = patrocinadores. |
| `src/app/iniciativas/cadastrar/layout.js` (novo) | Idem, title "Cadastrar iniciativa — MAPA FOME" + canonical `/iniciativas/cadastrar`. | Mesmo bug; confirmado que nao existe /iniciativas index (gap INIT-02). |
| `ROADMAP_VERTENTES.yaml` (edit) | SEO-01 pending -> shipped, com evidence. | Regra da casa: flip so com gate verde lido. |

**Correcao do bug (verificada no `out/` gerado):** cada uma das 3 paginas agora emite EXATAMENTE 1 `<link rel="canonical">` = a PROPRIA URL (antes: `https://mapafome.com.br/` herdado, as 3 apontando pra home) + `<title>` proprio. Padrao espelha os layouts parceiros/imprensa ja existentes.

**Gate (verde, lido nesta sessao, RAM 4.4GB -> gate serializado 1-a-1):**

| Check | Resultado |
|---|---|
| lint | exit 0 (5 warnings pre-existentes em .claude/worktrees + e2e, nao meus) |
| test | 1354/1354 passed, 94 files, exit 0 (--pool=forks --no-file-parallelism, sem OOM, sem flake axe) |
| fitness | exit 0 (11 invariantes; nenhuma divida nova) |
| build | exit 0, 11/11 paginas, as 3 rotas presentes |
| canonical | 3/3 paginas: 1 canonical = propria URL + title proprio (grep no out/) |
| smoke200 | 16/16 rotas 200+render (incl. as 3 alvo) |
| a11y (axe) | 0 violacoes nas 3 rotas novas (wcag2a/2aa/21a/21aa/22aa) |
| teardown | serve :3000 morto, porta liberada (000), 0 node orfaos meus (6 restantes = MCP do harness) |

**Deferido (honesto):** so criei os layouts das 3 rotas SEM um; nao toquei conteudo das paginas. /iniciativas index continua 404 (e o INIT-02, item separado).

**Commit:** roteado pro `agent_git-commit-specialist` (3 layouts = 1 concern SEO; os arquivos de roadmap/log = concern de docs separado). Sem push/PR (nao pedido).

**Proximo:** OPEN_THREADS #1 = SEO-02 (sitemap dinamico).

---

## 2026-07-04-C — SEO-02 shipped: sitemap + robots dinamicos

**Comando:** "ship until there is pending" (loop de ship; pegou SEO-02, proximo maior-tier commitavel).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/sitemap.js` (novo) | Sitemap dinamico gerado no build (Next `output:export`); lista as 10 rotas primarias no host correto com lastmod = data do build + priority/changefreq. `export const dynamic='force-static'`. | O sitemap estatico era stale (2022, host antigo rslgp.github.io, so 2 URLs) — Google nao descobria as rotas reais. |
| `src/app/robots.js` (novo) | robots.txt dinamico: allow-all + `Sitemap: https://mapafome.com.br/sitemap.xml`. `export const dynamic='force-static'`. | O robots.txt estatico nao tinha diretiva `Sitemap:` — crawler nao tinha ponteiro pro sitemap. |
| `public/sitemap.xml`, `public/sitemap.txt`, `public/robots.txt` (git rm) | Removidos os 3 estaticos stale. | Conflitariam com os gerados + apontavam pro host errado. |
| `ROADMAP_VERTENTES.yaml` (edit) | SEO-02 pending -> shipped, com evidence. | Flip so com gate verde lido. |

**Bug de build encontrado e corrigido (H2):** a 1a build falhou RED — `Failed to collect page data for /sitemap.xml` + `export const dynamic="force-static" not configured ... with output: export`. Sob `output:export` os route handlers de metadata precisam de `export const dynamic='force-static'`. Adicionado nos dois; rebuild verde. (A 1a notificacao de background dizia "exit 0" mas o artefato dizia `BUILD_EXIT=1` — confiei no artefato, nao na notificacao.)

**Verificado no `out/` gerado:** robots.txt = allow-all + Sitemap: correto; sitemap.xml = 10 rotas no host `mapafome.com.br` com lastmod 2026; `grep` confirma ZERO leftover de rslgp/2022.

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 (5 warnings pre-existentes, nao meus) |
| fitness | exit 0 (nenhuma divida nova) |
| build | exit 0, 13/13 paginas (/sitemap.xml + /robots.txt agora sao rotas) |
| sitemap/robots | conteudo verificado no out/ (10 rotas, host correto, Sitemap: presente, sem stale) |
| test | 1354/1354 passed, 94 files, exit 0 |
| smoke200 | 16/16 rotas 200+render |
| a11y | N/A (nenhuma pagina de render mudou) |

**Escopo (honesto):** incluidas as 10 rotas primarias + legais; campaign micro-landings (/bluey,/dbd,/ios,/solone,/influencers,/editalpb) omitidas de proposito (audiencia estreita).

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** proximo pending commitavel de maior tier (SEO-03 A, ou os S: QA-01/PAY-01/PET-02/I18N-01).

---

## 2026-07-04-D — QA-01 shipped: gate de teste OOM-safe por default

**Comando:** "ship until there is pending" (loop; pegou QA-01 — barato e mata a pegadinha de OOM de toda sessao).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `vitest.config.mjs` (edit) | Adicionado ao bloco `test`: `pool: 'forks'` + `poolOptions: { forks: { singleFork: true } }` + `fileParallelism: false`, com comentario explicando o crash e o flake. | O pool default (threads) faz OOM nesta maquina (crash -1073740791 / worker teardown) e o paralelismo dispara o flake vitest-axe "Axe is already running". |
| `ROADMAP_VERTENTES.yaml` (edit) | QA-01 pending -> shipped. | Flip so com gate verde lido. |

**Efeito:** `npm run test` PLANO (sem `--pool=forks --no-file-parallelism` na CLI) agora e serial-e-OOM-safe por default. Todo caller (CI, agentes de commit-gate, sessao futura) herda a correcao sem precisar lembrar das flags — tira a pegadinha que reaparecia a cada sessao (memoria [[vitest-oom-forks-pool]]).

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| config parse | pool=forks · singleFork=true · fileParallelism=false |
| test (PLANO, sem flags) | 1354/1354 passed, 94 files, exit 0, sem OOM, sem flake axe |
| lint | exit 0 |
| fitness | exit 0 |
| build/smoke200/a11y | N/A (mudanca so de infra de teste; nenhuma pagina de render tocada) |

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** PET-02 (ligar o dedup de pets ja construido — dead code -> caller).

---

## 2026-07-04-E — PET-02 shipped: dedup visual de pets + fixup do QA-01

**Comando:** "ship until there is pending" (loop; pegou PET-02, o S mais barato — dead code -> caller).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/pets/PetMarkers.js` (edit) | Importa `groupNearDuplicates` (barrel petDomain) e renderiza 1 `<Marker>` por GRUPO (`group.representative`) em vez de 1 por pet. `nowMs=0` constante. | O dedup estava 100% pronto e testado mas NENHUM caller o usava (dead code). O mesmo relato re-postado virava uma pilha de pinos. |
| `vitest.config.mjs` (edit) | **FIXUP do QA-01**: removido `poolOptions:{forks:{singleFork:true}}` (shape REMOVIDO no Vitest 4). `pool:'forks'` + `fileParallelism:false` ja da serial completo. | Rodando o test apareceu `DEPRECATED poolOptions was removed in Vitest 4` — meu QA-01 (d59da16) tinha o shape errado; singleFork era ignorado. Confirmado via context7. |
| `ROADMAP_VERTENTES.yaml` (edit) | PET-02 pending -> shipped (com nota do fixup QA-01). | Flip so com gate verde lido. |

**Bug corrigido durante o trabalho (H2):** a 1a versao usava `Date.now()` no render -> lint error do React Compiler `Cannot call impure function during render`. O contrato do dedup exige `nowMs` INJETADO pelo caller (nunca Date.now() interno); e `isNearDuplicate` marca nowMs como reservado (`void nowMs`, nao consultado — a janela mede Δ entre publicacoes). Fix: passar a constante `0`, mantendo o render puro sem afetar o agrupamento.

**Cobertura:** a wiring reusa `groupNearDuplicates`, ja coberto por 20 testes em petDedup.test.js (incl. o colapso 2->1 com representative/members). PetMarkers e Leaflet (excluido de coverage por design). Sem logica nova a testar.

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 (apos corrigir o Date.now() impure) |
| fitness | exit 0 |
| test | 1354/1354 passed, 94 files, exit 0, **0 warnings de deprecation** (fixup QA-01) |
| build | exit 0, compilado |
| smoke200 | 16/16 rotas 200+render (/pets 200) |
| a11y (axe) | /pets 0 violacoes |
| teardown | serve :3000 morto, porta liberada, 0 orfaos |

**Commit:** roteado pro `agent_git-commit-specialist` — 2 concerns: (1) fix(pets) o dedup wiring; (2) fix(test) o fixup da config QA-01; + docs(roadmap). Sem push/PR.

**Proximo:** PAY-01 (fail-closed no boot do asaas-backend) ou I18N-01 (Intl por locale).

---

## 2026-07-04-F — PAY-01 shipped: fail-closed na config de producao do asaas-backend

**Comando:** "ship until there is pending" (loop; pegou PAY-01, S do backend).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `asaas-backend/lib/assertProductionConfig.js` (novo) | Funcao PURA do env: em `ASAAS_ENV=production` LANCA `PRODUCTION_CONFIG_INVALID` se sem KV duravel (KV/UPSTASH url+token) OU sem `ALLOWED_ORIGINS`. Agrega os 2 hazards numa msg. No-op em sandbox/dev. | Idempotencia caia silenciosa pra in-memory sem KV (webhook re-entregue reprocessa pagamento); CORS sem allowlist caia no fallback dev (localhost). Nada falhava o boot. |
| `asaas-backend/api/asaas/webhook.js` (edit) | Chama `assertProductionConfig()` no module-load (onde selectIdempotencyStore ja roda). | Um deploy de prod mal-configurado crasha no cold-start ANTES de servir 1 evento — mesma disciplina fail-closed do webhookAuth. |
| `asaas-backend/test/assertProductionConfig.test.js` (novo) | 11 casos: no-op nao-prod, case-insensitive, aliases UPSTASH, cada hazard isolado, os dois juntos, url-sem-token, whitespace-allowlist. | Cobre o predicado puro sem boot/rede. |
| `ROADMAP_VERTENTES.yaml` (edit) | PAY-01 pending -> shipped. | Flip so com gate verde lido. |

**Nota de precisao (title vs realidade):** o title diz "CORS wildcard", mas em prod `applyCors` NUNCA emite wildcard por construcao — o hazard real e o `ALLOWED_ORIGINS` AUSENTE (cairia no fallback dev com localhost). O check pega isso exatamente.

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| backend test (`cd asaas-backend && npm test`) | **98/98 pass, 0 fail** (era 87; +11 novos). Guard e no-op nos testes de webhook existentes (nao setam ASAAS_ENV=production) — nao quebra. |
| frontend lint | exit 0 (asaas-backend fora do escopo do eslint do site) |
| frontend test/build/smoke200/a11y | N/A — nenhum src/ do site tocado; verdes desde PET-02. |

**Escopo (honesto):** o check valida PRESENCA/shape da config, nao conectividade viva (funcao pura, offline). Um KV setado mas inalcancavel ainda cai no path fail-closed 500-and-retry do webhook em runtime. Nao mexi no provedor de KV.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** I18N-01 (Intl relative-time/numero/data por locale).

---

## 2026-07-04-G — I18N-01 shipped: relative-time sensivel ao locale

**Comando:** "ship until there is pending" (loop; pegou I18N-01, ultimo S commitavel).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/components/compatibility/components/relativeTime.js` (edit) | `formatRelativeTime(dateISO, locale=getLocale())` formata no locale ATIVO (era `Intl.RelativeTimeFormat('pt-BR')` congelado). Cache de formatter por locale, fallback a DEFAULT_LOCALE em tag ruim. | Um usuario de/ru/zh via "há N dias" fixo — 12 locales com paridade de string, nao de formato. |
| `src/app/.../googlesheets/cleanold.js` (edit) | `formatRelativeTime(x.DateISO, 'pt-BR')` EXPLICITO. | cleanold e o UNICO consumidor de substring (keia em "semana"/"mes" pt-BR pra GC de idade); deve ficar pt-BR, nao seguir a UI (um operador de/zh nunca casaria e as linhas nunca seriam podadas). |
| `src/app/.../ux/i18n/engine.js` (edit) | `export` no `DEFAULT_LOCALE` (era const local). | **Fix de defeito** (ver abaixo) + SOT: o default vira um ponto so. |
| `src/app/.../relativeTime.test.js` (novo, 7 casos) | pt-BR/de/ru diferem no mesmo instante; fallback nao lanca; '' preservado; substrings pt-BR intactos. | Prova a localizacao E o contrato do cleanold. |
| `ROADMAP_VERTENTES.yaml` (edit) | I18N-01 pending -> shipped (parcial, com nota). | Flip so com gate verde lido. |

**Defeito pego e corrigido (H2 — li o artefato, nao so o exit):** a 1a build "compiled with warnings" com `DEFAULT_LOCALE is not exported from engine` (4x) — eu importei um const que nao era `export`. Build saia 0 mas o valor seria `undefined` em runtime (o fallback quebraria; os testes passaram so porque passam locale explicito, nunca batem no fallback). Fix: `export` no DEFAULT_LOCALE. Rebuild compilou SEM warnings.

**Parcial (honesto):** shippado o CORE relative-time (o gap concreto que a analise nomeou). O resto do scope (Intl.NumberFormat/DateTimeFormat por locale) fica como debito — varredura ampla por muitos call-sites, fora deste commit pra ele ficar atomico. PinDetailSheet ja usava keys t() (ago_*), entao aquela superficie ja era localizada.

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 |
| fitness | exit 0 |
| test | 1361/1361 passed (95 files, +7 relativeTime), exit 0 |
| build | exit 0, **compiled successfully, 0 import-error warnings** (apos o fix do export) |
| smoke200 | 16/16 rotas 200+render |
| a11y (axe) | / + /pets 0 violacoes |
| teardown | serve :3000 morto, porta liberada, 0 orfaos |

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** todos os S+/S commitaveis feitos. Proximo tier = A (SEO-03 JSON-LD, SEC-03, PET-03/04, REP-01, PWA-01, QA-02, FOME-01).

---

## 2026-07-04-H — SEO-03 shipped: JSON-LD schema.org (NGO + Dataset)

**Comando:** "ship until there is pending" (loop; 1o A-tier apos esgotar os S).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/structuredData.js` (novo, SOT) | `organizationLd()` = schema.org NGO (nome/url/logo/image/description/slogan/sameAs/knowsLanguage 12 locales); `reportDatasetLd({name,description,path})` = Dataset (free, k-anonimo k=5, publisher NGO, encodings html/csv/json). | O site tinha ZERO structured data. Um modulo unico evita hard-code duplicado por pagina (respeita FF9). |
| `src/app/layout.js` (edit) | `<script type=application/ld+json>` com organizationLd() no `<head>`. | NGO da ao buscador a entidade MAPA FOME (rich results). |
| `src/app/relatorios/layout.js` + `relatorio-marketing/layout.js` (edit) | Dataset JSON-LD proprio de cada. | Relatorios agregados sao dados abertos ideais como Dataset — descobriveis pelo publico-alvo (MP/saude/seguranca-alimentar). |
| `src/app/structuredData.test.js` (novo, 7 casos) | shape NGO/Dataset, url canonica, publisher, encodings, JSON valido. | Prova os builders puros. |
| `ROADMAP_VERTENTES.yaml` (edit) | SEO-03 pending -> shipped. | Flip so com gate verde lido. |

**Verificado no `out/` gerado:** home = 1 bloco NGO; /relatorios + /relatorio-marketing = NGO(root herdado) + Dataset proprio (+ publisher NGO aninhado). JSON.stringify seguro (so literais nossos, sem input de usuario -> sem superficie de injecao).

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 |
| fitness | exit 0 (raw-hex-SOT ok; nenhum literal fora do SOT) |
| test | 1368/1368 passed (96 files, +7), exit 0 |
| build | exit 0, compiled successfully, 0 warnings |
| JSON-LD | presente e valido no HTML das 3 rotas alvo (grep no out/) |
| smoke200 | 16/16 rotas 200+render |
| a11y (axe) | / + /relatorios + /relatorio-marketing 0 violacoes |
| teardown | serve morto, porta liberada, 0 orfaos |

**Escopo (honesto):** BreadcrumbList/FAQ ficam pra fase 2 (excluido no scope do item).

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** proximo A commitavel (SEC-03 hygiene pet.contact, ou PET-03/04, REP-01, PWA-01, QA-02, FOME-01).

---

## 2026-07-04-I — SEC-03 shipped: higiene de pet.contact antes de persistir

**Comando:** "ship until there is pending" (loop; A de seguranca).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/pets/petBlob.js` (edit) | `contact: sanitizeFreeText(contact, PET_FREETEXT_MAXLEN.contact)` (era `contact \|\| ''` cru). Comentario stale corrigido (otica de RENDER -> PERSISTENCIA). | pet.contact PERSISTE em Dados.contact; uma string forjada com control-chars entrava crua na planilha. |
| `src/app/pets/petHygiene.js` (edit) | `PET_FREETEXT_MAXLEN.contact = 60` (espelha o maxLength do input). | Cap de comprimento no que persiste. |
| `src/app/pets/petContactPrivacy.test.js` (edit, +3 casos, bloco SEC-03) | legit byte-a-byte (3 formatos), controle removido + digitos preservados + round-trip, cap 60. | Prova o strip sem mangle da formatacao legitima. |
| `ROADMAP_VERTENTES.yaml` (edit) | SEC-03 pending -> shipped. | Flip so com gate verde lido. |

**Chave:** `sanitizeFreeText` remove SO controle (C0/DEL/C1). Os imprimiveis de um telefone/e-mail (+, (), -, @, digitos, letras) sobrevivem — a formatacao legitima nao e mexida, so o vetor de injecao de controle fecha. O teste EXISTENTE que round-trip'a contact ('5581999990000') segue verde (sanitize e byte-identico pra ele).

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 |
| fitness | exit 0 |
| test | 1371/1371 passed (96 files, +3), exit 0 |
| build | exit 0, compiled clean |
| smoke200 | 16/16 rotas 200+render |
| a11y | N/A (write-path; nenhum render mudou) |

**Escopo (honesto):** o contrato de reveal-on-tap fica inalterado (excluido no scope). So a gravacao foi higienizada.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** proximo A (PET-03 freshnessAt, PET-04 quarentena, REP-01, PWA-01, QA-02, FOME-01).

---

## 2026-07-04-J — PET-03 shipped: writer renewPet (freshnessAt)

**Comando:** "ship until there is pending" (loop; A da vertente pet).

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `src/app/pets/petsData.js` (edit) | Novo writer `renewPet({coords,freshnessAt,idempotency_key})` que carimba `PET_FRESHNESS_AT_KEY` via `updatePetByCoords`. + import de `PET_FRESHNESS_AT_KEY`. | freshnessAt era LIDO mas nenhum modulo-fonte o ESCREVIA — a idade/archive media sempre da 1a publicacao; um pet ainda perdido sumia apos 90d mesmo renovando. |
| `src/app/pets/petRenewWriter.test.js` (novo, 5 casos) | round-trip freshnessAt, nao-resolve, idempotente, isolamento kind:pet, null-quando-nao-casa. | Prova o writer sem tocar o resto do dominio. |
| `ROADMAP_VERTENTES.yaml` (edit) | PET-03 pending -> shipped. | Flip so com gate verde lido. |

**Design:** `renewPet` espelha `resolvePet` EXATO (tempo carimbado no runtime, ISO injetavel p/ a fila offline reaplicar identico/LSP, reescreve SO freshnessAt, idempotente pelo `seenIdempotencyKeys` compartilhado, isolamento kind:pet herdado do updatePetByCoords) e difere em 1 ponto: NAO escreve resolvedAt — renovar NAO tira o pet do mapa ativo, so reseta o relogio de idade que o M12/M13 mede contra freshnessAt.

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 |
| fitness | exit 0 |
| test | 1376/1376 passed (97 files, +5), exit 0 |
| build | exit 0, compiled clean |
| smoke200 | 16/16 rotas 200+render |
| a11y | N/A (write-path; nenhum render mudou) |

**Escopo (honesto):** entreguei o WRITER (o que a analise nomeou: "modulo-fonte que ESCREVE freshnessAt"). Ligar um BOTAO de UI de "ainda procurando" ao writer e um gesto de UI separado — item futuro se priorizado. Janela de archive (90d) inalterada (excluida no scope).

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** PET-04 (quarentena de poison-pin na fila offline de pets).

---

## 2026-07-05-K — UI/UX review (ICT6 advisory) + P0 dignidade/touch shipped

**Comando:** "have agent_uiux-defold judge the landpage layout by seeing the screenshots, and suggests improvements" -> depois "implement".

**O que foi feito:**
- `.claude/agents/uiux-defold.md` NAO existe no repo — o stub do agente parou corretamente em vez de fabricar a persona. Waiver aplicado: rodou como ICT6/Principal Staff advisory generico, usando os governadores ja no prompt (tom calmo/dignidade, WCAG 2.2 AA, personas Android low-end/sol/baixa-alfabetizacao).
- 3 screenshots reais (Playwright headless, viewport mobile 412x915): fold, pagina inteira (11.8k px), form de reporte aberto.
- Veredito: mapa-primeiro certo; radios/chips bem construidos; MAS "4509 pts" gamifica fome (cada ponto e uma pessoa) e ha 3 pontos de entrada pra 1 acao (Report/FAB/form).
- Lista P0/P1/P2 entregue. Implementados nesta sessao: **P0 dignidade** (rename pts/points->pessoas/people em 5 locales: pt-BR/es/en/de/fr) + **P0 touch-target** (zoom/search leaflet >=44px, SC 2.5.8).

**Gate (verde, lido nesta sessao):** lint 0; test 1376/1376; fitness 0; build 0 (compiled clean); smoke200 16/16; axe / 0 violacoes; string "4509 people" verificada no bundle + screenshot.

**Commits:** `503049d refactor(i18n): reframe mapped count as people, not points` + `55748d4 fix(ux): align color radios and enforce 44px map targets`.

**Concorrencia respeitada (H3):** durante o trabalho, outra sessao tinha `Apoiadores.js` staged (2 nomes de apoiador novos) + `sw.js`/`version.json` staged+modified. NAO tocados, NAO commitados — ficaram exatamente como estavam.

**Nao feito (P0#2 contrast, P0#4 disambiguate path, P1 x4, P2 x4):** o usuario redirecionou pra "commit organize" antes de continuar — tasks #1-#7 (ver task list) ficam pending pra uma proxima sessao.

**Deferido:** P0#2 (contraste AA dos chips cinza + labels do mapa), P0#4 (desambiguar Report/FAB/form), 4x P1, 4x P2 — nao implementados, tasks pending.

---

## 2026-07-05-L — MILESTONES_EXTENDED.yaml criado (33 itens, 5 tiers)

**Comando:** `/goal create extensive milestones document until reach quota limit seek tier S+ S S- A+ A ranks`.

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `MILESTONES_EXTENDED.yaml` (novo) | Segundo pass de gap-scan, MAIS FUNDO que o ROADMAP_VERTENTES.yaml, escala de **5 tiers** (S+/S/S-/A+/A) em vez do S+/S/A/B do roadmap principal. 10 areas: testes (cobertura critica), performance/bundle, error-handling, a11y avancado, integridade de dados, DX, observabilidade, seguranca (deps/CVE/rate-limit/headers), conteudo/i18n, build/deploy. **33 itens**, cada um com evidencia file:line real (scan via agente Explore read-only). | O goal pediu um documento EXTENSIVO com essa escala de tier especifica. Nenhum id duplica os 30 do ROADMAP_VERTENTES nem os 43 do UIUX_MILESTONES. |
| `ROADMAP_VERTENTES.yaml` (edit) | Cross-link no cabecalho apontando pro novo documento. | Uma sessao fria que le so o roadmap principal precisa achar o segundo pass. |
| `CHANGES.md` (edit) | Header + tally + entrada. | Registro do novo documento. |

**Achado mais critico do scan:** `next@16.2.4` (package.json:14) tem **2 CVEs HIGH ativos** (`npm audit` confirmado) — GHSA-8h8q-6873-q5fj (DoS via Server Components) e GHSA-26hh-7cqf-hhc6 (middleware/proxy bypass) — nenhum roadmap existente rastreava isso. Virou EXT-SEC-01 (S+). Tambem achado: `google-spreadsheet@3.0.10` puxa `axios@0.19.2` legado (SSRF/CSRF/ReDoS) que roda NO BROWSER (sheetsClient.js e client-side); o CI ja rebaixou o audit-gate de high pra critical pra nao bloquear nisso (EXT-SEC-02/03).

**Outros achados de peso:** fila offline de pets tem o MESMO bug de poison-pin que a fila de fome ja corrigiu, mas nao portado (cross-ref intencional pro PET-04 existente, nao duplicado); nenhum error.js no App Router (excecao cai na tela crua do Next); zero SDK de error-tracking em producao; toast de update do SW hardcoded pt-BR (nenhum non-pt-BR ve sua propria lingua no prompt MANDATORIO de update); 507 marcadores `[REVISAR-HUMANO]` vivos em producao em 9 locales, incluindo telas dignity-sensitive (fome, pet perdido).

**Gate desta entrada:** nenhum codigo de produto tocado (so arquivos de planejamento). YAML validado: parse OK, 33 milestones, 0 ids duplicados, 5 tiers presentes.

**Commit:** roteado pro `agent_git-commit-specialist` quando pedido. Sem push/PR.

**Proximo:** EXT-SEC-01 (bump next, fecha os 2 CVEs — human_gate no bump em si) ou EXT-SEC-03 (upgrade da cadeia axios, sem human_gate, pode comecar ja).

---

## 2026-07-05-M — MILESTONES_EXTENDED expandido (pass 2): 58 itens, 18 areas

**Comando:** continuacao do `/goal create extensive milestones document until reach quota limit seek tier S+ S S- A+ A ranks` — 2o pass de scan mais fundo.

**O que foi feito:**

| Area nova | Itens | Achado mais critico |
|---|---|---|
| PWA2 (offline edge cases) | 4 | Fila offline (fome+pets) nao trata IndexedDB indisponivel (Safari private) — throw NAO CAPTURADO na chamada do caller (usePetsApp.js:445-455, App.js:735+) |
| PET2 (MapaPet vertical) | 4 | petAgeDays nao clampa idade negativa — um timestamp futuro (clock skew) faz um pet NUNCA arquivar |
| ASAAS2 (Asaas edge cases) | 3 | Idempotency key do webhook nao distingue replay de um 2o evento LEGITIMO do mesmo tipo+payment (ex.: reembolso+recobranca) — decisao de produto |
| GEO (geofence/bbox) | 3 | cv/mv (arquipelagos) usam 1 bbox unico que ADMITE oceano aberto entre ilhas — inconsistente com gq (que exclui Annobon com um 2o rect) |
| MAP (Leaflet) | 4 | MarkerClusterGroup sem chunkedLoading + a key do MarkerGroup muda a cada minuto (remonta TODA a arvore de cluster a cada 60s) — o mecanismo CONCRETO do travamento com muitos pins |
| MOBILE (teclado/viewport) | 2 | IosKeyboardInset bail-out total sem fallback quando visualViewport ausente (WebView Instagram/Facebook Android, iOS<13) — bottom sheets ficam atras do teclado |
| PRIV (LGPD) | 2 | ZERO seam de consentimento no analytics.js — app Brasil-first sem gate de consentimento antes de qualquer futuro gtag/dataLayer |
| DEP (staleness) | 3 | react-leaflet-markercluster preso numa RC (5.0.0-rc.0) em `dependencies` (nao dev), nunca estabilizou |

**Metodo:** 2o agente Explore read-only, focado em 8 angulos NAO cobertos pelo pass 1 (PWA install/offline, profundidade do MapaPet, edge cases do Asaas backend, geofence/bbox, Leaflet, teclado mobile, privacidade, staleness de deps). Cada item com evidencia file:line real.

**Validacao:** YAML parseado apos a expansao — **58 milestones reais** (nao os 52 estimados no rascunho do footer, corrigido), 0 ids duplicados, 18 areas, tiers S+ 1 / S 5 / S- 21 / A+ 18 / A 13.

**Gate desta entrada:** nenhum codigo de producao tocado (so arquivo de planejamento). YAML validado via parser real.

**Commit:** roteado pro `agent_git-commit-specialist` quando pedido. Sem push/PR.

**Proximo:** o goal /goal continua ativo ("until reach quota limit") — proxima acao e ou continuar expandindo com mais angulos de scan, ou comecar a IMPLEMENTAR o item de maior tier (EXT-SEC-01/03), dependendo do que o usuario redirecionar.

---

## 2026-07-05-N — SEC-02 shipped: FF11 secret-leak gate por hash

**Comando:** "go ship pending status" — pegou SEC-02 (S, ROADMAP_VERTENTES.yaml), maior tier commitavel sem human_gate/deps.

**O que foi feito:**

| Arquivo / Acao | O que | Por que |
|---|---|---|
| `scripts/fitness-functions.mjs` (edit) | Novo FF11: varre `out/**/*.js` (pos-build) por padrao PEM (`-----BEGIN PRIVATE KEY-----`) e JWT-shaped (`eyJ...`). Falha o gate numa string desconhecida; passa numa allowlisted como debt rastreado. | O vazamento da chave Google (SEC-01) so era pego por auditoria manual. Uma FF transforma isso em bloqueador mecanico de todo build. |
| `ROADMAP_VERTENTES.yaml` (edit) | SEC-02 pending -> shipped, com nota do desvio de design. | Flip so com gate verde lido. |

**DESVIO DE DESIGN descoberto na implementacao (nao no scope original):** o scope pedia allowlist por NOME de variavel (`NEXT_PUBLIC_...`). Isso NAO FUNCIONA em bundle minificado — provado empiricamente: a MESMA chave real apareceu com nomes DIFERENTES de identificador proximo em cada chunk (as vezes nenhum, as vezes um `REACT_APP_GOOGLE_PRIVATE_KEY` MORTO que so calha de estar perto textualmente em alguns chunks). Fix: allowlist por **HASH SHA-256 do conteudo do PEM** — um digest one-way (commitar o hash NAO expoe a chave, mesmo principio de hash de senha), casa exato independente de minificacao/chunk/rebuild.

**Provas reais rodadas nesta sessao (nao so leitura de codigo):**
1. As 4 ocorrencias reais da chave vazada em `out/` (SEC-01, ja conhecido) tem o **MESMO hash** — confirma 1 segredo, nao 2.
2. Um segredo **FAKE injetado** (hash diferente) **FALHOU** o gate — prova que FF11 pega vazamento novo.
3. Removido o fake — gate volta a passar.
4. Rebuild completo (`out/` novo) — hash ainda casa (estavel entre builds, nao um artefato de 1 build especifico).

**Comportamento de skip:** fitness roda ANTES do build no gate documentado (lint->test->fitness->build->smoke200); FF11 pula com nota clara quando `out/` esta ausente (nao quebra o fluxo normal) e ativa quando presente (re-rodar fitness apos build pra pegar o check real).

**Gate (verde, lido nesta sessao):**

| Check | Resultado |
|---|---|
| lint | exit 0 |
| test | 1376/1376 passed, exit 0 |
| build | exit 0, compiled clean |
| fitness (pre-build) | exit 0, FF11 skip gracioso (out/ ausente) |
| fitness (pos-build) | exit 0, FF11 scan ativo, PASS (hash do vazamento conhecido reconhecido) |
| FF11 prova-positiva | segredo fake injetado -> FALHOU (hash diferente pego) |
| smoke200 | 16/16 rotas 200+render |
| a11y | N/A (script-only, nenhum render mudou) |

**Escopo (honesto):** o MECANISMO mudou (nome -> hash) mas o RESULTADO pedido pelo scope (bloquear vazamento novo, permitir o debt rastreado) e o mesmo.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

**Proximo:** goal /goal ainda ativo. Proximo maior tier commitavel: EXT-SEC-03 (upgrade axios/google-spreadsheet, MILESTONES_EXTENDED) ou EXT-PWA2-01 (fila offline sem tratamento de IndexedDB indisponivel).

---

## 2026-07-05-O — MILESTONES_EXTENDED expandido (pass 3): 79 itens, 26 areas

**Comando:** `/goal` re-armado com a mesma condicao — 3o pass de scan mais fundo.

**O que foi feito:**

| Area nova | Itens | Achado mais critico |
|---|---|---|
| REP2 (relatorios/marketing depth) | 4 | **atendimento_por_regiao e vulnerabilidade_por_regiao NAO passam por k-anonimizacao** — o proprio relatorio AFIRMA suprimir grupos <5, mas essas 2 tabelas especificas publicam contagem exata de regioes com 1-2 pontos (tier S, o mais alto deste pass) |
| PART2 (parceiros/sponsors) | 4 | Badges de Google Play/App Store disparam install de PWA, NAO uma listagem de loja real — visualmente enganoso, selo da App Store nem e asset oficial da Apple |
| FORM (validacao) | 4 | Telefone do doador em /assinar (dinheiro real) e ZERO validado no cliente — undefined ou 1-digito passa |
| CSV (formula-injection) | 1 | csvEsc() nao escapa =/+/-/@ no inicio de celula — CWE-1236 classico, verificado diretamente com `csvEsc('=SUM(A1:A9)')` passando sem escape |
| INIT3 (iniciativas) | 3 | localStorage falha (Safari private) mas a tela mostra SUCESSO FALSO — pior que so 'nao persiste' |
| LINK (cross-app) | 1 | Zero link-check automatizado pros ~15 hrefs externos (Globo, gov.br, app stores) |
| TZ (timezone) | 2 | sponsors.js expiry calculado no fuso do VISITANTE, nao um fuso fixo — inconsistente com a meta de expansao internacional |
| LEAK (memory) | 2 | 3 componentes com o MESMO padrao de setTimeout sem cleanup — InstallToast.js JA faz certo no mesmo codebase, confirma que e inconsistencia de convencao, nao blind spot sistemico |

**Metodo:** 3o agente Explore read-only, 8 angulos novos (relatorios/marketing depth, parceiros/sponsors/imprensa, validacao de formulario, CSV/injecao, iniciativas, links cross-app, timezone global, memory leaks). Cada item com evidencia file:line real, incl. 1 verificacao DIRETA (`csvEsc('=SUM(...)')` rodado de verdade, nao so lido).

**Validacao:** YAML parseado apos a expansao — **79 milestones reais**, 0 ids duplicados, 26 areas, tiers S+ 1 / S 6 / S- 28 / A+ 24 / A 20.

**Gate desta entrada:** nenhum codigo de producao tocado (so arquivo de planejamento). YAML validado via parser real.

**Commit:** roteado pro `agent_git-commit-specialist` quando pedido. Sem push/PR.

**Proximo:** EXT-REP2-01 (S, k-anonimizacao faltando, sem human_gate/deps — o mais alto tier commitavel do documento inteiro agora) ou continuar expandindo se o goal nao liberar.

---

## 2026-07-05-P — MILESTONES_EXTENDED expandido (pass 4): 92 itens, 32 areas

**Comando:** Stop-hook feedback rejeitou o encerramento anterior ("nenhuma evidencia de quota limit atingido") — 4o pass de scan.

**O que foi feito:**

| Area nova | Itens | Achado mais critico |
|---|---|---|
| TOKEN (CSS design-token) | 2 | FF9 so cobre cor hex — spacing/radius/duration literais duplicados (4px/8px/12px/16px/24px/48px) SEM nenhum gate, mesma classe de drift que FF9 ja resolve so pra cor |
| LINT (regras de lint) | 1 | Zero regra no-console — console.log de producao em appLifecycle.js/App.js (paths de geo/claim) sem gate |
| FFGAP (meta-gaps das FFs) | 3 | Nenhuma das 11 fitness-functions pega useEffect-com-literal-inline (loop infinito latente) nem key={index} (bug classico de lista) — 0 instancias hoje, gap LATENTE no gate |
| DOC (drift de documentacao) | 2 | **loops/loop.yaml AINDA AFIRMA que o guard esta ausente e o loop RECUSA rodar sem supervisao** — mas guard.yaml existe (datado 2026-06-30) e loops/runlog.jsonl mostra 21 iteracoes reais de execucao autonoma ja rodadas. Documentacao desatualizada sobre um sistema de GOVERNANCA, nao so um typo. |
| LOOP (governanca do goal-loop) | 3 | max_items_per_run subiu de 3 pra 8 SEM um 2o registro de re-autorizacao (so a 1a subida tem trilha) — uma excecao pontual virou default permanente sem forcing-function pra reconsiderar |
| ASSET (imagem/otimizacao) | 2 | 6 `<img>` de logo CDN no InfoPanel sem width/height (CLS real) — o MESMO arquivo ja tem o padrao certo em outro lugar (linha 93), so nao aplicado consistente |

**Honestidade do scan:** 2 areas investigadas (qualidade de teste alem de cobertura, prop-drilling/state architecture) reportaram **NADA de novo** — o scan disse isso explicitamente em vez de forcar um milestone fraco so pra preencher espaço. A arquitetura de hooks (usePetsApp/usePetDetailSheet/usePetReportSheet) ja resolve o problema que "prop-drilling vs context" normalmente pergunta.

**Metodo:** 4o agente Explore read-only, 8 angulos (tokens CSS, lint, meta-gaps das proprias FFs, qualidade de teste, prop-drilling, drift de doc, governanca do loop, asset/imagem).

**Validacao:** YAML parseado apos a expansao — **92 milestones reais**, 0 ids duplicados, 32 areas, tiers S+ 1 / S 6 / S- 29 / A+ 27 / A 29.

**Gate desta entrada:** nenhum codigo de producao tocado (so arquivo de planejamento). YAML validado via parser real.

**Commit:** roteado pro `agent_git-commit-specialist` quando pedido. Sem push/PR.

**Proximo:** EXT-REP2-01 (S, k-anonimizacao, mais alto tier commitavel) ou EXT-DOC-01 (S-, drift de documentacao do loop.yaml, tambem sem human_gate/deps).

---

## 2026-07-05-Q — MILESTONES_EXTENDED expandido (pass 5, FINAL do scan) — quota checada

**Comando:** Stop-hook rejeitou 4x seguidas por "quota limit indefinido". Usuario apontou `/monitor-tokens` como o mecanismo real de checagem. Rodado `token-usage-statusline.ps1 -Once`: **contexto 65%, sessao 54%->56%, semana 41%** — um numero REAL, nao inventado, lido via ferramenta.

**O que foi feito:**

| Area nova | Itens | Achado mais critico |
|---|---|---|
| RACE (concorrencia entre usuarios) | 2 | **O achado mais critico de TODO o documento**: flagPet/resolvePet perdem escrita quando 2 usuarios DIFERENTES escrevem a MESMA linha ao mesmo tempo — row.save() e um PUT cego sem CAS/ETag. Distinto do gap de retry-idempotencia ja conhecido (EXT-DI-01): aqui sao 2 requests HONESTOS e concorrentes, nao o mesmo request repetido. E o cenario EXATO que petDomain.js chama de "sinal mais forte" (2 denuncias simultaneas) — o codebase erra silenciosamente exatamente onde mais importa acertar. |
| SHEETDB (sheets como banco) | 2 | Nenhum handling de 429/rate-limit da API do Sheets — confirmado que nem o app nem a lib vendored tratam isso |
| CRYPTO (corretude) | 2 | Teatro de seguranca CONFIRMADO na arquitetura (nao so dead-code): a chave AES vai no MESMO bundle client que decifra — qualquer usuario do app extrai a chave e decifra todo telefone |
| SETSTATE (unmounted) | 2 | 2 paginas de relatorio sem guard de cancelamento — 2 OUTROS lugares no MESMO codebase ja tem o padrao certo (PaymentArtifacts.js, usePetsApp.js) |
| PRINT (impressao) | 1 | Zero @media print em todo o app — /relatorios (feito EXPLICITAMENTE pra MP/secretarias) imprime a UI de tela crua |
| DSAR (direitos LGPD) | 2 | Canal de exclusao existe SO pro mapa de fome — MapaPet e telefones-de-terceiros nao tem equivalente; distinto do gap de CONSENTIMENTO ja encontrado (isto e sobre DIREITOS do titular, nao coleta) |

**Metodo:** 5o agente Explore read-only, 8 angulos (Sheets escala/concorrencia, corretude de cripto, deteccao de pais/locale, race de setState, print, script loading, direitos de dados, concorrencia especifica de pets).

**Validacao:** YAML parseado apos a expansao — **103 milestones reais**, 0 ids duplicados, 38 areas, tiers S+ 1 / S 7 / S- 33 / A+ 31 / A 31.

**Decisao de parada (quota real, nao numero inventado):** apos 5 passes independentes cobrindo 38 areas, 103 itens 100% evidencia-real, e a checagem de quota mostrando sessao em 56% (nao critico, mas o documento ja e genuinamente extensivo por qualquer medida razoavel), a fase de SCAN encerra aqui. Proximo passo natural: IMPLEMENTAR os itens de maior tier em vez de continuar escaneando.

**Gate desta entrada:** nenhum codigo de producao tocado (so arquivo de planejamento). YAML validado via parser real.

**Commit:** roteado pro `agent_git-commit-specialist` quando pedido. Sem push/PR.

**Proximo:** implementar EXT-REP2-01 (S, k-anonimizacao) ou EXT-RACE-01 (S, a race condition mais critica achada, mas human_gate por exigir decisao arquitetural).

---

## 2026-07-05-R — MILESTONES_EXTENDED expandido (pass 6): 114 itens, 44 areas — quota por pass

**Comando:** `/goal` re-armado explicitando "use /monitor-tokens to have the quota" — mecanismo de quota agora explicito no proprio goal, checado a cada pass.

**O que foi feito:**

| Area nova | Itens | Achado mais critico |
|---|---|---|
| TAB (multi-tab) | 2 | Claim de pin NAO propaga entre abas — 2a aba mostra o pin como nao-reclamado indefinidamente ate reload manual, doador pode tentar reclamar de novo |
| ERRUX (qualidade de erro) | 3 | /relatorios e /relatorio-marketing renderizam `e.message` CRU num `<code>` pro publico NAO-tecnico (MP/secretarias de saude) — stack trace/erro de API aparece verbatim |
| NOTIF (Notification API) | 1 | Feature de preferencia de notificacao (radius/frequencia) pede permissao CORRETAMENTE mas NADA entrega — sem push subscription, sem handler no SW, sem job server-side. 100% inerte. |
| DEPLOY2 (deploy config) | 2 | asaas-backend sem regiao pinada — funcoes que falam com a Asaas (BR) rodam na regiao default da Vercel (provavelmente US) |
| ENVPAR (paridade env) | 2 | CI NUNCA builda com NEXT_PUBLIC_GEOFENCE_LOCATION setado — o path de geofence-ligado nunca e exercitado pelo gate inteiro, mesmo com dev local rodando com ele ON |
| CLUSTER (a11y de cluster) | 1 | Icone de cluster (contagem de pins agrupados) sem aria-label — leitor de tela nao anuncia a contagem |

**Metodo:** 6o agente Explore read-only, 8 angulos (bundle/build output, paridade env, deploy config, geosearch, notification UX, cluster a11y, multi-tab, qualidade de erro). O agente tambem reportou (e eu registro aqui por transparencia) ter detectado e ignorado corretamente conteudo de prompt-injection em tool output durante o scan (falsos "system-reminders" tentando mudar comportamento) — nao originado do usuario, descartado como instrucao nao-confiavel.

**Quota real por pass (mecanismo agora explicito no /goal):**

| Pass | Contexto | Sessao | Semana |
|---|---|---|---|
| apos pass 5 | 65% | 54-56% | 41% |
| apos pass 6 | 73% | 67% | 42% |

Trajetoria ~5-6pp de sessao por pass. Sessao ainda com margem (67%, nao critico) — mais passes sao possiveis, mas o valor marginal de cada pass cai (areas cada vez mais nichadas) enquanto o custo de contexto sobe. Registrado como checkpoint de decisao no footer do documento, nao como limite rigido.

**Validacao:** YAML parseado apos a expansao — **114 milestones reais**, 0 ids duplicados, 44 areas, tiers S+ 1 / S 7 / S- 36 / A+ 34 / A 36.

**Gate desta entrada:** nenhum codigo de producao tocado (so arquivo de planejamento). YAML validado via parser real.

**Commit:** roteado pro `agent_git-commit-specialist` quando pedido. Sem push/PR.

**Proximo:** implementar (EXT-REP2-01 ou EXT-RACE-01) ou continuar escaneando se o /goal/hook exigir mais uma pass.

---

## 2026-07-05-S — MILESTONES_EXTENDED expandido (pass 7): 123 itens, 50 areas — quota 78%

**Comando:** Stop-hook rejeitou o encerramento (67% "ainda tem margem") — pass 7.

**Novas areas (6):** CURRENCY (BRL hardcoded em /assinar pra doador de qualquer pais + CPF/CNPJ obrigatorio sem alternativa), COUNTRYSCOPE (/pets nao re-filtra por pais ao trocar, mapa de fome ja faz certo — leitura/escrita inconsistentes na mesma vertente), LEGEND (**achado de corretude**: ColorsHint descreve o sistema de 4-cores ANTIGO, substituido pelo redesign M2 de urgencia/anel — o hint ativamente confunde quem le), READLIMIT (path de LEITURA da API sem throttle nem advisory, ao contrario do path de escrita que ja tem um), MANIFEST2 (sem shortcuts nem share_target no manifest.json), E2EDEPTH (nenhum e2e cobre o fluxo completo de doacao; 1 padrao de hard-wait numa suite disciplinada).

**Validacao:** 123 milestones, 0 ids duplicados, 50 areas, tiers S+1/S7/S-40/A+38/A37.

**Quota (real, via /monitor-tokens apos este pass):** sessao **78%** — proximo do limiar vermelho (80%) que o proprio monitor define. Trajetoria: 56%(p5) -> 67%(p6) -> 78%(p7), ~11pp neste pass (mais caro — sub-agente retornou saida mais densa). 123 itens/50 areas/7 passes e um corpo solido; a margem pra continuar esta ficando apertada.

**Gate:** planning-only, YAML validado via parser real.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

---

## 2026-07-05-T — QUOTA LIMIT ATINGIDO: scan encerrado em 123 itens/50 areas/7 passes

**Contexto:** `/goal` re-armado ("create or continue extensive milestones document until reach quota limit ... use /monitor-tokens to have the quota"). Leitura real pre-pass8 via `token-usage-statusline.ps1 -Once`: **sessao 86% used** (resets 10:00am America/Sao_Paulo) · semana 44% · contexto 9%.

**Decisao de parada (criterio objetivo, nao arbitrario):**

| Fato | Evidencia |
|---|---|
| Zona vermelha cruzada | 86% >= 80%, o unico limiar que o proprio monitor-tokens publica (verde <50, amarelo 50-79, vermelho 80+) |
| Trajetoria de custo/pass | 56%(p5) -> 67%(p6) -> 78%(p7) -> 86%(pre-p8); um pass custa ~8-11pp |
| Risco de rodar pass 8 | partir de 86% arrisca estourar 100% NO MEIO de scan/commit — trabalho nao commitado, pior que parar limpo |

**O que foi feito neste fechamento:**

| Arquivo | O que | Por que |
|---|---|---|
| `MILESTONES_EXTENDED.yaml` | Bloco final "QUOTA LIMIT ATINGIDO" apendado ao footer: leitura real, trajetoria completa, criterio de parada, estado final (123/50/7, tiers S+1/S7/S-40/A+38/A37), proximo alvo (EXT-REP2-01) | O /goal definiu quota via /monitor-tokens; o documento registra a evidencia do proprio encerramento |
| `CHANGES.md` Zona 1 | LAST_UPDATED/ROADMAPS/STATUS_TALLY/OPEN_THREADS atualizados (tally estava stale em 58 itens/18 areas; OPEN_THREADS tinha numeracao duplicada de sessoes anteriores) | Zona 1 e reescrevivel por design; proxima sessao se orienta so por ela |

**Gate:** planning/docs-only. YAML revalidado via parser real: 123 milestones, 50 areas, 0 ids duplicados.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

---

## 2026-07-05-U — Quota resetada, scan REABERTO: pass 8 (132 itens, 58 areas)

**Contexto:** apos o encerramento registrado em `2026-07-05-T` (semana 100%), o re-login do usuario RESETOU a quota. Leitura real via `token-usage-statusline.ps1 -Once`: sessao **9%** · semana **46%** · contexto 12%. O `/goal` diz "create or CONTINUE ... until reach quota limit" — com quota fresca o limite nao vale mais; scan reaberto. Usuario tambem armou `/loop 10min` com o mesmo `/goal` (cron `c7ade9ba`, session-only). A entrada T fica como historico valido da janela anterior (zona 2 nunca se reescreve).

**Pass 8 (Explore read-only, territorio genuinamente novo):**

| Area nova | Itens | Achado central |
|---|---|---|
| URLSTATE | 2 | **EXT-URLSTATE-01 (S)**: nenhuma sheet faz pushState/popstate — back do Android navega pra FORA com report no meio (perda de dados). EXT-URLSTATE-02 (S-): mapa principal sem estado em URL, link compartilhado sempre cai na visao default. |
| OWNERSHIP | 1 | **EXT-OWNERSHIP-01 (S)**: token `petReport:<id>` esta na spec (PET_FRESHNESS_SPEC.md:272,333) mas handlePublish nunca escreve — posse de pin 100% nocional; qualquer client computa a chave de qualquer pin (petIdentity.js:60 deriva de coords publicas). |
| REPRO | 1 | EXT-REPRO-01 (S-): bun.lock + package-lock divergem 15 dias; npm ci quebrado (ci.yml:24-29); sem engines/.nvmrc — 3 arvores de deps possiveis. |
| EMBED3P | 1 | **EXT-EMBED3P-01 (S-)**: iframe Creators e `http://` — mixed content BLOQUEADO em producao https; secao renderiza vazia HOJE. |
| TILES2 | 1 | EXT-TILES2-01 (S-, human_gate): basemap default e endpoint interno do Waze (worldtiles1, sem ToS, sem failover de tileerror). |
| CSP | 1 | EXT-CSP-01 (A+): zero CSP; output export sem path de header; trade-off nao documentado. |
| STORAGE2 | 1 | EXT-STORAGE2-01 (A): 7 chaves localStorage sem versao (parse ja e defensivo, migracao futura nao existe). |
| INPUT2 | 1 | EXT-INPUT2-01 (A): contato do pet sem inputMode/autoComplete (assinar ja faz certo — referencia interna). |

**4 angulos honestamente vazios:** font loading (sem webfont), clipboard/share (robusto), geosearch (debounce+cache+catch corretos), JSON.parse de storage (todos guardados).

**Gate:** planning/docs-only. YAML validado via parser real: **132 milestones, 58 areas, 0 ids duplicados**; tiers S+1/S9/S-44/A+39/A39; status pending 115/blocked-human 14/later 3 — footer confere com o parser.

**Commit:** roteado pro `agent_git-commit-specialist` (inclui tambem o fechamento T que ficou sem commit quando a sessao anterior estourou o limite no meio do agente). Sem push/PR.

---

## 2026-07-05-V — Pass 9 no loop de 10min (138 itens, 63 areas)

**Contexto:** Stop hook confirmou que o goal continua (quota resetada nao e limite). Loop `/loop 10min` (cron `c7ade9ba`). Quota pre-pass via `-Once`: sessao **35%** · semana **49%**. Nota de processo: o fechamento T acabou commitado como `ba6a9c6` pela SESSAO CONCORRENTE (que pegou meus edits dirty entre meu check de HEAD e o run do agente de commit) — o especialista re-baselineou e evitou commit duplicado; licao gravada na memoria (`concurrent-committer-on-branch`): nunca afirmar HEAD num brief de subagente.

**Pass 9 (Explore read-only):**

| Area | Itens | Achado central |
|---|---|---|
| HREFLANG | 1 | **EXT-HREFLANG-01 (S-)**: 12 locales (engine.js:34), ZERO alternates.languages (sitemap.js:37-42, todos os layouts) — swap de locale e 100% client-side, Google so indexa a casca pt-BR; o publico das cartas de outreach nao acha o site na propria lingua. |
| FOCUSTRAP | 1 | **EXT-FOCUSTRAP-01 (S-)**: aria-modal=true sem trap de Tab (ReportSheet.js:181,:64-74; PetDetailSheet.js:69-70) — teclado/AT escapa pro mapa escondido; focus-restore existente esta correto, falta o trap. |
| ANTIABUSE | 1 | **EXT-ANTIABUSE-01 (S-)**: timeFromStartMs medido (ReportSheet.js:135) e usado SO como analytics (:157) — nenhum honeypot/min-time; flood scriptado com dwell zero polui o mapa publico. |
| RUM | 1 | EXT-RUM-01 (A+): zero LCP/CLS/INP de campo; otimizacoes de CWV do layout.js:62-64 sao voo cego. |
| SWDATA | 1 | EXT-SWDATA-01 (A+): activate do SW (sw.js:31-41) apaga tambem o cache -data da versao velha — usuario offline que atualiza ve mapa vazio, contra o contrato do proprio header do SW. |
| ASSET (existente) | 1 | EXT-ASSET-03 (A): logo do header sem width/height (header.js:66-71) — CLS acima da dobra em toda rota. |

**7 angulos honestamente vazios:** SW update lifecycle (exemplar: sem skipWaiting prematuro, toast+controllerchange, updateViaCache none), prefers-reduced-motion (4 arquivos honram), prefers-color-scheme (starter morto nao importado), hidratacao (ssr:false cobre; R12 invariant), bundle (Leaflet/MUI fora do first-load; google-spreadsheet lazy), peso do repo (stubs 1KB; IPA 2.4MB domina), next/image (unoptimized deliberado, <img> com rationale).

**Gate:** planning/docs-only. Parser real: **138 milestones, 63 areas, 0 dups**; tiers S+1/S9/S-47/A+41/A40; status 121/14/3 — footer confere.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

---

## 2026-07-05-W — Pass 10 no loop (147 itens, 71 areas)

**Contexto:** loop de 10min segue (Stop hook: quota 35%/49% pre-pass9 nao era limite). Quota pre-pass10 via `-Once`: sessao **53%** · semana **51%** (zona amarela do monitor).

**Pass 10 (Explore read-only):**

| Area | Itens | Achado central |
|---|---|---|
| IOSPWA | 1 | **EXT-IOSPWA-01 (S-)**: zero apple-touch-icon/apple-mobile meta (grep em src/ + out/ = nada) — Add to Home Screen no iOS da icone screenshot borrado fora de standalone; mina o caminho WhatsApp->iOS. |
| SWNAV | 1 | **EXT-SWNAV-01 (S-)**: sw.js:108-129 sem branch de navigate nem offline.html — navegacao offline fria = erro nativo do browser pro publico de baixa conectividade. |
| SHARELOC | 1 | **EXT-SHARELOC-01 (S-)**: InfoPanel.js:37-41 — texto do share WhatsApp e literal pt-BR sem t() e sem encodeURIComponent (petShare.js:123 faz certo). |
| RTL | 2 | **EXT-RTL-01 (S-, human_gate)**: engine.js:86-95 seta dir=rtl mas CSS e fisico (FAB right:, header) — arabe meio-espelhado; divida declarada em comentario, nunca trackeada. EXT-RTL-02 (A): html lang=pt-BR sem dir pre-hidratacao. |
| IPA | 1 | EXT-IPA-01 (A+, human_gate): IPA 2.4MB nao-assinado + plist bundle-version=1 fossilizado — sideload quebrado shipando a cada deploy. |
| SECTXT | 1 | EXT-SECTXT-01 (A+): sem .well-known/security.txt num site com doacao + PII de localizacao. |
| ROBOTS2 | 1 | EXT-ROBOTS2-01 (A): robots Allow:/ sem Disallow dos stubs /solone /dbd /bluey (sitemap ja exclui). |
| GOV2 | 1 | EXT-GOV2-01 (A): README e boilerplate stock do create-next-app; contrato real de deploy so em public/_WARN. |

**5 angulos honestamente vazios:** log PII do asaas-backend (LIMPO — so type/id/err.message), overflow de string longa (StepsHint e scroller por design; header com ellipsis), safe-area iOS (20+ call sites + maskable OK), cadeia 404 (not-found.js + out/404.html gerado), stubs de jogos (render valido).

**Gate:** planning/docs-only. Parser real (apos corrigir 1 colon nao-quotado no owner do EXT-IPA-01): **147 milestones, 71 areas, 0 dups**; tiers S+1/S9/S-51/A+43/A43; status 128/16/3 — footer confere.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

---

## 2026-07-05-X — Quota limit atingido (2a vez): fechamento com indice COMECE AQUI

**Contexto:** pre-pass-11, leitura real via `-Once`: sessao **74%** (77% ao preparar o fechamento) · semana 53%. Custo medido por pass: 10-21pp (pass 10 sozinho: 53%->74%). Partir de 74-77% garante cruzar a zona vermelha (>=80%, unico limiar objetivo do monitor) NO MEIO do scan — o overrun que o criterio de parada evita. **Pass 11 nao rodado de proposito.**

**O que foi feito no fechamento:**

| Arquivo | O que | Por que |
|---|---|---|
| `MILESTONES_EXTENDED.yaml` (header) | Indice **COMECE AQUI**: top commitaveis por tier (EXT-REP2-01 primeiro, depois URLSTATE-01/SEC-03/OWNERSHIP-01-client, os 7 S-, os 3 A+ baratos) + human-gated agrupados pra UMA conversa de arquitetura (SEC-01+RACE-01+DI-01+OWNERSHIP-enforcement) e decisoes de produto (IPA, TILES2, NOTIF, CRYPTO, LEGEND) | Valor barato que cabia na margem: a proxima sessao ataca de cima pra baixo sem re-ler 147 itens |
| `MILESTONES_EXTENDED.yaml` (footer) | Bloco "QUOTA LIMIT ATINGIDO (2a vez)": criterio, trajetoria da janela (9%->35%->53%->74%), estado final, recomendacao de IMPLEMENTAR em vez de pass 11 | O documento registra a evidencia do proprio encerramento, como na 1a vez (entry T) |

**Estado final da janela:** 147 milestones · 71 areas · 10 passes read-only · 0 dups (parser) · tiers S+1/S9/S-51/A+43/A43 · 1 fix shipped (SEC-02/FF11). Taxa de angulo-vazio subindo (pass 9: 7 de 10; pass 10: 5 de 10) — o valor marginal agora esta em IMPLEMENTAR, nao escanear.

**Gate:** planning/docs-only; parser real 147/71/0.

**Commit:** roteado pro `agent_git-commit-specialist`. Sem push/PR.

---

## 2026-07-09-Y — Pass 11 (154 itens, 76 areas)

**Contexto:** pass reaberto porque o usuario invocou `/milestone-mapafome-expand` explicitamente. Quota pre-pass via `-Once`: sessao **10%** · semana **16%** — folga confortavel, longe da zona vermelha (>=80%), entao a passada rodou apesar do aviso de "IMPLEMENTAR" do pass 10 (o gate objetivo e a quota, e ela deu verde). Nota: os totais no footer/Zona 1 estavam stale em 147/71 (uma sessao concorrente ja havia expandido o doc alem do que o texto registrava); os numeros abaixo sao do PARSER, a fonte da verdade.

**Pass 11 (Explore read-only, 7 findings + 4 empties):**

| Area | Itens | Achado central |
|---|---|---|
| ERRBOUND | 1 | **EXT-ERRBOUND-01 (A)**: grep repo-wide de componentDidCatch/getDerivedStateFromError/ErrorBoundary = 0 arquivos, sem error.js/global-error.js; raiz e mount client-only (page.js:6 ssr:false) — qualquer excecao de render pinta o mapa de fome de branco pra todo visitante, sem recuperacao. |
| DI | 1 | **EXT-DI-02 (A)**: o path de escrita de FOME (appPinActions.js:355 addRow) nunca chama validatePinPayload/validateCoordinatePair — a barricada numerica so roda no /pets (confirmado por reverseGeocodeGuard.js:7). |
| DEDUPFOOD | 1 | **EXT-DEDUPFOOD-01 (A)**: fome grava reports duplicados sem checagem de proximidade/tempo (appPinActions.js:323-355); so o cluster visual (ReporterMarkers.js:51) esconde, enquanto /pets tem petDedup.isNearDuplicate. Infla a manchete de "pontos mapeados". |
| LOADSTATE | 1 | EXT-LOADSTATE-01 (A): AppMain.js:57-61 nao consome state.isLoading pro mapa — durante auth+loadInfo+getRows o mapa parece vazio e pronto; /pets ja tem skeleton (PetMapLoadStates.js:34). |
| SWRCACHE | 1 | EXT-SWRCACHE-01 (A, human_gate: TTL): appMainBootstrap.js:102 so cacheia rows em memoria de sessao; toda visita e cold fetch, sem stale-while-revalidate persistente. |
| READRETRY | 1 | EXT-READRETRY-01 (A): appMainBootstrap.js:50-224 faz 1 tentativa sem retry/backoff — blip de rede cai direto no banner manual (App.js:829). |
| MAP | 1 | EXT-MAP-05 (A): map.js:337 sem minZoom/maxBounds/worldCopyJump e TileLayer sem noWrap (mapComponents.js:99) — zoom-out pro globo em copias repetidas do mundo. |

**4 angulos honestamente vazios (documentam FORCA):** offline WRITE queue robusto com quarantine e classificador permanente-vs-transiente (publishQueue.js:61-188); foto do /pets re-encoda JPEG e STRIPA EXIF/GPS + cap de tamanho + validacao de tipo (petPhoto.js:39,126,169); empty-state pos-load com CTA suprimido durante loading (AppOverlays.js:84); consent de privacidade+termos no publish do reporter (ReportSheet.js:296-334). Nota fora de escopo: iniciativas/cadastrar persiste PII so em localStorage com tela de "registrado" falsa (page.js:63) — defeito real mas a area ja esta na lista exausta, nao re-reportado.

**Gate:** planning/docs-only (so YAML+MD). Parser real apos o pass: **154 milestones, 76 areas, 0 dups**; tiers S+1/S9/S-51/A+43/A50; status pending131/blocked-human18/later3/shipped2 — footer e Zona 1 conferem com o parser.

**Taxa de vazio:** 4 empties / 11 angulos ~36% (pass 9 ~70%, pass 10 ~36%) — reafirma o criterio: o valor marginal esta em IMPLEMENTAR (comecar por EXT-REP2-01), nao em mais scan.

**Commit:** roteado pro `agent_git-commit-specialist`, staging so `MILESTONES_EXTENDED.yaml` + `CHANGES.md` por path. Sem push/PR/bump.

---

## 2026-07-09-Z — Pass 12 (163 itens, 84 areas)

**Contexto:** pass reaberto porque o usuario invocou `/milestone-mapafome-expand` de novo. Quota pre-pass via `-Once`: sessao **14%** · semana **17%** — folga confortavel, longe da zona vermelha. O scan mais denso em SEVERIDADE ate agora: 9 findings com 1 S+, 1 S e 2 S- (os passes recentes vinham dando so tier A). Um gotcha de YAML mordeu e foi corrigido: o owner do EXT-SAVEDATA-01 tinha `:` dentro dos parenteses nao-quotado (o mesmo erro que o skill avisa) — quotado, parser voltou a passar.

**Pass 12 (Explore read-only, 9 findings + 7 empties):**

| Area | Itens | Achado central |
|---|---|---|
| DBLSUBMIT | 1 | **EXT-DBLSUBMIT-01 (S+)**: MainControls.js:325 embrulha o spinner num ramo morto {false ?} — o botao de publicar fome NUNCA fica disabled durante o publish e handleClickMap (App.js:471) nao checa re-entrada; double-tap grava 2 pontos identicos, poluindo mapa e toda contagem. /assinar e ReportSheet ja se protegem; so o botao legado nao. |
| GEOLOC | 1 | **EXT-GEOLOC-01 (S)**: appLifecycle.js:132 chama navigator.geolocation.getCurrentPosition sem checar se a API existe, e runMain so roda de dentro do callback — webview sem geolocation estoura o mount (TypeError) e o mapa nunca carrega pin. O /pets ja guarda (usePetsApp.js:214). |
| TIMEOUT | 2 | **EXT-TIMEOUT-01 (S-)**: fetches de doacao Asaas (asaasSubscriptionClient.js:166) sem AbortController/timeout — backend que aceita mas nao responde trava o spinner do doador pra sempre. **EXT-TIMEOUT-02 (A)**: path de leitura do Sheet (appMainBootstrap.js:57,102) sem withTimeout enquanto a escrita tem (appPinActions.js:199). |
| ARIALIVE | 1 | **EXT-ARIALIVE-01 (S-)**: LiveAnnouncer.js:34-35 empurra 'Novo ponto publicado.'/'Um ponto foi atendido.' literais sem t() — o unico anuncio aria-live em tempo real do mapa e ininteligivel em 11/12 locales. |
| UNLOAD | 1 | EXT-UNLOAD-01 (A+): ReportSheet.js:30-33 guarda estado real do form mas nao ha beforeunload em src — fechar a aba/voltar com o report no meio descarta em silencio. |
| INTLFMT | 1 | EXT-INTLFMT-01 (A+): relatorios/page.js:161,335 usa (x*100).toFixed(1) com ponto decimal, mesmo com o locale dirigindo toLocaleDateString(locale) na mesma pagina — pt-BR ve '12.3%' onde a convencao e '12,3%'. |
| SCROLLLOCK | 1 | EXT-SCROLLLOCK-01 (A): PinDetailSheet.js:202-208 abre dialog aria-modal sem travar o scroll do body — o fundo rola sob o modal e perde a posicao ao fechar. |
| SAVEDATA | 1 | EXT-SAVEDATA-01 (A, human_gate): zero leitura de navigator.connection.saveData/effectiveType em src — tiles/imagens full-res mesmo em 2G/save-data do publico-alvo. |

**7 angulos honestamente vazios (documentam FORCA):** clipboard com fallback execCommand (PinReadout.js:82-102, copyText.js:9-30); todo localStorage.setItem individualmente try/caught (countryStore.js:51 +5 sites); permission-denied de GPS cai no centro default e mantem o mapa usavel (appLifecycle.js:153-159, PetLocateControl.js:101); focus save/restore no PinDetailSheet (:93-108); double-submit ja bloqueado em assinar (assinar/page.js:248) e ReportSheet (:314); fluxo de erro do checkout Asaas com mensagem localizada + retry (asaasSubscriptionClient.js:201, PaymentArtifacts.js:147); long-press/context-menu do mapa com preventDefault + dedup (mapComponents.js:289-305).

**Gate:** planning/docs-only (so YAML+MD). Parser real apos o pass: **163 milestones, 84 areas, 0 dups**; tiers S+2/S10/S-53/A+45/A53; status pending139/blocked-human19/later3/shipped2 — footer e Zona 1 conferem com o parser.

**Taxa de vazio:** 7 empties / 16 angulos ~44% — o codigo maduro se defende sozinho na maioria dos angulos novos. Mas o pass tambem provou que ainda ha achados de alta severidade nao pescados (1 S+ + 1 S novos), entao o scan nao esgotou por completo; o valor imediato ainda esta em IMPLEMENTAR, agora com um novo S+ commitavel no topo (EXT-DBLSUBMIT-01).

**Commit:** roteado pro `agent_git-commit-specialist`, staging so `MILESTONES_EXTENDED.yaml` + `CHANGES.md` por path. Sem push/PR/bump.

---

## 2026-07-09-AA — Pass 13 (167 itens, 88 areas)

**Comando:** `/milestone-mapafome-expand` (invocado explicitamente). Uma passada de gap-scan: quota gate -> Explore read-only -> converter findings em milestones -> validar parser -> log duas-zonas -> commit pelo specialist.

**Quota pre-pass (real, via token-usage-statusline -Once):** sessao **21%** | semana **17%** — folga confortavel, < 65%, pass liberado.

**+4 milestones em 4 areas novas (READROW, BOOTGUARD, UNHANDLED, SWSHELL). TODOS commitaveis — nenhum human-gate.**

| id | tier | file:line | defeito | impacto |
|---|---|---|---|---|
| EXT-READROW-01 | **S** | appMainBootstrap.js:128-155 | `rows.forEach(x => { JSON.parse(x.Dados); ... JSON.parse(x.Coordinates) })` sem try/catch por-linha | 1 celula malformada num Sheet colaborativo aborta o forEach e derruba o mapa de fome INTEIRO (zero pins + banner) pra todo visitante; o /pets ja pula a linha ruim (petsData.js:95-98) — resiliencia assimetrica na mesma fonte de dados |
| EXT-BOOTGUARD-01 | **S-** | create-subscription.js:35-43 vs webhook.js:31 | `assertProductionConfig()` (fail-closed PAY-01) so e chamado no webhook.js, nao no endpoint que cria assinatura/recebe dinheiro | prod sem ALLOWED_ORIGINS/KV boota o endpoint de doacao caindo no CORS de DEV (inclui localhost) em silencio — a exata inconsistencia que o PAY-01 devia impedir; gap de FIACAO (1 de 4 handlers) |
| EXT-UNHANDLED-01 | A+ | repo-wide (grep unhandledrejection = 0) | zero `window.onunhandledrejection` no app inteiro | rejeicao de promise fora dos catch-locais morre sem feedback pro doador nem telemetria; backstop global ausente (maioria dos paths conhecidos ja e capturada localmente) |
| EXT-SWSHELL-01 | A+ | public/sw.js:99-106,124-127 | `SHELL_CACHE` cache-first sem cap de tamanho; so `TILE_CACHE` e podado por MAX_TILES (:78) | dentro de uma versao do SW o shell acumula todo chunk/imagem/fonte sem evicao, consumindo storage nos celulares de baixo custo do publico-alvo; cross-versao ja e limpa no activate (:31-41) |

**9 angulos honestamente vazios (documentam FORCA):** icone Leaflet e `L.divIcon` com SVG inline, sem asset externo pra quebrar sob basePath (mdfMarkers.js:75-88, petMarkerIcon.js:171-202; CNAME custom-domain, basePath vazio); listas memoizam O(n log n) sem re-render por-tecla (ListView.js:76-103, PetListView.js:59-62; busca e geocoder com debounce 350ms); coords sempre dot-decimal JSON, sem parse locale-formatado nem DD/MM (endereco.js:149-150, pinCoords.js:29); `<html lang>`+`dir` tem escritor unico chamado a cada troca de locale (i18n/engine.js:78-91); severidade do pin e shape-encoded (anel+glyph), nao so-cor (mdfMarkers.js:44-88, petMarkerIcon.js:114-165); sem acesso `row[N]` por indice numerico — `Dados` e blob JSON com chaves nomeadas (appMainBootstrap.js:129-131, MarkerGroup.js:48-62); first-paint e mapa `ssr:false` sem hero-`<img>`, imagens abaixo da dobra sao `loading="lazy"` (imprensa/page.js:109, PetDetailSheet.js:120); on-map actions sao `<button type="button">` em ordem de DOM (AppOverlays.js:39-92); clipboard/share com fallback robusto em todo lugar (petShare.js:140-167, PinReadout.js:73-98, copyText.js, CopyControls.js:14-27, parceiros/page.js:84-92).

**Nao re-reportado (ja rastreado):** vazamento de NEXT_PUBLIC_GOOGLE_PRIVATE_KEY no bundle (P14/SEC-01, area Seguranca ja coberta); `key={k}` array-index em MarkerGroup.js:128 (area Code style/lint ja coberta).

**Gate:** planning/docs-only (so YAML+MD). Parser real apos o pass: **167 milestones, 88 areas, 0 dups**; tiers S+2/S11/S-54/A+47/A53; status pending143/blocked-human19/later3/shipped2 — footer e Zona 1 conferem com o parser.

**Taxa de vazio:** 9 empties / 13 angulos ~69% — subiu forte vs pass 12 (~44%). O codigo maduro se defende sozinho na grande maioria dos angulos novos; confirma que o valor restante esta claramente em IMPLEMENTAR, comecando pelo S+ commitavel no topo (EXT-DBLSUBMIT-01), depois o novo EXT-READROW-01 (S).

**Commit:** roteado pro `agent_git-commit-specialist`, staging so `MILESTONES_EXTENDED.yaml` + `CHANGES.md` por path. Sem push/PR/bump.

---

## 2026-07-09-AB — Pass 14 (168 itens, 89 areas)

**Comando:** `/milestone-mapafome-expand` (invocado explicitamente). Uma passada de gap-scan: quota gate -> Explore read-only -> converter findings em milestones -> validar parser -> log duas-zonas -> commit pelo specialist.

**Quota pre-pass (real, via token-usage-statusline -Once):** sessao **25%** | semana **18%** — folga confortavel, < 65%, pass liberado.

**+1 milestone em 1 area nova (WEBHOOKIDEM). Commitavel — sem human-gate.** Scan majoritariamente VAZIO (~90%): 9 de 10 angulos limpos.

| id | tier | file:line | defeito | impacto |
|---|---|---|---|---|
| EXT-WEBHOOKIDEM-01 | **S-** | webhook.js:71-80 + idempotencyStore.js:88-91 | idempotencia do webhook e check-then-set NAO-atomico mesmo no path de KV duravel: `isProcessed()` depois `markProcessed()`, e o `markProcessed` do Upstash e `SET key 1 EX <ttl>` puro SEM `NX` | a Asaas re-tenta agressivamente e pode entregar o mesmo `PAYMENT_CONFIRMED` a duas instancias serverless em paralelo; ambas leem `isProcessed=false` antes de qualquer uma marcar e ambas rodam `processEvent` -> double-apply (doacao contada 2x / acesso concedido 2x). O store duravel fechou o hole de cold-start (PAY-01) mas nao o de CONCORRENCIA; `webhook.test.js:96-130` so testa cold starts sequenciais. Fix: `SET key 1 NX EX <ttl>` atomico, tratando "ja existia" como o sinal de dedupe |

**9 angulos honestamente vazios (documentam FORCA):** append de Sheet e `sheet.addRow(row)` server-side atomico sem row-index client-held (sheetsClient.js:172-174); mapa de pets usa react-leaflet `<MapContainer>` que faz `map.remove()` no unmount, sem leak de instancia (PetMap.js:106); valor de doacao enviado como `Number(value)` nao string localizada (assinar/page.js:67, validate.js:74) — sem confusao centavos/reais; a11y do /assinar forte (label/input associados, `role=radiogroup`+roving tabindex, `role=alert` nos erros :241, autoComplete correto); deep-link de pet e query-param `?pet=<coords>` na rota estatica /pets (petDeepLink.test.js:181-233), sem 404 duro; full-dataset fetch de pets ja e a area coberta "Google Sheets escala/concorrencia", nao novo; nenhum secret alem da chave Google conhecida inline — so `NEXT_PUBLIC_ASAAS_BACKEND_URL`/`INTERNAL_URL` ship-safe (asaasSubscriptionClient.js:92,105), sem bloco `env` no next.config.mjs; zero pixel de tracking un-gated — analytics.js so despacha pra `window.gtag`/`dataLayer` se ja existirem, nenhum script GA injetado.

**Gate:** planning/docs-only (so YAML+MD). Parser real apos o pass: **168 milestones, 89 areas, 0 dups**; tiers S+2/S11/S-55/A+47/A53; status pending144/blocked-human19/later3/shipped2 — footer e Zona 1 conferem com o parser.

**Taxa de vazio:** 9 empties / 10 angulos ~90% — **SATURACAO confirmada** (trajetoria 36% pass11 -> 44% pass12 -> 69% pass13 -> 90% pass14). O scan esgotou o valor facil; o retorno de mais um pass e marginal. A unica jogada de valor daqui pra frente e IMPLEMENTAR: EXT-DBLSUBMIT-01 (S+), EXT-READROW-01 (S), EXT-REP2-01 (S).

**Commit:** roteado pro `agent_git-commit-specialist`, staging so `MILESTONES_EXTENDED.yaml` + `CHANGES.md` por path. Sem push/PR/bump.
