import type { APIContext } from 'astro';
import { createSession, type User } from '@/lib/auth-v2';
import { compare } from 'bcrypt-ts';
import { authLimiter } from '@/lib/rate-limiter';
import { secureJsonResponse, applySecurityHeaders } from '@/lib/security-headers';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';

export async function POST(context: APIContext): Promise<Response> {
  // Rate-Limiting anwenden
  const rateLimitResponse = await authLimiter(context);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
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
    return new Response(null, {
      status: 302,
      headers: { Location: '/login?error=InvalidInput' }
    });
  }
  
  try {
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

    const validPassword = await compare(password, existingUser.password_hash);
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

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: '/dashboard'
      }
    });
    return applySecurityHeaders(response);
  } catch (e) {
    console.error(e);
    
    // Fehler loggen
    logAuthFailure(context.clientAddress, {
      reason: 'server_error',
      error: e instanceof Error ? e.message : String(e)
    });
    
    // Fehlerantwort mit sicheren Headern
    const response = new Response(null, {
      status: 302,
      headers: { Location: '/login?error=UnknownError' }
    });
    
    return applySecurityHeaders(response);
  }
}