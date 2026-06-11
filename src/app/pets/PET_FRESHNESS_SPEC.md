# PET_FRESHNESS_SPEC.md — Check-in de frescor honesto (account-free, at-most-once "ainda procurando?")

<!--
============================================================================
ARTEFATO DE DESIGN — PET-M13 (owner: game-designer)
Pure design. NÃO é código. Vive ao lado de PETS_MILESTONES.yaml e PET_CURVE.md.
É auditável contra PET_CURVE.md (a FORCING FUNCTION) e herda o GOVERNADOR de tom
calmo daquele artefato (depends_on: PET-M2, PET-M-CURVE).

Pergunta-âncora herdada de PET_CURVE.md (§6):
  "Isto ABAIXA a ansiedade do dono, ou ELEVA?"  → se eleva, não entra.

Estágio da curva que este item serve (PET_CURVE.md §1, §3):
  ESTÁGIO C — ESPERA / ESPERANÇA. O estágio mais longo e o mais explorável por
  dark patterns. O degrau de arousal aqui DEVE DECAIR ("posso largar o celular").

Lentes-fonte (citadas inline, auditáveis por uma sessão futura):
  • Sylvester — feedback_loop_signs: este mecanismo é um loop NEGATIVO/amortecedor
    (amortece a staleness), NUNCA um loop positivo de ansiedade.
  • Sylvester — reinforcement_schedules: variable_interval é PROIBIDO nesta
    superfície (é exatamente o agendamento que cria checagem ansiosa). O convite
    é ÚNICO e determinístico por limiar de idade — não é um agendamento de reforço.
  • Sylvester — elegance_heuristic: o ônus da prova é de quem ADICIONA. Este item
    REMOVE mais do que adiciona (ver §0); só guarda o que ganha o seu lugar.
  • Schell — Lens of the Player / Lens of Failure / Lens of Honesty.
  • Salen & Zimmerman — meaningful play: o resultado do check-in é DISCERNÍVEL
    (o frescor muda visivelmente) e INTEGRADO (alimenta o lifecycle reunido).

ESCOPO (do YAML PET-M13):
  INCLUI: o DESIGN do mecanismo + o CONTRATO DE PERSISTÊNCIA (handoff p/ eng).
  EXCLUI: contas/login; lembretes por email/push; cron de servidor; o visual de
  dimming (PET-M11); o writer de auto-archive (PET-M12).
============================================================================
-->

## 0. A tese: um amortecedor honesto, não um gancho

PET-M12 é o **amortecedor MECÂNICO** de staleness: passado um limiar de idade, o
report some do mapa ativo (arquivado *in place*, nunca deletado). É cego — ele
não sabe se o pet voltou ou se o dono ainda procura; ele só sabe que o report
está velho. É necessário, mas é **mudo**: trata "ainda procurando há 60 dias" e
"reencontrei e esqueci de marcar" exatamente igual.

PET-M13 dá a esse amortecedor **uma única voz honesta**. Conforme o report
envelhece, o produto faz ao **repórter** — re-identificado por um *token local*
gravado no momento da publicação, **sem conta, sem servidor** — **um convite, uma
só vez**:

- **"ainda procurando"** → renova o carimbo de frescor (zera o relógio de idade).
- **"já reencontrei"** → marca `reunido` via o writer do PET-M2.

> **Sylvester `feedback_loop_signs`:** este é um loop **NEGATIVO**. Sua função é
> *amortecer* a staleness — drenar a incerteza acumulada de um report parado — e
> jamais *amplificar* a ansiedade do dono. Um loop positivo aqui (nudge que puxa
> o usuário de volta) seria precisamente o anti-padrão "Hooked" que o
> GOVERNADOR de PET_CURVE.md §2 (item 4) bane como ship-blocker.

**O que este item REMOVE (Sylvester `elegance_heuristic` — nomear o corte, não só
a adição):**

1. **A desonestidade silenciosa de um report que envelhece fingindo frescor.**
   Sem M13, um report de 50 dias parece tão "ao vivo" quanto um de 2 dias até o
   machado do M12 cair. M13 dá ao dono **uma chance dedicada de dizer a verdade**
   antes que a mecânica decida sozinha.
2. **A pressão de QUALQUER lembrete recorrente.** Tudo que um app comum colocaria
   aqui — "ei, ainda procurando?" semanal, badge de "report ativo", contador de
   dias como relógio que corre contra você — é **explicitamente removido por
   construção**. O convite é **no máximo um**, e nunca volta.
