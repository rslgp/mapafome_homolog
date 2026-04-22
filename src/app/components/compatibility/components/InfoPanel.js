import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Sugestao from './googlesheets/sugestao';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';
import ImagemInstagram from './home/ImagemInstagram';
import './InfoPanel.css';

/* Legend layout (per design_brief.yaml § visual_system.markers + Foundation 4):
 *   ──── A ────   yellow  (full row — primary user case: pessoas em vulnerabilidade)
 *   ──── A ────   blue    (full row — iniciativas que distribuem)
 *   ── B ── B ──  red | green (side by side — formas de prover alimento)
 * Each chip pairs color with icon + dark text — color is never the sole signal.
 */
const LEGEND = [
  {
    key: 'yellow',
    chipClass: 'yellowHub',
    icon: coffeeBean,
    label: 'Em amarelo',
    desc: 'Pessoas em vulnerabilidade social e insegurança alimentar que estão com fome em casa ou na rua — precisam de alimento.',
    span: 'wide',
  },
  {
    key: 'blue',
    chipClass: 'blueHub',
    icon: hub,
    label: 'Em azul',
    desc: 'Pessoas ou iniciativas que recebem alimentos ou recursos para distribuir na comunidade (sopão solidário, ONGs, voluntários) — precisam de doações.',
    span: 'wide',
  },
  {
    key: 'red',
    chipClass: 'redHub',
    icon: red,
    label: 'Em vermelho',
    desc: 'Pessoas ou grupos que entregam refeição em ponto fixo na rua em certo dia da semana — ponto de entrega de alimento pronto.',
    span: 'half',
  },
  {
    key: 'green',
    chipClass: 'greenHub',
    icon: green,
    label: 'Em verde',
    desc: 'Pessoas que trabalham com alimentos e precisam destinar o que não foi comercializado (restaurante, hotel, feira, supermercado) — precisam de voluntários para buscar.',
    span: 'half',
  },
];

const ACKNOWLEDGEMENTS = [
  'Em agradecimento à formação humana, moral e ética que recebi dos meus professores de Filosofia e Sociologia do ensino médio.',
  <>Por terem passado o premiado documentário curta de 13 minutos do brasileiro Jorge Furtado, <a target="_blank" rel="noreferrer" href="https://www.youtube.com/watch?v=JcP9v5mZT9w">Ilha das Flores</a>.</>,
  'Após 10 anos de ter assistido, aprendido e internalizado o nosso papel como sociedade, tive a oportunidade de agir usando conhecimento e tecnologias acumulados.',
  'E a base para criação de projetos (pesquisa de campo e Project Manager) obtida na disciplina de Projetão CIn UFPE.',
  'Resultou em obter as ferramentas necessárias para agir em favor das pessoas que passam fome.',
  'E dar visibilidade, contribuindo junto com as pessoas de bom coração que rotineiramente alimentam quem não tem dinheiro para comprar comida.',
  'E contribuir com os comerciantes de alimentos a reduzirem o desperdício.',
  'E motivar e ofertar ferramentas para cada ser humano fazer sua parte e colaborar de forma recorrente.',
  'Ou, se não com o alimento, com o compartilhamento de informação — informando da existência do MAPA FOME a quem precisa e a quem pode ajudar.',
  'Sem comida, qualquer ser humano morre prematuramente. Deixar de prestar assistência, quando possível fazê-lo sem risco pessoal, configura crime de Omissão de Socorro (Art. 135 do Código Penal Brasileiro).',
];

