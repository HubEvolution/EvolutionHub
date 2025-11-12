'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.POST =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const rate_limiter_1 = require('@/lib/rate-limiter');
function getEnv(context) {
  try {
    return context.locals?.runtime?.env || {};
  } catch {
    return {};
  }
}
exports.GET = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const env = getEnv(context);
    const provided = context.request.headers.get('x-internal-health');
    const expected = env?.INTERNAL_HEALTH_TOKEN;
    if (!expected || !provided || provided !== expected) {
      return (0, api_middleware_1.createApiError)(
        'forbidden',
        'Missing or invalid internal health token'
      );
    }
    const authProvider = env?.AUTH_PROVIDER || null;
    const stytchCustomDomain = env?.STYTCH_CUSTOM_DOMAIN || null;
    const baseUrl = env?.BASE_URL || null;
    const data = {
      ok: true,
      environment: env?.ENVIRONMENT || null,
      authProvider,
      stytchCustomDomainConfigured: Boolean(stytchCustomDomain),
      baseUrl,
      timestamp: new Date().toISOString(),
    };
    return (0, api_middleware_1.createApiSuccess)(data);
  },
  {
    rateLimiter: rate_limiter_1.authLimiter,
  }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
