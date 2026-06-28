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
import { getSheet, SHEET_INDEX } from './components/googlesheets/sheetsClient';
// INTL M4b (STATE-1): the publish/flush write gate validates against the country
// CAPTURED IN THE PAYLOAD (stamped at enqueue time), via the same pure predicate
// M1 unified — NOT the live selected country. Importing isInsideCountry here
// keeps the gate keyed on the payload, so the offline flush can never re-read
// getSelectedCountry() and invalidate an already-queued pin.
import { isInsideCountry, DEFAULT_COUNTRY } from './components/countries';
// INTL M5 (MISS-2): the publish funnel event. Layered over the existing
// analytics.track seam (zero new infra; the sink may be inert in prod — see
// intlAnalytics.js header). Imported here so the publish path emits one
// structured event per mark BEFORE the reload (the dispatch must run synchronously
// before navigation). No-op-safe: track() guards SSR + the helper allow-lists.
import { trackPublishIntl, trackModerationIntl } from './components/ux/intlAnalytics';

export function removerPonto(self, deps, coords, categoriaPonto) {
    const { sheetsAppendRow, activeCountry } = deps;
    const motivo = prompt("por qual motivo (em resumo) gostaria de deletar esse ponto?");
    if (motivo === null) return;
    const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };
    sheetsAppendRow(SHEET_INDEX.DELETE_REQUEST, row)
        .then(() => {
            // INTL M5 (MOD-1): instrument the moderation channel per-country so the
            // rollout's VOLUME axis (R16) is observable. No-op-safe; country 'br' OFF.
            trackModerationIntl({ country: (typeof activeCountry === 'function' ? activeCountry() : null) || DEFAULT_COUNTRY, kind: 'delete' });
            alert("pedido de deletar enviado com sucesso");
        })
        .catch(() => alert("ERRO, tente novamente"));
}

