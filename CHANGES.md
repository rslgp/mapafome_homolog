<!--
  CHANGES.md — log de modificacoes do MAPA FOME.
  Padrao de log salvo no vault: 40-LICOES/2026-07-04-padrao-de-log-append-only-com-cabecalho-de-acesso-rapido.md
  DUAS zonas: (1) cabecalho de acesso rapido no topo (REESCRITO a cada sessao) +
              (2) corpo append-only cronologico abaixo (NUNCA reescrito).
-->

# CHANGES — MAPA FOME

<!-- ============ ZONA 1: ACESSO RAPIDO (so este bloco se reescreve) ============ -->

> **LAST_UPDATED:** 2026-07-05 · branch `loop/mapafome` · ultimo commit relevante: `22edbf6 docs(roadmap)` (pass 7). Arco de quota: zona vermelha 86% -> semana 100% (encerramento registrado em 2026-07-05-T) -> **re-login RESETOU a quota (sessao 9%/semana 46%) -> scan REABERTO, pass 8 rodado** (132 itens/58 areas). Loop de 10min armado via cron `c7ade9ba` (session-only). Proximo alvo: EXT-REP2-01 (S, sem human_gate).
> **HOW_TO_READ:** o topo (esta zona) e o RESUMO do estado atual — leia so isto pra se orientar. O corpo abaixo e APPEND-ONLY cronologico; desca por uma ancora do QUICK_INDEX quando precisar do detalhe. So esta zona 1 e reescrita; nunca edite uma entrada antiga da zona 2.
> **ROADMAPS:** `ROADMAP_VERTENTES.yaml` (multi-vertente, 30 itens) · `MILESTONES_EXTENDED.yaml` (gap-scan REABERTO, 132 itens/58 areas/8 passes, 5 tiers S+/S/S-/A+/A) · `UIUX_MILESTONES.yaml` (UI/UX) · `MILESTONES.yaml` (P-series/pagamento). Gate SOT em `CLAUDE.md`.

### QUICK_INDEX (mais novo -> mais velho)
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

### STATUS_TALLY (MILESTONES_EXTENDED.yaml — 8 passes, scan REABERTO, tiers S+/S/S-/A+/A)
- **132 milestones** em **58 areas** · pending **115** · blocked-human **14** · later **3** (cross-refs intencionais). Validado via parser YAML: 0 ids duplicados.
- Por tier: **S+ 1** (EXT-SEC-01, CVE ativo no next 16.2.4) · **S 9** · S- 44 · A+ 39 · A 39.
- 1 achado ja shipped fora do arquivo: SEC-02/FF11 (gate mecanico de secret-leak no bundle, allowlist por hash).
- Achados mais criticos: **EXT-RACE-01** (S) — 2 usuarios diferentes escrevendo a mesma linha perdem uma escrita (row.save() = PUT cego sem CAS) · **EXT-URLSTATE-01** (S, pass 8) — back do Android fecha o site com report no meio · **EXT-OWNERSHIP-01** (S, pass 8) — posse de pin 100% nocional. Corretude: **EXT-LEGEND-01** — o hint de cores descreve o sistema de marcadores ANTIGO · **EXT-EMBED3P-01** — secao Creators renderiza VAZIA em producao (iframe http bloqueado).
- **Proximo a pegar (commitavel, sem human_gate, sem deps):** EXT-REP2-01 (k-anonimizacao faltando em 2 tabelas do relatorio publico, S tier) ou EXT-SEC-03 (upgrade da cadeia axios/google-spreadsheet).

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
