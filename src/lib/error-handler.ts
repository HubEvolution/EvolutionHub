/**
 * Zentraler Error-Handler für API-Endpunkte
 *
 * Dieses Modul bietet eine konsistente Fehlerbehandlung für alle API-Endpunkte.
 * Es konvertiert ServiceError-Typen in entsprechende HTTP-Fehlercodes und
 * einheitliche Frontend-Fehlermeldungen.
 */

import { ServiceError, ServiceErrorType } from '@/lib/services/types';
import { createSecureRedirect } from '@/lib/response-helpers';
import { getPathLocale, localizePath } from '@/lib/locale-path';

/**
 * Fehler-Map für die Konvertierung von ServiceError-Typen zu spezifischen Fehlercodes
 */
export const errorCodeMap = {
  [ServiceErrorType.NOT_FOUND]: 'NotFound',
  [ServiceErrorType.VALIDATION]: 'InvalidInput',
  [ServiceErrorType.AUTHENTICATION]: 'InvalidCredentials',
  [ServiceErrorType.AUTHORIZATION]: 'Forbidden',
  [ServiceErrorType.DATABASE]: 'ServerError',
  [ServiceErrorType.UNKNOWN]: 'ServerError',
  [ServiceErrorType.CONFLICT]: 'Conflict',
  [ServiceErrorType.RATE_LIMIT]: 'TooManyRequests',
  default: 'ServerError',
};

/**
 * Map für HTTP-Statuscodes basierend auf ServiceError-Typen
 */
export const httpStatusMap = {
  [ServiceErrorType.NOT_FOUND]: 404,
  [ServiceErrorType.VALIDATION]: 400,
  [ServiceErrorType.AUTHENTICATION]: 401,
  [ServiceErrorType.AUTHORIZATION]: 403,
  [ServiceErrorType.DATABASE]: 500,
  [ServiceErrorType.UNKNOWN]: 500,
  [ServiceErrorType.CONFLICT]: 409,
  [ServiceErrorType.RATE_LIMIT]: 429,
  default: 500,
};

/**
 * Konvertiert einen ServiceError in einen standardisierten Fehlercode
 *
 * @param error Der aufgetretene Fehler
 * @returns Der standardisierte Fehlercode
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ServiceError) {
    return errorCodeMap[error.type] || errorCodeMap.default;
  }

  return errorCodeMap.default;
}

/**
 * Konvertiert einen ServiceError in einen HTTP-Statuscode
 *
 * @param error Der aufgetretene Fehler
 * @returns Der entsprechende HTTP-Statuscode
 */
export function getHttpStatus(error: unknown): number {
  if (error instanceof ServiceError) {
    return httpStatusMap[error.type] || httpStatusMap.default;
  }

  return httpStatusMap.default;
}

/**
 * Handler für Fehler in API-Endpunkten, die JSON zurückgeben
 *
 * @param error Der aufgetretene Fehler
 * @returns Eine standardisierte JSON-Response mit Fehlerdetails
 */
export function handleApiError(error: unknown): Response {
  console.error('API error:', error);

  const errorCode = getErrorCode(error);
  const status = getHttpStatus(error);

  // Extrahiere zusätzliche Details für die Entwicklungsumgebung
  let details = undefined;
  if (import.meta.env.DEV && error instanceof ServiceError) {
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
export function handleAuthError(
  error: unknown,
  baseUrl: string,
  contextParams: Record<string, string> = {}
): Response {
  console.error(`Auth error for ${baseUrl}:`, error);

  const errorCode = getErrorCode(error);

  // Spezialfall: Unverifizierte E-Mail soll zur Verifizierungsseite weiterleiten
  if (error instanceof ServiceError && error.details?.reason === 'email_not_verified') {
    const params: Record<string, string> = { error: 'EmailNotVerified' };
    if (typeof error.details?.email === 'string') {
      params.email = error.details.email;
    }
    const query = new URLSearchParams(params).toString();
    // Locale aus baseUrl ableiten und Verifizierungs-URL entsprechend lokalisieren
    const baseLocale = getPathLocale(baseUrl);
    const verifyPath = baseLocale ? localizePath(baseLocale, '/verify-email') : '/verify-email';
    return createSecureRedirect(`${verifyPath}?${query}`);
  }

  // Parameter als Query-String formatieren
  const queryParams = Object.entries(contextParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  // Basis-URL mit Parametern und Fehlercode kombinieren
  const redirectUrl = `${baseUrl}${queryParams ? `?${queryParams}&` : '?'}error=${errorCode}`;

  return createSecureRedirect(redirectUrl);
}
