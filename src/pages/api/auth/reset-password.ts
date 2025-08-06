import type { APIContext } from 'astro';
import { hash } from 'bcrypt-ts';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logPasswordReset, logAuthFailure } from '@/lib/security-logger';
import { createSecureRedirect } from '@/lib/response-helpers';

interface PasswordResetToken {
  id: string;
  user_id: string;
  expires_at: number;
}

/**
 * POST /api/auth/reset-password
 * Setzt das Passwort eines Benutzers zurück
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 * 
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 */
export const POST = async (context: APIContext) => {
  // Rate-Limiting anwenden
  const rateLimitResponse = await standardApiLimiter(context);
  if (rateLimitResponse) {
    return createSecureRedirect('/reset-password?error=TooManyRequests');
  }

  try {
    const formData = await context.request.formData();
    const token = formData.get('token');
    const password = formData.get('password');

    // Validate input
    if (typeof token !== 'string' || typeof password !== 'string' || password.length < 6) {
      // Fehlgeschlagene Anfrage protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'invalid_reset_password_input',
        hasToken: typeof token === 'string',
        hasPassword: typeof password === 'string'
      });
      
      const location = token ? `/reset-password?token=${token}&error=InvalidInput` : '/login?error=InvalidToken';
      return createSecureRedirect(location);
    }

    const db = context.locals.runtime.env.DB;
    const tokenResult = await db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?').bind(token).first<PasswordResetToken>();

    if (!tokenResult) {
      // Ungültiges Token protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'invalid_password_reset_token',
        token: token.slice(0, 8) // Nur die ersten Zeichen zur Identifikation
      });
      
      return createSecureRedirect(`/reset-password?token=${token}&error=InvalidToken`);
    }

    const expiresAt = new Date(Number(tokenResult.expires_at) * 1000);
    if (expiresAt.getTime() < Date.now()) {
      // Abgelaufenes Token protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'expired_password_reset_token',
        userId: tokenResult.user_id,
        tokenId: token.slice(0, 8),
        expiredAt: expiresAt.toISOString()
      });
      
      await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();
      
      return createSecureRedirect(`/reset-password?token=${token}&error=TokenExpired`);
    }

    // Passwort aktualisieren
    const hashedPassword = await hash(password, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashedPassword, tokenResult.user_id).run();
    await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();

    // Erfolgreichen Passwort-Reset protokollieren
    logPasswordReset(tokenResult.user_id, context.clientAddress, {
      action: 'password_reset_completed',
      tokenId: token.slice(0, 8)
    });

    return createSecureRedirect('/login?success=PasswordReset');
    
  } catch (error) {
    console.error('Reset password error:', error);
    
    // Generischer Serverfehler
    return createSecureRedirect('/reset-password?error=ServerError');
  }
};