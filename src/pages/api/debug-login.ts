import { v4 as uuidv4 } from 'uuid';
import type { APIContext } from 'astro';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent, logSecurityEvent, logApiError } from '@/lib/security-logger';

/**
 * POST /api/debug-login
 * Erstellt eine Debug-Session für Entwicklungszwecke.
 *
 * WARNUNG: Dieser Endpunkt sollte nur in Entwicklungsumgebungen verwendet werden!
 *
 * Security-Features:
 * - Rate-Limiting: Begrenzt die Anzahl der API-Aufrufe pro Zeiteinheit
 * - Security-Headers: Setzt wichtige Sicherheits-Header
 * - Audit-Logging: Protokolliert alle Debug-Logins
 */
export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { locals, clientAddress } = context;
    const { env } = locals.runtime;
    const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const cookies = context.cookies;
    const ip = typeof clientAddress === 'string' ? clientAddress : undefined;

    // Restrict to development environment ONLY. This prevents usage in staging/production.
    const environment =
      typeof rawEnv.ENVIRONMENT === 'string' ? (rawEnv.ENVIRONMENT as string) : undefined;
    const isDevEnv = environment === 'development' || import.meta.env.DEV === true;
    if (!isDevEnv) {
      logSecurityEvent(
        'PERMISSION_DENIED',
        {
          reason: 'non_development_environment',
          message: 'Debug login attempted outside development environment',
          environment: environment || 'unknown',
        },
        { ipAddress: ip, targetResource: '/api/debug-login' }
      );
      return createApiError('forbidden', 'Debug login not available');
    }

    // Optional additional protection: require a secret header if configured
    const expectedToken =
      typeof rawEnv.DEBUG_LOGIN_TOKEN === 'string'
        ? (rawEnv.DEBUG_LOGIN_TOKEN as string)
        : undefined;
    if (expectedToken) {
      const provided =
        context.request?.headers?.get('x-debug-token') ||
        context.request?.headers?.get('X-Debug-Token');
      if (!provided || provided !== expectedToken) {
        logSecurityEvent(
          'PERMISSION_DENIED',
          {
            reason: 'invalid_or_missing_debug_token',
            message: 'Debug login missing or invalid X-Debug-Token header',
          },
          { ipAddress: ip, targetResource: '/api/debug-login' }
        );
        return createApiError('forbidden', 'Debug login token invalid');
      }
    }

    const db = env.DB;
    const debugUserHeaderRaw =
      context.request?.headers?.get('x-debug-user') ||
      context.request?.headers?.get('X-Debug-User');
    const debugUserKey = typeof debugUserHeaderRaw === 'string' ? debugUserHeaderRaw.trim() : '';
    const debugUserKeySafe = /^[a-z0-9_-]{1,32}$/i.test(debugUserKey) ? debugUserKey : '';

    const debugEmail = debugUserKeySafe
      ? `debug+${debugUserKeySafe}@example.com`
      : 'debug@example.com';
    const debugName = debugUserKeySafe ? `Debug User ${debugUserKeySafe}` : 'Debug User';
    const debugUsername = debugUserKeySafe ? `debuguser_${debugUserKeySafe}` : 'debuguser';
    const sessionTableName = 'sessions';
    const userTableName = 'users';

    // 1. Find or create the debug user
    let user = (await db
      .prepare(`SELECT * FROM ${userTableName} WHERE email = ?`)
      .bind(debugEmail)
      .first()) as {
      id: string;
      email: string;
      name?: string;
      username?: string;
      created_at?: string;
    } | null;

    if (!user) {
      const newUser = {
        id: crypto.randomUUID(),
        email: debugEmail,
        name: debugName,
        username: debugUsername,
        created_at: new Date().toISOString(),
      };
      await db
        .prepare(
          `INSERT INTO ${userTableName} (id, email, name, username, created_at) VALUES (?, ?, ?, ?, ?)`
        )
        .bind(newUser.id, newUser.email, newUser.name, newUser.username, newUser.created_at)
        .run();
      user = newUser;
    }

    // 2. Create a new session for the user
    const sessionId = uuidv4();
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const sessionExpiryUnix = Math.floor(sessionExpiry.getTime() / 1000);

    await db
      .prepare(`INSERT INTO ${sessionTableName} (id, user_id, expires_at) VALUES (?, ?, ?)`)
      .bind(sessionId, user.id, sessionExpiryUnix)
      .run();

    cookies.set('session_id', sessionId, {
      path: '/',
      expires: sessionExpiry,
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
    });

    // Debug-Login protokollieren
    logUserEvent(user.id, 'debug_login_created', {
      ipAddress: ip,
      debugUser: true,
    });

    return createApiSuccess({
      success: true,
      message: 'Debug session created for real user.',
      userId: user.id,
    });
  },
  {
    // Keine Authentifizierung erforderlich für Debug-Login
    requireAuth: false,

    // Spezielle Fehlerbehandlung für diesen Endpunkt
    onError: (context: APIContext, error: unknown) => {
      const { clientAddress } = context;
      const ip = typeof clientAddress === 'string' ? clientAddress : undefined;
      // Serverfehler protokollieren
      logApiError(
        '/api/debug-login',
        {
          error: error instanceof Error ? error.message : String(error),
        },
        { ipAddress: ip }
      );

      return createApiError('server_error', 'Debug login failed');
    },

    // Zusätzliche Logging-Metadaten
    logMetadata: { action: 'debug_login' },
  }
);
