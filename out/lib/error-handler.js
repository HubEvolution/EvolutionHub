'use strict';
/**
 * Zentraler Error-Handler für API-Endpunkte
 *
 * Dieses Modul bietet eine konsistente Fehlerbehandlung für alle API-Endpunkte.
 * Es konvertiert ServiceError-Typen in entsprechende HTTP-Fehlercodes und
 * einheitliche Frontend-Fehlermeldungen.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.httpStatusMap = exports.errorCodeMap = void 0;
exports.getErrorCode = getErrorCode;
exports.getHttpStatus = getHttpStatus;
exports.handleApiError = handleApiError;
exports.handleAuthError = handleAuthError;
const types_1 = require('@/lib/services/types');
const response_helpers_1 = require('@/lib/response-helpers');
const locale_path_1 = require('@/lib/locale-path');
/**
 * Fehler-Map für die Konvertierung von ServiceError-Typen zu spezifischen Fehlercodes
 */
exports.errorCodeMap = {
  [types_1.ServiceErrorType.NOT_FOUND]: 'NotFound',
  [types_1.ServiceErrorType.VALIDATION]: 'InvalidInput',
  [types_1.ServiceErrorType.AUTHENTICATION]: 'InvalidCredentials',
  [types_1.ServiceErrorType.AUTHORIZATION]: 'Forbidden',
  [types_1.ServiceErrorType.DATABASE]: 'ServerError',
  [types_1.ServiceErrorType.UNKNOWN]: 'ServerError',
  [types_1.ServiceErrorType.CONFLICT]: 'Conflict',
  [types_1.ServiceErrorType.RATE_LIMIT]: 'TooManyRequests',
  default: 'ServerError',
};
/**
 * Map für HTTP-Statuscodes basierend auf ServiceError-Typen
 */
exports.httpStatusMap = {
  [types_1.ServiceErrorType.NOT_FOUND]: 404,
  [types_1.ServiceErrorType.VALIDATION]: 400,
  [types_1.ServiceErrorType.AUTHENTICATION]: 401,
  [types_1.ServiceErrorType.AUTHORIZATION]: 403,
  [types_1.ServiceErrorType.DATABASE]: 500,
  [types_1.ServiceErrorType.UNKNOWN]: 500,
  [types_1.ServiceErrorType.CONFLICT]: 409,
  [types_1.ServiceErrorType.RATE_LIMIT]: 429,
  default: 500,
};
/**
 * Konvertiert einen ServiceError in einen standardisierten Fehlercode
 *
 * @param error Der aufgetretene Fehler
 * @returns Der standardisierte Fehlercode
 */
function getErrorCode(error) {
  if (error instanceof types_1.ServiceError) {
    return exports.errorCodeMap[error.type] || exports.errorCodeMap.default;
  }
  return exports.errorCodeMap.default;
}
/**
 * Konvertiert einen ServiceError in einen HTTP-Statuscode
 *
 * @param error Der aufgetretene Fehler
 * @returns Der entsprechende HTTP-Statuscode
 */
function getHttpStatus(error) {
  if (error instanceof types_1.ServiceError) {
    return exports.httpStatusMap[error.type] || exports.httpStatusMap.default;
  }
  return exports.httpStatusMap.default;
}
/**
 * Handler für Fehler in API-Endpunkten, die JSON zurückgeben
 *
 * @param error Der aufgetretene Fehler
 * @returns Eine standardisierte JSON-Response mit Fehlerdetails
 */
function handleApiError(error) {
  console.error('API error:', error);
  const errorCode = getErrorCode(error);
  const status = getHttpStatus(error);
  // Extrahiere zusätzliche Details für die Entwicklungsumgebung
  let details = undefined;
  if (import.meta.env.DEV && error instanceof types_1.ServiceError) {
    details = error.details;
  }
  // Erstelle eine standardisierte Fehlerantwort
  return new Response(
    JSON.stringify({
      success: false,
      error: errorCode,
      message: error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten',
      details,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
/**
 * Handler für Fehler in Authentifizierungs-Endpunkten, die Redirects verwenden
 *
 * @param error Der aufgetretene Fehler
 * @param baseUrl Die Basis-URL für den Redirect
 * @param contextParams Zusätzliche Parameter für den Redirect (z.B. token)
 * @returns Eine sichere Redirect-Response mit Fehlercode
 */
function handleAuthError(error, baseUrl, contextParams = {}) {
  console.error(`Auth error for ${baseUrl}:`, error);
  const errorCode = getErrorCode(error);
  // Spezialfall: Unverifizierte E-Mail soll zur Verifizierungsseite weiterleiten
  if (error instanceof types_1.ServiceError && error.details?.reason === 'email_not_verified') {
    const params = { error: 'EmailNotVerified' };
    if (typeof error.details?.email === 'string') {
      params.email = error.details.email;
    }
    const query = new URLSearchParams(params).toString();
    // Locale aus baseUrl ableiten und Verifizierungs-URL entsprechend lokalisieren
    const baseLocale = (0, locale_path_1.getPathLocale)(baseUrl);
    const verifyPath = baseLocale
      ? (0, locale_path_1.localizePath)(baseLocale, '/verify-email')
      : '/verify-email';
    return (0, response_helpers_1.createSecureRedirect)(`${verifyPath}?${query}`);
  }
  // Parameter als Query-String formatieren
  const queryParams = Object.entries(contextParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  // Basis-URL mit Parametern und Fehlercode kombinieren
  const redirectUrl = `${baseUrl}${queryParams ? `?${queryParams}&` : '?'}error=${errorCode}`;
  return (0, response_helpers_1.createSecureRedirect)(redirectUrl);
}
