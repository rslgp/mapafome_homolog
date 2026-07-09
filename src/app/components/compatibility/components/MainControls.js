import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { Checkbox } from '@mui/material';
import InserirEndereco from './googlesheets/endereco';
import MyLocationButton from './googlesheets/mylocation';
import { MARKER_PLACED_EVENT, MARKER_CLEARED_EVENT } from './mapComponents';
import { GEOFENCE_ELIGIBILITY_EVENT } from './geofenceEvents';
// import coffeeBean from '../images/bean.svg';
// import hub from '../images/hub.svg';
// import green from '../images/green.svg';
// import red from '../images/red.svg';
import { bean as coffeeBean, hub, green, red } from './image/svgHandler';
import { NEED_CATEGORIES, needLabel } from './ux/needCategories';
import { PERIOD_OPTIONS } from './mapConstants';
// FILTRO_TEMPO Lane B - period labels are i18n; useLocale re-renders the
// <select> options when the locale flips so t() re-reads.
import { t, useLocale } from './ux/strings';

import Link from 'next/link';

const MainControls = ({
  isLoading,
  isPublishing = false,
  alimento,
  telefoneEncryptado,
  diaSemana,
  horario,
  mes,
  center,
  numero,
  redesocial,
  telefoneFilterLocal,
  periodLocal,
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
  onPeriodChange,
  dropDownMenuSemanaEntregaAlimentoPronto,
  dropDownMenuHorarioEntregaAlimentoPronto,
  dropDownMenuSemanaPrecisandoBuscar,
  dropDownMenuHorarioPrecisandoBuscar,
  dropDownMenuFiltro,
  redesocialRef,
  dropDownMenuRedeSocial,
  dropDownMenuMesPrecisandoBuscar,
  dropDownMenuMesEntregaAlimentoPronto,
  geofenceEligible = true,
}) => {
  // TV-5 (tap_visibility_robustness.yaml): the "Confirmar ponto" button
  // reflects whether a marker has been placed. Subscribes to the public
  // mdf:marker-placed / mdf:marker-cleared CustomEvents — no prop drilling.
  // Uses aria-disabled (semantic only, button stays clickable) so the
  // GPS-fallback path in App.js handleClickMap remains usable for users
  // who never tap the map.
  const [hasMarker, setHasMarker] = useState(false);
  // LOCATION/IP GEOFENCE gate (decoupled signal, mirrors hasMarker above):
  // `eligible` decides whether the publish controls (the "Confirmar ponto"
  // fieldset + InserirEndereco) render at all. It is SEEDED from the
  // `geofenceEligible` prop (default true) so first paint is correct when the
  // geofence flags are OFF (dark-ship → always true → controls always shown),
  // then kept live by subscribing to the public mdf:geofence-eligibility
  // CustomEvent App.js broadcasts once the GPS/IP resolvers settle — no prop
  // drilling, exactly like the MARKER_PLACED_EVENT subscription below.
  const [eligible, setEligible] = useState(geofenceEligible);
  // i18n: subscribe to locale changes so every t() below re-reads live on a
  // language switch (no reload). FILTRO_TEMPO Lane B also relies on this so the
  // period <select> option labels re-read t() when the UI locale changes.
  useLocale();
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
  // Keep `eligible` live off the decoupled geofence signal (read detail.eligible).
  // Mirrors the MARKER_PLACED_EVENT subscription above. With both geofence flags
  // OFF App.js never dispatches, so `eligible` stays at its seeded `true` and the
  // controls render byte-identically to today (DARK-SHIP INVARIANT).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onEligibility = (e) => setEligible(!!(e && e.detail && e.detail.eligible));
    document.addEventListener(GEOFENCE_ELIGIBILITY_EVENT, onEligibility);
    return () => document.removeEventListener(GEOFENCE_ELIGIBILITY_EVENT, onEligibility);
  }, []);

  return (
    <Grid size={{ xs: 12, sm: 4 }} >
      <Paper id="CoffeeTable" style={{ height: '100%' }} className="toolPanel2">
        <div className='relativePosition'>
          {isLoading ? <div>{t('mainctl.loading')} <CircularProgress aria-label={t('mainctl.loading_aria')} /></div> : <div />}

          <article className='filtro-tel'>
            <article className='parte filtro'>
              <label htmlFor="filtro">{t('mainctl.filter.label')}</label>
              <select ref={dropDownMenuFiltro} id="filtro" aria-label={t('mainctl.filter.aria')} onChange={onFiltroChange}>
                <option value="Todos">{t('mainctl.filter.all')}</option>
                <option value="Doadores">{t('mainctl.filter.donors')}</option>
                <option value="CestaBasica">{t('mainctl.filter.basket')}</option>
                <option value="MoradorRua">{t('mainctl.filter.street')}</option>
                <option value="Refeição Pronta">{t('mainctl.filter.ready_meal')}</option>
                <option value="RedeSocial">{t('mainctl.filter.social')}</option>
                <option value="Verificados">{t('mainctl.filter.has_cnpj')}</option>
                <option value="Nenhum">{t('mainctl.filter.none')}</option>
                {/* Disaster / non-food needs — driven by the needCategories SOT
                    so água/abrigo/roupa/higiene/remédios/animais/carregar stay
                    in sync with the report flow. `need:*` shows everyone asking
                    for help (only people in need, no donor/initiative pins). */}
                <optgroup label={t('mainctl.filter.needs_group')}>
                  <option value="need:*">{t('mainctl.filter.all_needs')}</option>
                  {NEED_CATEGORIES.map((c) => (
                    <option key={c.id} value={`need:${c.id}`}>{c.icon} {needLabel(c.id)}</option>
                  ))}
                </optgroup>
              </select>
            </article>

            <article className='parte'>
              <Checkbox
                checked={telefoneFilterLocal}
                onChange={onTelefoneFilterChange}
                slotProps={{ input: { 'aria-label': t('mainctl.phone_filter.aria') } }}
              />
              <span>{t('mainctl.phone_filter.label')}</span>
            </article>

            {/* FILTRO_TEMPO Lane B: 4-level recency selector (+ "Todos" escape
                hatch) that REPLACED the binary "Esse ano" checkbox. Filters every
                dot color by the marker's real DateISO via shouldApplyFilter. A
                <select> (like "filtro atual" above) for a11y + visual consistency;
                labels come from the PERIOD_OPTIONS SOT, resolved through t(). */}
            <article className='parte filtro-periodo'>
              <label htmlFor='filtro-periodo'>{t('filter.period.label')}:</label>
              <select
                id='filtro-periodo'
                aria-label='Filtrar por período'
                value={periodLocal}
                onChange={onPeriodChange}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{t(opt.labelKey)}</option>
                ))}
              </select>
            </article>
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
                  <span> {t('page.form.radio_test')} </span>
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
                  <span className='yellowHub'> {t('page.form.radio_ready')} <img width="30px" height="30px" src={coffeeBean} alt="bean"></img></span>
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
                  <span className='yellowHub'> {t('page.form.radio_basket')} <img width="30px" height="30px" src={coffeeBean} alt="bean"></img></span>
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
                  <span className='blueHub'> {t('page.form.radio_donor')} <img width="30px" height="30px" src={hub} alt="hub"></img></span>
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
                  <span className='redHub'> {t('page.form.radio_delivery')} <img width="30px" height="30px" src={red} alt="red"></img></span>
                  <br></br>
                  <select ref={dropDownMenuSemanaEntregaAlimentoPronto} style={{ "display": "none" }} id="dia" onChange={onDiaSemanaChange}>
                    <option value="nas Segundas">{t('page.form.day_mon')}</option>
                    <option value="nas Terças">{t('page.form.day_tue')}</option>
                    <option value="nas Quartas">{t('page.form.day_wed')}</option>
                    <option value="nas Quintas">{t('page.form.day_thu')}</option>
                    <option value="nas Sextas">{t('page.form.day_fri')}</option>
                    <option value="nos Sábados">{t('page.form.day_sat')}</option>
                    <option value="nos Domingos">{t('page.form.day_sun')}</option>
                    <option value="todo dia">{t('page.form.day_every')}</option>
                  </select>
                  <select ref={dropDownMenuHorarioEntregaAlimentoPronto} style={{ "display": "none" }} id="horario" onChange={onHorarioChange}>
                    <option value="manhã 05:30">{t('page.form.time_0530')}</option>
                    <option value="manhã 06:30">{t('page.form.time_0630')}</option>
                    <option value="manhã 09:30">{t('page.form.time_0930')}</option>
                    <option value="tarde 13:30">{t('page.form.time_1330')}</option>
                    <option value="tarde 16:30">{t('page.form.time_1630')}</option>
                    <option value="noite 18:30">{t('page.form.time_1830')}</option>
                    <option value="noite 19:30">{t('page.form.time_1930')}</option>
                  </select>
                  <select ref={dropDownMenuMesEntregaAlimentoPronto} style={{ "display": "none" }} id="mes2" onChange={onMesChange}>
                    <option value="x4 por mês">{t('page.form.freq_4')}</option>
                    <option value="x3 por mês">{t('page.form.freq_3')}</option>
                    <option value="x2 por mês">{t('page.form.freq_2')}</option>
                    <option value="x1 por mês">{t('page.form.freq_1')}</option>
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
                  <span className='greenHub'> {t('page.form.radio_waste')} <img width="30px" height="30px" src={green} alt="green"></img></span>
                  <Link className='hubAside' target='_blank' rel="noreferrer" href="https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15224.htm">lei-2025</Link>
                  <br></br>
                  <select ref={dropDownMenuSemanaPrecisandoBuscar} style={{ "display": "none" }} id="dia2" onChange={onDiaSemanaChange}>
                    <option value="Hoje">{t('page.form.day_today')}</option>
                    <option value="nas Segundas">{t('page.form.day_mon')}</option>
                    <option value="nas Terças">{t('page.form.day_tue')}</option>
                    <option value="nas Quartas">{t('page.form.day_wed')}</option>
                    <option value="nas Quintas">{t('page.form.day_thu')}</option>
                    <option value="nas Sextas">{t('page.form.day_fri')}</option>
                    <option value="nos Sábados">{t('page.form.day_sat')}</option>
                    <option value="nos Domingos">{t('page.form.day_sun')}</option>
                  </select>
                  <select ref={dropDownMenuHorarioPrecisandoBuscar} style={{ "display": "none" }} id="horario2" onChange={onHorarioChange}>
                    <option value="manhã 05:30">{t('page.form.time_0530')}</option>
                    <option value="manhã 06:30">{t('page.form.time_0630')}</option>
                    <option value="manhã 09:30">{t('page.form.time_0930')}</option>
                    <option value="tarde 13:30">{t('page.form.time_1330')}</option>
                    <option value="tarde 16:30">{t('page.form.time_1630')}</option>
                    <option value="noite 18:30">{t('page.form.time_1830')}</option>
                    <option value="noite 19:30">{t('page.form.time_1930')}</option>
                  </select>
                  <select ref={dropDownMenuMesPrecisandoBuscar} style={{ "display": "none" }} id="mes2" onChange={onMesChange}>
                    <option value="x4 por mês">{t('page.form.freq_4')}</option>
                    <option value="x3 por mês">{t('page.form.freq_3')}</option>
                    <option value="x2 por mês">{t('page.form.freq_2')}</option>
                    <option value="x1 por mês">{t('page.form.freq_1')}</option>
                  </select>
                </label>
              </li>
            </ul>
          </div>
          {/* FIM RADIO BUTTON */}

          <div className='relativePosition'>
            <input className="TextField tfMarginUp" type="text" placeholder={t('page.form.phone_ph')} onBlur={onTelefoneChange} />
            <input className='nLocal' type="text" placeholder={t('page.form.house_ph')} onBlur={onNumeroChange} />
            <br />
            <select style={{ "display": "none" }} ref={dropDownMenuRedeSocial}>
              <option value="instagram.com/">Insta</option>
              <option value="facebook.com/">Face</option>
            </select>
            <input ref={redesocialRef} style={{ "display": "none" }} className="TextField" type="text" placeholder='@' onBlur={onRedeSocialChange} />
            <br></br>

            {/* LOCATION/IP GEOFENCE UX GATE — the two publish triggers (the
                "Confirmar ponto" fieldset and the <InserirEndereco> address form)
                render ONLY when `eligible` is true. When not eligible (the user is
                not yet verified in-country), neither trigger is in the DOM and a
                calm notice takes their place, so the publish action cannot fire.
                `eligible` is seeded from the geofenceEligible prop and kept live by
                the mdf:geofence-eligibility subscription above; with both geofence
                flags OFF App.js never flips it false, so this renders exactly as
                today (DARK-SHIP INVARIANT). The button keeps the defensive
                disabled={!eligible} in case it is ever rendered in a false state. */}
            {eligible ? (
              <>
                <fieldset id="mdf-target-confirm">
                  <legend>{t('page.form.legend_step3')}</legend>
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
                  {/* EXT-DBLSUBMIT-01: this branch was dead (`{false ? …}`), so the
                      busy spinner never rendered and the button was never disabled
                      during an in-flight publish — a rapid double-tap wrote the pin
                      twice. It is now driven by the real `isPublishing` signal (App.js
                      state, threaded via AppMapGrid). With no publish in flight
                      isPublishing is false, so the button renders byte-identically to
                      before (DARK-SHIP INVARIANT); while publishing, the spinner shows
                      and the button leaves the DOM so it cannot be tapped again. */}
                  {isPublishing ? (
                    <CircularProgress aria-label={t('mainctl.confirm.aria_busy')} />
                  ) : (
                    <button
                      type="button"
                      className={`SubmitButton marcar-local${hasMarker ? ' marcar-local--ready' : ''}`}
                      onClick={onClickMap}
                      aria-label={hasMarker ? t('mainctl.confirm.aria_ready') : t('mainctl.confirm.aria_pending')}
                      aria-disabled={!hasMarker}
                      disabled={!eligible || isPublishing}
                    >
                      {hasMarker ? t('mainctl.confirm.label_ready') : t('mainctl.confirm.label')}
                    </button>
                  )}
                </fieldset>
              </>
            ) : (
              <p className='mdf-geofence-notice' role='note'>{t('page.geofence.controls_hidden')}</p>
            )}
          </div>

          {eligible ? (
            <>
              <figure><center>{t('page.form.or')}</center></figure>
              <InserirEndereco
                alimento={alimento}
                telefone={telefoneEncryptado}
                diaSemana={diaSemana}
                horario={horario}
                redesocial={redesocial}
                mes={mes}
              />
            </>
          ) : null}
        </div>
      </Paper>
    </Grid>
  );
};

export default MainControls;
