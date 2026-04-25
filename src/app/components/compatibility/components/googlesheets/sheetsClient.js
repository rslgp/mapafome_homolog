'use client';

// Centralized Google Sheets client.
//
// Why this exists (v5 § DRY, § refactoring_patterns.rule_of_three):
// App.js had 13 copies of the auth + loadInfo boilerplate before each sheet
// operation. Each copy re-authenticates and re-loads metadata, which is
// wasteful and a textbook copy-paste smell. This module exposes one
// `getSheet(idx)` entry point that callers use; auth and metadata load
// happen at most once per page lifetime.
//
// v5 alignment:
//   - § solid_quick.SRP: one responsibility — give callers a ready-to-use sheet
//   - § defensive_programming.barricade_pattern: env-var validation lives here
//   - § anti_patterns.copy_paste eliminated for sheet I/O
//
// Migration is incremental: legacy callsites in App.js can switch one at a
// time. Each migrated callsite shrinks App.js by ~6 lines and removes a
// duplicated network round-trip.

const { GoogleSpreadsheet } = require('google-spreadsheet');

let docInstance = null;
let initPromise = null;

function getDoc() {
    if (docInstance) return docInstance;
    const id = process.env.NEXT_PUBLIC_GOOGLESHEETID;
    if (!id) throw new Error('NEXT_PUBLIC_GOOGLESHEETID is not set');
    docInstance = new GoogleSpreadsheet(id);
    return docInstance;
}

// Idempotent auth + loadInfo. Multiple concurrent callers share one promise
// so we never auth twice, even under burst publishes.
export function ensureReady() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        const doc = getDoc();
        await doc.useServiceAccountAuth({
            client_email: process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY,
        });
        await doc.loadInfo();
        return doc;
    })().catch((err) => {
        // Reset so a transient failure doesn't permanently kill subsequent calls.
        initPromise = null;
        throw err;
    });
    return initPromise;
}

// Returns sheet at index N, ready for read/write. Caller awaits.
export async function getSheet(idx) {
    if (!Number.isInteger(idx) || idx < 0) {
        throw new Error(`getSheet: invalid index ${idx}`);
    }
    const doc = await ensureReady();
    const sheet = doc.sheetsByIndex[idx];
    if (!sheet) throw new Error(`getSheet: no sheet at index ${idx}`);
    return sheet;
}

// Convenience for the very common "append a row" pattern.
export async function appendRow(idx, row) {
    const sheet = await getSheet(idx);
    return sheet.addRow(row);
}

// Find a pin row in sheet[0] by Coordinates, apply a mutator to the parsed
// Dados object, and persist. Returns the updated row or null if no match.
//
// Replaces this duplicated pattern (counted 4× in App.js):
//   const sheet = await getSheet(0);
//   if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
//   const row = envVariables.rows.filter(x => JSON.parse(x.Dados).Coordinates === coordsStr)[0];
//   const dados = JSON.parse(row.Dados);
//   dados.someField = ...;
//   row.Dados = JSON.stringify(dados);
//   await row.save();
//
// Caller passes a mutator(dados) that mutates in place. The cached rows list
// (envVariables.rows) is reused across calls, matching the legacy behavior.
export async function updatePinDadosByCoords(envVariables, coordsStr, mutator) {
    const sheet = await getSheet(0);
    if (envVariables.rows === undefined) envVariables.rows = await sheet.getRows();
    const target = envVariables.rows.find((x) => {
        try { return JSON.parse(x.Dados).Coordinates === coordsStr; }
        catch (_e) { return false; }
    });
    if (!target) return null;
    const dados = JSON.parse(target.Dados);
    mutator(dados);
    target.Dados = JSON.stringify(dados);
    await target.save();
    return target;
}
