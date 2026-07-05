<!--
  CHANGES.md — log de modificacoes do MAPA FOME.
  Padrao de log salvo no vault: 40-LICOES/2026-07-04-padrao-de-log-append-only-com-cabecalho-de-acesso-rapido.md
  DUAS zonas: (1) cabecalho de acesso rapido no topo (REESCRITO a cada sessao) +
              (2) corpo append-only cronologico abaixo (NUNCA reescrito).
-->

# CHANGES — MAPA FOME

<!-- ============ ZONA 1: ACESSO RAPIDO (so este bloco se reescreve) ============ -->

> **LAST_UPDATED:** 2026-07-04 · branch `loop/mapafome` · ultimo commit relevante: `9f96abd docs(roadmap)` (SEO-03 aguardando commit via agent_git-commit-specialist)
> **HOW_TO_READ:** o topo (esta zona) e o RESUMO do estado atual — leia so isto pra se orientar. O corpo abaixo e APPEND-ONLY cronologico; desca por uma ancora do QUICK_INDEX quando precisar do detalhe. So esta zona 1 e reescrita; nunca edite uma entrada antiga da zona 2.
> **ROADMAPS:** `ROADMAP_VERTENTES.yaml` (multi-vertente) · `UIUX_MILESTONES.yaml` (UI/UX) · `MILESTONES.yaml` (P-series/pagamento). Gate SOT em `CLAUDE.md`.

### QUICK_INDEX (mais novo -> mais velho)
- [`2026-07-04-H`](#2026-07-04-h--seo-03-shipped-json-ld-schemaorg-ngo--dataset) — **SEO-03 SHIPPED**: JSON-LD schema.org — NGO no root + Dataset nas 2 paginas de relatorio (SOT em structuredData.js). +7 testes. Gate verde.
- [`2026-07-04-G`](#2026-07-04-g--i18n-01-shipped-relative-time-sensivel-ao-locale) — **I18N-01 SHIPPED** (parcial: core relative-time): formatRelativeTime segue o locale ativo (era pt-BR fixo); cleanold pinado em pt-BR. +7 testes. Corrigido export de DEFAULT_LOCALE. Gate verde.
- [`2026-07-04-F`](#2026-07-04-f--pay-01-shipped-fail-closed-na-config-de-producao-do-asaas-backend) — **PAY-01 SHIPPED**: assertProductionConfig — o asaas-backend RECUSA subir em prod sem KV duravel ou sem allowlist de CORS. 98/98 backend.
- [`2026-07-04-E`](#2026-07-04-e--pet-02-shipped-dedup-visual-de-pets--fixup-do-qa-01) — **PET-02 SHIPPED**: liga o dedup de pets (dead code) no PetMarkers — 1 pino por grupo. + FIXUP do QA-01 (poolOptions removido no Vitest 4). Gate verde.
- [`2026-07-04-D`](#2026-07-04-d--qa-01-shipped-gate-de-teste-oom-safe-por-default) — **QA-01 SHIPPED**: vitest.config forca forks+singleFork+no-file-parallelism; `npm run test` plano agora e OOM-safe. Gate verde. (config corrigida em 2026-07-04-E)
- [`2026-07-04-C`](#2026-07-04-c--seo-02-shipped-sitemap--robots-dinamicos) — **SEO-02 SHIPPED**: sitemap.js + robots.js dinamicos; aposentados os 3 estaticos stale de 2022. Gate verde.
- [`2026-07-04-B`](#2026-07-04-b--seo-01-shipped-corrige-self-canonical-em-3-rotas) — **SEO-01 SHIPPED**: 3 layout.js novos (relatorios/relatorio-marketing/iniciativas-cadastrar) — corrige self-canonical. Gate verde.
- [`2026-07-04-A`](#2026-07-04-a--deep-analysis--roadmap-multi-vertente) — Deep-analysis do produto (11 vertentes) + criado `ROADMAP_VERTENTES.yaml` (30 milestones) + este log + licao de padrao-de-log no vault.

### STATUS_TALLY (ROADMAP_VERTENTES.yaml)
- **30 milestones** · pending **17** · blocked-human **5** · later **1** · **shipped 7** (SEO-01/02/03, QA-01, PET-02, PAY-01, I18N-01).
- Por tier: **S+ 3** · S 8 · A 10 · B 9.
- Por vertente: V1 core-fome 2 · V2 pet 5 (1 shipped) · V3 asaas 3 (1 shipped) · V4 i18n 2 (1 shipped) · V5 pwa 3 · V6 relatorios 2 · V7 parceiros 3 · V8 seo 4 (3 shipped) · V9 qa 2 (1 shipped) · V10 seguranca 3 · V11 governanca 1.
- **Todos os S+/S commitaveis shippados.** Restam: 9 A + 8 B commitaveis + 5 blocked-human + 1 later.

### OPEN_THREADS (o que a proxima sessao pega primeiro)
1. **A-tier commitaveis** (proximos): SEC-03 (hygiene pet.contact), PET-03/PET-04, REP-01, PWA-01, QA-02, FOME-01, INIT-02(dep INIT-01).
2. **SEC-01** (S+, blocked-human): chave Google no bundle -> proxy. RAIZ do risco. Claude PROPOE, humano provisiona.
3. **PET-01/INIT-01/PAY-02/SEO-04/FOME-02** (blocked-human/later): acao humana (storage/destino/efeito/decisao) ou dep de SEC-01.
2. **SEC-01** (S+, blocked-human): tirar a chave privada Google do bundle client via proxy de escrita. RAIZ de quase todo risco de abuso. Claude PROPOE o desenho, humano provisiona o segredo.
3. **PET-01 / INIT-01 / PAY-02 / SEO-04 / FOME-02** (blocked-human/later): dependem de acao humana (storage, destino, efeito de negocio, decisao de produto, ou dep de SEC-01). NAO auto-shippaveis.

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
