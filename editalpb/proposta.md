# PROJETO MAPA FOME
## Expansão da rede colaborativa de mapeamento e atendimento à insegurança alimentar na Paraíba

**Em resposta ao Edital de Chamamento Público — Edital Social SEDH/PB nº 003/2025**
Secretaria de Estado do Desenvolvimento Humano da Paraíba

> **Atenção:** rascunho com placeholders `[VERIFICAR NO EDITAL]` e `[TODO]`. Conferir cada um com o texto oficial antes do envio. Revisão jurídica obrigatória.

---

## 1. IDENTIFICAÇÃO DA OSC PROPONENTE

| Campo | Informação |
|---|---|
| Razão social | [TODO — nome registrado da OSC] |
| Nome fantasia | MAPA FOME |
| CNPJ | [TODO] |
| Data de fundação | [TODO — OSCs precisam normalmente comprovar mínimo de funcionamento; verificar exigência no edital] |
| Endereço | [TODO] |
| Município/UF | [TODO] / PB |
| Telefone | [TODO] |
| E-mail institucional | [TODO] |
| Site | https://mapafome.com.br |
| Representante legal | [TODO — nome completo + CPF + RG + cargo] |

## 2. IDENTIFICAÇÃO DO PROJETO

| Campo | Informação |
|---|---|
| Nome | MAPA FOME — expansão estadual |
| Eixo temático | [VERIFICAR NO EDITAL — provável enquadramento: Segurança Alimentar e Nutricional / Atenção à População em Situação de Rua / Direitos Humanos] |
| Território | Estado da Paraíba (prioritariamente Grande João Pessoa e Campina Grande na fase inicial; expansão para cidades do interior via rede voluntária nas fases 2 e 3) |
| Valor total solicitado | R$ [VERIFICAR VALOR MÁXIMO NO EDITAL] |
| Contrapartida da OSC | [VERIFICAR EXIGÊNCIA E % NO EDITAL] |
| Prazo de execução | [VERIFICAR NO EDITAL] meses |
| Público-alvo direto | Pessoas em situação de rua e famílias em insegurança alimentar grave na Paraíba |
| Público-alvo indireto | Voluntários, iniciativas sociais (sopões, ONGs, igrejas, coletivos de bairro), comerciantes locais de alimentos e poder público |
| Alinhamento legal | Lei 11.346/2006 (LOSAN), Decreto 7.272/2010 (PNSAN), Lei 13.019/2014 (MROSC), LGPD (Lei 13.709/2018), Art. 135 do Código Penal (omissão de socorro), ODS 2 e ODS 10 |

## 3. DIAGNÓSTICO DA REALIDADE OBJETO DA PARCERIA

Conforme o **II VIGISAN (Rede PENSSAN, 2022)**, aproximadamente 33 milhões de brasileiros vivem em situação de fome grave e mais de 125 milhões enfrentam algum grau de insegurança alimentar. No Nordeste — e especificamente na Paraíba — os indicadores de insegurança alimentar grave superam a média nacional.

O Censo do IBGE (2022) registra aumento expressivo de pessoas em situação de rua nas capitais do Nordeste. Em João Pessoa e Campina Grande, parte relevante dessa população não tem acesso regular a três refeições diárias.

Apesar da existência de políticas públicas de SAN e de uma rede ativa de iniciativas voluntárias (sopões solidários, ONGs confessionais e coletivos de bairro), **não há hoje uma ferramenta pública que permita a um cidadão comum, em menos de 40 segundos, sinalizar a localização de uma pessoa com fome para que um voluntário próximo leve ajuda em tempo real**. A ausência desse elo impede que o dever cívico de socorro (Art. 135 do CP) seja exercido de forma ágil, anônima e digna.

O MAPA FOME existe para preencher essa lacuna tecnológica, respeitando como cláusula pétrea a dignidade da pessoa mapeada: nenhum nome, foto, idade, gênero ou dado de saúde é coletado.

## 4. OBJETIVOS

### 4.1 Objetivo geral
Reduzir o tempo médio entre a identificação de uma pessoa em insegurança alimentar no território paraibano e a chegada efetiva de ajuda humanitária, por meio de uma plataforma pública, gratuita, anônima e alinhada à LGPD.

### 4.2 Objetivos específicos
1. Expandir a cobertura operacional do MAPA FOME para todas as 12 regiões geoadministrativas da Paraíba.
2. Articular e capacitar uma rede de voluntários e iniciativas locais de distribuição cadastradas na plataforma.
3. Produzir e disponibilizar publicamente relatórios agregados mensais para subsidiar decisões de política pública em SAN, direitos humanos e saúde.
4. Realizar campanhas de divulgação orientadas à dignidade (sem aestheticizar o sofrimento), em mídia digital e impressa, para aumentar a taxa de reporte.
5. Consolidar a metodologia como caso replicável para os demais estados do Nordeste.

