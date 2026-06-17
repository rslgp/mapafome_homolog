# MAPA FOME: Source of Truth (SOT)

Arquivo unico de verdade sobre o MAPA FOME, consolidado para uso de pitches, comunicados,
folhas de divulgacao e pronunciamentos. Toda afirmacao carrega um selo epistemico:

- **[Verified]** = vem de documento do proprio projeto (press_kit, FACTS_PACK, materias com fonte, folhas RI).
- **[Inference]** = deducao razoavel a partir de fatos verificados.
- **[Unverified]** = dado de terceiro a confirmar na fonte primaria antes de citar como fato (ex.: numeros macro, tetos de lei, ano exato).

Convencoes do autor: SEM travessao (em-dash). Datas em formato absoluto. NAO arredondar custos declarados do fundador.

Fontes consolidadas (todas em disco do projeto):
`new_info/Kit de imprensa — MAPA FOME.pdf` (kit de imprensa OFICIAL do site, 9 paginas, ultima atualizacao junho de 2026; FONTE MAIS RECENTE E AUTORITATIVA para identidade/ficha tecnica),
`new_info/_FACTS_PACK.md`, `new_info/press_kit.txt` (versao texto ANTERIOR do kit; onde divergir do PDF oficial, o PDF vence),
`new_info/unifor_1.txt` (Vinicius Soares, 14 de maio de 2026),
`new_info/cin_ultima_noticia.txt` (CIn/UFPE, 20 de maio de 2026), `new_info/Noticias Mapa Fome clipping.txt`,
`new_info/mapafome_pitch.pdf` (Pitch Institucional, ~42 slides, maio 2026, feito para a Primeira-Dama do Ceara Lia de Freitas),
`new_info/Communication Plan - MapaFome1.pdf` (UNIFOR/CCG), `mapafome-arinter-A4.html`, `mapafome-ri-folhas/*`.

Ultima consolidacao: 15 de junho de 2026 (incorporado o Kit de imprensa PDF oficial).

> CORRECAO IMPORTANTE (Kit PDF oficial vence o press_kit.txt antigo):
> - ORIGEM = RECIFE (nao Paraiba). O kit oficial diz "nascido em Recife, com origem em 2022 durante a graduacao no CIn/UFPE". O press_kit.txt antigo citava "Paraiba (Joao Pessoa e Campina Grande)"; tratar como DESATUALIZADO.
> - Fundador FORMADO EM 2025 (nao 2022); hoje engenheiro de software, especializado em inovacao, MVP e User Requirements.
> - Enchentes do RS: o kit oficial fixa o intervalo "2023-2024".
> - Contato de imprensa OFICIAL: dev.rafaelleao+mapafome_imprensa@gmail.com.

---

## 1. IDENTIDADE

- **Nome:** MAPA FOME. Site: **mapafome.com.br**. [Verified]
- **Slogan:** "Um mapa colaborativo. Aberto. Em tempo real." [Verified]
- **Sub-tagline:** "Nao substitui ninguem. Conecta todo mundo." [Verified]
- **Mote do pitch:** "tirar o povo do mapa da fome." [Verified, pitch]
- **Analogia central:** "Waze da solidariedade" / "Waze solidario". [Verified]
- **Enquadramento de marca:** tecnologia civica e solidariedade entre vizinhos, NAO caridade nem pena. [Verified, kit oficial]
- **E-mail de imprensa:** dev.rafaelleao+mapafome_imprensa@gmail.com. [Verified, kit PDF oficial] (o press_kit.txt antigo trazia contato@mapafome.com.br; usar o do kit oficial)

## 2. O QUE E (descricao em camadas, copiar-e-colar)

- **Uma frase (~160 car.):** "O MAPA FOME e um mapa colaborativo, gratuito e anonimo onde qualquer pessoa, em tres toques, sinaliza alguem com fome para voluntarios ajudarem em tempo real." [Verified, press_kit]
- **Medio:** plataforma publica, gratuita e anonima que conecta quem quer ajudar a quem precisa de comida agora. Em tres toques, qualquer cidadao mapeia uma pessoa em inseguranca alimentar e voluntarios proximos recebem o aviso para levar ajuda em tempo real. Nao rastreia ninguem: mede so numeros agregados por territorio e tempo. [Verified, press_kit]
- **O que NAO e:** nao e caridade de cima para baixo, nao e vigilancia, nao substitui politica publica nem ONG. [Verified, press_kit]

