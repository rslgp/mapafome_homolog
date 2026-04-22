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
import { trackReportStarted } from './components/ux/analytics';
import ReportSheet from './components/ux/ReportSheet';
import ContextBar from './components/ux/ContextBar';
import PinDetailSheet from './components/ux/PinDetailSheet';
import OfflineToast from './components/ux/OfflineToast';
import { registerOnce as registerServiceWorker } from './components/ux/swRegister';
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

import insta from './images/insta.svg';

// import AesEncryption from "./components/security/Aes";
import AesEncryption from 'aes-encryption';

import Cookies from 'universal-cookie';

const cookies = new Cookies();
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
    }

    this.handleStartTour = this.handleStartTour.bind(this);
    this.handleCloseTour = this.handleCloseTour.bind(this);
    this.handleOpenReportSheet = this.handleOpenReportSheet.bind(this);
    this.handleCloseReportSheet = this.handleCloseReportSheet.bind(this);
    this.handlePublishFromSheet = this.handlePublishFromSheet.bind(this);
    this.handlePinDroppedOnMap = this.handlePinDroppedOnMap.bind(this);
    this.handleReporterPinClick = this.handleReporterPinClick.bind(this);
    this.handleClosePinSheet = this.handleClosePinSheet.bind(this);

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
    console.log("remover " + coords);
    let motivo = prompt("por qual motivo (em resumo) gostaria de deletar esse ponto?");
    if (motivo !== null) {
      (async function main(self) {
        try {
          await doc.useServiceAccountAuth({
            client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
          });

          await doc.loadInfo(); // Loads document properties and worksheets

          const sheet = doc.sheetsByIndex[4];
          //row = { Name: "new name", Value: "new value" };

          const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };

          let r = await sheet.addRow(row);
          console.log(r);

          alert("pedido de deletar enviado com sucesso");
        } catch (e) {
          alert("ERRO, tente novamente");
          //console.log(e);

        }

      })(motivo, coords);
    }
  }

  verificarPonto(coords, categoriaPonto) {
    let motivo = prompt("Insira o CNPJ da entidade, nome da entidade, nome do responsável, email, telefone e se é credenciada para receber recurso do governo");
    if (motivo !== null) {
      (async function main(self) {
        try {
          await doc.useServiceAccountAuth({
            client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
          });

          await doc.loadInfo(); // Loads document properties and worksheets

          const sheet = doc.sheetsByIndex[3];
          //row = { Name: "new name", Value: "new value" };

          const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };

          let r = await sheet.addRow(row);
          console.log(r);

          alert("pedido de cnpj enviado com sucesso");
        } catch (e) {
          alert("ERRO, tente novamente");
          console.log(e);

        }

      })(motivo, coords);
    }
  }

  contabilizarClicado(coords) {
    (async function main(self) {
      try {
        await doc.useServiceAccountAuth({
          client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
        });

        await doc.loadInfo(); // Loads document properties and worksheets

        const sheet = doc.sheetsByIndex[0];
        //row = { Name: "new name", Value: "new value" };
        if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
        const rows = envVariables.rows;
        coords = JSON.stringify(coords);
        let rowEncontrada = rows.filter((x) => {
          //x.Coordinates
          //console.log(JSON.parse(x.Dados).Coordinates);
          return JSON.parse(x.Dados).Coordinates === coords;
        });

        //console.log(rowEncontrada[0].City);
        let dadosNovos = JSON.parse(rowEncontrada[0].Dados);
        if (dadosNovos.clicado) dadosNovos.clicado++;
        else dadosNovos.clicado = 1;
        rowEncontrada[0].Dados = JSON.stringify(dadosNovos);
        await rowEncontrada[0].save();

        //window.location.reload();
      } catch (e) {
        //console.log(e);

      }

    })(coords);
  }

  clicouTelefone(coords) {
    (async function main(self) {
      try {
        await doc.useServiceAccountAuth({
          client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
        });

        await doc.loadInfo(); // Loads document properties and worksheets

        const sheet = doc.sheetsByIndex[0];
        //row = { Name: "new name", Value: "new value" };
        if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
        const rows = envVariables.rows;
        coords = JSON.stringify(coords);
        let rowEncontrada = rows.filter((x) => {
          //x.Coordinates
          //console.log(JSON.parse(x.Dados).Coordinates);
          return JSON.parse(x.Dados).Coordinates === coords;
        });

        //console.log(rowEncontrada[0].City);
        let dadosNovos = JSON.parse(rowEncontrada[0].Dados);
        if (dadosNovos.clickTel) dadosNovos.clickTel++;
        else dadosNovos.clickTel = 1;
        rowEncontrada[0].Dados = JSON.stringify(dadosNovos);
        await rowEncontrada[0].save();

        //window.location.reload();
      } catch (e) {
        //console.log(e);

      }

    })(coords);
  }
  entregarAlimento(coords) {
    (async function main(self) {
      try {
        await doc.useServiceAccountAuth({
          client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
        });

        await doc.loadInfo(); // Loads document properties and worksheets

        const sheet = doc.sheetsByIndex[0];
        //row = { Name: "new name", Value: "new value" };
        if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
        const rows = envVariables.rows;
        coords = JSON.stringify(coords);
        let rowEncontrada = rows.filter((x) => {
          //x.Coordinates
          //console.log(JSON.parse(x.Dados).Coordinates);
          return JSON.parse(x.Dados).Coordinates === coords;
        });

        //console.log(rowEncontrada[0].City);
        let dadosNovos = JSON.parse(rowEncontrada[0].Dados);
        dadosNovos.AlimentoEntregue++;
        rowEncontrada[0].Dados = JSON.stringify(dadosNovos);
        await rowEncontrada[0].save();

        window.location.reload();
      } catch (e) {
        //console.log(e);

      }

    })(coords);
  }

  avaliar(coords, avaliacao) {

    (async function main(coords, avaliacao) {
      try {
        await doc.useServiceAccountAuth({
          client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
        });

        await doc.loadInfo(); // Loads document properties and worksheets

        const sheet = doc.sheetsByIndex[0];
        //row = { Name: "new name", Value: "new value" };

        if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
        const rows = envVariables.rows;
        coords = JSON.stringify(coords);
        let rowEncontrada = rows.filter((x) => {
          //x.Coordinates
          console.log(JSON.parse(x.Dados).Coordinates);
          return JSON.parse(x.Dados).Coordinates === (coords);
        });

        //console.log(rowEncontrada[0].City);
        let dadosNovos = JSON.parse(rowEncontrada[0].Dados);
        if (dadosNovos.Avaliacao == undefined) {
          dadosNovos.Avaliacao = {
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0
          }
        }
        if (avaliacao === null) avaliacao = 5;
        dadosNovos.Avaliacao[avaliacao]++;
        rowEncontrada[0].Dados = JSON.stringify(dadosNovos);

        let cookieName = 'pontosAvaliados';
        let pontos = cookies.get(cookieName) || "";
        coords = JSON.parse(coords);
        let coordsString = coords[0] + "" + coords[1];
        //let pontosEntregues = JSON.parse(pontosEntreguesData);
        if (pontos.includes(coordsString)) return;

        await rowEncontrada[0].save();

        pontos += coordsString;

        const cookieExpireDate = new Date();
        cookieExpireDate.setDate(cookieExpireDate.getDate() + EXPIRE_DAY);

        cookies.set(cookieName, pontos, { path: '/', expires: cookieExpireDate });

        window.location.reload();
      } catch (e) {
        console.log(e);

      }

    })(coords, avaliacao);
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
    if (telefoneValue.length >= 8) {
      this.setState({ telefoneEncryptado: aes.encrypt(telefoneValue) });
    }
    this.setState({ telefone: telefoneValue });
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

  // Low-level write: no UI assumptions, throws on any failure. Used both by
  // the interactive publish path and the offline queue flush (M7).
  async writePinToSheets({ coords, categories, detail, contact }) {
    if (!coords || !envVariables.dentroLimites(coords)) {
      throw new Error('out_of_bounds');
    }
    await doc.useServiceAccountAuth({
      client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
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

    await sheet.addRow(row);

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
          offlineToast: 'Conexão instável. Ponto salvo localmente — enviaremos em breve.',
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

    //current location
    function runMain(self) {
    (async function main(self) {
      // Use service account creds
      await doc.useServiceAccountAuth({
        client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
      });

      await doc.loadInfo(); // Loads document properties and worksheets

      /*https://www.keene.edu/campus/maps/tool/
        long, lat
        x, y
        -52.2070313, 2.20
        -52.4267578, -13.9234039
        -34.3212891, -14.0939572
        -34.3212891, 1.6696855
0: -8.0256189
1: -34.9175702
        -55.4589844, -32.6578757
        -55.5468750, -14.1791861
        -38.1445313, -14.1791861
        -38.0566406, -32.8426736
      */
      //limitar regiao
      let regiao;
      if (envVariables.dentroLimites(self.state.center)) {
        regiao = 0;
      }
      else {
        alert("Região ainda não suportada");
        return;
      }
      const sheet = doc.sheetsByIndex[regiao];
      if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
      const rows = envVariables.rows;
      // Total row count
      self.setState({ rowCount: rows.length });

      // rows.filter( (x) => { return !x.Data}).map( (x) => {
      //   x.Dados = JSON.stringify(
      //     { 
      //       "Roaster": x.Roaster, 
      //       "URL": x.URL, 
      //       "City": x.City, 
      //       "Coordinates": x.Coordinates, 
      //       "DateISO": x.DateISO, 
      //       "Telefone": x.Telefone, 
      //       "DiaSemana": x.DiaSemana,
      //       "Horario": x.Horario,
      //       "AlimentoEntregue": x.AlimentoEntregue
      //     }
      //   );
      //   (async function main(x){

      //   await x.save();
      //   })(x);

      // })
      rows.forEach((x) => {
        let dados = JSON.parse(x.Dados);
        for (let key in dados) {
          x[key] = dados[key];
        }
        // x.Roaster = dados.Roaster;
        // x.URL = dados.URL;
        // x.City = dados.City;
        // x.DateISO = dados.DateISO;
        // x.DiaSemana = dados.DiaSemana;
        // x.Horario = dados.Horario;
        // x.Mes = dados.Mes;
        // x.AlimentoEntregue = dados.AlimentoEntregue;
        // x.RedeSocial = dados.RedeSocial;
        // x.Avaliacao = dados.Avaliacao;

        if (dados.Coordinates) {
          x.mapCoords = JSON.parse(x.Coordinates);
          if (dados.Telefone) {
            try {
              x.Telefone = aes.decrypt(x.Telefone);
            } catch (e) {
              //problema ao decriptar, string nao esta no formato hex
            }
          }
        }

      });
      self.setState({ dataMaps: rows });

      // var needsUpdates = rows.filter((x) => { x = JSON.parse(x); return !x.Coordinates; });
      // if(needsUpdates.length === 0) console.log("nao precisa atualizar");
      // if (needsUpdates && needsUpdates.length > 0) {
      //     for (let index in needsUpdates) {
      //       // if(needsUpdates[index]._rawData.length===0) needsUpdates[index].delete(); //se deixar rows vazias na planilha
      //         let city = needsUpdates[index].City;
      //         setTimeout(() => 
      //             {
      //                 (async function main() {
      //                     try{
      //                         let providerResult = await provider.search({ query: city.replace('-',",") + ', Brazil' });

      //                         if(providerResult.length !== 0 ){
      //                             // throw new Error("endereco-nao-encontrado");

      //                             console.log(providerResult);
      //                             let latlon = [providerResult[0].y, providerResult[0].x];
      //                             needsUpdates[index].Coordinates = JSON.stringify(latlon); // Convert obj to string
      //                             //needsUpdates[index].mapCoords = latlon;
      //                             await needsUpdates[index].save(); // Save to remote Google Sheet
      //                         }
      //                     }catch(e){
      //                         console.log("ERRO");
      //                         console.log(e);
      //                     }
      //                 })();

      //             },1300                        
      //         );

      //     }
      //   self.setState({ dataMaps: rows });
      // }

      // Loading message 
      self.setState({ isLoading: false })

    })(self);
    } // end runMain

    console.log('[geo] requesting device location...');
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const coords = [position.coords.latitude, position.coords.longitude];
        console.log('[geo] SUCCESS - device coords:', coords);
        envVariables.currentLocation = coords;
        self.setState({ center: coords }, function () {
          console.log('[geo] state.center after setState:', self.state.center);
          runMain(self);
        });
      },
      function (err) {
        console.warn('[geo] FAILED (code=' + err.code + '):', err.message, '- using default center:', self.state.center);
        runMain(self);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    window.fixarPonto = function (endereco, coords) {
      (async function main(endereco, coords) {
        try {
          await doc.useServiceAccountAuth({
            client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
          });

          await doc.loadInfo(); // Loads document properties and worksheets

          const sheet = doc.sheetsByIndex[0];

          if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
          const rows = envVariables.rows;

          let rowEncontrada = rows.filter((x) => {
            return JSON.parse(x.Dados).City.includes(endereco);
          }
          );

          rowEncontrada.forEach((x) => {
            let dadosNovos = JSON.parse(x.Dados);
            dadosNovos.Coordinates = JSON.stringify(coords);
            x.Dados = JSON.stringify(dadosNovos);
          });

          for (let x of rowEncontrada) await x.save();

        } catch (e) {

        }

      })(endereco, coords);
    }

    //retornar os pontos proximos a 5km
    window.distance = function () {
      const rows = envVariables.rows;
      let proximos = [];
      rows.forEach((x) => {
        let dado = JSON.parse(x.Dados);
        if (dado.Coordinates) {
          let coords = JSON.parse(dado.Coordinates);
          let distancia = envVariables.distanceInKmBetweenEarthCoordinates(
            envVariables.currentLocation[0],
            envVariables.currentLocation[1],
            coords[0],
            coords[1]);
          dado.distancia = distancia;
          if (distancia < 5) proximos.push(dado);
        }
      });

      proximos.sort(function (a, b) {
        return a.distancia - b.distancia;
      });
      console.log(proximos);

    }
    window.stats = function () {
      (async function main() {
        try {
          await doc.useServiceAccountAuth({
            client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
          });

          await doc.loadInfo(); // Loads document properties and worksheets

          const sheet = doc.sheetsByIndex[0];

          if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
          const rows = envVariables.rows;

          let rowEncontrada = rows.filter((x) => {
            return JSON.parse(x.Dados).clicado;
          }
          );
          var SortedPoints = [];
          var tmp;
          rowEncontrada.forEach((x) => {
            let dadosNovos = JSON.parse(x.Dados);
            if (dadosNovos.Telefone) dadosNovos.Telefone = "https://wa.me/55" + aes.decrypt(dadosNovos.Telefone);
            SortedPoints.push(dadosNovos);
            for (var i = SortedPoints.length - 1; i > 0 && SortedPoints[i].clicado > SortedPoints[i - 1].clicado; i--) {
              tmp = SortedPoints[i];
              SortedPoints[i] = SortedPoints[i - 1];
              SortedPoints[i - 1] = tmp;
            }
          });
          console.log("mais clicados");
          console.log(SortedPoints);


          rowEncontrada = rows.filter((x) => {
            return JSON.parse(x.Dados).clickTel;
          }
          );
          var SortedPoints = [];
          var tmp;
          rowEncontrada.forEach((x) => {
            let dadosNovos = JSON.parse(x.Dados);
            dadosNovos.Telefone = "https://wa.me/55" + aes.decrypt(dadosNovos.Telefone);
            SortedPoints.push(dadosNovos);
            for (var i = SortedPoints.length - 1; i > 0 && SortedPoints[i].clickTel > SortedPoints[i - 1].clickTel; i--) {
              tmp = SortedPoints[i];
              SortedPoints[i] = SortedPoints[i - 1];
              SortedPoints[i - 1] = tmp;
            }
          });
          console.log("mais clicados em telefone");
          console.log(SortedPoints);

          rowEncontrada = rows.filter((x) => {
            return JSON.parse(x.Dados).AlimentoEntregue;
          }
          );
          var SortedPoints = [];
          var tmp;
          rowEncontrada.forEach((x) => {
            let dadosNovos = JSON.parse(x.Dados);
            SortedPoints.push(dadosNovos);
            for (var i = SortedPoints.length - 1; i > 0 && SortedPoints[i].AlimentoEntregue > SortedPoints[i - 1].AlimentoEntregue; i--) {
              tmp = SortedPoints[i];
              SortedPoints[i] = SortedPoints[i - 1];
              SortedPoints[i - 1] = tmp;
            }
          });
          console.log("mais entregues");
          console.log(SortedPoints);


          rowEncontrada = rows.filter((x) => {
            return JSON.parse(x.Dados).Avaliacao;
          }
          );
          var SortedPoints = [];
          var tmp;
          rowEncontrada.forEach((x) => {
            let dadosNovos = JSON.parse(x.Dados);

            let AvaliacaoData = { nota: 0, totalClicks: 0 };
            if (dadosNovos.Avaliacao) {
              AvaliacaoData.totalClicks = (dadosNovos.Avaliacao["5"] + dadosNovos.Avaliacao["4"] + dadosNovos.Avaliacao["3"] + dadosNovos.Avaliacao["2"] + dadosNovos.Avaliacao["1"]);
              if (AvaliacaoData.totalClicks === 0) {
                //dadosNovos.Avaliacao="Nenhuma";
              } else {
                dadosNovos.Avaliacao = (dadosNovos.Avaliacao["5"] * 5 +
                  dadosNovos.Avaliacao["4"] * 4 +
                  dadosNovos.Avaliacao["3"] * 3 +
                  dadosNovos.Avaliacao["2"] * 2 +
                  dadosNovos.Avaliacao["1"] * 1)
                  /
                  (AvaliacaoData.totalClicks);

                AvaliacaoData.nota = Math.round(dadosNovos.Avaliacao * 100) / 100;
                AvaliacaoData.nota = AvaliacaoData.nota * 100000 + AvaliacaoData.totalClicks;
              }
            }

            //AvaliacaoData.nota = dadosNovos.Avaliacao;

            if (AvaliacaoData.nota > 0) SortedPoints.push({ ...JSON.parse(x.Dados), "nota": AvaliacaoData.nota });
            for (var i = SortedPoints.length - 1; i > 0 && SortedPoints[i].nota > SortedPoints[i - 1].nota; i--) {
              tmp = SortedPoints[i];
              SortedPoints[i] = SortedPoints[i - 1];
              SortedPoints[i - 1] = tmp;
            }
          });
          console.log("maiores notas");
          console.log(SortedPoints);


        } catch (e) {

        }

      })();
    }

    //     window.planilhacsv = function (){
    //       (async function main() {
    //         try{
    //           await doc.useServiceAccountAuth({
    //             client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
    //             private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
    //           });

    //           await doc.loadInfo(); // Loads document properties and worksheets

    //           const sheet = doc.sheetsByIndex[0];

    //           if(envVariables.rows===undefined) envVariables.rows = await sheet.getRows();
    //           const rows = envVariables.rows;

    //           let rowEncontrada = rows.filter( (x) => 
    //           {
    //             return JSON.parse(x.Dados).Telefone;
    //           }
    //           );
    //           var planilhacsv="Situação,Telefone,coords,RedeSocial\n";
    //           var tmp;
    //           var result = {};
    //           rowEncontrada.forEach( (x) => 
    //           {
    //             let y = JSON.parse(x.Dados);
    //             planilhacsv+=[y.Roaster,aes.decrypt(y.Telefone),y.Coordinates,y.RedeSocial].toString()+"\n";
    //           });
    //           console.log(planilhacsv);

    //           /**
    //            * 
    //            * {
    //     "11": "São Paulo",
    //     "12": "São Paulo",
    //     "13": "São Paulo",
    //     "14": "São Paulo",
    //     "15": "São Paulo",
    //     "16": "São Paulo",
    //     "17": "São Paulo",
    //     "18": "São Paulo",
    //     "19": "São Paulo",
    //     "21": "Rio de Janeiro",
    //     "22": "Rio de Janeiro",
    //     "24": "Rio de Janeiro",
    //     "27": "Espírito Santo",
    //     "28": "Espírito Santo",
    //     "31": "Minas Gerais",
    //     "32": "Minas Gerais",
    //     "33": "Minas Gerais",
    //     "34": "Minas Gerais",
    //     "35": "Minas Gerais",
    //     "37": "Minas Gerais",
    //     "38": "Minas Gerais",
    //     "41": "Paraná",
    //     "42": "Paraná",
    //     "43": "Paraná",
    //     "44": "Paraná",
    //     "45": "Paraná",
    //     "46": "Paraná",
    //     "47": "Santa Catarina",
    //     "48": "Santa Catarina",
    //     "49": "Santa Catarina",
    //     "51": "Rio Grande do Sul",
    //     "53": "Rio Grande do Sul",
    //     "54": "Rio Grande do Sul",
    //     "55": "Rio Grande do Sul",
    //     "61": "Distrito Federal",
    //     "62": "Goiás",
    //     "63": "Tocantins",
    //     "64": "Goiás",
    //     "65": "Mato Grosso",
    //     "66": "Mato Grosso",
    //     "67": "Mato Grosso do Sul",
    //     "68": "Acre",
    //     "69": "Rondônia",
    //     "71": "Bahia",
    //     "73": "Bahia",
    //     "74": "Bahia",
    //     "75": "Bahia",
    //     "77": "Bahia",
    //     "79": "Sergipe",
    //     "81": "Pernambuco",
    //     "82": "Alagoas",
    //     "83": "Paraíba",
    //     "84": "Rio Grande do Norte",
    //     "85": "Ceará",
    //     "86": "Piauí",
    //     "87": "Pernambuco",
    //     "88": "Ceará",
    //     "89": "Piauí",
    //     "91": "Pará",
    //     "92": "Amazonas",
    //     "93": "Pará",
    //     "94": "Pará",
    //     "95": "Roraima",
    //     "96": "Amapá",
    //     "97": "Amazonas",
    //     "98": "Maranhão",
    //     "99": "Maranhão"
    // }
    //            */


    //         }catch(e){

    //         }

    //       })();
    //     }
  }



  render() {
    return (
      <div className="App">
        <Header
          rowCountProp={this.state.rowCount}
          onStartTour={this.handleStartTour}
          onStartReport={this.handleOpenReportSheet}
        />
        <StepsHint
          activeStep={this.state.activeStep}
          onStartTour={this.handleStartTour}
        />
        <main id="mdf-main" className="mdf-main">
        <ContextBar
          key={`ctx-${this.state.nowTick}`}
          dataMaps={this.state.dataMaps}
          userCoords={this.state.center}
        />
        <Grid container spacing={2}>
          {/* Top row: MainMap (left) and MainControls (right) */}
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

          {/* Bottom row: InfoPanel (full width below) */}
          <InfoPanel rowCount={this.state.rowCount} />

        </Grid>
        </main>

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
          onClose={this.handleClosePinSheet}
        />

        <OfflineToast
          message={this.state.offlineToast}
          onDismiss={() => this.setState({ offlineToast: null })}
        />

      </div >
    );
  }
}

export default App;
