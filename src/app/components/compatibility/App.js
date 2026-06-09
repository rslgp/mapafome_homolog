'use client';

import React, { Component } from 'react';
import './App.css';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import Header from './components/header';

import Sugestao from './components/googlesheets/sugestao';

import MainMap from './components/MainMap';
import MainControls from './components/MainControls';
import InfoPanel from './components/InfoPanel';
import StepsHint from './components/ux/StepsHint';
import GuidedTutorial, { hasSeenTour } from './components/ux/GuidedTutorial';
import { trackReportStarted, trackError } from './components/ux/analytics';
import ReportSheet from './components/ux/ReportSheet';
import ContextBar from './components/ux/ContextBar';
import PinDetailSheet from './components/ux/PinDetailSheet';
import OfflineToast from './components/ux/OfflineToast';
import ListView from './components/ux/ListView';
import { t } from './components/ux/strings';
import LiveAnnouncer from './components/ux/LiveAnnouncer';
import PinReadout from './components/PinReadout';
import VersionFooter from './components/VersionFooter';
import TapDebugOverlay from './components/_debug/TapDebugOverlay';
import EmptyViewportOverlay from './components/ux/EmptyViewportOverlay';
import ViewMoreCue from './components/ux/ViewMoreCue';
import NotificationPrefs, { hasActedOnPin, markActedOnPin } from './components/ux/NotificationPrefs';
import IosKeyboardInset from './components/ux/IosKeyboardInset';
import { registerOnce as registerServiceWorker } from './components/ux/swRegister';
import InstallToast from './components/ux/InstallToast';
import { enqueue as enqueuePublish, bindOnlineFlush, queueSize } from './components/ux/publishQueue';
// import CoffeeTable from './components/table';
// import ReactGA from 'react-ga';

//call to action content creators
import CreatorsMapaFome from './components/CreatorsMapaFome.js'

import envVariables from './components/variaveisAmbiente';

import qr from './images/qr.svg';

// Material-UI
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';

import CleanOld from './components/googlesheets/cleanold';
import { appendRow as sheetsAppendRow, updatePinDadosByCoords, getSheet as sheetsGetSheet } from './components/googlesheets/sheetsClient';

import insta from './images/insta.svg';

// import AesEncryption from "./components/security/Aes";
import AesEncryption from 'aes-encryption';

import { getCookie, setCookie } from './components/cookies';

