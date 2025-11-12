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
const voice_transcribe_service_1 = require('@/lib/services/voice-transcribe-service');
const voice_1 = require('@/config/voice');
const voice_stream_aggregator_1 = require('@/lib/services/voice-stream-aggregator');
const entitlements_1 = require('@/config/voice/entitlements');
const logger_factory_1 = require('@/server/utils/logger-factory');
const validation_1 = require('@/lib/validation');
const voice_2 = require('@/lib/validation/schemas/voice');
function ensureGuestIdCookie(context) {
  const cookies = context.cookies;
  let guestId = cookies.get('guest_id')?.value;
  if (!guestId) {
    guestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const url = new URL(context.request.url);
    cookies.set('guest_id', guestId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return guestId;
}
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { request, locals } = context;
    const log = logger_factory_1.loggerFactory.createLogger('voice-transcribe-api');
    const t0 = Date.now();
    const env = locals.runtime?.env ?? {};
    const form = await request.formData();
    const isFileLike = (v) =>
      !!v &&
      typeof v === 'object' &&
      typeof v.size === 'number' &&
      (typeof v.arrayBuffer === 'function' || typeof v.stream === 'function');
    let file = form.get('chunk');
    if (!isFileLike(file)) file = form.get('file');
    if (!isFileLike(file)) {
      for (const [, val] of form.entries()) {
        if (isFileLike(val)) {
          file = val;
          break;
        }
      }
    }
    // In dev echo mode we tolerate missing file by fabricating a tiny dummy audio blob
    if (!isFileLike(file) && String(env.VOICE_DEV_ECHO) === '1') {
      try {
        const dummy = new Blob([new Uint8Array(16)], { type: 'audio/webm' });
        const buf = await dummy.arrayBuffer();
        file = new File([buf], 'chunk.webm', { type: 'audio/webm' });
      } catch {}
    }
    const getField = (name) => {
      const v = form.get(name);
      return v === null ? undefined : v;
    };
    const parsed = voice_2.voiceTranscribeParamsSchema.safeParse({
      sessionId: getField('sessionId'),
      jobId: getField('jobId'),
      lang: getField('lang'),
      isLastChunk: getField('isLastChunk'),
    });
    if (!parsed.success) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid form fields', {
        details: (0, validation_1.formatZodError)(parsed.error),
      });
    }
    const sessionId = parsed.data.sessionId;
    const jobIdForm = parsed.data.jobId || '';
    const lang = parsed.data.lang;
    const isLastChunk = parsed.data.isLastChunk ?? false;
    try {
      log.debug('transcribe_api_received', {
        action: 'transcribe_api_received',
        metadata: {
          sessionId,
          jobId: jobIdForm || null,
          isLastChunk,
          providedType: isFileLike(file) ? file.type || 'unknown' : 'none',
          sizeBytes: isFileLike(file) ? file.size : 0,
        },
      });
    } catch {}
    if (!isFileLike(file)) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Missing chunk file');
    }
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = locals.user?.id || ensureGuestIdCookie(context);
    const openaiKey = String(env.VOICE_DEV_ECHO) === '1' ? undefined : env.OPENAI_API_KEY;
    const service = new voice_transcribe_service_1.VoiceTranscribeService({
      KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE,
      OPENAI_API_KEY: openaiKey,
      WHISPER_MODEL: env.WHISPER_MODEL,
      ENVIRONMENT: env.ENVIRONMENT,
      R2_VOICE: env.R2_VOICE,
      VOICE_R2_ARCHIVE: env.VOICE_R2_ARCHIVE,
      VOICE_DEV_ECHO: env.VOICE_DEV_ECHO,
    });
    const aggregator = new voice_stream_aggregator_1.VoiceStreamAggregator(env.KV_VOICE_TRANSCRIBE);
    const jobId = jobIdForm || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2));
    await aggregator.ensure(jobId);
    try {
      const plan = ownerType === 'user' ? (locals.user?.plan ?? 'free') : undefined;
      const ent = (0, entitlements_1.getVoiceEntitlementsFor)(ownerType, plan);
      const out = await service.transcribeChunk(
        ownerType,
        ownerId,
        sessionId,
        file,
        lang,
        ent.dailyBurstCap
      );
      // Aggregator-Update für Streaming/Polling
      if (out.text) {
        if (out.isFinal || isLastChunk) {
          await aggregator.setFinal(jobId, out.text);
        } else {
          await aggregator.appendPartial(jobId, out.text);
        }
      }
      if (out.usage) {
        const usage = {
          count: out.usage.used,
          limit: out.usage.limit,
          window: out.usage.resetAt ? new Date(out.usage.resetAt).toISOString() : 'rolling-24h',
        };
        await aggregator.setUsage(jobId, usage);
      }
      try {
        const dt = Date.now() - t0;
        log.info('transcribe_api_success', {
          action: 'transcribe_api_success',
          metadata: {
            sessionId,
            jobId,
            ownerType,
            isFinal: out.isFinal || isLastChunk,
            latencyMs: dt,
            sizeBytes: file.size,
          },
        });
      } catch {}
      return (0, api_middleware_1.createApiSuccess)({
        sessionId,
        jobId,
        text: out.text,
        isFinal: out.isFinal || isLastChunk,
        usage: out.usage,
        limits: { user: voice_1.VOICE_FREE_LIMIT_USER, guest: voice_1.VOICE_FREE_LIMIT_GUEST },
      });
    } catch (e) {
      const err = e;
      const type = err.apiErrorType || 'server_error';
      try {
        const dt = Date.now() - t0;
        log.warn('transcribe_api_error', {
          action: 'transcribe_api_error',
          metadata: {
            sessionId,
            jobId: jobIdForm || null,
            errorType: type,
            message: (err?.message || '').slice(0, 200),
            latencyMs: dt,
          },
        });
      } catch {}
      return (0, api_middleware_1.createApiError)(
        type,
        err.message || 'Unknown error',
        err.details || undefined
      );
    }
  },
  { rateLimiter: rate_limiter_1.voiceTranscribeLimiter, enforceCsrfToken: true }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
