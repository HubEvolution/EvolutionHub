import type { APIContext } from 'astro';
import { createSession, type User } from '@/lib/auth-v2';
import { compare } from 'bcrypt-ts';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';
import { createSecureRedirect } from '@/lib/response-helpers';
import { 
  createValidator, 
  parseAndValidateFormData, 
  ValidationRules, 
  ValidationException,
  type ValidationSchema
} from '@/lib/validators';

// Interface für Login-Daten mit strikter Typisierung
interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Validierungsschema für Login-Daten
const loginSchema: ValidationSchema<LoginData> = {
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
  rememberMe: {
    type: 'boolean'
  }
};

// Login-Validator erstellen
const loginValidator = createValidator<LoginData>(loginSchema);

/**
 * POST /api/auth/login
 * Authentifiziert einen Benutzer und erstellt eine Session
 * 
 * Features:
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
    return createSecureRedirect('/login?error=TooManyRequests');
  }

  try {
    // Datenvalidierung mit dem Schema-Validator
    let loginData: LoginData;
    
    try {
      const formData = await context.request.formData();
      const data: Record<string, unknown> = {};
      
      // FormData in ein Objekt konvertieren
      for (const [key, value] of formData.entries()) {
        // Checkbox-Werte richtig konvertieren
        if (key === 'rememberMe') {
          data[key] = value === 'on' || value === 'true';
        } else {
          data[key] = value;
        }
      }
      
      // Validierung durchführen
      const validationResult = loginValidator.validate(data);
      
      if (!validationResult.valid) {
        // Detaillierte Fehlerprotokolle für Validierungsfehler
        logAuthFailure(context.clientAddress, {
          reason: 'validation_failed',
          errors: validationResult.errors.map(e => e.message).join(', ')
        });
        
        return createSecureRedirect('/login?error=InvalidInput');
      }
      
      loginData = data as LoginData;
    } catch (validationError) {
      console.error('Login validation error:', validationError);
      
      logAuthFailure(context.clientAddress, {
        reason: 'malformed_request',
        error: validationError instanceof Error ? validationError.message : String(validationError)
      });
      
      return createSecureRedirect('/login?error=InvalidInput');
    }
    
    if (!context.locals.runtime) {
      console.error("Runtime environment is not available. Are you running in a Cloudflare environment?");
      const response = new Response(null, {
        status: 302,
        headers: { Location: '/login?error=MissingRuntime' }
      });
      return applySecurityHeaders(response);
    }
    
    const db = context.locals.runtime.env.DB;
    const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').bind(loginData.email).first<User>();

    if (!existingUser) {
      // Fehlgeschlagene Anmeldung protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'user_not_found',
        email: loginData.email
      });

      const response = new Response(null, {
        status: 302,
        headers: { Location: '/login?error=InvalidCredentials' }
      });
      return applySecurityHeaders(response);
    }

    if (!existingUser.password_hash) {
      // Fehlgeschlagene Anmeldung protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'missing_password_hash',
        userId: existingUser.id
      });

      const response = new Response(null, {
        status: 302,
        headers: { Location: '/login?error=InvalidCredentials' }
      });
      return applySecurityHeaders(response);
    }

    const validPassword = await compare(loginData.password, existingUser.password_hash);
    if (!validPassword) {
      // Fehlgeschlagene Anmeldung protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'invalid_password',
        userId: existingUser.id
      });

      const response = new Response(null, {
        status: 302,
        headers: { Location: '/login?error=InvalidCredentials' }
      });
      return applySecurityHeaders(response);
    }

    // E-Mail-Verifikation prüfen (Double-Opt-in-Blockade)
    const emailVerified = Boolean(existingUser.email_verified);
    if (!emailVerified) {
      // Login blockiert wegen nicht verifizierter E-Mail
      logAuthFailure(context.clientAddress, {
        reason: 'email_not_verified',
        userId: existingUser.id,
        email: existingUser.email
      });

      console.log('🚫 Login blocked for unverified email:', existingUser.email);

      const response = new Response(null, {
        status: 302,
        headers: { Location: `/verify-email?email=${encodeURIComponent(existingUser.email)}&error=EmailNotVerified` }
      });
      return applySecurityHeaders(response);
    }

    const session = await createSession(db, existingUser.id);
    // Cookie-Lebensdauer basierend auf rememberMe-Option einstellen
    const maxAge = loginData.rememberMe === true
      ? 60 * 60 * 24 * 30 // 30 Tage bei "Remember Me"
      : 60 * 60 * 24;     // 1 Tag bei Standard-Login
      
    context.cookies.set('session_id', session.id, {
      path: '/',
      httpOnly: true,
      maxAge: maxAge,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Erfolgreiche Anmeldung protokollieren
    logAuthSuccess(existingUser.id, context.clientAddress, {
      action: 'login',
      sessionId: session.id
    });

    const redirectTo = '/dashboard';
    return createSecureRedirect(redirectTo);
  } catch (error) {
    console.error('Login error:', error);
    
    // Spezifischere Fehlerbehandlung nach Fehlertyp
    if (error instanceof ValidationException) {
      logAuthFailure(context.clientAddress, {
        reason: 'validation_exception',
        errors: error.errors.map(e => e.message).join(', ')
      });
      return createSecureRedirect('/login?error=ValidationFailed');
    }
    
    // Generischer Serverfehler mit verbessertem Logging
    logAuthFailure(context.clientAddress, {
      reason: 'server_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createSecureRedirect('/login?error=ServerError');
  }
};