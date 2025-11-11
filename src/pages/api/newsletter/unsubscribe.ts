import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { loggerFactory } from '@/server/utils/logger-factory';
import { createRateLimiter } from '@/lib/rate-limiter';
import { formatZodError } from '@/lib/validation';
import { newsletterUnsubscribeSchema } from '@/lib/validation';

const logger = loggerFactory.createLogger('newsletter-unsubscribe');
const securityLogger = loggerFactory.createSecurityLogger();

const unsubscribeLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  name: 'newsletterUnsubscribe',
});

export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { request } = context;
    const unknownBody: unknown = await request.json().catch(() => null);
    const parsed = newsletterUnsubscribeSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid JSON body', {
        details: formatZodError(parsed.error),
      });
    }
    const email = parsed.data.email.trim().toLowerCase();

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