## 3. ORIGEM E TRAJETORIA

- **Criador:** Rafael Leao, criador do MAPA FOME, recifense, 31 anos (em 2026). Cursou Ciencia da Computacao no CIn/UFPE, FORMADO EM 2025; hoje engenheiro de software, especializado em inovacao, MVP e User Requirements. [Verified, kit PDF oficial] (o ano de formatura 2025 corrige leituras anteriores que sugeriam 2022)
- **Nascimento do projeto:** ideia conceituada aos 17 anos, inspirada no documentario "Ilha das Flores" (Jorge Furtado, 1989), em aula com o prof. Eugenio Pacelli. Projeto com ORIGEM EM 2022 durante a graduacao no CIn/UFPE; MVP pronto em fevereiro de 2022, em plena pandemia. [Verified]
- **Apoio academico:** profs. Paulo Borba e Sergio Soares (CIn/UFPE); base metodologica na disciplina Projetao. [Verified, cin]
- **Origem geografica:** NASCIDO EM RECIFE, Brasil, com origem em 2022 durante a graduacao no CIn/UFPE; em expansao por todo o pais, com planos de expansao internacional. [Verified, kit PDF oficial] (CORRIGE o press_kit.txt antigo, que citava Paraiba/Joao Pessoa/Campina Grande; tratar a versao Paraiba como DESATUALIZADA)
- **4 anos de operacao continua** (2022 a 2026). NAO e vaporware: infraestrutura operando. [Verified]

## 4. COMO FUNCIONA (fluxo e marcacoes)

- Marcacoes por COR, espelhadas no Waze: [Verified, unifor_1]
  - **AMARELO:** quem esta (ou conhece alguem) precisando de comida (ponto de necessidade).
  - **AZUL:** doadores independentes ou orgaos que recebem recursos para distribuicao.
  - **VERMELHO:** quem cozinha e entrega refeicoes em ponto fixo (quentinhas, sopao).
- **Happy path:** abrir o mapa, marcar/encontrar um ponto, voluntario proximo enxerga em tempo real, leva ajuda. [Verified]
- **Capacidade declarada:** ate 4 milhoes de marcacoes. [Verified, unifor_1]

## 5. ARQUITETURA E PRIVACIDADE

- **Stack:** app web estatico em Next.js (`output: 'export'`), React, Material-UI (MUI), LeafletJS (mapa). Dados em Google Sheets (planilhas abertas) com curadoria comunitaria. Hospedagem em GitHub Pages. Repositorio aberto: github.com/rslgp/mapafome_homolog (contribuicao por PR). [Verified]
- **Privacidade por design (LGPD-forte):** SEM rastreamento individual, sem pixel, sem device id, sem cookie de retargeting. Metricas SOMENTE agregadas por territorio x tempo. Pontos nao identificam rosto nem nome. [Verified, press_kit]
- **Relatorios abertos:** mapafome.com.br/relatorios, exportavel em CSV e JSON. [Verified]
- **Principio inegociavel:** "ajudamos pessoas, nao vigiamos pessoas" / "a gente mapeia a fome para encurta-la, nunca para vigiar quem a sente." [Verified, press_kit]

## 6. FRENTE INTERNACIONAL

- Seletor de pais + seletor de idioma. Interface em SETE idiomas: portugues, espanhol, ingles, alemao, frances, russo e chines simplificado. [Verified, mapafome-arinter-A4.html + RI folhas]
- Torna o MAPA FOME utilizavel POR e PARA estrangeiros que vivem no Brasil: estudantes de intercambio, pesquisadores visitantes, refugiados e migrantes, cada um na propria lingua. [Verified, folhas RI]
- Meta declarada: estender o acesso a outros paises para cumprir o ODS 2. [Verified, unifor_1]

## 7. TRACAO E EVIDENCIA DE IMPACTO

- **2022:** lancamento (MVP fev) + cobertura nacional na TV GLOBO (Jornal Hoje) no mesmo ano, em plena pandemia. Tambem G1, UOL Ecoa, JC, Agencia Brasil/EBC, COEP. [Verified, clipping]
  - Materia G1 (10/02/2022): "Site criado por estudante da UFPE aproxima pessoas que estao passando fome e doadores de comida."
  - Jornal Hoje / Globoplay: globoplay.globo.com/v/10350537.
