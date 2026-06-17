# MAPA FOME: Prioridade de Expansao Internacional

Tabela de priorizacao estrategica de paises para a expansao internacional do MAPA FOME.
Deriva da Secao 20 do SOT (`mapafome-ri-folhas/SOT/mapafome-SOT.md`). Convencoes herdadas do
SOT: SEM travessao (em-dash); selo epistemico em toda afirmacao factual.

> **Por que esta lista existe.** O MAPA FOME atende tres frentes de necessidade humanitaria,
> alem da fome do cotidiano: (1) lugares com **catastrofes naturais** onde pessoas **perdem
> suas casas**; (2) **refugiados e migrantes**; (3) quem **nao consegue pagar pela comida**.
> A expansao prioriza os paises onde essas tres frentes sao mais agudas E onde a plataforma
> ja consegue servir bem (idioma + ponte operacional). [Inference, a partir do SOT Secao 20]

> **Aviso epistemico.** Todos os numeros macro (exposicao a desastre, refugiados, inseguranca
> alimentar) sao **[Unverified]** como dado de terceiro: confirmar em fonte primaria
> (UNHCR/ACNUR para refugiados; FAO SOFI para fome; EM-DAT / IDMC para desastres e
> deslocamento) antes de citar como fato. O ranking e **[Inference]**. O unico eixo
> **[Verified]** e o idioma suportado (lista de locales do proprio app).

---

## Metodologia de pontuacao

Cinco eixos, cada um 0 a 3. Os quatro primeiros sao SINAIS DE NECESSIDADE; o quinto e CAPACIDADE.

| Eixo | O que mede | Peso | Frente da missao |
|---|---|---|---|
| **A. Idioma na UI** | Idioma principal ja esta nos 7 locales? (servivel a custo zero) | x3 | capacidade |
| **B. Catastrofe / desabrigados** | Frequencia/severidade de enchente, terremoto, tempestade, seca | x2 | frente 1 |
| **C. Refugiados / migrantes** | Tamanho da populacao refugiada/deslocada acolhida | x2 | frente 2 |
| **D. Inseguranca alimentar** | Parcela que nao consegue pagar alimentacao adequada | x2 | frente 3 |
| **E. Ponte / diaspora** | Laco lusofono ou vinculo migratorio com o Brasil (warm-start) | x1 | capacidade |

**Idiomas ja suportados (eixo A = [Verified]):** portugues, espanhol, ingles, alemao, frances,
russo, chines simplificado, **arabe, bengali, ucraniano**. (SOT Secao 6; `i18n/engine.js`
`SUPPORTED_LOCALES` = `['pt-BR','es','en-US','de','fr','ru','zh','ar','bn','uk']`.)
Auto-deteccao lusofona do app: br, pt, ao, mz, cv, gw, st, tl, gq -> portugues. [Verified, engine]

> **Migracao 7 -> 10 locales (2026-06-15).** A versao original deste ranking foi escrita para 7
> idiomas e marcava arabe / bengali / ucraniano como "Nao" (eixo A = 0). O `engine.js` ja embarca
> as 10 locales acima [Verified], entao os paises de lingua arabe (Iraque, Iemen, Egito, Jordania,
> Siria, Sudao, Argelia, Marrocos, Tunisia, Libano, Mauritania, Djibuti, Comores...), bengali
> (Bangladesh) e ucraniana (Ucrania) sobem de eixo A 0 -> 3 (ou 0 -> 2 quando o arabe e a segunda
> lingua, nao a materna). As linhas afetadas ja existentes na tabela mantem a nota antiga ate uma
> revisao completa; as linhas NOVAS abaixo ja usam o eixo A das 10 locales. **Pendencia:** rerodar o
> score das ~14 linhas arabes/bengali/ucranianas pre-existentes (Bangladesh, Siria, Sudao, Ucrania,
> Argelia, Marrocos, Tunisia, Libano, Mauritania, Ira nao -- farsi fica 0) sob o novo eixo A.

`Score = 3A + 2B + 2C + 2D + 1E` (maximo 30). Notas de eixo sao [Inference]; magnitudes que as
sustentam sao [Unverified].

---

