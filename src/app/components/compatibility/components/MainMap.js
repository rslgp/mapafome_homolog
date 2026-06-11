import React from 'react';
import CoffeeMap from './map.js';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';

const MainMap = ({
  dataMaps,
  center,
  filtro,
  telefoneFilterActive,
  ultimoAnoFilterActive,
  onRemoverPonto,
  onVerificarPonto,
  onEntregarAlimento,
  onAvaliar,
  onContabilizarClicado,
  onClicouTelefone,
  onPinDropped,
  pingCoords,
  onReporterPinClick,
  nowTick,
}) => {
  return (
    <Grid size={{ xs: 12, sm: 8 }} >
      <Paper
        className="mdf-map-paper"
        elevation={3}
        style={{
          textAlign: 'center',
          color: 'var(--mdf-ink-muted)',
          height: '70vh',
          overflow: 'hidden'
        }}
      >
        <CoffeeMap
          key={'MainMap'}
          dataMapsProp={dataMaps}
          location={center}
          removerPonto={onRemoverPonto}
          verificarPonto={onVerificarPonto}
          entregarAlimento={onEntregarAlimento}
          avaliar={onAvaliar}
          filtro={filtro}
          telefoneFilterActive={telefoneFilterActive}
          ultimoAnoFilterActive={ultimoAnoFilterActive}
          contabilizarClicado={onContabilizarClicado}
          clicouTelefone={onClicouTelefone}
          onPinDropped={onPinDropped}
          pingCoords={pingCoords}
          onReporterPinClick={onReporterPinClick}
          nowTick={nowTick}
        />
      </Paper>
    </Grid>
  );
};

export default MainMap;
