import React from 'react';
import CoffeeMap from './map.js';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';

const MainMap = ({
  dataMaps,
  center,
  filtro,
  onRemoverPonto,
  onVerificarPonto,
  onEntregarAlimento,
  onAvaliar,
  onContabilizarClicado,
  onClicouTelefone
}) => {
  return (
    <Grid size={{ xs: 12, sm: 8 }} >
      <Paper
        elevation={3}
        style={{
          // padding: '10px',
          textAlign: 'center',
          color: '#4d4d4d',
          height: '84vh',
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
          contabilizarClicado={onContabilizarClicado}
          clicouTelefone={onClicouTelefone}
        />
      </Paper>
    </Grid>
  );
};

export default MainMap;
