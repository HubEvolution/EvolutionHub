'use strict';
/**
 * AOS utilities
 * - Konsistente Berechnung von data-aos-delay Werten für Stagger-Animationen
 * - Type-safe AOS attribute generation
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.aosDelayForIndex = aosDelayForIndex;
exports.getAosAttributes = getAosAttributes;
/**
 * Liefert einen gekappten Verzögerungswert in ms für den gegebenen Index.
 * - Clamped auf >= 0
 * - step, max und start sind konfigurierbar
 */
function aosDelayForIndex(index, options = {}) {
  const { step = 100, max = 400, start = 0 } = options;
  const i = Math.max(0, Math.floor(index || 0));
  const delay = start + i * step;
  return Math.min(delay, max);
}
/**
 * Generate AOS data attributes from AosWrapperProps
 * Useful for programmatic AOS attribute generation
 *
 * @param props - AosWrapper configuration
 * @returns Object with data-aos-* attributes
 *
 * @example
 * const attrs = getAosAttributes({ animation: 'fade-left', delay: 100 });
 * // Returns: { 'data-aos': 'fade-left', 'data-aos-delay': '100', 'data-aos-duration': '700' }
 */
function getAosAttributes(props = {}) {
  const { animation = 'fade-up', delay = 0, duration = 700, disableAos = false } = props;
  if (disableAos) {
    return {};
  }
  return {
    'data-aos': animation,
    'data-aos-duration': String(duration),
    ...(delay > 0 ? { 'data-aos-delay': String(delay) } : {}),
  };
}
