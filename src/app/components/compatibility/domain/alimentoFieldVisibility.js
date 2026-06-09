// Pure field-visibility descriptor for App.setTipoAlimento.
//
// Extracted from App.setTipoAlimento (MILESTONE 1 decoupling). PURE: a function
// of the selected `alimento` value only — no `this`, no refs, no DOM, no
// setState. The DOM side effects (flipping each dropdown ref's
// style.display + reading each ref's .value into diaSemana/horario/mes) stay in
// the method, driven by this result. This mirrors the domain/telefoneInput.js
// precedent: the branching logic is pure and unit-testable; the impure applier
// (ref show/hide) stays a thin shell in the component.
//
// Behavior-preserving contract — must match the original method's branching
// byte-for-byte. The original computed three booleans:
//   isPrecisandoBuscar     = value === 'PrecisandoBuscar'
//   isEntregaAlimentoPronto= value === 'EntregaAlimentoPronto'
//   isDoador               = value === 'Doador'
// then:
//   • hid ALL six date dropdown refs unconditionally;
//   • showed the PrecisandoBuscar trio iff isPrecisandoBuscar, ELSE the
//     EntregaAlimentoPronto trio iff isEntregaAlimentoPronto, ELSE neither
//     (and in the neither case cleared diaSemana/horario/mes to '');
//   • showed the redesocial refs iff (isPrecisandoBuscar || isEntregaAlimentoPronto
//     || isDoador).
//
// We surface exactly those decisions so the applier can reproduce the original
// DOM writes without re-deriving them:
//   precisandoBuscar       — show the PrecisandoBuscar date trio + seed its values
//   entregaAlimentoPronto  — show the EntregaAlimentoPronto date trio + seed its values
//   showRedeSocial         — show the redesocial input + its dropdown
// When BOTH precisandoBuscar and entregaAlimentoPronto are false, the applier
// must clear diaSemana/horario/mes — same as the original `else` branch.

export function alimentoFieldVisibility(value) {
    const precisandoBuscar = value === 'PrecisandoBuscar';
    const entregaAlimentoPronto = value === 'EntregaAlimentoPronto';
    const isDoador = value === 'Doador';

    return {
        precisandoBuscar,
        entregaAlimentoPronto,
        showRedeSocial: precisandoBuscar || entregaAlimentoPronto || isDoador,
    };
}