## Tabela priorizada (ranking de 90 paises ~ 46% dos ~195 do mundo)

Ordenada por Score decrescente, depois alfabetica. Notas de eixo 0 a 3 (0 = baixo/ausente,
1 = moderado, 2 = alto, 3 = muito alto), todas [Inference]; magnitudes que as sustentam sao
[Unverified]; o eixo A (idioma) e [Verified]. Tier: S = 24 a 30, A = 19 a 23, B = 12 a 18.

| # | Pais | Idioma principal | Idioma na UI? | A | B | C | D | E | **Score** | Tier |
|---|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | **Angola** | Portugues | Sim (pt) | 3 | 2 | 2 | 3 | 3 | **26** | S |
| 2 | **Mocambique** | Portugues | Sim (pt) | 3 | 3 | 1 | 3 | 3 | **26** | S |
| 3 | **Colombia** | Espanhol | Sim (es) | 3 | 2 | 3 | 2 | 2 | **25** | S |
| 4 | **Guatemala** | Espanhol | Sim (es) | 3 | 3 | 1 | 3 | 1 | **24** | S |
| 5 | **Mexico** | Espanhol | Sim (es) | 3 | 3 | 2 | 2 | 1 | **24** | S |
| 6 | **Peru** | Espanhol | Sim (es) | 3 | 3 | 2 | 2 | 1 | **24** | S |
| 7 | **Haiti** | Frances (e crioulo) | Parcial (fr) | 2 | 3 | 2 | 3 | 1 | **23** | A |
| 8 | **Iemen** | Arabe | Sim (ar) | 3 | 2 | 2 | 3 | 0 | **23** | A |
| 9 | **Republica Dem. do Congo** | Frances | Sim (fr) | 3 | 1 | 3 | 3 | 0 | **23** | A |
| 10 | **Venezuela** | Espanhol | Sim (es) | 3 | 1 | 2 | 3 | 2 | **23** | A |
| 11 | **Equador** | Espanhol | Sim (es) | 3 | 2 | 2 | 2 | 1 | **22** | A |
| 12 | **Guine-Bissau** | Portugues | Sim (pt) | 3 | 1 | 1 | 3 | 3 | **22** | A |
| 13 | **Honduras** | Espanhol | Sim (es) | 3 | 3 | 1 | 2 | 1 | **22** | A |
| 14 | **Egito** | Arabe | Sim (ar) | 3 | 1 | 3 | 2 | 0 | **21** | A |
| 15 | **Filipinas** | Filipino (e ingles) | Sim (en) | 3 | 3 | 1 | 2 | 0 | **21** | A |
| 16 | **Iraque** | Arabe | Sim (ar) | 3 | 1 | 3 | 2 | 0 | **21** | A |
| 17 | **Bolivia** | Espanhol | Sim (es) | 3 | 2 | 1 | 2 | 1 | **20** | A |
| 18 | **Cabo Verde** | Portugues | Sim (pt) | 3 | 2 | 0 | 2 | 3 | **20** | A |
| 19 | **Estados Unidos** | Ingles | Sim (en) | 3 | 2 | 2 | 1 | 1 | **20** | A |
| 20 | **India** | Hindi (ingles co-of.) | Parcial (en) | 2 | 3 | 1 | 3 | 0 | **20** | A |
| 21 | **Nicaragua** | Espanhol | Sim (es) | 3 | 2 | 1 | 2 | 1 | **20** | A |
| 22 | **Quenia** | Suaili (e ingles) | Parcial (en) | 2 | 2 | 3 | 2 | 0 | **20** | A |
| 23 | **Camaroes** | Frances (e ingles) | Sim (fr) | 3 | 1 | 2 | 2 | 0 | **19** | A |
| 24 | **Chade** | Frances (e arabe) | Sim (fr) | 3 | 1 | 2 | 2 | 0 | **19** | A |
| 25 | **Congo (Rep.)** | Frances | Sim (fr) | 3 | 1 | 2 | 2 | 0 | **19** | A |
| 26 | **Cuba** | Espanhol | Sim (es) | 3 | 2 | 1 | 2 | 0 | **19** | A |
| 27 | **Djibuti** | Arabe (e frances) | Sim (ar/fr) | 3 | 1 | 2 | 2 | 0 | **19** | A |
| 28 | **El Salvador** | Espanhol | Sim (es) | 3 | 2 | 1 | 2 | 0 | **19** | A |
| 29 | **Republica Centro-Africana** | Frances (e sango) | Sim (fr) | 3 | 0 | 2 | 3 | 0 | **19** | A |
| 30 | **Bangladesh** | Bengali | Nao | 0 | 3 | 3 | 3 | 0 | **18** | B |
| 31 | **Burundi** | Quirundi (e frances) | Parcial (fr) | 2 | 1 | 2 | 3 | 0 | **18** | B |
| 32 | **Eritreia** | Tigrinia (e arabe) | Parcial (ar) | 2 | 1 | 2 | 3 | 0 | **18** | B |
| 33 | **Libano** | Arabe (frances difundido) | Parcial (fr) | 2 | 1 | 3 | 2 | 0 | **18** | B |
| 34 | **Nigeria** | Ingles (e Hausa/Yoruba/Igbo) | Parcial (en) | 2 | 2 | 1 | 3 | 0 | **18** | B |
| 35 | **Republica Dominicana** | Espanhol | Sim (es) | 3 | 2 | 1 | 1 | 1 | **18** | B |
| 36 | **Sudao do Sul** | Ingles (e arabe) | Parcial (en) | 2 | 1 | 2 | 3 | 0 | **18** | B |
| 37 | **Ucrania** | Ucraniano (russo difundido) | Parcial (ru) | 2 | 1 | 3 | 2 | 0 | **18** | B |
| 38 | **Uganda** | Ingles (e suaili) | Parcial (en) | 2 | 1 | 3 | 2 | 0 | **18** | B |
| 39 | **Alemanha** | Alemao | Sim (de) | 3 | 1 | 3 | 0 | 0 | **17** | B |
| 40 | **Burkina Faso** | Frances | Sim (fr) | 3 | 1 | 2 | 1 | 0 | **17** | B |
| 41 | **Comores** | Arabe (e frances) | Sim (ar/fr) | 3 | 2 | 0 | 2 | 0 | **17** | B |
| 42 | **Costa do Marfim** | Frances | Sim (fr) | 3 | 1 | 2 | 1 | 0 | **17** | B |
| 43 | **Gambia** | Ingles | Sim (en) | 3 | 1 | 1 | 2 | 0 | **17** | B |
| 44 | **Jordania** | Arabe | Sim (ar) | 3 | 0 | 3 | 1 | 0 | **17** | B |
| 45 | **Mali** | Frances | Sim (fr) | 3 | 1 | 1 | 2 | 0 | **17** | B |
| 46 | **Niger** | Frances | Sim (fr) | 3 | 2 | 1 | 1 | 0 | **17** | B |
| 47 | **Serra Leoa** | Ingles | Sim (en) | 3 | 1 | 1 | 2 | 0 | **17** | B |
| 48 | **Togo** | Frances | Sim (fr) | 3 | 1 | 1 | 2 | 0 | **17** | B |
| 49 | **Africa do Sul** | Ingles (e zulu/africaner) | Parcial (en) | 2 | 1 | 3 | 1 | 0 | **16** | B |
| 50 | **Argentina** | Espanhol | Sim (es) | 3 | 1 | 1 | 1 | 1 | **16** | B |
| 51 | **Chile** | Espanhol | Sim (es) | 3 | 2 | 1 | 0 | 1 | **16** | B |
| 52 | **Etiopia** | Amarico | Nao | 0 | 2 | 3 | 3 | 0 | **16** | B |
| 53 | **Madagascar** | Malgaxe (e frances) | Parcial (fr) | 2 | 2 | 0 | 3 | 0 | **16** | B |
| 54 | **Panama** | Espanhol | Sim (es) | 3 | 1 | 1 | 1 | 1 | **16** | B |
| 55 | **Paraguai** | Espanhol (e guarani) | Sim (es) | 3 | 2 | 0 | 1 | 1 | **16** | B |
| 56 | **Portugal** | Portugues | Sim (pt) | 3 | 1 | 1 | 0 | 3 | **16** | B |
| 57 | **Siria** | Arabe | Nao | 0 | 2 | 3 | 3 | 0 | **16** | B |
| 58 | **Sudao** | Arabe | Nao | 0 | 2 | 3 | 3 | 0 | **16** | B |
| 59 | **Tanzania** | Suaili (e ingles) | Parcial (en) | 2 | 1 | 3 | 1 | 0 | **16** | B |
| 60 | **Timor-Leste** | Portugues (e tetum) | Sim (pt) | 3 | 1 | 0 | 1 | 3 | **16** | B |
| 61 | **Benin** | Frances | Sim (fr) | 3 | 1 | 1 | 1 | 0 | **15** | B |
| 62 | **Canada** | Ingles (e frances) | Sim (en) | 3 | 1 | 2 | 0 | 0 | **15** | B |
| 63 | **China** | Chines (mandarim) | Sim (zh) | 3 | 2 | 0 | 1 | 0 | **15** | B |
| 64 | **Franca** | Frances | Sim (fr) | 3 | 1 | 2 | 0 | 0 | **15** | B |
| 65 | **Guine** | Frances | Sim (fr) | 3 | 1 | 1 | 1 | 0 | **15** | B |
| 66 | **Liberia** | Ingles | Sim (en) | 3 | 1 | 0 | 2 | 0 | **15** | B |
| 67 | **Senegal** | Frances | Sim (fr) | 3 | 1 | 1 | 1 | 0 | **15** | B |
| 68 | **Argelia** | Arabe (frances difundido) | Parcial (fr) | 2 | 1 | 2 | 1 | 0 | **14** | B |
| 69 | **Espanha** | Espanhol | Sim (es) | 3 | 1 | 1 | 0 | 1 | **14** | B |
| 70 | **Guine Equatorial** | Espanhol | Sim (es) | 3 | 0 | 0 | 1 | 3 | **14** | B |
| 71 | **Malaui** | Chichewa (e ingles) | Parcial (en) | 2 | 2 | 0 | 2 | 0 | **14** | B |
| 72 | **Mauritania** | Arabe (e frances) | Parcial (fr) | 2 | 1 | 1 | 2 | 0 | **14** | B |
| 73 | **Paquistao** | Urdu (ingles co-of.) | Parcial (en) | 2 | 2 | 1 | 1 | 0 | **14** | B |
| 74 | **Ruanda** | Quiniaruanda (e frances) | Parcial (fr) | 2 | 1 | 2 | 1 | 0 | **14** | B |
| 75 | **Zambia** | Ingles (e bemba) | Parcial (en) | 2 | 1 | 1 | 2 | 0 | **14** | B |
| 76 | **Zimbabue** | Ingles (e shona) | Parcial (en) | 2 | 2 | 0 | 2 | 0 | **14** | B |
| 77 | **Gana** | Ingles | Sim (en) | 3 | 1 | 0 | 1 | 0 | **13** | B |
| 78 | **Reino Unido** | Ingles | Sim (en) | 3 | 1 | 1 | 0 | 0 | **13** | B |
| 79 | **Russia** | Russo | Sim (ru) | 3 | 1 | 1 | 0 | 0 | **13** | B |
| 80 | **Afeganistao** | Pachto / Dari | Nao | 0 | 2 | 1 | 3 | 0 | **12** | B |
| 81 | **Cazaquistao** | Cazaque (russo difundido) | Parcial (ru) | 2 | 1 | 1 | 1 | 0 | **12** | B |
| 82 | **Indonesia** | Indonesio | Nao | 0 | 3 | 1 | 2 | 0 | **12** | B |
| 83 | **Ira** | Persa (farsi) | Nao | 0 | 2 | 3 | 1 | 0 | **12** | B |
| 84 | **Marrocos** | Arabe (frances difundido) | Parcial (fr) | 2 | 1 | 1 | 1 | 0 | **12** | B |
| 85 | **Mianmar** | Birmanes | Nao | 0 | 2 | 1 | 3 | 0 | **12** | B |
| 86 | **Nepal** | Nepali | Nao | 0 | 3 | 1 | 2 | 0 | **12** | B |
| 87 | **Sao Tome e Principe** | Portugues | Sim (pt) | 3 | 0 | 0 | 0 | 3 | **12** | B |
| 88 | **Somalia** | Somali | Nao | 0 | 2 | 1 | 3 | 0 | **12** | B |
| 89 | **Tunisia** | Arabe (frances difundido) | Parcial (fr) | 2 | 1 | 1 | 1 | 0 | **12** | B |
| 90 | **Uruguai** | Espanhol | Sim (es) | 3 | 1 | 0 | 0 | 1 | **12** | B |

