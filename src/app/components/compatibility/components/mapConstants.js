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
// SOT for the dropped-pin blue. A CSS var cannot be read at module-eval
// time when this inline-SVG data URI is built, so this synced JS constant
// mirrors the --mdf-pin-blue token in components/ux/tokens.css. The two
// MUST stay equal; change both together (color specialist owns the hue).
const PIN_BLUE = '#1f3d8a';

const DROPPED_PIN_INLINE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'>" +
      "<ellipse cx='250' cy='250' rx='200' ry='200' fill='" + PIN_BLUE + "' stroke='#ffffff' stroke-width='40'/>" +
      "<ellipse cx='250' cy='250' rx='80'  ry='80'  fill='#ffffff'/>" +
    "</svg>"
  );

// Map configuration constants
export const MAP_CONFIG = {
  DEFAULT_ZOOM_MOBILE: 7,
  DEFAULT_ZOOM_DESKTOP: 10,
  // LOCATE_ZOOM — neighborhood/exact-place zoom applied the FIRST time the device
  // GPS fix recenters the map on open (MapViewUpdater). Tighter than the country
  // flag-pick CAPITAL_PICK_ZOOM (11, which frames a metro area when jumping to a
  // capital you only approximately know): a GPS fix is the user's EXACT position,
  // so Z13 reads as "here is you, precisely" and surfaces the food-need pins right
  // around them individually. Sits below MAX_ZOOM (18). Only the FIRST center
  // change uses it; later pans (post-publish ping, etc.) stay pan-only as before.
  LOCATE_ZOOM: 13,
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

// Time-period filter - SINGLE SOURCE OF TRUTH for the 4-level recency selector
// that REPLACED the binary "Esse ano" (ultimoAnoFilter) checkbox. Each window is
// expressed in HOURS so it feeds isWithinTimeThreshold(dateISO, maxHours) in
// mapUtils.js directly (the same age engine the test markers already use), i.e.
// we filter by the marker's REAL DateISO, never the fragile relative-string
// substring `dateMarked.includes("ano")`. `labelKey` is an i18n key resolved via
// t() in the UI (the labels live in the pt/es/en-US blocks of strings.core.js,
// so the keys appear as literals here AND satisfy the no-dead-key parity test).
//
// The 'todos' (Infinity) escape hatch preserves the legacy "see everything"
// behavior the unchecked checkbox gave: without it, making the selector
// mandatory would REMOVE the ability to see older points (a regression). The
// period filter is orthogonal to the "filtro atual" category dropdown: a marker
// shows only if it passes BOTH (logical AND).
export const PERIOD_OPTIONS = [
  { id: 'dia',      maxHours: 24,        labelKey: 'filter.period.daily' },
  { id: 'semana',   maxHours: 24 * 7,    labelKey: 'filter.period.weekly' },
  { id: 'mes',      maxHours: 24 * 30,   labelKey: 'filter.period.monthly' },
  { id: 'semestre', maxHours: 24 * 182,  labelKey: 'filter.period.semiannual' },
  { id: 'ano',      maxHours: 24 * 365,  labelKey: 'filter.period.annual' },
  { id: 'todos',    maxHours: Infinity,  labelKey: 'filter.period.all' },
];

// Default = Mensal (30d).
export const PERIOD_DEFAULT = 'todos';

// Resolve a period id to its window in hours (Infinity for 'todos' / unknown ids,
// which means "no period filtering"). One small helper so callers never re-derive
// the lookup from PERIOD_OPTIONS by hand and drift from this SOT.
export const periodMaxHoursFor = (periodId) => {
  const opt = PERIOD_OPTIONS.find((o) => o.id === periodId);
  return opt ? opt.maxHours : Infinity;
};

// FILTRO_TEMPO Lane B - composition glue for the period selector: mirror the chosen
// window into the shared env POJO (periodId + its hours = the ONE place
// shouldApplyFilter reads). Returns periodId so the caller can set local state in one
// line. Kept here (next to the SOT) so App.js stays under the LOC fitness limit and
// the env-mirror logic lives beside the data it derives from.
export const applyPeriodToEnv = (env, periodId) => {
  env.periodId = periodId;
  env.periodMaxHours = periodMaxHoursFor(periodId);
  return periodId;
};
