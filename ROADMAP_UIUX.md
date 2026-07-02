# Roadmap de UI/UX, MAPA FOME (rodada 1)

Gerado em 2026-07-02 pelo loop de UI/UX do loop-manager, via multiagents
(a11y-architect + react-reviewer), analise somente leitura do codigo. Foco: acessibilidade
WCAG 2.2 AA e UX de React. Este roadmap e mantido pelo loop; o arquivo estruturado que ele
avanca a cada acordada e `MILESTONES_UIUX.yaml`.

Nota: NAO confundir com `MILESTONES.yaml` da raiz (roadmap de engenharia P1/P2/..., que nao e
deste loop). O trabalho de contraste WCAG (P3) e a auditoria axe (P6) ja entregues nao se repetem
aqui.

## Prioridade alta

- **M1. Substituir `alert()` nativo por erro inline acessivel no fluxo de endereco.**
  `endereco.js` usa `window.alert()` (linhas 94, 159) para erros de validacao e falha de
  gravacao, sem `role="alert"`, sem `aria-describedby`, e o input so tem placeholder (nao label
  visivel). Isso bloqueia a doacao para quem usa leitor de tela. Achado confirmado pelos dois
  agents. WCAG 3.3.1 / 3.3.3 / 1.3.1 / 4.1.3.

- **M2. Contexto acessivel nos botoes e icones do popup do mapa.**
  Botoes do popup (verificar CNPJ, excluir ponto, alimento entregue) nao carregam o contexto do
  ponto no `aria-label`; "Excluir" sozinho e ambiguo com varios pinos. SVG de estrela decorativo
  exposto a arvore de acessibilidade. WCAG 2.4.6 / 4.1.2 / 1.1.1.

- **M3. Estado de submit robusto no formulario de endereco (anti-duplo-envio).**
  O submit alterna `isLoading` e mostra spinner, mas nao ha garantia de botao `disabled` durante
  o envio nem microcopy de progresso; risco de gravacao dupla. Seguir o padrao maduro de
  `PetReportSheet`. WCAG 4.1.3.

## Prioridade media

- **M4. Foco visivel consistente (anel) em `/parceiros` e `/iniciativas/cadastrar`.**
  Esses formularios sinalizam foco so por cor de borda de 1px, sem o `box-shadow` de anel usado
  no resto do app. WCAG 2.4.11 (novo na 2.2) / 2.4.7.

- **M5. Semantica de estrutura: `h1` na home, `fieldset` nos filtros, hierarquia de headings.**
  A home do mapa nao tem `h1`; os blocos de filtro usam `<article>` em vez de `fieldset/legend`;
  ha salto `h3` sem `h2` no `InfoPanel`. WCAG 2.4.6 / 1.3.1 / 4.1.2.

- **M6. Consolidar formularios de endereco duplicados e limpar codigo morto.**
  Existem 4 variacoes de formulario de endereco com logica quase identica e tratamento de
  loading/erro divergente; `form.js` parece codigo morto. Unificar num componente reutilizavel.

## Como este roadmap evolui

A cada acordada, o loop avanca o proximo milestone pendente (detalha em tarefas ou marca
concluido quando os criterios sao atendidos). Quando todos os milestones desta rodada ficam
concluidos, o loop arquiva a rodada em `ROADMAP_UIUX_ARQUIVO.md` e cria uma nova rodada,
recomecando o ciclo. Itens que exigem decisao humana vao para standby (visiveis no dashboard e
no `loops.ps1 standby`) e o loop segue nos demais.
