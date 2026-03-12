import L from 'leaflet';
import TimeAgo from 'javascript-time-ago';
import pt from 'javascript-time-ago/locale/pt.json';
import { CLUSTER_THRESHOLDS } from './mapConstants';

// Initialize TimeAgo - with safety check to prevent duplicate registration
TimeAgo.addLocale(pt);

const timeAgo = new TimeAgo('pt-PT');

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
 * Formats a date as relative time
 * @param {string} dateISO - ISO date string
 * @returns {string} Formatted relative time
 */
export const formatRelativeTime = (dateISO) => {
  if (!dateISO) return '';

  const timestamp = new Date(dateISO).getTime();
  return timeAgo.format(Date.now() - (Date.now() - timestamp));
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
 * Checks if filter should be applied to marker
 * @param {Object} filters - Filter configuration from envVariables
 * @param {string} contato - Contact information
 * @param {string} dateMarked - Relative date string
 * @returns {boolean} True if marker should be filtered out
 */
export const shouldApplyFilter = (filters, contato, dateMarked) => {
  if (filters.telefoneFilter && (!contato || contato === '')) {
    return true;
  }

  if (filters.ultimoAnoFilter && dateMarked.includes("ano")) {
    return true;
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
