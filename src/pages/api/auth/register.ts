import type { APIContext } from 'astro';
import { createSession } from '@/lib/auth-v2';
import { hash } from 'bcrypt-ts';
import { withApiMiddleware } from '@/lib/api-middleware';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

/**
 * POST /api/auth/register
 * Registriert einen neuen Benutzer und erstellt eine Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withApiMiddleware(async (context: APIContext) => {
  const formData = await context.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const name = formData.get('name');
  const username = formData.get('username');

  // Validate form data
  if (
    typeof email !== 'string' ||
    email.length < 3 ||
    typeof password !== 'string' ||
    password.length < 6 ||
    typeof name !== 'string' ||
    name.length < 2 ||
    typeof username !== 'string' ||
    username.length < 3
  ) {
    // Fehlgeschlagene Registrierung protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'invalid_input',
      email: typeof email === 'string' ? email : null
    });

    return new Response(null, {
      status: 302,
      headers: { Location: '/register?error=InvalidInput' }
    });
  }

  const hashedPassword = await hash(password, 10);
  const userId = crypto.randomUUID();

  try {
    await context.locals.runtime.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name, username) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(userId, email, hashedPassword, name, username)
      .run();

    const session = await createSession(context.locals.runtime.env.DB, userId);
    context.cookies.set('session_id', session.id, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Erfolgreiche Registrierung protokollieren
    logAuthSuccess(userId, context.clientAddress, {
      action: 'register',
      email,
      username,
      sessionId: session.id
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard'
      }
    });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
      // Fehlgeschlagene Registrierung wegen Duplikat protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'duplicate_user',
        email
      });

      return new Response(null, {
        status: 302,
        headers: { Location: '/register?error=UserExists' }
      });
    }
    
    // Fehler protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'server_error',
      error: e instanceof Error ? e.message : String(e),
      email
    });
    
    // Allgemeiner Fehler - wird von der Middleware mit Security-Headers versehen
    return new Response(null, {
      status: 302,
      headers: { Location: '/register?error=UnknownError' }
    });
  }
});