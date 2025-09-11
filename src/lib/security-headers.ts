import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logApiError, logApiAccess } from '@/lib/security-logger';

/**
 * API-Middleware für einheitliche Fehlerbehandlung, Rate-Limiting und Security-Headers
 * 
 * Dieses Modul bietet Funktionen zum Anwenden von standardisierten Sicherheits-Headers
 * auf API-Antworten, um die Anwendung vor verschiedenen Sicherheitsbedrohungen zu schützen.
 */

/**
 * Interface für API-Handler-Funktionen
 */
export interface ApiHandler {
  (context: APIContext): Promise<Response>;
}

/**
 * Optionen für API-Middleware
 */
export interface ApiMiddlewareOptions {
  // Erfordert eine authentifizierte Benutzer-Session
  requireAuth?: boolean;
  
  // Überschreibt die Standard-Fehlerbehandlung
  onError?: (context: APIContext, error: Error | unknown) => Response | Promise<Response>;
  
  // Falls true, wird kein automatisches Logging durchgeführt (z.B. für sensible Endpunkte)
  disableAutoLogging?: boolean;
  
  // Zusätzliche Metadaten für Logging
  logMetadata?: Record<string, any>;
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

/**
 * Wendet Sicherheits-Header auf eine Response an, um die Anwendung vor
 * verschiedenen Sicherheitsbedrohungen zu schützen.
 * 
 * @param response - Die Response, auf die die Sicherheitsheader angewendet werden sollen
 * @returns Die Response mit angewendeten Sicherheitsheadern
 */
export function applySecurityHeaders(response: Response): Response {
  // Erstelle eine neue Response mit den gleichen Daten und Status
  const secureResponse = new Response(response.body, response);
  
  // Hinweis: CSP wird zentral in der globalen Middleware (src/middleware.ts) gesetzt.
  // API-Antworten (JSON) benötigen keine CSP und sollten diese nicht überschreiben.
  
  // X-Content-Type-Options
  secureResponse.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options
  secureResponse.headers.set('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection
  secureResponse.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy
  secureResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Strict-Transport-Security
  secureResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Permissions-Policy
  secureResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  
  return secureResponse;
}
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
 * - Zentralisiertes Logging
 */
export function withApiMiddleware(handler: ApiHandler, options: ApiMiddlewareOptions = {}): ApiHandler {
  return async (context: APIContext) => {
    const { clientAddress, request, locals } = context;
    const user = locals.user;
    const path = new URL(request.url).pathname;
    const method = request.method;
    
    try {
      // Rate-Limiting anwenden: Limiter gibt entweder Response (429) oder undefined zurück
      const rateLimitResponse = await standardApiLimiter(context);
      if (rateLimitResponse instanceof Response) {
        // Security-Headers auch auf Rate-Limit-Antwort anwenden
        return applySecurityHeaders(rateLimitResponse);
      }
      
      // API-Zugriff protokollieren (vor Ausführung)
      if (!options.disableAutoLogging) {
        logApiAccess(
          user?.id || 'anonymous', 
          clientAddress || 'unknown', 
          {
            endpoint: path,
            method,
            ...options.logMetadata
          }
        );
      }
      
      // Handler ausführen
      const response = await handler(context);
      
      // Security-Headers hinzufügen
      return applySecurityHeaders(response);
    } catch (error) {
      // Fehlerbehandlung
      console.error(`[API Middleware] Error in ${method} ${path}:`, error);
      
      // Benutzerdefinierte Fehlerbehandlung, falls vorhanden
      if (options.onError) {
        return options.onError(context, error);
      }
      
      // Standard-Fehlerbehandlung
      
      // Fehler loggen
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logApiError(path, {
        method,
        userId: user?.id || 'anonymous',
        ipAddress: clientAddress || 'unknown',
        error: errorMessage,
        stack: errorStack,
        ...options.logMetadata
      });
      
      // Fehlertyp bestimmen
      let errorType: ApiErrorType = 'server_error';
      
      if (errorMessage.includes('UNIQUE constraint failed')) {
        errorType = 'validation_error';
        return createApiError(errorType, 'Diese Ressource existiert bereits');
      } else if (errorMessage.includes('not authorized') || errorMessage.includes('unauthorized')) {
        errorType = 'auth_error';
      } else if (errorMessage.includes('not found')) {
        errorType = 'not_found';
      } else if (errorMessage.includes('SQLITE_CONSTRAINT') || errorMessage.includes('database')) {
        errorType = 'db_error';
        // Generische Nachricht für DB-Fehler (keine internen Details preisgeben)
        return createApiError(errorType, 'Datenbankfehler');
      }
      
      return createApiError(errorType, errorMessage);
    }
  };
}

/**
 * Middleware für authentifizierte API-Endpunkte
 * Erweitert die Standard-API-Middleware um Authentifizierungsprüfung
 */
export function withAuthApiMiddleware(
  handler: ApiHandler, 
  options: Omit<ApiMiddlewareOptions, 'requireAuth'> = {}
): ApiHandler {
  return withApiMiddleware(
    async (context: APIContext) => {
      // Prüfen, ob Benutzer authentifiziert ist
      if (!context.locals.user) {
        return createApiError('auth_error', 'Für diese Aktion ist eine Anmeldung erforderlich');
      }
      
      return handler(context);
    },
    { ...options, requireAuth: true }
  );
}
