import type { APIContext } from 'astro';
import { hash } from 'bcrypt-ts';
import { standardApiLimiter } from '@/lib/rate-limiter';
import { logAuthSuccess, logAuthFailure } from '@/lib/security-logger';
import { createSecureRedirect } from '@/lib/response-helpers';
import { createEmailVerificationToken } from './verify-email';
import { createEmailService, type EmailServiceDependencies } from '@/lib/services/email-service-impl';

/**
 * POST /api/auth/register
 * Registriert einen neuen Benutzer mit Double-Opt-in E-Mail-Verifikation
 * Implementiert Rate-Limiting, Security-Headers und Audit-Logging
 * 
 * WICHTIG: Dieser Endpunkt verwendet KEINE API-Middleware, da er Redirects statt JSON zurückgibt!
 * ÄNDЕРUNG: Benutzer wird als email_verified=false erstellt und muss E-Mail bestätigen
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
    const now = Math.floor(Date.now() / 1000);

    try {
      // Benutzer mit email_verified=false erstellen (Double-Opt-in)
      await context.locals.runtime.env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, name, username, email_verified, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
      )
        .bind(userId, email, hashedPassword, name, username, now)
        .run();

      // E-Mail-Verifikations-Token erstellen
      const verificationToken = await createEmailVerificationToken(
        context.locals.runtime.env.DB,
        userId,
        email
      );

      // Verifikations-URL generieren
      const baseUrl = new URL(context.request.url).origin;
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

      // E-Mail-Service konfigurieren und Verifikations-E-Mail senden
      try {
        const emailDeps: EmailServiceDependencies = {
          db: context.locals.runtime.env.DB,
          isDevelopment: import.meta.env.DEV,
          resendApiKey: context.locals.runtime.env.RESEND_API_KEY || '',
          fromEmail: 'EvolutionHub <noreply@hub-evolution.com>',
          baseUrl: baseUrl
        };
        
        const emailService = createEmailService(emailDeps);
        const emailResult = await emailService.sendVerificationEmail({
          email,
          verificationUrl,
          userName: name
        });
        
        if (!emailResult.success) {
          console.error('Failed to send verification email:', emailResult.error);
          // Benutzer löschen wenn E-Mail-Versand fehlschlägt
          await context.locals.runtime.env.DB.prepare('DELETE FROM users WHERE id = ?')
            .bind(userId)
            .run();
          
          logAuthFailure(context.clientAddress, {
            reason: 'email_send_failed',
            email,
            userId,
            error: emailResult.error
          });
          
          return createSecureRedirect('/register?error=EmailSendFailed');
        }
        
        console.log('✅ Verification email sent to:', email);
        
      } catch (emailError) {
        console.error('Email service error:', emailError);
        // Benutzer löschen wenn E-Mail-Service nicht verfügbar
        await context.locals.runtime.env.DB.prepare('DELETE FROM users WHERE id = ?')
          .bind(userId)
          .run();
        
        logAuthFailure(context.clientAddress, {
          reason: 'email_service_error',
          email,
          userId,
          error: emailError instanceof Error ? emailError.message : String(emailError)
        });
        
        return createSecureRedirect('/register?error=EmailServiceUnavailable');
      }

      // Erfolgreiche Registrierung protokollieren (Benutzer erstellt, E-Mail gesendet)
      logAuthSuccess(userId, context.clientAddress, {
        action: 'register_pending_verification',
        email,
        username,
        verificationToken: verificationToken.substring(0, 8) + '...' // Nur Anfang loggen
      });

      console.log('✅ User registered successfully, verification email sent:', email);

      // Weiterleitung zur E-Mail-Check-Seite statt Dashboard
      return createSecureRedirect(`/verify-email?email=${encodeURIComponent(email)}`);
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