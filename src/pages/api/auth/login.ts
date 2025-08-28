import type { APIContext } from 'astro';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';
import {
  createValidator,
  ValidationRules,
  type ValidationSchema
} from '@/lib/validators';
import { createAuthService } from '@/lib/services/auth-service-impl';
import { ServiceError } from '@/lib/services/types';
import { handleAuthError } from '@/lib/error-handler';
import { loggerFactory } from '@/server/utils/logger-factory';
import type { LogContext } from '@/config/logging';

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
  // Locale aus Referer ermitteln (Fallback)
  const referer =
    typeof context?.request?.headers?.get === 'function'
      ? context.request.headers.get('referer') ?? ''
      : '';
  let locale = referer.includes('/de/') ? 'de' : referer.includes('/en/') ? 'en' : 'en';

  // SecurityLogger Instanz erstellen
  const securityLogger = loggerFactory.createSecurityLogger();

  // Basis-LogContext erstellen
  const baseContext: LogContext = {
    ipAddress: context.clientAddress,
    userAgent: context.request.headers.get('user-agent') || undefined,
    resource: 'auth/login',
    action: 'login_attempt'
  };

  // Datenvalidierung mit dem Schema-Validator
  let loginData: LoginData | undefined;

  try {
    const formData = await context.request.formData();
    const localeField = formData.get('locale');
    if (typeof localeField === 'string' && (localeField === 'de' || localeField === 'en')) {
      locale = localeField;
    }
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
      throw ServiceError.validation(
        'Die eingegebenen Daten sind ungültig',
        { validationErrors: validationResult.errors }
      );
    }

    // Nach Validierung sicher casten
    loginData = data as unknown as LoginData;
  } catch (validationError) {
    securityLogger.logAuthFailure({
      email: loginData?.email || 'unknown',
      reason: 'validation_error',
      error: validationError instanceof Error ? validationError.message : 'Unknown validation error'
    }, {
      ...baseContext,
      action: 'validation_failed',
      metadata: { validationError: validationError instanceof Error ? validationError.message : String(validationError) }
    });
    throw ServiceError.validation(
      'Die eingegebenen Daten sind ungültig',
      { validationErrors: 'Formatierungsfehler' }
    );
  }

  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    securityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      endpoint: '/api/auth/login',
      ipAddress: context.clientAddress
    }, baseContext);
    return createSecureRedirect(`/${locale}/login?error=TooManyRequests`);
  }

  try {
    if (!context.locals.runtime) {
      const error = new Error("Runtime environment is not available. Are you running in a Cloudflare environment?");
      securityLogger.logApiError({
        endpoint: '/api/auth/login',
        error: error.message,
        statusCode: 500
      }, {
        ...baseContext,
        action: 'runtime_error',
        metadata: { error: error.message }
      });
      throw error;
    }

    // AuthService erstellen
    const authService = createAuthService({
      db: context.locals.runtime.env.DB,
      isDevelopment: import.meta.env.DEV
    });

    // Login durchführen mit Service-Layer
    const authResult = await authService.login(
      loginData.email,
      loginData.password,
      context.clientAddress
    );

    // Erfolgreichen Login loggen
    securityLogger.logAuthSuccess({
      email: loginData.email,
      sessionId: authResult.sessionId,
      ipAddress: context.clientAddress
    }, {
      ...baseContext,
      userId: authResult.user.id,
      sessionId: authResult.sessionId,
      action: 'login_success'
    });

    // Cookie-Lebensdauer basierend auf rememberMe-Option einstellen
    const maxAge = loginData.rememberMe === true
      ? 60 * 60 * 24 * 30 // 30 Tage bei "Remember Me"
      : 60 * 60 * 24;     // 1 Tag bei Standard-Login

    // Session-Cookie setzen
    context.cookies.set('session_id', authResult.sessionId, {
      path: '/',
      httpOnly: true,
      maxAge: maxAge,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Weiterleitung zum Dashboard (locale-bewusst)
    return createSecureRedirect(locale === 'en' ? '/en/dashboard' : '/dashboard');
  } catch (error) {
    // Login-Fehler loggen
    securityLogger.logAuthFailure({
      email: loginData?.email || 'unknown',
      reason: 'login_error',
      error: error instanceof Error ? error.message : 'Unknown login error'
    }, {
      ...baseContext,
      action: 'login_failed',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    // Zentralen Error-Handler verwenden
    return handleAuthError(error, locale === 'en' ? '/en/login' : '/login');
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