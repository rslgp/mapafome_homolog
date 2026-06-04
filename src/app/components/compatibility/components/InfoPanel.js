import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Sugestao from './googlesheets/sugestao';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';
import ImagemInstagram from './home/ImagemInstagram';
import Apoiadores from './home/Apoiadores';
import SponsorSlot from './ux/SponsorSlot';
import { PLACEMENTS } from './ux/sponsors';
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
  <>Por terem passado o premiado documentário curta de 13 minutos do brasileiro Jorge Furtado, <a target="_blank" rel="noreferrer" href="https://www.youtube.com/watch?v=h30BO_6kFNM">Ilha das Flores</a>. <a target="_blank" rel="noreferrer" href="https://drive.google.com/file/d/1YmaBTFgVV67k44l5EyxjEXSNTVb5ATjS/view?usp=drive_link">backup</a></>,
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
  const [showApoiadores, setShowApoiadores] = useState(false);
  const [showTabela, setShowTabela] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState('');

  // Captura o evento de instalação do PWA (Chrome/Edge/Android) para oferecer
  // a instalação da versão lite direto no botão, sem passar pela loja.
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    // Adota um evento que disparou ANTES deste componente montar — capturado
    // cedo pelo bridge em layout.js (window.__mdf_install_prompt).
    if (window.__mdf_install_prompt) setDeferredPrompt(window.__mdf_install_prompt);
    if (window.__mdf_app_installed) setIsInstalled(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // Usa o evento do state ou o capturado cedo pelo bridge (layout.js).
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__mdf_install_prompt : null);
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') window.__mdf_install_prompt = null;
      setInstallHint('');
      return;
    }
    // Sem prompt nativo (Safari/iOS, ou navegador que ainda não atingiu o
    // critério de instalabilidade): orienta a instalação manual.
    const ua = navigator.userAgent || '';
    if (/iphone|ipad|ipod/i.test(ua) || (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua))) {
      setInstallHint('No iPhone/iPad (Safari): toque em Compartilhar e escolha "Adicionar à Tela de Início".');
    } else {
      setInstallHint('Abra o menu do navegador (⋮) e escolha "Instalar app" ou "Adicionar à tela inicial".');
    }
  };

  return (
    <Grid size={{ xs: 12, sm: 12 }}>
      <Paper id="MoreInfo" className="ip-panel" elevation={0}>
        <header className="ip-share">
          <a
            className="mdf-btn mdf-btn--secondary"
            title="Compartilhar no WhatsApp"
            href="whatsapp://send?text=No MAPA FOME dá pra ver no mapa quem está com fome e ajudar agora. Faça a sua parte: www.mapafome.com.br"
          >
            <img className="mdf-btn__ico" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" />
            <span>Compartilhar no WhatsApp</span>
          </a>
          <a
            target="_blank"
            rel="noreferrer"
            className="mdf-btn mdf-btn--icon mdf-btn--channel-tg"
            title="Compartilhar no Telegram"
            aria-label="Compartilhar no Telegram"
            href="https://t.me/share?url=www.mapafome.com.br&text=Para%20marcar%20no%20mapa%20e%20alimentar%20quem%20tem%20fome%2C%20achei%20esse%20site%3A"
          >
            <img className="mdf-btn__ico" src="https://telegram.org/img/WidgetButton_LogoSmall.png" alt="" />
          </a>
        </header>

        <div className="ip-stats" aria-live="polite">
          <strong>{rowCount || 0}</strong>
          <span>pontos mapeados</span>
        </div>

        <div className="ip-apps">
          {!isInstalled && (
            <div className="ip-apps__install-badges" role="group" aria-label="Baixar o app (PWA-lite)">
              <button
                type="button"
                className="mdf-btn mdf-btn--badge"
                onClick={handleInstall}
                aria-label="Baixar o app no Google Play (PWA-lite)"
              >
                <img className="imgGooglePlay" alt="Disponível no Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/pt_badge_web_generic.png" />
              </button>
              <button
                type="button"
                className="mdf-btn mdf-btn--badge"
                onClick={handleInstall}
                aria-label="Baixar o app na App Store (PWA-lite)"
              >
                <img alt="Baixar na App Store" src="https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/servicos/app-store-selo.png" />
              </button>
            </div>
          )}

          <a
            className="mdf-btn mdf-btn--secondary mdf-btn--lg mdf-btn--rich"
            target="_blank"
            rel="noreferrer"
            href="https://mapafome.com.br/solone/"
            aria-label="Jogue SOLONE — o jogo do MAPA FOME"
          >
            <img
              className="mdf-btn__media"
              src="https://rslgp.github.io/games/charleslike/icons/icon-512.png"
              alt=""
              width="44"
              height="44"
            />
            <span className="mdf-btn__label-wrap">
              <strong className="mdf-btn__title">Jogue SOLONE</strong>
              <small className="mdf-btn__sub">O jogo do MAPA FOME</small>
            </span>
          </a>
          <a
            className="mdf-btn mdf-btn--badge mdf-btn--framed ip-apps__globo"
            target="_blank"
            rel="noreferrer"
            href="https://globoplay.globo.com/v/10350537/"
            aria-label="MAPA FOME no Jornal Hoje (Globo)"
          >
            <img alt="Globo" src="https://cdn.guiademarcas.globo/capa_globo_corporativa_bf2z6hY.png" />
          </a>
          <a
            className="mdf-btn mdf-btn--badge"
            target="_blank"
            rel="noreferrer"
            href="https://instagram.com/mapafome"
            aria-label="MAPA FOME no Instagram"
          >
            <ImagemInstagram />
          </a>
          <a
            className="mdf-btn mdf-btn--primary mdf-btn--lg"
            target="_blank"
            rel="noreferrer"
            href="https://nubank.com.br/pagar/2i6kb/zRE5wsvEe2"
            aria-label="Doar via Pix"
            title="Doar via Pix"
          >
            <span className="mdf-btn__logo-chip">
              <img
                src="https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png"
                alt="Pix"
              />
            </span>
            <span>Doar agora</span>
          </a>
        </div>
        {installHint && (
          <p className="ip-apps__hint" role="status">{installHint}</p>
        )}

        <p className="ip-intro">
          No mapa, clique em uma bolinha para saber como ajudar. Você pode se incluir
          ou incluir outra pessoa: selecione a situação e confirme o local.{' '}
          (Mais informações <a target="_blank" rel="noreferrer" href="https://g1.globo.com/pe/pernambuco/noticia/2022/02/10/site-criado-por-estudante-da-ufpe-aproxima-pessoas-que-estao-passando-fome-e-doadores-de-comida.ghtml">na matéria da Globo</a>{' '}
          e na Globo no <a target="_blank" rel="noreferrer" href="https://globoplay.globo.com/v/10350537/">Jornal Hoje em rede nacional</a>, confira o jogo <a target="_blank" rel="noreferrer" href="https://mapafome.com.br/solone/">SOLONE</a> para divulgação, marketing e engajamento.)
        </p>

        <section className="ip-support" aria-label="Apoie o MAPA FOME">
          <h3>Ajude a manter esse site desde 2022 online e a descoberta de mais pessoas</h3>
          <div className="ip-support__actions">
            <a
              className="mdf-btn mdf-btn--secondary mdf-btn--channel-patreon mdf-btn--lg"
              target="_blank"
              rel="noreferrer"
              href="https://www.patreon.com/reifel/membership"
              aria-label="Apoio mensal no Patreon"
              title="Apoio mensal no Patreon"
            >
              <span aria-hidden="true">★</span>
              Apoio mensal no Patreon
            </a>
          </div>
        </section>

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
            className="mdf-btn mdf-btn--secondary"
            onClick={() => setShowAgradecimentos((v) => !v)}
            aria-expanded={showAgradecimentos}
            aria-controls="ip-collapse-agradecimentos"
          >
            {showAgradecimentos ? 'Esconder agradecimentos' : 'Ver agradecimentos'}
          </button>
          <button
            type="button"
            className="mdf-btn mdf-btn--secondary"
            onClick={() => setShowApoiadores((v) => !v)}
            aria-expanded={showApoiadores}
            aria-controls="ip-collapse-apoiadores"
          >
            {showApoiadores ? 'Esconder apoiadores' : 'Ver Apoiadores'}
          </button>
          <button
            type="button"
            className="mdf-btn mdf-btn--secondary"
            onClick={() => setShowTabela((v) => !v)}
            aria-expanded={showTabela}
            aria-controls="ip-collapse-tabela"
          >
            {showTabela ? 'Esconder consequências' : 'Ver consequências da fome'}
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
                <li key={`ack-${i}`}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {showApoiadores && (
          <section
            id="ip-collapse-apoiadores"
            className="ip-collapse"
            aria-label="Apoiadores"
          >
            <Apoiadores />
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

        <p className="ip-conclusion">
          <strong>Conclusão:</strong> faço um apelo a você para tomar medidas e ações
          solidárias recorrentes, em intervalos de 1 a 14 dias. Alivie a dor e o
          sofrimento de outro ser humano.
        </p>

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
          <SponsorSlot placement={PLACEMENTS.INFO_PANEL_FOOTER} />
          <nav className="ip-legal" aria-label="Documentos legais">
            <a target="_blank" rel="noreferrer" href="./privacy.html">Política de Privacidade</a>
            <span aria-hidden="true">·</span>
            <a target="_blank" rel="noreferrer" href="./terms.html">Termos de Uso</a>
            <span aria-hidden="true">·</span>
            <a href="/apoiar">Apoie o projeto</a>
            <span aria-hidden="true">·</span>
            <a href="/relatorios">Relatórios (órgãos públicos)</a>
            <span aria-hidden="true">·</span>
            <a href="/relatorio-marketing">Relatório de marketing (parceiros)</a>
            <span aria-hidden="true">·</span>
            <a href="/parceiros">Seja parceiro</a>
            <span aria-hidden="true">·</span>
            <a href="/imprensa">Imprensa</a>
          </nav>
          <a
            className="mdf-btn mdf-btn--tertiary"
            target="_blank"
            rel="noreferrer"
            href="https://github.dev/rslgp/mapafome_homolog/src/app/components/compatibility/components/README.md"
            aria-label="Contribuir / abrir PR no GitHub"
            title="Contribuir / abrir PR no GitHub"
          >
            <img className="mdf-btn__brandmark imgGithub" src="https://brand.github.com/_next/static/media/logo-03.cc5e5332.png" alt="GitHub" />
          </a>
          <p className="ip-closing">
            Ninguém deveria passar fome ao nosso lado. Faça hoje a sua parte —
            doe, marque um ponto no mapa ou compartilhe o MAPA FOME.
          </p>
        </footer>
      </Paper>
    </Grid>
  );
};

export default InfoPanel;
