import type { APIContext } from 'astro';
import { Resend } from 'resend';
import type { User } from '@/lib/auth-v2';
import { withApiMiddleware } from '@/lib/api-middleware';
import { logPasswordReset, logAuthFailure } from '@/lib/security-logger';

// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
export const prerender = false;

interface PasswordResetToken {
  id: string;
  user_id: string;
  expires_at: number;
}

/**
 * POST /api/auth/forgot-password
 * Sendet eine E-Mail mit einem Passwort-Reset-Link
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 */
export const POST = withApiMiddleware(async (context: APIContext) => {
  const formData = await context.request.formData();
  const email = formData.get('email');

  // Validate email
  if (typeof email !== 'string' || email.length < 3) {
    // Fehlgeschlagene Anfrage protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'invalid_email',
      input: typeof email === 'string' ? email : null
    });
    
    return new Response(null, {
      status: 302,
      headers: { Location: '/forgot-password?error=InvalidEmail' }
    });
  }

  const db = context.locals.runtime.env.DB;
  const existingUser = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<User>();

  if (!existingUser) {
    // We don't want to reveal if a user exists or not
    // Versuch trotzdem protokollieren, aber ohne zu viel Information preiszugeben
    logAuthFailure(context.clientAddress, {
      reason: 'password_reset_non_existent_user',
      // Wir speichern die E-Mail absichtlich nicht, um keine User-Enumeration zu ermöglichen
    });
    
    return await context.redirect('/auth/password-reset-sent', 302);
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, existingUser.id, Math.floor(expiresAt.getTime() / 1000)).run();

  const resetLink = `${context.url.origin}/reset-password?token=${token}`;
  
  const resend = new Resend(context.locals.runtime.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Reset Your Password',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
  });

  // Erfolgreiche Passwort-Reset-Anfrage protokollieren
  logPasswordReset(existingUser.id, context.clientAddress, {
    action: 'password_reset_requested',
    tokenId: token
  });

  return await context.redirect('/auth/password-reset-sent', 302);
}, {
  // Spezielle Fehlerbehandlung für diesen Endpunkt
  onError: (context, error) => {
    // Fehler protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'server_error',
      error: error instanceof Error ? error.message : String(error),
      email: context.request.formData ? 'form_data_error' : 'unknown'
    });
    
    return new Response(null, {
      status: 302,
      headers: { Location: '/forgot-password?error=UnknownError' }
    });
  }
});