export function verificarPonto(self, deps, coords, categoriaPonto) {
    const { sheetsAppendRow, activeCountry } = deps;
    const motivo = prompt("Insira o CNPJ da entidade, nome da entidade, nome do responsável, email, telefone e se é credenciada para receber recurso do governo");
    if (motivo === null) return;
    const row = { Motivo: motivo, Ponto: JSON.stringify(coords), DateISO: new Date().toISOString(), CategoriaPonto: categoriaPonto };
    sheetsAppendRow(SHEET_INDEX.VERIFY_CNPJ, row)
        .then(() => {
            trackModerationIntl({ country: (typeof activeCountry === 'function' ? activeCountry() : null) || DEFAULT_COUNTRY, kind: 'verify' });
            alert("pedido de cnpj enviado com sucesso");
        })
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
export async function writePinToSheets(self, deps, { coords, categories, detail, contact, idempotency_key, country }) {
    const { envVariables } = deps;
    // INTL M4b (STATE-1, point b): gate against the country CAPTURED IN THE
    // PAYLOAD at enqueue time, NOT the live selected country. The old gate
    // (envVariables.dentroLimites) resolves the country through the injected
    // resolver, which reads getSelectedCountry() — so a pin queued offline under
    // country A would be re-validated against a later-selected country B at
    // flush and throw forever, freezing the whole queue. Keying the predicate to
    // `country` makes the interactive AND flush paths consistent automatically
    // (both go through this one function). `country || DEFAULT_COUNTRY` ('br')
    // covers legacy queued items from before this field existed (same default as
    // M2.5's missing-Pais). With the flag OFF the stamp is always 'br', so this
    // reproduces the Brazil-only gate byte-for-byte (isInsideCountry('br', …)
    // IS what dentroLimites delegates to under the OFF resolver).
    if (!coords || !isInsideCountry(coords, country || DEFAULT_COUNTRY)) {
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
        // INTL M4b: persist the CAPTURED country (not the live resolver) so a pin
        // queued offline under country A and flushed in a later country-B session
        // is still attributed to A on read-back (criarRow honors dadosRow.pais
        // over the resolver). Omitted/undefined falls back to the resolver, which
        // is 'br' with the flag OFF — identical to today.
        pais: country || undefined,
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
//
// LOCATION-GEOFENCE (optional 4th arg): when the location geofence is ON, the
// upstream gate binds the mark to the user's GPS/IP-verified PHYSICAL country and
// passes it down here as `bindingCountry`. When present it is the SOT for both the
// offshore-guard expectedCode and the Pais stamp — so a user physically in country X
// is attributed to X regardless of the flag-picker. When ABSENT (the flag-OFF /
// dark-ship path, and every legacy caller) we fall back to deps.activeCountry()
// exactly as today, so OFF behavior is byte-identical.
export async function publishPinFromMap(self, deps, latlng, bindingCountry) {
    const { envVariables, offshoreGuard, activeCountry } = deps;

    // INTL M5 (MISS-2): resolve the country this mark is published IN. With the
    // location geofence ON the verified bindingCountry wins; otherwise the same
    // way the upstream geofence gated it (activeCountryFor, OFF → 'br'). Passed in
    // as a `deps.activeCountry` accessor so this module stays a pure function of
    // its inputs and never imports the store/flag (same precedent as the offshore
    // guard). Absent on both → DEFAULT_COUNTRY ('br'), the OFF behavior.
    const country = bindingCountry || (typeof activeCountry === 'function' ? activeCountry() : null) || DEFAULT_COUNTRY;
    // Verdict of the M4.5 offshore guard for THIS pin. The guard only resolves
    // (allow) or throws (confident mismatch — which exits before this point), so
    // reaching the event means: 'passed' when the guard ran and allowed, or
    // 'not_run' when no guard is wired (flag OFF / dark-ship). Recorded honestly,
    // not inferred — a thrown mismatch never emits a publish_intl event.
    let offshoreHeuristic = 'not_run';

    // INTL M4.5 (DATA-3): offshore-integrity guard. The bbox upstream
    // (handleClickMap's dentroLimites check) already gated this pin to the
    // selected country's RECTANGLE, but a rectangle still admits open ocean
    // inside it (e.g. a pin 200 km off the coast). Since FOOD has no Layer-B
    // barricade (DATA-1), reverse-geocode the pin via Nominatim (the same OSM
    // service the search uses) and reject a CONFIDENT country mismatch.
    //
    // INTL-ONLY + FAIL-OPEN: offshoreGuard is only present in deps when
    // INTL_ENABLED (the composition root omits it when the flag is OFF), so the
    // Brazil/dark-ship path is byte-identical to today. The guard throws ONLY on a
    // confident country mismatch; ocean / network failure / throttle all RESOLVE
    // (allow) — a Nominatim hiccup must never cost a legitimate publish. This is
    // data HYGIENE, not security (R6: client validation is bypassable anyway).
    if (typeof offshoreGuard === 'function') {
        // Pass the binding country as an optional expectedCode override: with the
        // location geofence ON the guard must verify the pin against the user's
        // PHYSICAL country, not the flag-picker. When bindingCountry is undefined
        // (flag-OFF path) the guard resolves its own expectedCode as today.
        await offshoreGuard(latlng, bindingCountry);
        // Reached only if the guard RESOLVED (a confident mismatch throws above
        // and never publishes). 'passed' = guard ran and allowed this pin.
        offshoreHeuristic = 'passed';
    }

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

    // INTL M5 (MISS-2): emit the publish funnel event AFTER the successful write
    // and BEFORE the reload, so the gtag/dataLayer dispatch (when wired) runs
    // synchronously before navigation discards the page. in_selected_bbox is
    // computed with the SAME pure predicate the gate used (true on this path: the
    // upstream dentroLimites already passed, but we recompute rather than assume).
    // No-op-safe: trackPublishIntl → track() guards SSR + an inert sink only
    // buffers. With the flag OFF this fires with country='br'/'not_run' and does
    // not change any OFF behavior.
    trackPublishIntl({
        country,
        inSelectedBbox: isInsideCountry(latlng, country),
        offshoreHeuristic,
    });

    window.location.reload();
}
