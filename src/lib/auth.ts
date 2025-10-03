/**
 * @deprecated Diese Authentifizierungsimplementierung ist veraltet und wird in zukünftigen Versionen entfernt.
 * Bitte verwende stattdessen die Funktionen aus '@/lib/auth-v2.ts'.
 *
 * Hinweis: Die frühere Implementierung nutzte Lucia und externe Adapter. Um Build-/Type-Errors
 * zu vermeiden, wurde dieses Modul auf einen Stub reduziert. Es wird im Projekt nicht mehr verwendet.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LegacyLucia {}

// Stub-Funktion: existiert nur für rückwärtskompatible Exporte. Nicht verwenden.
export function initializeLucia(_D1: unknown): LegacyLucia {
  throw new Error('initializeLucia (legacy) is deprecated. Use auth-v2 instead.');
}
