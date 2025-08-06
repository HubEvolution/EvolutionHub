import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { withApiMiddleware, createApiSuccess, createApiError } from '@/lib/api-middleware';
import { logUserEvent, logSecurityEvent } from '@/lib/security-logger';

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
  
  // Nur in Entwicklungsumgebung erlauben
  if (import.meta.env.PROD) {
    logSecurityEvent('debug_login_blocked', {
      reason: 'production_environment',
      ipAddress: clientAddress,
      details: 'Debug login attempted in production environment'
    });
    
    return createApiError('security_error', 'Debug login not available in production', 403);
  }
  
  const db = env.DB;
  const debugEmail = 'debug@example.com';
  const sessionTableName = 'sessions';
  const userTableName = 'users';

  // 1. Find or create the debug user
  let user = await db.prepare(`SELECT * FROM ${userTableName} WHERE email = ?`).bind(debugEmail).first();

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

  await db.prepare(`INSERT INTO ${sessionTableName} (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(sessionId, user.id, sessionExpiry.toISOString())
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
    ipAddress: clientAddress,
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
    
    // Serverfehler protokollieren
    logSecurityEvent('debug_login_error', {
      error: error instanceof Error ? error.message : String(error),
      ipAddress: clientAddress
    });
    
    return createApiError('server_error', 'Debug login failed');
  },
  
  // Zusätzliche Logging-Metadaten
  logMetadata: { action: 'debug_login' }
});