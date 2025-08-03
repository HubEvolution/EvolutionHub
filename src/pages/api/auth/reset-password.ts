import type { APIContext } from 'astro';
import { hash } from 'bcrypt-ts';
import { sensitiveActionLimiter } from '@/lib/rate-limiter';
import { applySecurityHeaders } from '@/lib/security-headers';
import { logPasswordReset, logAuthFailure } from '@/lib/security-logger';

interface PasswordResetToken {
  id: string;
  user_id: string;
  expires_at: number;
}

export async function POST(context: APIContext): Promise<Response> {
  // Rate-Limiting für sensible Aktionen anwenden
  const rateLimitResponse = await sensitiveActionLimiter(context);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
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
    const response = new Response(null, {
      status: 302,
      headers: { Location: location }
    });
    return applySecurityHeaders(response);
  }

  try {
    const db = context.locals.runtime.env.DB;
    const tokenResult = await db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?').bind(token).first<PasswordResetToken>();

    if (!tokenResult) {
      // Ungültiges Token protokollieren
      logAuthFailure(context.clientAddress, {
        reason: 'invalid_password_reset_token',
        token: token.slice(0, 8) // Nur die ersten Zeichen zur Identifikation
      });
      
      const response = new Response(null, {
        status: 302,
        headers: { Location: `/reset-password?token=${token}&error=InvalidToken` }
      });
      return applySecurityHeaders(response);
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
      const response = new Response(null, {
        status: 302,
        headers: { Location: `/reset-password?token=${token}&error=ExpiredToken` }
      });
      return applySecurityHeaders(response);
    }

    const hashedPassword = await hash(password, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hashedPassword, tokenResult.user_id).run();
    await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token).run();

    // Erfolgreichen Passwort-Reset protokollieren
    logPasswordReset(tokenResult.user_id, context.clientAddress, {
      action: 'password_reset_completed',
      tokenId: token.slice(0, 8)
    });

    const response = await context.redirect('/auth/password-reset-success', 302);
    return applySecurityHeaders(response);
  } catch (e) {
    console.error(e);
    
    // Fehler protokollieren
    logAuthFailure(context.clientAddress, {
      reason: 'server_error',
      error: e instanceof Error ? e.message : String(e),
      tokenProvided: typeof token === 'string'
    });
    
    const response = new Response(null, {
      status: 302,
      headers: { Location: `/reset-password?token=${token}&error=UnknownError` }
    });
    return applySecurityHeaders(response);
  }
}