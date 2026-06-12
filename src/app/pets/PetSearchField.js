'use client';

// PetSearchField.js — busca de endereço no /pets (PET-M10).
//
// Fork ENXUTO do SearchField do mapa de fome
// (src/app/components/compatibility/components/SearchField.js): MESMO geocoder
// (leaflet-geosearch + OpenStreetMapProvider / Nominatim), MESMO debounce 350ms
// + cache de sessão (política de uso ~1 req/s/IP do Nominatim), MESMOS limites
// do Brasil. Não inventa um geocoder novo.
//
// Diferenças deliberadas vs o SearchField de fome:
//   • style: 'bar' — o campo fica SEMPRE visível (não um glass colapsado), então
//     é alcançável por teclado/AT sem precisar abrir um toggle primeiro.
//   • cópia pt-BR calma (searchLabel / clearSearchLabel / notFoundMessage).
//   • importa o CSS do controle localmente (o /pets NÃO importa App.css, que é
//     onde o mapa de fome puxa o CSS do geosearch).
//   • acessibilidade: o input gerado pelo plugin não traz aria-label/type=search;
//     adicionamos isso após montar, sem fork do pacote.
//
// Carregado só dentro do PetMap (dynamic import ssr:false), então o `import L`
// e o CSS no topo são seguros (mesmo padrão do PetMap/map.js).

import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { LatLng } from 'leaflet';
// CSS do controle (o /pets não importa App.css). Versão casada com o pacote 4.x.
import 'leaflet-geosearch/dist/geosearch.css';

import { BRAZIL_BOUNDS, ICONS } from '../components/compatibility/components/mapConstants';
import { t } from '../components/compatibility/components/ux/strings';

/**
 * PetSearchField — adiciona busca de endereço ao mapa de pets.
 * Ao selecionar um resultado, o próprio controle dá pan/zoom no mapa
 * (updateMap:true) — o PetMap já é dono da instância do mapa, então não
 * precisamos levantar estado para o PetsApp.
 */
const PetSearchField = () => {
  const map = useMap();

  // Mesmo provider debounced+cacheado do mapa de fome: o leaflet-geosearch dispara
  // provider.search() a cada tecla; o Nominatim é ~1 req/s/IP. Envolvemos com:
  //   • debounce de 350ms (só a última busca da janela sai)
  //   • cache em memória das últimas 50 buscas (repetições não vão à rede)
  const provider = useMemo(() => {
    const base = new OpenStreetMapProvider({
      params: {
        'accept-language': 'br',
        countrycodes: 'br',
        addressdetails: 1,
      },
      providerOptions: {
        searchBounds: [
          new LatLng(BRAZIL_BOUNDS.NORTH[0], BRAZIL_BOUNDS.NORTH[1]),
          new LatLng(BRAZIL_BOUNDS.SOUTH[0], BRAZIL_BOUNDS.SOUTH[1]),
        ],
        region: 'br',
      },
    });

    const cache = new Map();
    const CACHE_LIMIT = 50;
    let pendingTimer = null;
    let pendingResolve = null;

    const originalSearch = base.search.bind(base);
    base.search = (opts) => {
      const key = (opts && opts.query) ? String(opts.query).trim().toLowerCase() : '';
      if (!key) return Promise.resolve([]);

      // SUBMIT (clique no resultado / Enter): o leaflet-geosearch chama
      // provider.search({ query, data: <resultado já resolvido> }). Esse caminho
      // NÃO pode ser debounced — ele precisa devolver o resultado AGORA para o
      // controle dar pan/zoom (showResult -> centerMap). Antes, o debounce
      // engolia o submit (resolvia [] pela via de cancelamento) e o mapa não se
      // reposicionava. Quando `data` veio junto, devolvemos [data] na hora; se
      // não, fazemos UMA busca imediata (sem debounce) e a cacheamos.
      if (opts && opts.data) {
        return Promise.resolve([opts.data]);
      }

      if (cache.has(key)) return Promise.resolve(cache.get(key));

      // Cancela qualquer debounce em voo — só a última busca da janela de 350ms
      // sai; as anteriores resolvem [] para o dropdown limpar em vez de mostrar
      // resultado velho. (Só o autocomplete passa por aqui; o submit já saiu acima.)
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        if (pendingResolve) pendingResolve([]);
      }

      return new Promise((resolve) => {
        pendingResolve = resolve;
        pendingTimer = setTimeout(async () => {
          pendingTimer = null;
          pendingResolve = null;
          try {
            const results = await originalSearch(opts);
            if (cache.size >= CACHE_LIMIT) {
              const firstKey = cache.keys().next().value;
              cache.delete(firstKey);
            }
            cache.set(key, results);
            resolve(results);
          } catch (_e) {
            // 429 / falha de rede: resolve [] para a UI não travar — o usuário
            // refina a busca. Sem dead end (governador de tom calmo).
            resolve([]);
          }
        }, 350);
      });
    };

    return base;
  }, []);

  const searchControl = useMemo(() => new GeoSearchControl({
    provider,
    // 'bar': campo sempre visível (alcançável por teclado/AT). updateMap:true faz
    // o próprio controle dar pan/zoom ao selecionar — sem subir estado p/ o pai.
    style: 'bar',
    marker: {
      icon: ICONS.CURRENT_LOCATION,
      draggable: false,
    },
    showMarker: true,
    autoClose: true,
    keepResult: true,
    searchLabel: t('pets.search.label'),
    clearSearchLabel: t('pets.search.clear'),
    notFoundMessage: t('pets.search.notFound'),
  }), [provider]);

  useEffect(() => {
    map.addControl(searchControl);

    // O input gerado pelo plugin não traz aria-label/type=search nem dicas de
    // teclado mobile. Enriquecemos o DOM já criado (sem fork do pacote) para AT
    // e teclado virtual. pcall-style: tudo guardado por null-check, nunca lança.
    const container = map.getContainer();
    const input = container && container.querySelector('.leaflet-control-geosearch form input');
    if (input) {
      input.setAttribute('type', 'search');
      input.setAttribute('aria-label', t('pets.search.label'));
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('enterkeyhint', 'search');
    }

    return () => map.removeControl(searchControl);
  }, [map, searchControl]);

  return null;
};

// Sem props: o controle é autocontido e opera, via useMap(), o mapa que já possui.

export default PetSearchField;