---

## Tiers e leitura estrategica

Distribuicao dos 90 paises: **Tier S = 6** (score 24 a 26), **Tier A = 23** (19 a 23),
**Tier B = 61** (12 a 18). Os ~105 paises restantes (~54% do mundo) ficam fora deste recorte de
46% (score < 12); entram numa revisao futura ou quando uma nova locale mudar o eixo A. A migracao
7 -> 10 locales (arabe/bengali/ucraniano) e a inclusao dos 12 paises novos elevaram o Tier A de 18
para 23 (entram Iemen, Egito, Iraque, Republica do Congo, Djibuti) e o Tier B de 54 para 61.

### Tier S (atacar primeiro): lusofono + hispanofono de alta necessidade
Onde idioma, necessidade e ponte coincidem. Custo de entrada minimo.

- **Mocambique, Angola, Guine-Bissau, Cabo Verde (PALOP).** Portugues JA na UI e auto-deteccao
  lusofona ja roteia esses paises [Verified, engine]. Inseguranca alimentar e ciclones/enchentes
  recorrentes (especialmente Mocambique) [Unverified]. **Maior warm-start possivel:** mesma lingua,
  mesma diaspora, mesmo principio de vizinho-conecta-vizinho. E a extensao mais natural do mandato
  "POR e PARA estrangeiros" (SOT Secao 6) para fora do Brasil. (Guine-Bissau e Cabo Verde caem no
  Tier A por necessidade/ponte relativas, mas pertencem ao mesmo bloco lusofono.)
