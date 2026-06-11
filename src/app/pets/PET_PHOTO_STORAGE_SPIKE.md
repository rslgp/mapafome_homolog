# PET_PHOTO_STORAGE_SPIKE.md — onde vivem os BYTES da foto do pet

> **PET-M14 — DECISION SPIKE (artefato de decisão, ZERO código de upload).**
> Status: **DECIDIDO**. Owner: `softwareengineer`. Consome: a base `main`
> (data-layer client-side → Google Sheet via `sheetsClient`), o SOT `petDomain`,
> o invariante `kind:'pet'` de `petsData`. Entrega para: **PET-M15** (a UI de
> captura/upload constrói CONTRA este contrato) e **PET-M16** (o placeholder/skeleton).
>
> Este arquivo é um SOT de DECISÃO, não de runtime. Se a decisão mudar, ela muda
> AQUI primeiro e o PET-M15 segue. Estilo: pt-BR/English misto, igual ao
> `PETS_MILESTONES.yaml`. Comentário pesado, disciplina de fronteira.

---

## 0. TL;DR — a DECISÃO em uma linha

**Os bytes da foto vivem num bucket/host de imagem EXTERNO (opção `a`); a planilha
guarda APENAS uma URL `https` curta e canônica no campo `photos` já existente do
`Dados`. Base64-no-`Dados` (`c`) e Google Drive via service account (`b`) são
REJEITADOS.** O caminho atual de "colar uma URL" NÃO é substituído — ele vira o
**fallback de baixo atrito** e o caminho de upload é o **complemento preferido**,
ambos convergindo para a MESMA forma de string (uma URL `https` em `photos`), de
modo que `parsePetRow`, `sanitizePhotosUrl` e "Ver as fotos do pet" não mudam.

---

## 1. Estado ATUAL verificado (a base contra a qual decidimos)

Fatos confirmados lendo os arquivos — não suposições:

- **Já existe um caminho "cole uma URL".** `PetReportSheet.js` tem o campo
  `#pet-photos` (`type="url"`, `maxLength={500}`) que escreve em `photos`;
  `petDomain.sanitizePhotosUrl` barricada para `http:`/`https:` SÓ (qualquer outro
  esquema → `''`); `buildPetDados` grava `photos: sanitizePhotosUrl(photos)`;
  `PetDetailSheet.js` renderiza o link "Ver as fotos do pet" quando `derived.photos`
  existe. **Logo: o contrato de RENDER e a barricada de esquema JÁ EXISTEM.** Este
  spike decide de ONDE vem essa string quando o usuário faz UPLOAD em vez de colar.
- **`petsData.publishPet` grava SÓ a coluna `Dados`** (`appendRow(0, { Dados: ... })`),
  sob `kind:'pet'`, com dedupe por `idempotency_key`. Esse é o **invariante de
  isolamento** — nenhuma coluna de fome é tocada, então a linha fica invisível a
  todas as superfícies de fome.
- **`petsData.fetchPets` faz um SCAN COMPLETO da planilha** (`getSheet(0).getRows()`
  → `parsePetRow` em CADA linha, descartando os nulos). Toda linha de fome E de pet
  é puxada para o cliente a cada load. **Qualquer byte que entre no `Dados` é
  multiplicado por (nº de linhas) × (cada visita) na rede e na memória do browser.**
  Esse é o **scaling-cliff** que governa a decisão.
- **A chave de ESCRITA já viaja no bundle.** `sheetsClient.ensureReady()` chama
  `doc.useServiceAccountAuth({ client_email: NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: NEXT_PUBLIC_GOOGLE_PRIVATE_KEY })`. Por serem `NEXT_PUBLIC_*`, ambos
  são INLINADOS no JS estático servido de `out/`. **Qualquer pessoa com devtools tem
  a chave de escrita da planilha.** Essa é a superfície HIGH-severity herdada (homolog
  **P14**, espelhada em **PET-M4**). É a restrição mais pesada deste spike e a razão
  de NÃO adicionarmos uma segunda credencial de escrita no cliente.

> **Por que isso é load-bearing:** a decisão "onde os bytes vivem" não pode
> introduzir um SEGUNDO segredo de escrita no bundle (Drive/bucket key) nem inchar o
> `Dados` que o full-scan já paga. As duas restrições juntas eliminam `b` e `c`.

---

## 2. Critérios de avaliação (peso explícito)

Cada opção é pesada contra estes eixos, na ordem de severidade para ESTE app:

