'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PATCH =
  exports.PUT =
  exports.GET =
  exports.POST =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const rate_limiter_1 = require('@/lib/rate-limiter');
const logger_factory_1 = require('@/server/utils/logger-factory');
const telemetryLogger = logger_factory_1.loggerFactory.createLogger('telemetry');
const telemetryLimiter = (0, rate_limiter_1.createRateLimiter)({
  maxRequests: 30,
  windowMs: 60 * 1000,
  name: 'telemetry',
});
function validateEnvelope(body) {
  if (!body || typeof body !== 'object') return false;
  const b = body;
  const ev = b.eventName;
  const ts = b.ts;
  const ctx = b.context || {};
  const props = b.props;
  const allowed = [
    'prompt_enhance_started',
    'prompt_enhance_succeeded',
    'prompt_enhance_failed',
    'prompt_enhance_cta_upgrade_click',
  ];
  if (!allowed.includes(ev)) return false;
  if (typeof ts !== 'number') return false;
  if (!ctx || typeof ctx !== 'object' || ctx.tool !== 'prompt-enhancer') return false;
  if (!props || typeof props !== 'object') return false;
  return true;
}
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const env = context.locals.runtime?.env || {};
    const flag = env.PUBLIC_PROMPT_TELEMETRY_V1 ?? 'false';
    if (flag === 'false') {
      return (0, api_middleware_1.createApiError)('forbidden', 'Telemetry disabled');
    }
    let body;
    try {
      body = await context.request.json();
    } catch {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
    }
    if (!validateEnvelope(body)) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid telemetry envelope');
    }
    try {
      const { eventName, ts, context: ctx, props } = body;
      // Redacted log: no payload dump, only minimal metadata
      telemetryLogger.info('TELEMETRY_EVENT', {
        resource: 'telemetry',
        action: String(eventName),
        metadata: { ts, tool: ctx?.tool, hasProps: !!props },
      });
    } catch (_err) {
      // swallow server-side errors but return success to not impact UX
    }
    return (0, api_middleware_1.createApiSuccess)({ ok: true }, 200);
  },
  {
    rateLimiter: telemetryLimiter,
    enforceCsrfToken: true,
    // require same-origin for unsafe methods (default true)
  }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
