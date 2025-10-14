import type { APIRoute } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createMethodNotAllowed,
  createApiError,
} from '@/lib/api-middleware';
import { VoiceTranscribeService } from '@/lib/services/voice-transcribe-service';
import { VOICE_FREE_LIMIT_GUEST, VOICE_FREE_LIMIT_USER } from '@/config/voice';
import { getVoiceEntitlementsFor } from '@/config/voice/entitlements';
import type { Plan } from '@/config/ai-image/entitlements';

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

export const GET: APIRoute = withApiMiddleware(async (context) => {
  const { locals } = context;
  const ownerType = locals.user?.id ? 'user' : 'guest';
  const ownerId =
    ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  const env = locals.runtime?.env ?? {};
  const service = new VoiceTranscribeService({
    KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    WHISPER_MODEL: env.WHISPER_MODEL,
    ENVIRONMENT: env.ENVIRONMENT,
  });

  try {
    const plan: Plan | undefined =
      ownerType === 'user' ? ((locals.user?.plan as Plan | undefined) ?? 'free') : undefined;
    const ent = getVoiceEntitlementsFor(ownerType as any, plan);
    const limit = ent.dailyBurstCap;
    const usage = await service.getUsage(ownerType as any, ownerId, limit);
    const resp = createApiSuccess({
      ownerType,
      usage,
      limits: { user: VOICE_FREE_LIMIT_USER, guest: VOICE_FREE_LIMIT_GUEST },
      plan: locals.user?.plan || 'free',
      entitlements: ent,
    });
    try {
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      resp.headers.set('Pragma', 'no-cache');
      resp.headers.set('Expires', '0');
      resp.headers.set('X-Usage-OwnerType', ownerType);
      resp.headers.set(
        'X-Usage-Plan',
        ownerType === 'user' ? String(locals.user?.plan || 'free') : ''
      );
      resp.headers.set('X-Usage-Limit', String(limit));
    } catch {}
    return resp;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return createApiError('server_error', message);
  }
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
