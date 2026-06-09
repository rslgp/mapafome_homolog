// Tests for the pure alimentoFieldVisibility() extracted from
// App.setTipoAlimento (MILESTONE 1). These lock in the exact branching of the
// original method so the extraction is provably behavior-preserving:
//   - PrecisandoBuscar  → its date trio visible, redesocial visible
//   - EntregaAlimentoPronto → its date trio visible, redesocial visible
//   - Doador            → no date trio, redesocial visible
//   - anything else     → no date trio, redesocial hidden
// The three branches are mutually exclusive (the original used if/else-if).

import { describe, it, expect } from 'vitest';
import { alimentoFieldVisibility } from '../src/app/components/compatibility/domain/alimentoFieldVisibility.js';

describe('alimentoFieldVisibility', () => {
    it('PrecisandoBuscar shows the PrecisandoBuscar trio + redesocial only', () => {
        expect(alimentoFieldVisibility('PrecisandoBuscar')).toEqual({
            precisandoBuscar: true,
            entregaAlimentoPronto: false,
            showRedeSocial: true,
        });
    });

    it('EntregaAlimentoPronto shows the EntregaAlimentoPronto trio + redesocial only', () => {
        expect(alimentoFieldVisibility('EntregaAlimentoPronto')).toEqual({
            precisandoBuscar: false,
            entregaAlimentoPronto: true,
            showRedeSocial: true,
        });
    });

    it('Doador shows redesocial but neither date trio', () => {
        expect(alimentoFieldVisibility('Doador')).toEqual({
            precisandoBuscar: false,
            entregaAlimentoPronto: false,
            showRedeSocial: true,
        });
    });

    it('the two date-trio flags are never both true (mutually exclusive branches)', () => {
        for (const v of ['PrecisandoBuscar', 'EntregaAlimentoPronto', 'Doador', 'Alimento pronto', '', null, undefined]) {
            const r = alimentoFieldVisibility(v);
            expect(r.precisandoBuscar && r.entregaAlimentoPronto).toBe(false);
        }
    });

    it('an unrelated value (default "Alimento pronto") hides every conditional field', () => {
        expect(alimentoFieldVisibility('Alimento pronto')).toEqual({
            precisandoBuscar: false,
            entregaAlimentoPronto: false,
            showRedeSocial: false,
        });
    });

    it('an empty / unknown value hides every conditional field', () => {
        expect(alimentoFieldVisibility('')).toEqual({
            precisandoBuscar: false,
            entregaAlimentoPronto: false,
            showRedeSocial: false,
        });
        expect(alimentoFieldVisibility('SomethingNew')).toEqual({
            precisandoBuscar: false,
            entregaAlimentoPronto: false,
            showRedeSocial: false,
        });
    });
});