- **Colombia, Mexico, Peru (America Latina hispanofona, topo do S); Venezuela, Guatemala, Equador,
  Honduras, Bolivia, Nicaragua, Cuba, El Salvador (Tier A hispanofono).** Espanhol JA na UI.
  Alinhado a escala declarada no pitch "America Latina (200 milhoes+)" (SOT Secao 14) [Unverified
  nos numeros]. Colombia e Venezuela carregam o maior corredor de refugiados/migrantes do
  hemisferio [Unverified]; Mexico, Peru, Guatemala e Honduras concentram exposicao sismica, secas e
  tempestades [Unverified]. Bloco de ALTO retorno: um unico idioma (es) ja cobre toda a regiao.

### Tier A (segunda onda): idioma coberto, necessidade alta, ponte fraca
Servivel sem (ou quase sem) nova locale, mas sem diaspora-ponte forte. Entra apos validar o Tier S.

- **RD Congo, Republica Centro-Africana (frances).** Altissima carga humanitaria (deslocamento,
  fome, desastre) [Unverified]; frances ja na UI.
- **Haiti (frances parcial).** Necessidade maxima nas tres frentes [Unverified]; frances oficial mas
  o crioulo e a lingua materna, entao a cobertura e parcial (uma locale crioulo seria o passo certo).
