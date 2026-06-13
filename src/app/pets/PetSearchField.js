'use client';

// PetSearchField.js — busca de endereço no /pets (PET-M10).
//
// Fork ENXUTO do SearchField do mapa de fome
// (src/app/components/compatibility/components/SearchField.js): MESMO geocoder
// (leaflet-geosearch + OpenStreetMapProvider / Nominatim), MESMO debounce 350ms
// + cache de sessão (política de uso ~1 req/s/IP do Nominatim), MESMO escopo
// país-ciente. Não inventa um geocoder novo.
//
// ── INTL M4 — paridade de escopo com SearchField (I18N-4) ──
//
// A busca de pets deixa de estar fixada no Brasil. ESPELHA o SearchField de fome
// em DOIS eixos independentes, gateados pela MESMA flag INTL_ENABLED:
//   • GEOGRAFIA: countrycodes/region/searchBounds seguem
//     getCountry(getSelectedCountry()) — o mesmo padrão de
//     SearchField.buildCountryProvider. countrycodes é o filtro que o Nominatim
//     de fato honra; searchBounds só é aplicado quando o país tem bounds (o
//     Brasil mantém o clamp histórico, os demais confiam em countrycodes).
//   • IDIOMA: accept-language passa de 'br' (BUG: 'br' é um CÓDIGO DE PAÍS, não
//     uma tag de idioma BCP-47 — o cabeçalho do SearchField avisa que isso gera
//     labels distorcidos) para getLocale() (a locale de UI, pt-BR / es), o eixo
//     que rotula os resultados. É um eixo SEPARADO da geografia.
// Com a flag OFF (o default dark-ship) a geografia fica fixada em 'br' EXATAMENTE
// como antes; a única mudança observável é accept-language='pt-BR' em vez de 'br'
// — uma correção de bug (tag de idioma válida), não uma mudança de comportamento
// (pt-BR é o idioma correto para o Brasil).
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

import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { LatLng } from 'leaflet';
// CSS do controle (o /pets não importa App.css). Versão casada com o pacote 4.x.
import 'leaflet-geosearch/dist/geosearch.css';

import { ICONS } from '../components/compatibility/components/mapConstants';
import { t, getLocale } from '../components/compatibility/components/ux/strings';
import { getCountry, DEFAULT_COUNTRY } from '../components/compatibility/components/countries';
import { getSelectedCountry, subscribe } from '../components/compatibility/components/countryStore';
import { INTL_ENABLED } from '../components/compatibility/components/intlConfig';

