import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect, createDeprecatedGoneHtml, createDeprecatedGoneJson } from '@/lib/response-helpers';
import { createValidator, ValidationRules, type ValidationSchema } from '@/lib/validators';
import { createAuthService } from '@/lib/services/auth-service-impl';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';
import { handleAuthError } from '@/lib/error-handler';
import { loggerFactory } from '@/server/utils/logger-factory';
import { LogContext, SECURITY_EVENTS } from '@/config/logging';

// Validierungsschema für Reset-Password-Daten
interface ResetPasswordData {
  token: string;
  password: string;
}

const resetPasswordSchema: ValidationSchema<ResetPasswordData> = {
  token: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.minLength(20),
      ValidationRules.string.maxLength(255)
    ]
  },
  password: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.minLength(6),
      ValidationRules.string.maxLength(100)
    ]
  }
};

const resetPasswordValidator = createValidator<ResetPasswordData>(resetPasswordSchema);

/**
 * POST /api/auth/reset-password
 * Setzt das Passwort eines Benutzers zurück
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 *
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
export const POST = async (context: APIContext) => {
  // Deprecated legacy endpoint: return 410 Gone early with security logging
  return createDeprecatedGoneHtml(context);
  // Security Logger initialisieren
  const securityLogger = loggerFactory.createSecurityLogger();

  // Locale aus Referer ermitteln (Fallback)
  const referer =
    typeof context?.request?.headers?.get === 'function'
      ? context.request.headers.get('referer') ?? ''
      : '';
  let locale = referer.includes('/de/') ? 'de' : referer.includes('/en/') ? 'en' : 'en';

  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return createSecureRedirect(`${locale === 'en' ? '/en' : ''}/reset-password?error=TooManyRequests`);
  }

  // Wir speichern den Token für die Fehlerbehandlung
  let tokenForError: string = '';

  try {
    // Datenvalidierung mit dem Schema-Validator
    let resetPasswordData: ResetPasswordData;

    try {
      const formData = await context.request.formData();
      const localeField = formData.get('locale');
      if (typeof localeField === 'string' && (localeField === 'de' || localeField === 'en')) {
        locale = localeField;
      }
      const data: Record<string, unknown> = {};

      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }

      tokenForError = (data.token as string) || '';

      const validationResult = resetPasswordValidator.validate(data);
      if (!validationResult.valid) {
        throw ServiceError.validation(
          'Die eingegebenen Daten sind ungültig',
          { validationErrors: validationResult.errors }
        );
      }

      resetPasswordData = data as unknown as ResetPasswordData;
    } catch (validationError) {
      const logContext: LogContext = {
        ipAddress: context.clientAddress,
        userAgent: context.request.headers.get('user-agent') || undefined,
        resource: 'reset-password',
        action: 'validation',
        metadata: { token: tokenForError }
      };
      securityLogger.logApiError({
        endpoint: '/api/auth/reset-password',
        method: 'POST',
        error: validationError instanceof Error ? validationError.message : 'Validation error',
        details: { validationError: validationError }
      }, logContext);
      try {
        const formData = await context.request.formData();
        const token = formData.get('token');
        if (token && typeof token === 'string') {
          tokenForError = token;
        }
      } catch (e) {
        // Non-fatal: token extraction is best-effort for error context only
        const logContext: LogContext = {
          ipAddress: context.clientAddress,
          userAgent: context.request.headers.get('user-agent') || undefined,
          resource: 'reset-password',
          action: 'token-extraction',
          metadata: { token: tokenForError }
        };
        securityLogger.logApiError({
          endpoint: '/api/auth/reset-password',
          method: 'POST',
          error: 'Token extraction failed during validation error',
          details: { extractionError: e }
        }, logContext);
      }
      throw ServiceError.validation(
        'Die eingegebenen Daten sind ungültig',
        { validationErrors: 'Formatierungsfehler' }
      );
    }

    if (!context.locals.runtime) {
      const error = new Error('Runtime environment is not available. Are you running in a Cloudflare environment?');
      const logContext: LogContext = {
        ipAddress: context.clientAddress,
        userAgent: context.request.headers.get('user-agent') || undefined,
        resource: 'reset-password',
        action: 'runtime-check',
        metadata: { token: tokenForError }
      };
      securityLogger.logApiError({
        endpoint: '/api/auth/reset-password',
        method: 'POST',
        error: error.message,
        details: { runtimeError: error }
      }, logContext);
      throw error;
    }

    const authService = createAuthService({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV
    });

    await authService.resetPassword(
      resetPasswordData.token,
      resetPasswordData.password
    );

    return createSecureRedirect(`${locale === 'en' ? '/en' : ''}/login?success=PasswordReset`);
  } catch (error) {
    const logContext: LogContext = {
      ipAddress: context.clientAddress,
      userAgent: context.request.headers.get('user-agent') || undefined,
      resource: 'reset-password',
      action: 'password-reset',
      metadata: { token: tokenForError }
    };
    securityLogger.logApiError({
      endpoint: '/api/auth/reset-password',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Password reset error',
      details: { resetError: error }
    }, logContext);

    if (!tokenForError) {
      try {
        const formData = await context.request.formData();
        const tokenValue = formData.get('token');
        if (tokenValue && typeof tokenValue === 'string') {
          tokenForError = tokenValue;
        }
      } catch (e) {
        // Non-fatal: token extraction is best-effort for error context only
        const logContext: LogContext = {
          ipAddress: context.clientAddress,
          userAgent: context.request.headers.get('user-agent') || undefined,
          resource: 'reset-password',
          action: 'token-extraction-error-handler',
          metadata: { token: tokenForError }
        };
        securityLogger.logApiError({
          endpoint: '/api/auth/reset-password',
          method: 'POST',
          error: 'Token extraction in error handler failed',
          details: { extractionError: e }
        }, logContext);
      }
    }

    const baseUrl = tokenForError
      ? `${locale === 'en' ? '/en' : ''}/reset-password`
      : (error instanceof ServiceError && error.type === ServiceErrorType.NOT_FOUND ? `${locale === 'en' ? '/en' : ''}/login` : `${locale === 'en' ? '/en' : ''}/reset-password`);

    const contextParams: Record<string, string> = {};
    if (tokenForError) {
      contextParams.token = tokenForError;
    }

    return handleAuthError(error, baseUrl, contextParams);
  }
};

// Explizite 410-Handler für nicht unterstützte Methoden (Endpoint deprecated)
const methodNotAllowed = (context: APIContext) =>
  createDeprecatedGoneJson(context, 'This endpoint has been deprecated. Please migrate to the new authentication flow.', {
    allow: 'POST'
  });

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;