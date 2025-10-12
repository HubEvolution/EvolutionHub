import type { APIRoute } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { voiceTranscribeLimiter } from '@/lib/rate-limiter';
import { VoiceTranscribeService } from '@/lib/services/voice-transcribe-service';
import { VOICE_FREE_LIMIT_USER, VOICE_FREE_LIMIT_GUEST } from '@/config/voice';

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
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

export const POST: APIRoute = withApiMiddleware(
  async ({ request, locals, cookies }) => {
    const form = await request.formData();
    const file = form.get('chunk');
    const sessionId = String(form.get('sessionId') || '').trim();
    const lang = form.get('lang') ? String(form.get('lang')) : undefined;
    if (!(file instanceof File) || !sessionId) {
      return createApiError('validation_error', 'Missing chunk or sessionId');
    }

    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = locals.user?.id || ensureGuestIdCookie({ request, locals, cookies } as any);

    const env = locals.runtime?.env ?? {};
    const service = new VoiceTranscribeService({
      KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      WHISPER_MODEL: env.WHISPER_MODEL,
      ENVIRONMENT: env.ENVIRONMENT,
    });

    try {
      const out = await service.transcribeChunk(ownerType as any, ownerId, sessionId, file, lang);
      return createApiSuccess({
        sessionId,
        text: out.text,
        isFinal: out.isFinal,
        usage: out.usage,
        limits: { user: VOICE_FREE_LIMIT_USER, guest: VOICE_FREE_LIMIT_GUEST },
      });
    } catch (e) {
      const err = e as any;
      const type = err.apiErrorType || 'server_error';
      return createApiError(type, err.message, err.details || undefined);
    }
  },
  { rateLimiter: voiceTranscribeLimiter, enforceCsrfToken: true }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
