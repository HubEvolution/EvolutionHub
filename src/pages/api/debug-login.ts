import { v4 as uuidv4 } from 'uuid';
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
export const POST = withApiMiddleware(async (context) => {
  const { locals, clientAddress } = context;
  const { env } = locals.runtime;
  const cookies = context.cookies;
  const ip = typeof clientAddress === 'string' ? clientAddress : undefined;

  // Only allow in non-production environments (driven by wrangler vars)
  const isProduction = (env as any)?.ENVIRONMENT === 'production';
  if (isProduction) {
    logSecurityEvent('PERMISSION_DENIED', {
      reason: 'production_environment',
      message: 'Debug login attempted in production environment'
    }, { ipAddress: ip, targetResource: '/api/debug-login' });
    return createApiError('forbidden', 'Debug login not available in production');
  }
  
  const db = env.DB;
  const debugEmail = 'debug@example.com';
  const sessionTableName = 'sessions';
  const userTableName = 'users';

  // 1. Find or create the debug user
  let user = await db
    .prepare(`SELECT * FROM ${userTableName} WHERE email = ?`)
    .bind(debugEmail)
    .first<{ id: string; email: string; name?: string; username?: string; created_at?: string }>();

  if (!user) {
    const newUser = {
      id: crypto.randomUUID(),
      email: debugEmail,
      name: 'Debug User',
      username: 'debuguser',
      created_at: new Date().toISOString(),
    };
    await db.prepare(`INSERT INTO ${userTableName} (id, email, name, username, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(newUser.id, newUser.email, newUser.name, newUser.username, newUser.created_at)
      .run();
    user = newUser;
  }

  // 2. Create a new session for the user
  const sessionId = uuidv4();
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionExpiryUnix = Math.floor(sessionExpiry.getTime() / 1000);

  await db.prepare(`INSERT INTO ${sessionTableName} (id, user_id, expires_at) VALUES (?, ?, ?)`) 
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
    debugUser: true
  });

  return createApiSuccess({ 
    success: true, 
    message: 'Debug session created for real user.',
    userId: user.id
  });
}, {
  // Keine Authentifizierung erforderlich für Debug-Login
  requireAuth: false,
  
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    const { clientAddress } = context;
    const ip = typeof clientAddress === 'string' ? clientAddress : undefined;
    // Serverfehler protokollieren
    logApiError('/api/debug-login', {
      error: error instanceof Error ? error.message : String(error)
    }, { ipAddress: ip });
    
    return createApiError('server_error', 'Debug login failed');
  },
  
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'debug_login' }
});