- **Filipinas (en), India (en parcial), Quenia (en parcial).** Exposicao extrema a tufoes/enchentes
  e secas [Unverified]; ingles cobre a UI institucional, mas o alcance popular pede idioma local
  (cobertura parcial na India e no Quenia).

### Tier B (idioma coberto + necessidade media, OU necessidade altissima com idioma fora dos 10)
A maior faixa (61 paises). Duas sub-leituras importam:

- **Servivel ja (es/fr/en/pt/ar na UI), necessidade media:** maior parte da Africa francofona (Mali,
  Niger, Chade, Senegal, Costa do Marfim, Burkina Faso, Guine, Camaroes, Togo, Benin, Rep. do Congo),
  anglofona (Nigeria, Uganda, Gambia, Gana, Liberia, Sudao do Sul, Tanzania, Africa do Sul, Zambia,
  Zimbabue, Malaui, Serra Leoa), arabofona (Egito, Iraque, Jordania, Djibuti, Comores, Eritreia),
  o resto da America Latina (Argentina, Chile, Rep. Dominicana, Paraguai, Panama, Uruguai) e os
  lusofonos restantes (Portugal, Timor-Leste, Sao Tome). Entram a custo zero de traducao.
- **Necessidade ALTISSIMA, idioma fora dos 7 (gatilho de nova locale):** Bangladesh (bengali),
  Siria / Sudao / Iemen / Iraque / Egito (arabe), Etiopia (amarico), Afeganistao (pachto/dari),
  Somalia (somali), Mianmar (birmanes), Nepal (nepali), Ira (farsi). **Gatilho de decisao:** se a
  expansao mirar campos de refugiados e crises agudas, **arabe e bengali sao as proximas locales a
  adicionar** (o agente de i18n entrega 1:1, com revisao humana da copia sensivel). Ver "Proximos
  idiomas". O Magreb e o Libano aparecem como "parcial (fr)" porque o frances administrativo cobre
  parte, mas o arabe e a lingua-fim.
