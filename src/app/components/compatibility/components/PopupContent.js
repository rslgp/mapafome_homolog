import React from 'react';
import { Popup } from 'react-leaflet';
import Rating from '@mui/material/Rating';
import PropTypes from 'prop-types';

/**
 * PopupContent Component
 * Displays marker popup with location details and action buttons
 */
const PopupContent = ({
  googleDirection,
  precisandoMsg,
  dateMarked,
  contato,
  redeSocial,
  avaliacao,
  alimentoEntregue,
  roaster,
  verificado,
  mapCoords,
  onAvaliar,
  onVerificarPonto,
  onRemoverPonto,
  onEntregarAlimento,
}) => {
  const { nota = 0, totalClicks = 0 } = avaliacao || {};
  const isDoadorOrEntrega = roaster === "Doador" || roaster === "EntregaAlimentoPronto";

  return (
    <Popup>
      <a href={googleDirection} target='_blank' rel="noreferrer">
        Ir para o destino
        <img
          className="directionIcon"
          src="https://maps.gstatic.com/tactile/omnibox/directions-2x-20150909.png"
          alt="Direção"
        />
      </a>
      <br/>
      <div style={{width:'80%'}}> {precisandoMsg} </div>
      <br/>
      {dateMarked} {contato}

      {redeSocial && (
        <>
          <br/>
          <a href={`https://${redeSocial}`} target='_blank' rel='noreferrer'>
            RedeSocial
          </a>
        </>
      )}

      <br/>
      (
        <svg width="12" height="12" viewBox="0 0 24 24" focusable="false">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z"></path>
        </svg>
        {nota}
      )
      ({totalClicks} notas)
      <br/>
      Avalie:
      <br/>
      <Rating
        name="simple-controlled"
        value={nota}
        onChange={(event, newValue) => {
          onAvaliar(mapCoords, newValue);
        }}
        size="large"
        sx={{"font-size":"2.125rem"}}
      />

      <br/>
      (Qtde entregue: {alimentoEntregue})

      {isDoadorOrEntrega && (
        verificado === 1 ? (
          <img
            src="https://static.xx.fbcdn.net/assets/?revision=1174640696642832&amp;name=ig-verifiedbadge-shared&amp;density=1"
            alt="Verificado"
          />
        ) : (
          <button onClick={() => onVerificarPonto(mapCoords, roaster)}>
            cnpj
          </button>
        )
      )}

      <br/>
      <button onClick={() => onRemoverPonto(mapCoords, roaster)}>
        apagar
      </button>
      <span>    </span>
      <button
        className='buttonsSidebySide floatRight'
        onClick={() => onEntregarAlimento(mapCoords)}
      >
        entreguei
      </button>
    </Popup>
  );
};

PopupContent.propTypes = {
  googleDirection: PropTypes.string.isRequired,
  precisandoMsg: PropTypes.string.isRequired,
  dateMarked: PropTypes.string.isRequired,
  contato: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
  redeSocial: PropTypes.string,
  avaliacao: PropTypes.shape({
    nota: PropTypes.number,
    totalClicks: PropTypes.number,
  }),
  alimentoEntregue: PropTypes.number,
  roaster: PropTypes.string.isRequired,
  verificado: PropTypes.number,
  mapCoords: PropTypes.arrayOf(PropTypes.number).isRequired,
  onAvaliar: PropTypes.func.isRequired,
  onVerificarPonto: PropTypes.func.isRequired,
  onRemoverPonto: PropTypes.func.isRequired,
  onEntregarAlimento: PropTypes.func.isRequired,
};

PopupContent.defaultProps = {
  contato: '',
  redeSocial: null,
  avaliacao: { nota: 0, totalClicks: 0 },
  alimentoEntregue: 0,
  verificado: 0,
};

export default PopupContent;