| # | Eixo | Por que pesa aqui |
|---|---|---|
| C1 | **Blast radius do segredo `NEXT_PUBLIC_*`** | Restrição #1. Uma chave de escrita no bundle é abusável por qualquer um. NÃO adicionar uma segunda. |
| C2 | **Scaling-cliff do full-scan** (`fetchPets` lê TODA linha) | Restrição #2. Bytes no `Dados` viram custo de rede/memória por linha × por visita. |
| C3 | **Isolamento `kind:'pet'`** | Invariante duro. O contrato não pode tocar nenhuma coluna de fome. |
| C4 | **PII/LGPD** (a foto pode capturar pessoa/placa/endereço incidental) | Dignidade-first. A foto é dado pessoal de TERCEIROS por acidente. |
| C5 | **Confiabilidade / longevidade do link** | Uma foto que some mata o valor de reconhecimento (o ÚNICO motivo da foto). |
| C6 | **Custo** | O app é gratuito e sem monetização (anti-bloat). Não pode exigir billing. |
| C7 | **Atrito p/ o reporter** | Dono em pânico (PET-M-CURVE). Quanto menos passos, melhor. |

---

## 3. As opções, pesadas

### Opção (a) — host/bucket de imagem EXTERNO + URL no `Dados`  ✅ ESCOLHIDA

O reporter envia a foto a um serviço de hospedagem de imagem dedicado; o serviço
devolve uma URL `https` pública e canônica; gravamos SÓ essa URL em `photos`.

- **C1 (segredo):** ✅ **O melhor caso.** O upload usa uma credencial de UPLOAD
  PRÓPRIA do host de imagem — separada e de menor privilégio que a chave da planilha
  — OU um endpoint de upload anônimo/unsigned com rate-limit do próprio host. Não
  reusa, e crucialmente NÃO duplica, `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`. Mesmo que uma
  chave de upload-only precise ir ao cliente, o blast radius é "alguém envia imagens
  ao nosso bucket", NÃO "alguém reescreve/apaga a planilha inteira". Severidade muito
  menor que C1 e ISOLADA do P14.
- **C2 (full-scan):** ✅ Apenas uma URL curta entra no `Dados` (dezenas de bytes). O
  full-scan custa o mesmo que hoje no caminho cole-uma-URL. **Zero aceleração do
  cliff.**
- **C3 (isolamento):** ✅ Intocado. `publishPet` continua gravando só `Dados.photos`
  como string. `kind:'pet'` preservado por construção.
- **C4 (PII/LGPD):** ⚠️ Gerenciável (ver §6). O byte sai do dispositivo, então
  precisamos de: resize/strip-EXIF client-side ANTES do upload, aviso de consentimento,
  e um caminho de takedown. Mas a foto NÃO fica numa pasta pessoal do dono (ao
  contrário de `b`).
- **C5 (confiabilidade):** ✅/⚠️ Depende do host. Um host pago/estável com retenção
  conhecida é confiável; um host gratuito-com-expiração é arriscado. **Mitigação:
  tratar o link como possivelmente-perecível e fazer o render degradar com elegância
  (PET-M16 fallback), nunca um `<img>` quebrado.**
- **C6 (custo):** ✅ Tiers gratuitos/baratos existem; o volume (`0` linhas de pet hoje)
  é minúsculo. Aceitável.
- **C7 (atrito):** ✅ Um toque "enviar foto" → URL preenchida automaticamente. Menos
  atrito que o cole-uma-URL atual (que exige criar pasta no Drive e ajustar permissão).

**Veredito:** vence em C1, C2, C3, C7; gerenciável em C4/C5/C6. **ESCOLHIDA.**

> **Provider — decisão DEFERIDA, não pré-comprometida.** Este spike fixa o CONTRATO
> (URL `https` em `photos`), não a marca do host. PET-M15 escolhe um provedor
> concreto que satisfaça os invariantes obrigatórios abaixo (§4.4). Mantém-se
> project-agnostic: nenhum nome de produto é load-bearing aqui.

### Opção (b) — Google Drive via a service account existente  ❌ REJEITADA

Reusar a service account da planilha para subir o arquivo no Drive e guardar o link.

