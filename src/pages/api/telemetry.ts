import { withApiMiddleware, createApiError, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import { createRateLimiter } from '@/lib/rate-limiter';
import { loggerFactory } from '@/server/utils/logger-factory';

const telemetryLogger = loggerFactory.createLogger('telemetry');

const telemetryLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  name: 'telemetry'
});

type TelemetryEventName =
  | 'prompt_enhance_started'
  | 'prompt_enhance_succeeded'
  | 'prompt_enhance_failed'
  | 'prompt_enhance_cta_upgrade_click';

type AnyProps = Record<string, unknown>;

interface TelemetryEnvelope<T extends AnyProps> {
  eventName: TelemetryEventName;
  ts: number;
  context: { tool: 'prompt-enhancer' };
  props: T;
}

function validateEnvelope(body: unknown): body is TelemetryEnvelope<AnyProps> {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  const ev = b.eventName;
  const ts = b.ts;
  const ctx = b.context as any;
  const props = b.props;
  const allowed: TelemetryEventName[] = [
    'prompt_enhance_started',
    'prompt_enhance_succeeded',
    'prompt_enhance_failed',
    'prompt_enhance_cta_upgrade_click',
  ];
  if (!allowed.includes(ev as TelemetryEventName)) return false;
  if (typeof ts !== 'number') return false;
  if (!ctx || typeof ctx !== 'object' || ctx.tool !== 'prompt-enhancer') return false;
  if (!props || typeof props !== 'object') return false;
  return true;
}

export const POST = withApiMiddleware(async (context) => {
  const env = (context.locals.runtime?.env as any) || {};
  if ((env.PUBLIC_PROMPT_TELEMETRY_V1 || 'false') === 'false') {
    return createApiError('forbidden', 'Telemetry disabled');
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return createApiError('validation_error', 'Invalid JSON body');
  }

  if (!validateEnvelope(body)) {
    return createApiError('validation_error', 'Invalid telemetry envelope');
  }

  try {
    const { eventName, ts, context: ctx, props } = body as TelemetryEnvelope<AnyProps>;
    // Redacted log: no payload dump, only minimal metadata
    telemetryLogger.info('TELEMETRY_EVENT', {
      resource: 'telemetry',
      action: String(eventName),
      metadata: { ts, tool: ctx?.tool, hasProps: !!props },
    });
  } catch (err) {
    // swallow server-side errors but return success to not impact UX
  }

  return createApiSuccess({ ok: true }, 200);
}, {
  rateLimiter: telemetryLimiter,
  enforceCsrfToken: true,
  // require same-origin for unsafe methods (default true)
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
