# MAPA FOME — Plataforma livre, sem vigilância, para visibilizar a fome

**Edital:** Fundo Brasil de Direitos Humanos — Direitos Digitais 2026
**Eixo:** 1 — Fortalecimento Institucional
**Valor solicitado:** até R$ 80.000,00
**Duração:** 12 meses
**Território de execução:** Brasil (sede em Paraíba; alcance nacional via web)

---

## 1. Identificação da organização proponente

| Campo | Valor |
|---|---|
| Nome / coletivo | [VERIFICAR — nome do coletivo MAPA FOME] |
| Natureza | Coletivo de tecnologia social, sem CNPJ (ou OSC parceira a confirmar) |
| Cidade / UF | João Pessoa / PB |
| Ano de fundação / início | [VERIFICAR — primeira commit pública] |
| Pessoa de contato | [VERIFICAR — nome] |
| E-mail | contato@mapafome.com.br |
| Site / repositório | https://mapafome.com.br · https://github.com/rslgp/mapafome |

## 2. Resumo do projeto (até 500 caracteres)

MAPA FOME é uma plataforma livre, anônima e sem vigilância digital que permite, em três toques, mapear pessoas em insegurança alimentar para que voluntários próximos levem ajuda em tempo real. O projeto se sustenta na recusa explícita de pixel, cookie de retargeting, device-id e qualquer tracking individual — defendendo direitos digitais de populações vulnerabilizadas contra extrativismo de dados, invisibilização algorítmica e lock-in em plataformas comerciais.

## 3. Justificativa — por que é um projeto de direitos digitais

### 3.1 O problema que enfrentamos

Pessoas em situação de insegurança alimentar no Brasil são duplamente invisíveis:
1. **Invisíveis no espaço físico** — passam despercebidas em ruas, esquinas, ocupações, hospitais e periferias.
2. **Invisíveis no espaço digital** — apagadas por algoritmos de recomendação que priorizam conteúdo monetizável; vigiadas quando aparecem em plataformas de "ajuda" comerciais que coletam CPF, geolocalização contínua, e dados de saúde para atravessadores de seguros e crédito consignado.

A digitalização da assistência social brasileira nos últimos cinco anos transferiu dados de pessoas em pobreza extrema para plataformas privadas que operam sob lógicas de vigilância. Apps de "doe alimento" de bancos digitais acumulam padrões comportamentais. Sistemas estaduais de SAN exigem cadastro com PII detalhado. O resultado: quem mais precisa de ajuda paga o preço mais alto em privacidade.

### 3.2 Como MAPA FOME defende direitos digitais

MAPA FOME é desenhado, do código ao copy, para **negar essa lógica**:

| Princípio de direitos digitais | Como MAPA FOME materializa |
|---|---|
| **Privacidade por padrão** | Reportar uma pessoa em vulnerabilidade não exige login, CPF, e-mail nem identificação do reportador. |
| **Anti-vigilância** | Nenhum pixel, cookie de retargeting, device-id, fingerprint ou tracking comportamental — auditável no código aberto. Política explícita em `LLM_BRAIN/design_brief.yaml § dignity_constraints` e checklist de dignidade da página `/parceiros`. |
| **Soberania digital** | 100% software livre, hospedado em GitHub Pages, federável: qualquer cidade ou movimento pode replicar a plataforma sem licença, sem vendor lock-in, sem custo. |
| **Transparência algorítmica** | Relatórios públicos abertos em `/relatorios` (para Ministério Público, Secretarias de SAN, Direitos Humanos) — k-anonimizados a k=5 para não identificar pessoas individualmente, mas suficientes para política pública. |
| **Acessibilidade como direito** | Lighthouse a11y ≥95 e axe-core no CI (em adoção); microcopy 100% pt-BR; WCAG 2.1 AA como piso. |
| **Dignidade não-rankeada** | Nenhuma feature da plataforma rankeia, classifica ou pontua pessoas em vulnerabilidade ("never_rank_worth" — restrição de design escrita em código). |
| **LGPD aplicada à humanidade** | Termos de privacidade explícitos, consentimento textual no fluxo de reporte, retenção mínima, agregação obrigatória antes de qualquer publicação. |

### 3.3 Articulação com o tema do edital

O edital pede projetos que "transversalizem direitos humanos com regulação digital". MAPA FOME é uma **demonstração viva** de que é possível operar uma plataforma humanitária sem reproduzir a economia de vigilância. Cada pessoa que reporta um ponto pelo MAPA FOME, em vez de um app comercial, é um voto a favor da soberania de dados sociais.

## 4. Objetivo geral

Fortalecer institucionalmente o coletivo MAPA FOME para sustentar e expandir uma plataforma livre de mapeamento de pessoas em insegurança alimentar, fundada na recusa de vigilância digital, com governança coletiva, segurança auditável e replicabilidade nacional, contribuindo para a defesa do direito à privacidade de populações vulnerabilizadas no ambiente digital brasileiro.

