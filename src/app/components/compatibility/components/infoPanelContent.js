// infoPanelContent.js — static content data for the InfoPanel, extracted from
// InfoPanel.js (SRP: presentation vs content). The color-legend rows, the
// acknowledgements list, and the hunger-timeline table rows. Render-agnostic
// DATA — but ACKNOWLEDGEMENTS embeds JSX (a fragment with <a> links), so this
// module imports React and stays a .js with JSX; it is data-shaped, not strictly
// serializable. The legend icon refs (coffeeBean/hub/green/red) move here with
// LEGEND. Internal to the component folder — InfoPanel imports these by name; no
// barrel needed (InfoPanel's own default export is unchanged).

import React from 'react';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';

/* Legend layout (per design_brief.yaml § visual_system.markers + Foundation 4):
 *   ──── A ────   yellow  (full row — primary user case: pessoas em vulnerabilidade)
 *   ──── A ────   blue    (full row — iniciativas que distribuem)
 *   ── B ── B ──  red | green (side by side — formas de prover alimento)
 * Each chip pairs color with icon + dark text — color is never the sole signal.
 */
export const LEGEND = [
  {
    key: 'yellow',
    chipClass: 'yellowHub',
    icon: coffeeBean,
    label: 'Em amarelo',
    desc: 'Pessoas em vulnerabilidade social e insegurança alimentar que estão com fome em casa ou na rua e precisam de alimento.',
    span: 'wide',
  },
  {
    key: 'blue',
    chipClass: 'blueHub',
    icon: hub,
    label: 'Em azul',
    desc: 'Pessoas ou iniciativas que recebem alimentos ou recursos para distribuir na comunidade (sopão solidário, ONGs, voluntários) e precisam de doações.',
    span: 'wide',
  },
  {
    key: 'red',
    chipClass: 'redHub',
    icon: red,
    label: 'Em vermelho',
    desc: 'Pessoas ou grupos que entregam refeição em ponto fixo na rua em certo dia da semana, como ponto de entrega de alimento pronto.',
    span: 'half',
  },
  {
    key: 'green',
    chipClass: 'greenHub',
    icon: green,
    label: 'Em verde',
    desc: 'Pessoas que trabalham com alimentos e precisam destinar o que não foi comercializado (restaurante, hotel, feira, supermercado) e precisam de voluntários para buscar.',
    span: 'half',
  },
];

export const ACKNOWLEDGEMENTS = [
  'Em agradecimento à formação humana, moral e ética que recebi dos meus professores de Filosofia e Sociologia do ensino médio.',
  <>Por terem passado o premiado documentário curta de 13 minutos do brasileiro Jorge Furtado, <a target="_blank" rel="noreferrer" href="https://www.youtube.com/watch?v=h30BO_6kFNM">Ilha das Flores</a>. <a target="_blank" rel="noreferrer" href="https://drive.google.com/file/d/1YmaBTFgVV67k44l5EyxjEXSNTVb5ATjS/view?usp=drive_link">backup</a></>,
  'Após 10 anos de ter assistido, aprendido e internalizado o nosso papel como sociedade, tive a oportunidade de agir usando conhecimento e tecnologias acumulados.',
  'E a base para criação de projetos (pesquisa de campo e Project Manager) obtida na disciplina de Projetão CIn UFPE.',
  'Resultou em obter as ferramentas necessárias para agir em favor das pessoas que passam fome.',
  'E dar visibilidade, contribuindo junto com as pessoas de bom coração que rotineiramente alimentam quem não tem dinheiro para comprar comida.',
  'E contribuir com os comerciantes de alimentos a reduzirem o desperdício.',
  'E motivar e ofertar ferramentas para cada ser humano fazer sua parte e colaborar de forma recorrente.',
  'Ou, se não com o alimento, com o compartilhamento de informação, informando da existência do MAPA FOME a quem precisa e a quem pode ajudar.',
  'Sem comida, qualquer ser humano morre prematuramente. Deixar de prestar assistência, quando possível fazê-lo sem risco pessoal, configura crime de Omissão de Socorro (Art. 135 do Código Penal Brasileiro).',
];

export const HUNGER_TIMELINE = [
  { time: '0–3 horas',   conseq: 'Mudança mínima.',                                                                                              risk: 'nenhum' },
  { time: '4–8 horas',   conseq: 'Mais fome, dor leve na barriga, possível dor de cabeça.',                                                       risk: 'nenhum' },
  { time: '9–12 horas',  conseq: 'Cansaço, irritação, estresse e dor de cabeça.',                                                                 risk: 'baixo' },
  { time: '13–16 horas', conseq: 'Dificuldade para prestar atenção e se concentrar.',                                                             risk: 'moderado' },
  { time: '17–24 horas', conseq: 'Falta de açúcar no corpo: tontura ou tremedeira.',                                                              risk: 'moderado' },
  { time: '25–48 horas', conseq: 'Fraqueza e modo de sobrevivência: o coração bate mais rápido por falta de energia.',                            risk: 'alto' },
  { time: '49–72 horas', conseq: 'O corpo passa a usar gordura armazenada; o sistema imunológico enfraquece.',                                    risk: 'alto' },
  { time: '3–7 dias',    conseq: 'Os músculos passam a ser consumidos como energia. Diminuição de motivação e produtividade.',                    risk: 'alto' },
  { time: '8–14 dias',   conseq: 'Os órgãos começam a sofrer e a pessoa adoece com muito mais facilidade.',                                       risk: 'muito alto' },
  { time: '15–21 dias',  conseq: 'A vida está em perigo.',                                                                                        risk: 'extremo' },
  { time: '22+ dias',    conseq: 'Perigo extremo: os órgãos podem parar de funcionar a qualquer momento.',                                         risk: 'extremo' },
];
