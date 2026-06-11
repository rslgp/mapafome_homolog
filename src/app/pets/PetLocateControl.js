'use client';

// PetLocateControl.js — botão "perto de mim" no /pets (PET-M10).
//
// Recentra o mapa na localização do aparelho SOB DEMANDA (não só na carga). Ao
// tocar, chama navigator.geolocation.getCurrentPosition e dá flyTo nas coords.
//
// Degradação CALMA (governador de tom — sem dead end, sem armadilha de erro):
//   • permissão negada / GPS indisponível / timeout  → uma mensagem pt-BR calma
//     numa região aria-live; o mapa CONTINUA usável (busca por endereço segue ali).
//   • sem suporte a geolocalização no aparelho        → mesma mensagem calma.
// Nunca um alert() nem um estado travado: a mensagem some sozinha e o botão volta
// ao normal para o usuário poder tentar de novo ou usar a busca de endereço.
//
// Implementado como um L.Control nativo (como o zoom/geosearch) para conviver com
// o Leaflet — o React monta/desmonta via useEffect. Alvo >=44px, rotulado para AT,
// operável por teclado (é um <button> real dentro do control).

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { t } from '../components/compatibility/components/ux/strings';

// Zoom alvo ao recentrar no aparelho — bairro/quadra, não país.
const LOCATE_ZOOM = 15;
// Quanto tempo a mensagem de status fica visível antes de sumir (ms).
const STATUS_HIDE_DELAY = 6000;
const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

const PetLocateControl = () => {
  const map = useMap();

  useEffect(() => {
    let statusTimer = null;

    const LocateControl = L.Control.extend({
      options: { position: 'topleft' },

      onAdd() {
        const wrap = L.DomUtil.create('div', 'leaflet-bar pet-locate');

        const button = L.DomUtil.create('button', 'pet-locate__btn', wrap);
        button.type = 'button';
        button.setAttribute('aria-label', t('pets.locate.label'));
        button.title = t('pets.locate.title');
        // Glyph (decorativo) + rótulo de texto visível → alvo grande e legível.
        button.innerHTML =
          '<span class="pet-locate__icon" aria-hidden="true">📍</span>' +
          '<span class="pet-locate__text">' + t('pets.locate.label') + '</span>';

        // Região de status pt-BR (aria-live): comunica "procurando" e a falha
        // calma a leitores de tela SEM travar o fluxo. role=status = polite.
        const status = L.DomUtil.create('p', 'pet-locate__status', wrap);
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.hidden = true;

        const showStatus = (text) => {
          status.textContent = text;
          status.hidden = false;
          if (statusTimer) clearTimeout(statusTimer);
          statusTimer = setTimeout(() => {
            status.hidden = true;
            status.textContent = '';
          }, STATUS_HIDE_DELAY);
        };

        const clearStatus = () => {
          if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
          status.hidden = true;
          status.textContent = '';
        };

        const setBusy = (busy) => {
          button.disabled = busy;
          button.setAttribute('aria-busy', busy ? 'true' : 'false');
        };

        const onLocate = () => {
          // Sem suporte de geolocalização: degrada calmo, mapa segue usável.
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            showStatus(t('pets.locate.unsupported'));
            return;
          }
          clearStatus();
          showStatus(t('pets.locate.locating'));
          setBusy(true);
          // getCurrentPosition é disparado SÍNCRONO no handler do gesto (sem await
          // antes) — alguns navegadores mobile descartam pedidos de permissão
          // fora do gesto. Os callbacks são assíncronos, então re-checamos se o
          // mapa ainda existe antes de mexer nele.
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setBusy(false);
              clearStatus();
              if (!map || !map.getContainer()) return;
              map.flyTo([pos.coords.latitude, pos.coords.longitude], LOCATE_ZOOM, {
                animate: true,
              });
            },
            () => {
              // Negado / indisponível / timeout: mensagem calma, sem dead end.
              setBusy(false);
              showStatus(t('pets.locate.denied'));
            },
            GEO_OPTIONS,
          );
        };

        // O clique no botão não deve virar clique no mapa (que solta um pin).
        L.DomEvent.disableClickPropagation(wrap);
        L.DomEvent.disableScrollPropagation(wrap);
        L.DomEvent.on(button, 'click', L.DomEvent.stop);
        L.DomEvent.on(button, 'click', onLocate);

        this._cleanup = () => {
          L.DomEvent.off(button, 'click', onLocate);
          if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
        };

        return wrap;
      },

      onRemove() {
        if (this._cleanup) this._cleanup();
      },
    });

    const control = new LocateControl();
    map.addControl(control);
    return () => {
      map.removeControl(control);
      if (statusTimer) clearTimeout(statusTimer);
    };
  }, [map]);

  return null;
};

export default PetLocateControl;
