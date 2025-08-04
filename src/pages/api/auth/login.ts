import type { APIContext } from 'astro';
import { createSession, type User } from '@/lib/auth-v2';
import { compare } from 'bcrypt-ts';
import { withApiMiddleware } from '@/lib/api-middleware';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

/**
 * POST /api/auth/login
 * Authentifiziert einen Benutzer und erstellt eine Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withApiMiddleware(async (context: APIContext) => {
  const formData = await context.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  // Validate form data
  if (
    typeof email !== 'string' ||
    email.length < 3 ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    // Fehler bei der Validierung - Umleitung zur Login-Seite
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=InvalidInput' }
    });
  }
  
  if (!context.locals.runtime) {
    console.error("Runtime environment is not available. Are you running in a Cloudflare environment?");
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=MissingRuntime' }
    });
  }
    
  const db = context.locals.runtime.env.DB;
  const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();

  if (!existingUser) {
    // Fehlgeschlagene Anmeldung protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'user_not_found',
      email
    });

    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=InvalidCredentials' }
    });
  }

  if (!existingUser.password_hash) {
    // Fehlgeschlagene Anmeldung protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'missing_password_hash',
      userId: existingUser.id
    });

    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=InvalidCredentials' }
    });
  }

  const validPassword = await compare(password, existingUser.password_hash);
  if (!validPassword) {
    // Fehlgeschlagene Anmeldung protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'invalid_password',
      userId: existingUser.id
    });

    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=InvalidCredentials' }
    });
  }

  const session = await createSession(db, existingUser.id);
  context.cookies.set('session_id', session.id, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: context.url.protocol === 'https:',
    sameSite: 'lax'
  });

  // Erfolgreiche Anmeldung protokollieren
  logAuthSuccess(existingUser.id, context.clientAddress, {
    action: 'login',
    sessionId: session.id
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/dashboard'
    }
  });
});

// Fehlerbehandlung wird von der API-Middleware übernommen
// Bei einem Fehler wird die Middleware eine Umleitung zur Login-Seite mit einer Fehlermeldung durchführen
}