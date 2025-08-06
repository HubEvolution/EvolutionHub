/**
 * Response-Hilfsfunktionen
 * Stellt einheitliche Funktionen für die Erstellung konsistenter Responses bereit
 */

import { applySecurityHeaders } from './security-headers';

/**
 * Erstellt eine Redirect-Response mit automatisch angewendeten Security-Headers
 * Vereinfacht den Redirect-Flow in Auth-Endpunkten und sorgt für konsistente Security-Headers
 *
 * @param location - Die Redirect-URL (kann absolute URL oder relativer Pfad sein)
 * @param status - HTTP-Statuscode für den Redirect (Standard: 302 Found)
 * @param headers - Zusätzliche HTTP-Header, die in die Response eingefügt werden sollen
 * @returns Response-Objekt mit Security-Headers
 */
export function createSecureRedirect(
  location: string,
  status: 301 | 302 | 303 | 307 | 308 = 302,
  headers: Record<string, string> = {}
): Response {
  const response = new Response(null, {
    status,
    headers: {
      Location: location,
      ...headers
    }
  });

  return applySecurityHeaders(response);
}

/**
 * Erstellt eine JSON-Response mit automatisch angewendeten Security-Headers
 * Vereinfacht den JSON-Response-Flow in API-Endpunkten und sorgt für konsistente Security-Headers
 * 
 * @param data - Die zu serialisierenden JSON-Daten
 * @param status - HTTP-Statuscode für die Response (Standard: 200 OK)
 * @param headers - Zusätzliche HTTP-Header, die in die Response eingefügt werden sollen
 * @returns Response-Objekt mit Security-Headers
 */
export function createSecureJsonResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  return applySecurityHeaders(response);
}

/**
 * Erstellt eine Error-Response mit korrektem Statuscode und automatisch angewendeten Security-Headers
 * Vereinfacht den Error-Handling-Flow in API-Endpunkten
 * 
 * @param message - Die Fehlermeldung
 * @param status - HTTP-Statuscode für die Response (Standard: 400 Bad Request)
 * @param code - Optionaler Fehlercode für die Strukturierung von Fehlerresponses
 * @returns Response-Objekt mit Security-Headers
 */
export function createSecureErrorResponse(
  message: string,
  status: number = 400,
  code?: string
): Response {
  return createSecureJsonResponse(
    {
      error: true,
      message,
      ...(code ? { code } : {})
    },
    status
  );
}