- **C1 (segredo):** ❌ **Pior caso.** Para escrever no Drive pelo cliente, o cliente
  precisa da MESMA `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY` — agora com escopo Drive. Isso
  AMPLIA o blast radius do P14 (de "escreve a planilha" para "escreve a planilha E o
  Drive"), exatamente o oposto do que PET-M4 manda. **Inaceitável.**
- **C4 (PII/LGPD):** ❌ A foto cai numa Drive/pasta atrelada a uma identidade Google
  real (a service account / a conta que a hospeda), misturando dado de terceiros com
  um espaço de propriedade do projeto — um emaranhado de controlador/retenção pior
  que um bucket dedicado e efêmero.
- **C5/C7:** ⚠️ Compartilhamento de pasta do Drive e ACLs são frágeis e geram links
  longos; a UX de upload programático no Drive pelo cliente é pesada.

**Veredito:** falha C1 de forma dura (amplia o P14). **REJEITADA.** (O cole-uma-URL
de Drive feito MANUALMENTE pelo usuário continua existindo como fallback — ali a
credencial é do PRÓPRIO usuário, não a nossa; ver §5.)

### Opção (c) — base64 client-resized com cap duro, dentro do `Dados`  ❌ REJEITADA

Redimensionar a foto no cliente, codificar em base64 e gravar a string no próprio
`Dados`.

- **C2 (full-scan):** ❌ **Letal.** `fetchPets` puxa TODA linha. Uma miniatura base64
  de, digamos, 30–60 KB por linha, somada a 1000 linhas, vira dezenas de MB baixados e
  mantidos em memória A CADA visita — para renderizar um mapa, onde a maioria das
  fotos nem é aberta. Acelera o scaling-cliff de forma direta e não-linear na
  experiência (o app trava no celular do dono em pânico). É exatamente o anti-padrão
  que o header do PETS_MILESTONES adverte.
- **C2-bis (limite de célula):** ❌ Uma célula do Google Sheets tem teto de ~50.000
  caracteres; base64 infla ~33%. Mesmo uma foto pequena estoura o cap fácil, e
  empurrá-la para dentro do `Dados` (que já carrega status/coords/contato) é frágil.
- **C3 (isolamento):** ⚠️ Tecnicamente cabe em `Dados`, mas inchar o `Dados` é
  precisamente o que o critério de aceite proíbe.
- **C4 (PII/LGPD):** ⚠️ A foto vira parte permanente da linha pública da planilha;
  takedown obriga reescrever a linha (mais arriscado que despublicar um objeto de
  bucket).

**Veredito:** falha C2 e C2-bis de forma dura. **REJEITADA.** (Resize+strip-EXIF
client-side da técnica `c` é REAPROVEITADO — ver §6 — mas o destino do byte é o
bucket de `a`, nunca o `Dados`.)

### Matriz de decisão (resumo)

| Eixo | (a) host externo | (b) Drive/service-acct | (c) base64 no Dados |
|---|---|---|---|
| C1 segredo NEXT_PUBLIC | ✅ isolado do P14 | ❌ amplia o P14 | ✅ n/a |
| C2 full-scan | ✅ só URL | ✅ só URL | ❌ letal |
| C3 isolamento kind:'pet' | ✅ | ✅ | ⚠️ incha Dados |
| C4 PII/LGPD | ⚠️ gerenciável | ❌ emaranhado | ⚠️ permanente na linha |
| C5 confiabilidade | ✅/⚠️ depende host | ⚠️ ACL frágil | ✅ |
| C6 custo | ✅ | ✅ | ✅ |
| C7 atrito | ✅ baixo | ⚠️ alto | ✅ baixo |
| **Resultado** | **ESCOLHIDA** | rejeitada (C1) | rejeitada (C2) |

---

## 4. O CONTRATO decidido (o que PET-M15 constrói contra)

### 4.1 Onde os bytes vivem
Num **host/bucket de imagem externo**, FORA da planilha. A planilha nunca vê o byte —
só a URL. (Provider concreto: escolhido em PET-M15 sob os invariantes §4.4.)

### 4.2 A forma da string no `Dados` (a ref que vai na linha)
- **Campo:** o `photos` JÁ EXISTENTE de `buildPetDados`/`parsePetRow`. **Nenhum campo
  novo no `Dados`** → isolamento `kind:'pet'` intocado, full-scan inalterado.
- **Valor:** uma ÚNICA URL `https` **canônica e direta** para o recurso de imagem
  (idealmente a imagem renderizável em si, p.ex. `https://<host>/<id>.jpg`), curta.
  **Continua passando por `sanitizePhotosUrl`** (que já aceita só http/https) tanto na
  escrita quanto na leitura — a barricada existente cobre o upload sem mudar.
- **Forma:** string simples, NÃO um JSON aninhado nem um array. Uma foto por report no
  PET-M15 (a galeria multi-foto está fora de escopo). Manter string simples preserva o
  round-trip atual e não infla o `Dados`.
- **Teto de tamanho da string:** o `maxLength={500}` do input atual permanece o teto da
  URL; uma URL canônica de bucket cabe folgado em < 200 chars.

### 4.3 Dimensões máximas / tamanho máximo (resize client-side ANTES do upload)
O resize/compress acontece no cliente (técnica reaproveitada de `c`), antes de qualquer
byte sair do dispositivo. Defaults a fixar no SOT do PET-M15 (ponto de partida
justificado — reconhecimento de pet não precisa de full-res):

- **Maior lado:** **≤ 1600 px** (downscale preservando aspect-ratio). Suficiente para
  reconhecer focinho/pelagem/coleira; barato de servir.
- **Peso do arquivo:** **≤ ~1,5 MB** após compressão JPEG/WebP (qualidade ~0.8). Cap
  DURO no cliente: acima disso, recomprime ou recusa com copy calma pt-BR.
- **Formato:** reencodar para JPEG (ou WebP) — o reencode também DESCARTA o EXIF
  (incluindo GPS), o que é uma mitigação de PII de graça (§6).
- **Quantidade:** **1 foto** por report no PET-M15.

> Esses números são o PONTO DE PARTIDA; PET-M15 os ancora num SOT único (espelhando
> `PET_RECENCY_OPTIONS` etc.), nunca espalhados. Eles não pertencem ao `Dados`.

### 4.4 Invariantes OBRIGATÓRIOS do provider (PET-M15 escolhe quem os satisfaz)
1. **Não exige, e não duplica no bundle, `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`.** Qualquer
   credencial de upload é própria do host, de privilégio mínimo (upload-only,
   idealmente unsigned + rate-limit), e seu pior abuso é "subir imagens ao nosso
   bucket", nunca tocar a planilha (C1).
2. **Devolve uma URL `https` direta e estável**, servida com CORS/hotlink permitido para
   o domínio do app (C5).
3. **Suporta DELETE/takedown** de um objeto sem reescrever a linha da planilha (C4 — ver §6).
4. **Tier de custo compatível com app gratuito** no volume previsto (C6).
5. Se NENHUM provider satisfizer (1) sem um segredo de escrita no cliente, PET-M15
   **NÃO inventa um** — fica só no fallback cole-uma-URL (§5) e escala o upload junto ao
   handoff de server-proxy (§7).

### 4.5 Fallback de "sem foto"
Inalterado em relação a hoje, e reforçado:
- `photos === ''` é um estado VÁLIDO e de primeira classe. Publicar SEMPRE funciona sem
  foto (o critério de aceite do MVP e do PET-M15).
- O detail sheet **não renderiza nada de foto** quando `photos` é vazio (já é o
  comportamento — o bloco "Ver as fotos do pet" é condicionado a `derived.photos`).
- Um `photos` não-vazio mas inalcançável/quebrado (link morto, takedown) **degrada para
  o placeholder calmo do PET-M16** — NUNCA um `<img>` quebrado. (PET-M16 é o dono desse
  visual; este contrato só garante que o estado existe e é esperado.)

---

## 5. Relação com o caminho cole-uma-URL JÁ EMBARCADO (replace? complement? fallback?)

**Nem substitui, nem ignora — COMPLEMENTA e CONVERGE.** Decisão explícita:

- O upload do PET-M15 é o caminho **PREFERIDO** (menor atrito, sem o usuário mexer em
  permissões de Drive).
- O cole-uma-URL existente é mantido como **FALLBACK** de baixo atrito e de
  escape-hatch: o usuário que já tem um álbum (Drive/Photos/Instagram público) cola o
  link, e — importante — ali a credencial é do PRÓPRIO usuário, então NÃO toca o blast
  radius do nosso segredo.
- **Ponto de convergência:** ambos os caminhos terminam na MESMA string — uma URL
  `https` em `Dados.photos`, passada por `sanitizePhotosUrl`. Logo `parsePetRow`,
  `buildPetDados` e o render "Ver as fotos do pet" **não mudam**. O PET-M15 só adiciona
  a ORIGEM "upload"; o destino e a barricada são os de hoje.
- Consequência de SOT: o teto/escopo (1 URL, http/https-only, maxLength) é UM contrato
  para os dois caminhos. Nada bifurca a forma do dado.

---

## 6. PII/LGPD — a foto é dado pessoal de TERCEIROS por acidente

Uma foto de pet pode capturar incidentalmente rosto, placa, número de casa, ponto de
referência. Tratamento decidido (alinhado ao tom-calmo e dignidade-first do PET-M3):

1. **Strip de metadados client-side:** o reencode JPEG/WebP do §4.3 **descarta o EXIF**,
   incluindo coordenadas GPS embutidas na foto. Mitigação de localização-de-PII de graça,
   ANTES do upload.
2. **Consentimento + aviso calmo (pt-BR), reaproveitando o padrão do PET-M3:** próximo ao
   campo de foto, um aviso curto: *"Evite fotos que mostrem pessoas, placas ou o número
   da casa — foque no pet."* Sem alarme; tom de cuidado. PET-M15 escreve a copy final;
   este spike fixa a EXIGÊNCIA do aviso.
3. **Sem PII em analytics/erros:** a URL da foto e qualquer byte NUNCA entram em payload
   de analytics/erro (reusar a redação de `trackError` de PET-M3/PET-M21). O scaling-
   cliff e a privacidade se reforçam: como o byte nem está no `Dados`, ele já não vaza
   pelo caminho de dados normal.
4. **Caminho de takedown:** o provider DEVE suportar deletar o objeto (§4.4-3). Despublicar
   uma foto = deletar o objeto do bucket; a linha da planilha pode então ter `photos`
   reescrito para `''` (reusando o writer coords-keyed do PET-M2, que reescreve só a
   coluna `Dados`). Como o byte vive fora da linha, o takedown NÃO exige mexer no resto
   do report. (O fluxo de UI de takedown não é deste spike — fica para PET-M3/PET-M4/um
   item de moderação; aqui garante-se apenas que o CONTRATO o permite.)
5. **Minimização:** uma foto por report; sem rosto-detect/AI (anti-bloat do header); o cap
   de dimensão (§4.3) é também minimização de dado.

---

## 7. Blast radius do segredo `NEXT_PUBLIC_*` — endereçado E com handoff nomeado

**Endereçado neste spike (o que ESTÁ resolvido):** a decisão é PROJETADA para NÃO piorar
o P14. Rejeitamos `b` precisamente porque reusaria/ampliaria `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY`
no Drive. A opção `a` mantém o upload numa credencial separada de menor privilégio
(ou unsigned+rate-limited), cujo pior abuso é isolado do banco de dados (a planilha). O
contrato adiciona **zero** novo segredo de ESCRITA-da-planilha ao bundle.

**Handoff nomeado (o que NÃO se finge resolver aqui):** a planilha continua sendo escrita
do cliente com `NEXT_PUBLIC_GOOGLE_PRIVATE_KEY` inlinada — a superfície HIGH-severity
herdada (homolog **P14**, espelhada em **PET-M4**). A cura durável é o **server write
proxy** que (a) remove o segredo de escrita do bundle e (b) passa a mediar TAMBÉM o
upload da foto (assinando uploads server-side, escondendo qualquer credencial de bucket).
Isso é explicitamente o **handoff de bug-bounty / arquitetura-de-segredo** nomeado no
rodapé do `PETS_MILESTONES.yaml` e em PET-M4 — **NÃO** é escopo autônomo do
`softwareengineer`, e este spike NÃO finge tê-lo resolvido. Quando esse proxy existir,
o §4.4-5 e o caminho de upload migram para trás dele sem mudar a forma do `Dados`.

---

## 8. Resumo dos critérios de aceite (PET-M14)

| Critério de aceite (YAML) | Onde é satisfeito |
|---|---|
| Contrato documentado e justificado: onde os bytes vivem | §1, §3(a), §4.1 |
| Forma da URL/ref no `Dados` | §4.2 |
| Tamanho/dimensões máximos | §4.3 |
| Fallback de sem-foto | §4.5 |
| Relação com o caminho cole-uma-URL embarcado | §0, §5 |
| Preserva isolamento `kind:'pet'`; NÃO incha o `Dados` do full-scan | §1, §3(c)-rejeição, §4.1, §4.2 |
| PII/LGPD endereçado | §6 |
| Blast radius do segredo NEXT_PUBLIC endereçado OU handoff nomeado | §7 (ambos) |

---

## 9. Fora de escopo deste spike (honestidade de fronteira)

- A UI de captura/upload, o resize concreto e o SOT dos defaults de §4.3 → **PET-M15**.
- O placeholder/skeleton dos três estados de foto (vazio/loading/erro) → **PET-M16**.
- O server write proxy / remoção do segredo de escrita → **handoff P14 nomeado** (§7),
  não escopo autônomo.
- Galeria multi-foto, AI breed/photo-detect, auto-match por foto → **anti-bloat** (header
  do `PETS_MILESTONES.yaml`).
- A escolha do PRODUTO de hospedagem → **PET-M15**, sob os invariantes obrigatórios §4.4.