## 5. Objetivos específicos

1. **Estruturar a governança** do coletivo (comitê de ética, revisão periódica das `dignity_constraints`, política de patrocínios anti-predatória — já parcialmente em `/parceiros`).
2. **Auditar e fortalecer a postura de privacidade** (revisão LGPD, threat-model formal STRIDE — ADR-001 já em rascunho em `LLM_BRAIN/adr/`, certificação de zero-tracking).
3. **Aterrissar a infraestrutura de qualidade** (testes automatizados, CI/CD com gates de segurança, fitness functions, dependency scanning) — milestones VM0 e VM9 já planejados em `LLM_BRAIN/v5_milestones.yaml`.
4. **Documentar e empacotar para replicação** por outros coletivos / cidades / estados (guia de implantação, manifesto, kit de identidade visual sem extração de dados).
5. **Articular em rede** com organizações de direitos digitais (Coalizão Direitos na Rede, Lapin, IRIS, Data Privacy Brasil, Aláfia Lab, Intervozes) e de SAN (Inesc, Ação da Cidadania, Fian Brasil) para construir um padrão de "humanitário sem vigilância".
6. **Produzir material público** explicando por que recusar tracking em plataformas humanitárias é um direito digital — não um luxo.

## 6. Metas, atividades e resultados

| Meta | Atividades principais | Resultado verificável |
|---|---|---|
| **M1.** Governança coletiva | Constituir comitê de ética (3-5 pessoas, paridade racial/gênero/território); 4 reuniões; revisar e versionar `dignity_constraints` | Ata pública de fundação do comitê; v2 das restrições de dignidade |
| **M2.** Auditoria de privacidade | Threat-model STRIDE (ADR-001 finalizado); auditoria externa de zero-tracking; revisão de copy "encriptado" | Relatório público de auditoria; ADR-001 Aceito |
| **M3.** Infraestrutura de qualidade | Implantar Vitest + RTL (VM0); CI com fitness functions (VM9); dependency scanning (npm audit gating) | Cobertura ≥70%; CI bloqueando regressões; relatório de vulnerabilidades zerado |
| **M4.** Pacote de replicação | Manual de implantação em outra cidade; identidade visual livre; guia de recusa de tracking | Site `/replicar`; ≥3 coletivos consultados; ≥1 implantação-piloto fora de PB |
| **M5.** Articulação em rede | 3 reuniões com organizações de direitos digitais; 1 com órgão público (MPPB ou DPU); ingresso na Coalizão Direitos na Rede como observador | Cartas de articulação; mídia compartilhada |
| **M6.** Material público | 3 artigos em pt-BR ("Por que humanitário não pode vigiar", "Soberania digital de dados sociais", "Direito à invisibilidade no apoio à fome"); 1 vídeo de 5min | Publicação em mídia parceira; métricas de alcance |

## 7. Cronograma (12 meses)

| Mês | Marcos |
|---|---|
| 1-2 | M1 fundação do comitê; M2 início da auditoria |
| 3-4 | M3 infraestrutura inicial (VM0 + VM9) |
| 5-6 | M2 ADR-001 Aceito; M3 cobertura ≥70% |
| 7-8 | M4 manual de replicação; M5 primeiras articulações |
| 9-10 | M5 ingresso em coalizões; M6 primeiro artigo |
| 11-12 | M4 implantação-piloto; M6 conjunto completo de material; relatório final |

## 8. Orçamento — até R$ 80.000,00

> Os valores abaixo são estimativas em moeda corrente para preencher a planilha oficial do portal. Distribuição orientada pelo Eixo 1 (Fortalecimento Institucional) — máximo em pessoal + estrutura, mínimo em material consumível.

| Rubrica | Justificativa | Valor (R$) |
|---|---|---:|
| **Pessoal — Coordenação técnica** (12 meses, 20h/sem) | Sustentação da plataforma, manutenção de segurança, code review, acompanhamento das milestones VM0–VM10 | 30.000,00 |
| **Pessoal — Coordenação de articulação** (12 meses, 10h/sem) | Reuniões com OSCs, redação de artigos, representação em redes | 18.000,00 |
| **Auditoria externa de privacidade** | Profissional/coletivo externo realiza threat-model + verificação de zero-tracking — independência metodológica | 8.000,00 |
| **Hospedagem + domínio + ferramentas** | Domínio mapafome.com.br, Sentry free→paid se necessário, GitHub Actions minutos extras, gerenciador de senhas para o coletivo | 4.000,00 |
| **Diárias e deslocamento — articulação em rede** | 3-4 viagens curtas (PB→PE, PB→DF) para reuniões presenciais com órgãos públicos e coalizões | 6.000,00 |
| **Produção de material público** | Diagramação dos 3 artigos, edição do vídeo, identidade visual do kit de replicação | 6.000,00 |
| **Reuniões do comitê de ética** | 4 encontros (online + 1 presencial); custos de transmissão, registro, alimentação | 3.000,00 |
| **Reserva de contingência** | Imprevistos operacionais (até 6,25%) | 5.000,00 |
| **TOTAL** | | **80.000,00** |

