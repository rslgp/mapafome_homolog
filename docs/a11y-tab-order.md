# Auditoria de ordem de foco — homepage (UX-M20, 2026-07-03)

Percurso de Tab na `/` (build estático, flag coop-gestures ON), verificado por
leitura do DOM renderizado + conhecimento dos componentes. Objetivo: nenhum
usuário de teclado precisa atravessar o mapa inteiro para chegar ao conteúdo.

## Ordem atual (após UX-M20)

1. **Skip-link 1** — "Pular para o mapa" (`#mdf-main`), primeiro focável (WCAG 2.4.1).
2. **Skip-link 2 (novo)** — "Pular o mapa e ir ao conteúdo" (`#MoreInfo`): pula
   header + trilho + mapa + controles de uma vez. Alvo já tem
   `scroll-margin-top` (não aterrissa sob o header sticky).
3. Header: marca (link `/`) → cluster de ações (Relatar, tour "?", instalar,
   **assinar** ❤). Rail rola horizontal; foco segue nativamente.
4. Trilho StepsHint: Ver mais → Pets → Solone → Bluey → Ilha das Flores.
   O chevron de arraste é `tabIndex={-1}` + `aria-hidden` (pointer-only,
   de propósito — teclado alcança cada pílula direto).
5. **Mapa Leaflet** (a travessia longa): container focável (`focusin` ativa o
   wheel cooperativo — mesmo gesto do mouse), depois controles Leaflet
   (camadas, zoom, busca, bandeira/idioma se INTL on), popups/markers
   conforme interação. ~dezenas de stops — é exatamente o que o skip-link 2
   evita.
6. Controles do formulário do mapa (#CoffeeTable) → Confirmar ponto.
7. ViewMoreCue (botão "Veja mais abaixo") → some após o primeiro scroll.
8. ContextBar: botão **Lista** (a mini-bar fixada UX-M14 duplica o botão
   Lista quando a original sai de vista; textos da mini são `aria-hidden`
   para não duplicar a live region).
9. InfoPanel (#MoreInfo): compartilhar WhatsApp/Telegram → seção "quem a
   plataforma atende" (não interativa) → badges de instalação → botões de
   apoio → legendas/acordeões → footer de versão.

## Armadilhas conhecidas (não bloqueiam, monitorar)

- Leaflet dá `tabindex` a markers interativos: com muitos pins o custo de
  Tab dentro do mapa cresce — mitigado pelo skip-link 2, não eliminado.
- Sheets (Lista, Relatar, detalhes) prendem foco no padrão do modal contract
  do repo; Escape devolve o foco ao gatilho (coberto por testes existentes).
- Overlays decorativos (progress bar, véus, veil do touch) são
  `aria-hidden` + `pointer-events:none` — zero stops de Tab.

## Regra para novos elementos

Interativo novo na home: decidir explicitamente se entra ANTES ou DEPOIS do
mapa na ordem de leitura, e se é pointer-only (então `aria-hidden` +
`tabIndex -1`, como o chevron/nudge).
