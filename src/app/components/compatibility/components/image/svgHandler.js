/**
 * SVG Handler - Centralized SVG imports and URL conversion
 * Imports all SVG files and converts them to usable URL strings
 * This solves the Next.js SVG import issue where imports return objects
 */

import { getSvgSrc } from '../svgHelper';

// Import all SVG files
import beanSvg from '../../images/bean.svg';
import beanOldSvg from '../../images/beanold.svg';
import hubSvg from '../../images/hub.svg';
import greenSvg from '../../images/green.svg';
import redSvg from '../../images/red.svg';
import currentLocationSvg from '../../images/currentLocation.svg';
import currentLocationSmallSvg from '../../images/currentLocationSmall.svg';
import instaSvg from '../../images/insta.svg';
import qrSvg from '../../images/qr.svg';

/**
 * Centralized SVG exports - All SVGs converted to URL strings
 * Use these exports anywhere in your application instead of importing SVGs directly
 *
 * @example
 * import { bean, hub, green } from './image/svgHandler';
 * <img src={bean} alt="bean" />
 */
export const svgs = {
  // Food & Marker Icons
  coffeeBean:getSvgSrc(beanSvg),
  bean: getSvgSrc(beanSvg),
  beanOld: getSvgSrc(beanOldSvg),
  hub: getSvgSrc(hubSvg),
  green: getSvgSrc(greenSvg),
  red: getSvgSrc(redSvg),

  // Location Icons
  currentLocation: getSvgSrc(currentLocationSvg),
  currentLocationSmall: getSvgSrc(currentLocationSmallSvg),

  // Social & Other Icons
  insta: getSvgSrc(instaSvg),
  qr: getSvgSrc(qrSvg),
};

// Named exports for convenience
export const {
  bean,
  beanOld,
  hub,
  green,
  red,
  currentLocation,
  currentLocationSmall,
  insta,
  qr,
} = svgs;

/**
 * Get SVG by name (useful for dynamic icon selection)
 * @param {string} name - The name of the SVG
 * @returns {string|null} The SVG URL or null if not found
 *
 * @example
 * const iconUrl = getSvgByName('bean');
 * <img src={iconUrl} alt="icon" />
 */
export const getSvgByName = (name) => {
  return svgs[name] || null;
};

/**
 * Check if an SVG exists
 * @param {string} name - The name of the SVG
 * @returns {boolean} True if SVG exists
 */
export const hasSvg = (name) => {
  return name in svgs;
};

/**
 * Get all available SVG names
 * @returns {string[]} Array of SVG names
 */
export const getAllSvgNames = () => {
  return Object.keys(svgs);
};

// Default export is the svgs object
export default svgs;