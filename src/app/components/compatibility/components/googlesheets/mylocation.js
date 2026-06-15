import React, { Component } from 'react';

import CircularProgress from '@mui/material/CircularProgress';

import envVariables from '../variaveisAmbiente';
// INTL M3 (UX-1): localize the GPS-publish geofence-rejection alert via
// t('errors.out_of_country') with the active country name.
import { t } from '../ux/strings';
import { getCountry } from '../countries';
import { activeCountryFor } from '../geofence';
import * as countryStore from '../countryStore';
import { INTL_ENABLED } from '../intlConfig';
import { LOCATION_GEOFENCE_ENABLED } from '../geofenceConfig';
import { checkSyncBindingForPin } from '../geofencePublishGuard';

const { GoogleSpreadsheet } = require('google-spreadsheet');


// Google Sheets Document ID -- PROD
const doc = new GoogleSpreadsheet(process.env.REACT_APP_GOOGLESHEETID);

class NameForm extends Component {
    constructor(props) {
      super(props);
      this.state = {
        value: '', 
        location: props.location, 
        alimento: props.alimento, 
        isLoading:false,
        telefone:props.telefone,
        diaSemana:props.diaSemana,
        mes:props.mes,
        numero:props.numero,
        redesocial:props.redesocial,
      };
  
      // this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);


    }

  componentDidMount() {
      
    //salvar acesso  
      
    (async function main(self) {
      try{
        await doc.useServiceAccountAuth({
          client_email: process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.REACT_APP_GOOGLE_PRIVATE_KEY,
        });
    
        await doc.loadInfo(); // Loads document properties and worksheets
    
        const sheet = doc.sheetsByIndex[1];
        
        await sheet.loadCells('A2');
        const a1 = sheet.getCell(1, 0);
        a1.value+=1;
        await sheet.saveUpdatedCells();
      }catch(e){
        
      }
      
    })(this);

  }

    //ATUALIZAR PROPS VINDAS DO PAI
    static getDerivedStateFromProps(nextProps, state) {
      if(state){

        if (nextProps.location !== state.location) {
          state.location = nextProps.location;
        }
        if (nextProps.alimento !== state.alimento){
          state.alimento=nextProps.alimento;
        }
        if (nextProps.telefone !== state.telefone){ 
          state.telefone=nextProps.telefone;
        }
        if (nextProps.diaSemana !== state.diaSemana){ 
          state.diaSemana=nextProps.diaSemana;
        }
        if (nextProps.horario !== state.horario){ 
          state.horario=nextProps.horario;
        }        
        if (nextProps.mes !== state.mes){ 
          state.mes=nextProps.mes;
        }
        if (nextProps.numero !== state.numero){ 
          state.numero=nextProps.numero;
        }
        if (nextProps.redesocial !== state.redesocial){ 
          state.redesocial=nextProps.redesocial;
        }
      }
      return state;
    }
  
    // handleChange(event) {
    //   this.setState({value: event.target.value});
    // }
  
    handleSubmit(event) {
        //navigator.geolocation.getCurrentPosition(function(position) {
        if(this.state.location[0]===-8.0671132 && this.state.location[1]===-34.8766719){
          alert(t('page.address.geo_disabled'));
          event.preventDefault();
          return;
        }
        // LOCATION-GEOFENCE (flag ON only): the GPS/address write is a THIRD publish funnel
        // that previously gated only on the selected-FLAG bbox (dentroLimites). Bind it to the
        // user's verified PHYSICAL country via checkSyncBindingForPin (the SAME SOT verdict the
        // UX gate reads). Block + notify when not eligible or when the pin sits outside the
        // verified country. Flag OFF → skipped, byte-identical to today (the dentroLimites gate
        // below still runs). `bindingCountry` (when allowed) overrides the flag for the Pais stamp.
        let bindingCountry = null;
        if (LOCATION_GEOFENCE_ENABLED) {
          const gate = checkSyncBindingForPin(this.state.location);
          if (!gate.allowed) {
            alert(gate.message);
            event.preventDefault();
            return;
          }
          bindingCountry = gate.country;
        }
        this.setState({isLoading: true});
            (async function main(self) {
                await doc.useServiceAccountAuth({
                    client_email: process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL,
                    private_key: process.env.REACT_APP_GOOGLE_PRIVATE_KEY,
                });
        
                await doc.loadInfo(); // Loads document properties and worksheets
                
                let regiao;
                if(envVariables.dentroLimites(self.state.location)){
                  regiao=0;
                }
                else{
                  // INTL M3 (UX-1): localized via t('errors.out_of_country') with the
                  // active country name (was the pt-BR-only "Região não suportada").
                  // Still an alert() for now — alert→toast migration is DEFERRED per §9.
                  const name = getCountry(activeCountryFor(INTL_ENABLED, countryStore)).name;
                  alert(t('errors.out_of_country').replace('{pais}', name));
                  return;
                }
                const sheet = doc.sheetsByIndex[regiao];

                let dadosRow = {};
                dadosRow.alimento = self.state.alimento;
                dadosRow.numero = self.state.numero;
                dadosRow.endereco = "";
                dadosRow.coords = self.state.location;
                dadosRow.telefone = self.state.telefone;
                dadosRow.diaSemana = self.state.diaSemana;
                dadosRow.horario = self.state.horario;
                dadosRow.mes = self.state.mes;
                dadosRow.redesocial = self.state.redesocial;
                // INTL: when the location geofence bound this submit to the user's verified
                // physical country, stamp THAT (not the flag-picker) so attribution matches
                // the gate. Absent (flag OFF) → criarRow falls back to the resolver ('br' OFF).
                if (bindingCountry) dadosRow.pais = bindingCountry;

              const row = envVariables.criarRow(dadosRow);

                await sheet.addRow(row);
                window.location.reload();
            })(this);
        //});
      event.preventDefault();
    }
  
    render() {
      return (
          this.state.isLoading ?
          <div><CircularProgress aria-label={t('page.address.saving_point')} /></div>
          : 
            <button className="hidden SubmitButton marcar-local" onClick={this.handleSubmit}>
              Atual
            </button>
        
      );
    }
  }
export default NameForm; 