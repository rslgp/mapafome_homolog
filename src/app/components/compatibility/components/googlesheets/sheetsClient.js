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

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { isInsideCountry } from '../countries';
import { Telefone } from '../../domain/Telefone';

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

// Named worksheet indices — the single home documenting what each tab is, so a
// call site reads `SHEET_INDEX.DELETE_REQUEST` instead of a bare `4` whose
// meaning lived only in prose. REGION_BASE (1) is the base for the per-region
// tabs addressed dynamically as `sheetsByIndex[regiao]`.
export const SHEET_INDEX = Object.freeze({
    MAIN: 0,
    REGION_BASE: 1,
    SUGESTAO: 2,
    VERIFY_CNPJ: 3,
    DELETE_REQUEST: 4,
});

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

// ─── VM6 — input validation barricade ─────────────────────────────────────
// v5 § defensive_programming.barricade_pattern. Data outside the sheetsClient
// is dirty; data passed to sheet.addRow / row.save is clean. Each writer path
// runs through one of these validators. Validators THROW (typed errors) so
// callers must explicitly catch — no silent garbage in the spreadsheet.
//
// Throws subclasses are exposed so callers can branch on specific failure
// types (telefone vs coordinates vs payload-shape) for better UX messages.

export class SheetsValidationError extends Error {
    constructor(field, reason, value) {
        super(`sheets validation: ${field} ${reason}`);
        this.field = field;
        this.reason = reason;
        this.value = value;
    }
}

// INTL M2 (§4.4/§4.6): the publish geofence is now the SINGLE source of truth in
// countries.COUNTRY_PUBLISH_BOUNDS, read through isInsideCountry(coords, code).
// The local Brazil bbox literal that used to live here is REMOVED (FIT-1: the
// bounds literal survives only in the country SOT). `code` is passed EXPLICITLY —
// this module NEVER reads the countryStore singleton (that would reintroduce
// global-state coupling into the data layer and break test-mock determinism).
// Absent `code` defaults to 'br' so the legacy pets path stays Brazil-only until
// it is internationalized on purpose (M4).
//
// INTL M3 (§5 M3 / R4): the geofence-rejection reason is a STABLE CODE,
// OUT_OF_COUNTRY_BBOX, NOT the old country-specific literal 'outside Brazil bbox'.
// The code is country-neutral (the box is now the SELECTED country's, not only
// Brazil) and is the single coupling key the classifier (petPublishGuards) and the
// barricade tests branch on. Renaming the literal to a code also lets the classifier
// match by .reason ALONE without the over-broad `name === 'SheetsValidationError'`
// catch-all that wrongly bucketed telefone/rating errors as out-of-bounds.
export const OUT_OF_COUNTRY_BBOX = 'OUT_OF_COUNTRY_BBOX';
export function validateCoordinatePair(coords, field = 'Coordinates', code = 'br') {
    if (!Array.isArray(coords) || coords.length !== 2) {
        throw new SheetsValidationError(field, 'must be a [lat,lng] tuple', coords);
    }
    const [lat, lng] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new SheetsValidationError(field, 'lat/lng must be finite numbers', coords);
    }
    if (!isInsideCountry(coords, code)) {
        throw new SheetsValidationError(field, OUT_OF_COUNTRY_BBOX, coords);
    }
    return coords;
}

export function validateRating(rating) {
    const n = Number(rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
        throw new SheetsValidationError('Avaliacao', 'must be integer 1..5', rating);
    }
    return n;
}

// BR phone validity (10/11 digits, +55 strip) is owned by the Telefone value
// object (domain SOT). This barricade keeps its own typed error + stripped-digit
// return contract but delegates the actual rule so the two cannot drift.
export function validateTelefoneBR(telefone) {
    if (typeof telefone !== 'string') {
        throw new SheetsValidationError('Telefone', 'must be string of digits', telefone);
    }
    const parsed = Telefone.tryParse(telefone);
    if (!parsed) {
        throw new SheetsValidationError('Telefone', 'must be 10 or 11 BR digits (DDD + number)', telefone);
    }
    return parsed.digits;
}

// INTL M2 (§4.4): `code` is threaded EXPLICITLY from the publish action (which
// already knows the active country) into the coordinate barricade. Absent → 'br'.
export function validatePinPayload(payload, code = 'br') {
    if (!payload || typeof payload !== 'object') {
        throw new SheetsValidationError('payload', 'must be an object', payload);
    }
    // Coordinates may be JSON string or array — tolerate both, normalize.
    // PARSE-1 (§4.4): the JSON.parse below preserves a legitimate ZERO component
    // ('[0,-45]' → [0,-45]); validateCoordinatePair gates on Number.isFinite +
    // isInsideCountry (strict numeric comparisons), never on truthiness, so a 0
    // is NOT dropped. The zero-component case is covered in sheetsValidators.test.
    if (payload.Coordinates !== undefined) {
        const coords = typeof payload.Coordinates === 'string'
            ? JSON.parse(payload.Coordinates)
            : payload.Coordinates;
        validateCoordinatePair(coords, 'Coordinates', code);
    }
    if (payload.Telefone) validateTelefoneBR(payload.Telefone);
    return payload;
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
