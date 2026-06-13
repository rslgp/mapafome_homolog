# MapaFome: Plano de Internacionalização da Marcação (abrir a marcação além do Brasil-only)

> **Status:** PLANO (nenhuma alteração de código nesta passagem). Documento revisável.
> **Branch alvo:** `international`
> **Repo:** `mapafome_homolog`
> **Data:** 2026-06-13
> **Revisão:** Rev4 (passagem de localização). Rev2 foi a passagem multiagentes (ver §10) que
> corrigiu uma premissa falsa central da Rev1 (ver §4.0) e ampliou escopo de UX/i18n, integridade
> de dados e rollback. Rev3 adicionou a **localização de UI** (terceiro idioma en-US +
> auto-detecção de idioma do navegador, com tradução de copy sensível revisada por humano), ver D7
> e §5 M6. **Rev4 (segunda passagem memética)** endurece a trilha de localização e ops:
> extração de DICT antes de FF1 (M6.0), auto-detecção via mount-effect (não module-load) para não
> quebrar a hidratação de `/assinar`, write-back de país + filtro de leitura para marcas não-BR
> (§4.6.1), captura de país na fila offline com quarentena de poison-pill (M4b), atribuição
> regional no caminho de leitura (M2.5), wiring de analytics/gtag e reconciliação de linhas órfãs
> no rollback, mais correções de coerência interna.

---

## 1. Objetivo, em uma frase

Hoje um usuário só consegue marcar um ponto **dentro do Brasil**. O objetivo é permitir marcar
pontos **em qualquer país do conjunto de lançamento**, mantendo uma barreira anti-lixo (não
aceitar oceano / coordenada solta), **amarrando "onde posso marcar" ao país já selecionado no
seletor de bandeira**.

> **Nota de segurança honesta (ver R6/§9):** a barreira de bbox é **higiene de dados**, não
> controle de segurança. O `.env.local` embarca uma **chave privada RSA completa** de
> service-account no bundle estático (`NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`), então qualquer
> validação no cliente, incluindo todo o geofence, é trivialmente burlável por quem tiver o
> bundle. Apertar ou afrouxar a bbox não muda a postura de segurança em nada.

---

## 2. Decisões travadas (escopo)

| # | Decisão | Escolha | Consequência |
|---|---|---|---|
| D1 | O que a validação passa a permitir | **Bounding box do país SELECIONADO** | Reusa `countryStore` + `COUNTRY_BOUNDS`. Mantém barreira anti-spam (higiene). Exige popular bbox por país. |
| D2 | Como tratar a feature `international` existente | **A flag INTL passa a controlar TAMBÉM a marcação**; ligar no fim | Um único interruptor, dark-ship seguro, rollback por rebuild. |
| D3 | Entregável desta tarefa | **Só este documento de plano + milestones** | Sem código agora; revisão antes de implementar. |
| **D4** | **Quantos países no lançamento** | **Subconjunto curado e revisado à mão (5 a 15 países de demanda esperada), NÃO os ~234 de uma vez** | D1 escolhe QUAL dimensão limita a marca; D4 escolhe QUANTOS países abrir. São decisões diferentes (ver SCOPE-1-scope/§5 M2a). |
| **D5** | **Brasil com a flag OFF** | **Preservar o predicado de DOIS retângulos exatamente como hoje** (não colapsar num único retângulo) | "OFF = idêntico ao de hoje" só é verdade se o Brasil mantiver as duas caixas (ver §4.0). |
| **D6** | **Fallback de país sem bbox** | **BLOQUEAR (com mensagem localizada), não "permitir sem clamp"** | A marca é um toque livre no mapa; sem bbox, "permitir" reabre o pin no oceano que D1 existe para evitar (ver UX-5/SCOPE-1-scope). |
| **D7** | **Localização de UI internacional** | **Adicionar `en-US` como 3o idioma E auto-detectar o idioma do navegador na 1a sessão** (a troca manual continua existindo). Copy sensível à dignidade é **rascunhada por mim e revisada por humano** antes de ir pro ar, nunca tradução-máquina cega | Vai contra a premissa atual de `strings.js:5-7` ("locale NÃO é auto-detectado"); o conflito é resolvido de propósito (ver §5 M6), preservando o princípio de não traduzir copy sensível às cegas. |

**Modelo mental do novo gate:**

```
ANTES:  marca permitida  ⇔  dentroLimites(coords)        // DOIS retângulos do Brasil, hard-coded
DEPOIS: marca permitida  ⇔  INTL ligado ? dentroDoPais(coords, paisDaMarca)
                                        : brasilDoisRetangulos(coords)  // Brasil, EXATAMENTE como hoje
```

A flag desligada = **comportamento idêntico ao de hoje** (Brasil-only, os dois retângulos
preservados, ver §4.0/D5). Ligada = marca restrita ao país escolhido pelo seletor de bandeira.
É o mesmo padrão que o `SearchField` já usa para a busca (`INTL_ENABLED ? getSelectedCountry :
() => DEFAULT_COUNTRY`).

> **Idioma de UI vs país de marcação são eixos independentes (ver I18N-5).** `LanguageControl`
> define o idioma (pt-BR / es / en-US) e `CountryFlagControl` define o país de busca/marcação. Um
> brasileiro no exterior legitimamente quer UI em pt-BR + país estrangeiro. Não acoplar os dois.

---

## 3. Superfície de imposição atual (o "hitbox", mapeado)

A restrição "Brasil-only" não está em um lugar só, está em **três camadas** e **seis arquivos**,
e os números das três camadas **NÃO são iguais** (ver §4.0). Qualquer plano que mexa em só um
lugar (ou que assuma que são "a mesma caixa triplicada") deixa a marcação quebrada ou
silenciosamente diferente.

### Camada A: Geofence de publicação no cliente (o hitbox mestre)
Função única `envVariables.dentroLimites(localizacao)`, **dois retângulos** unidos por OR
aproximando o formato diagonal do Brasil.

| Arquivo | Linha | Papel | Papel-tipo |
|---|---|---|---|
| `src/app/components/compatibility/components/variaveisAmbiente.js` | `9-25` | **Definição** de `dentroLimites` + constante `mapArea` (rect1) + um 2o retângulo inline (rect2) | **POJO puro** (zero imports hoje) |
| `src/app/components/compatibility/App.js` | `370-371` | Gate no caminho de publish/clique (`alert('Região não suportada')`) | write-gate (handler) |
| `src/app/components/compatibility/appMainBootstrap.js` | `39-43` | **Gate de LOAD/leitura** no boot: escolhe `regiao` (índice da planilha) por `dentroLimites(self.state.center)`; em `false` faz `alert("Região ainda não suportada")` e **return** (o mapa não popula) | **read/load-gate + roteamento de planilha** |
| `src/app/components/compatibility/appPinActions.js` | `152-153` | Gate no caminho de escrita moderno `writePinToSheets` → `throw new Error('out_of_bounds')`. **Também usado pelo flush da fila offline** (ver STATE-1/R3b) | write-gate (também no flush) |
| `src/app/components/compatibility/components/googlesheets/mylocation.js` | `114-118` | Gate na publicação por GPS → `alert("Região não suportada")` | write-gate (handler) |

> **Os quatro callsites passam UM argumento** (`dentroLimites(latlng)` / `(self.state.center)` /
> `(coords)` / `(self.state.location)`). Manter a assinatura `(coords) => boolean` e delegar
> internamente é seguro do ponto de vista de chamada (FACT-3). O risco está em **o que o
> predicado retorna** (§4.0) e em **qual país ele resolve** (ARCH-2/ARCH-1-solone/STATE-1),
> não na forma da chamada.

### Camada B: Barricada na escrita (validação da camada de dados)
| Arquivo | Linha | Papel |
|---|---|---|
| `.../components/googlesheets/sheetsClient.js` | `83` | `const BR_BBOX = { N: 5.27, S: -33.75, W: -73.99, E: -34.79 }` (terceira caixa, distinta de A) |
| `.../components/googlesheets/sheetsClient.js` | `93-94` | `validateCoordinatePair` lança `SheetsValidationError(field, 'outside Brazil bbox', coords)` |
| `.../components/googlesheets/sheetsClient.js` | `120-133` | `validatePinPayload(payload)` faz `JSON.parse(payload.Coordinates)` e chama `validateCoordinatePair(coords)` com 1 arg (sem país em escopo) |

> **CORREÇÃO importante (DATA-1, blocker):** a Camada B **NÃO** roda no app de fome. Verificado:
> `validateCoordinatePair` é importado e chamado **só** em `petsData.js:105` (pets). Os caminhos
> de escrita de **fome** (`appPinActions.writePinToSheets:189`, `appPinActions.publishPinFromMap:270`,
> `mylocation.js:176`) chamam `sheet.addRow` **diretamente, sem nenhuma validação de coordenada**.
> Portanto, para fome, a Camada A (dentroLimites) é a **única** barreira. A narrativa "passa em A,
> falha em B = meio-estado seguro" é uma propriedade **só do app de pets**.

### Camada C: Value object
| Arquivo | Linha | Papel |
|---|---|---|
| `.../compatibility/domain/Coordinates.js` | `11` | `BR_BBOX` duplicado (idêntico ao de sheetsClient: `{N:5.27,S:-33.75,W:-73.99,E:-34.79}`) |
| `.../compatibility/domain/Coordinates.js` | `44-47` | método `isInsideBR()`, **sem nenhum consumidor de produção** (só `test/domain.test.js:20-22`) |

### Quarta fonte de bounds (a "triplicada" na verdade é quádrupla)
| Arquivo | Linha | Papel |
|---|---|---|
| `.../components/mapConstants.js` | `38-41` | `BRAZIL_BOUNDS = { NORTH:[0.275901,-59.178876], SOUTH:[-35.558031,-28.944502] }`, o **viewport de busca**, numericamente igual a `COUNTRY_BOUNDS.br`, usado por `SearchField`/`PetSearchField` |

### Acoplamentos de UX que dependem da string literal `'outside Brazil bbox'`
| Arquivo | Linha | O que faz |
|---|---|---|
| `src/app/pets/petDomain.js` | `302` (comentário) + `304` (check vivo) | Classifica `out_of_bounds` por `error.reason === 'outside Brazil bbox' \|\| error.name === 'SheetsValidationError'` |
| `.../components/ux/strings.js` | `207` (pt-BR), `506` (es) | Cópia de `pets.publish.failed.out_of_bounds` ("fora da área que a gente atende" / "fuera del área que cubrimos") |
| `src/app/pets/petPublishClassify.test.js` | `20` | Fixture que constrói `SheetsValidationError('Coordinates','outside Brazil bbox',[0,0])` |
| `test/sheetsValidators.test.js` | `23` | `expect(() => validateCoordinatePair([0, 0])).toThrow(/outside Brazil bbox/)`, **4o consumidor, faltava na Rev1** (COUPLE-1/TEST-1-devil) |

> **Atenção ao OR em `petDomain.js:304` (SCOPE-2/FACT-2):** o ramo `|| error.name ===
> 'SheetsValidationError'` já captura **qualquer** `SheetsValidationError` (incluindo erros de
> rating/telefone), independente do `reason`. Logo, renomear só o `reason` **não quebra** a
> classificação (o ramo do nome continua firmando), o que mascara uma migração parcial. É
> também uma mis-classificação latente: hoje um erro de telefone/rating viraria `out_of_bounds`
> se passasse por esse classificador. M3 deve estreitar isso para um **código estável** e cobrir
> com teste pelo ramo do `reason`, não só pelo do `name`.

### Caminho de exibição de erro do app de FOME (não existe hoje, ver UX-2)
| Arquivo | Linha | Observação |
|---|---|---|
| `src/app/components/compatibility/App.js` | `379` | `pinActions.publishPinFromMap(this, this._pinDeps, latlng)` é chamado **sem `await` e sem `.catch`** (fire-and-forget). `publishPinFromMap` grava via `sheet.addRow` direto; o `throw 'out_of_bounds'` vive em `writePinToSheets`, usado por `handlePublishFromSheet` (esse sim com `.catch` em `appPinActions.js:500-523`). Resultado: no caminho de clique do mapa de fome **não há superfície de erro i18n** para coordenada rejeitada além do `alert()` síncrono da Camada A. |

### Escopo de BUSCA de endereço (já internacionalizado na flag, mas relevante)
| Arquivo | Linha | Observação |
|---|---|---|
| `.../compatibility/components/SearchField.js` | `89-123`, `103-104` | `buildCountryProvider`; usa `getSelectedCountry` quando `INTL_ENABLED`; `accept-language: getLocale()` (idioma), `countrycodes: country.code` (geografia), **o padrão correto** |
| `.../compatibility/components/countries.js` | `83-87`, `19-76`, `122-125` | `COUNTRY_BOUNDS` (**só `br` hoje**), `DEFAULT_COUNTRY='br'`, `COUNTRY_NAMES` (~234 nomes, **só pt-BR**), `COUNTRIES` (build EAGER no load do módulo, ordenado por `localeCompare(...,'pt-BR')` hard-coded) |
| `.../compatibility/components/countryStore.js` | todo | SOT de `getSelectedCountry()` / `setSelectedCountry()` + pub/sub, localStorage `mdf_country`. `current` é um **singleton mutável em módulo** seedado **LAZY** (`current = null` até a 1a chamada de `getSelectedCountry()`), consumido **só** por código imperativo de Leaflet **fora do render do React** (`readFromStorage` retorna `DEFAULT_COUNTRY` quando `!hasWindow()`). Importa `countries.js` (cuidado com ciclo, ver ARCH-5) |
| `src/app/components/compatibility/components/intlConfig.js` | `17`, `36` | `INTL_ENABLED`; `DEV_DEFAULT=false`; env `NEXT_PUBLIC_INTL`; **resolvido uma vez no load do módulo** (não é runtime) |
| `src/app/pets/PetSearchField.js` | `30`, `49-58` | **Ainda fixo em `'br'`**: `accept-language:'br'` (bug: `'br'` é país, não tag de idioma), `countrycodes:'br'`, `searchBounds` de `BRAZIL_BOUNDS`, `region:'br'` (linha 58) |
| `src/app/components/compatibility/components/CountryFlagControl.js` | `~111`, `226` | Renderiza `c.name` (pt-BR) direto; control Leaflet `position:'topright'`. Monta cliente-only em `useEffect` e retorna `null` no server (`:245`), então é exempt de hydration-mismatch (ver M3.5/ARCH-6) (descoberta pobre, ver UX-3) |
| `src/app/components/compatibility/components/LanguageControl.js` | `38`, `146` | Control de idioma, também `topright`, mesma CSS `mdf-flag`; classe `mdf-lang` presente mas **sem regra CSS** (confundível com o de país, ver I18N-5) |
| `.../compatibility/components/ux/regionResolver.js` | `7-37` | `resolveRegion(coords)` mapeia para **9 metrópoles BR**; retorna **`'global'`** para qualquer coord fora delas. Consumido por `reports.js` (atribuição regional dos relatórios) e `SponsorSlot.js:53` (targeting de patrocinador). **Caminho de LEITURA, não tocado pela trilha de write** (ver M2.5/read-back-region-collapse) |
| `.../compatibility/components/ux/analytics.js` | `6`, `11`, `39-47` | `track()` despacha para `window.gtag` se função, senão `window.dataLayer` se array, senão buffer `sessionStorage` por-aba (`MAX_BUFFERED=200`, eviction por `shift()`). **O único bootstrap de GA do repo (`G-DHZR5VH2Q7`) vive em `public/index.html:21` (shell CRA morto), NÃO no head do App Router (`layout.js`)**, então em produção `gtag`/`dataLayer` não existem e `track()` cai sempre no buffer volátil (ver M5/M5-publish-intl-analytics-pipeline) |

