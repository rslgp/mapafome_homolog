# PET_CURVE.md — A curva de interesse INVERTIDA do /pets (worried-owner value-loop)

<!--
============================================================================
ARTEFATO DE DESIGN — PET-M-CURVE (owner: game-designer)
Pure design. NÃO é código. Vive ao lado de PETS_MILESTONES.yaml e é a
FORCING FUNCTION contra a qual TODO item /pets posterior é auditado.

Pergunta-âncora que este arquivo torna respondível para qualquer feature:
  "Isto ABAIXA a ansiedade do dono, ou ELEVA?"   → se eleva, não entra.

Lentes-fonte (citadas inline, auditáveis por uma sessão futura):
  • Schell — Lens of Essential Experience / Lens of Failure / Lens of the
    Interest Curve / Lens of Reward / Lens of Surprise.
  • Sylvester — decision → feedback → reward loop; feedback_loop_signs
    (POSITIVO amplifica / NEGATIVO amortece); elegance_heuristic
    (o ônus da prova é de quem ADICIONA).
  • Salen & Zimmerman — meaningful play (DISCERNÍVEL + INTEGRADO).
  • Koster — fun-as-pattern-recognition (aqui invertido: o "padrão" a
    aprender NÃO é um quebra-cabeça divertido — é "como peço ajuda e fico
    em paz"; a maestria deve drenar a ANSIEDADE, não a diversão).

Eticamente quente (cross-check obrigatório):
  reinforcement_schedules.variable_ratio / variable_interval e o padrão
  "Hooked" — PROIBIDOS nesta superfície (ver GOVERNADOR abaixo).
============================================================================
-->

## 0. A tese: este produto é uma curva de interesse INVERTIDA

Um jogo arcade desenha a curva de interesse de Schell *normal*: sobe, com
descansos, até um clímax. **O /pets faz o OPOSTO.** O usuário chega no PICO de
excitação — pânico, um pet sumiu — e o trabalho de cada superfície é
**rebaixar o eixo de arousal degrau a degrau** até a paz (reencontro) ou o
encerramento digno. Não há clímax a construir; há um susto a dissipar.

> **Schell — Lens of Essential Experience:** "Qual é a UMA sensação que quero
> que a pessoa tenha?" Para o /pets a resposta é sempre alguma forma de
> **"menos sozinho / mais no controle"** — nunca "mais animado".

Consequência de design dura: qualquer mecânica cuja graça dependa de *elevar*
o arousal (suspense, FOMO, contagem regressiva, "ganhe um badge") está
empurrando a curva na direção errada e é **rejeitada por construção**, não por
gosto. É por isso que o GOVERNADOR (§2) é um *constraint*, não uma preferência.

---

## 1. O arco emocional, estágio a estágio (a curva invertida)

Cada estágio nomeia **a UMA sensação-alvo** (Lens of Essential Experience), o
**value-movement humano** que o move (mecânica só gera emoção quando desloca um
valor humano; *revelação de informação conta*), e o **degrau de arousal** que a
superfície deve produzir. O dono e o "achador" (finder) percorrem ramos
espelhados do mesmo arco.

### Estágio A — PÂNICO NA CHEGADA (arousal: MÁXIMO → o degrau é "ser acolhido")
- **Quem:** o dono que acabou de perceber o sumiço; ou o achador com o coração
  apertado de ter visto um bicho perdido na rua.
- **Sensação-alvo:** *"tem o que fazer, e é simples."* (acolhimento, não
  empolgação.)
- **Value-movement:** ignorância → conhecimento ("existe um lugar pra isso").
- **Superfície:** entrada no /pets (PetsApp header/lead), o estado vazio e a
  dica de primeira visita, o CTA "Relatar um pet".
- **Regra de curva:** a superfície de chegada **não pode pedir cadastro, não
  pode cobrar urgência, não pode gamificar**. Um campo a mais aqui é arousal a
  mais. Reportar tem que ser possível com o MÍNIMO (local + situação; o resto é
  opcional — já é assim em `PetReportSheet`).

### Estágio B — "REPORTEI, E AGORA?" (arousal: ALTO → o degrau é "está feito e visível")
- **Quem:** acabou de publicar; a dúvida imediata é *"adiantou? alguém vai
  ver?"* — o vácuo onde a ansiedade re-sobe se nada confirmar.
- **Sensação-alvo:** *"pronto — meu pet está no mapa e qualquer pessoa por
  perto pode reconhecê-lo."* (alívio de fechamento, não festa.)
- **Value-movement:** incerteza → certeza discernível (Salen & Zimmerman: o
  resultado da ação **PRECISA ser DISCERNÍVEL** — a pessoa tem que VER que
  funcionou — **e INTEGRADO** — a publicação muda o que ela pode fazer a
  seguir: compartilhar / acompanhar).
- **Superfície:** o **micro-estado de fechamento pós-publicação** (contrato em
  §4), construído por **PET-M20**.
- **Regra de curva:** este é o ÚNICO ponto de "recompensa" do loop e é o mais
  perigoso. A tentação de jogo arcade é o *spike* (confete, "Boa! +1 herói").
  **Proibido** (§2). A recompensa correta é **morna e curta**, e oferece
  **exatamente UMA próxima decisão** — nada de menu de re-engajamento.

### Estágio C — ESPERA / ESPERANÇA (arousal: deve DECAIR → o degrau é "posso largar o celular")
- **Quem:** o dono entre publicar e qualquer notícia. É o estágio mais longo e
  o mais explorável por dark patterns — é exatamente onde um app comum
  injetaria nudges de variable-interval para criar "checagem ansiosa".
- **Sensação-alvo:** *"está cuidado mesmo sem eu ficar olhando."* (confiança
  delegada.)
- **Value-movement:** nenhum *novo* — e isso é proposital. **A ausência de
  movimento é o design.** (Sylvester `feedback_loop_signs`: aqui queremos um
  loop **NEGATIVO/amortecedor** — algo que AMORTEÇA a ansiedade ao longo do
  tempo — e **jamais** um loop positivo que a amplifique.)
- **Superfície:** o check-in de frescor honesto (PET-M13), o filtro/lista como
  ferramenta de *busca ativa* opcional (PET-M7/M8), o match possível (PET-M9).
- **Regra de curva:** **zero notificações, zero "alguém viu seu pet?!", zero
  contagem de dias na tela como pressão.** O envelhecimento do report é tratado
  com honestidade silenciosa (PET-M12/M13), não com alarme. Se um recurso aqui
  faz o usuário *querer* voltar a cada hora, ele FALHOU a curva.

### Estágio D — RECONHECIMENTO / MATCH (arousal: sobe um pouco, mas com FREIO → o degrau é "esperança calibrada")
- **Quem:** surge um "encontrado/avistado" que *pode* ser o pet; ou o dono
  recebe um contato dizendo "acho que achei".
- **Sensação-alvo:** *"pode ser ele — vale verificar com calma."* (esperança
  cautelosa, **nunca** "ACHAMOS!".)
- **Value-movement:** ignorância → conhecimento *parcial* — a revelação de
  informação É o movimento, mas calibrada para **"pode ser"**, não "é".
- **Superfície:** o hint de match possível (PET-M9a spec / PET-M9b impl), o
  reveal-on-tap do contato (PET-M3), e o **detalhe-de-verificação privado**
  (primitivo de credibilidade, §5).
- **Regra de curva (a mais delicada):** uma falsa certeza aqui é um
  **value-movement de falsa-esperança** — o pior erro possível nesta superfície
  (anti-bloat header; PET-M9a). **Schell — Lens of Surprise:** a surpresa boa é
  *delight* ("opa, um candidato"); a surpresa que **trai a confiança** é o golpe
  do falso achador (§5). O design do match e do reveal de contato existe para
  maximizar a primeira e blindar contra a segunda.

### Estágio E — REENCONTRO **OU** ENCERRAMENTO HONESTO (arousal: VOLTA AO REPOUSO → o degrau é "paz")
- **Quem:** o pet voltou (desfecho feliz) **ou** o dono decide parar de
  procurar (desfecho doloroso, mas digno).
- **Sensação-alvo (reunido):** *"alívio caloroso e tranquilo."* — **e NÃO um
  pico celebratório / payout de caça-níquel** (governador, §2; YAML header
  CALM-TONE GOVERNOR: "warm-and-gentle, not a slot-machine payout").
- **Sensação-alvo (encerrar busca):** *"foi visto, foi tentado, e tudo bem
  parar."* — fechamento digno, sem culpa, sem "tem certeza que quer desistir?"
  coercitivo.
- **Value-movement:** o maior do arco — vida/perda, presença/ausência. Tão
  grande que **não precisa de amplificação**; amplificar com confete é
  desrespeitar o peso real do momento.
- **Superfície:** as ações "Marcar como reunido" / "Encerrar busca" com
  confirmação gentil (PET-M7b), persistidas pelo `resolvedAt` (PET-M2), e o
  tratamento visual sóbrio do marcador resolvido (PET-M11).
- **Regra de curva:** **Schell — Lens of Failure:** mesmo o desfecho NEGATIVO
  ("encerrar busca") tem que deixar a pessoa entendendo *por quê* e **sem se
  sentir punida**. O encerramento é um estado de primeira classe, não um buraco
  — é por isso que PET-M7b o trata com o mesmo carinho que o reencontro.

> **Mapa-resumo da curva (degraus de arousal):**
> A `MÁX` → B `ALTO↓` → C `DECAI↓↓` → D `sobe-com-freio↗` → E `REPOUSO`.
> A única subida permitida (D) é **freada por design**. Toda outra seta aponta
> para baixo. Isso É a curva invertida.

---

## 2. O GOVERNADOR DE TOM CALMO — regras EXECUTÁVEIS (anti-engagement-bait)

Não é uma preferência estética; é um **constraint de produto** herdado do
header CALM-TONE GOVERNOR de `PETS_MILESTONES.yaml`. Sylvester
`elegance_heuristic`: o ônus da prova é de quem ADICIONA. Toda adição abaixo é
NEGADA por padrão; remover é o default.

**BANIDO nesta superfície (cada item = ship-blocker, não débito):**

1. **Streaks / sequências** ("você reportou X dias seguidos"). — Cria loop
   POSITIVO de ansiedade; o /pets não quer que ninguém *volte sempre*, quer que
   o pet volte.
2. **Countdowns / contagens regressivas como pressão.** — Eleva arousal no
   estágio (C) exatamente onde ele deve decair. (Mostrar "reportado há 3 dias"
   como *informação honesta neutra* é permitido; mostrar como *relógio que corre
   contra você* é banido.)
3. **Badges / pontos / níveis / leaderboard / "herói".** — Gamificação
   (anti-bloat header). Transforma um ato de cuidado em métrica de vaidade.
4. **Nudges de re-engajamento variable-ratio / variable-interval.** — O mais
   grave: cria *checagem ansiosa* deliberada. Inclui push notifications e
   alertas geográficos permanentes (anti-bloat header).
5. **Pico celebratório / confete / payout no momento "reunido".** — **REGRA DO
   NÃO-SPIKE** (acceptance line de PET-M7b e §1-E). O sucesso é *morno e
   gentil*, nunca slot-machine.
6. **Dark patterns** (confirm-shaming "tem certeza que quer desistir do seu
   pet?", opt-out escondido, urgência fabricada, roach-motel).
7. **Engagement-bait** em geral — qualquer recurso cuja métrica de sucesso seja
   "tempo na tela" em vez de "ansiedade reduzida / pet reencontrado".

**OBRIGATÓRIO:**

8. **Movimento mínimo e `prefers-reduced-motion` respeitado** em toda
   superfície (skeletons sem shimmer quando reduzido — já é regra em
   PET-M16/M20). Nenhuma animação de "comemoração".
9. **Toda mudança de estado é DISCERNÍVEL** (Salen & Zimmerman) — anunciada a
   leitores de tela (`role=alert`/`aria-live`), porque o público inclui pessoas
   em estresse agudo que não vão caçar feedback sutil.
10. **Todo desfecho — inclusive o negativo — é digno** (Lens of Failure):
    "encerrar busca" nunca é punido nem envergonhado.

**Teste de uma linha para qualquer feature futura:**
> *"Esta mecânica faz o usuário querer VOLTAR (mau) ou faz o pet/dono ficarem
> em PAZ (bom)? Ela ABAIXA o arousal do estágio em que aparece, ou ELEVA?"*
> Se eleva fora do estágio (D) freado — **não entra.**

---

## 3. Auditoria do backlog: cada PET-M → estágio da curva que serve

Tabela de rastreabilidade. Permite checar o backlog *contra* a curva: todo item
declara qual degrau de arousal ele move. (Itens de plataforma/teste servem o
arco *indiretamente* mantendo o loop confiável — um publish que falha em
silêncio re-injeta pânico no estágio B.)

| Item | Estágio(s) | O que serve na curva | Lente dominante |
|---|---|---|---|
| **PET-M1** Publish robusto + fila offline | B (e A) | Garante que "reportei" REALMENTE fecha mesmo sem rede; remove o vácuo onde a ansiedade re-sobe | Sylvester loop (a *feedback* tem que chegar) |
| **PET-M2** `resolvedAt` lifecycle | E | Dá ao reencontro/encerramento um estado persistente real (não teatro) | Salen & Zimmerman: resultado INTEGRADO |
| **PET-M3** Reveal-on-tap + higiene + nota privacidade | D (e transversal) | Protege o contato no momento do reconhecimento; ancora o primitivo de credibilidade (§5) | Lens of Failure (golpe do falso achador) |
| **PET-M7** Filtros status/espécie/porte | C/D | Ferramenta de *busca ativa* calma — agência sem nudge | Lens of the Player (dono no controle) |
| **PET-M7b** Reunido + encerrar busca + confirm gentil | E | Constrói o degrau final em AMBOS os ramos, com a regra do não-spike | Lens of Failure + Essential Experience |
| **PET-M8** Lista por distância/recência | C/D | Mesma busca ativa do M7, modo lista | Lens of the Player |
| **PET-M9a** Spec de match possível | D | DEFINE como surgir esperança calibrada sem falsa certeza | Lens of Surprise + Lens of Failure |
| **PET-M9b** Impl. do hint de match | D | Entrega o "pode ser" opt-in; silêncio para match fraco | Salen & Zimmerman (sem falso-positivo) |
| **PET-M10** Busca de endereço + "perto de mim" | C/D | Agência de busca; degrada com calma se GPS negado (sem beco) | Lens of Failure (sem dead-end) |
| **PET-M11** Legenda + SOT de badge + marcador fresco/envelhecido/reunido | C→E | Comunica frescor/desfecho por COR sóbria, nunca alarme; reunido = glifo distinto, não festa | Essential Experience (tom visual) |
| **PET-M12** Expiração/arquivo de report velho | C | Amortecedor MECÂNICO de staleness (loop NEGATIVO), sem deletar | Sylvester `feedback_loop_signs` (-) |
| **PET-M12b** Dedup de quase-duplicata | C | Limpa ruído visual; merge SOFT/reversível (falso-merge apaga um report real) | Lens of Failure (falso-merge) |
| **PET-M13** Check-in de frescor honesto (at-most-once) | C | O degrau de DECAÍMENTO feito com honestidade, não nag; convite único, nunca recorrente | `reinforcement_schedules` (proíbe var-interval) |
| **PET-M15** Foto no report/detalhe | D (e A) | Foto é o maior auxílio de RECONHECIMENTO — alimenta o estágio D | Lens of the Player (reconhecer) |
| **PET-M17** Metadata/OG do /pets | B→D | Faz o link compartilhado *prever bem* — sustenta o "qualquer pessoa pode ver" | Salen & Zimmerman: alcance discernível |
| **PET-M18** Deep link entra focando 1 pet | B→D | O destino do compartilhar LANDA no pet (loop não quebra no fim) | Sylvester loop (fechar o loop de alcance) |
| **PET-M19** Compartilhar (WhatsApp/native) | B (a UMA próxima decisão) | É *a* próxima-decisão oferecida no fechamento pós-publish (§4) | Lens of Reward (recompensa = mais alcance) |
| **PET-M20** Estados vazio/load/erro **+ fechamento pós-publish** + dica 1ª visita | A + **B** | Constrói o micro-estado de fechamento (§4) — o coração da curva; e acolhe a chegada (A) | Essential Experience + Lens of Reward |
| **PET-M21** Analytics de funil (sem PII) | (meta) | Mede se a curva funciona (report→publish→reunido/encerrou) sem virar vigilância | meaningful_play medível |
| **PET-M22** Cross-link fome ↔ /pets | A | Torna a porta de entrada DESCOBRÍVEL (hoje só via URL) | Lens of the Player (achar a porta) |
| **PET-M23** Paridade i18n pt-BR ↔ es | transversal | O tom calmo precisa ser calmo nos DOIS idiomas (linhas dignas, humano-autoradas) | Essential Experience em 2 línguas |
| **PET-M24** Auditoria de contraste/daltonismo | transversal | Garante que o sinal de status/desfecho é legível por todos (não confunde frescor com alarme) | clarity (defer uiux/coloring) |

> Itens de design puro **PET-M9a** e **PET-M13** dependem deste artefato
> (`depends_on: PET-M-CURVE`): eles herdam o governador e a regra de
> falsa-esperança daqui. **PET-M7b** e **PET-M20** também dependem dele porque
> constroem os dois estados mais sensíveis da curva (fechamento E e fechamento
> pós-publish B).

---

## 4. Contrato do MICRO-ESTADO de FECHAMENTO pós-publicação (constrói: PET-M20)

Este é o *reward/closure* do estágio B — o único ponto de "recompensa" do loop
e o mais fácil de arruinar. Sylvester `decision_feedback_reward_loop` auditado
leg-a-leg:

- **DECISÃO** (já tomada): "publiquei meu pet."
- **FEEDBACK** (este contrato): uma confirmação **discernível** de que está
  feito e visível.
- **RECOMPENSA:** a tranquilidade de saber que *qualquer pessoa por perto pode
  reconhecê-lo* — entregue como **estado calmo**, não como pico.
- **PRÓXIMA DECISÃO:** **EXATAMENTE UMA.** Não um menu.

**Contrato (o quê, não a copy literal — uiux/PET-M23 são donos das strings):**

1. **Confirmação discernível e localizada.** Após o publish, o usuário vê, sem
   ambiguidade, que o report entrou — e o estado **recentraliza/realça o pin
   recém-criado** no mapa, para que a confirmação seja *espacial e concreta*
   ("ali está ele"), não um toast abstrato. Anunciado a AT
   (`aria-live`/`role=status`). Sensação-alvo: *"pronto, está no mapa."*
2. **Reasseguramento, não nag.** A mensagem comunica **alcance** ("qualquer
   pessoa por perto pode reconhecê-lo") — é o que *desinfla* o estágio B.
   **Proibido** qualquer relógio, "volte amanhã", "compartilhe AGORA ou ninguém
   vê", streak, badge, ou confete (governador §2).
3. **EXATAMENTE UMA próxima-decisão.** Uma única ação calma à frente — p.ex.
   **compartilhar** (PET-M19, que multiplica o alcance honestamente) **OU** **ver
   no mapa** (fechar e olhar o pin). **Não** os dois como par competindo, **não**
   um terceiro "convide amigos". Uma decisão = arousal mínimo. (Schell — Lens of
   Reward: a recompensa correta *alimenta a próxima decisão* sem sobrecarregá-la.)
4. **Dispensável e silencioso depois.** O estado encerra com um toque/Escape e
   **não reaparece** nem gera lembrete. É um descanso, não um gancho.

> **Por que importa (Salen & Zimmerman):** sem este micro-estado, a publicação é
> um resultado **não-discernível** (a pessoa não sabe se "pegou") e
> **não-integrado** (não sugere o que fazer com isso) — exatamente os dois modos
> de falha de meaningful_play. PET-M20 fecha os dois com UMA tela calma.

---

## 5. Primitivo de credibilidade: o "detalhe que só o dono sabe" (referenciado por PET-M3 e PET-M9)

### O quê
Um **detalhe de verificação privado** — um fato sobre o pet que **só o dono
verdadeiro saberia** e que **NUNCA é exibido publicamente** (não vai pro mapa,
nem pra lista, nem pro detalhe público, nem pra analytics). Exemplos do tipo
(conceito, não copy): uma marca/cicatriz não-óbvia, o nome a que o bicho
responde, um comportamento peculiar, o que estava na coleira por dentro.

É **account-free** por princípio (anti-bloat header: contas forçariam o
checking ansioso que o governador proíbe). Ele não é um campo de autenticação de
servidor; é um **primitivo social de credibilidade**: dá ao dono uma
*pergunta-desafio* que ele pode fazer a quem alega ter achado o pet.

### Como se encaixa na curva
Vive no estágio **D (reconhecimento/match)**. Quando surge um contato ou um
match (PET-M9), o dono tem uma forma calma de **separar o reconhecimento real da
alegação falsa** — convertendo "pode ser ele?!" (arousal ALTO, frágil) em
"confirmei um detalhe que só eu sabia" (esperança *calibrada*). É o freio do
estágio D em forma de mecânica.

### Onde NÃO aparece (a regra de barricada)
- **PET-M3** (higiene de texto livre + reveal-on-tap): o detalhe privado, se
  algum dia for capturado, segue a MESMA disciplina do contato — **nunca no
  caminho de dados do mapa/lista**, e o texto livre público já é length-capped +
  control-char-stripped. O campo público "Detalhe — onde, coleira,
  comportamento" do report **continua público e NÃO é** o detalhe privado; este
  artefato pede que o dono **guarde** o fato-chave e **não o publique** — a nota
  de privacidade do PET-M3 deve orientar isso.
- **PET-M9** (match): o hint de match aproxima duas listagens, mas **jamais
  revela** nem usa o detalhe privado como critério público.

### Schell — Lens of Failure: o golpe do falso "eu-achei-seu-pet"

> **Lens of Failure** (Schell Lens #62). A pergunta: *quando o sistema falha
> contra um adversário, a pessoa entende e consegue se defender?* Aqui o
> "fracasso" não é do jogador — é um **ataque**.

**O caminho do ataque (walk completo):**

1. **Superfície de ataque.** Um report de pet perdido é público e, num desfecho
   feliz, frequentemente carrega um contato e a esperança visível do dono. Isso
   é exatamente o que um golpista explora: ele NÃO precisa ter achado o pet.
2. **A alegação falsa.** O golpista lê a listagem pública, vê espécie/cor/área
   (e foto, se houver — PET-M15) e contata o dono dizendo "achei seu pet". Ele
   repete de volta **só o que estava público** — descrição, local — para soar
   convincente.
3. **O movimento de valor explorado.** O dono está no estágio D, esperança ALTA
   e julgamento BAIXO (é o ponto de maior vulnerabilidade emocional do arco). O
   golpista pede dinheiro de "resgate"/transporte, ou marca um encontro para
   outro fim.
4. **Por que a descrição pública NÃO defende.** Tudo que está no mapa é, por
   definição, copiável. Um sistema que tratasse "sabe a cor e a raça" como prova
   estaria tratando **ruído como padrão** (Koster) — uma falsa skill-check que o
   atacante vence trivialmente.
5. **Como o detalhe privado defende.** O dono guardou UM fato que **nunca foi
   publicado**. Ele pergunta ao suposto achador algo cuja resposta só o *portador
   real do pet* (ou alguém olhando o bicho agora) saberia — não "qual a cor?"
   (público), mas algo como "o que ele tem atrás da orelha esquerda?" / "como ele
   reage quando você fala o nome dele?". O golpista que só leu o anúncio **não
   tem a resposta**. A assimetria de informação volta pro lado do dono.
6. **Lens of Surprise (o complemento):** a surpresa boa (um match real) é
   *delight*; a surpresa que **trai a confiança** é precisamente este golpe. O
   primitivo converte uma surpresa-traição em potencial num desafio que o
   atacante falha — sem nunca expor o segredo que o torna útil.

**Falhas do PRÓPRIO primitivo a respeitar (auto-Lens-of-Failure):**

- **Não vaze o segredo.** Se o detalhe privado aparecesse em qualquer superfície
  pública, analytics ou payload de erro, o primitivo morre. Por isso ele herda a
  barricada de PII do PET-M3 (redação no `trackError`, nunca no caminho do
  mapa/lista) e, idealmente, **nem é transmitido** — o ideal é que viva só na
  cabeça/anotação do dono, e o produto apenas *ensine* a usá-lo via a nota de
  privacidade calma.
- **Não vire fricção no estágio A.** Ensinar o conceito é uma *dica calma* (uma
  linha na nota de privacidade / no fechamento), **não** um campo obrigatório no
  report. Forçá-lo elevaria o arousal da chegada — violando a curva. É um
  *empoderamento opt-in*, não um portão.
- **Não dê falsa garantia.** O produto não pode prometer "verificado" — ele
  **não autentica**; ele dá ao dono uma ferramenta social. A copy (uiux) deve
  enquadrar como "uma forma de confirmar com calma", nunca "selo de segurança".

---

## 6. Como usar este artefato (a forcing function)

Antes de qualquer feature /pets entrar no backlog ou no código, responda:

1. **Que estágio (A–E) ela toca?** (§1) Se não toca nenhum, por que existe?
2. **Ela ABAIXA o arousal daquele estágio, ou ELEVA?** (§0, §2) Se eleva fora do
   estágio D freado — rejeite.
3. **Ela bate em algum item BANIDO?** (§2) Qualquer match = ship-blocker.
4. **Se cria uma decisão, ela é DISCERNÍVEL + INTEGRADA?** (Salen & Zimmerman.)
5. **Se é o estágio B ou E, respeita o contrato de fechamento e a regra do
   não-spike?** (§4, §1-E.)
6. **Se toca reconhecimento/contato, respeita o primitivo de credibilidade e
   sobrevive ao Lens of Failure do golpe?** (§5.)

Se um recurso passa nos seis, ele *abaixa a ansiedade do dono* — e merece
existir. Se falha em qualquer um, ele a *eleva* — e o `elegance_heuristic` de
Sylvester diz: **corte.**
