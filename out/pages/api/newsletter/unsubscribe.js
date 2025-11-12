'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.POST = void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const logger_factory_1 = require('@/server/utils/logger-factory');
const rate_limiter_1 = require('@/lib/rate-limiter');
const validation_1 = require('@/lib/validation');
const newsletter_1 = require('@/lib/validation/schemas/newsletter');
const logger = logger_factory_1.loggerFactory.createLogger('newsletter-unsubscribe');
const securityLogger = logger_factory_1.loggerFactory.createSecurityLogger();
const unsubscribeLimiter = (0, rate_limiter_1.createRateLimiter)({
  maxRequests: 10,
  windowMs: 60 * 1000,
  name: 'newsletterUnsubscribe',
});
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { request } = context;
    const unknownBody = await request.json().catch(() => null);
    const parsed = newsletter_1.newsletterUnsubscribeSchema.safeParse(unknownBody);
    if (!parsed.success) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
        details: (0, validation_1.formatZodError)(parsed.error),
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
    return (0, api_middleware_1.createApiSuccess)({
      message: 'Erfolgreich abgemeldet',
      email,
    });
  },
  {
    rateLimiter: unsubscribeLimiter,
    enforceCsrfToken: false,
  }
);
