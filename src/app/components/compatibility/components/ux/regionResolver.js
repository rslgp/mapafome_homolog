// Client-side, zero-network coords → region slug resolver.
// Bounding boxes are intentionally coarse (city-area, not pinpoint): the goal
// is to pick a sponsor banner that's relevant to the user, not geocoding.
//
// Adding a new region = appending one entry to REGIONS. No build step, no API.

const REGIONS = [
  // Recife metro (Pernambuco)
  { slug: 'pe-recife', bbox: { north: -7.90, south: -8.20, west: -35.05, east: -34.80 } },
  // São Paulo metro
  { slug: 'sp-sp',     bbox: { north: -23.35, south: -23.80, west: -46.85, east: -46.35 } },
  // Rio de Janeiro metro
  { slug: 'rj-rj',     bbox: { north: -22.75, south: -23.10, west: -43.80, east: -43.10 } },
  // Belo Horizonte metro
  { slug: 'mg-bh',     bbox: { north: -19.75, south: -20.10, west: -44.10, east: -43.85 } },
  // Salvador metro
  { slug: 'ba-sal',    bbox: { north: -12.85, south: -13.05, west: -38.60, east: -38.35 } },
  // Fortaleza metro
  { slug: 'ce-for',    bbox: { north: -3.65,  south: -3.90,  west: -38.65, east: -38.40 } },
  // Porto Alegre metro
  { slug: 'rs-poa',    bbox: { north: -29.95, south: -30.15, west: -51.30, east: -51.10 } },
  // Curitiba metro
  { slug: 'pr-cwb',    bbox: { north: -25.35, south: -25.60, west: -49.40, east: -49.15 } },
  // Brasília
  { slug: 'df-bsb',    bbox: { north: -15.65, south: -15.95, west: -48.05, east: -47.75 } },
];

export function resolveRegion(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return 'global';
  const [lat, lng] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'global';
  for (const r of REGIONS) {
    const { north, south, west, east } = r.bbox;
    if (lat <= north && lat >= south && lng >= west && lng <= east) return r.slug;
  }
  return 'global';
}

// Exposed for tests / debugging. Never consumed by the render path.
export { REGIONS };