- **Enchentes do Rio Grande do Sul (2023-2024):** plataforma acionada por moradores/voluntarios como canal emergencial; incluiu grupos nao oficiais. O kit PDF oficial fixa o intervalo "2023-2024"; usar o intervalo, nao um ano unico. [Verified, kit PDF oficial]
- **Lista "Na midia" do kit oficial (cada item com selo de verificado no kit):** [Verified, kit PDF oficial]
  - TV Globo, Jornal Hoje (2022): reportagem em rede nacional logo apos o lancamento, em plena pandemia; a repercussao fez a base de usuarios crescer em massa.
  - Enchentes do RS (2023-2024): canal de uso emergencial validado.
  - CIn/UFPE (20 de maio de 2026): nota institucional sobre os 4 anos de operacao e a abertura da frente de captacao.
  - UNIFOR (14 de maio de 2026): materia no Ceara sobre articulacao no Estado e visita a Assembleia Legislativa, no contexto da expansao para o Nordeste.
- **2024-2025:** operacao continua, auditavel publicamente no Open Collective. [Verified]
- **2026:** apoio UNIFOR + articulacao politica no Ceara; novas materias (UFPE, Globo, UNIFOR); plataforma renovada; influenciadores (Ediel Costa, Lilla Ferraz). [Verified, clipping]
- **Metrica viva:** pontos e atendimentos mudam o tempo todo; dado mais recente em mapafome.com.br/relatorios. [Verified]

## 8. PUBLICO-ALVO (4 elos da mesma cadeia) e PERSONAS

Quatro elos: [Verified, pitch]
1. Pessoas em inseguranca alimentar (cotidiano ou catastrofe).
2. Voluntarios que cozinham e entregam (ganham visibilidade publica no mapa, os "anjos").
3. Doadores e grupos nao oficiais (pessoas fisicas, igrejas, ONGs, coletivos, redes informais).
4. Empresas do setor alimenticio (producao fora do padrao de prateleira, precisam de canal para escoar).

Personas do pitch (Lia de Freitas): [Verified, pitch]
- **MARIA:** ficou desabrigada nas chuvas, perdeu tudo, NAO se encaixa nos criterios do auxilio formal; uma vizinha lhe fala do mapa publico.
- **JOAO:** soube dos desabrigados, quer ajudar mas nao sabe quem/onde; abre o MAPA FOME e ve a Maria em tempo real e vai ate ela. "Nao substitui o Estado, complementa o que falta."

## 9. POSICIONAMENTO ("Nao competimos, complementamos") [Verified, pitch]

| Eixo | Bolsa Familia | ONGs individuais | Doacao direta | MAPA FOME |
|---|---|---|---|---|
| Fora do cadastro | Nao | Sim | Limitada | **Sim** |
| Tempo real | Mensal | Variavel | Sim | **Sim** |
| Transparencia | Alta | Variavel | Nao | **Alta** |
| Rede escalavel | Nao | Nao | Nao | **Sim** |

Lacuna que so o MAPA FOME cobre: a **REDE institucional escalavel**.

## 10. NUMEROS DE CONTEXTO (TODOS [Unverified] como dado de terceiro; confirmar fonte primaria antes de citar)

- 33 milhoes de brasileiros em inseguranca alimentar grave (pos-pandemia, momentos mais agudos). [Unverified]
- 46 milhoes de toneladas de comida desperdicadas por ano; R$ 60 bilhoes em perda. [Unverified]
- Ceara: 300 mil familias; piloto proposto: 5 municipios, 50 mil familias. [Unverified]
- Programa Ceara Sem Fome: 44.908 familias pelo cartao; 1.300+ cozinhas solidarias; 184 municipios; 300 mil+ pessoas. [Unverified]
- ODS 2 (Fome Zero, ONU) como enquadramento de meta global. [Verified como enquadramento]

## 11. MODELO E SUSTENTABILIDADE

- Filantropico, sem fins lucrativos, sem cobrar do usuario final. Operacao com recursos proprios + Open Collective auditavel. [Verified]
- Tres fontes disciplinadas para escalar: (1) EMPRESAS via deducao fiscal (Lei do Bem / Lei 15.224/2025); (2) ESTADO via orcamento de infraestrutura (totens em CRAS e Caixa Economica); (3) FUNDACOES via grants de impacto (mandato Fome Zero: FAO, ONU, locais). [Verified, pitch]
- **Canais de doacao JA ATIVOS:** PIX chave rslgp@cin.ufpe.br (operador Rafael Leao); Open Collective opencollective.com/mapafome (auditavel); assinatura recorrente em mapafome.com.br/assinar. [Verified]

