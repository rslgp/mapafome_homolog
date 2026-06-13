// INTL M1 — this module is a PURE POJO with ~10 unrelated importers, so it must
// NOT import countryStore/intlConfig (§4.2: that would inject a localStorage
// singleton + a build flag into 10 unrelated modules and make dentroLimites
// depend on global state/time). It DOES import the PURE predicate isInsideCountry
// (countries.js is a leaf with zero store/flag imports — safe, no cycle), and it
// learns WHICH country is active through a single INJECTED accessor wired by the
// composition root (App.componentDidMount → setActiveCountryResolver). Default:
// when nothing is injected the resolver returns 'br', so unit tests and SSR get
// Brazil — i.e. the legacy two-rectangle behavior, byte-identical to today.
import { isInsideCountry } from './countries';

// The single injected accessor. Defaults to Brazil so the POJO is correct with
// zero wiring (tests / SSR / pre-bootstrap). The bootstrap replaces it with one
// that resolves INTL_ENABLED ? getSelectedCountry() : 'br' (see geofence.js).
let activeCountryResolver = () => 'br';

// Composition-root seam: wire how the POJO learns the active country WITHOUT a
// hard import of the store/flag (§4.2). Idempotent and reversible (pass the
// default back to restore Brazil-only).
export function setActiveCountryResolver(fn) {
    activeCountryResolver = typeof fn === 'function' ? fn : (() => 'br');
}

const envVariables = {
    // NOTE (INTL M1): the former `mapArea` rect1 constant was removed — it had
    // ZERO readers outside the old dentroLimites body (grep confirmed), whose
    // numbers now live in countries.COUNTRY_PUBLISH_BOUNDS.br[0] as the SOT.
    "lastMarked":undefined,
    // INTL M1 — delegates to the single country-aware predicate, keeping the
    // (coords) => boolean signature so the 4 callsites are unchanged in shape.
    // The active country comes from the injected resolver (default 'br'); with
    // the INTL flag OFF the resolver yields 'br' and isInsideCountry('br', …)
    // reproduces the legacy two-rectangle OR bit-for-bit (M0 net / D5 / §4.0).
    "dentroLimites": (localizacao) => {
        return isInsideCountry(localizacao, activeCountryResolver());
    },
    "telefoneFilter":false,
    "distanceInKmBetweenEarthCoordinates": ( lat1, lon1, lat2, lon2 ) => {
        var earthRadiusKm = 6371;

        var dLat =  (lat2-lat1) * Math.PI / 180;
        var dLon =  (lon2-lon1) * Math.PI / 180;
      
        lat1 = lat1 * Math.PI / 180;
        lat2 = lat2 * Math.PI / 180;
      
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 

        return earthRadiusKm * c;
    },
    "currentLocation": [],
    "criarRow": (dadosRow) => {

        if(dadosRow.numero !== ''){
            dadosRow.numero = ", nº"+dadosRow.numero;
        }
        
        
        let dadosJSON = {
            "Roaster": dadosRow.alimento,
            "DateISO": new Date().toISOString(),
            "AlimentoEntregue":0,
            "Avaliacao": {
                "1":0,
                "2":0,
                "3":0,
                "4":0,
                "5":0
            },

        };
        // INTL M2.5 (§4.6.1 / DEST-1): stamp the country this mark was created in
        // so the single shared sheet 0 stops collapsing non-BR rows into the BR
        // view. The country is resolved the SAME injected-resolver way M1 wired
        // dentroLimites (the POJO must NOT import countryStore/intlConfig, §4.2):
        // a caller may pass dadosRow.pais explicitly, otherwise the resolver
        // answers (it resolves activeCountryFor(INTL_ENABLED, countryStore) at the
        // composition root). With the INTL flag OFF the resolver returns 'br', so
        // EVERY row is stamped Pais:'br' and flag-OFF meaning is byte-identical to
        // today (the field is additive; legacy readers ignore it). Read-back in
        // appMainBootstrap treats a MISSING Pais as 'br' so historical rows (which
        // never carried this field) still attribute correctly.
        dadosJSON.Pais = dadosRow.pais || activeCountryResolver();
        if(dadosRow.numero!=="") dadosJSON.URL = dadosRow.numero;
        if(dadosRow.coords!=="") dadosJSON.Coordinates = JSON.stringify(dadosRow.coords);
        if(dadosRow.telefone!=="") dadosJSON.Telefone = dadosRow.telefone;
        if(dadosRow.diaSemana!=="") {dadosJSON.DiaSemana = dadosRow.diaSemana; dadosJSON.Horario = dadosRow.horario}
        if(dadosRow.redesocial!=="") {dadosRow.redesocial=dadosRow.redesocial.replace("@","");dadosJSON.RedeSocial = dadosRow.redesocial;}
        if(dadosRow.mes!=="") dadosJSON.Mes = dadosRow.mes;
        //if(dadosRow.endereco!=="") dadosJSON.City = dadosRow.endereco;
        const row = {
            Dados: JSON.stringify(dadosJSON)
        };

        return row;

    },
    "rows":undefined
}

export default envVariables;