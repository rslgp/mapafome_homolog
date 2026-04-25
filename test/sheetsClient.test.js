// Characterization tests for sheetsClient.js — locks down current behavior
// before VM1/VM2/VM3 touch the consumers (App.js).
//
// v5 § testing_strategy.first_principles (F.I.R.S.T): fast, independent,
// repeatable, self-validating, timely.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// google-spreadsheet is heavy and hits the network. We mock the constructor
// so each test can supply its own behavior.
const mockUseAuth = vi.fn();
const mockLoadInfo = vi.fn();
const mockAddRow = vi.fn();
const mockGetRows = vi.fn();
const mockSave = vi.fn();

const mockSheet = { addRow: mockAddRow, getRows: mockGetRows };
const mockDoc = {
    useServiceAccountAuth: mockUseAuth,
    loadInfo: mockLoadInfo,
    sheetsByIndex: { 0: mockSheet, 3: mockSheet, 4: mockSheet },
};

vi.mock('google-spreadsheet', () => ({
    GoogleSpreadsheet: vi.fn().mockImplementation(() => mockDoc),
}));

// process.env must be set before the module is imported.
process.env.NEXT_PUBLIC_GOOGLESHEETID = 'test-doc-id';
process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@iam.example';
process.env.NEXT_PUBLIC_GOOGLE_PRIVATE_KEY = 'test-key';

describe('sheetsClient', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mockUseAuth.mockResolvedValue(undefined);
        mockLoadInfo.mockResolvedValue(undefined);
        mockAddRow.mockResolvedValue({ rowIndex: 1 });
        mockGetRows.mockResolvedValue([]);
        // Reset the module's singleton state between tests.
        vi.resetModules();
    });

    it('appendRow writes to the requested sheet index', async () => {
        const { appendRow } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        await appendRow(4, { Motivo: 'test', Ponto: '[]' });
        expect(mockUseAuth).toHaveBeenCalledOnce();
        expect(mockLoadInfo).toHaveBeenCalledOnce();
        expect(mockAddRow).toHaveBeenCalledWith({ Motivo: 'test', Ponto: '[]' });
    });

    it('ensureReady authenticates only once across many calls (concurrent dedupe)', async () => {
        const { appendRow } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        await Promise.all([
            appendRow(3, { a: 1 }),
            appendRow(3, { a: 2 }),
            appendRow(4, { a: 3 }),
        ]);
        expect(mockUseAuth).toHaveBeenCalledOnce();
        expect(mockLoadInfo).toHaveBeenCalledOnce();
        expect(mockAddRow).toHaveBeenCalledTimes(3);
    });

    it('getSheet rejects on negative or non-integer index', async () => {
        const { getSheet } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        await expect(getSheet(-1)).rejects.toThrow(/invalid index/);
        await expect(getSheet(1.5)).rejects.toThrow(/invalid index/);
    });

    it('getSheet rejects when no sheet exists at the given index', async () => {
        const { getSheet } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        await expect(getSheet(99)).rejects.toThrow(/no sheet at index/);
    });

    it('updatePinDadosByCoords mutates Dados JSON and saves', async () => {
        mockGetRows.mockResolvedValue([
            { Dados: JSON.stringify({ Coordinates: '[1,2]', clicado: 0 }), save: mockSave },
        ]);
        const { updatePinDadosByCoords } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        const env = {};
        const row = await updatePinDadosByCoords(env, '[1,2]', (d) => { d.clicado = (d.clicado || 0) + 1; });
        expect(row).toBeTruthy();
        expect(mockSave).toHaveBeenCalledOnce();
        expect(JSON.parse(env.rows[0].Dados).clicado).toBe(1);
    });

    it('updatePinDadosByCoords returns null when no row matches (no exception)', async () => {
        mockGetRows.mockResolvedValue([
            { Dados: JSON.stringify({ Coordinates: '[9,9]' }), save: mockSave },
        ]);
        const { updatePinDadosByCoords } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        const env = {};
        const row = await updatePinDadosByCoords(env, '[1,2]', () => {});
        expect(row).toBeNull();
        expect(mockSave).not.toHaveBeenCalled();
    });

    it('updatePinDadosByCoords skips rows with malformed Dados JSON instead of throwing', async () => {
        mockGetRows.mockResolvedValue([
            { Dados: 'not-json', save: mockSave },
            { Dados: JSON.stringify({ Coordinates: '[1,2]' }), save: mockSave },
        ]);
        const { updatePinDadosByCoords } = await import('../src/app/components/compatibility/components/googlesheets/sheetsClient.js');
        const env = {};
        const row = await updatePinDadosByCoords(env, '[1,2]', () => {});
        expect(row).toBeTruthy();
    });
});
