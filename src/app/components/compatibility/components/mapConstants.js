import L from 'leaflet';
import { bean, hub, green, red, currentLocation } from './image/svgHandler';

// F-6 (dropped_pin_invisible_mobile.yaml): inline data-URI for the
// dropped-pin icon. The bundled SVG asset path normally resolves fine,
// but in PWA / "Add to Home Screen" mode a stale service-worker cache
// can serve an outdated manifest where the hashed SVG path 404s — and
// because the hashed URL is committed to the icon at construction
// time, neither Leaflet nor we can detect/recover from the 404. The
// dropped pin is the load-bearing visual cue for the entire publish
// flow on mobile, so we make its URL a data URI: the SVG bytes ARE
// the URL, no network request, no cache, no 404 ever possible. Kept
// minimal — a blue dot with a white ring, matching the design tokens
// already used elsewhere on the map.
const DROPPED_PIN_INLINE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'>" +
      "<ellipse cx='250' cy='250' rx='200' ry='200' fill='#1f3d8a' stroke='#ffffff' stroke-width='40'/>" +
      "<ellipse cx='250' cy='250' rx='80'  ry='80'  fill='#ffffff'/>" +
    "</svg>"
  );

// Map configuration constants
export const MAP_CONFIG = {
  DEFAULT_ZOOM_MOBILE: 7,
  DEFAULT_ZOOM_DESKTOP: 10,
  MOBILE_BREAKPOINT: 480,
  MAX_ZOOM: 18,
  MAP_HEIGHT: "70vh",
  MAP_WIDTH: "100%",
  CLUSTER_RADIUS: 35,
  SPIDER_DISTANCE_MULTIPLIER: 1,
  TEST_MARKER_MAX_HOURS: 3,
};

// Brazil search bounds
export const BRAZIL_BOUNDS = {
  NORTH: [0.275901, -59.178876],
  SOUTH: [-35.558031, -28.944502],
};

// Icon configurations
//
// F-7 (dropped_pin_invisible_mobile.yaml): pass iconAnchor explicitly
// so the icon centers on the lat/lng. Leaflet derives a default anchor
// from iconSize/2 in setIconStyles, but only if the size object is
// passed correctly — relying on derivation is brittle (a refactor that
// changes how iconSize is shaped could silently land the icon at its
// top-left, offsetting it 10 px down-right from the actual coordinate).
// Explicit anchor + popupAnchor removes that risk for every icon.
const createIcon = (iconUrl, iconSize, className = 'leaflet-bean-icon', interactive = true) => {
  const [w, h] = iconSize;
  return new L.Icon({
    iconUrl, // Already converted to string by svgHandler
    iconSize: new L.Point(w, h),
    iconAnchor: new L.Point(w / 2, h / 2),
    popupAnchor: new L.Point(0, -h / 2),
    className,
    interactive,
  });
};

export const ICONS = {
  COFFEE_BEAN: createIcon(bean, [20, 20]),
  HUB: createIcon(hub, [30, 30]),
  GREEN: createIcon(green, [35, 35]),
  RED: createIcon(red, [35, 35]),
  CURRENT_LOCATION: createIcon(currentLocation, [150, 150], 'leaflet-bean-icon', false),
  CURRENT_LOCATION_SMALL: createIcon(DROPPED_PIN_INLINE_SVG, [20, 20], 'leaflet-bean-icon', false),
  TEST: createIcon('https://maps.gstatic.com/tactile/reveal/close_1x_16dp.png', [10, 10], 'leaflet-bean-icon', false),
};

// Marker cluster size thresholds
export const CLUSTER_THRESHOLDS = {
  SMALL: 10,
  MEDIUM: 100,
};

// Tile layer configurations
export const TILE_LAYERS = {
  WAZE: {
    url: "https://worldtiles1.waze.com/tiles/{z}/{x}/{y}.png",
    attribution: " &copy; <a href='https://www.waze.com/pt-BR/live-map' target='_blank' rel='noreferrer'>Waze</a>",
  },
  OPENSTREETMAP: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: " &copy; <a href='http://openstreetmap.org' target='_blank' rel='noreferrer'>OSM</a>",
  },
  SATELLITE: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: " &copy; <a href='https://www.arcgis.com/apps/mapviewer/index.html' target='_blank' rel='noreferrer'>Esri</a>",
  },
};

// Roaster types
export const ROASTER_TYPES = {
  DOADOR: "Doador",
  PRECISANDO_BUSCAR: "PrecisandoBuscar",
  ENTREGA_ALIMENTO_PRONTO: "EntregaAlimentoPronto",
  ALIMENTO_PRONTO: "Alimento pronto",
  CESTA_BASICA: "Alimento de cesta básica",
  TESTE: "Teste",
};

// Filter types
export const FILTER_TYPES = {
  TODOS: "Todos",
  CESTA_BASICA: "CestaBasica",
  MORADOR_RUA: "MoradorRua",
  DOADORES: "Doadores",
  REFEICAO_PRONTA: "Refeição Pronta",
  REDE_SOCIAL: "RedeSocial",
  VERIFICADOS: "Verificados",
  NENHUM: "Nenhum",
};
