"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const confirm_1 = require("./confirm");
const logger_factory_1 = require("@/server/utils/logger-factory");
const rate_limiter_1 = require("@/lib/rate-limiter");
const validation_1 = require("@/lib/validation");
const newsletter_1 = require("@/lib/validation/schemas/newsletter");
// Tracking von Newsletter-Anmeldungen erfolgt clientseitig via window.evolutionAnalytics
// Logger-Instanzen erstellen
const logger = logger_factory_1.loggerFactory.createLogger('newsletter-subscribe');
// Rate-Limiter für Newsletter-Subscribe (10/Minute)
const newsletterLimiter = (0, rate_limiter_1.createRateLimiter)({
    maxRequests: 10,
    windowMs: 60 * 1000,
    name: 'newsletterSubscribe',
});
// Note: response typing is inferred from createApiSuccess/createApiError contracts
/**
 * Newsletter subscription API endpoint
 * Handles email validation, consent verification, and triggers email automation
 */
exports.POST = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { request } = context;
    const unknownBody = await request.json().catch(() => null);
    const parsed = newsletter_1.newsletterSubscribeSchema.safeParse(unknownBody);
    if (!parsed.success) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
            details: (0, validation_1.formatZodError)(parsed.error),
        });
    }
    const data = parsed.data;
    // Create pending subscription with secure token
    const confirmationToken = (0, confirm_1.createPendingSubscription)(data.email, data.source || 'website');
    // Generate confirmation URL
    const baseUrl = new URL(request.url).origin;
    const confirmationUrl = `${baseUrl}/newsletter/confirm?token=${confirmationToken}&email=${encodeURIComponent(data.email)}`;
    // Send double opt-in confirmation email
    const emailSent = await sendConfirmationEmail(data.email, confirmationUrl);
    if (!emailSent) {
        logger.error('Failed to send confirmation email', {
            metadata: {
                email: data.email.substring(0, 3) + '***', // PII-Redaction
                source: data.source || 'website',
            },
        });
        return (0, api_middleware_1.createApiError)('server_error', 'Failed to send confirmation email. Please try again.');
    }
    logger.info('Double opt-in email sent successfully', {
        metadata: {
            email: data.email.substring(0, 3) + '***', // PII-Redaction
            confirmationUrl: confirmationUrl,
            source: data.source || 'website',
        },
    });
    // Analytics event tracking (stubbed for now)
    logger.info('Newsletter subscription pending - analytics event', {
        metadata: {
            email: data.email.substring(0, 3) + '***', // PII-Redaction
            source: data.source || 'website',
            event: 'newsletter_subscribe_pending',
        },
    });
    return (0, api_middleware_1.createApiSuccess)({
        message: 'Please check your email to confirm your subscription!',
        email: data.email,
        nextStep: 'confirmation_required',
        info: 'We have sent a confirmation email to your address. Please click the link in the email to complete your subscription.',
    });
}, {
    rateLimiter: newsletterLimiter,
    enforceCsrfToken: false, // Newsletter-Anmeldung ist öffentlich
    disableAutoLogging: false,
});
/**
 * Send double opt-in confirmation email
 * TODO: Replace with actual email service integration
 */
async function sendConfirmationEmail(email, confirmationUrl) {
    try {
        // TODO: Integration with email service (Resend, SendGrid, etc.)
        logger.info('Sending confirmation email', {
            metadata: {
                email: email,
                confirmationUrl: confirmationUrl,
            },
        });
        // Mock email sending - in production, integrate with email service
        const emailContent = generateConfirmationEmailHTML(email, confirmationUrl);
        logger.info('Email content generated for confirmation', {
            metadata: {
                email: email,
                contentLength: emailContent.length,
            },
        });
        // Simulate email sending delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return true; // Mock success
    }
    catch (error) {
        logger.error('Error sending confirmation email', {
            metadata: {
                email: email,
                error: error instanceof Error ? error.message : 'unknown',
            },
        });
        return false;
    }
}
/**
 * Generate HTML content for confirmation email
 */
function generateConfirmationEmailHTML(email, confirmationUrl) {
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
// Duplicate functions removed - using the new sendConfirmationEmail function above
