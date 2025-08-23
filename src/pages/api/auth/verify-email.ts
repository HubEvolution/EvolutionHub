/**
 * E-Mail-Verifikations-API-Endpunkt
 * 
 * Implementiert Double-Opt-in E-Mail-Verifikation für neue Benutzerregistrierungen.
 * Basiert auf dem bewährten Newsletter-Confirmation-Pattern.
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import { createSession } from '@/lib/auth-v2';
import { createSecureRedirect } from '@/lib/response-helpers';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';
import { createEmailService, type EmailServiceDependencies } from '@/lib/services/email-service-impl';
import { localizePath } from '@/lib/locale-path';

// Validierungsschema für Verifikations-Anfragen (analog zu Newsletter-Pattern)
const verificationSchema = z.object({
  token: z.string().min(32, 'Invalid token format'),
  // Accept nullish (undefined or null) to be robust against URLSearchParams.get() returning null
  email: z.string().email('Invalid email format').nullish()
});

/**
 * Interface für E-Mail-Verifikations-Token aus der Datenbank
 */
interface EmailVerificationToken {
  token: string;
  user_id: string;
  email: string;
  created_at: number;
  expires_at: number;
  used_at: number | null;
}

/**
 * Interface für User aus der Datenbank
 */
interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  email_verified: number;
  email_verified_at: number | null;
}

/**
 * GET /api/auth/verify-email
 * Verarbeitet E-Mail-Verifikations-Links von registrierten Benutzern
 * 
 * Query Parameter:
 * - token: Der Verifikations-Token (erforderlich)
 * - email: Die E-Mail-Adresse zur Validierung (optional)
 * 
 * Redirect-Ziele:
 * - Bei Erfolg: /email-verified (neue Seite)
 * - Bei Fehlern: /register mit entsprechendem error-Parameter
 */