## 5. METAS, INDICADORES E MEIOS DE VERIFICAÇÃO

| # | Meta | Indicador | Meio de verificação | Valor final esperado |
|---|---|---|---|---|
| M1 | Pontos reportados | Nº total de pontos no período | Relatório agregado em `/relatorios` | 5.000 em 12 meses |
| M2 | Taxa de atendimento | (pontos atendidos / pontos reportados) × 100 | Relatório agregado | ≥ 60% |
| M3 | Tempo até atendimento | p50 em horas entre reporte e atendimento | Relatório agregado | ≤ 6 h |
| M4 | Voluntários ativos | Nº de voluntários que atenderam ≥ 1 ponto | Relatório agregado + backend | 1.000 |
| M5 | Iniciativas cadastradas | Nº de iniciativas em `/iniciativas` | Painel administrativo | 50 |
| M6 | Relatórios públicos | Nº de relatórios mensais publicados | URL pública `/relatorios` | 12 |
| M7 | Cobertura municipal | Nº de municípios paraibanos com ≥ 1 ponto | Relatório agregado | 50 |
| M8 | Alcance digital | Impressões únicas em campanhas | Relatórios de Google Ads e Meta Ads | 500.000 |

## 6. METODOLOGIA

### 6.1 Arquitetura de três camadas
1. **Reportagem anônima (3 toques).** Qualquer cidadão com um smartphone marca um ponto no mapa, escolhe uma ou mais categorias de necessidade (comida, água, roupa, higiene, abrigo) e publica. Nenhum dado pessoal da pessoa mapeada é coletado.
2. **Atendimento voluntário.** Voluntários próximos visualizam os pontos com codificação por urgência (anel fino = fresco, espesso = há mais de 6h), se responsabilizam via "Estou indo agora" (claim suave de 30 minutos) e marcam como atendido após a entrega.
3. **Transparência pública.** Relatórios agregados k-anônimos (k=5) disponíveis em `/relatorios` para imprensa, Ministério Público, secretarias e pesquisadores.

### 6.2 Tecnologia
- PWA (Progressive Web App) instalável em Android e iOS, funcional offline.
- Código aberto para auditoria.
- Hospedagem serverless (custo marginal próximo de zero).
- Infraestrutura compatível com LGPD: nenhum dado pessoal de vulneráveis é armazenado.

### 6.3 Princípios de dignidade (inegociáveis)
- Nenhum pedido de foto, nome, idade, gênero ou saúde da pessoa mapeada.
- Nenhum sistema de gamificação (badges, streaks, pontos, leaderboards).
- Nenhuma avaliação ou ranking de iniciativas — "soup kitchen 3 estrelas" é erro categorial.
- Nenhuma notificação automática por padrão; donor opta explicitamente.
- Contato do voluntário que reporta é opcional.

## 7. CRONOGRAMA DE EXECUÇÃO

| Mês | Atividade |
|---|---|
| M1 | Formalização da parceria; contratação de equipe; adequação de infraestrutura |
| M1–M2 | Capacitação inicial de voluntários em João Pessoa e Campina Grande |
| M2 | Lançamento da campanha de divulgação (Fase 1 — capitais) |
| M2–M12 | Mapeamento e atendimento contínuos |
| M3 | Publicação do 1º relatório mensal |
| M4–M6 | Expansão para cidades do interior (Fase 2) |
| M6 | Avaliação intermediária + relatório parcial à SEDH |
| M7–M10 | Campanha de divulgação Fase 2 + cadastro massivo de iniciativas |
| M10–M11 | Oficinas de análise dos relatórios para SEDH, MP e academia |
| M12 | Relatório final + prestação de contas |

## 8. ORÇAMENTO E CRONOGRAMA DE DESEMBOLSO

> **Totais detalhados e desembolso mensal a ser ajustado conforme valor máximo e estrutura de rubricas exigidos pelo edital.** O modelo abaixo obedece ao MROSC (Lei 13.019/2014).

### 8.1 Rubricas previstas

| Rubrica | Descrição | Valor (R$) |
|---|---|---|
| Pessoal e encargos | Coordenação geral, desenvolvimento técnico, mobilização de voluntários, análise de dados (detalhar CLT ou contrato) | [TODO] |
| Serviços de terceiros (PJ) | Tradução/revisão, design de campanhas, consultoria jurídica | [TODO] |
| Comunicação/divulgação | Campanhas em Google Ads, Meta Ads, mídia impressa e rádio comunitária | [TODO] |
| Hospedagem e infraestrutura | Serviços de nuvem, banco de dados, certificado digital | [TODO] |
| Material de escritório | Papelaria, cartuchos, impressão | [TODO] |
| Deslocamento | Passagens e hospedagem para oficinas no interior | [TODO] |
| Equipamentos [VERIFICAR SE ELEGÍVEL] | Notebooks, roteadores portáteis para oficinas | [TODO] |
| **Total** | | **R$ [VERIFICAR NO EDITAL]** |