---

## 4. Arquitetura alvo: um predicado, fontes de verdade explícitas

### 4.0 PREMISSA CORRIGIDA: NÃO existe "uma caixa triplicada". Existem TRÊS caixas DIFERENTES (mais o viewport). (blocker: ARCH-1-arch, SOT-1, DATA-2, ARCH-1-devil, ARCH-2-devil)

A Rev1 deste plano afirmava que o Brasil "mantém os valores históricos exatos
`[[0.275901,-59.178876],[-35.558031,-28.944502]]`", logo OFF seria "byte-a-byte igual". **Isso é
falso.** Esses números são `mapConstants.BRAZIL_BOUNDS` / `COUNTRY_BOUNDS.br`, que é o **viewport
de busca**, e **nunca** foi o geofence de publicação. As regiões reais são:

| Fonte | Onde | Forma / números | Papel |
|---|---|---|---|
| **dentroLimites** (Camada A) | `variaveisAmbiente.js:2-25` | **DOIS retângulos**: rect1 lat (-14.09 .. 2.20) ∧ lng (-52.42 .. -34.32) **OR** rect2 lat (-32.66 .. -14.18) ∧ lng (-55.55 .. -38.06) | geofence de publish |
| **BR_BBOX** (Camadas B e C) | `sheetsClient.js:83`, `Coordinates.js:11` | retângulo único `{N:5.27, S:-33.75, W:-73.99, E:-34.79}` (mais largo; pega o Acre em W -73.99) | barricada de dados (só pets) + value object (sem uso) |
| **COUNTRY_BOUNDS.br** = **BRAZIL_BOUNDS** | `countries.js:84`, `mapConstants.js:38-41` | retângulo único lat (-35.558031 .. 0.275901) ∧ lng (-59.178876 .. -28.944502) | viewport de busca |

As três são geometricamente distintas. Exemplos de divergência (verificados):
- **`[lat -33.7, lng -53.4]` (extremo-sul, Chuí/RS, terra firme BR):** REJEITADO por `dentroLimites`
  hoje, mas ACEITO por `COUNTRY_BOUNDS.br`.
- **`[lat -4.0, lng -58.0]` (oeste do Amazonas):** REJEITADO por `dentroLimites` hoje (cai fora dos
  dois retângulos), mas ACEITO por `COUNTRY_BOUNDS.br`.
- **Oeste do Acre (lng ~ -72):** ACEITO por `BR_BBOX` (W -73.99) hoje, mas REJEITADO por
  `COUNTRY_BOUNDS.br` (W -59.178876).
- **Fenda de latitude entre os dois retângulos do `dentroLimites`:** rect1 cobre lat até -14.09 e
  rect2 cobre lat a partir de -14.18, deixando uma faixa **não coberta** (-14.18 .. -14.09) dentro
  da sobreposição de lng que é **REJEITADA**. Essa costura é exatamente o que uma delegação a
  `isInsideCountry('br')` poderia fechar silenciosamente (ver M0).

Conclusão: **delegar `dentroLimites` a `isInsideCountry('br')` lendo `COUNTRY_BOUNDS.br` MUDA o
conjunto aceito mesmo com a flag OFF**, quebrando a promessa de dark-ship. O repo já sabia disso:
`MILESTONES.yaml:49` (P11) tem o texto exato *"defer variaveisAmbiente.dentroLimites, different
bounds contract"*. Isto é o anti-padrão **refactor_disguised_as_fix**: tratar uma mudança
semântica como refatoração no-op.

**Decisão (D5):** o Brasil mantém o predicado dos **DOIS retângulos** literalmente. Não colapsar
para um retângulo. Concretamente, `COUNTRY_BOUNDS` ganha capacidade de representar **um ou mais
retângulos por país** (ex.: `br: [rect1, rect2]`), e `isInsideCountry('br', coords)` reproduz o OR
atual bit a bit. A barricada de dados de pets (Camada B) preserva o `BR_BBOX` atual para `'br'`
(não o viewport), porque é o que vale hoje no caminho de pets.

### 4.1 Dados: `COUNTRY_BOUNDS` como SOT de bounds, com Brasil multi-retângulo
- `isInsideCountry(coords, code)` é **pura** e só lê `COUNTRY_BOUNDS`. **NÃO importa**
  `countryStore` nem `intlConfig` (ARCH-5: `countryStore` já importa `countries.js`; o ciclo
  inverso daria temporal-dead-zone no module-eval de `readFromStorage`). Aceita um `code`
  **explícito** sempre.
- `br` é representado com seu shape real de publish (os dois retângulos), não o viewport.
- **Invariante / fitness:** `countries.js` não importa nada de `countryStore`/`intlConfig`
  (checagem de grep no §7).

### 4.2 Predicado país-ciente: resolução do país fica NO CONSUMIDOR, não no POJO (major: ARCH-2, ARCH-5, ARCH-6)
- `variaveisAmbiente.js` é hoje um **POJO puro com zero imports**, consumido por ~10 módulos
  (App, mylocation, map, MarkerGroup, ContextBar, ListView, PinDetailSheet, SponsorSlot,
  TapDebugOverlay, endereco). **Não** fazê-lo importar `intlConfig`+`countryStore`, porque isso
  injeta um singleton com localStorage e um flag de build em 10 importadores não relacionados,
  e torna `dentroLimites` dependente de estado global/tempo (o smell que `appPinActions`/
  `appMainBootstrap` evitam de propósito, recebendo colaboradores via um objeto `deps`).
- **Mecanismo:** introduzir um pequeno módulo `geofence.js` exportando `isInsideCountry`
  (reexport puro de `countries.js`) e um helper fino `activeCountryFor(flag, store)` que faz a
  resolução `INTL_ENABLED ? getSelectedCountry() : 'br'`. A resolução do país ativo fica **um
  nível acima** (no callsite ou no helper), nunca dentro de `countries.js`/`countryStore.js`.
- Se for preciso manter `dentroLimites` com assinatura zero-arg para os 4 sites, isolar a
  leitura do store atrás de **um único acessor injetado**, não um import duro no POJO.
- **SSR (ARCH-6):** durante o export estático `getSelectedCountry()` retorna `DEFAULT_COUNTRY`
  ('br') porque `countryStore` é `hasWindow`-guarded. Os 4 callsites são todos handlers de
  evento/async (App.js:348-380, appMainBootstrap async IIFE, appPinActions write async,
  mylocation handleSubmit), nenhum renderiza ramificando em `dentroLimites`, então não há risco
  de hydration-divergence em render. Adicionar uma asserção de caracterização: sob `no-window`,
  o geofence resolve para o ramo BR.
- **SSR de nomes/ordenação de países (ver M3.5):** o singleton `COUNTRY_BOUNDS`/`countriesForLocale(getLocale())`
  é SSR-safe **só** para JSX do React que imprime um nome de país. Esses sites JSX (label do
  botão de bandeira, copy de share, chip de país ativo) devem renderizar o nome de `DEFAULT_LOCALE`
  no server + 1o paint e trocar pós-hidratação via `useLocale()`, ou ser cliente-only. O control
  Leaflet `CountryFlagControl` é **exempt** porque monta cliente-only em `useEffect`
  (`CountryFlagControl.js:224`) e retorna `null` no server (`:245`).

### 4.3 Papéis dos callsites da Camada A (major: ARCH-1-solone)
M1 deve **classificar cada um dos 4 callsites por papel** antes de delegar:
- `App.js:370`, `appPinActions.js:152`, `mylocation.js:114` = **write-gates** (gate na marcação).
  Resolvem o país pelo `activeCountryFor(...)` no momento da marca (mas ver STATE-1 para o flush).
- `appMainBootstrap.js:39` = **read/load-gate + roteamento de planilha**. Hoje usa
  `dentroLimites(self.state.center)` para escolher `regiao=0` e, em `false`, alerta e dá `return`
  (o mapa **não popula**). Se isso ficar país-ciente, um usuário com `mdf_country` não-BR mas com
  centro de mapa ainda no default BR pode ter o gate de LOAD avaliado contra o país errado e o app
  **se recusar a carregar**. **Correção:** o gate de load NÃO deve ser país-acoplado (ou deve cair
  para uma leitura permissiva); a seleção do índice de planilha deve ser **desacoplada** do
  geofence de publicação. O risco R3 (§8) cobre esse mismatch centro-vs-país no caminho de leitura.

### 4.4 Barricada de dados (`sheetsClient`): país passado EXPLICITAMENTE (major: ARCH-4, ARCH-3-devil, PARSE-1)
- `validateCoordinatePair(coords, field, code)` ganha um 3o parâmetro posicional `code`. É
  retrocompatível para os chamadores atuais (passam ≤2 args). **Proibido** ler o singleton dentro
  de `sheetsClient` (reintroduziria STATE-1 na camada de dados e quebraria o determinismo dos
  mocks de teste).
- **Enumerar a cadeia completa de chamadas** (a Rev1 não fez): `validatePinPayload(payload, code)`
  precisa receber o `code` e repassar; o chamador (a ação de publish que já conhece o país ativo)
  passa o `code`. Onde `code` estiver ausente, **default para `'br'`** para que o caminho legado de
  pets continue BR-only até ser internacionalizado de propósito.
- `JSON.parse(payload.Coordinates)` em `validatePinPayload:125-129` não tem try/catch; o novo modo
  de falha (país errado) sai como `SheetsValidationError`, o que é aceitável. Adicionar um caso de
  caracterização com **uma coordenada com componente 0** (ex.: `[0, lng]`) para garantir que o
  caminho novo **não dropa** valores legítimos zero.
- Callers a tocar (lista completa): `petsData.js:105`, `validatePinPayload` interno
  (`sheetsClient.js:129`), e os mocks `vi.fn((coords)=>coords)` em `petContactPrivacy.test.js:25`,
  `petFlagWriter.test.js:25`, `petPublishClassify.test.js:86`, `petResolveWriter.test.js:24`,
  `petsFetch.test.js:24`. A fixture `petPublishClassify.test.js:20` (string `'outside Brazil bbox'`)
  e `test/sheetsValidators.test.js:23` movem para M3.

### 4.5 Value object (`Coordinates`): DELETAR o que não tem dono (nice-to-have: ARCH-8, SCOPE-1-solone)
- `isInsideBR()` (`Coordinates.js:44-47`) **não tem nenhum consumidor de produção** (grep
  `\.isInsideBR\(` em `src/` = 0; só `test/domain.test.js`). M2 **REMOVE** `isInsideBR()` e o
  `BR_BBOX` privado de `Coordinates.js:11` em vez de carregá-los como "compat" morto, e expõe
  `isInsideCountry(code)` apoiado na SOT. (Loss-aversion: parear cada adição com a deleção do
  literal correspondente; uma "unificação" que deixa 4 cópias de pé não é unificação.)
- `domain.test.js:20-22` é atualizado junto (testa `isInsideBR`).

### 4.6 Inventário de TODAS as fontes de bounds e o destino de cada uma (SCOPE-1-solone)
| Fonte | Destino |
|---|---|
| `dentroLimites` (2 retângulos) | Vira `COUNTRY_BOUNDS.br` (multi-retângulo) + `isInsideCountry`; literal inline some |
| `sheetsClient.BR_BBOX` | Some; barricada usa `isInsideCountry(coords, code)` (default `'br'`) |
| `Coordinates.BR_BBOX` + `isInsideBR()` | **Deletados** (sem consumidor) |
| `mapConstants.BRAZIL_BOUNDS` | **Permanece** (é o viewport de busca, papel distinto), mas `PetSearchField` deixa de hard-codar e passa a derivar de `getCountry(getSelectedCountry())` quando INTL ON (M4) |
| `COUNTRY_BOUNDS` | **A SOT** de bounds de marcação/validação |

> **Fitness/grep (FIT-1):** após M2, asseverar que **nenhum literal `BR_BBOX` sobrevive fora da
> SOT** (`countries.js`). Converte a alegação DRY em forcing function, não esperança.

### 4.6.1 Destino e atribuição das linhas não-BR (write + read-back) (blocker: DEST-1)

§4.6 inventaria as fontes de **bounds**, mas o plano (até a Rev3) nunca disse **onde** uma marca
não-BR é **persistida** nem **como** ela é lida de volta. Verificado no código:
`appMainBootstrap.js:38-46` só atribui `regiao=0` (o `else` alerta e dá `return`; não existe
`regiao=1..n`); **todos os quatro caminhos de escrita** gravam no sheet 0
(`persistPinPatch:124`, `writePinToSheets:167/189`, `publishPinFromMap:218/270`); e a linha de
`criarRow` (`variaveisAmbiente.js:50-72`) **não tem nenhum campo de país/região**. Logo, com INTL
ON, marcas de ES/US caem no MESMO sheet 0 das brasileiras, indistinguíveis. O caminho de leitura
(`appMainBootstrap.js:73-113`) lê TODAS as linhas do sheet 0 e filtra **só** por `x.kind !== 'pet'`
(`:109`), sem nenhum filtro de país (e sem campo para filtrar por).

**Decisão (opção a, sheet único 0 + carimbo de país no blob `Dados`)**, porque na escada de
conflito ship-safety + menor blast radius vencem o provisionamento de planilha por-região
(opção b ressuscita o ramo `regiao` morto e exige novas worksheets, fora do escopo de R3):

1. **WRITE:** adicionar `dadosJSON.Pais = code` dentro de `criarRow` (`variaveisAmbiente.js`,
   após o literal base de `dadosJSON`, antes do bloco condicional), onde `code` é o país resolvido
   por `activeCountryFor` no callsite de publish (o mesmo `code` que §4.4 passa a
   `validatePinPayload`). `criarRow` ganha um input `dadosRow.pais` passado por `writePinToSheets`
   (monta `dadosRow` em `appPinActions.js:172`) e `publishPinFromMap` (monta em `:238-247`).
   Default `'br'` quando ausente, para o caminho legado/pets permanecer BR-atribuído (casa com o
   contrato default-`'br'` de §4.4). **Todos os caminhos MANTÊM `getSheet(0)`**: o roteamento por
   índice `regiao` continua morto em R3 (sem opção b). Sheet 0 segue sendo o lar único. Isto
   **REMOVE a ambiguidade**, não o modelo de sheet único.
2. **READ-BACK:** em `appMainBootstrap.js:109`, o filtro `rows.filter(x => x.kind !== 'pet')` ganha
   um predicado de país: `&& (activeCountryFor(INTL_ENABLED, countryStore) === 'br' ? (x.Pais ===
   undefined || x.Pais === 'br') : x.Pais === <paisAtivo>)`. Linhas BR legadas sem `Pais` ainda
   renderizam sob BR (retrocompat); uma sessão não-BR vê só as linhas do próprio país. O **gate de
   LOAD** (seleção de `regiao`, `:39-45`) continua desacoplado/permissivo (§4.3/R3); este **filtro
   de read-back** é o que de fato realiza o conserto centro-vs-país que §4.3 prometeu.
