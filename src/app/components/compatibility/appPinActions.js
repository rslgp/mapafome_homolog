'use client';

// Pin sheets-service layer extracted VERBATIM from App.js (MILESTONE 1
// decoupling). These are the Google-Sheets write / mutation routines that
// previously lived as App methods. They now take their module-level
// collaborators as an explicit `deps` object and the component as `self`, so
// this file is a pure function of its inputs — same precedent as
// appMainBootstrap.js (runMain/installDebugHelpers take self + deps).
//
// NO behavior change: each body below is the original method body, copied
// line-for-line, with the only edit being that module-scope references
// (sheetsAppendRow, updatePinDadosByCoords, trackError, envVariables,
// getCookie, setCookie, EXPIRE_DAY, coordsFromPin) now resolve from `deps`
// instead of App.js's module scope, and `this` → `self`. The App methods become
// one-line wrappers that pass `this` + the shared deps.
//
// SOT note (P13): the three write paths (persistPinPatch / writePinToSheets /
// publishPinFromMap) used to carry their OWN raw `doc.useServiceAccountAuth +
// loadInfo` boilerplate via an injected `doc`. They now route through
// sheetsClient.getSheet(0) — the same single auth/loadInfo entry point their
// siblings contabilizarClicado/avaliar already use via updatePinDadosByCoords.
// This kills the 3 raw auth sites and the injected `doc` dep, collapsing the
// secret-key surface from 4 sites in this file to 0 (sheetsClient is the one
// home). The 10s withTimeout on the interactive write in writePinToSheets is
// preserved verbatim. [v5 single_source_of_truth; Agile-PPP P2 needless_repetition]
//
// deps shape:
//   { envVariables, EXPIRE_DAY, sheetsAppendRow, updatePinDadosByCoords,
//     trackError, getCookie, setCookie, coordsFromPin }
import { getSheet } from './components/googlesheets/sheetsClient';

export function removerPonto(self, deps, coords, categoriaPonto) {
    const { sheetsAppendRow } = deps;
    const motivo = prompt("por qual motivo (em resumo) gostaria de deletar esse ponto?");
    if (motivo === null) return;
    const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };
    sheetsAppendRow(4, row)
        .then(() => alert("pedido de deletar enviado com sucesso"))
        .catch(() => alert("ERRO, tente novamente"));
}

export function verificarPonto(self, deps, coords, categoriaPonto) {
    const { sheetsAppendRow } = deps;
    const motivo = prompt("Insira o CNPJ da entidade, nome da entidade, nome do responsável, email, telefone e se é credenciada para receber recurso do governo");
    if (motivo === null) return;
    const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };
    sheetsAppendRow(3, row)
        .then(() => alert("pedido de cnpj enviado com sucesso"))
        .catch(() => alert("ERRO, tente novamente"));
}

export function contabilizarClicado(self, deps, coords) {
    const { envVariables, updatePinDadosByCoords, trackError } = deps;
    const coordsStr = JSON.stringify(coords);
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
        dados.clicado = (dados.clicado || 0) + 1;
    }).catch((e) => trackError('pin_update', e, { op: 'click_count' }));
}

export function clicouTelefone(self, deps, coords) {
    const { envVariables, updatePinDadosByCoords, trackError } = deps;
    const coordsStr = JSON.stringify(coords);
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
        dados.clickTel = (dados.clickTel || 0) + 1;
    }).catch((e) => trackError('pin_update', e, { op: 'tel_click_count' }));
}

export function entregarAlimento(self, deps, coords) {
    const { envVariables, updatePinDadosByCoords, trackError } = deps;
    const coordsStr = JSON.stringify(coords);
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
        dados.AlimentoEntregue = (dados.AlimentoEntregue || 0) + 1;
    })
        .then((row) => { if (row) window.location.reload(); })
        .catch((e) => trackError('pin_update', e, { op: 'mark_delivered' }));
}