- **Idioma coberto, necessidade relativa menor (base de diaspora/captacao, nao frente primaria):**
  EUA, Alemanha, Franca, Espanha, Reino Unido, Canada, China, Russia. Uteis para voluntarios da
  diaspora e captacao ESG, nao como frente humanitaria de primeira linha.

---

## Decisao de idioma (o gargalo que governa o ranking)

A plataforma serve 7 idiomas hoje. O eixo A domina o score porque **um pais sem o idioma na UI nao
e servivel ao publico-fim**, por mais aguda que seja a necessidade. Duas consequencias:

1. **Comecar onde o idioma ja existe** (Tier S inteiro, mais o frances/ingles do Tier A). Zero custo
   de traducao, foco total em curadoria e voluntarios locais.
2. **Proximos idiomas a adicionar, por retorno humanitario** [Inference, magnitudes [Unverified]]:
   1. **Arabe** (Siria, Sudao, e refugiados em geral): maior desbloqueio humanitario.
   2. **Bengali** (Bangladesh): fome, desastre e densidade.
   3. **Ucraniano** (Ucrania): deslocamento por conflito.
   Cada locale nova e 1:1 com as chaves existentes (o agente de i18n cobre parity), com revisao
   humana obrigatoria da copia sensivel a dignidade (fome, perda, refugio).

---

## Como confirmar antes de citar (fontes primarias)

| Eixo | Fonte primaria a consultar |
|---|---|
| C. Refugiados / migrantes | UNHCR / ACNUR (Global Trends; dados por pais de acolhimento) |
| D. Inseguranca alimentar | FAO SOFI (The State of Food Security); IPC/CH para crises agudas |
| B. Desastre / desabrigados | EM-DAT (CRED); IDMC (Global Report on Internal Displacement) |
| A. Idioma | `src/app/.../ux/i18n/engine.js` `SUPPORTED_LOCALES` [Verified, in-repo] |

Atualizar este arquivo e a Secao 20 do SOT juntos quando os numeros forem verificados ou quando uma
nova locale entrar (muda o eixo A de varios paises de uma vez).

---

_90 paises (~46% dos ~195 do mundo), ordenados por score. Derivado do SOT Secao 20. Ranking
[Inference]; magnitudes de necessidade [Unverified] ate confirmacao em fonte primaria; suporte de
idioma [Verified] contra os locales do app (10 locales: pt/es/en/de/fr/ru/zh/ar/bn/uk). O corte do
recorte de 46% e score 12 (a linha 90, Uruguai); abaixo ficam os ~105 paises de menor prioridade
relativa, fora deste documento. Cada Score satisfaz 3A + 2B + 2C + 2D + E (verificado por script de
regeneracao). Os 12 paises incluidos nesta passagem: Iemen, Egito, Iraque, Republica do Congo,
Djibuti, Eritreia, Jordania, Serra Leoa, Togo, Comores, Benin, Indonesia. Omitidos por ficarem
abaixo do corte (idioma fora das 10 locales): Turquia, Sri Lanka, Tailandia, Vietna._
