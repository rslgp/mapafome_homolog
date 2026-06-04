
import React, { Component } from 'react';

import { formatRelativeTime } from '../relativeTime';

const { GoogleSpreadsheet } = require('google-spreadsheet');

const doc = new GoogleSpreadsheet(process.env.NEXT_PUBLIC_GOOGLESHEETID);

class CleanOld extends Component {

    componentDidMount() {
        
        (async function main() {
            // Use service account creds
            await doc.useServiceAccountAuth({
            client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
            });
    
            await doc.loadInfo(); // Loads document properties and worksheets
    
            const sheet = doc.sheetsByIndex[0];
            const rows = await sheet.getRows();
            rows.forEach((x) => { 
                let dateMarked;
                if(x.DateISO) dateMarked = formatRelativeTime(x.DateISO);
                
                //filtrar datas antigas
                if(
                    dateMarked.includes("semana") 
                    || dateMarked.includes("mes") 
                //&& Number(dateMarked.replace(/[^0-9]/g,'')) > 7
                ) { x.delete(); } });

        })();
    }
    render(){
        return <div></div>;
    }
}

export default CleanOld;