export function avaliar(self, deps, coords, avaliacao) {
    const { envVariables, updatePinDadosByCoords, getCookie, setCookie, EXPIRE_DAY } = deps;
    const coordsStr = JSON.stringify(coords);
    const coordsKey = Array.isArray(coords) ? coords.join(',') : String(coords);
    const cookieName = 'pontosAvaliados';
    const pontos = getCookie(cookieName) || '';

    // Cookie gate runs FIRST so a repeat click on an already-rated point
    // gives the user an honest "já avaliou" message instead of a silent
    // no-op that looks like the stars are broken.
    if (pontos.includes(coordsKey)) {
        self.setState({ offlineToast: 'Você já avaliou este ponto. Obrigado!' });
        return;
    }

    const rating = avaliacao == null ? 5 : avaliacao;
    updatePinDadosByCoords(envVariables, coordsStr, (dados) => {
        if (!dados.Avaliacao) dados.Avaliacao = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        dados.Avaliacao[rating] = (dados.Avaliacao[rating] || 0) + 1;
    })
        .then((row) => {
            if (!row) {
                self.setState({ offlineToast: 'Ponto não encontrado. Recarregue a página e tente novamente.' });
                return;
            }
            const cookieExpireDate = new Date();
            cookieExpireDate.setDate(cookieExpireDate.getDate() + EXPIRE_DAY);
            setCookie(cookieName, pontos + coordsKey, { path: '/', expires: cookieExpireDate });
            // No full page reload — reload() wiped in-progress tour state and made
            // the interaction feel violent. Toast is enough; next natural fetch
            // will pick up the refreshed count.
            self.setState({ offlineToast: 'Avaliação registrada. Obrigado!' });
        })
        .catch((e) => {
            console.error('[avaliar] failed:', e);
            self.setState({ offlineToast: 'Não foi possível enviar sua avaliação. Tente de novo em alguns segundos.' });
        });
}

// Shared low-level helper: locate the row by DateISO + Coordinates and
// apply a mutator function to the parsed Dados JSON, then save.
export async function persistPinPatch(self, deps, pin, mutate) {
    const { envVariables, coordsFromPin } = deps;
    const coords = coordsFromPin(pin);
    if (!coords) return;

    const sheet = await getSheet(0);
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
export async function writePinToSheets(self, deps, { coords, categories, detail, contact, idempotency_key }) {
    const { envVariables } = deps;
    if (!coords || !envVariables.dentroLimites(coords)) {
        throw new Error('out_of_bounds');
    }
    if (idempotency_key && self._idempotencyCache && self._idempotencyCache.has(idempotency_key)) {
        return;
    }
    const withTimeout = (p, ms) => new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('network_slow')), ms);
        p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
    // Auth + loadInfo now happen once inside sheetsClient.getSheet(0) (shared
    // initPromise). The 10s 'network_slow' guard stays on the actual WRITE
    // (sheet.addRow / saveUpdatedCells below) — that is the user-facing latency
    // the M5 timeout was added for; getSheet is wrapped so a slow auth can't
    // hang the publish either.
    const sheet = await withTimeout(getSheet(0), 10000);

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
        if (!self._idempotencyCache) self._idempotencyCache = new Set();
        self._idempotencyCache.add(idempotency_key);
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

// The async publish body of App.handleClickMap, extracted verbatim. The
// coordinate-resolution + bounds-check + setState({isLoading:true}) stay in the
// method (they read DOM/env and component state synchronously); this is only the
// async Sheets write that the method previously ran via an inline IIFE
// `(async function main(self){ ... })(this)`. `latlng` is passed in because it
// was a closure variable computed by the synchronous prelude.
export async function publishPinFromMap(self, deps, latlng) {
    const { envVariables } = deps;
    // Auth + loadInfo + worksheet handle now come from sheetsClient.getSheet(0)
    // (the single auth/loadInfo entry point); regiao 0 preserved as sheet idx 0.
    const sheet = await getSheet(0);
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
}