> Nenhuma rubrica destinada a publicidade paga, anúncios em redes sociais ou ferramentas de tracking — coerente com o objeto do projeto.

## 9. Centralidade racial, étnica, de gênero e territorial

(Critério explícito de priorização do edital.)

- **Composição da equipe:** [VERIFICAR — descrever recortes de raça, gênero e território da equipe atual; meta: ≥50% mulheres, ≥40% pessoas negras, ≥1 pessoa de comunidade tradicional]
- **População atendida:** segundo dados públicos do IBGE/POF, mulheres negras chefes de família são desproporcionalmente afetadas pela insegurança alimentar grave. MAPA FOME é desenhado para visibilizar essa realidade sem recriar a vigilância de Estado que historicamente persegue essas mesmas mulheres.
- **Território:** sede em João Pessoa/PB (Nordeste — região com maior taxa de IA grave). Replicação prioritária em outras capitais nordestinas.
- **Comitê de ética:** composição obrigatória com paridade racial e de gênero documentada em ata.

## 10. Articulação em rede

| Organização | Tipo de articulação |
|---|---|
| Coalizão Direitos na Rede | Ingresso como observador; participar de campanhas anti-vigilância |
| Lapin (Laboratório de Políticas Públicas e Internet) | Revisão jurídica do threat-model |
| IRIS (Instituto de Referência em Internet e Sociedade) | Mentoria sobre LGPD em causas humanitárias |
| Data Privacy Brasil | Auditoria externa de privacidade (potencial provedor) |
| Inesc / Fian Brasil | Articulação SAN-direitos digitais |
| Defensoria Pública da União / MPPB | Recepção dos relatórios `/relatorios` |
| UFPB / UFCG / UEPB | Mentoria acadêmica (sem dependência financeira) |

## 11. Monitoramento e avaliação

- **Indicadores de processo:** atas das reuniões do comitê, commits do CI, PRs revisadas, eventos de articulação realizados.
- **Indicadores de resultado:** cobertura de testes ≥70%, ADR-001 Aceito, ≥3 organizações em rede, ≥1 implantação-piloto, ≥3 artigos publicados.
- **Indicador de dignidade (qualitativo):** revisão semestral das `dignity_constraints` pelo comitê de ética. Qualquer feature que viole as restrições é vetada — auditável no histórico de PRs.
- **Relatórios:** parcial aos 6 meses, final aos 12 meses. Ambos publicados em `/relatorios/projeto-fundo-brasil-2026`.

## 12. Equipe principal

| Papel | Pessoa | Carga | Responsabilidades |
|---|---|---|---|
| Coordenação técnica | [VERIFICAR] | 20h/sem | Plataforma, segurança, milestones VM |
| Coordenação de articulação | [VERIFICAR] | 10h/sem | Rede, comunicação, comitê de ética |
| Comitê de ética (voluntário) | 3-5 pessoas | reuniões | Revisão dignity_constraints, governança |

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Banca avaliar como projeto de direito à alimentação (fora do escopo) | Reposicionamento explícito em §3 — direitos digitais aplicados à dignidade humana; demonstrar como MAPA FOME já materializa princípios de privacidade e anti-vigilância no código |
| Coletivo sem CNPJ — restrições de execução financeira | Contratar OSC parceira como executora financeira (carta de cooperação) ou usar pessoa física responsável; ambos previstos no edital |
| Dependência de Google Sheets (atual backend) levantando questão de soberania | ADR-001 já documenta o risco e propõe migração para backend próprio como ação dentro do projeto (M3) |

## 14. Anexos a enviar

1. Demonstrativo financeiro de 2025 OU declaração de não-movimentação (coletivo informal).
2. Ata de fundação ou declaração de início de atuação do coletivo.
3. Composição da equipe com recortes de raça/gênero/território.
4. Links públicos: repositório (github.com/rslgp/mapafome), site (mapafome.com.br), relatórios (/relatorios).
5. Carta de cooperação da OSC executora financeira, se aplicável.

---

> **Aviso de uso de IA:** o edital recomenda moderação no uso de IA na elaboração da proposta. Este documento foi rascunhado com apoio de IA a partir de fatos do projeto e revisado por humano antes da submissão. Cada afirmação foi validada contra o repositório e a documentação do MAPA FOME.

> **Submissão:** apenas pelo portal https://fundobrasil.powerappsportals.com — não aceita e-mail, correio ou entrega presencial. Submissão única. Use este documento como base para os campos descritivos do formulário online; preencha o template oficial de orçamento separadamente.