3. **A necessidade de conta para "ser o dono daquele report".** O token local
   substitui o login inteiro (PET_CURVE.md §5 e o anti-bloat header: contas
   forçariam o checking ansioso que o governador proíbe).

Tudo que M13 *adiciona* é: um token no `localStorage`, um campo de frescor no
`Dados`, uma flag "já perguntei", e **um** card calmo. Nada mais ganha lugar.

---

## 1. Por que o convite é ÚNICO (a proibição de variable-interval)

Esta é a regra dura do item, e ela tem nome técnico.

> **Sylvester — `reinforcement_schedules`:** um agendamento **variable-interval**
> (recompensa/estímulo após um tempo *imprevisível*) é o agendamento que mais
> produz **checagem compulsiva** — é o mecanismo do caça-níquel e do feed
> infinito. PET_CURVE.md §2 (item 4) o lista como **BANIDO / ship-blocker** nesta
> superfície, e o estágio C (§1-C) é exatamente onde um app comum o injetaria.

Um check-in que reaparece "de tempos em tempos" — mesmo com a melhor copy do
mundo — **É** um agendamento de intervalo. Reaparecer a cada 7 dias é um intervalo
fixo; reaparecer "quando o servidor achar oportuno" é um intervalo variável.
**Ambos elevam o arousal do estágio C**, que deve DECAIR (PET_CURVE.md §1-C: "o
degrau é 'posso largar o celular'"). Logo:

- O convite dispara **no máximo uma vez na vida daquele report, naquele
  dispositivo.** Depois disso — respondido ou ignorado — **nunca mais aparece**.
- Não é um agendamento de reforço. É um **evento único, determinístico, por
  limiar de idade** (§2). Não há imprevisibilidade a explorar, logo não há
  checagem ansiosa a criar.
- Ignorar o convite é uma resposta **válida e sem custo**. Quem fecha o card sem
  responder não "perde" nada e não é perseguido. O report simplesmente segue seu
  curso honesto (§4) e, no limite, é arquivado pelo M12.

> **Schell — Lens of the Player:** o dono no estágio C precisa poder **largar o
> celular**. Um mecanismo que o faz *querer voltar* falhou a curva (PET_CURVE.md
> §2, teste de uma linha). "No máximo uma vez" é o que garante que este item
> *abaixa* a ansiedade em vez de criar um novo motivo para checar.

---

## 2. QUANDO o convite aparece (o gatilho exato)

O convite é **pull, não push**. Não há servidor, não há notificação, não há cron
(escopo EXCLUI todos os três). O único momento em que o produto pode falar com o
repórter é **quando ele mesmo abre o /pets**. Portanto:

**Gatilho:** na **próxima visita do repórter ao /pets** *depois* que o report
dele cruza o limiar de idade — e *desde que* o convite ainda não tenha sido
mostrado para aquele report naquele dispositivo.

Em pseudo-condição (lógica de design, não código):

```
mostrarCheckin(report) :=
      repórterDesteDispositivo(report)         // existe token local p/ este report
  AND idadeDoFrescor(report) >= LIMIAR_DIAS     // cruzou o limiar (§2.1)
  AND naoForaArquivado(report)                  // M12 ainda não arquivou
  AND naoEstaResolvido(report)                  // não é reunido/encerrado (PET-M2)
  AND NAO checkinJaMostrado(report)             // a flag at-most-once (§4 do contrato)
```

Se todas passam **na abertura do /pets**, o card calmo aparece **uma vez**. No
instante em que é mostrado, a flag `prompted:true` é gravada no token local
(§4 do contrato de persistência) — então mesmo que o usuário recarregue a página
na mesma sessão, **ele não revê o card**. "Mostrado" conta, não "respondido":
isso é o que torna o at-most-once à prova de reload e de fechar-sem-responder.

### 2.1 O limiar de idade — default concreto

- **`LIMIAR_DIAS` (frescor) = 30 dias** (default). É o ponto em que um report
  perdido começa a soar "talvez velho" mas ainda está **bem dentro** da janela de
  arquivamento do M12 — o convite precisa chegar *antes* do machado, para ter
  função.
- **Relação dura com o M12:** `LIMIAR_DIAS (M13) < JANELA_ARQUIVO (M12)`. O
  check-in **precede** o auto-archive. Se o M12 arquiva em ~90 dias (ver
  `PET_RECENCY_OPTIONS` em petDomain, cujo maior balde é 90), o check-in aos 30
  dá ao dono ~60 dias de folga entre "fui convidado a confirmar" e "fui arquivado
  por idade". O número exato de ambos é do **softwareengineer** (vive em UMA SOT
  no petDomain, ao lado de `LIMIAR_DIAS`), mas a **ordem** é uma invariante de
  design: **convidar antes de arquivar**, nunca depois.