// buildPetCountryProvider(code) — ESPELHA SearchField.buildCountryProvider em
// DOIS eixos (I18N-4/INTL M4), com o MESMO escopo país-ciente, mas mantendo o
// wrapper de debounce+cache PRÓPRIO do /pets (que trata o caminho de SUBMIT do
// modo 'bar' — ver a nota longa no wrapper abaixo; o SearchField de fome não tem
// esse caminho, por isso o wrapper não é compartilhado/extraído: rule_of_three +
// over_decoupling — só 2 consumidores, com wrappers distintos). `code` é um código
// de país ISO-3166 alpha-2 minúsculo; getCountry() sempre devolve um país válido
// (cai no default), então os params nunca ficam vazios.
export function buildPetCountryProvider(code) {
  const country = getCountry(code);
  const providerOptions = { region: country.code };
  if (country.bounds) {
    providerOptions.searchBounds = [
      new LatLng(country.bounds[0][0], country.bounds[0][1]),
      new LatLng(country.bounds[1][0], country.bounds[1][1]),
    ];
  }
  const base = new OpenStreetMapProvider({
    params: {
      // A língua do label segue a locale de UI (SOT strings.js), NÃO o código do
      // país. countrycodes abaixo é o que restringe geograficamente; accept-
      // language só escolhe o idioma dos nomes (eixo separado, I18N-4/INTL M4).
      'accept-language': getLocale(),
      countrycodes: country.code,
      addressdetails: 1,
    },
    providerOptions,
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
}

/**
 * PetSearchField — adiciona busca de endereço ao mapa de pets.
 * Ao selecionar um resultado, o próprio controle dá pan/zoom no mapa
 * (updateMap:true) — o PetMap já é dono da instância do mapa, então não
 * precisamos levantar estado para o PetsApp.
 */
const PetSearchField = () => {
  const map = useMap();

  // ESPELHA SearchField: o país selecionado (countryStore, default 'br') escopa o
  // geocoder. Seedamos a partir do store quando INTL_ENABLED; com a flag OFF a
  // busca fica fixada no Brasil EXATAMENTE como antes — ignoramos o store, seedamos
  // 'br' e nunca assinamos, então um país persistido obsoleto nunca vaza enquanto a
  // feature está dark.
  const [countryCode, setCountryCode] = useState(
    INTL_ENABLED ? getSelectedCountry : () => DEFAULT_COUNTRY,
  );

  useEffect(() => {
    if (!INTL_ENABLED) return undefined;
    return subscribe(setCountryCode);
  }, []);

  // Provider país-ciente (debounce 350ms + cache de 50, escopo via getCountry),
  // reconstruído quando o país muda — preservando o debounce + cache. Mesma
  // disciplina do SearchField de fome (que re-subscreve no countryStore).
  const provider = useMemo(() => buildPetCountryProvider(countryCode), [countryCode]);

  const searchControl = useMemo(() => new GeoSearchControl({
    provider,
    // 'bar': campo sempre visível (alcançável por teclado/AT). updateMap:true faz
    // o próprio controle dar pan/zoom ao selecionar.
    style: 'bar',
    marker: {
      icon: ICONS.CURRENT_LOCATION,
      draggable: false,
    },
    showMarker: true,
    updateMap: true,
    autoClose: true,
    keepResult: true,
    searchLabel: t('pets.search.label'),
    clearSearchLabel: t('pets.search.clear'),
    notFoundMessage: t('pets.search.notFound'),
  }), [provider]);

  useEffect(() => {
    map.addControl(searchControl);

    // Reposiciona o mapa quando uma localização é escolhida. O controle JÁ faz
    // isso via updateMap, mas em alguns navegadores/versões o pan interno não
    // dispara de forma confiável no modo 'bar'; este listener é a rede de
    // segurança que garante o reposicionamento (usa bounds quando houver, senão
    // centra no ponto). É idempotente com o updateMap do controle.
    const handleShowLocation = (e) => {
      const loc = e && e.location;
      if (!loc) return;
      const hasBounds = Array.isArray(loc.bounds) && loc.bounds.length === 2;
      if (hasBounds) {
        map.fitBounds(loc.bounds);
      } else if (Number.isFinite(loc.y) && Number.isFinite(loc.x)) {
        map.setView([loc.y, loc.x], Math.max(map.getZoom(), 14));
      }
    };
    map.on('geosearch/showlocation', handleShowLocation);

    // O input gerado pelo plugin não traz aria-label/type=search nem dicas de
    // teclado mobile. No modo 'bar' o controle é montado no .leaflet-control-
    // container (topo), e pode existir MAIS DE UM .leaflet-control-geosearch no
    // DOM — então buscamos o input pelo formulário do PRÓPRIO controle (que tem
    // os resultados), não por um seletor genérico. pcall-style: null-check, nunca lança.
    const container = map.getContainer();
    const input = searchControl.searchElement && searchControl.searchElement.input;
    if (input) {
      input.setAttribute('type', 'search');
      input.setAttribute('aria-label', t('pets.search.label'));
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('enterkeyhint', 'search');
    }

    // REDE DE SEGURANÇA do clique/toque no resultado. No modo 'bar' o handler
    // interno do plugin não reposiciona o mapa de forma confiável (a lista de
    // resultados é criada dinamicamente e o onSubmit nem sempre dispara). Em vez
    // de depender disso, DELEGAMOS o evento no formulário do controle (que sempre
    // existe), subimos de e.target até o item com data-key, lemos o resultado
    // correspondente em searchControl.resultList.results e reposicionamos o mapa
    // nós mesmos. Usamos 'pointerdown' (dispara ANTES de o plugin limpar a lista).
    const formEl = searchControl.searchElement && searchControl.searchElement.form;
    const selectResultFromEvent = (ev) => {
      let node = ev.target;
      while (node && node !== formEl && !(node.getAttribute && node.getAttribute('data-key') !== null && node.hasAttribute('data-key'))) {
        node = node.parentElement;
      }
      if (!node || !node.hasAttribute || !node.hasAttribute('data-key')) return;
      const idx = Number(node.getAttribute('data-key'));
      const results = searchControl.resultList && searchControl.resultList.results;
      const loc = Array.isArray(results) ? results[idx] : null;
      if (loc) {
        // Preenche o input + fecha a lista, espelhando o comportamento do plugin,
        // e reposiciona o mapa (bounds quando houver, senão centra no ponto).
        if (input) input.value = loc.label || '';
        handleShowLocation({ location: loc });
      }
    };
    if (formEl) formEl.addEventListener('pointerdown', selectResultFromEvent, true);

    return () => {
      map.off('geosearch/showlocation', handleShowLocation);
      if (formEl) formEl.removeEventListener('pointerdown', selectResultFromEvent, true);
      map.removeControl(searchControl);
    };
  }, [map, searchControl]);

  return null;
};

// Sem props: o controle é autocontido e opera, via useMap(), o mapa que já possui.

export default PetSearchField;
