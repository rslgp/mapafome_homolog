import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { Checkbox } from '@mui/material';
import InserirEndereco from './googlesheets/endereco';
import MyLocationButton from './googlesheets/mylocation';
import { MARKER_PLACED_EVENT, MARKER_CLEARED_EVENT } from './mapComponents';
// import coffeeBean from '../images/bean.svg';
// import hub from '../images/hub.svg';
// import green from '../images/green.svg';
// import red from '../images/red.svg';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';
import { NEED_CATEGORIES } from './ux/needCategories';

const MainControls = ({
  isLoading,
  alimento,
  telefoneEncryptado,
  diaSemana,
  horario,
  mes,
  center,
  numero,
  redesocial,
  telefoneFilterLocal,
  ultimoAnoFilterLocal,
  onFiltroChange,
  onTipoAlimentoChange,
  onDiaSemanaChange,
  onHorarioChange,
  onMesChange,
  onTelefoneChange,
  onNumeroChange,
  onRedeSocialChange,
  onClickMap,
  onTelefoneFilterChange,
  onUltimoAnoFilterChange,
  dropDownMenuSemanaEntregaAlimentoPronto,
  dropDownMenuHorarioEntregaAlimentoPronto,
  dropDownMenuSemanaPrecisandoBuscar,
  dropDownMenuHorarioPrecisandoBuscar,
  dropDownMenuFiltro,
  redesocialRef,
  dropDownMenuRedeSocial,
  dropDownMenuMesPrecisandoBuscar,
  dropDownMenuMesEntregaAlimentoPronto,
}) => {
  // TV-5 (tap_visibility_robustness.yaml): the "Confirmar ponto" button
  // reflects whether a marker has been placed. Subscribes to the public
  // mdf:marker-placed / mdf:marker-cleared CustomEvents — no prop drilling.
  // Uses aria-disabled (semantic only, button stays clickable) so the
  // GPS-fallback path in App.js handleClickMap remains usable for users
  // who never tap the map.
  const [hasMarker, setHasMarker] = useState(false);
  // Disclosure for the "Esse ano" filter's origin note (2024 RS floods).
  const [anoInfoOpen, setAnoInfoOpen] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onPlaced = () => setHasMarker(true);
    const onCleared = () => setHasMarker(false);
    document.addEventListener(MARKER_PLACED_EVENT, onPlaced);
    document.addEventListener(MARKER_CLEARED_EVENT, onCleared);
    return () => {
      document.removeEventListener(MARKER_PLACED_EVENT, onPlaced);
      document.removeEventListener(MARKER_CLEARED_EVENT, onCleared);
    };
  }, []);

  return (
    <Grid size={{ xs: 12, sm: 4 }} >
      <Paper id="CoffeeTable" style={{ height: '100%' }} className="toolPanel2">
        <div className='relativePosition'>
          {isLoading ? <div>Carregando... <CircularProgress aria-label="Carregando" /></div> : <div />}

          <article className='filtro-tel'>
            <article className='parte filtro'>
              <label htmlFor="filtro">filtro atual:</label>
              <select ref={dropDownMenuFiltro} id="filtro" aria-label="Filtrar por categoria" onChange={onFiltroChange}>
                <option value="Todos">Todos</option>
                <option value="Doadores">Doadores</option>
                <option value="CestaBasica">Cesta básica</option>
                <option value="MoradorRua">Situação de rua</option>
                <option value="Refeição Pronta">Refeição Pronta</option>
                <option value="RedeSocial">Rede Social</option>
                <option value="Verificados">possui CNPJ</option>
                <option value="Nenhum">Nenhum</option>
                {/* Disaster / non-food needs — driven by the needCategories SOT
                    so água/abrigo/roupa/higiene/remédios/animais/carregar stay
                    in sync with the report flow. `need:*` shows everyone asking
                    for help (only people in need, no donor/initiative pins). */}
                <optgroup label="Necessidades no desastre">
                  <option value="need:*">Todas as necessidades</option>
                  {NEED_CATEGORIES.map((c) => (
                    <option key={c.id} value={`need:${c.id}`}>{c.icon} {c.label}</option>
                  ))}
                </optgroup>
              </select>
            </article>

            <article className='parte'>
              <Checkbox
                checked={telefoneFilterLocal}
                onChange={onTelefoneFilterChange}
                slotProps={{ input: { 'aria-label': 'Filtrar por telefone' } }}
              />
              <span>Telefone</span>
            </article>

            <article className='parte filtro-ano'>
              <Checkbox
                checked={ultimoAnoFilterLocal}
                onChange={onUltimoAnoFilterChange}
                slotProps={{ input: { 'aria-label': 'Filtrar pelo último ano' } }}
              />
              <span className='filtro-ano__text'>
                <span className='filtro-ano__title'>
                  Esse ano
                  <button
                    type='button'
                    className='filtro-ano__info'
                    aria-expanded={anoInfoOpen}
                    aria-controls='filtro-ano-note'
                    aria-label='Por que existe o filtro Esse ano?'
                    onClick={() => setAnoInfoOpen((o) => !o)}
                  >
                    ⓘ
                  </button>
                </span>
                <span className='filtro-ano__caption'>pedido na enchente do RS · 2024</span>
              </span>
            </article>

            {anoInfoOpen && (
              <p id='filtro-ano-note' className='filtro-ano__note'>
                Filtro pedido por pessoas atingidas pela enchente do Rio Grande do Sul,
                em 2024, para ver só os pedidos recentes do desastre. Mostra apenas as
                marcações deste ano.
              </p>
            )}
          </article>

          {/* RADIO BUTTON */}
          <div className='relativePosition'>
            <ul className='list-cat'>
              <li>
                <label className='uxLi'>
                  <input
                    type="radio"
                    value="Teste"
                    checked={alimento === "Teste"}
                    onChange={onTipoAlimentoChange}
                  />
                  <span> Opção para testar a ferramenta </span>
                </label>
              </li>

              <li>
                <label className='uxLi'>
                  <input
                    type="radio"
                    value="Alimento pronto"
                    checked={alimento === "Alimento pronto"}
                    onChange={onTipoAlimentoChange}
                  />
                  <span className='yellowHub'> Pessoa precisando de Alimento pronto <img width="30px" height="30px" src={coffeeBean} alt="bean"></img></span>
                </label>
              </li>

              <li>
                <label className='uxLi'>
                  <input
                    type="radio"
                    value="Alimento de cesta básica"
                    checked={alimento === "Alimento de cesta básica"}
                    onChange={onTipoAlimentoChange}
                  />
                  <span className='yellowHub'> Preciso de Alimento de cesta básica <img width="30px" height="30px" src={coffeeBean} alt="bean"></img></span>
                </label>
              </li>

              <li>
                <label className='uxLi'>
                  <input
                    type="radio"
                    value="Doador"
                    checked={alimento === "Doador"}
                    onChange={onTipoAlimentoChange}
                  />
                  <span className='blueHub'> Recebo para doar <img width="30px" height="30px" src={hub} alt="hub"></img></span>
                </label>
              </li>

              <li>
                <label className='uxLi'>
                  <input
                    type="radio"
                    value="EntregaAlimentoPronto"
                    checked={alimento === "EntregaAlimentoPronto"}
                    onChange={onTipoAlimentoChange}
                  />
                  <span className='redHub'> Entrego refeições em ponto fixo <img width="30px" height="30px" src={red} alt="red"></img></span>
                  <br></br>
                  <select ref={dropDownMenuSemanaEntregaAlimentoPronto} style={{ "display": "none" }} id="dia" onChange={onDiaSemanaChange}>
                    <option value="nas Segundas">nas Segundas</option>
                    <option value="nas Terças">nas Terças</option>
                    <option value="nas Quartas">nas Quartas</option>
                    <option value="nas Quintas">nas Quintas</option>
                    <option value="nas Sextas">nas Sextas</option>
                    <option value="nos Sábados">nos Sábados</option>
                    <option value="nos Domingos">nos Domingos</option>
                    <option value="todo dia">todo dia</option>
                  </select>
                  <select ref={dropDownMenuHorarioEntregaAlimentoPronto} style={{ "display": "none" }} id="horario" onChange={onHorarioChange}>
                    <option value="manhã 05:30">manhã 05:30</option>
                    <option value="manhã 06:30">manhã 06:30</option>
                    <option value="manhã 09:30">manhã 09:30</option>
                    <option value="tarde 13:30">tarde 13:30</option>
                    <option value="tarde 16:30">tarde 16:30</option>
                    <option value="noite 18:30">noite 18:30</option>
                    <option value="noite 19:30">noite 19:30</option>
                  </select>
                  <select ref={dropDownMenuMesEntregaAlimentoPronto} style={{ "display": "none" }} id="mes2" onChange={onMesChange}>
                    <option value="x4 por mês">x4 por mês</option>
                    <option value="x3 por mês">x3 por mês</option>
                    <option value="x2 por mês">x2 por mês</option>
                    <option value="x1 por mês">x1 por mês</option>
                  </select>
                </label>
              </li>

              <li>
                <label className='uxLi'>
                  <input
                    type="radio"
                    value="PrecisandoBuscar"
                    checked={alimento === "PrecisandoBuscar"}
                    onChange={onTipoAlimentoChange}
                  />
                  <span className='greenHub'> Tenho alimento perto de se perder <a target='_blank' rel="noreferrer" href="https://www.camara.leg.br/noticias/670937-nova-lei-incentiva-empresas-a-doarem-alimentos-e-refeicoes-para-pessoas-vulneraveis/">(lei)</a>  <img width="30px" height="30px" src={green} alt="green"></img></span>
                  <br></br>
                  <select ref={dropDownMenuSemanaPrecisandoBuscar} style={{ "display": "none" }} id="dia2" onChange={onDiaSemanaChange}>
                    <option value="Hoje">Hoje</option>
                    <option value="nas Segundas">nas Segundas</option>
                    <option value="nas Terças">nas Terças</option>
                    <option value="nas Quartas">nas Quartas</option>
                    <option value="nas Quintas">nas Quintas</option>
                    <option value="nas Sextas">nas Sextas</option>
                    <option value="nos Sábados">nos Sábados</option>
                    <option value="nos Domingos">nos Domingos</option>
                  </select>
                  <select ref={dropDownMenuHorarioPrecisandoBuscar} style={{ "display": "none" }} id="horario2" onChange={onHorarioChange}>
                    <option value="manhã 05:30">manhã 05:30</option>
                    <option value="manhã 06:30">manhã 06:30</option>
                    <option value="manhã 09:30">manhã 09:30</option>
                    <option value="tarde 13:30">tarde 13:30</option>
                    <option value="tarde 16:30">tarde 16:30</option>
                    <option value="noite 18:30">noite 18:30</option>
                    <option value="noite 19:30">noite 19:30</option>
                  </select>
                  <select ref={dropDownMenuMesPrecisandoBuscar} style={{ "display": "none" }} id="mes2" onChange={onMesChange}>
                    <option value="x4 por mês">x4 por mês</option>
                    <option value="x3 por mês">x3 por mês</option>
                    <option value="x2 por mês">x2 por mês</option>
                    <option value="x1 por mês">x1 por mês</option>
                  </select>
                </label>
              </li>
            </ul>
          </div>
          {/* FIM RADIO BUTTON */}

          <div className='relativePosition'>
            <input className="TextField tfMarginUp" type="text" placeholder='Insira DDD telefone se quiser' onBlur={onTelefoneChange} />
            <input className='nLocal' type="text" placeholder='nº casa' onBlur={onNumeroChange} />
            <br />
            <select style={{ "display": "none" }} ref={dropDownMenuRedeSocial}>
              <option value="instagram.com/">Insta</option>
              <option value="facebook.com/">Face</option>
            </select>
            <input ref={redesocialRef} style={{ "display": "none" }} className="TextField" type="text" placeholder='@' onBlur={onRedeSocialChange} />
            <br></br>

            <fieldset id="mdf-target-confirm">
              <legend>Passo 3: Marcar Localização</legend>
              <MyLocationButton
                location={center}
                alimento={alimento}
                telefone={telefoneEncryptado}
                diaSemana={diaSemana}
                horario={horario}
                numero={numero}
                redesocial={redesocial}
                mes={mes}
              />
              {false ? (
                <CircularProgress aria-label="Confirmando ponto" />
              ) : (
                <button
                  type="button"
                  className={`SubmitButton marcar-local${hasMarker ? ' marcar-local--ready' : ''}`}
                  onClick={onClickMap}
                  aria-label={hasMarker ? 'Confirmar ponto marcado no mapa' : 'Confirmar ponto (toque no mapa primeiro)'}
                  aria-disabled={!hasMarker}
                >
                  {hasMarker ? '✓ Confirmar ponto' : 'Confirmar ponto'}
                </button>
              )}
            </fieldset>
          </div>

          <figure><center>OU</center></figure>
          <InserirEndereco
            alimento={alimento}
            telefone={telefoneEncryptado}
            diaSemana={diaSemana}
            horario={horario}
            redesocial={redesocial}
            mes={mes}
          />
        </div>
      </Paper>
    </Grid>
  );
};

export default MainControls;