- O limiar é medido contra o **carimbo de frescor** do report (não contra o
  `DateISO` original de publicação) — porque "ainda procurando" reseta esse
  carimbo (§3), e o relógio do convite tem de reconhecer o reset. (Como já só
  existe **um** convite por report, o reset não reabre um segundo convite — ver
  §3, nota sobre at-most-once vs. reset.)

> **Nota de calma (PET_CURVE.md §2, item 2):** mostrar "reportado há 32 dias"
> como **informação neutra e honesta** é permitido; mostrar como **relógio que
> corre contra o dono** (countdown, barra que esvazia, "faltam X dias") é BANIDO.
> O card do M13 informa idade só se for sereno fazê-lo; nunca a dramatiza.

---

## 3. O loop decisão → feedback → recompensa do check-in

Auditado leg-a-leg (Sylvester `decision_feedback_reward_loop`), no registro de
PET_CURVE.md §4:

- **DECISÃO** (do repórter, uma vez): "ainda procuro" **ou** "já reencontrei"
  **ou** (implícita, válida) "não respondo agora".
- **FEEDBACK** (discernível — Salen & Zimmerman): a resposta muda **algo visível
  e concreto**, não um toast abstrato:
  - **"ainda procurando"** → o report é **renovado**: o carimbo de frescor passa
    a *agora*, o report volta a ser "fresco" no mapa (o tratamento visual de
    fresco/envelhecido é do **PET-M11** — aqui só garantimos que o *dado* de
    frescor muda). Sensação-alvo: *"continua valendo, e eu disse isso uma vez —
    pronto."*
  - **"já reencontrei"** → o report entra em `reunido` via o **writer do PET-M2**
    (`resolvedAt`), exatamente como a ação "Marcar como reunido" do PET-M7b.
    Sensação-alvo: a do **estágio E** — *"alívio caloroso e tranquilo"* (e **NÃO**
    pico celebratório; herda a REGRA DO NÃO-SPIKE, PET_CURVE.md §1-E e §2 item 5).
