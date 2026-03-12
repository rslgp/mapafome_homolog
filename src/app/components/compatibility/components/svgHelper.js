/**
 * SVG Helper Utility
 * Handles Next.js SVG imports that return objects instead of strings
 */

/**
 * Extracts the actual URL from imported SVG (handles Next.js import objects)
 * @param {string|object} svgImport - The imported SVG (could be string or object with .src)
 * @returns {string} The actual URL string
 *
 * @example
 * import bean from './images/bean.svg';
 * <img src={getSvgSrc(bean)} alt="bean" />
 */
export const getSvgSrc = (svgImport) => {
  // If it's already a string URL, return it
  if (typeof svgImport === 'string') {
    return svgImport;
  }

  // Handle Next.js static import objects
  // Next.js wraps SVGs in objects with .src or .default properties
  if (svgImport?.src) {
    return svgImport.src;
  }

  if (svgImport?.default) {
    return svgImport.default;
  }

  // Fallback: convert to string (may still be [object Object])
  console.warn('SVG import format not recognized, attempting string conversion:', svgImport);
  return String(svgImport);
};

/**
 * React component wrapper for SVG images that handles Next.js imports
 * @param {object} props - Component props
 * @param {string|object} props.src - The imported SVG
 * @param {string} props.alt - Alt text
 * @param {string} props.width - Width
 * @param {string} props.height - Height
 * @param {string} props.className - CSS class
 *
 * @example
 * import bean from './images/bean.svg';
 * <SvgImage src={bean} alt="bean" width="30px" height="30px" />
 */
export const SvgImage = ({ src, alt = '', width, height, className, ...rest }) => {
  return (
    <img
      src={getSvgSrc(src)}
      alt={alt}
      width={width}
      height={height}
      className={className}
      {...rest}
    />
  );
};

export default getSvgSrc;