## 12. LEI 15.224/2025 (lever legal de captacao corporativa) [Unverified quanto a numero/artigo exato; confirmar texto oficial]

- Fonte: Communication Plan UNIFOR. Lei federal que (segundo o plano) da SEGURANCA JURIDICA a empresa que doa alimentos e BENEFICIOS FISCAIS. [Unverified]
- Selo "Doador de Alimentos"; Lucro Real pode abater custo dos alimentos doados ate 2% do lucro operacional. [Unverified]
- Gancho mais forte para captacao corporativa ESG do MAPA FOME. [Inference]

## 13. ESTRATEGIA DE ADOCAO ("A entrada e institucional. A adocao e em massa.") [Verified, pitch]

- VIA ESTADO: 184 CRAS nos municipios cearenses; Caixa Economica + familias do Bolsa Familia; TOTENS para quem nao tem celular/internet.
- VIA EMPRESAS: cabecas de cadeia (ex. M. Dias Branco) multiplicam alcance.
- VIA REDES EXISTENTES: igrejas, ONGs, voluntarios; cobertura Globo gerou ondas espontaneas; catastrofe do Sul validou o canal emergencial.

## 14. PEDIDO DO PITCH AO ESTADO (Lia de Freitas / Comite Ceara Sem Fome) [Verified, pitch]

Reuniao de 30 min com a Primeira-Dama (presencial em Fortaleza ou videochamada):
1. Demonstracao ao vivo da plataforma.
2. Piloto regional de totens em CRAS e Caixa Economica, em municipios definidos pelo Comite.
3. Carta de ENDOSSO institucional do Comite (fortalece articulacao com a SPS e a Rede de Cozinhas Solidarias).

Milestones do pitch: 6m piloto 5 CRAS / 12m 184 municipios CE / 18m segundo estado nordestino / 24m referencia nacional.
Escala: Ceara -> 5 estados do NE (70 milhoes) -> America Latina (200 milhoes+). [Unverified quanto aos numeros de alcance]

## 15. TIME E REDE [Verified, pitch + cin]

- **Fundador:** Rafael Leao, operacao SOLO ha 4 anos, recursos proprios. Telefone: +55 (81) 98161-8742. E-mail: rslgp@cin.ufpe.br. LinkedIn: linkedin.com/in/rafaelleao.
- **Apoiadores nomeados no pitch:** Teo Freitas (imprensa); Ricardo Colares (TEC-UNIFOR); Alex Peixoto (articulacao politica CE); Deputado Guilherme Landim (interlocucao parlamentar). Profs. Paulo Borba e Sergio Soares (CIn).
- **Frente de captacao aberta a:** poder publico (parlamentares, gestores, secretarias de seg. alimentar); ensino/pesquisa; OSCs (igrejas, ONGs, OSCIPs, coletivos); empresas ESG; pessoas fisicas (doacao, divulgacao, voluntariado em codigo).

## 16. CUSTOS DECLARADOS DO FUNDADOR (NAO ARREDONDAR) [Verified]

- R$ 550/mes infraestrutura (recorrente).
- R$ 1.200/mes saude do fundador, neurodivergente (recorrente).
- R$ 13.000 uma vez para computador novo (maquina atual de 9 anos a 100% de CPU). Reservas esgotadas por problema de saude.

## 17. STATUS JURIDICO [Verified com nota]

- Sem CNPJ formal declarado. HA PIX institucional (rslgp@cin.ufpe.br) e Open Collective ativos.
- Caminhos de formalizacao: (a) MEI; (b) parceira fiscal / endosso de comite institucional.
- Logo: decisao de formalizacao priorizada, NAO um bloqueador de fundacao.

## 18. FRASES CITAVEIS (press_kit) [Verified]

- "Nao substitui ninguem. Conecta todo mundo."
- "Um mapa colaborativo. Aberto. Em tempo real."
- "Em tres toques, a distancia entre quem precisa e quem ajuda vira metros."
- "A gente mapeia a fome para encurta-la, nunca para vigiar quem a sente."
- "Dignidade nao se rastreia: nenhum pixel, nenhum cookie, nenhum device id."
- "Combater a fome nao e caridade de cima para baixo, e vizinho conectando vizinho."

## 19. REGRAS DE COMUNICACAO (inegociaveis, de marca) [Verified, press_kit]

