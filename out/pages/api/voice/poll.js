'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.HEAD =
  exports.OPTIONS =
  exports.DELETE =
  exports.PUT =
  exports.PATCH =
  exports.POST =
  exports.GET =
    void 0;
const api_middleware_1 = require('@/lib/api-middleware');
const voice_stream_aggregator_1 = require('@/lib/services/voice-stream-aggregator');
const logger_factory_1 = require('@/server/utils/logger-factory');
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
  const { request, locals } = context;
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId')?.trim();
  const env = locals.runtime?.env ?? {};
  const log = logger_factory_1.loggerFactory.createLogger('voice-poll-api');
  if (String(env.VOICE_STREAM_POLL) !== '1') {
    try {
      log.warn('voice_poll_disabled', {
        action: 'voice_poll_disabled',
        metadata: { jobId: jobId || null },
      });
    } catch {}
    return (0, api_middleware_1.createApiError)('not_found', 'Polling disabled');
  }
  if (!jobId) {
    try {
      log.debug('voice_poll_validation_error', {
        action: 'voice_poll_validation_error',
        metadata: { reason: 'missing_jobId' },
      });
    } catch {}
    return (0, api_middleware_1.createApiError)('validation_error', 'Missing jobId');
  }
  const aggregator = new voice_stream_aggregator_1.VoiceStreamAggregator(env.KV_VOICE_TRANSCRIBE);
  const state = await aggregator.get(jobId);
  if (!state) {
    try {
      log.info('voice_poll_not_found', {
        action: 'voice_poll_not_found',
        metadata: { jobId },
      });
    } catch {}
    return (0, api_middleware_1.createApiSuccess)({
      status: 'not_found',
      partials: [],
      final: undefined,
      usage: undefined,
    });
  }
  try {
    log.debug('voice_poll_success', {
      action: 'voice_poll_success',
      metadata: {
        jobId,
        status: state.status,
        partials: (state.partials || []).length,
        hasFinal: !!state.final,
      },
    });
  } catch {}
  const mapped = state.usage
    ? { used: state.usage.count, limit: state.usage.limit, window: state.usage.window }
    : undefined;
  return (0, api_middleware_1.createApiSuccess)({ ...state, usage: mapped });
});
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
