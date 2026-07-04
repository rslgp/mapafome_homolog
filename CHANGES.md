<!--
  CHANGES.md — log de modificacoes do MAPA FOME.
  Padrao de log salvo no vault: 40-LICOES/2026-07-04-padrao-de-log-append-only-com-cabecalho-de-acesso-rapido.md
  DUAS zonas: (1) cabecalho de acesso rapido no topo (REESCRITO a cada sessao) +
              (2) corpo append-only cronologico abaixo (NUNCA reescrito).
-->

# CHANGES — MAPA FOME

<!-- ============ ZONA 1: ACESSO RAPIDO (so este bloco se reescreve) ============ -->

> **LAST_UPDATED:** 2026-07-04 · branch `loop/mapafome` · ultimo commit relevante: `5cab413 docs(roadmap)` (QA-01 aguardando commit via agent_git-commit-specialist)
> **HOW_TO_READ:** o topo (esta zona) e o RESUMO do estado atual — leia so isto pra se orientar. O corpo abaixo e APPEND-ONLY cronologico; desca por uma ancora do QUICK_INDEX quando precisar do detalhe. So esta zona 1 e reescrita; nunca edite uma entrada antiga da zona 2.
> **ROADMAPS:** `ROADMAP_VERTENTES.yaml` (multi-vertente) · `UIUX_MILESTONES.yaml` (UI/UX) · `MILESTONES.yaml` (P-series/pagamento). Gate SOT em `CLAUDE.md`.

### QUICK_INDEX (mais novo -> mais velho)
- [`2026-07-04-D`](#2026-07-04-d--qa-01-shipped-gate-de-teste-oom-safe-por-default) — **QA-01 SHIPPED**: vitest.config forca forks+singleFork+no-file-parallelism; `npm run test` plano agora e OOM-safe. Gate verde.
- [`2026-07-04-C`](#2026-07-04-c--seo-02-shipped-sitemap--robots-dinamicos) — **SEO-02 SHIPPED**: sitemap.js + robots.js dinamicos; aposentados os 3 estaticos stale de 2022. Gate verde.
- [`2026-07-04-B`](#2026-07-04-b--seo-01-shipped-corrige-self-canonical-em-3-rotas) — **SEO-01 SHIPPED**: 3 layout.js novos (relatorios/relatorio-marketing/iniciativas-cadastrar) — corrige self-canonical. Gate verde.
- [`2026-07-04-A`](#2026-07-04-a--deep-analysis--roadmap-multi-vertente) — Deep-analysis do produto (11 vertentes) + criado `ROADMAP_VERTENTES.yaml` (30 milestones) + este log + licao de padrao-de-log no vault.

### STATUS_TALLY (ROADMAP_VERTENTES.yaml)
- **30 milestones** · pending **21** · blocked-human **5** · later **1** · **shipped 3** (SEO-01, SEO-02, QA-01).
- Por tier: **S+ 3** · S 8 · A 10 · B 9.
- Por vertente: V1 core-fome 2 · V2 pet 5 · V3 asaas 3 · V4 i18n 2 · V5 pwa 3 · V6 relatorios 2 · V7 parceiros 3 · V8 seo 4 (2 shipped) · V9 qa 2 (1 shipped) · V10 seguranca 3 · V11 governanca 1.

### OPEN_THREADS (o que a proxima sessao pega primeiro)
1. **PET-02 / PAY-01 / I18N-01** (S, pending, commitaveis): proximos maior-tier. PET-02 (ligar o dedup de pets ja construido) e o mais barato (dead code -> caller). Depois SEO-03 (A, JSON-LD).
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
