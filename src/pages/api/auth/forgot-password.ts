import type { APIContext } from 'astro';
import { Resend } from 'resend';
import type { User } from '@/lib/auth-v2';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logPasswordReset, logAuthFailure } from '@/lib/security-logger';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';

// Diese API-Route sollte nicht prerendered werden, da sie Request-Header benötigt
export const prerender = false;

/**
 * POST /api/auth/forgot-password
 * Sendet eine E-Mail mit einem Passwort-Reset-Link
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
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

  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return createSecureRedirect(`${locale === 'en' ? '/en' : ''}/forgot-password?error=TooManyRequests`);
  }

  try {
  const formData = await context.request.formData();
  const localeField = formData.get('locale');
  if (typeof localeField === 'string' && (localeField === 'de' || localeField === 'en')) {
    locale = localeField;
  }
  const email = formData.get('email');

  // Validate email
  if (typeof email !== 'string' || email.length < 3) {
    // Fehlgeschlagene Anfrage protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'invalid_email',
      input: typeof email === 'string' ? email : null
    });
    
    return createSecureRedirect(`${locale === 'en' ? '/en' : ''}/forgot-password?error=InvalidEmail`);
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
    
    return createSecureRedirect('/auth/password-reset-sent');
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, existingUser.id, Math.floor(expiresAt.getTime() / 1000)).run();

  // Verwende ein Fragment-Token, um das Risiko von Token-Leaks in Logs/Proxys zu reduzieren
  const resetLink = `${context.url.origin}/reset-password#token=${token}`;
  
  const resend = new Resend(context.locals.runtime.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Reset Your Password',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`
  });

  // Erfolgreiche Passwort-Reset-Anfrage protokollieren
  logPasswordReset(existingUser.id, context.clientAddress, {
    action: 'password_reset_requested'
  });

  return createSecureRedirect('/auth/password-reset-sent');
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Generischer Serverfehler
    return createSecureRedirect(`${locale === 'en' ? '/en' : ''}/forgot-password?error=ServerError`);
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