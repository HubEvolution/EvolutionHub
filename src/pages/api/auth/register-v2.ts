/**
 * Register-Endpunkt (Service-Layer-Version)
 * 
 * Diese Datei implementiert den Registrierungs-Endpunkt unter Verwendung der neuen Service-Layer.
 * Im Vergleich zur ursprünglichen Version bietet diese Implementierung:
 * - Bessere Trennung von Concerns (Geschäftslogik in Services)
 * - Verbesserte Fehlerbehandlung
 * - Transaktionsunterstützung
 * - Konsistente Fehlerbehandlung
 */

import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect } from '@/lib/response-helpers';
import { createValidator, ValidationRules, type ValidationSchema } from '@/lib/validators';
import { createAuthService } from '@/lib/services/auth-service-impl';
import { ServiceError, ServiceErrorType } from '@/lib/services/types';
import { handleAuthError } from '@/lib/error-handler';

// Interface für Registrierungsdaten mit strikter Typisierung
interface RegisterData {
  email: string;
  password: string;
  name: string;
  username: string;
}

// Validierungsschema für Registrierungsdaten
const registerSchema: ValidationSchema<RegisterData> = {
  email: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.email(),
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
  },
  name: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.minLength(2),
      ValidationRules.string.maxLength(100)
    ]
  },
  username: {
    required: true,
    type: 'string',
    rules: [
      ValidationRules.string.minLength(3),
      ValidationRules.string.maxLength(50),
      ValidationRules.string.pattern(/^[a-zA-Z0-9_-]+$/, 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten')
    ]
  }
};

// Register-Validator erstellen
const registerValidator = createValidator<RegisterData>(registerSchema);

/**
 * POST /api/auth/register-v2
 * Registriert einen neuen Benutzer und erstellt eine Session
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
    return createSecureRedirect('/register?error=TooManyRequests');
  }

  try {
    // Datenvalidierung mit dem Schema-Validator
    let registerData: RegisterData;
    
    try {
      const formData = await context.request.formData();
      const data: Record<string, unknown> = {};
      
      // FormData in ein Objekt konvertieren
      for (const [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      // Validierung durchführen
      const validationResult = registerValidator.validate(data);
      
      if (!validationResult.valid) {
        throw ServiceError.validation(
          'Die eingegebenen Daten sind ungültig', 
          { validationErrors: validationResult.errors }
        );
      }
      
      registerData = data as RegisterData;
    } catch (validationError) {
      console.error('Register validation error:', validationError);
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
    
    // Registrierung durchführen mit Service-Layer
    const authResult = await authService.register(
      {
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        username: registerData.username
      },
      context.clientAddress
    );
    
    // Session-Cookie setzen
    context.cookies.set('session_id', authResult.sessionId, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 Tage bei Registrierung
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Weiterleitung zum Dashboard
    return createSecureRedirect('/dashboard');
  } catch (error) {
    console.error('Register error:', error);
    
    // Wenn es ein Konflikt mit Details ist, spezialisieren wir den Fehlercode
    // bevor wir zum zentralen Error-Handler weiterleiten
    if (error instanceof ServiceError && error.type === ServiceErrorType.CONFLICT) {
      let errorCode = 'UserExists'; // Standard-Fehlercode für Konflikte
      
      // Bei der Registrierung verwenden wir spezifischere Fehlercodes
      if (error.details?.reason === 'username_exists') {
        errorCode = 'UsernameExists';
      }
      
      return createSecureRedirect(`/register?error=${errorCode}`);
    }
    
    // Zentralen Error-Handler verwenden
    return handleAuthError(error, '/register');
  }
};
