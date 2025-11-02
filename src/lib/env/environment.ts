/**
 * Umgebungskonfiguration und -erkennung
 *
 * Dieses Modul stellt Funktionen und Konstanten bereit, um die aktuelle
 * Ausführungsumgebung zu erkennen und entsprechend zu konfigurieren.
 */

/**
 * Umgebungstypen
 */
export enum EnvironmentType {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  PREVIEW = 'preview',
}

/**
 * Bestimmt die aktuelle Umgebung basierend auf Umgebungsvariablen
 */
export function getCurrentEnvironment(): EnvironmentType {
  // Prüfen auf explizite Umgebungsvariable
  const envVar = typeof process !== 'undefined' ? process.env.ENVIRONMENT : undefined;
  if (envVar) {
    if (envVar.toLowerCase() === 'production') return EnvironmentType.PRODUCTION;
    if (envVar.toLowerCase() === 'preview') return EnvironmentType.PREVIEW;
    return EnvironmentType.DEVELOPMENT;
  }

  // Prüfen auf Cloudflare-spezifische Umgebungsvariablen
  const cfEnv = typeof process !== 'undefined' ? process.env.CF_PAGES_BRANCH : undefined;
  if (cfEnv) {
    if (cfEnv === 'main' || cfEnv === 'master') return EnvironmentType.PRODUCTION;
    if (cfEnv === 'preview') return EnvironmentType.PREVIEW;
    return EnvironmentType.DEVELOPMENT;
  }

  // Fallback auf Entwicklungsumgebung
  return EnvironmentType.DEVELOPMENT;
}

/**
 * Aktuelle Umgebung
 */
export const CURRENT_ENVIRONMENT = getCurrentEnvironment();

/**
 * Prüft, ob die aktuelle Umgebung die Entwicklungsumgebung ist
 */
export function isDevelopment(): boolean {
  return CURRENT_ENVIRONMENT === EnvironmentType.DEVELOPMENT;
}

/**
 * Prüft, ob die aktuelle Umgebung die Produktionsumgebung ist
 */
export function isProduction(): boolean {
  return CURRENT_ENVIRONMENT === EnvironmentType.PRODUCTION;
}

/**
 * Prüft, ob die aktuelle Umgebung die Preview-Umgebung ist
 */
export function isPreview(): boolean {
  return CURRENT_ENVIRONMENT === EnvironmentType.PREVIEW;
}

/**
 * Prüft, ob die aktuelle Umgebung lokal oder remote ist
 *
 * @param env Cloudflare-Umgebungsobjekt
 * @returns true, wenn lokale Umgebung, false wenn remote
 */
export function isLocalEnvironment(env: Record<string, unknown>): boolean {
  // Prüfen auf explizite Remote-Flag
  if (typeof process !== 'undefined' && process.env.WRANGLER_REMOTE === 'true') {
    return false;
  }

  // Prüfen auf lokale Wrangler-Umgebung
  if (env && (env as { ENVIRONMENT?: unknown }).ENVIRONMENT === 'development') {
    return true;
  }

  return isDevelopment();
}

/**
 * Gibt den Namen der aktuellen Umgebung zurück
 */
export function getEnvironmentName(): string {
  switch (CURRENT_ENVIRONMENT) {
    case EnvironmentType.PRODUCTION:
      return 'Produktion';
    case EnvironmentType.PREVIEW:
      return 'Preview';
    case EnvironmentType.DEVELOPMENT:
      return 'Entwicklung';
    default:
      return 'Unbekannt';
  }
}

/**
 * Gibt eine Beschreibung der aktuellen Umgebung zurück
 *
 * @param env Cloudflare-Umgebungsobjekt
 * @returns Beschreibung der aktuellen Umgebung
 */
export function getEnvironmentDescription(env: Record<string, unknown>): string {
  const envName = getEnvironmentName();
  const isLocal = isLocalEnvironment(env);

  return `${envName} (${isLocal ? 'Lokal' : 'Remote'})`;
}
