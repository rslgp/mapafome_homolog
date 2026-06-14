import React, { Component } from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import { t } from '../ux/strings';

const { GoogleSpreadsheet } = require('google-spreadsheet');

// Google Sheets Document ID -- PROD
const doc = new GoogleSpreadsheet(process.env.REACT_APP_GOOGLESHEETID);

class Sugestoes extends Component {
    constructor(props) {
      super(props);
      this.state = {
        value: '',
        isLoading:false
      };
  
      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

  
    handleChange(event) {
      if(event.target.value.length > 1000) return;
      this.setState({value: event.target.value});
    }
  
    handleSubmit(event) {
      //alert('Um endereço foi enviado: ' + this.state.value);
      if(this.state.value === '') {event.preventDefault();return;}
      
      this.setState({isLoading: true});
      
      (async function main(self) {
        try{
          await doc.useServiceAccountAuth({
              client_email: process.env.REACT_APP_GOOGLE_SERVICE_ACCOUNT_EMAIL,
              private_key: process.env.REACT_APP_GOOGLE_PRIVATE_KEY,
          });

          await doc.loadInfo(); // Loads document properties and worksheets

          const sheet = doc.sheetsByIndex[2];
          //row = { Name: "new name", Value: "new value" };
          
          const row = { Sugestao: self.state.value, DateISO: new Date().toISOString()};
          
          await sheet.addRow(row);
        
          self.setState({isLoading: false});
          alert(t('page.form.suggestion_sent'));
        }catch(e){
          alert(t('page.form.suggestion_error'));
        }
        
      })(this);
      event.preventDefault();
    }

    
  
    render() {
      return (
        this.state.isLoading ?
        <div><CircularProgress aria-label={t('page.form.suggestion_sending')} /></div>
        :
        <form onSubmit={this.handleSubmit}>
          <label>
            <textarea className="TextField" type="text" placeholder={t('page.form.suggestion_ph')} value={this.state.value} onChange={this.handleChange} />
          </label>
          <input className="SubmitButton" type="submit" value={t('page.form.suggestion_submit')} />
        </form>
      );
    }
  }
export default Sugestoes; 