/**
 * API-Middleware für einheitliche Fehlerbehandlung, Rate-Limiting und Security-Headers
 * 
 * Diese Middleware kann in API-Endpunkten verwendet werden, um gemeinsame
 * Funktionalitäten wie Fehlerbehandlung, Rate-Limiting und Security-Headers
 * zu zentralisieren.
 */

import type { APIContext } from 'astro';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logApiError, logApiAccess, logAuthFailure } from '@/lib/security-logger';

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
  
  // Optionaler Rate-Limiter (Standard: apiRateLimiter)
  rateLimiter?: (context: APIContext) => Promise<unknown>;
  
  // Benutzerdefinierte Unauthorized-Antwort
  onUnauthorized?: (context: APIContext) => Response | Promise<Response>;
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
 * - Zentralisiertes Logging
 */
export function withApiMiddleware(handler: ApiHandler, options: ApiMiddlewareOptions = {}): ApiHandler {
  return async (context: APIContext) => {
    const { clientAddress, request, locals } = context;
    const user = (locals as any).user || (locals as any).runtime?.user;
    const path = new URL(request.url).pathname;
    const method = request.method;
    
    try {
      // Rate-Limiting anwenden
      const limiter = options.rateLimiter || apiRateLimiter;
      const rateLimitResult: unknown = await limiter(context);
      // Tolerant gegenüber unterschiedlichen Rückgabeformen
      if (rateLimitResult && typeof (rateLimitResult as any).success === 'boolean' && (rateLimitResult as any).success === false) {
        return applySecurityHeaders(
          createApiError('rate_limit', 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.')
        );
      }
      // Wenn der Limiter eine Response liefert, als Fehler behandeln (aktuelles Verhalten: 500 statt 429)
      if (rateLimitResult instanceof Response) {
        throw new Error('rate_limited');
      }
      
      // API-Zugriff protokollieren (vor Ausführung)
      if (!options.disableAutoLogging) {
        logApiAccess(
          (user?.id as string) || (user?.sub as string) || 'anonymous', 
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
        const errorResponse = await options.onError(context, error);
        return applySecurityHeaders(errorResponse);
      }
      
      // Standard-Fehlerbehandlung
      
      // Fehler loggen
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logApiError(path, {
        method,
        userId: (user?.id as string) || (user?.sub as string) || 'anonymous',
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
        return applySecurityHeaders(createApiError(errorType, 'Datenbankfehler'));
      }
      
      return applySecurityHeaders(createApiError(errorType, errorMessage));
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
      const path = new URL(context.request.url).pathname;
      const hasUser = Boolean((context.locals as any).user || (context.locals as any).runtime?.user);
      if (!hasUser) {
        // Auth-Fehlschlag protokollieren und vereinheitlichte Antwort zurückgeben
        logAuthFailure(context.clientAddress || 'unknown', {
          reason: 'unauthenticated_access',
          endpoint: path
        });
        if (options.onUnauthorized) {
          return options.onUnauthorized(context);
        }
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return handler(context);
    },
    { ...options, requireAuth: true }
  );
}
