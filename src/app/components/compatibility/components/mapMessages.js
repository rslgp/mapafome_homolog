// mapMessages.js — per-roaster popup message formatters for the hunger map.
// Pure functions, no React, no Leaflet — they only read item fields + the
// ROASTER_TYPES enum. Extracted from map.js (SRP: pure content vs the React map
// component) so message-copy edits stop colliding with map-component edits.
// map.js imports MSG directly (these were module-private; no external importer).

import { ROASTER_TYPES } from './mapConstants';

export const MSG = {
    doador:               (_, { URL })                        => `Recebendo alimento para distribuir${URL}`,
    precisandoBuscar:     (_, { DiaSemana, Horario, Mes })    => `Precisando de pessoas para buscar ${DiaSemana} pela ${Horario} ${Mes}`,
    entregaAlimentoPronto:(_, { DiaSemana, Horario, Mes })    => `Entregando refeições prontas ${DiaSemana} pela ${Horario} ${Mes}`,
    alimentoPronto:       (d, { URL })                        => `Precisando de ${d.Roaster}${URL}`,
    cestaBasica:          (d, { URL })                        => `Precisando de ${d.Roaster}${URL}`,
    redeSocial:           (d, { DiaSemana, Horario, Mes, URL }) => {
        if (d.Roaster === ROASTER_TYPES.DOADOR)                return `Recebendo alimento para distribuir${URL}`;
        if (d.Roaster === ROASTER_TYPES.ENTREGA_ALIMENTO_PRONTO) return `Entregando refeições prontas ${DiaSemana} pela ${Horario} ${Mes}`;
        return '';
    },
};
