'use client';

// Bootstrap + debug helpers extracted verbatim from App.componentDidMount to
// keep that method (and App.js) within the fitness LOC budgets. No behavior
// change: these are the same routines that previously lived inline, now taking
// their module-level collaborators (doc, envVariables, aes, sheetsGetSheet) as
// explicit arguments so the file remains a pure function of its inputs.

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
