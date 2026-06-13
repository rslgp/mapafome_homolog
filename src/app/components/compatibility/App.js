'use client';

import React, { Component } from 'react';
import './App.css';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import Header from './components/header';

import Sugestao from './components/googlesheets/sugestao';

import StepsHint from './components/ux/StepsHint';
// GuidedTutorial / NotificationPrefs / the presentational components (MainMap,
// MainControls, InfoPanel, ReportSheet, ContextBar, PinDetailSheet, OfflineToast,
// ListView, LiveAnnouncer, PinReadout, VersionFooter, TapDebugOverlay,
// EmptyViewportOverlay, ViewMoreCue) + MUI Grid are now imported by the extracted
// view components (AppMain / AppMapGrid / AppOverlays). App.js keeps only the
// NON-component named exports it still calls directly.
import { hasSeenTour } from './components/ux/GuidedTutorial';
import { trackReportStarted, trackError } from './components/ux/analytics';
import { t } from './components/ux/strings';
import { hasActedOnPin, markActedOnPin } from './components/ux/NotificationPrefs';
import IosKeyboardInset from './components/ux/IosKeyboardInset';
import { registerOnce as registerServiceWorker } from './components/ux/swRegister';
import InstallToast from './components/ux/InstallToast';
import { enqueue as enqueuePublish, bindOnlineFlush, queueSize } from './components/ux/publishQueue';
// import CoffeeTable from './components/table';
// import ReactGA from 'react-ga';

//call to action content creators
import CreatorsMapaFome from './components/CreatorsMapaFome.js'

import envVariables, { setActiveCountryResolver } from './components/variaveisAmbiente';
import { activeCountryFor } from './components/geofence';
import * as countryStore from './components/countryStore';
import { INTL_ENABLED } from './components/intlConfig';

import qr from './images/qr.svg';

// Material-UI
import Paper from '@mui/material/Paper';
// Grid moved to AppMapGrid.js (the only consumer of the 2-column layout).

import CleanOld from './components/googlesheets/cleanold';
import { appendRow as sheetsAppendRow, updatePinDadosByCoords, getSheet as sheetsGetSheet } from './components/googlesheets/sheetsClient';

import insta from './images/insta.svg';

// import AesEncryption from "./components/security/Aes";
import AesEncryption from 'aes-encryption';

import { getCookie, setCookie } from './components/cookies';

import { runMain, installDebugHelpers } from './appMainBootstrap';
import { coordsFromPin } from './domain/pinCoords';
import { normalizeTelefoneInput } from './domain/telefoneInput';
import { alimentoFieldVisibility } from './domain/alimentoFieldVisibility';
import * as pinActions from './appPinActions';
import AppMain from './AppMain';
import AppOverlays from './AppOverlays';

const EXPIRE_DAY = 7;
const aes = new AesEncryption();

// Google Analytics
/*
function initializeReactGA() {
  ReactGA.initialize('UA-172868315-1');
  ReactGA.pageview(window.location.pathname + window.location.search);
}

initializeReactGA();
*/
aes.setSecretKey(process.env.NEXT_PUBLIC_CRYPTSEED + "F");

const { GoogleSpreadsheet } = require('google-spreadsheet');

// Google Sheets Document ID -- PROD
const doc = new GoogleSpreadsheet(process.env.NEXT_PUBLIC_GOOGLESHEETID);

// Google Sheets Document ID -- DEV
// const doc = new GoogleSpreadsheet('1jQI6PstbEArW_3xDnGgPJR6_37r_KjLoa765bOgMBhk');

// Provider for leaflet-geosearch plugin
const provider = new OpenStreetMapProvider();
//limit osm https://operations.osmfoundation.org/policies/nominatim/




class App extends Component {

