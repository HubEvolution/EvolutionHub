/**
 * Response-Hilfsfunktionen
 * Stellt einheitliche Funktionen für die Erstellung konsistenter Responses bereit
 */

import type { APIContext } from 'astro';
import { applySecurityHeaders } from './security-headers';
import { loggerFactory } from '@/server/utils/logger-factory';
import { SECURITY_EVENTS } from '@/config/logging';

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
      ...headers,
    },
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
      ...headers,
    },
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
      ...(code ? { code } : {}),
    },
    status
  );
}

/**
 * Loggt den Zugriff auf einen veralteten Endpunkt und gibt eine 410-Response zurück (JSON-Variante).
 * Einheitliches Schema: { success: false, error: { type: 'gone', message, details? } }
 */
export function createDeprecatedGoneJson(
  context: APIContext,
  message: string = 'This endpoint has been deprecated. Please migrate to the new authentication flow.',
  details?: Record<string, unknown>
): Response {
  try {
    const securityLogger = loggerFactory.createSecurityLogger();
    const url = new URL(context.request.url);
    securityLogger.logSecurityEvent(
      SECURITY_EVENTS.USER_EVENT,
      {
        reason: 'deprecated_endpoint_access',
        endpoint: url.pathname,
        method: context.request.method,
        ...(details ? { details } : {}),
      },
      {
        ipAddress: context.clientAddress || 'unknown',
        userAgent: context.request.headers.get('user-agent') || undefined,
      }
    );
  } catch {
    // Logging darf niemals den Response verhindern
  }

  return createSecureJsonResponse(
    {
      success: false,
      error: {
        type: 'gone',
        message,
        ...(details ? { details } : {}),
      },
    },
    410,
    {
      'Cache-Control': 'no-store',
    }
  );
}

/**
 * Loggt den Zugriff auf einen veralteten Endpunkt und gibt eine 410-Response zurück (HTML/Redirect-Style).
 * Liefert eine minimalistische HTML-Seite mit Hinweis und Link zur aktuellen Seite, locale-aware, ohne Redirect.
 */
export function createDeprecatedGoneHtml(
  context: APIContext,
  options?: { fallbackPath?: string }
): Response {
  try {
    const securityLogger = loggerFactory.createSecurityLogger();
    const url = new URL(context.request.url);
    securityLogger.logSecurityEvent(
      SECURITY_EVENTS.USER_EVENT,
      {
        reason: 'deprecated_endpoint_access',
        endpoint: url.pathname,
        method: context.request.method,
      },
      {
        ipAddress: context.clientAddress || 'unknown',
        userAgent: context.request.headers.get('user-agent') || undefined,
      }
    );
  } catch {
    // Logging darf niemals den Response verhindern
  }

  const referer = context.request.headers.get('referer') || '';
  const locale = referer.includes('/de/') ? 'de' : referer.includes('/en/') ? 'en' : 'en';
  const fallback = options?.fallbackPath ?? (locale === 'en' ? '/en/login' : '/login');
  const html = `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:;" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>410 Gone</title>
    <style>
      body { font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu; padding: 2rem; line-height: 1.5; }
      .box { max-width: 640px; margin: 4rem auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem 0; }
      p { margin: 0.5rem 0; color: #374151; }
      a { color: #2563eb; text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>410 Gone</h1>
      <p>${locale === 'de' ? 'Dieser Endpunkt wurde entfernt.' : 'This endpoint has been removed.'}</p>
      <p>${locale === 'de' ? 'Bitte verwenden Sie den aktuellen Anmelde-/Registrierungs-Flow.' : 'Please use the current sign-in/registration flow.'}</p>
      <p><a href="${fallback}">${locale === 'de' ? 'Weiter zur Startseite' : 'Go to start page'}</a></p>
    </div>
  </body>
</html>`;

  const resp = new Response(html, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

  return applySecurityHeaders(resp);
}
