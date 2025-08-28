import type { APIRoute } from 'astro';
import { createPendingSubscription } from './confirm.ts';
import { loggerFactory } from '@/server/utils/logger-factory';
import { type LogContext } from '@/config/logging';
// Tracking von Newsletter-Anmeldungen erfolgt clientseitig via window.evolutionAnalytics

// Logger-Instanzen erstellen
const logger = loggerFactory.createLogger('newsletter-subscribe');
const securityLogger = loggerFactory.createSecurityLogger();

interface NewsletterSubscriptionRequest {
  email: string;
  firstName?: string;
  consent: boolean;
  source?: string; // Track where subscription came from
}

interface NewsletterSubscriptionResponse {
  success: boolean;
  message: string;
  requiresConfirmation?: boolean;
  confirmationSent?: boolean;
}

/**
 * Newsletter subscription API endpoint
 * Handles email validation, consent verification, and triggers email automation
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data: NewsletterSubscriptionRequest = await request.json();
    
    // Validate required fields
    if (!data.email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'E-Mail-Adresse ist erforderlich'
        } satisfies NewsletterSubscriptionResponse),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
        } satisfies NewsletterSubscriptionResponse),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Consent validation (GDPR compliance)
    if (!data.consent) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Zustimmung zur Datenschutzerklärung ist erforderlich'
        } satisfies NewsletterSubscriptionResponse),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create pending subscription with secure token
    const confirmationToken = createPendingSubscription(
      data.email,
      data.source || 'website'
    );

    // Generate confirmation URL
    const baseUrl = new URL(request.url).origin;
    const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}&email=${encodeURIComponent(data.email)}`;

    // Send double opt-in confirmation email
    const emailSent = await sendConfirmationEmail(data.email, confirmationUrl);
    
    if (!emailSent) {
      logger.error('Failed to send confirmation email', {
        email: data.email,
        source: data.source || 'website'
      });
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to send confirmation email. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Double opt-in email sent successfully', {
      email: data.email,
      confirmationUrl: confirmationUrl,
      source: data.source || 'website'
    });

    // Analytics event tracking (stubbed for now)
    logger.info('Newsletter subscription pending - analytics event', {
      metadata: {
        email: data.email,
        source: data.source || 'website',
        event: 'newsletter_subscribe_pending'
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Please check your email to confirm your subscription!',
      email: data.email,
      next_step: 'confirmation_required',
      info: 'We have sent a confirmation email to your address. Please click the link in the email to complete your subscription.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Newsletter subscription error occurred', {
      metadata: {
        error: error instanceof Error ? error.message : 'unknown',
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    // Track error in analytics
    logger.info('Newsletter subscription API error - analytics event', {
      metadata: {
        error: error instanceof Error ? error.message : 'unknown',
        event: 'newsletter_subscription_error'
      }
    });

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      } satisfies NewsletterSubscriptionResponse),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Send double opt-in confirmation email
 * TODO: Replace with actual email service integration
 */
async function sendConfirmationEmail(email: string, confirmationUrl: string): Promise<boolean> {
  try {
    // TODO: Integration with email service (Resend, SendGrid, etc.)
    logger.info('Sending confirmation email', {
      metadata: {
        email: email,
        confirmationUrl: confirmationUrl
      }
    });

    // Mock email sending - in production, integrate with email service
    const emailContent = generateConfirmationEmailHTML(email, confirmationUrl);

    logger.info('Email content generated for confirmation', {
      metadata: {
        email: email,
        contentLength: emailContent.length
      }
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return true; // Mock success
  } catch (error) {
    logger.error('Error sending confirmation email', {
      metadata: {
        email: email,
        error: error instanceof Error ? error.message : 'unknown'
      }
    });
    return false;
  }
}

/**
 * Generate HTML content for confirmation email
 */
function generateConfirmationEmailHTML(email: string, confirmationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter-Anmeldung bestätigen</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #10b981; }
        .logo { font-size: 24px; font-weight: bold; color: #10b981; }
        .content { padding: 30px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981, #06b6d4); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: linear-gradient(135deg, #059669, #0891b2); }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .small { font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Evolution Hub</div>
            <h1>Newsletter-Anmeldung bestätigen</h1>
        </div>
        
        <div class="content">
            <p>Hallo!</p>
            
            <p>Sie haben sich für unseren Newsletter mit der E-Mail-Adresse <strong>${email}</strong> angemeldet.</p>
            
            <p>Um Ihre Anmeldung abzuschließen und sicherzustellen, dass Sie unsere wertvollen Inhalte erhalten, klicken Sie bitte auf den folgenden Button:</p>
            
            <div style="text-align: center;">
                <a href="${confirmationUrl}" class="button">Newsletter-Anmeldung bestätigen</a>
            </div>
            
            <p>Falls der Button nicht funktioniert, können Sie auch den folgenden Link in Ihren Browser kopieren:</p>
            <p style="word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">${confirmationUrl}</p>
            
            <p><strong>Wichtig:</strong> Dieser Bestätigungslink ist nur 24 Stunden gültig.</p>
            
            <p>Nach der Bestätigung erhalten Sie:</p>
            <ul>
                <li>✨ Exklusive Einblicke in New Work und Produktivität</li>
                <li>🚀 Frühen Zugang zu neuen Features und Tools</li>
                <li>📊 Praktische Tipps für die moderne Arbeitswelt</li>
                <li>💡 Inspiration für Ihre berufliche Entwicklung</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Diese E-Mail wurde an <strong>${email}</strong> gesendet.</p>
            <p class="small">Falls Sie sich nicht für unseren Newsletter angemeldet haben, können Sie diese E-Mail ignorieren.</p>
            <p class="small">© 2025 Evolution Hub. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Check if email is already subscribed (stub implementation)
 * In production, this would query the database
 */
async function checkExistingSubscription(email: string): Promise<boolean> {
  // TODO: Implement database check
  // const result = await db.query('SELECT id FROM newsletter_subscriptions WHERE email = ? AND status = "active"', [email]);
  // return result.length > 0;

  logger.info('Checking existing newsletter subscription', {
    metadata: {
      email: email,
      action: 'subscription_check'
    }
  });
  return false; // Stub: assume no existing subscription
}

/**
 * Create newsletter subscription record (stub implementation)
 * In production, this would insert into database
 */
async function createNewsletterSubscription(data: any): Promise<string> {
  // TODO: Implement database insertion
  // const result = await db.query('INSERT INTO newsletter_subscriptions SET ?', data);
  // return result.insertId;

  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.info('Newsletter subscription record created', {
    metadata: {
      subscriptionId: subscriptionId,
      email: data.email,
      source: data.source,
      action: 'subscription_created'
    }
  });
  return subscriptionId;
}

// Duplicate function removed - using the new sendConfirmationEmail function above
