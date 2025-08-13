import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';
import { createValidator, ValidationRules, type ValidationSchema } from '@/lib/validators';
import { createAuthService } from '@/lib/services/auth-service-impl';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';
import { handleAuthError } from '@/lib/error-handler';

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
  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return createSecureRedirect('/reset-password?error=TooManyRequests');
  }

  // Wir speichern den Token für die Fehlerbehandlung
  let tokenForError: string = '';

  try {
    // Datenvalidierung mit dem Schema-Validator
    let resetPasswordData: ResetPasswordData;

    try {
      const formData = await context.request.formData();
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

      resetPasswordData = data as ResetPasswordData;
    } catch (validationError) {
      console.error('Reset password validation error:', validationError);
      try {
        const formData = await context.request.formData();
        const token = formData.get('token');
        if (token && typeof token === 'string') {
          tokenForError = token;
        }
      } catch {}
      throw ServiceError.validation(
        'Die eingegebenen Daten sind ungültig',
        { validationErrors: 'Formatierungsfehler' }
      );
    }

    if (!context.locals.runtime) {
      const error = new Error('Runtime environment is not available. Are you running in a Cloudflare environment?');
      console.error(error.message);
      throw error;
    }

    const authService = createAuthService({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV
    });

    await authService.resetPassword(
      resetPasswordData.token,
      resetPasswordData.password,
      context.clientAddress
    );

    return createSecureRedirect('/login?success=PasswordReset');
  } catch (error) {
    console.error('Reset password error:', error);

    if (!tokenForError) {
      try {
        const formData = await context.request.formData();
        const tokenValue = formData.get('token');
        if (tokenValue && typeof tokenValue === 'string') {
          tokenForError = tokenValue;
        }
      } catch {}
    }

    const baseUrl = tokenForError
      ? '/reset-password'
      : (error instanceof ServiceError && error.type === ServiceErrorType.NOT_FOUND ? '/login' : '/reset-password');

    const contextParams = tokenForError ? { token: tokenForError } : {};

    return handleAuthError(error, baseUrl, contextParams);
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