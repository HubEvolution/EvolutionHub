import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { VoiceStreamAggregator } from '@/lib/services/voice-stream-aggregator';

export const GET: APIRoute = withApiMiddleware(async ({ request, locals }) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId')?.trim();
  const env = (locals as any)?.runtime?.env ?? {};

  if (String(env.VOICE_STREAM_POLL) !== '1') {
    return createApiError('not_found', 'Polling disabled');
  }
  if (!jobId) {
    return createApiError('validation_error', 'Missing jobId');
  }

  const aggregator = new VoiceStreamAggregator(env.KV_VOICE_TRANSCRIBE);
  const state = await aggregator.get(jobId);
  if (!state) {
    return createApiSuccess({
      status: 'not_found',
      partials: [],
      final: undefined,
      usage: undefined,
    });
  }
  return createApiSuccess({ ...state });
});

export const POST = undefined as unknown as APIRoute; // 405 via framework
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
export const OPTIONS = POST;
export const HEAD = POST;