3. **Fitness (FIT-2):** teste de caracterização de que um publish não-BR produz uma linha cujo
   `Dados.Pais` === o país ativo, e que o filtro de read-back descarta linhas de outros países.
   Converte a alegação de atribuição em forcing function (Norman: forcing function, não comentário).

Este achado é pré-requisito das trilhas DATAOPS/ABUSE/ROLLBACK abaixo, então §4.6.1 deve aterrar
em M1 (ambos os arquivos já são editados em M1: `criarRow`/`variaveisAmbiente.js` e o filtro de
read-back em `appMainBootstrap.js`) e ANTES do flip da flag (M5).

---

## 5. Milestones

Cada milestone termina **verde no gate completo** (§7) e é commitado via o `git-commit-specialist`
(convenção do `CLAUDE.md`). A flag fica **desligada** até o M5, então M1–M4 são dark-ship.

> **Custo de gate por milestone (SEQ-2):** o gate completo (lint/test/fitness/build/smoke200/a11y)
> roda em CADA milestone, e nesta máquina (HDD lento, disco apertado) `build + smoke200 + a11y` é
> um imposto recorrente não trivial. As estimativas abaixo separam **coding** de **gate+verify**.
> Conte o gate uma vez por milestone (11 hoje: M0, M1, M2, M2.5, M3, M3.5, M4, M4.5, M4b, M5, M6 , 
> ver §7 "rodar em CADA milestone"), não só os deltas de código.

