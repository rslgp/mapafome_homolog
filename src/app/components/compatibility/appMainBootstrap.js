'use client';

// Bootstrap + debug helpers extracted verbatim from App.componentDidMount to
// keep that method (and App.js) within the fitness LOC budgets. No behavior
// change: these are the same routines that previously lived inline, now taking
// their module-level collaborators (doc, envVariables, aes, sheetsGetSheet) as
// explicit arguments so the file remains a pure function of its inputs.

import { isInsideCountry, getCountry } from './components/countries';
import { t } from './components/ux/strings';
// INTL M2.5 (§4.6.1 / DEST-1): the read-back path becomes country-aware so non-BR
// rows on the single shared sheet 0 are attributed to their country instead of
// collapsing into the BR view. activeCountryFor resolves the active country the
// SAME way M1 wired the publish geofence (OFF → 'br'); countryStore is the SOT for
// the selected country; INTL_ENABLED is the dark-ship flag.
import { activeCountryFor } from './components/geofence';
import * as countryStore from './components/countryStore';
import { INTL_ENABLED } from './components/intlConfig';

// INTL M2.5 (§4.6.1 / DEST-1) — country-aware read-back, extracted as a PURE
// helper so the invariant is unit-testable without touching Google Sheets.
// Each row here has already had its Dados blob spread onto it (so x.Pais and
// x.kind are populated), exactly as runMain does before calling this.
//   • Pets (kind === 'pet') are always dropped from the hunger dataMaps.
//   • A row with NO Pais (undefined/null/'') is a LEGACY BR row — the field
//     predates this stamp, so it defaults to 'br' and is NEVER dropped/crashed
//     (backward compatibility, §4.6.1).
//   • activeCountry === 'br' (also the flag-OFF case, activeCountryFor → 'br'):
//     keep BR-stamped + legacy rows → byte-identical to today.
//   • activeCountry !== 'br' (INTL ON, non-BR session): keep only rows stamped
//     with that exact country, so a non-BR user sees their own marks and BR rows
//     do not bleed into a foreign view.
export function rowCountry(x) {
  return x && x.Pais !== undefined && x.Pais !== null && x.Pais !== ''
    ? x.Pais
    : 'br';
}

export function filterRowsByCountry(rows, activeCountry) {
  const country = activeCountry || 'br';
  return rows.filter((x) => x.kind !== 'pet' && rowCountry(x) === country);
}

// Loads the Google Sheet, decrypts/flattens each row's Dados blob into the row
// object, and pushes the result into the component state. Called once geolocation
// resolves (success or failure) so the map has data to render.
export function runMain(self, deps) {
  const { doc, envVariables, aes } = deps;
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
    // INTL M1 (§4.3, ARCH-1-solone): this is a READ/LOAD-gate + sheet-region
    // router, NOT a publish write-gate. It must stay DECOUPLED from the
    // country-aware publish geofence: otherwise, with the INTL flag ON and a
    // non-BR country selected, the BR default map-center would be judged against
    // the wrong country and the app would REFUSE TO LOAD (the regression §4.3
    // forbids). So we evaluate the load-gate against Brazil EXPLICITLY via the
    // pure isInsideCountry('br', …) — NOT envVariables.dentroLimites (which now
    // tracks the active publish country). With the flag OFF this is identical to
    // today (dentroLimites resolved to 'br' too). Region routing itself stays
    // single-sheet (regiao=0) for M1; the real per-country read-back attribution
    // (Dados.Pais stamping + read-back filter) is deferred to §4.6.1/M2.5 — see
    // the deferred note in the M1 report. Do NOT couple this gate to the active
    // country here.
    let regiao;
    if (isInsideCountry(self.state.center, 'br')) {
      regiao = 0;
    }
    else {
      // INTL M3 (UX-1): localized via t('errors.out_of_country') (was the
      // pt-BR-only alert("Região ainda não suportada")). This load-gate is
      // BR-explicit by design (§4.3), so the named country is Brazil; with the
      // flag OFF activeCountryFor → 'br' too, so the resolved name is "Brasil".
      // Still an alert() for now — alert→toast migration is DEFERRED per §9.
      const name = getCountry(activeCountryFor(INTL_ENABLED, countryStore)).name;
      alert(t('errors.out_of_country').replace('{pais}', name));
      return;
    }
    const sheet = doc.sheetsByIndex[regiao];
    if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
    const rows = envVariables.rows;
    // rowCount is set further down from the PET-FILTERED dataMaps (not raw
    // rows), so a lost-pet pin never inflates the public "pontos mapeados"
    // headline or its aria-live announcement. See the kind!=='pet' filter.

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
    // Pet rows (/pets fork, Dados.kind === 'pet') share this same sheet but
    // are a different domain. Drop them from the hunger dataMaps at this one
    // chokepoint so NO hunger surface — markers, ListView, ContextBar, and
    // crucially the LiveAnnouncer aria-live count (which keys on DateISO, not
    // Categorias) — ever shows, counts, or announces a lost-pet pin.
    // `kind` is read off the row because the loop above spreads JSON.parse(Dados)
    // onto each row, so x.kind is populated by this point. The country attribution
    // (filterRowsByCountry, INTL M2.5/§4.6.1) is country-aware: marks share this
    // one sheet (region routing stays single-sheet, §4.3/R3), so the read path
    // scopes the rendered set to the active country (legacy rows with no Pais
    // default to 'br'). This realizes the center-vs-country fix §4.3 promised —
    // the LOAD gate (regiao) above stays BR-decoupled/permissive, THIS filter is
    // what scopes by country. With the flag OFF activeCountryFor → 'br', so the
    // rendered set is byte-identical to today.
    // See src/app/pets/* and the kind:'pet' guard in reports.js.
    const activeCountry = activeCountryFor(INTL_ENABLED, countryStore);
    const dataMaps = filterRowsByCountry(rows, activeCountry);
    // rowCount mirrors what hunger surfaces actually show — count the
    // pet-filtered set, not raw rows, so lost-pet pins never inflate the
    // public "pontos mapeados" headline or its aria-live announcement.
    self.setState({ dataMaps, rowCount: dataMaps.length });

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
}

// Installs the window.* debug helpers (fixarPonto / distance / stats) that were
// previously assigned inside componentDidMount. Kept verbatim — these are
// console-only diagnostics attached to the global scope.
export function installDebugHelpers(self, deps) {
  const { envVariables, aes, sheetsGetSheet } = deps;

  window.fixarPonto = async function (endereco, coords) {
    try {
      const sheet = await sheetsGetSheet(0);
      if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
      const matches = envVariables.rows.filter((x) => JSON.parse(x.Dados).City.includes(endereco));
      for (const x of matches) {
        const dados = JSON.parse(x.Dados);
        dados.Coordinates = JSON.stringify(coords);
        x.Dados = JSON.stringify(dados);
        await x.save();
      }
    } catch (_e) { /* debug helper — silent on error */ }
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
        const sheet = await sheetsGetSheet(0);
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
}
