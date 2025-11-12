'use strict';
/**
 * Umgebungskonfiguration und -erkennung
 *
 * Dieses Modul stellt Funktionen und Konstanten bereit, um die aktuelle
 * Ausführungsumgebung zu erkennen und entsprechend zu konfigurieren.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.CURRENT_ENVIRONMENT = exports.EnvironmentType = void 0;
exports.getCurrentEnvironment = getCurrentEnvironment;
exports.isDevelopment = isDevelopment;
exports.isProduction = isProduction;
exports.isPreview = isPreview;
exports.isLocalEnvironment = isLocalEnvironment;
exports.getEnvironmentName = getEnvironmentName;
exports.getEnvironmentDescription = getEnvironmentDescription;
/**
 * Umgebungstypen
 */
var EnvironmentType;
(function (EnvironmentType) {
  EnvironmentType['DEVELOPMENT'] = 'development';
  EnvironmentType['PRODUCTION'] = 'production';
  EnvironmentType['PREVIEW'] = 'preview';
})(EnvironmentType || (exports.EnvironmentType = EnvironmentType = {}));
/**
 * Bestimmt die aktuelle Umgebung basierend auf Umgebungsvariablen
 */
function getCurrentEnvironment() {
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
exports.CURRENT_ENVIRONMENT = getCurrentEnvironment();
/**
 * Prüft, ob die aktuelle Umgebung die Entwicklungsumgebung ist
 */
function isDevelopment() {
  return exports.CURRENT_ENVIRONMENT === EnvironmentType.DEVELOPMENT;
}
/**
 * Prüft, ob die aktuelle Umgebung die Produktionsumgebung ist
 */
function isProduction() {
  return exports.CURRENT_ENVIRONMENT === EnvironmentType.PRODUCTION;
}
/**
 * Prüft, ob die aktuelle Umgebung die Preview-Umgebung ist
 */
function isPreview() {
  return exports.CURRENT_ENVIRONMENT === EnvironmentType.PREVIEW;
}
/**
 * Prüft, ob die aktuelle Umgebung lokal oder remote ist
 *
 * @param env Cloudflare-Umgebungsobjekt
 * @returns true, wenn lokale Umgebung, false wenn remote
 */
function isLocalEnvironment(env) {
  // Prüfen auf explizite Remote-Flag
  if (typeof process !== 'undefined' && process.env.WRANGLER_REMOTE === 'true') {
    return false;
  }
  // Prüfen auf lokale Wrangler-Umgebung
  if (env && env.ENVIRONMENT === 'development') {
    return true;
  }
  return isDevelopment();
}
/**
 * Gibt den Namen der aktuellen Umgebung zurück
 */
function getEnvironmentName() {
  switch (exports.CURRENT_ENVIRONMENT) {
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
function getEnvironmentDescription(env) {
  const envName = getEnvironmentName();
  const isLocal = isLocalEnvironment(env);
  return `${envName} (${isLocal ? 'Lokal' : 'Remote'})`;
}
