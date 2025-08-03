/**
 * Security-Headers-Utility für Evolution Hub
 * 
 * Dieses Modul bietet Funktionen zum Anwenden von standardisierten Sicherheits-Headers
 * auf API-Antworten, um die Anwendung vor verschiedenen Sicherheitsbedrohungen zu schützen.
 */

/**
 * Standard-Sicherheitsheader, die auf alle API-Antworten angewendet werden sollten
 */
export const standardSecurityHeaders: Record<string, string> = {
  // Schützt vor XSS-Angriffen durch Einschränkung der Inhaltsquellen
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';",
  
  // Verhindert Clickjacking durch Einschränkung der iframe-Einbettung
  'X-Frame-Options': 'DENY',
  
  // Blockiert MIME-Sniffing (verhindert, dass der Browser den MIME-Typ einer Ressource errät)
  'X-Content-Type-Options': 'nosniff',
  
  // Aktiviert XSS-Schutz im Browser
  'X-XSS-Protection': '1; mode=block',
  
  // Verhindert das Laden von Seiten, wenn ein XSS-Angriff erkannt wird
  'Referrer-Policy': 'same-origin',
  
  // HTTP Strict Transport Security (erzwingt HTTPS)
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Erlaubt bestimmten Funktionen zu verbieten, um Sicherheitsrisiken zu reduzieren
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  
  // Cross-Origin-Einschränkungen
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

/**
 * API-Sicherheitsheader, optimiert für JSON-API-Endpunkte
 */
export const apiSecurityHeaders: Record<string, string> = {
  ...standardSecurityHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

/**
 * Wendet die Standardsicherheitsheader auf eine Response-Instanz an
 * 
 * @param response Die Response-Instanz, auf die die Header angewendet werden sollen
 * @returns Eine neue Response-Instanz mit den angewendeten Sicherheitsheadern
 */
export function applySecurityHeaders(response: Response): Response {
  // Wenn es sich um eine API-Antwort handelt (angenommen, wenn Content-Type application/json ist)
  const isApiResponse = response.headers.get('Content-Type')?.includes('application/json');
  
  // Auswählen der entsprechenden Header
  const headersToApply = isApiResponse ? apiSecurityHeaders : standardSecurityHeaders;
  
  // Erstellen einer neuen Headers-Instanz mit den bestehenden Headern
  const newHeaders = new Headers(response.headers);
  
  // Anwenden der Sicherheitsheader
  Object.entries(headersToApply).forEach(([key, value]) => {
    // Überschreibe nicht bestehende Content-Type-Header
    if (key === 'Content-Type' && response.headers.has('Content-Type')) {
      return;
    }
    newHeaders.set(key, value);
  });
  
  // Erstellen einer neuen Response mit den gleichen Daten aber mit den aktualisierten Headern
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

/**
 * Erzeugt eine neue JSON-Response mit Security-Headers
 * 
 * @param data Die zu serialisierenden Daten
 * @param status Der HTTP-Statuscode (Standard: 200)
 * @param additionalHeaders Zusätzliche Header, die hinzugefügt werden sollen
 * @returns Eine Response-Instanz mit den serialisierten Daten und Sicherheitsheadern
 */
export function secureJsonResponse(
  data: any,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  
  // Zusätzliche Header anwenden
  Object.entries(additionalHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  // JSON-Response erstellen
  const response = new Response(JSON.stringify(data), {
    status,
    headers
  });
  
  // Sicherheitsheader anwenden
  return applySecurityHeaders(response);
}

/**
 * Erzeugt eine Fehler-JSON-Response mit Security-Headers
 * 
 * @param message Die Fehlermeldung
 * @param status Der HTTP-Statuscode (Standard: 400)
 * @param additionalData Zusätzliche Daten, die in die Antwort aufgenommen werden sollen
 * @returns Eine Response-Instanz mit der Fehlermeldung und Sicherheitsheadern
 */
export function secureErrorResponse(
  message: string,
  status: number = 400,
  additionalData: Record<string, any> = {}
): Response {
  return secureJsonResponse({
    error: message,
    ...additionalData
  }, status);
}