1. Dignidade primeiro: cidadaos conectando cidadaos, NAO vitimas nem casos de caridade.
2. NAO explorar a dor: nada de imagens de sofrimento para comover. Solidariedade nao precisa de espetaculo.
3. NAO sugerir parceria, patrocinio ou endosso que nao exista.
4. SEM travessao (em-dash) no texto, por convencao do autor.
5. Cores: texto Tinta #1A1A1A sobre Creme #FAFAF7; vermelho da marca #D64545 (texto pequeno em #B93838); ciano #00CFFF SO no icone/decoracao, nunca em texto.

## 20. MISSAO HUMANITARIA E EXPANSAO INTERNACIONAL (base para o ranking de paises)

Tres frentes de necessidade que o MAPA FOME atende, alem da inseguranca alimentar do cotidiano. Sao a base de criterio para priorizar para QUAIS paises a plataforma expande:

1. **Catastrofes naturais e desabrigados.** Lugares onde ocorrem desastres naturais (enchentes, terremotos, tempestades, secas) e pessoas perdem suas casas. O canal emergencial JA foi validado nas Enchentes do Rio Grande do Sul (2023-2024), acionado por moradores e voluntarios, incluindo grupos nao oficiais. [Verified, kit PDF oficial] (ver Secao 7) A persona MARIA do pitch e exatamente esse caso: desabrigada nas chuvas, perdeu tudo, fora dos criterios do auxilio formal. [Verified, pitch]
2. **Refugiados e migrantes.** A frente internacional ja existe POR e PARA estrangeiros (refugiados e migrantes inclusos), cada um na propria lingua. [Verified, folhas RI] (ver Secao 6) A expansao para paises que hospedam grandes populacoes de refugiados estende esse mesmo principio para fora do Brasil.
3. **Quem nao pode pagar pela comida.** O nucleo da plataforma: pessoas em inseguranca alimentar que nao conseguem arcar com o proprio alimento, no cotidiano ou na catastrofe. [Verified, pitch] (Secao 8, elo 1)

**Enquadramento de meta:** estender o acesso a outros paises para cumprir o ODS 2 (Fome Zero, ONU). [Verified, unifor_1] Escala declarada no pitch: Ceara -> 5 estados do NE -> America Latina (200 milhoes+). [Unverified quanto aos numeros de alcance] (Secao 14)

### Criterios de priorizacao do ranking (metodologia)

Cada pais e pontuado por cinco eixos. Os quatro primeiros sao SINAIS DE NECESSIDADE (alinhados as tres frentes acima); o quinto e um SINAL DE CAPACIDADE (custo de servir). Pesos sao [Inference] do autor, ajustaveis.

- **A. Idioma ja suportado (capacidade, peso ALTO).** A interface ja existe em SETE idiomas: portugues, espanhol, ingles, alemao, frances, russo, chines simplificado. [Verified, Secao 6] Um pais cujo idioma principal JA esta na UI e servivel a custo zero de traducao; um pais fora dos sete exige uma nova locale (o agente de i18n cobre 1:1, mas e trabalho e revisao humana de copia sensivel). Este e o maior multiplicador pratico.
- **B. Exposicao a catastrofes naturais e desabrigados (necessidade).** Frequencia/severidade de enchentes, terremotos, tempestades, secas que tiram pessoas de casa. [Unverified, dado de terceiro]
- **C. Carga de refugiados e migrantes hospedados (necessidade).** Tamanho da populacao refugiada/deslocada que o pais acolhe. [Unverified, dado de terceiro]
- **D. Inseguranca alimentar (necessidade).** Parcela da populacao que nao consegue pagar por alimentacao adequada. [Unverified, dado de terceiro]
- **E. Ponte operacional / diaspora (capacidade).** Laco lusofono (lista de auto-deteccao do app: br, pt, ao, mz, cv, gw, st, tl, gq -> portugues) [Verified, engine] ou vinculo migratorio com o Brasil que permite comeco morno (warm-start) com voluntarios e curadoria ja existentes. [Inference]

REGRA DE HONESTIDADE: todos os numeros macro de B/C/D sao [Unverified] como dado de terceiro e devem ser confirmados em fonte primaria (ACNUR/UNHCR, FAO SOFI, EM-DAT/IDMC) antes de citar como fato. O ranking em si e [Inference]. A tabela priorizada vive no repo do produto em `mapafome_nextjs/mapafome_homolog/INTERNATIONAL_EXPANSION.md`.
