# PET_MATCH_SPEC.md — Spec de design do match possível (lost ↔ found) + surfacing não-invasivo

<!--
============================================================================
ARTEFATO DE DESIGN — PET-M9a (owner: game-designer)
Pure design. NÃO é código. PET-M9b IMPLEMENTA isto; este arquivo é a
fonte da verdade de PRODUTO para o predicado de match e para o tom do hint.

Âncora herdada de PET_CURVE.md (PET-M-CURVE, depends_on):
  Estágio D — RECONHECIMENTO/MATCH. Arousal SOBE, mas COM FREIO. A
  sensação-alvo é "pode ser ele — vale verificar com calma", NUNCA
  "ACHAMOS!". Uma FALSA CERTEZA aqui é o PIOR erro da superfície inteira
  (anti-bloat header; PET_CURVE §1-D, §5).

Lentes-fonte (citadas inline, auditáveis por uma sessão futura):
  • Schell — Lens of Surprise / Lens of Failure (#62) / Lens of
    Essential Experience / Lens of the Player.
  • Sylvester — elegance_heuristic (o ônus da prova é de quem ADICIONA);
    decision → feedback → reward; feedback_loop_signs (positivo amplifica,
    negativo amortece).
  • Salen & Zimmerman — meaningful play: resultado DISCERNÍVEL + INTEGRADO;
    um falso-positivo é a falha clássica de "não-meaningful".
  • Koster — fun-as-pattern-recognition (aqui INVERTIDO: tratar ruído
    copiável como se fosse padrão é uma falsa skill-check — §6).

Eticamente quente:
  Um match errado é um value-movement de FALSA-ESPERANÇA no ponto de maior
  vulnerabilidade emocional do arco. O default de design é o SILÊNCIO, não
  o alarme. AI auto-matching e push/geo-alertas estão FORA por construção
  (anti-bloat header) — o hint humano-verificável entrega ~80% do valor.
============================================================================
-->

## 0. Tese: o match existe para criar ESPERANÇA CALIBRADA, não certeza

O /pets é uma curva de interesse **invertida** (PET_CURVE §0): cada superfície
abaixa o arousal do dono. O match possível é a **única subida permitida** do arco
— o estágio D — e ela é **freada por design** (PET_CURVE §1-D). O hint não anuncia
um reencontro; ele oferece *uma pista para o dono verificar com calma*.

Por isso a regra-mãe deste spec, da qual tudo o mais deriva:

> **Schell — Lens of Essential Experience.** A UMA sensação que o match deve
> produzir é *"pode ser ele — vale olhar com calma"*. Qualquer parâmetro ou copy
> que produza *"é ele!"* está empurrando a curva na direção errada e é rejeitado
> por construção, não por gosto.

E a sua consequência operacional, que governa cada default abaixo:

> **Sylvester — elegance_heuristic.** O ônus da prova é de quem AMPLIA o conjunto
> de candidatos. O default é **NÃO mostrar**. Um match só aparece quando *empurra
> a esperança na direção da verdade* — caso contrário, **silêncio** (§3). Alargar
> um parâmetro (raio maior, janela maior) precisa se justificar contra o custo de
> um falso-positivo, que neste contexto é o erro mais caro que existe (§6).

Este artefato NÃO contém código, NÃO especifica notificações/contas/geo-alertas
(anti-bloat) e NÃO especifica a UI (PET-M9b). Ele entrega: a **heurística** (§1),
o **surfacing** (§2), o **silêncio** (§3), a **exclusão** (§4), a **interação com
o primitivo de credibilidade** (§5) e o **walk de Lens of Surprise + Lens of
Failure no falso-positivo** (§6).

---

## 1. A HEURÍSTICA de match — parâmetros com defaults JUSTIFICADOS

O match é um **predicado puro** (PET-M9b o codifica ao lado de `petDomain`, lendo
o SOT) que recebe DUAS listagens de pet (já parseadas por `parsePetRow`) e devolve
um veredito: *par candidato* / *não candidato* / *match fraco (silenciar — §3)*.
Todos os ids referenciados são reais do SOT (`petDomain.js`): status
`perdido`/`encontrado`/`avistado`, espécie `cao`/`gato`/`outro`.

Os quatro parâmetros e seus defaults — **cada default é um número contra o qual o
desenvolvedor codifica, com uma justificativa de uma linha.**

### 1.1 Pareamento de STATUS (qual par é candidato e qual NÃO é)

A âncora do match é o status: um pet **`perdido`** (alguém perdeu) só pode casar
com um relato de alguém que **viu/pegou** um pet — `encontrado` ou `avistado`.

| Listagem A | Listagem B | É candidato? | Por quê |
|---|---|---|---|
| `perdido` | `encontrado` | **SIM** | A é a perda; B é "achei um pet" — o par central do produto. |
| `perdido` | `avistado` | **SIM** | A é a perda; B é "vi um pet na rua" — pista mais fraca que `encontrado`, mas legítima. |
| `perdido` | `perdido` | **NÃO** | Duas perdas não se resolvem; não há informação nova para o dono. |
| `encontrado` | `encontrado` | **NÃO** | Dois achadores; nenhum dono à espera no par. |
| `avistado` | `avistado` | **NÃO** | Idem — dois avistamentos não fecham um loop de reencontro. |
| `encontrado` | `avistado` | **NÃO** | Nenhum dos lados é a perda; sem dono no par, o hint não tem destinatário. |

> **Default de pareamento:** match **é** SOMENTE `perdido` ↔ (`encontrado` |
> `avistado`). Todo par sem exatamente um lado `perdido` e um lado
> `encontrado`/`avistado` **não é candidato**. — *Justificativa: só este
> pareamento contém um dono à espera (o destinatário da esperança) e uma evidência
> física do outro lado; os demais pares não têm para quem entregar o hint.*

**Direção/assimetria do surfacing (não da candidatura):** a candidatura é
simétrica (o predicado não se importa com a ordem), mas o *hint* serve aos dois
lados do par de forma espelhada (PET_CURVE estágio D, ramos dono/achador): o dono
do `perdido` vê *"pode ser que alguém tenha visto seu pet"*; o autor do
`encontrado`/`avistado` vê *"pode ser que este pet tenha dono procurando"*. Nenhum
dos dois lados recebe certeza (§2).

### 1.2 ESPÉCIE — match exato, com `outro` como coringa de um lado só

| A.species | B.species | Casa? | Por quê |
|---|---|---|---|
| `cao` | `cao` | SIM | Igualdade exata. |
| `gato` | `gato` | SIM | Igualdade exata. |
| `cao` | `gato` | **NÃO** | Espécies diferentes nunca são o mesmo bicho. |
| `outro` | qualquer | SIM (coringa) | `outro` = "não sei classificar"; não pode excluir um par só por isso. |
| qualquer | `outro` | SIM (coringa) | Idem, simétrico. |
| `''` (vazio) | qualquer | SIM (coringa) | Espécie ausente é desconhecimento, não contradição — trata-se como `outro`. |

> **Default de espécie:** match exige **igualdade de espécie**, EXCETO quando um
> dos lados é `outro` (ou espécie vazia), que age como **coringa** e nunca bloqueia
> o par. — *Justificativa: `cao`≠`gato` é uma contradição dura e barata de checar
> que poda a maioria dos falsos-positivos; mas `outro`/vazio é incerteza, e excluir
> por incerteza esconderia um match real (fail-open digno, como `matchesSelection`
> no SOT).* **Nota para PET-M9b:** o coringa **enfraquece** o par — ver §3, um par
> que só casa por coringa de espécie tende a cair abaixo do limiar de silêncio.

### 1.3 RAIO de distância — **default 5 km**

A distância usa as `coords` `[lat,lng]` de cada listagem (Haversine; ambas já são
pares finitos garantidos por `parsePetRow`).

> **Default de raio:** **5 km** (centro a centro). — *Justificativa: um animal
> perdido normalmente é avistado/recolhido a poucos quilômetros do ponto de fuga,
> mas o ponto que o dono marca (onde percebeu o sumiço) raramente é o ponto exato
> da fuga; 5 km cobre o deslocamento típico de um bairro/região sem inflar o
> conjunto a ponto de casar a cidade inteira.* Raios maiores **aumentam o
> falso-positivo** (o erro mais caro — §6), então 5 km é o teto padrão, não um piso.

**Faixas de força (entram no escore de §3):** dentro de **~1 km** o par é
*forte* na faceta distância; entre 1 e 5 km é *moderado*; acima de 5 km **não é
candidato**. — *Justificativa: a proximidade aumenta monotonicamente a
plausibilidade; tratá-la como degrau (forte/moderado/fora) deixa o limiar de
silêncio modulável sem expor um número cru ao usuário.*

### 1.4 JANELA de tempo — **default 30 dias**

A janela usa `dateIso` de cada listagem (epoch via `Date.parse`, com `nowMs`
INJETADO — mesma disciplina pura de `matchesRecency` no SOT). Mede-se a diferença
**entre as duas datas de relato** (|Δ| em dias), não a idade absoluta de cada uma.

> **Default de janela:** **30 dias** entre os dois relatos. — *Justificativa: casa
> a opção mediana do staircase de recência já existente no SOT
> (`PET_RECENCY_OPTIONS` = 7/30/90 dias), então o match não inventa uma terceira
> escala temporal; 30 dias é largo o bastante para um achado posterior à perda e
> curto o bastante para que os dois relatos plausivelmente descrevam o MESMO
> episódio, não dois sumiços distantes.* Janelas maiores diluem a coincidência
> temporal e elevam o falso-positivo.

**Ordem temporal — preferência, não exclusão:** o caso típico é o `encontrado`/
`avistado` ser **posterior** à perda (`perdido`). Um achado posterior é *mais
forte*; um achado anterior à perda é plausível só como pré-avistamento e é *mais
fraco* (entra no escore de §3), mas **não é excluído** — datas de relato são
ruidosas e o dono pode ter publicado tarde. — *Justificativa: barrar por ordem
temporal exata trataria timestamp ruidoso como prova (mesmo vício do §6); a ordem
modula a força, não a candidatura.*

### 1.5 Resumo da heurística (a tabela contra a qual PET-M9b codifica)

| Parâmetro | Default | Regra | Justificativa de 1 linha |
|---|---|---|---|
| **Status** | `perdido`↔(`encontrado`\|`avistado`) | exatamente um lado `perdido`, o outro `encontrado`/`avistado`; senão NÃO candidato | só este par tem um dono à espera + evidência do outro lado |
| **Espécie** | igualdade exata | `cao`=`cao`, `gato`=`gato`; `outro`/vazio = coringa que não bloqueia (mas enfraquece) | `cao`≠`gato` é contradição barata; incerteza não deve esconder match |
| **Raio** | **5 km** | ≤1 km forte · 1–5 km moderado · >5 km fora | cobre o deslocamento de bairro sem casar a cidade |
| **Janela** | **30 dias** | \|Δrelatos\| ≤ 30 d; achado posterior = mais forte | espelha o staircase 7/30/90 do SOT; mesmo episódio, não dois sumiços |
| **Exclusão** | resolvido fora | reunido/encerrado nunca é candidato (§4) | um pet resolvido não tem loop a fechar |

Todos os defaults vivem em **UM** lugar no SOT (espelhando como `PET_RECENCY_OPTIONS`
e o limiar de PET-M12 vivem em `petDomain`), para que ajustar o raio/janela seja uma
edição só, lida por predicado e por teste — nunca espalhada (PET-M9b).

---

## 2. SURFACING — opt-in, calmo, NUNCA certo ("pode ser", não "encontramos")

Estágio D pede **esperança calibrada** (PET_CURVE §1-D). O surfacing é onde o tom
vira concreto. Três regras, todas auditáveis:

### 2.1 OPT-IN — o hint nunca empurra; ele se oferece
O match aparece como um afeto **discreto e dispensável**, dentro de uma superfície
que o usuário já está olhando (o detalhe do pet / a lista — PET-M8), **nunca** como
interrupção, modal de boas-vindas, banner de topo ou — proibido por construção —
notificação/alerta geográfico (anti-bloat header). A ação de **abrir/comparar** o
possível par é uma decisão do usuário (um toque consciente), não um auto-foco.

> **Schell — Lens of the Player.** O dono no estágio D está com julgamento baixo e
> esperança alta (PET_CURVE §5). Empurrar o match *para* ele rouba a única coisa que
> o protege: a decisão calma de olhar. Opt-in devolve a agência ao dono.

### 2.2 COPY — "pode ser", jamais "encontramos"
O surfacing nomeia o estado como **possibilidade**, não fato. (uiux/PET-M23 são
donos das strings finais; aqui fixa-se o REGISTRO, não a copy literal.)

- **Permitido / alvo:** *"pode ser que alguém tenha visto um pet parecido perto
  daqui — vale olhar com calma."* / *"um relato parecido apareceu por perto."*
- **BANIDO:** *"encontramos seu pet"*, *"match!"*, *"é o seu pet!"*, *"99% de
  certeza"*, qualquer porcentagem/score exposto, qualquer selo de "verificado".
- **Sem urgência fabricada:** nada de *"responda agora"*, contagem regressiva, ou
  "X pessoas já viram" (governador PET_CURVE §2, itens 2, 4, 6).

> **Salen & Zimmerman — meaningful play.** O resultado precisa ser DISCERNÍVEL (o
> usuário entende que é *uma pista, não uma conclusão*) e INTEGRADO (leva a UMA
> próxima ação calma: comparar as duas listagens / usar o reveal-on-tap do contato
> do PET-M3). Uma copy que afirma certeza é DISCERNÍVEL-porém-FALSA — o pior dos
> mundos: a pessoa entende com clareza uma mentira.

### 2.3 Exatamente UMA próxima decisão calma
Coerente com o contrato de fechamento (PET_CURVE §4): o hint oferece **uma** ação
— *comparar as duas listagens / abrir o outro relato* — e, dali, o caminho natural
é o reveal-on-tap do contato (PET-M3) e a verificação pelo detalhe privado (§5).
**Não** um menu, **não** "compartilhar + denunciar + comparar + seguir". Uma decisão
= arousal mínimo.

### 2.4 Tom resumido (a frase de acceptance do YAML, fixada)
**possível · opt-in · nunca certo.** Se uma string viola qualquer um dos três, ela
não entra — é ship-blocker de tom, não débito.

---

## 3. A regra do SILÊNCIO — quando um match FRACO NÃO pode aparecer

Nem todo par candidato deve ser mostrado. Mostrar um par fraco é **fabricar
falsa-esperança** — o value-movement proibido do estágio D (PET_CURVE §1-D). O
silêncio é o default; o surfacing é a exceção que precisa se justificar.

### 3.1 O conceito de limiar (não um número de UI; um piso de confiança)
PET-M9b atribui a cada par candidato uma **força** agregada das facetas — não para
mostrar um score (banido, §2.2), mas para decidir **mostrar ou silenciar**. O par
só **rompe o silêncio** quando soma confiança suficiente em mais de uma faceta;
um par que casa por um único eixo e é fraco/coringa em todos os outros **fica
silencioso**.

Conceitualmente, um par é **forte o bastante para aparecer** quando satisfaz
*todas* as condições de candidatura (§1) **E** acumula sinal além do mínimo — por
exemplo (calibração que PET-M9b fixa e testa, defaults no SOT):

- **Proximidade real:** distância na faixa *forte* (≤1 km) **ou** *moderada*
  (1–5 km) **com** outra faceta forte — nunca o teto de 5 km sozinho.
- **Coincidência temporal:** dentro da janela, **e** preferencialmente com o
  achado *posterior* à perda; um achado fora de ordem só passa se as outras
  facetas forem fortes.
- **Espécie de verdade, não coringa:** um par que só casa porque um lado é
  `outro`/vazio **não** rompe o silêncio sozinho — coringa é ausência de
  contradição, não evidência de identidade.

### 3.2 A formulação do limiar como teste de UMA linha
> **Mostrar este par MOVE a esperança do dono na direção da VERDADE, ou só na
> direção de "talvez qualquer coisa"?** Se a única coisa que o par tem é "é um pet
> e está na mesma cidade", ele **não** move na direção da verdade — **silêncio.**

> **Sylvester — feedback_loop_signs.** Mostrar matches fracos cria um loop
> POSITIVO de ansiedade (cada pista frágil traz o dono de volta a checar, sem
> nunca resolver — exatamente o anti-padrão do estágio C/D). O silêncio é o loop
> NEGATIVO/amortecedor correto: menos pistas, porém mais verdadeiras.

### 3.3 Falso-negativo é o erro ACEITÁVEL aqui
Silenciar pode esconder um match verdadeiro porém fraco. **É o trade-off correto:**
um falso-negativo deixa o dono onde já estava (estágio C, busca ativa por filtro/
lista do PET-M7/M8 continua disponível); um falso-positivo **injeta esperança falsa**
e expõe o dono ao golpe (§6). Entre os dois erros, o spec **prefere o silêncio.** —
*Esta é a aplicação direta do elegance_heuristic: na dúvida, NÃO adicione um hint.*

---

## 4. EXCLUSÃO — pets resolvidos (reunido / encerrado) NÃO são candidatos

Um pet **reunido** (voltou) ou com **busca encerrada** (PET_CURVE estágio E;
persistido via `resolvedAt`/`resolved` do PET-M2; envelhecido/arquivado via
PET-M12; encerramento consciente via PET-M7b) **não entra no conjunto de
candidatos de nenhum lado do par.**

- **Por quê:** um pet resolvido não tem loop a fechar. Casá-lo reabriria um arousal
  que o estágio E já levou ao repouso — e poderia sugerir ao dono que seu reencontro
  "não valeu", o pior tipo de regressão na curva.
- **Como (regra para PET-M9b):** o predicado **filtra resolvidos ANTES de parear**.
  Um pet é candidato só se ativo — `resolvedAt` ausente/`resolved` falso (M2) **e**
  não arquivado por idade (M12). Rows antigos sem o campo `resolvedAt` parseiam como
  **ativos** (back-compat garantida pelo PET-M2), então a exclusão nunca derruba um
  relato legítimo por ausência do campo.
- **Espelha o anti-bloat header:** o auto-match de IA está fora porque um auto-match
  errado é falsa-esperança; aqui, com a mesma lógica, **um match contra um pet
  resolvido é falsa-esperança garantida** — e é cortado na raiz, antes de qualquer
  escore.

---

## 5. Interação com o PRIMITIVO DE CREDIBILIDADE (PET_CURVE §5)

O match e o "detalhe que só o dono sabe" (PET_CURVE §5) são **duas metades do mesmo
freio do estágio D**: o match *abre* a possibilidade; o detalhe privado *a verifica
com calma*. O match **nunca** substitui a verificação — ele a **convida**.

1. **O match aproxima; ele não prova.** Quando o hint surge, ele leva o dono ao
   reveal-on-tap do contato (PET-M3) e, dali, à pergunta-desafio do detalhe privado
   (PET_CURVE §5): *"o que ele tem atrás da orelha esquerda?"* / *"como ele reage
   ao nome dele?"*. O match diz **"pode ser"**; o detalhe privado é como o dono
   transforma "pode ser" em "é" — **fora** do sistema, na conversa.
2. **O match NUNCA usa nem revela o detalhe privado.** O predicado de match casa
   só por status/espécie/raio/janela (§1) — **jamais** pelo detalhe-de-verificação,
   que por definição **não está** no caminho de dados público (mapa/lista/detalhe/
   analytics — barricada do PET-M3/§5). Se o detalhe privado vazasse para o critério
   de match, ele apareceria em alguma superfície e o primitivo morreria (PET_CURVE
   §5, "não vaze o segredo").
3. **O match não dá falsa garantia.** Coerente com PET_CURVE §5 ("não prometa
   'verificado'"): o hint **não** é um selo. Ele aponta um candidato; a credibilidade
   vem do dono aplicando o detalhe privado, não de o sistema afirmar identidade.
4. **A nota calma é o elo.** A mesma nota de privacidade do PET-M3 que ensina o dono
   a **guardar** (não publicar) o detalhe privado é o que torna o hint do match
   *seguro de usar* — sem ela, o match entregaria um contato a um dono sem ferramenta
   de verificação. O match **depende** desse ensino para ser digno.

> **Em uma linha:** o match é a *surpresa boa* (um candidato) **enquadrada** pela
> ferramenta que neutraliza a *surpresa-traição* (o detalhe privado). Um sem o outro
> é incompleto: match sozinho é esperança crua; detalhe privado sozinho nunca dispara.

---

## 6. Lens of Surprise + Lens of Failure no FALSO-POSITIVO (match errado)

O caso de falha definidor deste spec é o **match errado** — o sistema aproxima duas
listagens que **não** são o mesmo bicho. Ele é caro porque acontece no ponto de
maior vulnerabilidade emocional do arco inteiro (PET_CURVE §1-D, §5).

### 6.1 Lens of Surprise — a surpresa boa contra a surpresa que trai

> **Schell — Lens of Surprise.** Há duas surpresas possíveis no estágio D. A **boa**
> é *delight*: "opa, um candidato plausível — vale olhar." A **má** é a **traição da
> confiança**: o sistema disse "pode ser" sobre algo que não era, e o dono gastou
> esperança real num beco.

- **O que o spec maximiza (surpresa boa):** um hint que aparece **só** quando rompe
  o silêncio (§3), em tom de possibilidade (§2), levando a uma verificação calma
  (§5). A surpresa é leve, opt-in e reversível — o dono olha e segue.
- **O que o spec evita (surpresa que trai):** um hint frequente, confiante
  ("encontramos!"), ou disparado por par fraco. Cada falso-positivo que se apresenta
  como certeza queima a confiança no recurso — depois de uma traição, o dono passa a
  *ignorar* até os matches verdadeiros (o recurso se auto-destrói). **Por isso o tom
  nunca-certo (§2) e o silêncio (§3) não são polidez: são o que mantém o hint
  utilizável ao longo do tempo.**

### 6.2 Lens of Failure — o walk completo do match errado

> **Schell — Lens of Failure (#62).** A pergunta: quando o sistema erra, a pessoa
> **entende** o que aconteceu e **consegue se proteger**, sem ser punida nem
> empurrada?

**O caminho da falha, passo a passo:**

1. **O erro acontece.** O predicado casa um `perdido` com um `encontrado`/`avistado`
   que é outro bicho parecido (mesma espécie, mesma região, mesma semana — tudo o
   que o §1 vê). Nenhuma heurística geográfica/temporal distingue dois gatos pretos
   no mesmo bairro: **isso é um limite estrutural, não um bug a "consertar com mais
   parâmetros".** (Daí o auto-match de IA estar fora — anti-bloat header: mais
   máquina não resolve um problema de identidade, só esconde o erro atrás de
   confiança fabricada.)

2. **Por que é o PIOR erro desta superfície.** O dono no estágio D tem esperança
   alta e julgamento baixo (PET_CURVE §5). Um falso-positivo apresentado como
   certeza:
   - injeta um **value-movement de falsa-esperança** (o movimento proibido, §0);
   - **abre a porta do golpe** do falso "eu-achei-seu-pet" (PET_CURVE §5): um match
     confiante dá ao golpista uma vítima já convencida de que "o sistema confirmou";
   - **queima a credibilidade** do recurso (§6.1) — um dono traído desliga o hint.

3. **Por que mais "esperteza" não é a defesa.** Tratar espécie+cor+área como prova
   é tratar **ruído copiável como padrão** (Koster): qualquer um lê o anúncio
   público e reproduz esses dados. Apertar o raio/janela reduz a frequência mas
   **nunca** elimina o caso (dois bichos idênticos vizinhos existem). A defesa,
   portanto, **não pode ser** "acertar sempre" — tem que ser **errar sem causar
   dano**.

4. **Como o spec defende (as três barricadas, em ordem):**
   - **(a) Silêncio (§3)** — a maioria dos falsos-positivos nunca chega ao dono:
     pares fracos não rompem o limiar. Preferir o falso-negativo (§3.3) é
     exatamente escolher *não disparar na dúvida*. **Primeira linha de defesa: não
     mostrar.**
   - **(b) Tom nunca-certo (§2)** — os falsos-positivos que *passam* o limiar chegam
     como **"pode ser"**, não "é". O dono já recebe a pista enquadrada como
     *hipótese a verificar* — não há certeza para o golpista "herdar". A copy
     proibida (§2.2) é proibida *porque* ela é o que tornaria um falso-positivo
     perigoso.
   - **(c) Verificação pelo detalhe privado (§5)** — o dono confirma com um fato
     que **não está no anúncio**. O par errado (outro bicho) **falha o desafio**: o
     suposto achador não sabe "o que ele tem atrás da orelha". A assimetria de
     informação volta para o lado do dono, e o falso-positivo morre *na conversa*,
     antes de virar dano.

5. **O resultado: falha sem punição nem dark-pattern.** Quando o match erra, o dono
   (i) recebeu apenas uma *possibilidade* (§2), (ii) tinha a ferramenta para
   descartá-la com calma (§5), e (iii) **não foi pressionado** a agir, a "confirmar
   agora", a pagar, nem envergonhado por desconfiar. Nenhuma copy diz "não perca
   essa chance". O hint que erra deixa o dono **exatamente onde estava**, com mais
   uma pista descartada — que é precisamente o critério de aceite do YAML: *o
   caminho do falso-positivo não produz nenhuma pressão de dark-pattern.*

> **Síntese (Essential Experience + Failure):** o match foi desenhado para que seu
> **modo de falha mais provável** (o falso-positivo) seja **inofensivo**. Ele
> aparece pouco (silêncio), promete pouco (nunca-certo) e é fácil de derrubar
> (detalhe privado). É a aplicação literal do elegance_heuristic: como não dá para
> garantir o acerto, garante-se que o erro **não machuque** — e, na dúvida entre
> errar mostrando e errar calando, **cala-se.**

---

## 7. Handoff para PET-M9b (o que implementar contra este spec)

PET-M9b (softwareengineer) implementa, **sem reabrir as decisões de design acima**:

1. Um **predicado puro** ao lado de `petDomain` (lê o SOT; `nowMs` injetado; nunca
   lança em pet malformado — mesma disciplina de `matchesPetFilter`) que recebe duas
   listagens e devolve *candidato / não-candidato / fraco-silenciar*, aplicando §1
   (status/espécie/raio/janela), §3 (limiar de silêncio) e §4 (exclusão de
   resolvidos ANTES de parear).
2. Os **defaults em UM lugar no SOT** (`5 km`, `30 dias`, faixas de força),
   espelhando `PET_RECENCY_OPTIONS`/limiares de PET-M12 — lidos por predicado E por
   teste, nunca espalhados.
3. O **surfacing** conforme §2 (opt-in, calmo, nunca-certo, UMA próxima decisão),
   com as strings finais vindo de uiux/PET-M23 — este spec fixa só o registro.
4. **Testes** que travam: o pareamento de status (§1.1, incl. os NÃO-candidatos),
   o coringa `outro`/vazio (§1.2), a exclusão de reunido/encerrado (§4), e **pelo
   menos um par fraco que DEVE ficar silencioso** (§3) — o teste do silêncio é a
   forcing-function do erro mais caro.

> **Critério de pronto (do YAML):** heurística com defaults justificados (espécie +
> raio + janela + pareamento de status) ✔ (§1); surfacing "possível · opt-in ·
> nunca certo" + limiar de silêncio + exclusão de reunido/encerrado ✔ (§2/§3/§4); o
> caminho do falso-positivo caminhado pelo Lens of Failure **sem** produzir
> dark-pattern ✔ (§6).
