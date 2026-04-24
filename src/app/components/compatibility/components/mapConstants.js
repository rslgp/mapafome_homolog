import L from 'leaflet';
import { bean, hub, green, red, currentLocation, currentLocationSmall } from './image/svgHandler';

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
const createIcon = (iconUrl, iconSize, className = 'leaflet-bean-icon', interactive = true) => {
  return new L.Icon({
    iconUrl, // Already converted to string by svgHandler
    iconSize: new L.Point(iconSize[0], iconSize[1]),
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
  CURRENT_LOCATION_SMALL: createIcon(currentLocationSmall, [20, 20], 'leaflet-bean-icon', false),
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
