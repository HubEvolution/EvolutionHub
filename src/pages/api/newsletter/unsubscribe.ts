import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { loggerFactory } from '@/server/utils/logger-factory';
import { createRateLimiter } from '@/lib/rate-limiter';

const logger = loggerFactory.createLogger('newsletter-unsubscribe');
const securityLogger = loggerFactory.createSecurityLogger();

const unsubscribeLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  name: 'newsletterUnsubscribe',
});

interface UnsubscribeRequest {
  email?: string;
}

export const POST = withApiMiddleware(
  async (context) => {
    const { request } = context;
    const body = (await request.json().catch(() => ({}))) as UnsubscribeRequest;

    if (!body.email || typeof body.email !== 'string') {
      return createApiError('validation_error', 'Email ist erforderlich');
    }

    const email = body.email.trim().toLowerCase();

    if (!email) {
      return createApiError('validation_error', 'Email ist erforderlich');
    }

    logger.info('Newsletter unsubscribe requested', {
      metadata: {
        emailPrefix: email.slice(0, 3),
      },
    });

    securityLogger.logSecurityEvent('USER_EVENT', {
      action: 'newsletter_unsubscribe',
      emailPrefix: email.slice(0, 3),
    });

    return createApiSuccess({
      message: 'Erfolgreich abgemeldet',
      email,
    });
  },
  {
    rateLimiter: unsubscribeLimiter,
    enforceCsrfToken: false,
  }
);
