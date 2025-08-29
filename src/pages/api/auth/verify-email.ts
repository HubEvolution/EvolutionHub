/**
 * E-Mail-Verifikations-API-Endpunkt
 * 
 * Implementiert Double-Opt-in E-Mail-Verifikation für neue Benutzerregistrierungen.
 * Basiert auf dem bewährten Newsletter-Confirmation-Pattern.
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import { createSession } from '@/lib/auth-v2';
import { createSecureRedirect, createSecureJsonResponse } from '@/lib/response-helpers';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';
import { createEmailService, type EmailServiceDependencies } from '@/lib/services/email-service-impl';
import { localizePath } from '@/lib/locale-path';
import { loggerFactory } from '@/server/utils/logger-factory';

// Logger-Instanzen erstellen
const logger = loggerFactory.createLogger('verify-email');
const securityLogger = loggerFactory.createSecurityLogger();

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
  logger.debug('Incoming URL', {
    resource: 'verify-email',
    action: 'incoming_request',
    metadata: { url: url.toString() }
  });
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
    logger.debug('Token validation parameters', {
      resource: 'verify-email',
      action: 'validate_query',
      metadata: { hasToken: !!token, tokenLength: token?.length || 0, hasEmail: !!email }
    });

    // Validierung der Query-Parameter
    // Important: URLSearchParams.get returns null when absent; Zod optional expects undefined
    const validationPayload: { token: string | null; email?: string } = { token };
    if (email != null) {
      validationPayload.email = email;
    }
    const validation = verificationSchema.safeParse(validationPayload);
    if (!validation.success) {
      logger.warn('Validation failed', {
        resource: 'verify-email',
        action: 'validate_query',
        metadata: { errors: validation.error.errors }
      });
      logAuthFailure(context.clientAddress, {
        reason: 'invalid_verification_link',
        error: validation.error.errors
      });
      
      return redirectLocalized('/register', 'error=InvalidVerificationLink');
    }

    const { token: validToken } = validation.data;
    logger.debug('Validation successful', {
      resource: 'verify-email',
      action: 'validate_query',
      metadata: { tokenLength: validToken.length }
    });

    if (!context.locals.runtime) {
      const error = new Error("Runtime environment is not available. Are you running in a Cloudflare environment?");
      logger.error('Runtime environment error', {
        resource: 'verify-email',
        action: 'runtime_check',
        metadata: { error: error.message }
      });
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
      logger.warn('Verification token not found', {
        resource: 'verify-email',
        action: 'verify_token_lookup',
        metadata: { tokenPrefix: validToken.substring(0, 8) + '...' }
      });
      logAuthFailure(context.clientAddress, {
        reason: 'verification_token_not_found',
        token: validToken.substring(0, 8) + '...' // Nur Anfang loggen für Security
      });
      
      return redirectLocalized('/register', 'error=VerificationLinkExpired');
    }

    // Prüfen, ob Token bereits verwendet wurde
    if (tokenRecord.used_at) {
      logger.warn('Verification token already used', {
        resource: 'verify-email',
        action: 'verify_token_used',
        metadata: { userId: tokenRecord.user_id, usedAt: new Date(tokenRecord.used_at * 1000).toISOString() }
      });
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
      logger.warn('Verification token expired', {
        resource: 'verify-email',
        action: 'verify_token_expired',
        metadata: { expiredAt: new Date(tokenRecord.expires_at * 1000).toISOString() }
      });
      
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
      logger.warn('Email mismatch in verification', {
        resource: 'verify-email',
        action: 'verify_email_mismatch',
        metadata: { provided: email, expected: tokenRecord.email, userId: tokenRecord.user_id }
      });
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
      logger.error('User not found for verification token', {
        resource: 'verify-email',
        action: 'verify_user_lookup',
        metadata: { userId: tokenRecord.user_id }
      });
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
            logger.info('Welcome email sent successfully', {
              resource: 'verify-email',
              action: 'send_welcome_email',
              metadata: { email: user.email }
            });
          } else {
            logger.warn('Failed to send welcome email', {
              resource: 'verify-email',
              action: 'send_welcome_email',
              metadata: { error: result.error }
            });
          }
        })
        .catch(error => {
          logger.error('Welcome email error', {
            resource: 'verify-email',
            action: 'send_welcome_email',
            metadata: { error: error instanceof Error ? error.message : String(error) }
          });
        });
      
    } catch (emailError) {
      logger.warn('Non-blocking email service error', {
        resource: 'verify-email',
        action: 'email_service_error',
        metadata: { error: emailError instanceof Error ? emailError.message : String(emailError) }
      });
      // Fehler beim E-Mail-Versand blockiert nicht die Verifikation
    }

    // Erfolgreiche Verifikation protokollieren
    logAuthSuccess(user.id, context.clientAddress, {
      action: 'email_verified',
      email: user.email,
      sessionId: session.id,
      verificationTime: new Date(verificationTime * 1000).toISOString()
    });

    logger.info('Email successfully verified for user', {
      resource: 'verify-email',
      action: 'verification_success',
      metadata: { email: user.email }
    });

    // Weiterleitung zur Erfolgsseite
    return redirectLocalized('/email-verified', 'welcome=true');

  } catch (error) {
    logger.error('Error during email verification', {
      resource: 'verify-email',
      action: 'verification_error',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    
    // Generischer Server-Fehler
    logAuthFailure(context.clientAddress, {
      reason: 'verification_server_error',
      error: error instanceof Error ? error.message : String(error)
    });
    
    return redirectLocalized('/register', 'error=ServerError');
  }
};

/**
 * 405 Method Not Allowed für nicht unterstützte Methoden (nur GET erlaubt)
 */
const methodNotAllowed = (context: APIContext): Response => {
  // Leichtes Logging für Policy Enforcement
  logger.warn('Method not allowed on verify-email', {
    resource: 'verify-email',
    action: 'method_not_allowed',
    metadata: { method: context.request.method }
  });

  return createSecureJsonResponse(
    { error: true, message: 'Method Not Allowed' },
    405,
    { Allow: 'GET' }
  );
};

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;

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
  
  logger.info('Email verification token created', {
    resource: 'verify-email',
    action: 'create_verification_token',
    metadata: { email: email, tokenPrefix: token.substring(0, 8) + '...' }
  });
  
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

