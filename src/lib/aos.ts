/**
 * AOS utilities
 * - Konsistente Berechnung von data-aos-delay Werten für Stagger-Animationen
 * - Type-safe AOS attribute generation
 */

export interface AosDelayOptions {
  step?: number; // Schrittweite in ms zwischen Items (Default: 100)
  max?: number; // maximale Verzögerung in ms (Default: 400)
  start?: number; // Start-Offset in ms (Default: 0)
}

/**
 * Liefert einen gekappten Verzögerungswert in ms für den gegebenen Index.
 * - Clamped auf >= 0
 * - step, max und start sind konfigurierbar
 */
export function aosDelayForIndex(index: number, options: AosDelayOptions = {}): number {
  const { step = 100, max = 400, start = 0 } = options;
  const i = Math.max(0, Math.floor(index || 0));
  const delay = start + i * step;
  return Math.min(delay, max);
}

/**
 * AosWrapper component props interface
 * Used for type-safe AOS configuration
 */
export interface AosWrapperProps {
  animation?: string;
  delay?: number;
  duration?: number;
  class?: string;
  tag?: string;
  disableAos?: boolean;
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
export function getAosAttributes(props: Partial<AosWrapperProps> = {}) {
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