- **RECOMPENSA:** não é um payout — é **paz e fechamento**. Em "ainda procurando",
  a recompensa é *delegar de novo com a consciência limpa* ("disse a verdade, o
  mapa reflete, posso largar o celular"). Em "já reencontrei", é o desfecho mais
  hopeful do arco, entregue morno.
- **PRÓXIMA DECISÃO:** **NENHUMA imposta.** O card encerra com um toque/Escape e
  **não reaparece** (espelha o contrato de fechamento de PET_CURVE.md §4, item 4:
  "Dispensável e silencioso depois"). É um descanso, não um gancho.

> **Salen & Zimmerman — meaningful play:** sem o feedback discernível ("o frescor
> mudou de verdade"), o check-in seria teatro; sem a integração ("'já
> reencontrei' alimenta o lifecycle `reunido` real"), seria um beco. M13 fecha os
> dois: a resposta **muda o dado** e **muda o que acontece com o report**.

**Nota sobre at-most-once vs. reset de frescor.** "Ainda procurando" **reseta o
carimbo de frescor** (o report rejuvenesce para o mapa e para o M12). Isso **não**
reabre o convite: a flag `prompted:true` (§4) é permanente para aquele report
naquele dispositivo. Ou seja — o report pode renovar seu *frescor* quantas vezes
o dado permitir, mas o **convite humano** acontece **uma vez só**. Resetar o
relógio de **arquivamento** é diferente de reabrir o **convite**; só o primeiro é
permitido. Isso preserva a proibição de variable-interval (§1): nunca há um
segundo "ainda procurando?" caçando o usuário.

---

## 4. Como o report NÃO-confirmado-mas-não-negado degrada HONESTAMENTE

O caso central da honestidade (acceptance line 3 do YAML). Três trajetórias
possíveis de um report que cruzou o limiar:

| Trajetória | O que o repórter fez | O que acontece com o report | Por quê (honesto) |
|---|---|---|---|
| **Confirmado ativo** | tocou "ainda procurando" | frescor renovado → volta a *fresco* no mapa | o dono **afirmou** que vale; o mapa reflete a verdade dele |
| **Confirmado resolvido** | tocou "já reencontrei" | `reunido` via writer do PET-M2 → sai do mapa ativo | o dono **afirmou** o desfecho; lifecycle fecha honestamente |
| **NÃO-confirmado-mas-não-negado** | nada (fechou / não visitou / sem token) | **continua existindo, marcado como NÃO-renovado**; envelhece *visivelmente* (PET-M11) e, no limite de idade, é arquivado *in place* pelo **PET-M12** (nunca deletado) | ninguém afirmou nada → o produto **não finge frescor** nem **apaga em silêncio**; mostra a idade real e deixa o amortecedor mecânico agir |

A regra de honestidade, em uma frase:

> **Schell — Lens of Honesty (aplicada):** um report não-confirmado **não pode
> parecer mais fresco do que é, nem desaparecer como se nunca tivesse existido.**
> Ele *envelhece à vista* (cue visual do PET-M11) e, no fim, é *arquivado sem ser
> deletado* (PET-M12). O dado nunca mente sobre seu próprio frescor.

### 4.1 A relação exata entre o check-in (M13) e o auto-archive (M12)

São **duas camadas complementares**, e a fronteira entre elas é o que dá ao
sistema honestidade sem nag:

- **M13 é a camada de CONFIRMAÇÃO HUMANA (owner-confirmed).** Owner-driven, opt-in,
  no máximo uma vez. Só age se o repórter *agir*. Pode **renovar** (resetar o
  relógio) ou **resolver** (reunido). É a *voz*.
- **M12 é a camada MECÂNICA (age-archive).** Cega, determinística, independente do
  repórter. Age **sozinha** quando ninguém confirmou nada e a idade estoura a
  janela. É o *amortecedor* (Sylvester loop NEGATIVO; PET_CURVE.md §3 lista o M12
  como "amortecedor MECÂNICO de staleness").
- **Ordem temporal (invariante de design):** **M13 fala primeiro, M12 age por
  último.** O convite (30d) precede o arquivamento (>30d, default ~90d). A folga
  entre eles é o espaço onde a honestidade vive: o dono teve **uma** chance clara
  de manter o report vivo antes que a mecânica o aposente.
- **M13 pode adiar o M12.** Como "ainda procurando" reseta o carimbo de frescor, e
  o M12 mede idade contra esse mesmo carimbo (§2.1), uma renovação **legitimamente
  empurra o horizonte de arquivamento para a frente** — porque o dono *disse* que
  ainda vale. Isso é honesto: o relógio de arquivamento mede "tempo desde a última
  afirmação de que o report é real", não "tempo desde a primeira publicação".
- **M13 nunca substitui o M12.** Se o repórter ignora o convite (ou trocou de
  dispositivo, ou limpou o `localStorage` — §6), o M12 **ainda** arquiva no prazo.
  O check-in é uma *cortesia honesta*, não um pré-requisito para a limpeza. O mapa
  nunca fica refém de um dono que sumiu.

> **Sylvester `feedback_loop_signs` (por que dois loops, não um):** o loop humano
> (M13) e o loop mecânico (M12) são **ambos negativos/amortecedores** — os dois
> drenam staleness. Ter os dois não é redundância: o humano é *preciso mas
> opcional* (pode não vir), o mecânico é *grosseiro mas garantido* (sempre vem).
> Juntos, o mapa converge para a verdade **com** ou **sem** a participação do dono.

---

## 5. CONTRATO DE PERSISTÊNCIA (handoff para o softwareengineer)

Tudo abaixo é o que o **softwareengineer** implementa (PET-M13 hand-off; o writer
**rides PET-M2**). Design especifica a *forma e a semântica*; a implementação
exata (nomes finais de chave, serialização) fica com a engenharia, mas os
**formatos abaixo são concretos o suficiente para codar contra**.

### 5.1 O token local do report (re-identifica o repórter — SEM conta, SEM servidor)

Escrito **no momento da publicação** (em `petsData.publishPet`, logo após o
`appendRow` de sucesso — espelhando onde `seenIdempotencyKeys.add` já roda). É a
prova local de "eu sou quem reportou este pet, neste dispositivo".

- **Onde:** `window.localStorage` (client-only; já há precedente de flag local de
  uma-vez no PET-M20 para a dica de primeira visita).
- **Chave (shape):** **`petReport:<reportId>`**, onde `<reportId>` é uma
  **identidade estável e PII-free do report** — recomenda-se a **mesma chave por
  coordenadas** que o writer do PET-M2 (`updatePetByCoords`) já usa para casar a
  linha (coords arredondadas → string), **ou** o `idempotency_key` da publicação
  se ele for retido. *Não* usar contato, nome, ou qualquer free-text (barricada de
  PII de PET-M3 / PET_CURVE.md §5). O `<reportId>` é o mesmo identificador que o
  PET-M18 (deep link) define como param coords-keyed PII-free — reutilizar essa
  forma evita inventar uma segunda identidade.
- **Valor (shape JSON):**

  ```json
  {
    "v": 1,                          // versão do shape (migração futura)
    "coordsKey": "<lat6,lng6>",      // a chave que o writer do PET-M2 usa p/ casar a linha
    "publishedAt": "<ISO-8601>",     // = o DateISO gravado no Dados na publicação
    "prompted": false,               // a flag AT-MOST-ONCE (vira true quando o card É MOSTRADO)
    "lastAffirmedAt": null           // ISO da última vez que tocou "ainda procurando" (ou null)
  }
  ```

- **`prompted` é a trava at-most-once.** Vira `true` **no instante em que o card é
  exibido** (não quando respondido). A partir daí, a condição `NAO
  checkinJaMostrado` (§2) é falsa para sempre naquele dispositivo — reload,
  fechar-sem-responder, e re-visita não reabrem o card. **Esta é a aplicação
  mecânica da regra "no máximo uma vez".**
- **`lastAffirmedAt`** é registro local (telemetria honesta para o próprio
  dispositivo); a **fonte da verdade do frescor** é o campo no `Dados` (§5.2), não
  o token. O token re-identifica *quem* e *se já perguntei*; o `Dados` carrega *o
  frescor real* que todo dispositivo lê.

### 5.2 O que "renovar frescor" ESCREVE (a fonte da verdade no `Dados`)

A decisão de design — **campo `freshnessAt` separado, NÃO sobrescrever
`DateISO`**:

- **Adicionar um campo OPCIONAL `freshnessAt` (ISO)** ao blob `Dados` (no
  `petDomain`: `buildPetDados` emite quando presente; `parsePetRow` faz round-trip;
  **rows antigas sem o campo parseiam como sempre** — backward-compat, mesma
  disciplina LSP do `resolvedAt` no PET-M2).
- **Por que separado de `DateISO`, não sobrescrita:** `DateISO` é o **fato
  histórico** "quando foi publicado pela primeira vez" — sobrescrevê-lo
  **apagaria a verdade** ("este report tem 2 dias" quando na real tem 45) e
  violaria a Lens of Honesty (§4). `freshnessAt` é o **fato vivo** "quando o dono
  afirmou pela última vez que vale". Idade-para-frescor e idade-para-arquivo (§2.1)
  passam a medir contra `freshnessAt` **com fallback para `DateISO`** quando
  `freshnessAt` ausente (rows nunca-renovadas). Assim o histórico fica intacto **e**
  o relógio reflete a última afirmação.
- **Campo (nome a codar contra):** **`freshnessAt`** no `Dados` (par com o
  `DateISO`/`resolvedAt` existentes). Forma: string ISO-8601 ou ausente.
- **Como escreve:** **reusa o writer coords-keyed do PET-M2** (`updatePetByCoords`
  / `updatePinDadosByCoords`-style) — reescreve **APENAS a coluna `Dados`** da
  linha casada, preservando `kind:'pet'` e toda a isolação de fome. "ainda
  procurando" = `Dados.freshnessAt = now()`; "já reencontrei" = `Dados.resolvedAt
  = now()` (o caminho `reunido` que o PET-M2 já provê — M13 **não** inventa writer
  novo, **rides** o do M2). Idempotente e fila-compatível com PET-M1, como todo
  write do /pets.

### 5.3 Resumo de quem-guarda-o-quê

| Dado | Onde vive | Papel | Quem escreve |
|---|---|---|---|
| **token do report** (`petReport:<reportId>`) | `localStorage` (este dispositivo) | re-identifica "fui EU que reportei" sem conta | `publishPet` (na publicação) |
| **`prompted`** (flag at-most-once) | dentro do token, `localStorage` | trava o convite a **uma** exibição p/ sempre | a UI do card, ao **mostrar** o card |
| **`freshnessAt`** | `Dados` (planilha, lido por todos) | fonte-da-verdade do frescor; "ainda procurando" o renova | writer do PET-M2 (`updatePetByCoords`) |
| **`resolvedAt`** | `Dados` (planilha) — **já é do PET-M2** | lifecycle `reunido`; "já reencontrei" o grava | writer do PET-M2 (já existe) |
| **`DateISO`** | `Dados` (planilha) — **já existe hoje** | fato histórico imutável de 1ª publicação | `publishPet` (não tocar/sobrescrever) |
| **`LIMIAR_DIAS` (30) + janela do M12** | UMA SOT no `petDomain` | limiar do convite e do arquivo; ordem M13<M12 | const no petDomain (eng) |

---

## 6. Casos de borda e barricadas (Lens of Failure do próprio mecanismo)

> **Schell — Lens of Failure (auto-aplicada):** onde este mecanismo falha, ele
> falha **a favor da honestidade e da calma**, nunca contra.

- **Repórter sem o token (trocou de dispositivo / navegador anônimo / limpou o
  `localStorage`).** O convite **simplesmente não aparece** — não há como
  re-identificá-lo sem conta, e conta é proibida. Degradação digna: o report
  segue a trajetória "não-confirmado" (§4) e o M12 arquiva no prazo. **Nunca**
  mostrar o card a quem não tem o token (mostrar a um estranho seria pedir que
  alguém afirme um pet que não é dele).
- **Mais de um report no mesmo dispositivo.** O token é **por `reportId`** (uma
  chave `petReport:<reportId>` por report). Cada report tem seu próprio convite
  único e sua própria flag `prompted`. Nenhum "check-in em lote", nenhuma fila de
  prompts — isso recairia em nag.
- **Report já `reunido` ou `encerrado` (PET-M2 / PET-M7b) quando o limiar
  estoura.** A condição `naoEstaResolvido` (§2) barra o card. Não se pergunta
  "ainda procurando?" a quem já fechou — seria desrespeitoso e elevaria o arousal
  do estágio E (PET_CURVE.md §1-E).
- **Report já arquivado pelo M12 antes da próxima visita.** A condição
  `naoForaArquivado` (§2) barra o card. Não se ressuscita um convite sobre um
  report que a mecânica já aposentou; se o dono quiser reabrir, é outro fluxo
  (fora de escopo aqui).
- **Usuário fecha o card sem responder.** Resposta válida e gratuita. `prompted`
  já é `true` (gravado ao mostrar), então **não reaparece**. O report degrada como
  "não-confirmado" (§4). Fechar **não** é "encerrar busca" — é só silêncio, e o
  produto respeita o silêncio.
- **Tentação de "só mais um lembretezinho".** Qualquer reaparição do card —
  semanal, ao reabrir o app, "porque faz tempo" — **reintroduz variable/fixed-
  interval** (§1) e é **ship-blocker** (PET_CURVE.md §2, item 4). A flag
  `prompted` existe precisamente para tornar essa tentação *mecanicamente
  impossível*: uma vez mostrado, fim.

---

## 7. Checagem contra a forcing function (PET_CURVE.md §6)

1. **Que estágio toca?** Estágio **C** (espera/esperança) — e desemboca em **E**
   quando a resposta é "já reencontrei". ✓
2. **Abaixa ou eleva o arousal de C?** **Abaixa.** Substitui a incerteza silenciosa
   ("meu report ainda vale? vai sumir?") por *uma* afirmação honesta e o direito de
   largar o celular. ✓
3. **Bate em algum item BANIDO (§2)?** **Não.** Sem streaks, sem countdown como
   pressão, sem badges, **sem nudge recorrente/variable-interval** (o convite é no
   máximo um, §1), sem spike no "reunido" (herda a regra do não-spike). ✓
4. **A decisão é DISCERNÍVEL + INTEGRADA?** **Sim.** "ainda procurando" muda o
   frescor visível (PET-M11); "já reencontrei" alimenta o lifecycle `reunido` real
   (PET-M2). ✓
5. **Respeita o contrato de fechamento / regra do não-spike?** **Sim** — o card é
   dispensável, silencioso depois, e o desfecho `reunido` é morno (§3). ✓
6. **Sobrevive ao Lens of Failure?** **Sim** — degrada a favor da honestidade
   (não-confirmado ≠ deletado, não-confirmado ≠ falso-fresco) e nunca pergunta a
   quem não é o dono (§6). ✓

Passa nos seis. **Abaixa a ansiedade do dono — e merece existir.**
