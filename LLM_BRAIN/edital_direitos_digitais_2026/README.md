# Edital Fundo Brasil — Direitos Digitais 2026

Pasta de submissão para o **Edital Direitos Digitais 2026 do Fundo Brasil de Direitos Humanos**.

- **Site oficial:** https://www.fundobrasil.org.br/edital/direitos-digitais-2026/
- **Portal de submissão:** https://fundobrasil.powerappsportals.com
- **Abertura:** 06 abr 2026
- **Fechamento:** 19 mai 2026 (18h Brasília)
- **Divulgação de resultados:** a partir de 03 ago 2026
- **Execução máxima:** 12 meses

## Eixo escolhido

**Eixo 1 — Fortalecimento Institucional** (até **R$ 80 mil**, até 15 organizações).
Não Eixo 2 (Incidência/Litigância) porque MAPA FOME não é frente de litigância paradigmática.

## Sobre o fit (transparência interna)

O edital é sobre **direitos digitais**, não sobre **direito à alimentação**. MAPA FOME é primariamente uma ferramenta humanitária. A proposta se encaixa **se e somente se** reposicionada como projeto de direitos digitais aplicados à dignidade de pessoas em insegurança alimentar — defendendo:

1. Privacidade de pessoas vulneráveis (zero tracking, zero pixel, zero device-id)
2. Soberania digital (open-source, federável, sem lock-in em big techs)
3. Acessibilidade digital (WCAG, axe-core no CI — quando VM9 aterrissar)
4. Transparência algorítmica (relatórios públicos abertos para MP/SAN/DH)
5. Anti-vigilância de populações vulnerabilizadas

Esse framing é defensável e está parcialmente codificado em `LLM_BRAIN/design_brief.yaml` § dignity_constraints e na recusa explícita de tracking em `src/app/parceiros/page.js` (checklist de dignidade).

Caso a banca do edital entenda que MAPA FOME é primariamente "direito à alimentação", a proposta será reprovada por **escopo**, não por mérito. Risco aceito; vale tentar.

## Arquivos

- `proposta.md` — Plano de Trabalho conforme critérios do edital, em pt-BR.
- `proposta.html` — Versão Word-openable (mesma estrutura) para colar no formulário do portal ou imprimir/exportar como PDF para upload.
- Pendente: `orcamento.xlsx` — planilha orçamentária (o portal exige formato específico; gere após download do template oficial).

## Como usar

1. Baixe o **formulário editável** e o **template de orçamento** no portal.
2. Use `proposta.md` como base de texto para os campos descritivos do formulário online.
3. Preencha o template oficial de orçamento usando os valores da seção **Orçamento** abaixo.
4. Anexe o demonstrativo financeiro de 2025 (ou declaração de sem movimentação se aplicável).
5. Submeta **uma única vez** pelo portal — não há salvamento parcial.

## Documentação obrigatória (checklist)

- [ ] Formulário completo no portal (texto adaptado de `proposta.md`)
- [ ] Planilha orçamentária no template oficial
- [ ] Demonstrativo financeiro de 2025 OU declaração de sem movimentação (em caso de coletivo não formalizado)
- [ ] Declaração de composição da equipe (raça/gênero/território — critério prioritário)
- [ ] Comprovação de atuação em direitos digitais OU direitos humanos (links, prints, repositório, relatórios públicos do MAPA FOME)

## Avisos de revisão

- O texto da proposta foi gerado com apoio de IA e revisado a partir de fatos do projeto. **Reler antes de submeter.** O edital recomenda explicitamente moderação no uso de IA: "ferramentas podem apoiar revisão textual, mas a proposta deve refletir experiência concreta da organização" — então valide cada afirmação.
- Dados institucionais (nome do coletivo proponente, e-mail de contato, ano de fundação, composição da equipe) estão como `[VERIFICAR]` no `proposta.md`. Preencha antes de submeter.
- Se houver organização parceira formalizada (com CNPJ) que possa figurar como proponente principal, considere essa opção — facilita o demonstrativo financeiro.
