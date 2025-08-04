/**
 * API-Middleware für einheitliche Fehlerbehandlung, Rate-Limiting und Security-Headers
 * 
 * Diese Middleware kann in API-Endpunkten verwendet werden, um gemeinsame
 * Funktionalitäten wie Fehlerbehandlung, Rate-Limiting und Security-Headers
 * zu zentralisieren.
 */

import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logApiError } from '@/lib/security-logger';

/**
 * Interface für API-Handler-Funktionen
 */
export interface ApiHandler {
  (context: APIContext): Promise<Response>;
}

/**
 * Typen für API-Fehler
 */
export type ApiErrorType = 
  | 'validation_error'
  | 'auth_error'
  | 'not_found'
  | 'rate_limit'
  | 'server_error'
  | 'db_error'
  | 'forbidden';

/**
 * Standard-Fehlermeldungen für verschiedene Fehlertypen
 */
const errorMessages: Record<ApiErrorType, string> = {
  validation_error: 'Ungültige Eingabedaten',
  auth_error: 'Authentifizierung fehlgeschlagen',
  not_found: 'Ressource nicht gefunden',
  rate_limit: 'Zu viele Anfragen',
  server_error: 'Interner Serverfehler',
  db_error: 'Datenbankfehler',
  forbidden: 'Zugriff verweigert'
};

/**
 * HTTP-Statuscodes für verschiedene Fehlertypen
 */
const errorStatusCodes: Record<ApiErrorType, number> = {
  validation_error: 400,
  auth_error: 401,
  not_found: 404,
  rate_limit: 429,
  server_error: 500,
  db_error: 500,
  forbidden: 403
};

/**
 * Erstellt eine standardisierte Fehlerantwort
 */
export function createApiError(
  type: ApiErrorType,
  message?: string,
  details?: Record<string, any>
): Response {
  const status = errorStatusCodes[type];
  const errorMessage = message || errorMessages[type];
  
  const responseBody = {
    success: false,
    error: {
      type,
      message: errorMessage,
      ...(details ? { details } : {})
    }
  };
  
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Erstellt eine standardisierte Erfolgsantwort
 */
export function createApiSuccess<T>(
  data: T,
  status: number = 200
): Response {
  const responseBody = {
    success: true,
    data
  };
  
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Middleware für API-Endpunkte
 * Implementiert:
 * - Rate-Limiting
 * - Security-Headers
 * - Einheitliche Fehlerbehandlung
 * - Logging
 */
export function withApiMiddleware(handler: ApiHandler): ApiHandler {
  return async (context: APIContext) => {
    try {
      // Rate-Limiting anwenden
      const rateLimitResult = await standardApiLimiter(context);
      if (!rateLimitResult.success) {
        return createApiError('rate_limit', 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.');
      }
      
      // Handler ausführen
      const response = await handler(context);
      
      // Security-Headers hinzufügen
      return applySecurityHeaders(response);
    } catch (error) {
      // Fehlerbehandlung
      console.error('[API Middleware] Error:', error);
      
      // Fehler loggen
      const clientAddress = context.clientAddress || 'unknown';
      logApiError(clientAddress, {
        path: new URL(context.request.url).pathname,
        method: context.request.method,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fehlertyp bestimmen
      let errorType: ApiErrorType = 'server_error';
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('UNIQUE constraint failed')) {
        errorType = 'validation_error';
        errorMessage = 'Diese Ressource existiert bereits';
      } else if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
        errorType = 'auth_error';
      } else if (errorMessage.includes('not found')) {
        errorType = 'not_found';
      } else if (errorMessage.includes('SQLITE_CONSTRAINT') || errorMessage.includes('database')) {
        errorType = 'db_error';
        // Generische Nachricht für DB-Fehler (keine internen Details preisgeben)
        errorMessage = 'Datenbankfehler';
      }
      
      return createApiError(errorType, errorMessage);
    }
  };
}

/**
 * Middleware für authentifizierte API-Endpunkte
 * Erweitert die Standard-API-Middleware um Authentifizierungsprüfung
 */
export function withAuthApiMiddleware(handler: ApiHandler): ApiHandler {
  return withApiMiddleware(async (context: APIContext) => {
    // Prüfen, ob Benutzer authentifiziert ist
    if (!context.locals.user) {
      return createApiError('auth_error', 'Für diese Aktion ist eine Anmeldung erforderlich');
    }
    
    return handler(context);
  });
}