import { runMain, installDebugHelpers } from './appMainBootstrap';

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

  removerPonto(coords, categoriaPonto) {
    const motivo = prompt("por qual motivo (em resumo) gostaria de deletar esse ponto?");
    if (motivo === null) return;
    const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };
    sheetsAppendRow(4, row)
      .then(() => alert("pedido de deletar enviado com sucesso"))
      .catch(() => alert("ERRO, tente novamente"));
  }

  verificarPonto(coords, categoriaPonto) {
    const motivo = prompt("Insira o CNPJ da entidade, nome da entidade, nome do responsável, email, telefone e se é credenciada para receber recurso do governo");
    if (motivo === null) return;
    const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };
    sheetsAppendRow(3, row)
      .then(() => alert("pedido de cnpj enviado com sucesso"))
      .catch(() => alert("ERRO, tente novamente"));
  }

  contabilizarClicado(coords) {
    const coordsStr = JSON.stringify(coords);
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
      dados.clicado = (dados.clicado || 0) + 1;
    }).catch((e) => trackError('pin_update', e, { op: 'click_count' }));
  }

  clicouTelefone(coords) {
    const coordsStr = JSON.stringify(coords);
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
      dados.clickTel = (dados.clickTel || 0) + 1;
    }).catch((e) => trackError('pin_update', e, { op: 'tel_click_count' }));
  }

  entregarAlimento(coords) {
    const coordsStr = JSON.stringify(coords);
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
      dados.AlimentoEntregue = (dados.AlimentoEntregue || 0) + 1;
    })
      .then((row) => { if (row) window.location.reload(); })
      .catch((e) => trackError('pin_update', e, { op: 'mark_delivered' }));
  }

  avaliar(coords, avaliacao) {
    const coordsStr = JSON.stringify(coords);
    const coordsKey = Array.isArray(coords) ? coords.join(',') : String(coords);
    const cookieName = 'pontosAvaliados';
    const pontos = getCookie(cookieName) || '';

    // Cookie gate runs FIRST so a repeat click on an already-rated point
    // gives the user an honest "já avaliou" message instead of a silent
    // no-op that looks like the stars are broken.
    if (pontos.includes(coordsKey)) {
      this.setState({ offlineToast: 'Você já avaliou este ponto. Obrigado!' });
      return;
    }

    const rating = avaliacao == null ? 5 : avaliacao;
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
      if (!dados.Avaliacao) dados.Avaliacao = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      dados.Avaliacao[rating] = (dados.Avaliacao[rating] || 0) + 1;
    })
      .then((row) => {
        if (!row) {
          this.setState({ offlineToast: 'Ponto não encontrado. Recarregue a página e tente novamente.' });
          return;
        }
        const cookieExpireDate = new Date();
        cookieExpireDate.setDate(cookieExpireDate.getDate() + EXPIRE_DAY);
        setCookie(cookieName, pontos + coordsKey, { path: '/', expires: cookieExpireDate });
        // No full page reload — reload() wiped in-progress tour state and made
        // the interaction feel violent. Toast is enough; next natural fetch
        // will pick up the refreshed count.
        this.setState({ offlineToast: 'Avaliação registrada. Obrigado!' });
      })
      .catch((e) => {
        console.error('[avaliar] failed:', e);
        this.setState({ offlineToast: 'Não foi possível enviar sua avaliação. Tente de novo em alguns segundos.' });
      });
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

    let isPrecisandoBuscar = event.target.value === 'PrecisandoBuscar',
      isEntregaAlimentoPronto = event.target.value === 'EntregaAlimentoPronto',
      isDoador = event.target.value === 'Doador';

    this.dropDownMenuSemanaPrecisandoBuscar.current.style.display = "none";
    this.dropDownMenuHorarioPrecisandoBuscar.current.style.display = "none";
    this.dropDownMenuMesPrecisandoBuscar.current.style.display = "none";
    this.dropDownMenuSemanaEntregaAlimentoPronto.current.style.display = "none";
    this.dropDownMenuHorarioEntregaAlimentoPronto.current.style.display = "none";
    this.dropDownMenuMesEntregaAlimentoPronto.current.style.display = "none";

    if (isPrecisandoBuscar) {
      this.dropDownMenuSemanaPrecisandoBuscar.current.style.display = "";
      this.dropDownMenuHorarioPrecisandoBuscar.current.style.display = "";
      this.dropDownMenuMesPrecisandoBuscar.current.style.display = "";
      this.setState({
        diaSemana: this.dropDownMenuSemanaPrecisandoBuscar.current.value,
        horario: this.dropDownMenuHorarioPrecisandoBuscar.current.value,
        mes: this.dropDownMenuMesPrecisandoBuscar.current.value
      });

    } else
      if (isEntregaAlimentoPronto) {
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

    if (isPrecisandoBuscar || isEntregaAlimentoPronto || isDoador) {
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
    if (event.target.value.length > 15) return;
    let telefoneValue = event.target.value.replace(/[^0-9]/g, '');
    // B15: accept "+55" prefix by stripping the country code so a paste of
    // "+5583999998888" normalizes to "83999998888". Only strip if the result
    // would be a valid 10/11-digit BR number; otherwise leave the user's
    // input untouched so they can edit.
    if (telefoneValue.length === 12 && telefoneValue.startsWith('55')) {
      telefoneValue = telefoneValue.slice(2);
    } else if (telefoneValue.length === 13 && telefoneValue.startsWith('55')) {
      telefoneValue = telefoneValue.slice(2);
    }
    // Only mark as valid (and encrypt) when the digit count matches a real
    // BR phone — 10 (landline + DDD) or 11 (mobile + DDD). Anything else
    // is in-progress input or a non-BR number; we still let the user keep
    // typing but don't lock in the encrypted value.
    const isValidBr = telefoneValue.length === 10 || telefoneValue.length === 11;
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
    (async function main(self) {
      await doc.useServiceAccountAuth({
        client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
      });

      await doc.loadInfo(); // Loads document properties and worksheets
      const regiao = 0;
      const sheet = doc.sheetsByIndex[regiao];
      // const rows = await sheet.getRows();
      // Total row count

      // if(this.state.numero !== ''){
      //   this.state.numero = ", nº"+this.state.numero;
      // }

      // const row = { 
      //   Roaster: self.state.alimento, 
      //   URL:self.state.numero, 
      //   City: "", 
      //   Coordinates:JSON.stringify([self.props.location[0], self.props.location[1]]), 
      //   DateISO: new Date().toISOString(), 
      //   Telefone: self.props.telefone, 
      //   DiaSemana:self.props.diaSemana,
      //   Horario:self.props.horario,
      //   AlimentoEntregue:0,
      // };

      let dadosRow = {};
      dadosRow.alimento = self.state.alimento;
      dadosRow.numero = "";
      dadosRow.endereco = "";
      dadosRow.coords = latlng;
      dadosRow.telefone = self.state.telefoneEncryptado;
      dadosRow.diaSemana = self.state.diaSemana;
      dadosRow.horario = self.state.horario;
      dadosRow.mes = self.state.mes;
      dadosRow.redesocial = self.state.redesocial;

      let row = envVariables.criarRow(dadosRow);
      // if(self.state.numero !== ''){
      //   self.state.numero = ", nº"+self.state.numero;
      // }
      // let dadosJSON = {
      //   "Roaster": self.state.alimento, 
      //   "Coordinates":JSON.stringify(envVariables.lastMarked.latlng), 
      //   "DateISO": new Date().toISOString(), 
      //   "Telefone": self.state.telefoneEncryptado, 
      //   "AlimentoEntregue":0,
      //   "URL":self.state.numero
      // };

      // if(self.state.alimento==='EntregaAlimentoPronto' || self.state.alimento==='PrecisandoBuscar')
      // {
      //   dadosJSON.DiaSemana=self.state.diaSemana;
      //   dadosJSON.Horario=self.state.horario;

      // }
      // row = { Dados: JSON.stringify(dadosJSON) };

      const result = await sheet.addRow(row);
      // console.log(result);
      window.location.reload();
    })(this);
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
    const coords = (() => {
      if (Array.isArray(pin.mapCoords) && pin.mapCoords.length === 2) return pin.mapCoords;
      try { if (pin.Coordinates) return JSON.parse(pin.Coordinates); } catch (_e) {}
      return null;
    })();
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

  // Shared low-level helper: locate the row by DateISO + Coordinates and
  // apply a mutator function to the parsed Dados JSON, then save.
  async persistPinPatch(pin, mutate) {
    const coords = (() => {
      if (Array.isArray(pin.mapCoords) && pin.mapCoords.length === 2) return pin.mapCoords;
      try { if (pin.Coordinates) return JSON.parse(pin.Coordinates); } catch (_e) {}
      return null;
    })();
    if (!coords) return;

    await doc.useServiceAccountAuth({
      client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();

    const coordStr = JSON.stringify(coords);
    const target = envVariables.rows.find((r) => {
      try {
        const d = JSON.parse(r.Dados);
        return d.Coordinates === coordStr && d.DateISO === pin.DateISO;
      } catch (_e) { return false; }
    });
    if (!target) return;

    const dados = JSON.parse(target.Dados);
    mutate(dados);
    target.Dados = JSON.stringify(dados);
    await target.save();
  }

  // Low-level write: no UI assumptions, throws on any failure. Used both by
  // the interactive publish path and the offline queue flush (M7).
  //
  // M5 additions:
  //   • 10s timeout on any single network step, surfaced as 'network_slow'
  //     so the caller can distinguish from generic failures.
  //   • idempotency guard: if the payload carries an idempotency_key and the
  //     client-side idempotency cache already has it, skip the write.
  async writePinToSheets({ coords, categories, detail, contact, idempotency_key }) {
    if (!coords || !envVariables.dentroLimites(coords)) {
      throw new Error('out_of_bounds');
    }
    if (idempotency_key && this._idempotencyCache && this._idempotencyCache.has(idempotency_key)) {
      return;
    }
    const withTimeout = (p, ms) => new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('network_slow')), ms);
      p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
    await withTimeout(doc.useServiceAccountAuth({
      client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
    }), 10000);
    await withTimeout(doc.loadInfo(), 10000);
    const sheet = doc.sheetsByIndex[0];

    // Primary category string used by existing filters; full M1 array goes
    // into the JSON blob under "Categorias" so future milestones can read it
    // without breaking the current filter UI.
    const dadosRow = {
      alimento: 'MoradorRua',
      numero: '',
      endereco: '',
      coords,
      telefone: '',
      diaSemana: '',
      horario: '',
      mes: '',
      redesocial: contact || '',
    };
    const row = envVariables.criarRow(dadosRow);
    const dadosJSON = JSON.parse(row.Dados);
    dadosJSON.Categorias = categories;
    if (detail) dadosJSON.Detalhe = detail;
    row.Dados = JSON.stringify(dadosJSON);

    await withTimeout(sheet.addRow(row), 10000);
    if (idempotency_key) {
      if (!this._idempotencyCache) this._idempotencyCache = new Set();
      this._idempotencyCache.add(idempotency_key);
    }

    // Stamp the document's last-modified timestamp onto the first row (cell B1).
    // Lets clients cheaply check freshness without scanning all rows.
    try {
      await sheet.loadCells('A1:B1');
      const stampCell = sheet.getCell(0, 1);
      stampCell.value = new Date().toISOString();
      await sheet.saveUpdatedCells();
    } catch (e) {
      // Do not fail the user's publish on a metadata write error.
      console.warn('[lastModified] write failed:', e && e.message);
    }
  }

  // M1 publish path — writes through writePinToSheets and handles the UX-side
  // effects (ping-ring). Falls back to IndexedDB queue when offline (M7).
  async handlePublishFromSheet(payload) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline) {
      await enqueuePublish(payload);
      this.setState({
        offlineToast: 'Você está sem internet. O ponto foi salvo e será enviado quando a conexão voltar.',
      });
      return;
    }

    try {
      await this.writePinToSheets(payload);
    } catch (err) {
      // Any network-shaped failure goes to the queue so the user does not
      // lose their input. Non-network failures re-throw for the sheet UI.
      const msg = (err && err.message) || '';
      const looksLikeNetwork = /network|failed to fetch|offline|timeout/i.test(msg);
      if (looksLikeNetwork) {
        await enqueuePublish(payload);
        this.setState({
          offlineToast: 'Conexão instável. Ponto salvo localmente e enviaremos em breve.',
        });
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



  // The 2-column map + controls row. Extracted from render() verbatim to keep
  // render() within the fitness per-function LOC budget — same JSX/bindings.
  renderMapGrid() {
    return (
      <Grid container spacing={2}>
        <MainMap
          dataMaps={this.state.dataMaps}
          center={this.state.center}
          tileMapOption={this.state.tileMapOption}
          filtro={this.state.filtro}
          telefoneFilterActive={this.state.telefoneFilterLocal}
          ultimoAnoFilterActive={this.state.ultimoAnoFilterLocal}
          onRemoverPonto={this.removerPonto}
          onVerificarPonto={this.verificarPonto}
          onEntregarAlimento={this.entregarAlimento}
          onAvaliar={this.avaliar}
          onContabilizarClicado={this.contabilizarClicado}
          onClicouTelefone={this.clicouTelefone}
          onPinDropped={this.handlePinDroppedOnMap}
          pingCoords={this.state.pingCoords}
          onReporterPinClick={this.handleReporterPinClick}
          nowTick={this.state.nowTick}
        />
        <MainControls
          isLoading={this.state.isLoading}
          alimento={this.state.alimento}
          telefoneEncryptado={this.state.telefoneEncryptado}
          diaSemana={this.state.diaSemana}
          horario={this.state.horario}
          mes={this.state.mes}
          center={this.state.center}
          numero={this.state.numero}
          redesocial={this.state.redesocial}
          telefoneFilterLocal={this.state.telefoneFilterLocal}
          ultimoAnoFilterLocal={this.state.ultimoAnoFilterLocal}
          onFiltroChange={this.setFiltro}
          onTipoAlimentoChange={this.setTipoAlimento}
          onDiaSemanaChange={this.setDiaSemana}
          onHorarioChange={this.setHorario}
          onMesChange={this.setMes}
          onTelefoneChange={this.handleChangeTelefone}
          onNumeroChange={this.handleChangeNumero}
          onRedeSocialChange={this.handleChangeRedeSocial}
          onClickMap={this.handleClickMap}
          onTelefoneFilterChange={this.telefoneFilterChange}
          onUltimoAnoFilterChange={this.ultimoAnoFilterChange}
          dropDownMenuSemanaEntregaAlimentoPronto={this.dropDownMenuSemanaEntregaAlimentoPronto}
          dropDownMenuHorarioEntregaAlimentoPronto={this.dropDownMenuHorarioEntregaAlimentoPronto}
          dropDownMenuSemanaPrecisandoBuscar={this.dropDownMenuSemanaPrecisandoBuscar}
          dropDownMenuHorarioPrecisandoBuscar={this.dropDownMenuHorarioPrecisandoBuscar}
          dropDownMenuFiltro={this.dropDownMenuFiltro}
          redesocialRef={this.redesocialRef}
          dropDownMenuRedeSocial={this.dropDownMenuRedeSocial}
          dropDownMenuMesPrecisandoBuscar={this.dropDownMenuMesPrecisandoBuscar}
          dropDownMenuMesEntregaAlimentoPronto={this.dropDownMenuMesEntregaAlimentoPronto}
        />
      </Grid>
    );
  }

  // The in-flow page content (<main>): the ordered column of sections.
  // Extracted from render() verbatim — same JSX, ordering, and comments.
  renderMain() {
    return (
      <main id="mdf-main" className="mdf-main">
        {/* TV-3 + TV-6 + TV-7 — pin readout pill (hoisted above ContextBar
            on user request 2026-04-30): shows resolved coords of the
            dropped marker and the Limpar reset button. Renders null
            when no marker is placed, so it costs zero vertical space
            until the user taps. Placing it ABOVE the ContextBar makes
            the user's top-priority signal — "this is where Confirmar
            ponto will publish" — the most prominent piece of UI as
            soon as a tap registers. */}
        {/* ─── Page layout (SRP, v5 § solid_quick.SRP + refactoring_patterns.move_function) ───
            Each numbered section below is a sibling at this single level;
            reorder by moving its block within this scope (no other file to
            edit). The Grid owns ONE responsibility (the 2-column map+controls
            row); every other section is independently positioned. */}

        {/* 1. Tap-coord readout — only renders after a tap. */}
        <PinReadout />

        {/* 2. Screen-reader status region. */}
        <LiveAnnouncer dataMaps={this.state.dataMaps} />

        {/* 3. Map + controls — the only Grid in this layout. SRP:
              owns the responsive 2-column map/controls row, nothing else. */}
        {this.renderMapGrid()}

        {/* 4. Scroll affordance — signals there's content below the map. */}
        <ViewMoreCue />

        {/* 5. Diagnostic overlay — opt-in via ?debug=tap. */}
        <TapDebugOverlay />

        {/* 6. Ambient context — point counts + Lista button. */}
        <ContextBar
          key={`ctx-${this.state.nowTick}`}
          dataMaps={this.state.dataMaps}
          userCoords={this.state.center}
          onOpenList={() => this.setState({ listOpen: true })}
        />

        {/* 7. Legend / info surface (#MoreInfo). */}
        <InfoPanel rowCount={this.state.rowCount} />

        {/* 8. Version footer — last child of <main>. Renders nothing
              until /version.json resolves. SRP: shows ONLY the build
              identifier (no other footer concerns). */}
        <VersionFooter />
      </main>
    );
  }

  // Floating overlays + sheets rendered as siblings of <main>: tour, FAB,
  // report/pin sheets, toasts, list, empty-state, notifications. Extracted
  // from render() verbatim. Wrapped in a fragment (no DOM node) so the
  // overlays stay direct children of .App in the same render order.
  renderOverlays() {
    return (
      <>
        <GuidedTutorial
          open={this.state.tourOpen}
          onClose={this.handleCloseTour}
        />

        <button
          type="button"
          className="mdf-fab"
          aria-label="Relatar ponto"
          onClick={this.handleOpenReportSheet}
        >
          +
        </button>

        <ReportSheet
          open={this.state.reportSheetOpen}
          coords={this.state.reportSheetCoords}
          onClose={this.handleCloseReportSheet}
          onPublish={this.handlePublishFromSheet}
        />

        <PinDetailSheet
          open={this.state.pinSheetOpen}
          pin={this.state.selectedPin}
          userCoords={this.state.center}
          onClose={this.handleClosePinSheet}
          onClaim={this.handleClaimPin}
          onMarkAttended={this.handleMarkAttended}
        />

        <OfflineToast
          message={this.state.offlineToast}
          onDismiss={() => this.setState({ offlineToast: null })}
        />

        <ListView
          open={this.state.listOpen}
          dataMaps={this.state.dataMaps}
          userCoords={this.state.center}
          onSelectPin={(pin) => this.setState({ listOpen: false, selectedPin: pin, pinSheetOpen: true })}
          onClose={() => this.setState({ listOpen: false })}
        />

        <EmptyViewportOverlay
          visible={!this.state.isLoading && Array.isArray(this.state.dataMaps) && this.state.dataMaps.length === 0}
          onStartReport={this.handleOpenReportSheet}
        />

        <NotificationPrefs
          open={this.state.notifOpen}
          onClose={() => this.setState({ notifOpen: false })}
        />
      </>
    );
  }

  render() {
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
        {this.renderMain()}
        {this.renderOverlays()}
      </div >
    );
  }
}

export default App;
