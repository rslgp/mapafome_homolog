'use client';

// The 2-column map + controls row. Extracted VERBATIM from App.renderMapGrid()
// (MILESTONE 1 decoupling) into a presentational function component — same JSX,
// same bindings, same prop wiring. It receives the App's `state`, the handler
// callbacks, and the dropdown refs as props so the markup is byte-identical to
// the original method; App.render() composes it.
//
// No behavior change: this is the same Grid that previously lived inline in
// App.renderMapGrid(); `this.state.X` became `state.X` and `this.onFoo` became
// `handlers.onFoo` / `refs.dropDownMenuFoo`, with no other edits.

import React from 'react';
import Grid from '@mui/material/Grid';
import MainMap from './components/MainMap';
import MainControls from './components/MainControls';

export default function AppMapGrid({ state, handlers, refs }) {
    return (
        <Grid container spacing={2}>
            <MainMap
                dataMaps={state.dataMaps}
                center={state.center}
                tileMapOption={state.tileMapOption}
                filtro={state.filtro}
                telefoneFilterActive={state.telefoneFilterLocal}
                periodId={state.periodLocal}
                onRemoverPonto={handlers.removerPonto}
                onVerificarPonto={handlers.verificarPonto}
                onEntregarAlimento={handlers.entregarAlimento}
                onAvaliar={handlers.avaliar}
                onContabilizarClicado={handlers.contabilizarClicado}
                onClicouTelefone={handlers.clicouTelefone}
                onPinDropped={handlers.handlePinDroppedOnMap}
                pingCoords={state.pingCoords}
                onReporterPinClick={handlers.handleReporterPinClick}
                nowTick={state.nowTick}
            />
            <MainControls
                isLoading={state.isLoading}
                alimento={state.alimento}
                telefoneEncryptado={state.telefoneEncryptado}
                diaSemana={state.diaSemana}
                horario={state.horario}
                mes={state.mes}
                center={state.center}
                numero={state.numero}
                redesocial={state.redesocial}
                telefoneFilterLocal={state.telefoneFilterLocal}
                periodLocal={state.periodLocal}
                geofenceEligible={state.geofenceEligible}
                onFiltroChange={handlers.setFiltro}
                onTipoAlimentoChange={handlers.setTipoAlimento}
                onDiaSemanaChange={handlers.setDiaSemana}
                onHorarioChange={handlers.setHorario}
                onMesChange={handlers.setMes}
                onTelefoneChange={handlers.handleChangeTelefone}
                onNumeroChange={handlers.handleChangeNumero}
                onRedeSocialChange={handlers.handleChangeRedeSocial}
                onClickMap={handlers.handleClickMap}
                onTelefoneFilterChange={handlers.telefoneFilterChange}
                onPeriodChange={handlers.onPeriodChange}
                dropDownMenuSemanaEntregaAlimentoPronto={refs.dropDownMenuSemanaEntregaAlimentoPronto}
                dropDownMenuHorarioEntregaAlimentoPronto={refs.dropDownMenuHorarioEntregaAlimentoPronto}
                dropDownMenuSemanaPrecisandoBuscar={refs.dropDownMenuSemanaPrecisandoBuscar}
                dropDownMenuHorarioPrecisandoBuscar={refs.dropDownMenuHorarioPrecisandoBuscar}
                dropDownMenuFiltro={refs.dropDownMenuFiltro}
                redesocialRef={refs.redesocialRef}
                dropDownMenuRedeSocial={refs.dropDownMenuRedeSocial}
                dropDownMenuMesPrecisandoBuscar={refs.dropDownMenuMesPrecisandoBuscar}
                dropDownMenuMesEntregaAlimentoPronto={refs.dropDownMenuMesEntregaAlimentoPronto}
            />
        </Grid>
    );
}
