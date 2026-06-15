import L from 'leaflet';
import { CLUSTER_THRESHOLDS } from './mapConstants';

// formatRelativeTime now lives in its own dependency-free SOT module (built on
// Intl.RelativeTimeFormat). Re-exported here so existing importers of
// './mapUtils' are unaffected.
export { formatRelativeTime } from './relativeTime';

/**
 * Creates a marker cluster icon based on child count and cluster type
 * @param {Object} cluster - Leaflet cluster object
 * @param {string} clusterType - Type of cluster ('precisando', 'anjos', 'entrega')
 * @returns {L.DivIcon} Cluster icon
 */
const createClusterIcon = (cluster, baseClassName) => {
  const childCount = cluster.getChildCount();
  let sizeClass = ' marker-cluster-';

  if (childCount < CLUSTER_THRESHOLDS.SMALL) {
    sizeClass += 'small';
  } else if (childCount < CLUSTER_THRESHOLDS.MEDIUM) {
    sizeClass += 'medium';
  } else {
    sizeClass += 'large';
  }

  return new L.DivIcon({
    html: `<div><span>${childCount}</span></div>`,
    className: `marker-cluster${sizeClass}-${baseClassName}`,
    iconSize: new L.Point(40, 40),
  });
};

/**
 * Marker cluster options for "precisando" markers
 */
export const markerClusterOptionsPrecisando = (cluster) => {
  return createClusterIcon(cluster, 'precisandoCluster');
};

/**
 * Marker cluster options for "anjos" markers
 */
export const markerClusterOptionsAnjos = (cluster) => {
  return createClusterIcon(cluster, 'anjosCluster');
};

/**
 * Marker cluster options for "entrega" markers
 */
export const markerClusterOptionsEntrega = (cluster) => {
  return new L.DivIcon({
    html: `<div><span>${cluster.getChildCount()}</span></div>`,
    className: 'redHub marker-cluster',
    iconSize: new L.Point(40, 40),
  });
};

/**
 * Formats a phone number for display
 * @param {string} telefone - Raw phone number
 * @returns {Object} Formatted phone data with URL and display text
 */
export const formatPhoneNumber = (telefone) => {
  if (!telefone || telefone.length === 0) {
    return { formatted: '', url: '', display: '' };
  }

  const urlTelefone = `whatsapp://send?phone=55${telefone}`;
  const legivelTelefone = telefone.replace ? telefone.replace(/(\d{2})(\d{5})(\d{4})/g, "($1) $2-$3") : 'TEL_PROB';

  switch (telefone.length) {
    case 8:
      return {
        formatted: telefone.replace(/(\d{4})(\d{4})/g, "$1-$2"),
        url: '',
        isLink: false,
      };
    case 9:
      return {
        formatted: telefone.replace(/(\d{5})(\d{4})/g, "$1-$2"),
        url: '',
        isLink: false,
      };
    default:
      return {
        formatted: legivelTelefone,
        url: urlTelefone,
        isLink: true,
      };
  }
};

/**
 * Calculates average rating from rating object
 * @param {Object} avaliacao - Rating data object with vote counts
 * @returns {Object} Processed rating data with average and total
 */
export const calculateRating = (avaliacao) => {
  if (!avaliacao) {
    return { nota: 0, totalClicks: 0 };
  }

  const totalClicks = (avaliacao["5"] || 0) + (avaliacao["4"] || 0) +
                      (avaliacao["3"] || 0) + (avaliacao["2"] || 0) +
                      (avaliacao["1"] || 0);

  if (totalClicks === 0) {
    return { nota: 0, totalClicks: 0 };
  }

  const weightedSum = (avaliacao["5"] || 0) * 5 +
                      (avaliacao["4"] || 0) * 4 +
                      (avaliacao["3"] || 0) * 3 +
                      (avaliacao["2"] || 0) * 2 +
                      (avaliacao["1"] || 0) * 1;

  const nota = Math.round((weightedSum / totalClicks) * 100) / 100;

  return { nota, totalClicks };
};

/**
 * Creates Google Maps direction URL
 * @param {Array} coordinates - [lat, lng]
 * @returns {string} Google Maps URL
 */
export const createDirectionUrl = (coordinates) => {
  return `https://www.google.com/maps/search/${coordinates[0]},${coordinates[1]}`;
};

/**
 * Checks if a marker should be filtered OUT (hidden) for the active filters.
 *
 * Returns true => HIDE the marker. Two orthogonal gates, ORed (any true hides):
 *  - telefoneFilter: hide markers with no contact (unchanged behavior).
 *  - period window: hide markers OLDER than the chosen window. The window is
 *    `filters.periodMaxHours` (in hours, from PERIOD_OPTIONS via the selected
 *    periodId), compared against the marker's REAL ISO date through
 *    isWithinTimeThreshold(dateISO, maxHours). This REPLACED the old
 *    `dateMarked.includes("ano")` substring branch (fragile + binary).
 *
 * Risk mitigation (FILTRO_TEMPO_PLAN §7): if dateISO is absent/invalid OR the
 * window is Infinity ('todos'), do NOT filter by period - treat the marker as
 * always-visible, so a marker with a missing/bad DateISO never disappears under
 * a finite window.
 *
 * @param {Object} filters - Filter configuration (telefoneFilter, periodMaxHours)
 * @param {*} contato - Contact display (falsy/empty => "no contact")
 * @param {string} dateISO - The marker's real ISO date string
 * @returns {boolean} True if the marker should be hidden
 */
export const shouldApplyFilter = (filters, contato, dateISO) => {
  if (filters.telefoneFilter && (!contato || contato === '')) {
    return true;
  }

  const maxHours = filters.periodMaxHours;
  if (maxHours != null && maxHours !== Infinity && dateISO) {
    // §7: only HIDE for a VALID, parseable date that is out of window. An
    // unparseable DateISO (NaN) must stay visible, not vanish under a finite
    // window - so we gate on a real timestamp before testing the threshold.
    const ts = new Date(dateISO).getTime();
    if (!Number.isNaN(ts) && !isWithinTimeThreshold(dateISO, maxHours)) {
      return true;
    }
  }

  return false;
};

/**
 * Checks if marker is within time threshold (for test markers)
 * @param {string} dateISO - ISO date string
 * @param {number} maxHours - Maximum hours threshold
 * @returns {boolean} True if within threshold
 */
export const isWithinTimeThreshold = (dateISO, maxHours) => {
  const msec = Date.now() - new Date(dateISO).getTime();
  const mins = Math.floor(msec / 60000);
  const hrs = Math.floor(mins / 60);

  return hrs <= maxHours;
};

/**
 * Determines if device is mobile based on window width
 * @returns {boolean} True if mobile
 */
export const isMobileDevice = () => {
  return window.innerWidth < 480;
};