### M0, Baseline & rede de segurança de caracterização REAL (coding meio dia + gate)
- Rodar o gate atual e **registrar o verde de baseline**.
- **A rede de SP-passa/Lisboa-falha é grosseira demais (TEST-1):** ela passa nas TRÊS caixas do
  §4.0 e não detecta a mudança de borda. Em vez disso, **gerar o corpus de caracterização
  amostrando o `dentroLimites` atual numa grade GROSSA de 1 grau** sobre o envelope-união dos dois
  retângulos (lat -32.66 .. 2.20 ≈ 35 linhas, lng -55.55 .. -34.32 ≈ 22 colunas ≈ ~770 células),
  com **teto explícito < ~1000 células** para o fixture ficar pequeno, rápido e revisável (a grade
  densa não compra nada num predicado de dois retângulos OR'd, e SEQ-2 conta o gate ~10x).
- **Camada de precisão (o que a grade não dá): asserções diretas de matemática de retângulo.**
  Para CADA um dos dois retângulos (rect1 lat -14.09..2.20 ∧ lng -52.42..-34.32; rect2 lat
  -32.66..-14.18 ∧ lng -55.55..-38.06, ver §4.0/`variaveisAmbiente.js:13-22`) asseverar os 4
  cantos mais um par dentro/fora (±epsilon ~1e-4) em cada uma das 8 bordas (~24 casos por
  retângulo, ~48 total). Caracteriza dois retângulos exaustivamente, de forma mais barata e legível
  que congelar ~770 booleanos, e é robusto à fase da grade. A grade vira backstop de cobertura
  ampla, não o mecanismo de precisão.
- **Bordas explícitas do PRÓPRIO `dentroLimites` (não do BR_BBOX/viewport):** incluir a **costura
  de latitude / faixa não coberta entre os dois retângulos (-14.18 .. -14.09)** dentro da
  sobreposição de lng (que uma grade grossa pode pular e que uma delegação fecharia
  silenciosamente), mais os pontos de divergência já corretos `[-33.7,-53.4]`, `[-4.0,-58.0]`,
  oeste do Acre `[-9.0,-72.0]`, e a "fenda" entre os retângulos. **NÃO** usar "bordas S=-33.75 vs
  -35.5": esses números são `BR_BBOX` (S -33.75) e o viewport `COUNTRY_BOUNDS.br` (S -35.558031),
  NÃO o predicado `dentroLimites` que o M0 caracteriza.
- **Rodar os testes em AMBOS os estados da flag a partir do M0 (SEQ-1):** OFF (Brasil dois
  retângulos) e ON (país selecionado), porque a mudança do M1 só é observável com ON. "Testes
  cobrem o caminho ON" vira critério de saída de milestone, não algo adiado até o M5.
- **Saída:** baseline documentada; corpus de caracterização (grade grossa + asserções de
  retângulo) verde; suíte roda OFF e ON.

### M1, Predicado de geofence único e país-ciente, Brasil preservado (coding 1-2 dias + gate)
- Adicionar `isInsideCountry(coords, code)` **puro** em `countries.js` (só lê `COUNTRY_BOUNDS`),
  com `br` representado pelos **dois retângulos exatos** (D5/§4.0). Adicionar `geofence.js` com
  `isInsideCountry` + `activeCountryFor(flag, store)` (§4.2).
- Refatorar `variaveisAmbiente.dentroLimites` para delegar, mantendo a assinatura
  `(coords) => boolean`, **sem** importar o store no POJO (§4.2). A resolução do país ativo
  (`INTL_ENABLED ? getSelectedCountry() : 'br'`) fica no helper/callsite.
- **Carimbo de país nas linhas (§4.6.1, DEST-1):** `criarRow` (`variaveisAmbiente.js`) passa a
  gravar `dadosJSON.Pais = code` (default `'br'`), e o filtro de read-back em
  `appMainBootstrap.js:109` ganha o predicado de país (BR legado sem `Pais` continua sob BR). Os
  quatro caminhos de escrita mantêm `getSheet(0)`.
- **Classificar os 4 callsites por papel** (§4.3) e desacoplar o gate de LOAD/roteamento de
  planilha em `appMainBootstrap` do geofence de publicação.
- **Invariante do meio-estado (ARCH-3):** a flag é **build-OFF e não pode ser ligada antes do M2**.
  Adicionar asserção de teste de que, com a flag ON pré-M2, Camada A e Camada B **concordam**
  (ambas BR-only), para que ninguém ligue a flag entre M1 e M2 e caia num estado onde A aceita e
  B rejeita. Documentar o meio-estado como invariante, não nota de rodapé.
- **Saída:** flag OFF idêntico (corpus do M0 verde, dois retângulos). Flag ON local: marca dentro
  do país selecionado passa a Camada A; linha carimbada com `Pais`; read-back filtra por país;
  testes ON-path verdes (SEQ-1).

### M2, Unificar a barricada + subconjunto curado de países (coding 1-2 dias + gate)
- **M2a (lançamento):** popular `COUNTRY_BOUNDS` com um **subconjunto curado e verificado à mão**
  (D4: 5-15 países de demanda esperada), bboxes ajustadas à mão para abraçar a costa o quanto der.
  **Não** despejar os ~234 retângulos genéricos de uma vez (SCOPE-1-scope): isso maximiza a
  superfície do barreira mais frouxa possível. Países fora da lista: **bloqueados** com mensagem
  localizada (D6), não "permitir sem clamp".
- **M2b (pós-lançamento):** backfill da tabela ISO completa só depois que a integridade offshore
  (DATA-3/§5 M4.5) estiver tratada. **Orçamento de bundle (M2b-bundle-budget):** `countries.js` é
  módulo cliente importado estaticamente por `SearchField`/`countryStore`/`CountryFlagControl`,
  então qualquer tabela de bounds ISO completa cai no JS compartilhado sempre-carregado, não num
  data-file lazy. Manter `COUNTRY_BOUNDS` e a tabela ISO completa num módulo **separadamente
  importável** (ex.: `countryBounds.js`) para um futuro `import()` dinâmico não exigir
  re-estruturação. Orçamento verbatim: "bounds do subconjunto de lançamento < 1KB gzip inline; o
  backfill ISO completo só embarca como chunk de dados `import()`-ado dinamicamente quando
  `INTL_ENABLED` é true e um país não-curado é escolhido, OU fica < ~3KB gzip se provado mais
  barato inline, decisão BLOQUEADA até medir". Gate de M2b: confirmar via `npm run build` que os
  dados de bounds/nomes **NÃO** estão no first-load shared chunk (ler o chunk report) e anexar o
  delta gzip medido antes de des-deferir.
- `sheetsClient.validateCoordinatePair(coords, field, code)` passa a usar `isInsideCountry`;
  remover `BR_BBOX` local; threading explícito do `code` por `validatePinPayload(payload, code)`
  (§4.4). Default `'br'` quando ausente.
- **DELETAR** `Coordinates.isInsideBR()` + `Coordinates.BR_BBOX` (§4.5); atualizar
  `domain.test.js:20-22`.
- Atualizar `test/sheetsValidators.test.js:23` (a fixture de bbox) junto, senão o gate fica
  vermelho (TEST-1).
- Adicionar a fitness/grep "um único bbox SOT" (FIT-1/§4.6) + FIT-2 (atribuição de `Pais`, §4.6.1).
- **Saída:** flag ON, marca num país curado atravessa A e B e grava com `Pais` carimbado. Flag OFF,
  Brasil dois retângulos intacto. Nenhum literal `BR_BBOX` fora da SOT.

### M2.5, Read-back: atribuição regional de marcas não-BR (major: read-back-region-collapse) (coding meio dia + gate)
- **O caminho de LEITURA nunca foi internacionalizado.** `resolveRegion(coords)`
  (`regionResolver.js:7-37`) tem uma tabela `REGIONS` de exatamente **9 metrópoles BR** e retorna
  **`'global'`** para tudo o mais. Logo, com a marcação aberta, uma marca de Madri e uma do
  Amazonas viram a MESMA linha `'global'` em `pontos_por_regiao_mes`, `atendimento_por_regiao`,
  `demanda_regiao_categoria`, `vulnerabilidade_alimentar_por_regiao` e nos CSVs region-keyed que o
  operador entrega ao Ministério Público / secretarias de SAN. `SponsorSlot.js:53` usa o mesmo
  resolver, então todo usuário não-BR vê o patrocinador fallback `'*'`/`'global'`, sem targeting
  por país. (Footprint corrigido: o `relatorio-marketing` chama `buildMarketingReport`, que **não**
  usa `resolveRegion`; o colapso atinge `reports.js` (via `relatorios/page.js`) + `SponsorSlot.js`,
  duas superfícies, não três.)
- **Conserto (reusar a SOT do geofence, não a tabela morta de 9 metrópoles):** em
  `regionResolver.js`, após o loop de bbox de `REGIONS` falhar (`:35`), resolver o país via
  `isInsideCountry(coords, code)` sobre a `COUNTRY_BOUNDS` curada (a mesma SOT que M1/M2 constroem)
  e retornar um slug de país estável (ex.: `'pais-es'`, `'pais-pt'`), mantendo `'global'` só como
  terminal de verdadeiro não-match. Madri vira `'pais-es'` e Amazonas vira `'br'` (ou um slug de
  região BR). ZERO novos literais de bbox (FIT-1 segue verde porque os novos slugs leem
  `COUNTRY_BOUNDS`).
- **Vocabulário de bucket no i18n (junto da enumeração do M3):** registrar chaves i18n para os três
  buckets sintéticos hoje emitidos crus (`'global'`, `'sem-regiao'`, `'outros'`) mais os novos
  `'pais-<code>'`, com gêmeas pt-BR/es (e en-US em M6.1), e uma legenda `REGION_LABELS` irmã de
  `CATEGORY_LABELS` em `reports.js`, para que CSV/JSON do operador fiquem locale-coerentes (mesma
  disciplina de I18N-2 / o padrão `Intl.DisplayNames` de M3.5). Sem isto, um operador es lê slugs
  pt-BR-ish crus, o mesmo mismatch que M3.5 conserta um nível acima.
- **KPI público:** `crescimento_mapafome.regioes_ativas_total` (`reports.js:355-359`) conta slugs
  distintos; sem os country-slugs todo alcance internacional colapsa em uma contagem `'global'`,
  subcontando a expansão que esta feature entrega.
- **Se o mantenedor preferir DIFERIR os country-slugs:** o plano deve então adicionar uma linha
  explícita em §9: "marcas internacionais agregam como `global` em /relatorios e recebem o
  patrocinador fallback durante a janela de lançamento", pareada com um gatilho de rollout
  falsificável reusando a analytics do M5 (`track('publish_intl',{country,...})`): "se o share do
  bucket `global` em `pontos_por_regiao_mes` exceder X% na 1a semana, promover os country-slugs
  (M2.5)". De um jeito ou de outro, a lacuna de read-back fica NOMEADA, não invisível.
- **Sequência:** após M2a (onde `COUNTRY_BOUNDS` ganha o set curado) e antes de M5 (flip da flag).
- **Saída:** marcas não-BR atribuídas a um slug de país estável em todos os relatórios e CSVs +
  `SponsorSlot`; vocabulário de bucket com paridade i18n; KPI de crescimento conta a expansão.

### M3, Reclassificação de erro + cópia i18n (enumeração completa) (coding meio dia-1 dia + gate)
- Trocar a `reason` `'outside Brazil bbox'` por um **código estável** `OUT_OF_COUNTRY_BBOX` em
  `sheetsClient.js`.
- **Estreitar `petDomain.js:304`** (SCOPE-2/FACT-2): classificar `OUT_OF_BOUNDS` pelo **reason
  code** apenas, e **remover/escopar** o `|| error.name === 'SheetsValidationError'` para que
  erros de telefone/rating não virem "fora da área". Adicionar teste que cobre o reason **pelo
  ramo do reason**, não pelo do name (senão a migração é mascarada).
- **Lista COMPLETA de sites a tocar:** `sheetsClient.js:94` (throw), `petDomain.js:302`
  (comentário) + `:304` (check), `petPublishClassify.test.js:20` (fixture),
  `test/sheetsValidators.test.js:23` (assert), `strings.js:207` (pt-BR) + `:506` (es).
- **i18n: enumeração explícita de chaves (I18N-2, I18N-3), cada uma com gêmea pt-BR/es.** A KEY
  `pets.publish.failed.out_of_bounds` **permanece** (estável; `test/i18n.test.js` e
  `test/i18n.pets.test.js` fazem deep-equal de chaves + dead-key scan, então a chave não pode
  sumir). Só o **texto** vira neutro de país, referindo o país selecionado, **sem** regredir para
  "não atendemos lá":
  - `pets.publish.failed.out_of_bounds` (pt-BR + es): reescrever de "fora da área que a gente
    atende" / "fuera del área que cubrimos" para "fora do país selecionado" / "fuera del país
    seleccionado", apontando o conserto (ver UX-3).
  - **Nova chave** `errors.out_of_country` (pt-BR + es), com placeholder `{pais}`, para a
    superfície de erro de FOME (UX-1/UX-2), referenciada no código (senão o dead-key scan falha).
  - **Novas chaves de confirmação de troca (LOCO-4, ver §3 LanguageControl/CountryFlagControl):**
    `country.changed` (template `{name}`) e `lang.changed` (auto-referencial por locale), com a
    MESMA chave em CADA bloco de locale (pt-BR/es agora; en-US em M6.1), senão o deep-equal de
    `i18n.test.js` fica vermelho. `country.changed`: "País da busca alterado para {name}" /
    "País de búsqueda cambiado a {name}"; `lang.changed` lê no PRÓPRIO idioma (é falado nele):
    pt-BR "Idioma alterado para Português", es "Idioma cambiado a Español" (não é template `{name}`,
    cada locale hard-coda o próprio nome). Defira o tom/wording exato ao consultor de uiux
    (`v1_0_principal_uiux_defold_solone`); você é dono do mecanismo + paridade de chaves.
  - Auditar e reescrever toda string com "área"/"região"/"atende"/"cubrimos"/"Brasil" em AMBOS os
    locales (`empty.no_pins_in_view:43/349`, contadores "por aqui ainda", etc.), confirmando que
    nenhuma ainda diz "Brasil" ou "a área que atendemos" (I18N-3).
- **UX dos `alert()` de FOME (UX-1, UX-2, blocker):** os três `alert()` crus
  (`App.js:371`, `appMainBootstrap.js:43`, `mylocation.js:118`) dizem "Região não suportada" /
  "Região ainda não suportada", **pt-BR only, fora do i18n, bloqueantes**, semanticamente errados
  para um usuário internacional. M3 roteia a cópia desses três pelo mesmo `t('errors.out_of_country')`
  com o país atual e um próximo passo construtivo. Além disso, M3 **adiciona um `.catch` no
  fire-and-forget** `publishPinFromMap` de `App.js:379`, classifica `out_of_bounds` e renderiza a
  mesma cópia localizada em vez de rejeição silenciosa. A migração de `alert()` → toast
  não-bloqueante (estilo `offlineToast`/`EmptyViewportOverlay`) fica **explicitamente listada como
  diferida em §9** se não couber agora (honestidade: não alegar "em ambos os idiomas" sem fazer).
- **Prompt de CNPJ BR-shaped (MOD-1):** `verificarPonto` (`appPinActions.js:44`) pede "o CNPJ da
  entidade ... credenciada para receber recurso do governo", uma credencial de governo brasileiro
  sem sentido para um moderador/usuário não-BR, e é string crua sem gêmea `t()` (mesma classe de
  R8/I18N-2). M3 escopa `verificarPonto`/`removerPonto` para BR-only quando `INTL_ENABLED`
  (gate em `getSelectedCountry()==='br'`), OU localiza/genericiza o prompt via `t()`; se a
  localização completa não couber na janela, nomear em §9 como item diferido.
- **Sincronização com SW (intl-r3-sw-cache-rollback):** mudanças de string/locale só chegam aos
  usuários via rebuild que re-carimba `SW_VERSION` (`stamp-sw-version.mjs`). O gate de M3 deve
  confirmar que o prebuild hook rodou (`public/version.json` `buildTs`/`SW_VERSION` mudou vs o
  deploy anterior), senão `updatefound` nunca dispara e nenhum cliente vê a nova cópia.
- **Saída:** mensagens de erro coerentes e localizadas (fome E pets), prompt de moderação
  localizado/escopado, paridade pt-BR↔es verde.

### M3.5, Catálogo de países por idioma (coding meio dia + gate)
- `COUNTRY_NAMES` é **só pt-BR** (~234 nomes: "Alemanha", "Estados Unidos", "Espanha"), e
  `COUNTRIES` é construído EAGER no load do módulo (`countries.js:122-124`) ordenando com
  `localeCompare(...,'pt-BR')` hard-coded. Um usuário es abre o seletor e lê uma lista em
  português, o exato mismatch país/idioma que a feature deveria remover.
- **Conserto com fallback e memoização (M3.5-displaynames-ssr-memo):**
  - **Fallback/target:** `grep 'Intl.DisplayNames' src/` = 0 hits (API net-new) e não há
    `.browserslistrc` raiz, então usar um resolver guardado:
    `const names = (typeof Intl!=='undefined' && typeof Intl.DisplayNames==='function') ? new
    Intl.DisplayNames([getLocale()],{type:'region'}) : null;` e cair para `COUNTRY_NAMES` por
    código quando `names` for null OU retornar undefined. Target explícito: default do Next 16,
    `Intl.DisplayNames` baseline-suportado desde ~2021, polyfill NÃO embarcado.
  - **Memoização (não mutar o singleton):** NÃO tornar o `export const COUNTRIES` dependente de
    locale; adicionar `countriesForLocale(locale=getLocale())` com cache `Map` por tag
    (`build+sort` roda no máximo uma vez por locale, nunca por render). Manter o `COUNTRIES` pt-BR
    como valor SSR/default.
  - **Lista estagnada (o bug real de M3.5, mais preciso que "hidratação"):** `CountryFlagControl`
    NÃO é subtree React prerenderizado (monta imperativo em `useEffect:224`, retorna `null` no
    server `:245`), então a lista de `<li>` não causa hydration-mismatch. O defeito é a **lista
    estagnada**: `COUNTRIES` é singleton lido uma vez por `onAdd`, e o control só `subscribe`
    `renderButton` à store de país (`:207`), nunca a lista à mudança de locale. Conserto: adicionar
    uma 2a subscription que reconstrói a lista no evento `mdf-locale-change`
    (`strings.js:658` despacha; teardown junto de `:215-218`), espelhando como `renderButton` já
    reconstrói na troca de país.
  - **SSR/hidratação (escopo correto):** a parte de hidratação se aplica só ao JSX React que
    imprime um NOME de país (label do botão de bandeira, copy de share, chip de país ativo), ver
    §4.2; cada um renderiza o nome de `DEFAULT_LOCALE` no server + 1o paint e troca pós-hidratação
    via `useLocale()`, ou é cliente-only. O control Leaflet é exempt.
  - **Custo da tabela de nomes (M2b-bundle-budget):** pós-M3.5, `COUNTRY_NAMES` fica como fallback
    de lookup + set de validade de código para `normalizeCountryCode`, mas `COUNTRIES`
    (`:122-124`) deve ser reconstruído lazy/a partir da lista curada selecionável, OU o plano
    aceita explicitamente o custo medido ~2KB gzip da tabela fallback como linha de orçamento.
    Rejeitar a alternativa "tabela es paralela" (linha 359) por bundle: dobra o payload de nomes;
    `Intl.DisplayNames` é correto justamente por não adicionar 2a tabela.
- **Saída:** lista de países no idioma da UI; ordenação no locale correto; lista reconstruída na
  troca de locale; fallback sem `Intl.DisplayNames` coberto.

### M4, Paridade do mapa de Pets + busca internacional (coding 1 dia + gate)
- **Pets NÃO tem Camada A para unificar (ARCH-7):** `petsData.publishPet` (`petsData.js:105`)
  chama **só** `validateCoordinatePair` (Camada B), já coberta pelo M2. Não há `dentroLimites` de
  pets a procurar. Declarar isso explicitamente para ninguém caçar um predicado inexistente.
- **Busca de pets (`PetSearchField.js:30, 49-58`):** internacionalizar **espelhando exatamente o
  `SearchField`** em DOIS eixos (I18N-4):
  - `countrycodes`/`region`/`searchBounds` seguem `getCountry(getSelectedCountry())` sob
    `INTL_ENABLED` (escopo geográfico).
  - `accept-language` passa de `'br'` (bug: país, não tag de idioma; o header de `SearchField`
    avisa que isso gera labels distorcidos) para **`getLocale()`** (idioma do label).
- **Saída:** fome E pets se comportam igual sob a flag, em ambos os eixos (geografia + idioma).

### M4.5, Guarda de integridade offshore (promovido de "opcional", major: DATA-3) (coding meio dia + gate)
- O bbox por país aceita pin a 200km no mar dentro do retângulo. **Para fome não há Camada B**
  (DATA-1), então quando o geofence afrouxa para o retângulo do país, o problema do pin no oceano
  **é a única garantia de integridade restante**, não um refinamento. Por isso deixa de ser um
  refinamento opcional (era melhoria de pós-lançamento em revisões anteriores) e vira **decisão
  gateada ANTES do M5** (registrado em DATA-3, §changelog).
- Mínimo viável: (a) bboxes do subconjunto de lançamento ajustadas à mão para abraçar a costa;
  (b) um guard barato no cliente: rejeitar pins cujo país do reverse-geocode (Nominatim, o mesmo
  caminho que a busca já usa) ≠ país selecionado, em vez de point-in-polygon de infra.
- **Saída:** delta esperado de taxa de lixo declarado, com gatilho de rollback se pins offshore
  excederem o limite.

### M4b, Captura de país na fila offline + quarentena de poison-pill (major: STATE-1/R3b/R3b-offline-flush) (coding meio dia + gate)
- **Contexto verificado:** `publishQueue.flush` quebra o loop no 1o erro (`publishQueue.js:82`
  `break`); `writePinToSheets` é o write de baixo nível compartilhado pelo publish interativo
  (`App.js:499`) E pelo flush (`App.js:553`); o payload enfileirado é o MESMO objeto montado em
  `ReportSheet.js:133-139` `{coords, categories, detail, contact, idempotency_key}` (sem campo de
  país); e o ramo offline (`App.js:491-493`) **enfileira ANTES** de qualquer chamada a
  `writePinToSheets`, então um pin fora-de-bounds criado offline é admitido na fila sem checagem e
  vai GARANTIDAMENTE lançar no flush (poison-pill produzível numa sessão).
- **Conserto, em ordem de dependência (após M1/M2 aterrarem `isInsideCountry`+`COUNTRY_BOUNDS`):**
  - (a) **FIELD:** adicionar `country` ao payload montado em `ReportSheet.js:133-139`, vindo de
    `getSelectedCountry()` (`countryStore.js:37`, code lowercase normalizado) no momento do publish.
    É o único ponto de carimbo que ambos os caminhos herdam (o objeto flui sem modificação para
    enqueue e para `writePinToSheets`). NÃO carimbar dentro de `App.handlePublishFromSheet`, porque
    o ramo offline enfileira antes de qualquer decoração e perderia o campo.
  - (b) **READ SITE:** `writePinToSheets(self, deps, {..., country})` destructura `country`, e o
    geofence em `appPinActions.js:152` vira o predicado unificado de M1 keyed no país do payload:
    `!isInsideCountry(coords, country || DEFAULT_COUNTRY)` (default cobre linhas legadas sem
    campo). Como ambos os callers passam por essa função, o carimbo em (a) torna interativo e flush
    consistentes automaticamente; **NÃO** adicionar um 2o `getSelectedCountry()` dentro do flush.
  - (c) **ENQUEUE:** nenhuma mudança em `publishQueue.enqueue` (persiste o payload inteiro); só
    adicionar uma asserção fitness/grep de que o payload enfileirado inclui `country`.
  - (d) **POISON-PILL (decidir, não diferir):** mudar o loop de flush para QUARENTENAR uma falha de
    validação HARD (`out_of_bounds`/o código `OUT_OF_COUNTRY_BBOX` de M3): remover essa linha e
    `continue`; uma falha de REDE (`network_slow`, fetch/offline) mantém o `break` atual
    (preservar-retries). Concretamente: classificar o erro capturado no loop
    (`publishQueue.js:75-85`) pela mensagem; em código de bounds/validação `await remove(row.id)`
    (ou mover para um store `quarantined`), contar como dropado, e continuar; em código de rede,
    `break` como hoje. É necessário porque a captura de país (a-c) NÃO resgata uma linha que está
    genuinamente fora do país carimbado, e o ramo offline pode produzir exatamente isso.
- **Sequência:** antes do M5; compartilha o código estável `OUT_OF_COUNTRY_BBOX` com M3/R4 e
  confirma com R10 que só o caminho de CREATE re-valida (o flush é o único re-validation site).
- **Saída:** fila offline carrega o país no payload; flush valida contra o país do payload; um
  poison-pill é quarentenado sem congelar a fila inteira.

### M5, Ligar a flag + rollout + DRILL de rollback (coding meio dia + observação + gate)
- Flip `INTL` para ON (via `NEXT_PUBLIC_INTL=on` no **build** alvo; `INTL_ENABLED` é resolvido no
  load do módulo, **não em runtime**, então isto é build-time, não kill-switch runtime).
- Rodar o gate completo no estado ligado (smoke200 cobre todas as rotas renderizando 200).
- **Analytics de validação (MISS-2), pré-condição de wiring (M5-publish-intl-analytics-pipeline):**
  fato verificado: o único bootstrap de GA (`G-DHZR5VH2Q7`) vive em `public/index.html:21-28`, que
  é o shell CRA morto (`<html lang="en">`, `%PUBLIC_URL%`, `<div id="root">`), NÃO no head do App
  Router (`layout.js:31-51`), então em produção `window.gtag`/`window.dataLayer` não existem e
  `track()` (`analytics.js:39-47`) cai sempre no buffer `sessionStorage` (`MAX_BUFFERED=200`,
  por-aba, `:11/:23`). A claim "reusa `analytics.js`, zero infra nova" é **falsa**. Portanto:
  - (a) **Pré-condição ANTES de confiar na previsão:** portar o bootstrap gtag de
    `public/index.html:21-28` para o `<head>` de `layout.js` como `next/script`
    (`strategy="afterInteractive"`), OU documentar que GA é intencionalmente não-wired e rebaixar a
    métrica para best-effort. Esta é a "infra de um arquivo" que a claim escondia.
  - (b) **Wiring do publish (escopo de coding de M5, não chamada assumida):** inserir
    `track('publish_intl', { country, inSelectedBbox, offshoreHeuristic })` em `publishPinFromMap`
    (`appPinActions.js`) ANTES do `window.location.reload()` (`:272`, após o `await sheet.addRow`
    `:270`), porque um reload após `track()` contra buffer não-wired é o pior caso (o dispatch
    gtag/dataLayer precisa disparar síncrono antes da navegação).
  - (c) **Identificador de build no evento:** `track('publish_intl')` carrega o
    `version.json.version` (de `stamp-sw-version.mjs`) para que eventos pós-rollback de clientes ON
    ainda-não-adotados sejam atribuíveis e não envenenem a previsão da "primeira semana".
  - (d) **Previsão falsificável:** se (a) embarcar gtag, a previsão vale como escrita ("eventos
    intl com país≠br > N e share offshore < X% na primeira semana, senão rollback"); se (a)
    diferir, reescrever o gatilho para uma métrica que o operador realmente lê (ex.: contagem de
    rejeição offshore derivada server-side do guard Nominatim de M4.5, que roda pré-publish e pode
    ser logado/contado onde os pins são escritos), porque o transporte client é volátil. NÃO
    ancorar o rollback em `peekBufferedEvents()` (readout por-testador, não métrica de população).
  - Estender também `track('moderation_intl', { country, kind:'delete'|'verify' })` em
    `removerPonto`/`verificarPonto` (MOD-1), reusando `analytics.js:30`, e adicionar o eixo de
    VOLUME (escritas/semana por país + taxa de delete/verify) ao gatilho de rollback, não só o
    share offshore.
- **DRILL de rollback (MISS-1), não só documentar:** após o deploy ON, **rebuildar** com
  `NEXT_PUBLIC_INTL=off`, rodar o gate completo + o corpus M0 contra o artefato OFF, **confirmar
  que um pin internacional é REJEITADO de novo**, e registrar o tempo de relógio do rollback.
  **A janela de exposição do rollback = wall-clock de build+deploy MAIS o lag de adoção do
  cliente (intl-r3-sw-cache-rollback):** clientes ativos que retornam adotam em ~(próximo load do
  cliente)+30s, porque `swRegister.js:154` chama `reg.update()` a cada load e o toast auto-aceita em
  `FORCE_RELOAD_MS=30000` sem botão de dispensar (`swRegister.js:114-117`); o único coorte
  ilimitado é a aba dormente nunca recarregada. `sw.js` NÃO faz `skipWaiting` no install por design
  (`sw.js:23-29`, "B16"). Decidir e registrar no DRILL: para um ship intl julgado inseguro, o build
  de rollback OU força `SKIP_WAITING` mais rápido OU o time aceita o lag limitado, escolher um.
  Deixar claro on-call que rollback = rebuild+redeploy (não toggle runtime).
- **Reconciliação de linhas órfãs (não só write-gate, MISS-4/M5-orphan-rows):** o rollback até aqui
  só gateia ESCRITAS futuras; linhas não-BR escritas na janela ON já persistiram no sheet 0 e
  sobrevivem ao rebuild. `appMainBootstrap.js:109` (filtra só `kind!=='pet'`) e `reports.js:270,286`
  (contam toda linha `isReporterPin`) ainda renderizam/contam essas órfãs. Como nenhum campo de
  país era persistido em revisões antigas, órfãs só são detectáveis re-derivando o país das
  `Coordinates` via `dentroLimites`/o corpus M0 (ou, pós-§4.6.1, lendo o `Dados.Pais` carimbado).
  Passo, após confirmar a rejeição de escritas: (a) **MEDIR** quantas linhas da janela ON são
  não-BR (replicando `dentroLimites`/M0 sobre as linhas, `coordsOf` em `reports.js:76-82` dá o par
  já parseado); (b) **DECIDIR** o destino (quarentena/delete NA PLANILHA vs leave-and-accept
  consciente); (c) **VERIFICAR** pós-rollback que mapa + relatório ou as excluem ou que mantê-las é
  estado aceito documentado. A limpeza é operação **NA PLANILHA**, NÃO filtro no load (filtrar por
  país no load reintroduziria o acoplamento país-no-load que §4.3/R3 proíbem). Se a decisão for
  "aceitar", registrar que `appMainBootstrap.js:109` e `reports.js:270,286` seguirão
  renderizando/contando essas linhas como BR.
- **Saída:** marcação internacional ligada e verificada; analytics wired ou métrica server-side
  declarada; rollback **ensaiado** e cronometrado com o lag de adoção nomeado; órfãs medidas e
  reconciliadas.

### M6, Localização de UI: 3o idioma en-US + auto-detecção (coding 1-2 dias + revisão humana + gate)

> **Trilha independente do geofence (M1-M5).** A internacionalização da MARCAÇÃO (onde se pode
> marcar) e a da INTERFACE (em que idioma o app fala) são eixos ortogonais (ver I18N-5/§2). M6 pode
> ser feito em paralelo ou depois, e não destrava nem depende do flip da flag INTL. Só compartilha
> a mesma disciplina de paridade de chaves (R8).

> **Nota de re-numeração (M6.0):** a extração de DICT (M6.0) remove ~600 linhas de `strings.js`, o
> que renumera as âncoras de linha citadas em M6.2/M6.4 (`strings.js:631-638`, `:652-660`, `:656`).
> Re-derivar essas âncoras pós-extração; não confiar nos números antigos.

**M6.0 Extrair DICT para módulos de dados por-locale (pré-requisito de FF1, blocker: i18n-dict-loc-ff1).**
Medido: `strings.js` tem **683 LOC** e cada bloco de locale (pt-BR/es) tem **263 chaves** (não
"~150"). Adicionar um bloco en-US com paridade (263 chaves) + as novas de M3 (`errors.out_of_country`,
o reword, `country.changed`, `lang.changed`) projeta `strings.js` para ~985-1000+ LOC. FF1
(`FILE_LOC_HARD_LIMIT=1000` em `fitness-functions.mjs:19`) é **hard, sem allowlist** (diferente do
`FF2_BASELINE`). Então o gate de M6 iria vermelho por crescimento de arquivo no último milestone.
- Mover cada bloco para `ux/dict.pt-BR.js` / `dict.es.js` / `dict.en-US.js` (`export default` do
  objeto de chaves); `strings.js` passa a `import` esses módulos e montar
  `const DICT = { 'pt-BR': ptBR, 'es': es, 'en-US': enUS }`, mantendo INTACTA a superfície
  exportada `t`/`getLocale`/`localeKeys`/`setLocale`/`useLocale` + `SUPPORTED_LOCALES`/`LOCALE_LABELS`.
- Verificado seguro: os ~20 importadores e os 3 testes (`i18n.test.js:21`, `i18n.pets.test.js:21`,
  `i18n.assinar.test.js:19`) importam só essa API; NENHUM importa `DICT` direto, e `localeKeys`
  (`strings.js:647-650`) já é a única view de leitura sobre `DICT`. Projeção: `strings.js` cai para
  ~80 LOC de API; cada `dict.<locale>.js` fica ~300 LOC, bem abaixo de FF1=1000.
- **Forcing function (FF6):** após a extração, nova fitness de que `strings.js` NÃO contém literal
  DICT de >N chaves (grep: nenhum bloco de chaves i18n fora de `ux/dict.*.js`). Sem isto, o 4o
  locale (ou um re-inline descuidado) re-trip FF1 silenciosamente. Rejeitar a cura tentadora de
  **subir o `FILE_LOC_HARD_LIMIT` ou allowlistar `strings.js`**: FF1 não tem baseline por design e
  o arquivo faz dois trabalhos (dados + API); a cura é extração SRP (1 arquivo = API, N = dados),
  o movimento Conservation-of-complexity de pagar o split uma vez no sistema.
- Re-rodar `npm run fitness` como gate de saída de M6.0 (não descoberta no commit).

**M6.1 Adicionar `en-US` ao scaffold (mecânico, em `strings.js`).**
- `SUPPORTED_LOCALES = ['pt-BR', 'es', 'en-US']` (`strings.js:13`).
- `LOCALE_LABELS['en-US'] = { label: 'English', flag: '🇺🇸' }` (endônimo, como os outros, `:19-22`).
- Bloco `dict.en-US.js` (pós-M6.0) com **as 263 chaves de paridade** (medido: pt-BR/es têm 263
  cada) dos namespaces existentes (`report.*`, `errors.*`, `pin.*`, `empty.*`, `cta.*`, `country.*`,
  `lang.*`, `assinar.*`, `pets.*`) **mais** as novas de M3 (`errors.out_of_country`, o reword de
  `pets.publish.failed.out_of_bounds`, `country.changed`, `lang.changed`, `lang.changed` en-US é
  "Language changed to English"). Paridade exata de chaves, senão `test/i18n.test.js` /
  `i18n.pets.test.js` / `i18n.assinar.test.js` (deep-equal + dead-key scan) ficam vermelhos.
- O `ordenar países` (M3.5, `Intl.DisplayNames(getLocale())`) já cobre en-US de graça: a lista de
  países sai em inglês quando a UI está em en-US.

**M6.2 Auto-detecção de idioma na 1a sessão (via MOUNT-EFFECT, não module-load).**
- A init de locale (`strings.js:631-638`) hoje lê só `localStorage['mdf_locale']` e cai para pt-BR.
  **NÃO** estender essa init de module-load com auto-detecção: ela roda no import, ANTES do 1o
  render, e `t()` lê `currentLocale` em call-time durante o render. A rota `/assinar`
  (`assinar/page.js`) é `'use client'` **sem** `dynamic(...,{ssr:false})` e chama ~30 `t()` no JSX
  de render, então ela prerenderiza pt-BR no build; se a init flipasse `currentLocale` para en-US/es
  antes do 1o render, o 1o render do cliente emitiria en-US contra HTML pt-BR = **hydration
  text-mismatch genuíno** (R12-assinar). `useLocale()` (`:674-683`) NÃO salva: só assina eventos
  FUTUROS de `mdf-locale-change`; o 1o render já leu o locale detectado.
- **Conserto (mount-effect, menor blast radius):** manter `strings.js:631-638` como está (só seed de
  localStorage = escolha salva, correto), e adicionar a detecção de `navigator` num **mount-effect
  top-level** que, quando NÃO há `mdf_locale` salvo, computa o match de
  `navigator.languages`/`navigator.language` contra `SUPPORTED_LOCALES` (tag exata `pt-BR`/`en-US`;
  base `en-*`→`en-US`, `pt-*`→`pt-BR`, `es-*`→`es`; sem match → pt-BR) e chama `setLocale(match)`.
  Assim o 1o render de `/assinar` emite `DEFAULT_LOCALE` pt-BR == HTML prerenderizado (sem
  mismatch), e re-renderiza uma vez pelo evento `mdf-locale-change` que `useLocale` já assina; e
  como passa por `setLocale`, também roda `document.documentElement.lang=locale` (`:656`), tornando
  a claim de M6.4 (`:467`) VERDADEIRA para o caminho de auto-detect.
- **Host do effect:** nomear o componente que monta o effect. `App.js:86` é
  `class App extends Component` e importa só `t` (não `useLocale`), então não re-renderiza na troca
  de module-load; usar um wrapper funcional top-level (ou um effect em `/assinar` que não tem
  provider compartilhado). Gate em `typeof navigator!=='undefined' && !localStorage.getItem('mdf_locale')`.
  **Nunca** persistir a auto-detecção como se fosse escolha do usuário até ele interagir (honrar
  `:435`); para auto-detect, chamar uma variante não-persistente OU aceitar e documentar o
  transient-persist.
- **Auditoria de rotas que prerenderizam `t()` em render:** `grep 'import { t' src/app/**/page.js`
  → hoje **só** `src/app/assinar/page.js` (citar este grep para o blast radius ser NOMEADO). Regra
  permanente: qualquer nova rota `'use client'`-sem-`ssr:false` que chame `t()` em render deve ser
  envolvida em `dynamic(...,{ssr:false})` OU depender do mount-effect (nunca prerenderizar texto
  auto-detectado). Rejeitar `ssr:false` em `/assinar` como conserto primário (perde o pt-BR
  prerenderizado de SEO/1o-paint da página de pagamento); manter só como regra de fallback para
  rotas FUTURAS. Não apoiar em `layout.js:33 suppressHydrationWarning` como silenciador: ele fica
  só em `<html>`/`<body>` e NÃO cascata para o texto `t()` aninhado de `/assinar`.
- **a11y do lang-write (i18n-init-documentlang-a11y, blocker):** a escrita de
  `documentElement.lang` hoje existe SÓ dentro de `setLocale` (`strings.js:656`), que dispara só
  num pick manual. A init de module-load (persistida) e a auto-detecção setam `currentLocale` SEM
  escrever `lang`. Logo um usuário es que retorna, ou um dispositivo en-US/es auto-detectado na 1a
  sessão, tem cada string anunciada por leitor de tela sob fonemas pt-BR até reabrir o picker
  (falha WCAG 3.1.1 para exatamente a população que M6 mira). Conserto (SINGLE SOT para o
  lang-write): extrair o side-effect num helper `applyDocumentLang(locale) { if (typeof
  document !== 'undefined') document.documentElement.setAttribute('lang', locale); }`; substituir a
  escrita inline em `:656` por `applyDocumentLang(locale)` E chamar `applyDocumentLang(currentLocale)`
  ao FIM do bloco de init (após `:638`, dentro do guard `typeof window`, para SSR/export resolver
  `DEFAULT_LOCALE` no server sem tocar DOM). Como o conserto de auto-detect passa a rotear por
  `setLocale` (acima), o lang-write fica coberto em TODOS os caminhos (init-persistido,
  init-auto-detect, setLocale). Manter `layout.js:33 <html lang="pt-BR">` como default SSR
  inalterado (`suppressHydrationWarning` já cobre a correção do cliente), dizer isto explícito para
  ninguém "consertar" o default SSR e reintroduzir divergência de hidratação (R12).
- **Primeiro paint sob export estático (NÃO é hidratação, i18n-static-export-first-paint):** R12
  cobre divergência de hidratação (nenhuma); NÃO cobre o flash visível de idioma. Sob
  `output:'export'` (`next.config.mjs:4`) os 19 HTML prerenderizados nascem em pt-BR. Mesmo com o
  mount-effect, há a janela entre 1o paint pt-BR e o re-render no locale detectado. Decisão
  consciente (escolher UMA, registrar): (a) **ACEITAR** o flash pt-BR → locale-detectado no 1o
  commit como custo conhecido (mais barato, honesto; **default recomendado**); (b) assinar o evento
  no shell (wrapper funcional com `useLocale()` OU `addEventListener('mdf-locale-change', forceUpdate)`
  em `componentDidMount` de `App.js:86`) só para copy above-the-fold, escopo a inventariar; (c) o
  lang do `<html>` já é corrigido pelo conserto a11y acima. NÃO adicionar cookie/redirect/middleware:
  `output:'export'` não tem server para ler `Accept-Language`.
- `setLocale` (`strings.js:652-660`) **já valida** contra `SUPPORTED_LOCALES`, então aceita en-US
  automaticamente. **Verificado:** `LanguageControl.js:115` já faz `for (const locale of
  SUPPORTED_LOCALES)` e resolve label/flag por `LOCALE_LABELS` (`:33-34`), então o 3o idioma
  aparece no picker **sem edição funcional para esse efeito**. (Ver M6.5 abaixo: a confirmação
  falada de troca SIM exige edição funcional em `LanguageControl`.)

**M6.3 Rascunho de tradução + portão de revisão humana (honra D7).**
- Eu **rascunho** os ~263 valores en-US. As strings **mecânicas/neutras** (`cta.list` = "List",
  `pin.directions` = "Directions", labels de filtro, rails de pagamento) vão como tradução direta.
- As **sensíveis à dignidade** (toda a copy de pets: hints de status, consentimento/privacidade,
  os confirmes de reunião/encerramento, a nota de contato seguro, o "pode ser" do match, as
  mensagens de fracasso de publicação, a copy de fome sobre quem precisa) entram **marcadas
  `[REVISAR-HUMANO]`** num bloco separado de entrega, com a versão pt-BR ao lado, para um humano
  aprovar/ajustar o tom (o tone-governor: baixar a ansiedade, nunca acusar) **antes do merge**. O
  plano NÃO trata essas como finais.
- Lista de chaves sensíveis a marcar para revisão (derivada das notas em `strings.js:114-118` e
  `:414-418`): `pets.status.*.hint`, `pets.report.freetext.warning`, `pets.report.consent.*`,
  `pets.report.photo.privacy`, `pets.detail.privacy.note`, `pets.detail.match.lead.*`,
  `pets.detail.lifecycle.confirm*.note`, `pets.detail.lifecycle.done.*`, `pets.publish.failed.*`,
  `pets.closure.lead`, `pets.flag.*`, e a copy de necessidade do app de fome (`report.*`,
  `empty.no_pins_in_view`).

**M6.4 Testes & a11y para o 3o idioma.**
- **Verificado:** `test/i18n.test.js:138` faz deep-equal hard-coded de **"pt-BR and es"** (não
  itera `SUPPORTED_LOCALES`), e vários casos fazem `setLocale('es')` literal. Logo adicionar en-US
  **exige editar** os testes de paridade: reescrevê-los data-driven sobre `SUPPORTED_LOCALES`
  (deep-equal par-a-par de todos os locales) para o 3o idioma ser coberto e o dead-key scan valer
  nos 3. Aplicar o mesmo a `i18n.pets.test.js` e `i18n.assinar.test.js`.
- **Asserção a11y do lang-write num HARNESS de reset de módulo (i18n-init-documentlang-a11y):** a
  asserção "após init com 'es' salvo / só-navigator 'en-US', `documentElement.lang` === locale
  resolvido" NÃO pode ir no suite single-import `i18n.test.js` (a init já rodou no import top-level;
  mutar localStorage/navigator depois NÃO re-dispara a init). Especificar um bloco/arquivo separado
  (ex.: `test/i18n.init.test.js`) que, por caso, monta `window.localStorage`/`navigator.languages`
  PRIMEIRO, depois `vi.resetModules()` e `const m = await import('.../strings.js')` para forçar a
  init a re-rodar sob o ambiente mockado, e asserta `document.documentElement.getAttribute('lang')`
  === o locale resolvido (casos: 'es' salvo → 'es'; sem-store + `navigator.languages ['en-US']` →
  'en-US'; sem-store + navigator ['fr'] → 'pt-BR'). Notar que o suite de paridade/dead-key mantém o
  import top-level único e NÃO pode hospedar essa asserção (forcing-function tem de rodar o caminho
  real, não um snapshot vacuoso de import-time).
- **Harness a11y de open-state para os DOIS controls topright (a11y-open-state-new-topright):**
  `npm run a11y` aponta `@axe-core/cli` para URLs servidas; ambos os pickers nascem
  `panel.hidden=true` (`CountryFlagControl.js:62`, `LanguageControl.js:47`), então o axe URL-level só
  vê o trigger colapsado, nunca o subtree aberto onde vive o contrato ARIA (`aria-controls` dos ids
  `mdf-flag-panel`/`mdf-lang-panel`, `role=group`, `aria-labelledby`, label do input, label do botão
  de fechar, os `<button>` de opção). REPLACE a exit-bullet `:469` por um critério nomeado: em
  `test/overlay-a11y.test.js` (reusar `AXE_OPTS` com color-contrast off + `expectNoSeriousViolations`,
  `:45-68`) adicionar dois describe que importam `{ createFlagDom, wireFlagControl }` e
  `{ createLanguageDom, wireLanguageControl }` + `{ setLocale, getLocale, SUPPORTED_LOCALES }`. Para
  CADA locale em `SUPPORTED_LOCALES` (en-US auditado automaticamente quando M6 o adiciona, casando o
  mandato data-driven; NÃO hard-codar 3a chamada): `setLocale(locale)`; **Flag:**
  `dom=createFlagDom(); document.body.appendChild(dom.wrap); cleanup=wireFlagControl(makeMapStub(),
  dom)` (copiar `makeMapStub()` de `countryFlagControl.dom.test.js:15-22`), abrir via
  `dom.button.click()`, asserir `!dom.panel.hidden` então `expectNoSeriousViolations(dom.wrap,
  'flag-open · '+locale)`; **Lang:** assinatura DIFERENTE, `wireLanguageControl(dom)` SEM map; mesmo
  abrir+asserir. **Teardown CRÍTICO** (para evitar duplicate-id-aria falso nos ids fixos
  `mdf-flag-panel`/`mdf-flag-title` e `mdf-lang-panel`/`mdf-lang-title`): no `afterEach` chamar
  `cleanup()` E `dom.wrap.remove()` (o `afterEach` existente `:110-113` só faz RTL `cleanup()`, que
  não é dono desses nós imperativos de `L.Control`), e em `beforeEach` (`:104-108`) resetar locale
  para o default + `window.localStorage.clear()` para o locale não vazar entre describes. Asserir só
  ARIA/roles/labels/aria-controls/dup-ids, NÃO color-contrast (já off em `AXE_OPTS`). É jsdom-only,
  sem dependência de smoke200/served-build. Adicionar `test/overlay-a11y.test.js` à linha de M6 na
  tabela §6.
- `document.documentElement.lang` (via `applyDocumentLang`/`setLocale:656`) passa a emitir `en-US`
  quando ativo em TODOS os caminhos (init-persistido, auto-detect via mount-effect, pick manual),
  não só no pick (correto para a11y/leitores de tela).
- Smoke200/a11y rodam com o app renderizando em en-US também. Nota: smoke200 NÃO asserta warnings de
  hidratação no console, então a classe R12-assinar é invisível ao gate, adicionar um check manual
  "carregar /assinar com `navigator.language=en-US`, esperar zero warning de hidratação no console",
  ou um teste jsdom de que o 1o render de /assinar usa `DEFAULT_LOCALE`.

**M6.5 Confirmação falada de troca de país/idioma (LOCO-4, a11y-srlive-country-lang-pick, major).**
- Quando um usuário escolhe país, `CountryFlagControl.pick()` (`:141-149`) chama
  `setSelectedCountry`, re-centra o mapa e `closePanel(true)` devolvendo foco ao trigger; o
  `aria-label` do trigger atualiza via `renderButton` (`:108`) mas só reativamente pela subscription
  (`:207`), e um foco num botão cujo nome acessível mudou silenciosamente NÃO é re-anunciado de forma
  confiável. `LanguageControl.pick()` (`:108-112`) é pior: troca todo o idioma da UI com ZERO
  confirmação falada (grep `aria-live` nesse arquivo = 0 hits). A região `role=status` existente em
  `CountryFlagControl` (`:90-94`) é filha de `panel`, então some quando `panel.hidden=true` no
  close, não pode carregar uma confirmação pós-close. Gap WCAG 4.1.3 (Status Messages) numa mudança
  de estado que o usuário invocou. **A claim de §6:489 "`LanguageControl.js` só comentário `:4`, sem
  edição funcional, confirmado" é agora FALSA**: uma edição funcional de `pick()`+`createLanguageDom`
  é necessária.
- **Conserto (NÃO dobrar em M3 nem silenciosamente em M6):** (1) em `createFlagDom` (`~:96`) e
  `createLanguageDom` (`:59`) adicionar um SEGUNDO nó status anexado a `wrap` (não `panel`) para
  sobreviver ao `panel.hidden`: `const announce = L.DomUtil.create('p','mdf-flag__sr-status',wrap);
  announce.setAttribute('role','status'); announce.setAttribute('aria-live','polite');` com regra
  sr-only/visually-hidden em `CountryFlagControl.css` (confirmação redundante para quem vê o
  flip da bandeira/label, então esconder visualmente, diferente do texto visível `empty`). Retornar
  da factory e aceitar na wire fn. (2) em `CountryFlagControl.pick()` após `setSelectedCountry`:
  `announce.textContent = t('country.changed').replace('{name}', c.name)`. (3) em
  `LanguageControl.pick()` APÓS `setLocale(locale)` (para `documentElement.lang` já ser o novo
  locale): `announce.setAttribute('lang', locale)` ENTÃO `announce.textContent = t('lang.changed')`
 , `t()` agora resolve no novo idioma, e o `lang` no elemento fixa a pronúncia do SR no novo
  idioma mesmo antes de qualquer re-render React alcançar esse nó imperativo. (4) chaves i18n:
  exatamente `country.changed` e `lang.changed`, MESMA chave em CADA locale (ver M3), chaves FIXAS,
  não `lang.changed.<locale>` dinâmico, para o dead-key scan (`i18n.test.js:178`) ver o literal nos
  call sites. (5) emendar §6:489 e §3:140: `LanguageControl.js` agora exige edição FUNCIONAL. As
  chaves pt-BR/es aterram na sweep de i18n do M3 (M3 já toca `strings.js` para ambos), então as duas
  locales ganham a confirmação mesmo se M6 escorregar; o comportamento do control (en-US) aterra na
  trilha M6/UI. Caveat a registrar: `empty` e `announce` são duas regiões `polite` irmãs no mesmo
  control, mas nunca disparam juntas (`empty` no filtro-zero com painel aberto; `announce` no pick
  que fecha o painel), então sem double-speak, registrar para um futuro leitor não "consolidar" as
  duas e reintroduzir o bug de painel-escondido-engolindo-confirmação.

**M6.6 Ordem/agrupamento dos dois controls topright (I18N-5, agora major: a11y-open-state).**
- Ambos os controls montam em `topright` como duas `L.Control` independentes adicionadas
  Country-depois-Language (`map.js:401-402`), e `CountryFlagControl.css:17` `.mdf-flag__btn
  max-width:60vw` se aplica aos dois, então dois triggers de bandeira-emoji lado a lado num viewport
  de 360px podem colidir/quebrar (dois 60vw > 100vw) e são confundíveis para um leitor de tela. (1)
  **Ordem:** manter `map.js:401-402` (Country antes de Language) para o control de escopo-de-busca
  tabular primeiro, casando com o `SearchField` que ele escopa; asserir com um check de Tab-order no
  teste open-state de M6.4. (2) **Agrupamento SR:** dar a cada `wrap` um `aria-label` distinguindo o
  eixo (ou `role='group'` + `aria-label` num container topright compartilhado), usando a classe
  `mdf-lang` hoje inerte como hook; não confiar só nos dois glifos de bandeira. (3)
  **Narrow-viewport:** regra CSS escopada em `CountryFlagControl.css` capando `.mdf-flag__btn` para
  dois triggers lado a lado não excederem 100vw em 360px (ex.: stack vertical no canto, ou
  `max-width:min(60vw, ...)`); verificar em emulação 360px. (4) **Homófonos:** pt-BR ("País da
  busca:" vs "Idioma:") e es ("País de búsqueda:" vs "Idioma:") já são não-homófonos; o pendente é
  verificar o par en-US `country.button` vs `lang.button` (rascunhado em M6.3) como
  não-quase-homófono na pass a11y de M6.4. (5) **Coordenação de open-state (gap adjacente):** um
  único dono de open-state compartilhado para abrir um disclosure fechar o outro (um-aberto-por-vez),
  e ou subir o z-index do painel ativo acima do trigger irmão ou stack dos wraps para um painel nunca
  cair sobre o trigger adjacente; cobrir com o teste open-state (asserir só um painel não-hidden, e
  nenhum overlap do painel aberto com o hit-area do outro trigger).

- **Saída:** en-US disponível e selecionável; 1a sessão detecta o idioma do dispositivo entre os 3
  suportados via mount-effect (sem hydration-mismatch em /assinar); `documentElement.lang` correto
  em todos os caminhos de resolução; confirmação falada na troca de país/idioma; controls topright
  agrupados/ordenados e com axe de open-state nos 3 locales; copy sensível en-US **rascunhada e
  enfileirada para revisão humana**, não publicada como final; paridade de chaves verde nos 3
  locales; DICT extraído (FF1 verde).

---

## 6. Mapa milestone → arquivos

| Milestone | Arquivos tocados | Tipo |
|---|---|---|
| M0 | (novo) `test/geofence.characterization.test.js` (grade grossa + asserções de retângulo, OFF+ON) | teste |
| M1 | `countries.js` (+`isInsideCountry`, `br` multi-retângulo), (novo) `geofence.js`, `variaveisAmbiente.js` (`dentroLimites` delega + `criarRow` carimba `Pais`), `appMainBootstrap.js` (desacoplar load-gate/roteamento + filtro de read-back por país) | core |
| M2 | `countries.js` (`COUNTRY_BOUNDS` subconjunto curado), `sheetsClient.js` (`validateCoordinatePair`+`validatePinPayload`), `petsData.js` (passar `code`), `domain/Coordinates.js` (deletar `isInsideBR`/`BR_BBOX`), `test/domain.test.js`, `test/sheetsValidators.test.js`, mocks de teste de pets, (novo) fitness "um bbox SOT" (FIT-1) + fitness `Pais` (FIT-2) | core + dados |
| M2.5 | `ux/regionResolver.js` (slug de país via `isInsideCountry` após as 9 metrópoles), `ux/reports.js` (`REGION_LABELS` legenda), `ux/strings.js` (chaves de bucket de região), `sponsors.js` (doc `pais-<code>`) | read-back |
| M3 | `sheetsClient.js` (reason code), `pets/petDomain.js` (estreitar classificador), `pets/petPublishClassify.test.js`, `test/sheetsValidators.test.js`, `ux/strings.js` (pt-BR+es; reword + `errors.out_of_country` + `country.changed` + `lang.changed`), `App.js` (`.catch` + i18n no `alert`), `appMainBootstrap.js` (i18n no `alert`), `mylocation.js` (i18n no `alert`), `appPinActions.js` (prompt CNPJ localizado/escopado, MOD-1) | erro + i18n + UX |
| M3.5 | `countries.js` (`Intl.DisplayNames` guardado + `countriesForLocale` memo + sort por `getLocale()`), `CountryFlagControl.js` (label + 2a subscription `mdf-locale-change` p/ lista) | i18n catálogo |
| M4 | `pets/PetSearchField.js` (countrycodes+region+bounds por país, `accept-language`→`getLocale()`) | paridade |
| M4.5 | bboxes curadas + (novo) guard de reverse-geocode país≠selecionado | integridade |
| M4b | `ReportSheet.js` (campo `country` no payload), `appPinActions.js` (`writePinToSheets` destructura+geofence por payload), `publishQueue.js` (quarentena de poison-pill vs break de rede), fitness `country` no payload | fila offline |
| M5 | env de build / `intlConfig.js` `DEV_DEFAULT`; `layout.js` (gtag via `next/script`) ou métrica server-side; `analytics.js`/`appPinActions.js` (`track('publish_intl')`+`moderation_intl`); drill OFF + reconciliação de órfãs | flag/rollout |
| M6 | (novos) `ux/dict.pt-BR.js`/`dict.es.js`/`dict.en-US.js` (M6.0 extração); `ux/strings.js` (vira API ~80 LOC + `SUPPORTED_LOCALES`+`LOCALE_LABELS`+`applyDocumentLang` + mount-effect host de auto-detect); novo fitness FF6 (DICT fora de `strings.js`); `test/i18n.test.js`+`i18n.pets.test.js`+`i18n.assinar.test.js` (reescrever data-driven nos 3 locales, **confirmado necessário**); (novo) `test/i18n.init.test.js` (lang-write com `vi.resetModules`); `test/overlay-a11y.test.js` (open-state dos dois controls por locale); `LanguageControl.js` (**edição FUNCIONAL**: `createLanguageDom`+`pick`+lang-attr, LOCO-4); `CountryFlagControl.js` (status `announce` + lang); `CountryFlagControl.css` (sr-only + cap de narrow-viewport); (entrega à parte) bloco de copy sensível `[REVISAR-HUMANO]` | i18n locale novo |

> **Correção de path (FACT-1):** o arquivo da flag é
> `src/app/components/compatibility/components/intlConfig.js` (não `.../components/intlConfig.js`
> nível raiz). Conteúdo verificado: `DEV_DEFAULT=false` na linha 17, `INTL_ENABLED` na linha 36.

---

## 7. Gate de verificação (rodar em CADA milestone)

Conforme `CLAUDE.md` do projeto, `smoke200` é obrigatório e nunca pulado:

| Check | Comando |
|---|---|
| Lint | `npm run lint` (0 erros) |
| Testes | `npm run test` |
| Fitness | `npm run fitness` |
| Build | `npm run build` |
| **Render smoke** | **`npm run smoke200`** (serve `out/`, toda rota = HTTP 200 + render real) |
| Acessibilidade | `npm run a11y` |

> **O gate de fitness NÃO cobre a correção do geofence (FIT-1).** `scripts/fitness-functions.mjs`
> só impõe LOC de arquivo (FF1, hard 1000 sem allowlist, `:19`), LOC de função (FF2, baseline
> ancorado em linha), densidade de TODO (FF4) e pares de contraste WCAG `--mdf-*` (FF5). **Nenhuma**
> referencia bbox/geofence/strings. Logo "fitness verde" **não** quer dizer "geofence preservado":
> o corpus de caracterização do M0 (não o fitness) é o guarda load-bearing. As novas fitness/grep
> são forcing functions sobre a SOT: FIT-1 ("um bbox SOT", M2), FIT-2 (`Pais` carimbado +
> read-back, §4.6.1/M2), e FF6 (nenhum bloco DICT fora de `ux/dict.*.js`, M6.0, necessária porque
> FF1 é hard e o crescimento de `strings.js` para 3 locales o tripa). Nota: o baseline de FF2 é
> ancorado em linha (`mapComponents.js:387`); churn que desloque linhas desse arquivo pode disparar
> FF2 e ser mal-atribuído a este trabalho.

Commits via o agente `git-commit-specialist` (Conventional Commits, corpo com o PORQUÊ, trailer
`Co-Authored-By`). Cada resposta de mudança termina com a tabela what/why.

---

## 8. Riscos & mitigações

| # | Risco | Mitigação |
|---|---|---|
| R1 | bbox de país perde a barreira anti-lixo (pin no oceano). **Para FOME é a única barreira (DATA-1)** | bboxes curadas à mão (M2a) + guard reverse-geocode (M4.5, promovido). É **higiene**, não segurança (ver R6) |
| R2 | Lógica de bbox quádrupla diverge ao editar um lugar | M1+M2 unificam em **um** `isInsideCountry` + **uma** `COUNTRY_BOUNDS`; fitness "um bbox SOT" (FIT-1) |
| R3 | **Centro do mapa vs país selecionado divergem no caminho de LOAD** (não "país não muda em runtime") | M1 desacopla o load-gate/roteamento de planilha do geofence (§4.3); load default permissivo; o filtro de read-back por `Pais` (§4.6.1) é o que de fato realiza a separação |
| **R3b** | **Fila offline congela (STATE-1, blocker)**: pin enfileirado com país A, usuário troca para B, flush re-valida contra B, lança `out_of_bounds`, `publishQueue.flush` quebra o loop no 1o erro (`publishQueue.js:82`) e a fila inteira **congela**; pior, o ramo offline (`App.js:491-493`) enfileira ANTES de validar bounds, então um poison-pill é produzível numa sessão | **M4b**: capturar `country` no payload no enqueue (`ReportSheet.js:133-139`), validar o flush contra o país do PAYLOAD (`isInsideCountry(coords, country)` em `appPinActions.js:152`), e QUARENTENAR falha de bounds no flush (`continue`) preservando o `break` só para falha de rede |
| R4 | A string `'outside Brazil bbox'` é acoplamento implícito (**4 consumidores**, não 3: faltava `test/sheetsValidators.test.js:23`) | M3 troca os quatro juntos por um código estável `OUT_OF_COUNTRY_BBOX`; grep do repo antes do M3 |
| R5 | Países sem bbox no catálogo | **D6: BLOQUEAR com mensagem localizada** (não "permitir sem clamp", que reabre o pin no oceano no toque livre) |
| R6 | **`.env.local` embarca uma CHAVE PRIVADA RSA completa** (`NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`, PEM, linhas 5-13) lida em `sheetsClient.js:42`/`appMainBootstrap.js:18`, inline no bundle estático | **Fora do escopo**, mas registrado honestamente: torna TODA validação de cliente (todo o geofence) não load-bearing para segurança. Qualquer "anti-spam" da bbox é **higiene de dados, não controle de segurança**. Rotação de credencial + escrita server-side são pré-requisitos que o mantenedor deve pesar antes de investir em M4.5 |
| R7 | Pets fica inconsistente se só fome internacionalizar | M4 fecha a paridade (geografia + idioma) |
| R8 | Paridade i18n pt-BR/es quebra | `test/i18n.test.js` + `test/i18n.pets.test.js` (deep-equal de chaves + dead-key scan) no gate; M3 enumera cada chave nova com gêmea (I18N-2) |
| **R9** | **Mismatch país-vs-viewport-vs-idioma (UX-3, UX-4)**: usuário pode panorâmica para outro país, ver endereços lá, tocar e ser bloqueado porque o país selecionado é outro, sem entender por quê | Cópia de erro **nomeia o país atual** e aponta a bandeira para trocar; considerar sugerir o país pelo reverse-geocode do toque; hint de primeira sessão reusando o padrão `PetFirstRunHint` |
| **R10** | **Caminhos de UPDATE re-validam coordenada contra o país errado (MISS-3)** | Verificado: `updatePinDadosByCoords`/`avaliar`/`row.save` **não** chamam `validateCoordinatePair` hoje. Manter assim: só o caminho de CREATE valida, contra o país em que o pin é criado, nunca contra o flag do editor |
| **R11** | **en-US auto-traduzido fere a dignidade da copy sensível (LOCO-1)** | M6.3: só strings mecânicas vão como tradução direta; toda copy sensível entra `[REVISAR-HUMANO]` e **não** é publicada sem aprovação humana, honrando o princípio de `strings.js:5-7` |
| **R12** | **Auto-detecção quebra a hidratação do export estático (SSR)** | M6.2: a auto-detecção NÃO roda no module-load; roda num **mount-effect** que chama `setLocale` pós-mount, então o 1o render == HTML prerenderizado (`DEFAULT_LOCALE`) e re-renderiza via `mdf-locale-change`. (R12 cobre apenas hidratação; o flash de idioma no 1o paint sob export estático é tratado como decisão de UX em M6.2, não como bug de correção) |
| **R12b** | **Flash de idioma (FOUC) no 1o paint sob export estático** (i18n-static-export-first-paint): mesmo com o mount-effect, há janela entre o 1o paint pt-BR prerenderizado e o re-render no locale detectado | M6.2: decisão consciente registrada (default: ACEITAR o flash como custo conhecido; opção de assinar o evento no shell para copy above-the-fold). `output:'export'` não tem server para `Accept-Language`, então cookie/redirect estão fora |
| **R12c** | **`/assinar` prerenderiza `t()` em render e pode mismatch na auto-detecção (R12-assinar, blocker)**: `assinar/page.js` é `'use client'` sem `ssr:false` e chama ~30 `t()` no JSX; `useLocale()` só assina eventos futuros, não salva o 1o render | M6.2: mount-effect (não module-load) garante 1o render em `DEFAULT_LOCALE`; regra permanente para rotas FUTURAS `t()`-em-render (`ssr:false` ou mount-effect); check manual de warning de hidratação em /assinar com `navigator.language=en-US` (smoke200 não vê warnings de console) |
| **R13** | **Paridade de chaves quebra ao virar 3 locales** | M6.1/M6.4: `dict.en-US.js` espelha TODAS as 263 chaves (incl. as novas de M3); testes de paridade viram data-driven em `SUPPORTED_LOCALES`, dead-key scan no gate |
| **R14** | **`document.documentElement.lang` não emite o locale resolvido nos caminhos de init/auto-detect (i18n-init-documentlang-a11y, blocker a11y)**: a escrita de `lang` existe só em `setLocale:656` (pick manual); init-persistido e auto-detect setam `currentLocale` sem escrever `lang`, então um usuário es/en-US tem tudo anunciado em fonemas pt-BR (WCAG 3.1.1) | M6.2: helper `applyDocumentLang(locale)` (single SOT), chamado em `setLocale` E ao fim do bloco de init; auto-detect roteia por `setLocale`; asserção num harness `vi.resetModules` (M6.4/`i18n.init.test.js`) |
| **R15** | **Controls topright sem axe de open-state + confusíveis por SR + colisão narrow-viewport (a11y-open-state, a11y-srlive, I18N-5)**: o axe URL-level só vê o trigger colapsado; troca de país/idioma sem confirmação falada (WCAG 4.1.3); dois 60vw lado a lado quebram em 360px; dois disclosures podem abrir juntos e sobrepor | M6.4 (harness open-state por locale com teardown de ids fixos) + M6.5 (status `announce` fora de `panel` + `country.changed`/`lang.changed`) + M6.6 (agrupamento SR, ordem de Tab, cap de viewport, um-aberto-por-vez) |
| **R16** | **Superfície de moderação global sem rate-limit (MOD-1, major)**: `removerPonto`/`verificarPonto` escrevem via `appendRow` SEM validação alguma (sem geofence/dedup/captcha/cap por país); abrir para 5-15 países escala spam volumétrico contra o mesmo sheet 0 | Lançar com o subconjunto CURADO (D4) como teto; instrumentar os canais (`track('moderation_intl')`) e adicionar eixo de VOLUME ao gatilho de rollback de M5; prompt CNPJ localizado/escopado BR (M3). É **higiene operacional**, não segurança (R6); escrita server-side + rate-limit ficam fora (§9) |
| **R17** | **Adicionar um locale RTL no futuro quebra o painel da bandeira (ancoragem física) e perde o `dir` no html (localization-rtl-na, nice-to-have)** | Fora de escopo (só LTR no lançamento: pt-BR/es/en-US), mas registrado em §9: trocar para propriedades lógicas em `CountryFlagControl.css` (`:51 right:0`, `:90 margin ... 0`, `:155 text-align:left`) + setar `dir` em `setLocale:656` são pré-requisitos nomeados, não silenciados |
| **R18** | **Read-back colapsa marcas não-BR em `global` (read-back-region-collapse, major)**: `resolveRegion` só conhece 9 metrópoles BR; relatórios de política pública e targeting de patrocinador atribuem toda marca não-BR a `global` | M2.5: `resolveRegion` resolve país via `isInsideCountry` (slug `pais-<code>`); vocabulário de bucket no i18n; ou §9 + gatilho falsificável de share de `global` se diferido |

---

## 9. Itens deliberadamente FORA de escopo (honestidade)

- **Validação server-side real / anti-cheat:** o site é estático; toda validação roda no cliente e
  é burlável. Pior: a chave privada está no bundle (R6), então o geofence é higiene de dados, não
  segurança. Lift do geofence não piora isso, mas também não resolve. **Inclui rate-limit /
  moderação server-side (MOD-1/R16):** os canais `removerPonto`/`verificarPonto` continuam append
  sem cap; o teto da janela inicial é o subconjunto curado (D4) + instrumentação de volume no M5.
- **Migração de linhas existentes (MISS-3):** **nenhuma migração é necessária SOMENTE se o rollback
  precede qualquer escrita internacional.** Caso contrário, linhas órfãs não-BR escritas na janela
  ON sobrevivem ao rebuild OFF e devem ser reconciliadas (ver M5/MISS-4): nenhum campo de país era
  persistido em revisões antigas, então órfãs só são detectáveis re-derivando o país das
  `Coordinates` via `dentroLimites`/o corpus M0, não por um campo carimbado. (Pós-§4.6.1, marcas
  novas carimbam `Dados.Pais`, mas linhas pré-§4.6.1 não.) Confirmado que os caminhos de update
  (`updatePinDadosByCoords`, saves de rating) **não** re-validam coordenada contra o país
  selecionado (R10).
- **Migração `alert()` → toast não-bloqueante no app de FOME:** M3 ao menos localiza a cópia dos
  três `alert()` via `t('errors.out_of_country')`; a troca do `alert()` por toast estilo
  `offlineToast` fica **diferida e nomeada aqui** (anti-padrão alert-UX), não silenciada.
- **Tabela ISO completa de ~234 países (M2b):** só depois de M4.5; o lançamento é subconjunto
  curado (D4). Orçamento de bundle e módulo separadamente importável definidos em M2b.
- **Tradução além de pt-BR/es/en-US:** M6 adiciona en-US (D7). Um 4o idioma (ex.: fr, derivado do
  país selecionado) fica fora: exigiria traduzir toda a copy sensível à dignidade para mais
  idiomas, o que o projeto evita fazer às cegas. A auto-detecção só escolhe entre os 3 idiomas que
  já têm dicionário humano-revisado.
- **RTL / direção de layout (localization-rtl-na):** os 3 locales de lançamento (pt-BR, es, en-US)
  são todos LTR, então nenhum trabalho de `dir`/RTL está em escopo. NOTA para um futuro locale RTL
  (ex.: ar/he): exigirá (a) propriedades lógicas no painel da bandeira, `CountryFlagControl.css:51`
  ancora com `right: 0` físico, `:90` usa `margin: ... 0` físico no botão de fechar, `:155` usa
  `text-align: left`, todos a trocar por `inset-inline-end`/`margin-inline`/`text-align: start`; e
  (b) o flip de `document.documentElement.dir='rtl'` em `setLocale` (`strings.js:656`), que hoje só
  emite `lang`. Auditoria `html[dir]` obrigatória antes de adicionar tal locale.
- **Texto en-US FINAL da copy sensível:** M6.3 entrega **rascunhos** marcados `[REVISAR-HUMANO]`; a
  aprovação/ajuste de tom é um passo humano fora deste plano, pré-requisito do merge daquelas chaves.
- **Tiles/geocoder por região:** Nominatim e os tiles já são globais; nada a fazer.
- **Rotação das credenciais expostas + escrita server-side:** problema de segurança real (R6),
  mas é outra tarefa, pré-requisito a pesar antes do endurecimento de integridade.

### 9.1 M5: estado implementado nesta passagem (dark-ship; a flag NÃO foi ligada)

Esta passagem implementou o **wiring de analytics (MISS-2)** e o **DRILL de rollback (MISS-1)**,
mas **NÃO** ligou a flag: `intlConfig.DEV_DEFAULT` permanece `false` na fonte commitada (decisão do
mantenedor; o flip fica para uma passagem futura). O que aterrou:

- **Evento `publish_intl`** emitido em `appPinActions.publishPinFromMap` (após o `sheet.addRow`,
  ANTES do `window.location.reload()`), via uma camada fina `components/ux/intlAnalytics.js` sobre o
  seam `analytics.track` EXISTENTE (zero infra nova). Forma:
  `track('publish_intl', { country, in_selected_bbox, offshore_heuristic, build })`. `moderation_intl`
  (`{ country, kind:'delete'|'verify', build }`) instrumenta `removerPonto`/`verificarPonto` (MOD-1).
  O `country` é resolvido pelo MESMO `activeCountryFor(INTL_ENABLED, countryStore)` do geofence
  (OFF → `'br'`), passado por um acessor `deps.activeCountry` (mantém `appPinActions` puro). O `build`
  vem do cache fail-soft alimentado pelo fetch que `VersionFooter` já faz de `/version.json` (nenhum
  fetch novo). As chamadas são **no-op-safe** (try/catch no emissor + `track()` guarda SSR/nome
  vazio): um sink quebrado nunca custa a publicação ao usuário.
- **SINK PODE ESTAR INERTE (honestidade, M5-publish-intl-analytics-pipeline):** verificado que o
  único bootstrap de GA (`G-DHZR5VH2Q7`) vive em `public/index.html` (shell CRA morto), NÃO no head
  do App Router (`layout.js`). Em produção `window.gtag`/`window.dataLayer` não existem, então
  `track()` cai sempre no buffer volátil de `sessionStorage`. O wiring está correto e com a forma
  certa, mas a métrica de POPULAÇÃO ainda **não é agregável** até portar o gtag para `layout.js` como
  `next/script` (passo M5 (a), fora desta passagem) OU derivar a rejeição offshore server-side. Não
  se alega "analytics funciona" ponta-a-ponta neste estado.
- **DRILL de rollback (MISS-1)** como procedimento reproduzível + execução: `scripts/rollback-drill.mjs`
  (`npm run drill:rollback`) prova que, sob `NEXT_PUBLIC_INTL=off`, `INTL_ENABLED` resolve `false`, e
  o corpus M0 (`geofence.characterization`) + `test/rollbackDrill.test.js` confirmam que o geofence OFF
  **REJEITA um pin internacional (Lisboa)** e aceita um pin BR (São Paulo). Com `--build` reconstrói o
  artefato OFF e cronometra. A janela de exposição = wall-clock de build+deploy MAIS o lag de adoção do
  cliente (`reg.update()` por load + `FORCE_RELOAD_MS=30000`; aba dormente é o único coorte ilimitado).

### 9.2 Previsão falsificável de rollout (MISS-2, registrada ANTES da janela de dados)

> **Quando a flag for ligada (passagem futura) E o sink gtag estiver wired (M5 (a)):** "na semana 1
> do build ON, eventos `publish_intl` com `country !== 'br'` somam **> 50**, E a fatia offshore
> (`offshore_heuristic` de rejeição, derivada server-side / do guard M4.5) fica **< 5%** das
> publicações intl, E o volume de escrita por país + a taxa de delete/verify (`moderation_intl`)
> ficam dentro do teto do subconjunto curado (R16). **Senão: ROLLBACK** (rebuild OFF + redeploy, o
> drill MISS-1)." Se o sink gtag NÃO estiver wired, re-ancorar o gatilho na **contagem server-side de
> rejeição offshore** do guard de M4.5 (NÃO em `peekBufferedEvents()`, que é leitura por-testador,
> nunca métrica de população). A mesma previsão vive como comentário ao lado do wiring em
> `components/ux/intlAnalytics.js` (knowledge in the world: a previsão mora junto do código que mede).

---

## 10. Changelog desta revisão (multiagentes)

Cada linha = um achado que sobreviveu à verificação adversarial contra o código real, e a mudança
de uma linha que ele causou no plano. Severidade: B=blocker, M=major, m=minor, n=nice-to-have.
IDs reusados em lentes diferentes levam sufixo `-lens` (ex.: `SCOPE-1-scope` vs `SCOPE-1-solone`);
referências no corpo usam o mesmo token para casar por grep.

| ID (lens) | Sev | Mudança no plano |
|---|---|---|
| ARCH-1-arch / SOT-1 / DATA-2 / ARCH-1,2-devil | B | §4.0 novo: as três caixas BR são DIFERENTES; D5 preserva os dois retângulos; removida a alegação "byte-a-byte" falsa |
| STATE-1-solone | B | R3b novo: fila offline congela; capturar país no enqueue, validar flush contra o payload |
| DATA-1-scope | B | §3 Camada B corrigida: fome NÃO tem Camada B; só pets chama `validateCoordinatePair` |
| UX-1-uiux | B | M3: localizar os três `alert()` de fome via `errors.out_of_country` |
| UX-2-uiux | B | M3: `.catch` no `publishPinFromMap` fire-and-forget de `App.js:379` + cópia localizada |
| TEST-1-solone+devil | B/M | M0: corpus por-célula amostrando `dentroLimites`, não SP/Lisboa; testes OFF+ON |
| SEC-1-devil | M | R6/§1/§9: chave RSA PRIVADA completa no bundle; geofence é higiene, não segurança |
| ARCH-2-arch | M | §4.2: resolver país no consumidor/`geofence.js`, não no POJO `variaveisAmbiente` |
| ARCH-5-arch | M | §4.1: `isInsideCountry`/`countries.js` puro, sem importar `countryStore` (evitar ciclo) |
| ARCH-1-solone | M | §4.3: classificar 4 callsites por papel; desacoplar load-gate de `appMainBootstrap` |
| ARCH-3-arch | M | M1: invariante de meio-estado; flag não pode ligar antes do M2; teste A≡B |
| ARCH-4 / ARCH-3-devil / PARSE-1-solone | M | §4.4: `code` passado explícito; enumerar `validatePinPayload`+`petsData`+mocks; caso coord 0 |
| ARCH-7-arch | m→M | M4: pets não tem Camada A; busca em DOIS eixos (countrycodes + `accept-language`) |
| COUPLE-1-solone / TEST-1-devil | M | R4/§3/M3: 4o consumidor `test/sheetsValidators.test.js:23` adicionado |
| SCOPE-1-scope | M | D4 + M2a/M2b: subconjunto curado de lançamento, não ~234 de uma vez |
| DATA-3-scope | M | M4.5 novo: guard offshore promovido de "opcional" para gateado antes do M5 |
| SEQ-1-scope | M | M0/M1: testar caminho ON desde o M0, critério de saída |
| MISS-1-scope | M | M5: DRILL de rollback (rebuild OFF + verificar rejeição + cronometrar) |
| I18N-1-uiux | M | M3.5 novo: `Intl.DisplayNames` por locale para o catálogo de países |
| I18N-2-uiux | M | M3: enumeração explícita de cada chave i18n com gêmea pt-BR/es |
| I18N-3-uiux | M | M3: auditar/reescrever toda string "área/região/atende/Brasil" em ambos locales |
| I18N-4-uiux | M | M4: `accept-language`→`getLocale()` em `PetSearchField` (era bug `'br'`) |
| UX-3-uiux | M | R9: cópia de erro nomeia o país e aponta a bandeira; hint de 1a sessão |
| UX-4-uiux | M | R9: mismatch país-vs-viewport tratado como decisão de UX |
| ARCH-6-arch | m | §4.2: nota SSR (geofence resolve BR sob `no-window`); asserção de caracterização |
| ARCH-8 / SCOPE-1-solone | n/m | §4.5/M2: DELETAR `isInsideBR()`+`BR_BBOX` de `Coordinates` (sem consumidor) |
| SCOPE-2-scope / FACT-2-devil | m | M3: estreitar `petDomain.js:304`, remover OR-no-name catch-all |
| FIT-1-solone | m | §7/§4.6: nota que fitness não cobre geofence; nova grep "um bbox SOT" |
| PARSE-1-solone | m | §4.4: caso de teste para coordenada com componente 0 (não dropar zero) |
| UX-5-uiux / D6 | m | D6/R5: fallback = BLOQUEAR, não "permitir sem clamp" |
| I18N-5-uiux | n | §2: idioma de UI e país de marcação são eixos independentes; distinguir os controls |
| MISS-2-scope | m | M5: `track('publish_intl', ...)` + previsão falsificável de rollout |
| MISS-3-scope | n | §9/R10: sem migração de linhas; updates não re-validam coordenada |
| SEQ-2-scope | n | §5: imposto de gate por milestone separado do coding (HDD lento) |
| FACT-1-devil | m | §6: path corrigido `.../compatibility/components/intlConfig.js` |
| FACT-3-devil | n | §3: confirmado que os 4 callsites passam 1 arg; delegar é seguro de assinatura |

### Rev3 (passagem de localização, pedido do usuário)

| ID | Sev | Mudança no plano |
|---|---|---|
| LOCO-1 (pedido do usuário) | feature | D7 + M6 novos: 3o idioma `en-US` com paridade total de chaves; copy sensível `[REVISAR-HUMANO]`, não machine-traduzida (R11) |
| LOCO-2 (pedido do usuário) | feature | M6.2: auto-detecção do idioma do dispositivo na 1a sessão entre os locales suportados, reconciliada com a premissa de `strings.js:5-7` (M6.0), SSR-safe (R12) |
| LOCO-3 (derivado) | M | M6.1/M6.4 + R13: `SUPPORTED_LOCALES` vira 3; testes de paridade data-driven; `Intl.DisplayNames` (M3.5) já cobre nomes de país em en-US |

### Rev4 (segunda passagem memética)

| ID (lens) | Sev | Mudança no plano |
|---|---|---|
| i18n-dict-loc-ff1 (perf) | B | M6.0 novo: extrair DICT para `dict.<locale>.js` ANTES de adicionar en-US (FF1 hard=1000 sem allowlist; medido 683 LOC + 263 chaves/locale projetam ~985-1000+); FF6 forcing-function; contagens "~150"→263 corrigidas; nota de re-numeração de âncoras |
| R12-assinar (devil-2) | B | M6.2 reescrito: auto-detect via MOUNT-EFFECT (não module-load), porque `/assinar` prerenderiza ~30 `t()` em render e flip no module-load causa hydration-mismatch; deletada a analogia falsa com `countryStore` (lazy vs module-load); R12c novo; auditoria de rotas `t()`-em-render |
| i18n-init-documentlang-a11y (a11y) | B | M6.2: helper `applyDocumentLang` (single SOT) chamado em init E `setLocale`; R14 novo (WCAG 3.1.1 nos caminhos init/auto-detect); M6.4 ganha harness `vi.resetModules` (`i18n.init.test.js`) para a asserção rodar o caminho real |
| DEST-1 (ops) | B | §4.6.1 novo: write-back carimba `Dados.Pais` em `criarRow` (todos os 4 paths mantêm sheet 0) + filtro de read-back por país em `appMainBootstrap.js:109`; FIT-2; sequenciado em M1 antes do M5 |
| read-back-region-collapse (ops) | M | M2.5 novo + R18: `resolveRegion` resolve país via `isInsideCountry` (slug `pais-<code>`) em vez de colapsar não-BR em `global`; vocabulário de bucket no i18n; corrige footprint (não atinge relatorio-marketing) |
| M4b/R3b-offline-flush (ops) | M | M4b novo: campo `country` no payload (`ReportSheet.js`), flush valida contra país do payload, quarentena de poison-pill (`continue`) vs `break` de rede; R3b expandido (offline enfileira antes de validar = poison-pill produzível) |
| M5-publish-intl-analytics-pipeline (ops) | M | M5: gtag só vive no shell CRA morto (`public/index.html`), não no head do App Router; pré-condição de wiring (`next/script` em `layout.js`) ou métrica server-side; `track` antes do `reload()`; id de build no evento |
| intl-r3-sw-cache-rollback (perf) | M | M5: janela de rollback = build+deploy + lag de adoção do cliente (`reg.update()` a cada load + toast 30s; `sw.js` não `skipWaiting` por design); gate de M3 confirma `SW_VERSION` re-carimbado |
| M5-orphan-rows (ops) | M | M5/§9: linhas órfãs não-BR da janela ON sobrevivem ao rebuild OFF; M5 ganha passo MEDIR+RECONCILIAR NA PLANILHA (não filtro no load, R3); §9 corrige "sem migração" para condicional (MISS-4) |
| a11y-srlive-country-lang-pick (a11y) | M | M6.5 novo (LOCO-4): status `announce` fora de `panel` + `country.changed`/`lang.changed` com lang-attr; corrige a claim falsa "LanguageControl só comentário"; R15 |
| a11y-open-state-new-topright (a11y) | M | M6.4: harness de open-state em `overlay-a11y.test.js` para os dois controls por `SUPPORTED_LOCALES` com teardown de ids fixos; R15 |
| I18N-5-stack (a11y) | n→M | M6.6 novo: ordem de Tab, agrupamento SR, cap de narrow-viewport (60vw x2 > 100vw), um-disclosure-aberto-por-vez; I18N-5 promovido n→M; R15 |
| MOD-1 (ops) | M | M3/M5/§9: prompt CNPJ BR localizado/escopado; canais de moderação instrumentados (`moderation_intl`) + eixo de volume no rollback; R16 |
| M3.5-displaynames-ssr-memo (perf) | M | M3.5: resolver `Intl.DisplayNames` guardado + fallback; `countriesForLocale` memo (não mutar singleton); bug real = lista ESTAGNADA (2a subscription `mdf-locale-change`), não hidratação; SSR escopado só ao JSX de nome |
| M2b-bundle-budget (perf) | M | M2b/M3.5: orçamento de bundle medido + módulo separadamente importável; `COUNTRY_NAMES` fica só fallback; rejeitar tabela es paralela por payload |
| M0-GRID-RESOLUTION-BOUND (perf) | m | M0: grade GROSSA de 1 grau (teto < ~1000 células) + asserções de retângulo (~48); corrige bordas para a costura `dentroLimites` (-14.18..-14.09), não BR_BBOX S=-33.75 |
| i18n-static-export-first-paint (perf) | m | M6.2 + R12b novo: flash de idioma no 1o paint sob export estático tratado como decisão de UX (default: aceitar), não bug; sem cookie/redirect |
| localization-rtl-na (a11y) | n | §9 + R17 novos: RTL confirmado N/A nos 3 locales LTR; futuro locale RTL exige propriedades lógicas + flip de `dir` em `setLocale:656`, nomeados |
| INTL-R3-XREF-COLLISION (coherence) | M | §3:76 `ver STATE-1/R3`→`R3b`; revisão renomeada R1/R2/R3→Rev1/Rev2/Rev3/Rev4 (mata overload com risk-IDs); §4.3 "R3 cobre"→"O risco R3 (§8) cobre" |
| stale-xref-m45-m6-opcional (coherence) | M | M4.5: removida a referência morta "sai de M6 opcional" (M6 agora é localização); re-ancorada em DATA-3/§changelog |
| stale-gate-count-r3 (coherence) | m | §5:269 "~6 vezes"→"uma vez por milestone (10 hoje, ver §7)"; M3.5 ganha sufixo de custo "(coding meio dia + gate)" |
| M3.5-heading-effort-estimate (coherence) | m | M3.5 heading: "(major: I18N-1)" removido (severidade vive em §10), "(coding meio dia + gate)" adicionado p/ casar a convenção |
| i18n-doc-voice-title (coherence) | m | §1 título: parêntese inglês "(lift the Brazil-only hitbox)"→"(abrir a marcação além do Brasil-only)"; em-dash do título reescrito |
| SCOPE-1 (coherence) | m | §10: notação de ID normalizada para `STEM-lens` em todas as linhas reusadas (SCOPE-1, ARCH-1, ARCH-3, TEST-1, PARSE-1); corpo casa por grep; caption define a convenção |
