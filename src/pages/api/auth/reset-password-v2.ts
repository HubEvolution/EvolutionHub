/**
 * Reset-Password-Endpunkt (Service-Layer-Version)
 * 
 * Diese Datei implementiert den Passwort-Reset-Endpunkt unter Verwendung der neuen Service-Layer.
 * Im Vergleich zur ursprünglichen Version bietet diese Implementierung:
 * - Bessere Trennung von Concerns (Geschäftslogik in Services)
 * - Verbesserte Fehlerbehandlung
 * - Transaktionsunterstützung
 * - Konsistente Fehlerbehandlung
 */

import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';
import { createValidator, ValidationRules, type ValidationSchema } from '@/lib/validators';
import { createAuthService } from '@/lib/services/auth-service-impl';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';
import { handleAuthError } from '@/lib/error-handler';

// Interface für Reset-Password-Daten mit strikter Typisierung
interface ResetPasswordData {
  token: string;
  password: string;
}

// Validierungsschema für Reset-Password-Daten
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

// Reset-Password-Validator erstellen
const resetPasswordValidator = createValidator<ResetPasswordData>(resetPasswordSchema);

/**
 * POST /api/auth/reset-password-v2
 * Setzt das Passwort eines Benutzers zurück
 * 
 * Features:
 * - Verwendung der Service-Layer für Geschäftslogik
 * - Strikte Typisierung und Validierung der Eingabedaten
 * - Rate-Limiting zum Schutz vor Brute-Force-Angriffen
 * - Security-Headers gegen XSS und andere Angriffe
 * - Umfassendes Audit-Logging für Sicherheitsanalysen
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
      
      // FormData in ein Objekt konvertieren
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      // Wir brauchen den Token zum Zurückleiten bei Fehlern
      tokenForError = data.token as string || '';
      
      // Validierung durchführen
      const validationResult = resetPasswordValidator.validate(data);
      
      if (!validationResult.valid) {
        // Bei Validierungsfehler einen ServiceError werfen
        throw ServiceError.validation(
          'Die eingegebenen Daten sind ungültig', 
          { validationErrors: validationResult.errors }
        );
      }
      
      resetPasswordData = data as ResetPasswordData;
    } catch (validationError) {
      console.error('Reset password validation error:', validationError);
      
      // Bei Validierungsfehler Formulardaten parsen, um den Token zu extrahieren
      try {
        const formData = await context.request.formData();
        const token = formData.get('token');
        if (token && typeof token === 'string') {
          tokenForError = token;
        }
      } catch (e) {
        // Ignorieren, wir haben bereits einen Fehler
      }
      
      throw ServiceError.validation(
        'Die eingegebenen Daten sind ungültig', 
        { validationErrors: 'Formatierungsfehler' }
      );
    }
    
    if (!context.locals.runtime) {
      const error = new Error("Runtime environment is not available. Are you running in a Cloudflare environment?");
      console.error(error.message);
      throw error;
    }
    
    // AuthService erstellen
    const authService = createAuthService({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV
    });
    
    // Passwort-Reset durchführen mit Service-Layer
    await authService.resetPassword(
      resetPasswordData.token,
      resetPasswordData.password,
      context.clientAddress
    );
    
    // Weiterleitung zur Login-Seite mit Erfolgsmeldung
    return createSecureRedirect('/login?success=PasswordReset');
  } catch (error) {
    console.error('Reset password error:', error);
    
    // Wenn bis hierhin noch kein Token extrahiert wurde, versuchen wir es erneut
    if (!tokenForError) {
      try {
        const formData = await context.request.formData();
        const tokenValue = formData.get('token');
        if (tokenValue && typeof tokenValue === 'string') {
          tokenForError = tokenValue;
        }
      } catch (e) {
        // Ignorieren, wir haben bereits einen Fehler
      }
    }
    
    // Zentralen Auth-Error-Handler verwenden
    const baseUrl = tokenForError ? 
      `/reset-password` : 
      (error instanceof ServiceError && error.type === ServiceErrorType.NOT_FOUND ? '/login' : '/reset-password');
    
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
