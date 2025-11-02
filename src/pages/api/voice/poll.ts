import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { VoiceStreamAggregator } from '@/lib/services/voice-stream-aggregator';
import { loggerFactory } from '@/server/utils/logger-factory';

export const GET = withApiMiddleware(async (context: APIContext) => {
  const { request, locals } = context;
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId')?.trim();
  const env = locals.runtime?.env ?? {};
  const log = loggerFactory.createLogger('voice-poll-api');

  if (String(env.VOICE_STREAM_POLL) !== '1') {
    try {
      log.warn('voice_poll_disabled', {
        action: 'voice_poll_disabled',
        metadata: { jobId: jobId || null },
      });
    } catch {}
    return createApiError('not_found', 'Polling disabled');
  }
  if (!jobId) {
    try {
      log.debug('voice_poll_validation_error', {
        action: 'voice_poll_validation_error',
        metadata: { reason: 'missing_jobId' },
      });
    } catch {}
    return createApiError('validation_error', 'Missing jobId');
  }

  const aggregator = new VoiceStreamAggregator(env.KV_VOICE_TRANSCRIBE);
  const state = await aggregator.get(jobId);
  if (!state) {
    try {
      log.info('voice_poll_not_found', {
        action: 'voice_poll_not_found',
        metadata: { jobId },
      });
    } catch {}
    return createApiSuccess({
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
  return createApiSuccess({ ...state, usage: mapped });
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
