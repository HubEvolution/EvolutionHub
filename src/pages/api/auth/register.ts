import type { APIContext } from 'astro';
import { createSession } from '@/lib/auth-v2';
import { hash } from 'bcrypt-ts';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';
import { createSecureRedirect } from '@/lib/response-helpers';

/**
 * POST /api/auth/register
 * Registriert einen neuen Benutzer und erstellt eine Session
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
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

      return createSecureRedirect('/register?error=InvalidInput');
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

      return createSecureRedirect('/dashboard');
    } catch (e: any) {
      if (e.message?.includes('UNIQUE constraint failed')) {
        // Fehlgeschlagene Registrierung wegen Duplikat protokollieren
        logAuthFailure(context.clientAddress, {
          reason: 'duplicate_user',
          email
        });

        return createSecureRedirect('/register?error=UserExists');
      }
      
      // Fehler protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'server_error',
        error: e instanceof Error ? e.message : String(e),
        email
      });
      
      // Allgemeiner Fehler mit Security-Headers versehen
      return createSecureRedirect('/register?error=UnknownError');
    }
  } catch (error) {
    console.error('Register error:', error);
    
    // Generischer Serverfehler
    return createSecureRedirect('/register?error=ServerError');
  }
};