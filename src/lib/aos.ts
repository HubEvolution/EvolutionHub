/**
 * AOS utilities
 * - Konsistente Berechnung von data-aos-delay Werten für Stagger-Animationen
 */

export interface AosDelayOptions {
  step?: number;   // Schrittweite in ms zwischen Items (Default: 100)
  max?: number;    // maximale Verzögerung in ms (Default: 400)
  start?: number;  // Start-Offset in ms (Default: 0)
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