const HUNGER_TIMELINE = [
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

const InfoPanel = ({ rowCount }) => {
  const [showAgradecimentos, setShowAgradecimentos] = useState(false);
  const [showTabela, setShowTabela] = useState(false);

  return (
    <Grid size={{ xs: 12, sm: 12 }}>
      <Paper id="MoreInfo" className="ip-panel" elevation={0}>
        <header className="ip-share">
          <a
            className="wpbtn"
            title="Compartilhar no WhatsApp"
            href="whatsapp://send?text=Para marcar no mapa e alimentar quem tem fome, achei esse site: www.mapafome.com.br"
          >
            <img className="wp" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" />
            <span>Compartilhar no WhatsApp</span>
          </a>
          <a
            target="_blank"
            rel="noreferrer"
            className="tgme_widget_share_btn"
            title="Compartilhar no Telegram"
            aria-label="Compartilhar no Telegram"
            href="https://t.me/share?url=www.mapafome.com.br&text=Para%20marcar%20no%20mapa%20e%20alimentar%20quem%20tem%20fome%2C%20achei%20esse%20site%3A"
          >
            <img className="telegram" src="https://telegram.org/img/WidgetButton_LogoSmall.png" alt="" />
          </a>
        </header>

        <div className="ip-stats" aria-live="polite">
          <strong>{rowCount || 0}</strong>
          <span>pontos mapeados</span>
        </div>

        <div className="ip-apps">
          <a
            className="ip-apps__badge"
            target="_blank"
            rel="noreferrer"
            href="https://play.google.com/store/apps/details?id=br.com.mapafome"
          >
            <img alt="Disponível no Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/pt_badge_web_generic.png" />
          </a>
          <a
            className="ip-apps__badge"
            target="_blank"
            rel="noreferrer"
            href="https://instagram.com/mapafome"
            aria-label="MAPA FOME no Instagram"
          >
            <ImagemInstagram />
          </a>
        </div>

        <p className="ip-intro">
          No mapa, clique em uma bolinha para saber como ajudar. Você pode se incluir
          ou incluir outra pessoa: selecione a situação e confirme o local.{' '}
          (Mais informações <a target="_blank" rel="noreferrer" href="https://g1.globo.com/pe/pernambuco/noticia/2022/02/10/site-criado-por-estudante-da-ufpe-aproxima-pessoas-que-estao-passando-fome-e-doadores-de-comida.ghtml">na matéria da Globo</a>{' '}
          e no <a target="_blank" rel="noreferrer" href="https://globoplay.globo.com/v/10350537/">Jornal Hoje em rede nacional</a>.)
        </p>

        <ul className="ip-legend" aria-label="Legenda das cores no mapa">
          {LEGEND.map((item) => (
            <li
              key={item.key}
              className={`ip-legend__item ip-legend__item--${item.span}`}
            >
              <span className={`ip-legend__chip ${item.chipClass}`}>
                <img src={item.icon} alt="" width="22" height="22" />
                {item.label}
              </span>
              <p className="ip-legend__text">{item.desc}</p>
            </li>
          ))}
        </ul>

        <div className="ip-actions">
          <button
            type="button"
            className="alignElementCenter"
            onClick={() => setShowAgradecimentos((v) => !v)}
            aria-expanded={showAgradecimentos}
            aria-controls="ip-collapse-agradecimentos"
          >
            {showAgradecimentos ? 'Esconder agradecimentos' : 'Agradecimentos'}
          </button>
          <button
            type="button"
            className="alignElementCenter"
            onClick={() => setShowTabela((v) => !v)}
            aria-expanded={showTabela}
            aria-controls="ip-collapse-tabela"
          >
            {showTabela ? 'Esconder tabela' : 'Ver consequências da fome'}
          </button>
        </div>

        {showAgradecimentos && (
          <section
            id="ip-collapse-agradecimentos"
            className="ip-collapse"
            aria-label="Agradecimentos"
          >
            <ul className="ip-bullets">
              {ACKNOWLEDGEMENTS.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {showTabela && (
          <section
            id="ip-collapse-tabela"
            className="ip-collapse"
            aria-label="Consequências da fome ao longo do tempo"
          >
            <div className="ip-table-wrap">
              <table className="ip-table">
                <thead>
                  <tr>
                    <th scope="col">Tempo de fome</th>
                    <th scope="col">Consequências</th>
                    <th scope="col">Risco de vida</th>
                  </tr>
                </thead>
                <tbody>
                  {HUNGER_TIMELINE.map((row) => (
                    <tr key={row.time}>
                      <th scope="row">{row.time}</th>
                      <td>{row.conseq}</td>
                      <td>
                        <span className={`ip-risk ip-risk--${row.risk.replace(/\s+/g, '-')}`}>
                          {row.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="ip-conclusion">
          <strong>Conclusão:</strong> faço um apelo a você para tomar medidas e ações
          solidárias recorrentes, em intervalos de 1 a 14 dias. Alivie a dor e o
          sofrimento de outro ser humano.
        </p>

        <figure className="ip-ods">
          <img
            className="ods"
            alt="ODS 2 da ONU — Fome Zero e Agricultura Sustentável"
            src="https://brasil.un.org/profiles/undg_country/themes/custom/undg/images/SDGs/pt-br/SDG-2.svg"
          />
          <figcaption>
            No MAPA FOME você pode encontrar a quem ajudar e fazer novas marcações.
            Selecione a opção que representa você ou outra pessoa, adicione um
            contato se quiser, e confirme com a localização atual ou um endereço.
          </figcaption>
        </figure>

        <section className="ip-uses" aria-label="Para que serve o MAPA FOME">
          <h3>Serve para</h3>
          <ul>
            <li>mapear pessoas que estão com fome na rua ou em casa</li>
            <li>mapear iniciativas que recebem recursos para fazer doação</li>
            <li>mostrar no mapa onde e quando tem alimento sendo distribuído</li>
            <li>mostrar lugares comerciais ou residenciais que precisam de voluntários para buscar alimentos não consumidos</li>
          </ul>
          <p className="ip-uses__note">
            É possível traçar uma rota ao destino: clique em <em>Ir para o destino</em> para abrir no Google Maps.
          </p>
        </section>

        <footer className="ip-footer">
          <div className="ip-contact">
            <span className="ip-contact__label">Contato:</span>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://mail.google.com/mail/u/0/?fs=1&to=rslgp@cin.ufpe.br&tf=cm"
            >
              rslgp@cin.ufpe.br
            </a>
            <a target="_blank" rel="noreferrer" href="https://wa.me/5583996157234">
              (83) 9.9615-7234
            </a>
          </div>
          <Sugestao />
          <nav className="ip-legal" aria-label="Documentos legais">
            <a target="_blank" rel="noreferrer" href="./privacy.html">Política de Privacidade</a>
            <span aria-hidden="true">·</span>
            <a target="_blank" rel="noreferrer" href="./terms.html">Termos de Uso</a>
          </nav>
        </footer>
      </Paper>
    </Grid>
  );
};

export default InfoPanel;
