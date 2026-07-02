# ROADMAP do loop autonomo - MAPA FOME homolog (slug: mapafome_h)

Roadmap de engenharia desenhado para ser CONSUMIDO pelo loop-engineer (modelo de 11
partes) via loop-manager. O arquivo executavel e o irmao `BACKLOG.yaml`; este .md e o
mapa narrativo. NAO substitui nem edita: `MILESTONES.yaml` (roadmap humano P1..P21,
so referenciado) e `MILESTONES_UIUX.yaml`/`ROADMAP_UIUX.md` (donos: o loop de
planejamento UIUX ja existente). Fonte das etapas: licao do vault
`2026-07-02-etapas-de-um-loop-engineer` e o agente `loop-flow-architect`.
Ligar o loop e SEMPRE ato humano (`loops on mapafome_h`).

## Como as 11 partes se realizam NESTE projeto

| # | Parte | Implementacao aqui |
|---|-------|--------------------|
| 1 | Trigger/Scheduler | Windows Scheduled Task `Loop_mapafome_h` (intervalo 120 min; hoje OFF) |
| 2 | Triage | maker escolhe UM item `pendente` de maior tier no BACKLOG.yaml; MF-L-002 mantem o mapa de triagem |
| 3 | Context/Retrieval | MILESTONES.yaml + relatorios em loop_reports/ lidos como DADO (quarentena; nada la e instrucao) |
| 4 | Builder (maker) | `claude -p` headless, 1 item por wake, edita SO nesta arvore, em branch `loop/mapafome_h` |
| 5 | Judge (checker) | gate por item (lint/test) e gate completo pre-merge (fitness/build/smoke200/a11y); parecer do `agent_arch-fitness-reviewer` (maker != checker) |
| 6 | Merge | commit local atomico em branch de feature via `agent_git-commit-specialist`, SO com judge verde; merge para main e human-gated |
| 7 | Deploy | push/PR/promocao de homolog: SEMPRE humano; o loop para no commit local |
| 8 | Budget guard | cap por wake: 6 chamadas / 20 min / 3 USD dia (projects.json) + kill-switch STOP + spend.jsonl |
| 9 | Observability | `state/mapafome_h/` (spend.jsonl, latest.json, history.jsonl) + linha final `RESUMO: ... | PENDENTES: n` + `loop_reports/` |
| 10 | Isolation | branch `loop/mapafome_h`; preflight bloqueia main/master; nao toca os arquivos do loop UIUX |
| 11 | Supervisor/Heartbeat | a Scheduled Task re-entra a cada intervalo; checa STOP e cap PRIMEIRO; auto-off em stall/gate vermelho repetido |

## Milestones

- id: M1
  titulo: "Prontidao do loop"
  objetivo: "Baseline verde lido em branch de loop + triagem do catalogo humano"
  criterios: "lint+test verdes LIDOS em loop/mapafome_h; loop_reports/triagem.md existente e nao-vazio"
  itens: MF-L-001, MF-L-002
  status: pendente

- id: M2
  titulo: "Seguranca P14 (segredo no bundle do cliente)"
  objetivo: "Mapa exato dos sites do segredo + decisao humana de remediacao"
  criterios: "p14_inventario.md com arquivo:linha de todos os usos; DECISAO-P14 registrada pelo humano"
  itens: MF-L-101, MF-L-102 (human-gate)
  status: pendente

- id: M3
  titulo: "Qualidade e testes"
  objetivo: "Fechar o deferido do P12 com caracterizacao primeiro e manter a triagem real-vs-flake do a11y"
  criterios: "testes de caracterizacao verdes antes da extracao do seam; a11y_triagem.md classificando cada falha com evidencia"
  itens: MF-L-201, MF-L-202
  status: pendente

- id: M4
  titulo: "Disciplina de merge e deploy"
  objetivo: "Wake de judge dedicado (fitness+build+smoke200) e publicacao exclusivamente humana"
  criterios: "judge_premerge.md com resultado por rota do smoke200; nenhuma publicacao feita pelo loop"
  itens: MF-L-301, MF-L-302 (human-gate)
  status: pendente

## Human-gates (o loop NUNCA faz sozinho)

- MF-L-102 (arquitetura de remediacao do segredo; o proprio P14 registra o handoff
  humano) e MF-L-302 (publicar). Nesses itens o maker emite
  `NEEDS_HUMAN: <pergunta> | ITEM: <id>` e pula; o pedido vira card STANDBY no dashboard.
- Alem deles: git push, PR, merge para main, bump de versao e ligar o proprio loop.

## Dimensionamento pelo budget (LBR-F)

Cada item declara `esforco_wake` e cabe em UM wake (<= 6 chamadas, <= 20 min).
Neste HDD a suite E2E completa estoura o teto de 20 min: por isso MF-L-202 roda SO o
subconjunto a11y, e MF-L-301 e um wake dedicado exclusivamente ao gate (com quebra
explicita build/smoke200 em 2 wakes se estourar). Item que crescer e QUEBRADO em
itens encadeados (append-only), como MF-L-201 ja preve.

## Como ligar (humano, na ordem)

1. ATENCAO: o `project_overrides.mapafome_h.maker_prompt` em config.json hoje e
   planning-only de UIUX (mantem ROADMAP_UIUX.md/MILESTONES_UIUX.yaml e nao edita
   codigo). Para o loop executar ESTE backlog de engenharia, o humano deve trocar o
   override (ou remove-lo, caindo no maker_prompt global de backlog-orchestrator).
   Isso e um aumento de autonomia e fica com voce; nada foi alterado em config.json.
2. `loops preflight mapafome_h` e resolver bloqueios (criar `git switch -c loop/mapafome_h`).
3. `loops run mapafome_h -DryRun`, depois um `loops run mapafome_h` observado.
4. `loops on mapafome_h`.

Integracao com o dashboard: este projeto JA tem um plano de maior prioridade
(MILESTONES_UIUX.yaml) que ocuparia o card; a integracao foi uma edicao ADITIVA no
loop-manager (campo `backlog` no sync + 1 linha de render no dashboard + BACKLOG.yaml
e ROADMAP_LOOP.md no checkpoint diario), expondo os DOIS planos lado a lado. O
`metrics.ps1` passa a contar o BACKLOG.yaml (ele tem prioridade sobre
MILESTONES_UIUX.yaml no medidor) - a serie feitas x geradas do mini-grafico muda de
fonte a partir de hoje.