  // Initial state
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      dataMaps: [],
      dataHeader: [{ label: "Índice" }, { label: "Lugar" }],
      rowCount: '',
      center: [-8.0671132, -34.8766719],
      alimento: 'Alimento pronto',
      telefone: '',
      telefoneEncryptado: '',
      diaSemana: '',
      horario: '',
      mes: '',
      filtro: "Todos",
      lastMarkedCoords: [],
      numero: '',
      telefoneFilterLocal: false,
      ultimoAnoFilterLocal: false,
      site: '',
      redesocial: '',
      tourOpen: false,
      activeStep: 1,
      reportSheetOpen: false,
      reportSheetCoords: null,
      pingCoords: null,
      selectedPin: null,
      pinSheetOpen: false,
      nowTick: Date.now(),
      offlineToast: null,
      listOpen: false,
      notifOpen: false,
      canOpenNotif: false,
    }

    this.handleStartTour = this.handleStartTour.bind(this);
    this.handleCloseTour = this.handleCloseTour.bind(this);
    this.handleOpenReportSheet = this.handleOpenReportSheet.bind(this);
    this.handleCloseReportSheet = this.handleCloseReportSheet.bind(this);
    this.handlePublishFromSheet = this.handlePublishFromSheet.bind(this);
    this.handlePinDroppedOnMap = this.handlePinDroppedOnMap.bind(this);
    this.handleReporterPinClick = this.handleReporterPinClick.bind(this);
    this.handleClosePinSheet = this.handleClosePinSheet.bind(this);
    this.handleClaimPin = this.handleClaimPin.bind(this);
    this.handleMarkAttended = this.handleMarkAttended.bind(this);

    this.dropDownMenuSemanaEntregaAlimentoPronto = React.createRef();
    this.dropDownMenuHorarioEntregaAlimentoPronto = React.createRef();
    this.dropDownMenuSemanaPrecisandoBuscar = React.createRef();
    this.dropDownMenuHorarioPrecisandoBuscar = React.createRef();
    this.dropDownMenuFiltro = React.createRef();
    this.redesocialRef = React.createRef();
    this.dropDownMenuRedeSocial = React.createRef();
    this.dropDownMenuMesPrecisandoBuscar = React.createRef();
    this.dropDownMenuMesEntregaAlimentoPronto = React.createRef();


    this.handleChangeNumero = this.handleChangeNumero.bind(this);

    this.setTipoAlimento = this.setTipoAlimento.bind(this);
    this.handleChangeTelefone = this.handleChangeTelefone.bind(this);
    this.setDiaSemana = this.setDiaSemana.bind(this);
    this.setHorario = this.setHorario.bind(this);
    this.setMes = this.setMes.bind(this);
    this.setFiltro = this.setFiltro.bind(this);
    this.removerPonto = this.removerPonto.bind(this);
    this.avaliar = this.avaliar.bind(this);
    this.handleClickMap = this.handleClickMap.bind(this);
    this.telefoneFilterChange = this.telefoneFilterChange.bind(this);
    this.ultimoAnoFilterChange = this.ultimoAnoFilterChange.bind(this);
    this.handleChangeRedeSocial = this.handleChangeRedeSocial.bind(this);

    this.verificarPonto = this.verificarPonto.bind(this);
    this.contabilizarClicado = this.contabilizarClicado.bind(this);
    this.clicouTelefone = this.clicouTelefone.bind(this);
    this.entregarAlimento = this.entregarAlimento.bind(this);

    // Collaborators passed into the extracted pin sheets-service layer
    // (appPinActions.js) so that module stays a pure function of its inputs —
    // same precedent as appMainBootstrap's bootstrapDeps. Built once; the thin
    // wrapper methods below forward `this` + this object.
    this._pinDeps = {
      envVariables, EXPIRE_DAY,
      sheetsAppendRow, updatePinDadosByCoords, trackError,
      getCookie, setCookie, coordsFromPin,
    };
  }

  telefoneFilterChange(event) {
    envVariables.telefoneFilter = !envVariables.telefoneFilter;
    this.setState({
      telefoneFilterLocal: envVariables.telefoneFilter
    });
  }

  ultimoAnoFilterChange(event) {
    envVariables.ultimoAnoFilter = !envVariables.ultimoAnoFilter;
    this.setState({
      ultimoAnoFilterLocal: envVariables.ultimoAnoFilter
    });
  }

  // Thin wrappers over the extracted pin sheets-service layer (appPinActions.js).
  // Each forwards `this` + the shared deps; the bodies live in that module so
  // App.js stays under the FF1 LOC budget. No behavior change.
  removerPonto(coords, categoriaPonto) {
    pinActions.removerPonto(this, this._pinDeps, coords, categoriaPonto);
  }

  verificarPonto(coords, categoriaPonto) {
    pinActions.verificarPonto(this, this._pinDeps, coords, categoriaPonto);
  }

  contabilizarClicado(coords) {
    pinActions.contabilizarClicado(this, this._pinDeps, coords);
  }

  clicouTelefone(coords) {
    pinActions.clicouTelefone(this, this._pinDeps, coords);
  }

  entregarAlimento(coords) {
    pinActions.entregarAlimento(this, this._pinDeps, coords);
  }

  avaliar(coords, avaliacao) {
    pinActions.avaliar(this, this._pinDeps, coords, avaliacao);
  }

  setFiltro(event) {
    this.setState({
      filtro: event.target.value
    });
  }
  setTipoAlimento(event) {
    if (!this._reportStartedFired) {
      this._reportStartedFired = true;
      trackReportStarted({ entryPoint: 'main_controls' });
    }
    this.setState({
      alimento: event.target.value
    });

    // Pure field-visibility branching lives in domain/alimentoFieldVisibility.js;
    // the DOM side effects (ref show/hide + seeding diaSemana/horario/mes from the
    // shown refs' current values) stay here as a thin applier. Same precedent as
    // handleChangeTelefone delegating to domain/telefoneInput.js.
    const vis = alimentoFieldVisibility(event.target.value);

    this.dropDownMenuSemanaPrecisandoBuscar.current.style.display = "none";
    this.dropDownMenuHorarioPrecisandoBuscar.current.style.display = "none";
    this.dropDownMenuMesPrecisandoBuscar.current.style.display = "none";
    this.dropDownMenuSemanaEntregaAlimentoPronto.current.style.display = "none";
    this.dropDownMenuHorarioEntregaAlimentoPronto.current.style.display = "none";
    this.dropDownMenuMesEntregaAlimentoPronto.current.style.display = "none";

    if (vis.precisandoBuscar) {
      this.dropDownMenuSemanaPrecisandoBuscar.current.style.display = "";
      this.dropDownMenuHorarioPrecisandoBuscar.current.style.display = "";
      this.dropDownMenuMesPrecisandoBuscar.current.style.display = "";
      this.setState({
        diaSemana: this.dropDownMenuSemanaPrecisandoBuscar.current.value,
        horario: this.dropDownMenuHorarioPrecisandoBuscar.current.value,
        mes: this.dropDownMenuMesPrecisandoBuscar.current.value
      });

    } else
      if (vis.entregaAlimentoPronto) {
        this.dropDownMenuSemanaEntregaAlimentoPronto.current.style.display = "";
        this.dropDownMenuHorarioEntregaAlimentoPronto.current.style.display = "";
        this.dropDownMenuMesEntregaAlimentoPronto.current.style.display = "";

        this.setState({
          diaSemana: this.dropDownMenuSemanaEntregaAlimentoPronto.current.value,
          horario: this.dropDownMenuHorarioEntregaAlimentoPronto.current.value,
          mes: this.dropDownMenuMesEntregaAlimentoPronto.current.value
        });

      }
      else {
        this.setState({
          diaSemana: '',
          horario: '',
          mes: ''
        });

      }

    if (vis.showRedeSocial) {
      this.redesocialRef.current.style.display = "";
      this.dropDownMenuRedeSocial.current.style.display = "";
    } else {
      this.redesocialRef.current.style.display = "none";
      this.dropDownMenuRedeSocial.current.style.display = "none";
    }

  }

  setDiaSemana(event) {
    this.setState({
      diaSemana: event.target.selectedOptions[0].value
    });
    // console.log(this.dropDownMenuSemana.current.value);
    // console.log(event.target.selectedOptions[0].value);
    // console.log(this.state.diaSemana);
  }


  setHorario(event) {
    this.setState({
      horario: event.target.selectedOptions[0].value
    });
    // console.log(this.dropDownMenuSemana.current.value);
    // console.log(event.target.selectedOptions[0].value);
    // console.log(this.state.diaSemana);
  }

  setMes(event) {
    this.setState({
      mes: event.target.selectedOptions[0].value
    });
    // console.log(this.dropDownMenuSemana.current.value);
    // console.log(event.target.selectedOptions[0].value);
    // console.log(this.state.diaSemana);
  }

  handleChangeTelefone(event) {
    // Pure normalization (B15 country-code strip + digit-count validity) lives in
    // domain/telefoneInput.js; the side effects (encrypt + setState) stay here.
    const normalized = normalizeTelefoneInput(event.target.value);
    if (normalized.tooLong) return;
    const { digits: telefoneValue, isValidBr } = normalized;
    // Only mark as valid (and encrypt) when the digit count matches a real
    // BR phone — 10 (landline + DDD) or 11 (mobile + DDD). Anything else
    // is in-progress input or a non-BR number; we still let the user keep
    // typing but don't lock in the encrypted value.
    if (isValidBr) {
      this.setState({ telefoneEncryptado: aes.encrypt(telefoneValue) });
    } else if (telefoneValue.length === 0) {
      this.setState({ telefoneEncryptado: '' });
    }
    this.setState({ telefone: telefoneValue, telefoneInvalid: telefoneValue.length > 0 && !isValidBr });
  }

  handleChangeRedeSocial(event) {
    let site = event.target.value;
    if (site.length > 30) return;
    this.setState({ site: site, redesocial: this.dropDownMenuRedeSocial.current.value + site });

  }


  handleChangeNumero(event) {
    if (event.target.value.length > 10) return;
    let numero = event.target.value.replace(/[^0-9]/g, '');
    this.setState({ numero: numero });
  }

  handleClickMap() {
    // Resolve a coordinate pair before any async work:
    //   1. Preferred: the pin the user dropped on the map (envVariables.lastMarked — a Leaflet marker).
    //   2. Fallback: the user's GPS (envVariables.currentLocation), behind an explicit confirm prompt
    //      so we never silently publish using a location the user did not choose.
    //   3. Otherwise: friendly instruction, no publish.
    let latlng;
    if (envVariables.lastMarked !== undefined) {
      const { lat, lng } = envVariables.lastMarked.getLatLng();
      latlng = [lat, lng];
      envVariables.lastMarked.latlng = latlng;
    } else if (envVariables.currentLocation) {
      const ok = window.confirm(
        'Você ainda não marcou um ponto no mapa.\n\nUsar sua localização atual para publicar este ponto?'
      );
      if (!ok) return;
      latlng = envVariables.currentLocation;
    } else {
      alert('Toque no mapa para escolher o local, ou permita o uso da sua localização no navegador.');
      return;
    }

    if (!envVariables.dentroLimites(latlng)) {
      alert('Região não suportada');
      return;
    }

    this.setState({ isLoading: true });
    // The async Sheets write lives in appPinActions.publishPinFromMap (deps-
    // injected like appMainBootstrap). The synchronous coordinate resolution +
    // bounds check above stays here because it reads DOM/env + component state.
    pinActions.publishPinFromMap(this, this._pinDeps, latlng);
  }

  handleStartTour() {
    this.setState({ tourOpen: true });
  }

  handleCloseTour() {
    this.setState({ tourOpen: false });
  }

  handleOpenReportSheet() {
    // Prefer a pin dropped on the map; fall back to GPS; else current center.
    let coords = null;
    if (envVariables.lastMarked && typeof envVariables.lastMarked.getLatLng === 'function') {
      const ll = envVariables.lastMarked.getLatLng();
      coords = [ll.lat, ll.lng];
    } else if (envVariables.currentLocation && envVariables.currentLocation.length === 2) {
      coords = envVariables.currentLocation;
    } else {
      coords = this.state.center;
    }
    trackReportStarted({ entryPoint: 'fab' });
    this.setState({ reportSheetOpen: true, reportSheetCoords: coords });
  }

  handleCloseReportSheet() {
    this.setState({ reportSheetOpen: false });
  }

  handlePinDroppedOnMap(coords) {
    trackReportStarted({ entryPoint: 'map_long_press' });
    this.setState({ reportSheetOpen: true, reportSheetCoords: coords });
  }

  handleReporterPinClick(pin) {
    this.setState({ selectedPin: pin, pinSheetOpen: true });
  }

  handleClosePinSheet() {
    this.setState({ pinSheetOpen: false });
  }

  // M3 — soft claim. Writes a { claimedAt } entry into the pin's Dados.Claims
  // array so other donors loading the sheet see an active claim. Stored in
  // localStorage too so THIS session's donor sees the "Marcar como atendido"
  // swap without another fetch. Soft by design — no hard lock.
  async handleClaimPin(pin) {
    const coords = coordsFromPin(pin);
    if (!coords) return;

    const claim = { claimedAt: new Date().toISOString() };
    try {
      const key = `mdf_claim_${pin.DateISO || ''}|${coords.join(',')}`;
      window.localStorage.setItem(key, '1');
    } catch (_e) {}
    // M8 — unlock the notifications entry point after first act.
    markActedOnPin();
    this.setState({ canOpenNotif: true });

    // Mutate the in-memory row so the sheet re-renders with "Alguém a caminho".
    pin.Claims = Array.isArray(pin.Claims) ? [...pin.Claims, claim] : [claim];
    this.setState({ selectedPin: { ...pin } });

    // Best-effort persist to Google Sheets — failure is non-blocking so the
    // donor's intent is never lost to a network hiccup.
    try {
      await this.persistPinPatch(pin, (dados) => {
        dados.Claims = Array.isArray(dados.Claims) ? [...dados.Claims, claim] : [claim];
      });
    } catch (e) {
      console.warn('[claim] persist failed:', e && e.message);
    }
  }

  async handleMarkAttended(pin) {
    pin.AlimentoEntregue = 1;
    pin.AttendedAt = new Date().toISOString();
    this.setState({ selectedPin: { ...pin } });
    // Give the sheet's attended-transition 400ms to play, then close.
    setTimeout(() => {
      this.setState({
        pinSheetOpen: false,
        offlineToast: t('pin.after_attended'),
      });
    }, 500);
    try {
      await this.persistPinPatch(pin, (dados) => {
        dados.AlimentoEntregue = 1;
        dados.AttendedAt = pin.AttendedAt;
      });
    } catch (e) {
      console.warn('[attended] persist failed:', e && e.message);
    }
  }

  // Thin wrappers over the extracted pin sheets-service layer (appPinActions.js).
  // The bodies — locate-row-and-mutate (persistPinPatch) and the timeout +
  // idempotency-guarded low-level write (writePinToSheets) — live in that module
  // so App.js stays under the FF1 LOC budget. No behavior change; same call sites
  // (handleClaimPin / handleMarkAttended / handlePublishFromSheet / the M7 flush).
  async persistPinPatch(pin, mutate) {
    return pinActions.persistPinPatch(this, this._pinDeps, pin, mutate);
  }

  async writePinToSheets(payload) {
    return pinActions.writePinToSheets(this, this._pinDeps, payload);
  }

  // M1 publish path — writes through writePinToSheets and handles the UX-side
  // effects (ping-ring). Falls back to IndexedDB queue when offline (M7).
  async handlePublishFromSheet(payload) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline) {
      await enqueuePublish(payload);
      this.setState({ offlineToast: t('errors.offline') });
      return;
    }

    try {
      await this.writePinToSheets(payload);
    } catch (err) {
      // Any network-shaped failure goes to the queue so the user does not
      // lose their input. Non-network failures re-throw for the sheet UI.
      const msg = (err && err.message) || '';
      // A slow server (writePinToSheets surfaces 'network_slow' on its 10s
      // timeout) is distinct from a hard offline/network failure: the write
      // may have actually landed server-side. We still queue (the idempotency
      // key dedupes a later flush), but the user-facing copy must say
      // "may have been saved, wait and reload" — errors.server_slow — not the
      // generic offline message, which would misdescribe what happened.
      const isSlow = /network_slow|timeout/i.test(msg);
      const looksLikeNetwork = /network|failed to fetch|offline/i.test(msg);
      if (isSlow) {
        await enqueuePublish(payload);
        this.setState({ offlineToast: t('errors.server_slow') });
        return;
      }
      if (looksLikeNetwork) {
        await enqueuePublish(payload);
        this.setState({ offlineToast: t('errors.offline') });
        return;
      }
      throw err;
    }

    // Trigger M1 post-publish ping-ring on the map at the new pin.
    this.setState({ pingCoords: null }, () => {
      this.setState({ pingCoords: [payload.coords[0], payload.coords[1]] });
      setTimeout(() => this.setState({ pingCoords: null }), 700);
    });
  }

  componentWillUnmount() {
    if (this._urgencyTicker) clearInterval(this._urgencyTicker);
    if (this._unbindOnlineFlush) this._unbindOnlineFlush();
  }

  componentDidMount() {

    // INTL M1 (§4.2) — composition root: wire the POJO's injected country
    // accessor here (client-only, after mount, where window/localStorage exist).
    // variaveisAmbiente stays import-free of the store/flag; it learns the active
    // publish country through this single resolver. With INTL_ENABLED OFF (the
    // dark-ship default) activeCountryFor returns 'br', so dentroLimites is
    // byte-identical to today. This is the only place the store+flag meet the
    // pure POJO.
    setActiveCountryResolver(() => activeCountryFor(INTL_ENABLED, countryStore));

    // M2 — tick once a minute so the context bar and marker urgency re-derive
    // without any backend push. Client clock is the source of truth here; a
    // server-time correction is deferred until real drift is observed.
    this._urgencyTicker = setInterval(() => {
      this.setState({ nowTick: Date.now() });
    }, 60 * 1000);

    // M8 — prior acted-on-pin unlocks the notifications entry.
    if (hasActedOnPin()) this.setState({ canOpenNotif: true });

    // M7 — register SW for offline shell + tile caching, then attach an
    // online-flush handler so queued publishes drain opportunistically.
    registerServiceWorker();
    this._unbindOnlineFlush = bindOnlineFlush(
      (payload) => this.writePinToSheets(payload),
      {
        onResult: ({ succeeded, failed }) => {
          if (succeeded > 0) {
            this.setState({ offlineToast: `${succeeded} ponto${succeeded > 1 ? 's' : ''} publicado${succeeded > 1 ? 's' : ''} agora.` });
          } else if (failed > 0) {
            this.setState({ offlineToast: 'Ainda não foi possível enviar os pontos salvos. Tentaremos de novo quando voltar a conexão.' });
          }
        },
      },
    );
    queueSize().then((n) => {
      if (n > 0) this.setState({ offlineToast: `${n} ponto${n > 1 ? 's' : ''} aguardando conexão.` });
    });

    // First-visit guided tutorial — cookie-gated, contextual, never blocks the map.
    // Defer one tick so the DOM nodes referenced by tour stops exist.
    if (typeof window !== 'undefined' && !hasSeenTour()) {
      setTimeout(() => this.setState({ tourOpen: true }), 600);
    }

    // Google Sheets API
    // Based on https://github.com/theoephraim/node-google-spreadsheet

    var self = this;

    // Collaborators passed into the extracted bootstrap/debug helpers
    // (appMainBootstrap.js) so that module stays a pure function of its inputs.
    const bootstrapDeps = { doc, envVariables, aes, sheetsGetSheet };

    console.log('[geo] requesting device location...');
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const coords = [position.coords.latitude, position.coords.longitude];
        console.log('[geo] SUCCESS - device coords:', coords);
        envVariables.currentLocation = coords;
        self.setState({ center: coords }, function () {
          console.log('[geo] state.center after setState:', self.state.center);
          runMain(self, bootstrapDeps);
        });
      },
      function (err) {
        console.warn('[geo] FAILED (code=' + err.code + '):', err.message, '- using default center:', self.state.center);
        runMain(self, bootstrapDeps);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    installDebugHelpers(self, bootstrapDeps);

  }



  render() {
    // Compose the extracted presentational components (AppMain / AppOverlays,
    // which itself renders AppMapGrid). They are pure of `this`: the state, the
    // bound handlers, and the dropdown refs are passed in. The inline arrows
    // below preserve the exact setState bodies that previously lived inline in
    // renderMain()/renderOverlays() (onOpenList / onDismiss / onSelectPin /
    // onClose / onClose-notif), so behavior is unchanged — only the render-tree
    // location of the JSX moved out of this class.
    const handlers = {
      // pin map callbacks
      removerPonto: this.removerPonto,
      verificarPonto: this.verificarPonto,
      entregarAlimento: this.entregarAlimento,
      avaliar: this.avaliar,
      contabilizarClicado: this.contabilizarClicado,
      clicouTelefone: this.clicouTelefone,
      handlePinDroppedOnMap: this.handlePinDroppedOnMap,
      handleReporterPinClick: this.handleReporterPinClick,
      // controls callbacks
      setFiltro: this.setFiltro,
      setTipoAlimento: this.setTipoAlimento,
      setDiaSemana: this.setDiaSemana,
      setHorario: this.setHorario,
      setMes: this.setMes,
      handleChangeTelefone: this.handleChangeTelefone,
      handleChangeNumero: this.handleChangeNumero,
      handleChangeRedeSocial: this.handleChangeRedeSocial,
      handleClickMap: this.handleClickMap,
      telefoneFilterChange: this.telefoneFilterChange,
      ultimoAnoFilterChange: this.ultimoAnoFilterChange,
      // <main> inline handler (was inline in renderMain)
      onOpenList: () => this.setState({ listOpen: true }),
      // overlay callbacks
      handleCloseTour: this.handleCloseTour,
      handleOpenReportSheet: this.handleOpenReportSheet,
      handleCloseReportSheet: this.handleCloseReportSheet,
      handlePublishFromSheet: this.handlePublishFromSheet,
      handleClosePinSheet: this.handleClosePinSheet,
      handleClaimPin: this.handleClaimPin,
      handleMarkAttended: this.handleMarkAttended,
      // overlay inline handlers (were inline in renderOverlays)
      onDismissOfflineToast: () => this.setState({ offlineToast: null }),
      onSelectPinFromList: (pin) => this.setState({ listOpen: false, selectedPin: pin, pinSheetOpen: true }),
      onCloseList: () => this.setState({ listOpen: false }),
      onCloseNotif: () => this.setState({ notifOpen: false }),
    };

    const refs = {
      dropDownMenuSemanaEntregaAlimentoPronto: this.dropDownMenuSemanaEntregaAlimentoPronto,
      dropDownMenuHorarioEntregaAlimentoPronto: this.dropDownMenuHorarioEntregaAlimentoPronto,
      dropDownMenuSemanaPrecisandoBuscar: this.dropDownMenuSemanaPrecisandoBuscar,
      dropDownMenuHorarioPrecisandoBuscar: this.dropDownMenuHorarioPrecisandoBuscar,
      dropDownMenuFiltro: this.dropDownMenuFiltro,
      redesocialRef: this.redesocialRef,
      dropDownMenuRedeSocial: this.dropDownMenuRedeSocial,
      dropDownMenuMesPrecisandoBuscar: this.dropDownMenuMesPrecisandoBuscar,
      dropDownMenuMesEntregaAlimentoPronto: this.dropDownMenuMesEntregaAlimentoPronto,
    };

    return (
      <div className="App">
        <IosKeyboardInset />
        <InstallToast />
        <Header
          rowCountProp={this.state.rowCount}
          onStartTour={this.handleStartTour}
          onStartReport={this.handleOpenReportSheet}
        />
        <StepsHint
          activeStep={this.state.activeStep}
        />
        <AppMain state={this.state} handlers={handlers} refs={refs} />
        <AppOverlays state={this.state} handlers={handlers} />
      </div >
    );
  }
}

export default App;
