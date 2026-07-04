<!--
  CHANGES.md — log de modificacoes do MAPA FOME.
  Padrao de log salvo no vault: 40-LICOES/2026-07-04-padrao-de-log-append-only-com-cabecalho-de-acesso-rapido.md
  DUAS zonas: (1) cabecalho de acesso rapido no topo (REESCRITO a cada sessao) +
              (2) corpo append-only cronologico abaixo (NUNCA reescrito).
-->

# CHANGES — MAPA FOME

<!-- ============ ZONA 1: ACESSO RAPIDO (so este bloco se reescreve) ============ -->

> **LAST_UPDATED:** 2026-07-04 · branch `loop/mapafome` · ultimo commit relevante: `a9df92c fix(ux): remove scroll-progress bar` (SEO-01 aguardando commit via agent_git-commit-specialist)
> **HOW_TO_READ:** o topo (esta zona) e o RESUMO do estado atual — leia so isto pra se orientar. O corpo abaixo e APPEND-ONLY cronologico; desca por uma ancora do QUICK_INDEX quando precisar do detalhe. So esta zona 1 e reescrita; nunca edite uma entrada antiga da zona 2.
> **ROADMAPS:** `ROADMAP_VERTENTES.yaml` (multi-vertente) · `UIUX_MILESTONES.yaml` (UI/UX) · `MILESTONES.yaml` (P-series/pagamento). Gate SOT em `CLAUDE.md`.

### QUICK_INDEX (mais novo -> mais velho)
- [`2026-07-04-B`](#2026-07-04-b--seo-01-shipped-corrige-self-canonical-em-3-rotas) — **SEO-01 SHIPPED**: 3 layout.js novos (relatorios/relatorio-marketing/iniciativas-cadastrar) — corrige self-canonical. Gate verde.
- [`2026-07-04-A`](#2026-07-04-a--deep-analysis--roadmap-multi-vertente) — Deep-analysis do produto (11 vertentes) + criado `ROADMAP_VERTENTES.yaml` (30 milestones) + este log + licao de padrao-de-log no vault.

### STATUS_TALLY (ROADMAP_VERTENTES.yaml)
- **30 milestones** · pending **23** · blocked-human **5** · later **1** · **shipped 1** (SEO-01).
- Por tier: **S+ 3** · S 8 · A 10 · B 9.
- Por vertente: V1 core-fome 2 · V2 pet 5 · V3 asaas 3 · V4 i18n 2 · V5 pwa 3 · V6 relatorios 2 · V7 parceiros 3 · V8 seo 4 (1 shipped) · V9 qa 2 · V10 seguranca 3 · V11 governanca 1.

### OPEN_THREADS (o que a proxima sessao pega primeiro)
1. **SEO-02** (S, pending, commitavel): sitemap dinamico (app/sitemap.js) + `Sitemap:` no robots.txt; aposentar o sitemap.xml stale de 2022. **Proximo "go ship" natural** (segue SEO-01 na mesma vertente, alto valor de descoberta).
2. **SEC-01** (S+, blocked-human): tirar a chave privada Google do bundle client via proxy de escrita. RAIZ de quase todo risco de abuso. Claude PROPOE o desenho, humano provisiona o segredo.
3. **PET-01 / INIT-01** (S+/S, blocked-human): backend de upload de foto de pet e persistencia de iniciativas — ambos dependem de um destino server-side (relacionado a SEC-01).

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
