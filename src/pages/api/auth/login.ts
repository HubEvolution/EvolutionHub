import type { APIContext } from 'astro';
import { authLimiter } from '@/lib/rate-limiter';
import { createSecureRedirect } from '@/lib/response-helpers';
import { withRedirectMiddleware, type ApiHandler, createMethodNotAllowed } from '@/lib/api-middleware';
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
import { getPathLocale, localizePath } from '@/lib/locale-path';

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
 * WICHTIG: Dieser Endpunkt verwendet withRedirectMiddleware, um Rate-Limiting,
 * CSRF/Origin-Checks und Security-Headers anzuwenden, während Redirect-Responses
 * beibehalten werden.
 */
// Hilfsfunktion: Locale aus Referer oder Pfad ermitteln (de = neutral, en = /en)
function detectLocale(context: APIContext): 'de' | 'en' {
  const referer = context.request.headers.get('referer') || '';
  try {
    const pathname = referer ? new URL(referer).pathname : new URL(context.request.url).pathname;
    const l = getPathLocale(pathname);
    if (l === 'en') return 'en';
    if (l === 'de') return 'de';
    // Fallback: Wenn keine Locale ableitbar ist, standardmäßig 'en'
    return 'en';
  } catch {
    // Fehler beim Parsen: konservativ 'en' als Fallback
    return 'en';
  }
}

// Rate-Limiter-Wrapper: mappt 429-Responses auf einen sicheren Redirect zur Login-Seite
async function loginRateLimiter(context: APIContext): Promise<unknown> {
  const result = await authLimiter(context);
  if (result instanceof Response) {
    const locale = detectLocale(context);
    const loginPath = localizePath(locale, '/login');
    return createSecureRedirect(`${loginPath}?error=TooManyRequests`);
  }
  return result;
}

const postHandler: ApiHandler = async (context: APIContext) => {
  // Locale bestimmen (kann durch Formularfeld überschrieben werden)
  let locale = detectLocale(context);

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

    loginData = data as unknown as LoginData;
  } catch (validationError) {
    const email = loginData?.email || 'unknown';
    securityLogger.logAuthFailure({
      email,
      reason: 'validation_error',
      error: validationError instanceof Error ? validationError.message : 'Unknown validation error'
    }, {
      ...baseContext,
      action: 'validation_failed',
      metadata: { validationError: validationError instanceof Error ? validationError.message : String(validationError) }
    });
    // Fehler weiterwerfen, Middleware übernimmt Redirect via onError
    throw validationError;
  }

  // Runtime prüfen
  if (!context.locals.runtime) {
    const error = new Error('Runtime environment is not available. Are you running in a Cloudflare environment?');
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

  try {
    // Login durchführen mit Service-Layer
    const authResult = await authService.login(
      (loginData as LoginData).email,
      (loginData as LoginData).password,
      context.clientAddress
    );

    // Erfolgreichen Login loggen
    securityLogger.logAuthSuccess({
      email: (loginData as LoginData).email,
      sessionId: authResult.sessionId,
      ipAddress: context.clientAddress
    }, {
      ...baseContext,
      userId: authResult.user.id,
      sessionId: authResult.sessionId,
      action: 'login_success'
    });

    // Cookie-Lebensdauer basierend auf rememberMe-Option einstellen
    const maxAge = (loginData as LoginData).rememberMe === true
      ? 60 * 60 * 24 * 30
      : 60 * 60 * 24;

    // Session-Cookie setzen
    context.cookies.set('session_id', authResult.sessionId, {
      path: '/',
      httpOnly: true,
      maxAge,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Weiterleitung zum Dashboard (locale-bewusst)
    const dashboardPath = localizePath(locale, '/dashboard');
    return createSecureRedirect(dashboardPath);
  } catch (error) {
    // Login-Fehler loggen und weiterwerfen (Middleware erzeugt Redirect)
    securityLogger.logAuthFailure({
      email: (loginData as LoginData)?.email || 'unknown',
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
    throw error;
  }
};

export const POST = withRedirectMiddleware(postHandler, {
  rateLimiter: loginRateLimiter,
  onError: (context, error) => {
    const locale = detectLocale(context);
    const loginPath = localizePath(locale, '/login');
    return handleAuthError(error, loginPath);
  }
});

// Nicht-POST-Methoden: 405 Method Not Allowed
const methodNotAllowed = () => createMethodNotAllowed('POST');

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;