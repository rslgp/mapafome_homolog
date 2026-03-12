import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
// import CreatorsMapaFome from './CreatorsMapaFome';
import Sugestao from './googlesheets/sugestao';
// import coffeeBean from '../images/bean.svg';
// import hub from '../images/hub.svg';
// import green from '../images/green.svg';
// import red from '../images/red.svg';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';
import ImagemInstagram from './home/ImagemInstagram';


const InfoPanel = ({ rowCount }) => {
  const [showAgradecimentos, setShowAgradecimentos] = useState(false);
  const [showTabela, setShowTabela] = useState(false);

  return (
    <Grid size={{ xs: 12, sm: 12 }} >
      <Paper id="MoreInfo" style={{ height: '100%' }}>
        <a className="wpbtn" title="share to whatsapp" href="whatsapp://send?text=Para marcar no mapa e alimentar quem tem fome, achei esse site: www.mapafome.com.br">
          <img className="wp" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="" />
          Compartilhar no Whatsapp
        </a>
        <a style={{ float: 'right' }} target='_blank' rel="noreferrer" href="https://t.me/share?url=www.mapafome.com.br&amp;text=Para%20marcar%20no%20mapa%20e%20alimentar%20quem%20tem%20fome%2C%20achei%20esse%20site%3A" className="tgme_widget_share_btn">
          <img className="telegram" src="https://telegram.org/img/WidgetButton_LogoSmall.png" alt=""></img>
        </a>

        <br></br>
        Mapeados: {rowCount}<br></br>
        <a href='https://play.google.com/store/apps/details?id=br.com.mapafome'>
          <img style={{ height: '55px' }} alt='Disponível no Google Play' src='https://play.google.com/intl/en_us/badges/static/images/badges/pt_badge_web_generic.png' />
        </a>
        <a target='_blank' rel="noreferrer" href="https://instagram.com/mapafome">
          
          <ImagemInstagram></ImagemInstagram>
          
        </a>

        <br></br>No mapa clique na bolinha para saber como ajudar.<br></br> Você pode se incluir ou incluir outra pessoa, <br></br>selecione a situação e confirme o local (mais informações <a target='_blank' rel="noreferrer" href="https://g1.globo.com/pe/pernambuco/noticia/2022/02/10/site-criado-por-estudante-da-ufpe-aproxima-pessoas-que-estao-passando-fome-e-doadores-de-comida.ghtml">na matéria da Globo</a>)(<a href="https://globoplay.globo.com/v/10350537/">e jornal hoje da Globo em rede nacional</a>):
        <br></br><span className="yellowHub">em amarelo são pessoas <img width="30px" height="30px" src={coffeeBean} alt="bean"></img></span>em vulnerabilidade social e insegurança alimentar que estão com fome em casa ou na rua, --precisam de alimento
        <br></br><span className="blueHub">em azul são pessoas <img width="30px" height="30px" src={hub} alt="hub"></img></span>que recebem alimentos ou recursos para distribuir alimento ou refeições na comunidade (exemplo: sopão solidário, ongs, voluntários) --precisam de doações
        <br></br><span className="redHub">em vermelho são pessoas <img width="30px" height="30px" src={red} alt="red"></img></span>que entregam refeição em ponto fixo na rua em certo dia na semana. --ponto de entrega de alimento pronto
        <br></br><span className="greenHub">em verde são pessoas <img width="30px" height="30px" src={green} alt="green"></img></span>que trabalham com alimentos e precisam destinar os alimentos não comercializados ou não consumidos e não tem pessoas para buscar esses alimentos (exemplo: restaurante, hotel, lanchonete, feira livre, supermercados) --precisam de voluntários para buscar

        <br></br>
        <br></br>
        <p><button className="alignElementCenter" onClick={() => setShowAgradecimentos(!showAgradecimentos)}>Agradecimentos</button></p>
        {showAgradecimentos && (
          <div>
            {/* <CreatorsMapaFome /> */}
            <br />
            em agradecimento a formação humana, moral e ética que recebi dos meus professores de Filosofia e Sociologia do ensino médio
            <br /><span style={{ "fontSize": "1.4em", "color": "blue" }}>•</span>por terem passado o premiado documentário com base em fatos reais curta de 13 minutos do brasileiro Jorge Furtado <a target='_blank' rel="noreferrer" href="https://www.youtube.com/watch?v=JcP9v5mZT9w">Ilha das Flores</a>
            <br /><span style={{ "fontSize": "1.4em", "color": "blue" }}>•</span>após 10 anos de ter assistido, aprendido e internalizado e entendido nosso papel como sociedade e comunidade, tive a oportunidade de agir usando conhecimento e tecnologias acumulado ao longo do tempo
            <br /><span style={{ "fontSize": "1.4em", "color": "blue" }}>•</span>e a base para criação de projetos (pesquisa de campo e Project Manager) obtida na disciplina de Projetão CIn UFPE
            <br /><span style={{ "fontSize": "1.4em", "color": "red" }}>•</span>resultou em obter as ferramentas necessárias para agir em favor das pessoas que passam fome
            <br /><span style={{ "fontSize": "1.4em", "color": "red" }}>•</span>e dar visibilidade, e contribuir junto com as pessoas de bom coração a elas que rotinamente agem alimentando quem não tem dinheiro para comprar comida
            <br /><span style={{ "fontSize": "1.4em", "color": "green" }}>•</span>e contribuir com os comerciantes de alimentos a reduzirem o desperdício de alimento
            <br /><span style={{ "fontSize": "1.4em", "color": "red" }}>•</span>e motivar e ofertar ferramentas necessárias para cada ser humano fazer sua parte e poder colaborar de forma recorrente, saber e encontrar a quem ofertar alimento
            <br /><span style={{ "fontSize": "1.4em", "color": "orange" }}>•</span>ou se não com o alimento, com o compartilhamento de informação ao informar da existência do MAPA FOME que é gratuito, a quem precisa e a quem pode ajudar, pois irão saber a quem buscar
            <br /><span style={{ "fontSize": "1.4em", "color": "red" }}>•</span>sem comida, qualquer ser humano morre prematuramente. e qualquer pessoa ao deixar de prestar assistência, quando possível fazê-lo sem risco pessoal, à pessoa (...) ao desamparo ou em grave e iminente perigo = praticar crime de Omissão de socorro Art. 135 Código Penal Brasileiro
          </div>
        )}

        <p><button className="alignElementCenter" onClick={() => setShowTabela(!showTabela)}>Ver tabela de consequências ruins ao longo do tempo</button></p>
        {showTabela && (
          <table style={{ "width": "94%", "textAlign": "center" }}>
            <thead>
              <tr style={{ "backgroundColor": "#c8dff5" }}>
                <th style={{ "width": "7%" }}>Tempo<br />de<br />Fome</th>
                <th style={{ "width": "86%" }}>Consequências ruins</th>
                <th style={{ "width": "7%" }}>Risco de vida<br />da pessoa<br />desamparada</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0-3<br />horas</td>
                <td>Mudança mínima</td>
                <td>0</td>
              </tr>
              <tr style={{ "backgroundColor": "#c8dff5" }}>
                <td>4-8<br />horas</td>
                <td style={{ "padding": "3%" }}>Você vai sentir mais fome e sua barriga vai doer um pouco, e pode ter dor de cabeça</td>
                <td>0</td>
              </tr>
              <tr>
                <td>9-12<br />horas</td>
                <td style={{ "padding": "3%" }}>Você vai começar a se sentir cansado e rabugento, raivoso, irritado, estressado e vai ter dor de cabeça</td>
                <td>baixa</td>
              </tr>
              <tr style={{ "backgroundColor": "#c8dff5" }}>
                <td>13-16<br />horas</td>
                <td style={{ "padding": "3%" }}>vai ser mais difícil prestar atenção ou se concentrar</td>
                <td>moderada</td>
              </tr>
              <tr>
                <td>17-24<br />horas</td>
                <td style={{ "padding": "3%" }}>Seu corpo vai não ter açúcar suficiente, o que vai fazer você se sentir tonto ou TREMENDO</td>
                <td>moderada</td>
              </tr>
              <tr style={{ "backgroundColor": "#c8dff5" }}>
                <td>25-48<br />horas</td>
                <td style={{ "padding": "3%" }}>Você vai se sentir fraco e entra em situação de alto estresse e em modo de sobrevivência seu coração vai bater mais rápido pois falta energia que vem da comida, então tenta trabalhar dobrado na tentativa de manter o resultado (entrega de oxigênio e nutrientes para orgão vitais)</td>
                <td>alta</td>
              </tr>
              <tr>
                <td>49-72<br />horas</td>
                <td style={{ "padding": "3%" }}>Seu corpo vai começar a usar energia armazenada (gordura,...), o que vai fazer você se sentir cansado e seu sistema imunológico vai não funcionar tão bem, fica doente mais facilmente</td>
                <td>alta</td>
              </tr>
              <tr style={{ "backgroundColor": "#c8dff5" }}>
                <td>3-7<br />dias</td>
                <td style={{ "padding": "3%" }}>Os músculos passam a serem consumidos como energia, você vai se sentir muito fraco e seus músculos vão diminuir. Isso não é bom para o seu corpo, danifica o organismo. Diminuição da motivação ou produtividade</td>
                <td>alta</td>
              </tr>
              <tr>
                <td>8-14<br />dias</td>
                <td style={{ "padding": "3%" }}>Seus órgãos, que são partes importantes do seu corpo, vão ficar feridos e você vai ficar doente muito mais facilmente</td>
                <td>muito alta</td>
              </tr>
              <tr style={{ "backgroundColor": "#c8dff5" }}>
                <td>15-21<br />dias</td>
                <td style={{ "padding": "3%" }}>Você vai ficar muito doente e sua vida vai estar em perigo</td>
                <td>extremamente alto</td>
              </tr>
              <tr>
                <td>22+<br />dias</td>
                <td style={{ "padding": "3%" }}>Você está em perigo extremo porque seu corpo não está recebendo comida suficiente, e seus órgãos vão parar de funcionar corretamente ou parar a qualquer momento</td>
                <td>extremamente alto</td>
              </tr>
            </tbody>
          </table>
        )}

        <p>Conclusão: Faço um apelo a você tomar medidas e ações solidárias e qualquer forma de iniciativa recorrentes, em intervalos de 1 dia a 14 dias (intervalos recorrentes de mínimo diário ou menos, máximo 2 semanas ou menos), alivie a dor e sofrimento de outro ser humano.</p>
        <br />

        <img className="ods alignElementCenter" alt="" src="https://brasil.un.org/profiles/undg_country/themes/custom/undg/images/SDGs/pt-br/SDG-2.svg"></img> No Mapa Fome você pode encontrar a quem ajudar e fazer novas marcações, caso uma opção represente você ou outra pessoa, selecione, coloque número para contato se quiser, e confirme com localização atual ou endereço e número

        <br></br><br></br>serve para

        <br></br>-mapear pessoas que estão com fome na rua ou em casa
        <br></br>-mapear iniciativas que recebem recursos para fazer doação
        <br></br>-mostrar no mapa onde e quando tem alimento sendo distribuído
        <br></br>-mostrar no mapa lugares comerciais ou residenciais que precisam de voluntários ou necessitados para buscar alimentos não consumidos ou não comercializados
        <br></br>é possível traçar uma rota ao destino ao clicar Ir para o destino, e ser redirecionado para o Google Maps
        <br></br>
        contato: <a target='_blank' rel="noreferrer" href="https://mail.google.com/mail/u/0/?fs=1&to=rslgp@cin.ufpe.br&tf=cm" >rslgp@cin.ufpe.br</a> <a target='_blank' rel="noreferrer" href='https://wa.me/5583996157234'>(83) 9.9615-7234</a>
        <Sugestao />
        <a target='_blank' rel="noreferrer" href="./privacy.html">Privacy Policy</a>
        <span> - </span>
        <a target='_blank' rel="noreferrer" href="./terms.html">Terms</a>
      </Paper>
    </Grid>
  );
};

export default InfoPanel;
