import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';
import { createValidator, ValidationRules, type ValidationSchema, parseAndValidateFormData } from '@/lib/validators';
import { createAuthService } from '@/lib/services/auth-service-impl';
import { ServiceError } from '@/lib/services/types';
import { handleAuthError } from '@/lib/error-handler';
import { validateSession } from '@/lib/auth-v2';
import { loggerFactory } from '@/server/utils/logger-factory';
import { type LogContext } from '@/config/logging';

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

const changePasswordSchema: ValidationSchema<ChangePasswordData> = {
  currentPassword: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.minLength(6),
      ValidationRules.string.maxLength(100)
    ]
  },
  newPassword: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.minLength(6),
      ValidationRules.string.maxLength(100)
    ]
  }
};

const changePasswordValidator = createValidator<ChangePasswordData>(changePasswordSchema);

// Logger-Instanz für Security-Events
const securityLogger = loggerFactory.createSecurityLogger();

/**
 * POST /api/auth/change-password
 * Ändert das Passwort des aktuell eingeloggten Benutzers.
 *
 * Hinweise:
 * - Verwendet KEINE API-Middleware, da Redirects statt JSON zurückgegeben werden
 * - Implementiert Rate-Limiting, Validierung und Session-Checks
 */
export const POST = async (context: APIContext) => {
  const baseRedirectUrl = '/account/settings';

  // Rate-Limiting
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return createSecureRedirect(`${baseRedirectUrl}?error=TooManyRequests`);
  }

  try {
    // Eingaben validieren (FormData) – typsicher
    let data: ChangePasswordData;
    try {
      data = await parseAndValidateFormData<ChangePasswordData>(context.request, changePasswordValidator);
      // Cross-Field-Check: neues Passwort darf nicht identisch mit aktuellem sein
      if (data.currentPassword === data.newPassword) {
        throw ServiceError.validation('Das neue Passwort darf nicht mit dem aktuellen übereinstimmen');
      }
    } catch (validationError) {
      // Validierungsfehler → securityLogger.logAuthFailure()
      const baseContext: LogContext = {
        ipAddress: context.clientAddress,
        resource: 'change-password',
        action: 'validation'
      };
      securityLogger.logAuthFailure(
        { error: validationError.message || 'Validation failed', details: validationError },
        baseContext
      );
      throw ServiceError.validation('Die eingegebenen Daten sind ungültig', {
        validationErrors: 'Formatierungsfehler'
      });
    }

    if (!context.locals.runtime) {
      const error = new Error('Runtime environment is not available. Are you running in a Cloudflare environment?');
      // Runtime-Fehler → securityLogger.logApiError()
      const baseContext: LogContext = {
        ipAddress: context.clientAddress,
        resource: 'change-password',
        action: 'runtime-check'
      };
      securityLogger.logApiError(
        { error: error.message, details: error },
        baseContext
      );
      throw error;
    }

    // Session ermitteln und validieren
    const sessionId = context.cookies.get('session_id')?.value ?? null;
    if (!sessionId) {
      throw ServiceError.authentication('Nicht authentifiziert');
    }

    const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);
    if (!session || !user) {
      throw ServiceError.authentication('Sitzung ist ungültig oder abgelaufen');
    }

    // Service aufrufen
    const authService = createAuthService({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV
    });

    await authService.changePassword(
      user.id,
      data.currentPassword,
      data.newPassword,
      context.clientAddress
    );

    // Erfolg: Redirect zurück zu den Einstellungen
    return createSecureRedirect(`${baseRedirectUrl}?success=PasswordChanged`);
  } catch (error) {
    // Allgemeiner Fehler → securityLogger.logAuthFailure()
    const baseContext: LogContext = {
      ipAddress: context.clientAddress,
      resource: 'change-password',
      action: 'general-error'
    };
    securityLogger.logAuthFailure(
      { error: error instanceof Error ? error.message : 'Unknown error', details: error },
      baseContext
    );
    return handleAuthError(error, '/account/settings');
  }
};

// Explizite 405-Handler für nicht unterstützte Methoden
const methodNotAllowed = () =>
  createSecureJsonResponse(
    { error: true, message: 'Method Not Allowed' },
    405,
    { Allow: 'POST' }
  );

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