export const GET = async (context: APIContext) => {
  // Locale aus Query (Fallback: Referer -> 'en') vorab berechnen
  const url = new URL(context.request.url);
  // Debug incoming request
  console.log('[verify-email] Incoming URL:', url.toString());
  const referer =
    typeof context?.request?.headers?.get === 'function'
      ? context.request.headers.get('referer') ?? ''
      : '';
  const qpLocale = url.searchParams.get('locale');
  const locale = (qpLocale === 'de' || qpLocale === 'en')
    ? qpLocale
    : (referer.includes('/de/') ? 'de' : referer.includes('/en/') ? 'en' : 'en');

  const redirectLocalized = (path: string, query?: string) => {
    const base = localizePath((locale === 'de' ? 'de' : 'en'), path);
    return createSecureRedirect(query ? `${base}?${query}` : base);
  };

  try {
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');
    console.log('[verify-email] token present:', !!token, 'len:', token?.length || 0, 'email present:', !!email);

    // Validierung der Query-Parameter
    // Important: URLSearchParams.get returns null when absent; Zod optional expects undefined
    const validationPayload: { token: string | null; email?: string } = { token };
    if (email != null) {
      validationPayload.email = email;
    }
    const validation = verificationSchema.safeParse(validationPayload);
    if (!validation.success) {
      console.log('[verify-email] validation failed:', validation.error.errors);
      logAuthFailure(context.clientAddress, {
        reason: 'invalid_verification_link',
        error: validation.error.errors
      });
      
      return redirectLocalized('/register', 'error=InvalidVerificationLink');
    }

    const { token: validToken } = validation.data;
    console.log('[verify-email] validation ok, token length:', validToken.length);

    if (!context.locals.runtime) {
      const error = new Error("Runtime environment is not available. Are you running in a Cloudflare environment?");
      console.error(error.message);
      throw error;
    }

    const db = context.locals.runtime.env.DB;

    // Token aus der Datenbank laden und validieren
    const tokenRecord = await db.prepare(`
      SELECT token, user_id, email, created_at, expires_at, used_at 
      FROM email_verification_tokens 
      WHERE token = ?
    `).bind(validToken).first<EmailVerificationToken>();

    if (!tokenRecord) {
      console.log('Verification token not found:', validToken);
      logAuthFailure(context.clientAddress, {
        reason: 'verification_token_not_found',
        token: validToken.substring(0, 8) + '...' // Nur Anfang loggen für Security
      });
      
      return redirectLocalized('/register', 'error=VerificationLinkExpired');
    }

    // Prüfen, ob Token bereits verwendet wurde
    if (tokenRecord.used_at) {
      console.log('Verification token already used:', validToken);
      logAuthFailure(context.clientAddress, {
        reason: 'verification_token_already_used',
        userId: tokenRecord.user_id,
        usedAt: new Date(tokenRecord.used_at * 1000).toISOString()
      });
      
      return redirectLocalized('/register', 'error=VerificationLinkAlreadyUsed');
    }

    // Prüfen, ob Token abgelaufen ist (24 Stunden)
    const now = Math.floor(Date.now() / 1000);
    if (now > tokenRecord.expires_at) {
      console.log('Verification token expired:', validToken, 'Expired at:', new Date(tokenRecord.expires_at * 1000));
      
      // Abgelaufenen Token löschen
      await db.prepare('DELETE FROM email_verification_tokens WHERE token = ?')
        .bind(validToken)
        .run();

      logAuthFailure(context.clientAddress, {
        reason: 'verification_token_expired',
        userId: tokenRecord.user_id,
        expiredAt: new Date(tokenRecord.expires_at * 1000).toISOString()
      });
      
      return redirectLocalized('/register', 'error=VerificationLinkExpired');
    }

    // E-Mail-Adresse validieren wenn angegeben
    if (email && email !== tokenRecord.email) {
      console.log('Email mismatch in verification:', email, 'vs', tokenRecord.email);
      logAuthFailure(context.clientAddress, {
        reason: 'verification_email_mismatch',
        provided: email,
        expected: tokenRecord.email,
        userId: tokenRecord.user_id
      });
      
      return redirectLocalized('/register', 'error=InvalidVerificationLink');
    }

    // Benutzer aus der Datenbank laden
    const user = await db.prepare('SELECT * FROM users WHERE id = ?')
      .bind(tokenRecord.user_id)
      .first<User>();

    if (!user) {
      console.error('User not found for verification token:', tokenRecord.user_id);
      logAuthFailure(context.clientAddress, {
        reason: 'verification_user_not_found',
        userId: tokenRecord.user_id
      });
      
      return redirectLocalized('/register', 'error=UserNotFound');
    }

    // Benutzer als verifiziert markieren
    const verificationTime = Math.floor(Date.now() / 1000);
    
    await db.prepare(`
      UPDATE users 
      SET email_verified = 1, email_verified_at = ? 
      WHERE id = ?
    `).bind(verificationTime, user.id).run();

    // Token als verwendet markieren
    await db.prepare(`
      UPDATE email_verification_tokens 
      SET used_at = ? 
      WHERE token = ?
    `).bind(verificationTime, validToken).run();

    // Session für den verifizierten Benutzer erstellen
    const session = await createSession(db, user.id);
    
    // Session-Cookie setzen
    context.cookies.set('session_id', session.id, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 Tage
      secure: context.url.protocol === 'https:',
      sameSite: 'lax'
    });

    // Willkommens-E-Mail senden (non-blocking)
    try {
      // E-Mail-Service konfigurieren
      const emailDeps: EmailServiceDependencies = {
        db: db,
        isDevelopment: import.meta.env.DEV,
        resendApiKey: context.locals.runtime.env.RESEND_API_KEY || '',
        fromEmail: 'EvolutionHub <noreply@hub-evolution.com>',
        baseUrl: url.origin
      };
      
      const emailService = createEmailService(emailDeps);
      
      // Willkommens-E-Mail senden (asynchron, Fehler nicht blockierend)
      emailService.sendWelcomeEmail(user.email, user.name)
        .then(result => {
          if (result.success) {
            console.log('✅ Welcome email sent to:', user.email);
          } else {
            console.warn('⚠️ Failed to send welcome email:', result.error);
          }
        })
        .catch(error => {
          console.error('❌ Welcome email error:', error);
        });
      
    } catch (emailError) {
      console.warn('Non-blocking email service error:', emailError);
      // Fehler beim E-Mail-Versand blockiert nicht die Verifikation
    }

    // Erfolgreiche Verifikation protokollieren
    logAuthSuccess(user.id, context.clientAddress, {
      action: 'email_verified',
      email: user.email,
      sessionId: session.id,
      verificationTime: new Date(verificationTime * 1000).toISOString()
    });

    console.log('✅ Email successfully verified for user:', user.email);

    // Weiterleitung zur Erfolgsseite
    return redirectLocalized('/email-verified', 'welcome=true');

  } catch (error) {
    console.error('Error during email verification:', error);
    
    // Generischer Server-Fehler
    logAuthFailure(context.clientAddress, {
      reason: 'verification_server_error',
      error: error instanceof Error ? error.message : String(error)
    });
    
    return redirectLocalized('/register', 'error=ServerError');
  }
};

/**
 * Utility-Funktion zum Erstellen eines E-Mail-Verifikations-Tokens
 * Diese wird vom Register-Endpunkt aufgerufen
 */
export async function createEmailVerificationToken(
  db: any, 
  userId: string, 
  email: string
): Promise<string> {
  // Sicheren Token generieren (64 Zeichen + Timestamp wie im Newsletter-Pattern)
  const token = generateSecureToken();
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (24 * 60 * 60); // 24 Stunden
  
  // Vorhandene Tokens für diesen User löschen
  await db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?')
    .bind(userId)
    .run();
  
  // Neuen Token speichern
  await db.prepare(`
    INSERT INTO email_verification_tokens (token, user_id, email, created_at, expires_at, used_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `).bind(token, userId, email, now, expiresAt).run();
  
  console.log('✅ Email verification token created for:', email, 'Token:', token.substring(0, 8) + '...');
  
  return token;
}

/**
 * Utility-Funktion zum Generieren eines sicheren Tokens
 * Identisch zum Newsletter-Pattern
 */
function generateSecureToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  // 64-Zeichen Token generieren
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Timestamp-Komponente für Eindeutigkeit hinzufügen
  return token + Date.now().toString(36);
}
