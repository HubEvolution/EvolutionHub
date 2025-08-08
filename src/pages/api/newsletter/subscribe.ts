import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createPendingSubscription } from './confirm.ts';
import { trackNewsletterSignup } from '@/lib/analytics';

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
      console.error('Failed to send confirmation email to:', data.email);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to send confirmation email. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Double opt-in email sent to:', data.email);
    console.log('Confirmation URL:', confirmationUrl);

    // Analytics event tracking (stubbed for now)
    console.log('Analytics: newsletter_subscribe_pending', {
      email: data.email,
      source: data.source || 'website',
      timestamp: new Date().toISOString()
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
    console.error('Newsletter subscription error:', error);

    // Track error in analytics
    console.log(`[Analytics] Newsletter subscription API error: ${error instanceof Error ? error.message : 'unknown'}`);

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
    console.log('Sending confirmation email to:', email);
    console.log('Confirmation URL:', confirmationUrl);
    
    // Mock email sending - in production, integrate with email service
    const emailContent = generateConfirmationEmailHTML(email, confirmationUrl);
    
    console.log('Email content generated:', emailContent.length, 'characters');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true; // Mock success
  } catch (error) {
    console.error('Error sending confirmation email:', error);
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
  
  console.log(`[Newsletter] Checking existing subscription for ${email}`);
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
  console.log(`[Newsletter] Created subscription record:`, { subscriptionId, ...data });
  return subscriptionId;
}

// Duplicate function removed - using the new sendConfirmationEmail function above