### 8.2 Cronograma de desembolso
Desembolso em [VERIFICAR NO EDITAL — normalmente 2 a 4 parcelas] conforme cumprimento de metas.

## 9. EQUIPE

| Função | Dedicação | Qualificação mínima | Responsabilidades |
|---|---|---|---|
| Coordenação geral | 40 h/sem | Superior + experiência em OSC | Condução do projeto, interlocução com a SEDH, prestação de contas |
| Desenvolvimento técnico | 40 h/sem | Superior em TI ou equivalente | Manutenção da PWA, dashboards públicos, integração com planilha |
| Mobilização de voluntários | 40 h/sem | Superior em Serviço Social, Comunicação ou afins | Capacitações, parcerias com igrejas e ONGs, campanhas |
| Análise de dados e relatórios | 20 h/sem | Superior + domínio de estatística básica | Relatórios agregados mensais, k-anonimização, apoio a MP e pesquisa |

Currículos detalhados em anexo.

## 10. SUSTENTABILIDADE PÓS-PARCERIA

- **Parcerias privadas locais**: o sistema de banners de parceiros (já implementado tecnicamente) permite venda de visibilidade por raio geográfico e período, com regras de dignidade incorporadas ao código.
- **Doações pontuais** via Pix e CNPJ em página `/apoiar`, com prestação de contas pública mensal.
- **Adesão progressiva de outros entes públicos** (municípios da Paraíba e secretarias de estado interessadas).
- **Código aberto**: a manutenção técnica custa quase nada após o ciclo da parceria — a infraestrutura é serverless e o trabalho voluntário de desenvolvimento é preservado.

## 11. CONTRAPARTIDA

> **[VERIFICAR NO EDITAL — confirmar exigência, percentual mínimo e modalidades aceitas.]**

Caso o edital exija contrapartida não-financeira, a OSC oferece:
- Infraestrutura tecnológica já existente e operacional (PWA pública, domínio, certificado).
- Banco de horas voluntárias da comunidade de desenvolvedores mobilizados.
- Canais digitais próprios (Instagram, site, e-mail) para divulgação conjunta.

Caso seja exigida contrapartida financeira, a OSC apresentará extrato bancário específico e plano de aplicação.

## 12. MONITORAMENTO E AVALIAÇÃO

### 12.1 Prestação de contas técnica
Os relatórios mensais em `/relatorios` são auditáveis publicamente e já incluem:
- Total de pontos reportados por mês.
- Taxa de atendimento por região.
- Tempo mediano e p90 até atendimento.
- Distribuição por categoria de necessidade.

### 12.2 Prestação de contas financeira
Conforme Lei 13.019/2014 e instruções normativas da SEDH/PB:
- Conta bancária específica para a parceria.
- Apresentação de notas fiscais, recibos e folhas de pagamento.
- Relatório final com execução físico-financeira consolidada.

### 12.3 Avaliação externa
Convite formal ao Ministério Público da Paraíba e a pesquisadores de universidades estaduais (UFPB, UFCG, UEPB) para analisar os relatórios agregados e recomendar ajustes.

## 13. DOCUMENTAÇÃO DE HABILITAÇÃO

> **[VERIFICAR NO EDITAL a lista exata.]** Conjunto típico em chamamentos MROSC:

- Cópia do CNPJ.
- Cópia do Estatuto Social registrado.
- Ata da última eleição da diretoria.
- Comprovante de endereço da sede.
- Certidões negativas de débito:
  - Federal (Receita Federal + Dívida Ativa da União)
  - Estadual (Paraíba)
  - Municipal
  - FGTS (CEF)
  - Trabalhista (TST)
- Comprovante de conta bancária específica.
- Declaração de não-vedação (Lei 13.019/2014, art. 39).
- Declaração de regularidade fiscal.
- Relação nominal atualizada dos dirigentes.
- Currículo da equipe técnica.
- Comprovante de experiência prévia na área do projeto (se exigido).

## 14. DECLARAÇÕES

A OSC proponente declara:

1. Ciência e concordância com todos os termos do Edital Social SEDH/PB nº 003/2025.
2. Inexistência de dirigentes com vínculo em qualquer cargo em comissão na administração pública (art. 39 da Lei 13.019/2014).
3. Regularidade fiscal e trabalhista.
4. Capacidade técnica e operacional comprovada para executar o objeto.
5. Não ter sido declarada inidônea em nenhuma esfera da administração pública.
6. Comprometimento com os princípios da LGPD na operação da plataforma.
7. Comprometimento com os princípios de dignidade da pessoa humana no tratamento de informações sobre pessoas em situação de vulnerabilidade.

---

**Local e data:** [TODO — Município]/PB, ___ de ________ de 2026.

**_____________________________________________**
[TODO — Nome do Representante Legal]
[TODO — Cargo]
CPF: [TODO]
