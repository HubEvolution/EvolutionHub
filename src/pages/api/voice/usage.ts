import type { APIContext } from 'astro';
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
import { toUsageOverview } from '@/lib/kv/usage';

function ensureGuestIdCookie(context: APIContext): string {
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

type VoiceEnv = {
  KV_VOICE_TRANSCRIBE?: import('@cloudflare/workers-types').KVNamespace;
  OPENAI_API_KEY?: string;
  WHISPER_MODEL?: string;
  ENVIRONMENT?: string;
};

export const GET = withApiMiddleware(async (context: APIContext) => {
  const { locals } = context;
  const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? String(locals.user!.id) : ensureGuestIdCookie(context);

  const env = (locals.runtime?.env ?? {}) as Partial<VoiceEnv>;
  const service = new VoiceTranscribeService({
    KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    WHISPER_MODEL: env.WHISPER_MODEL,
    ENVIRONMENT: env.ENVIRONMENT,
  });

  try {
    const plan: Plan | undefined =
      ownerType === 'user' ? ((locals.user?.plan as Plan | undefined) ?? 'free') : undefined;
    const ent = getVoiceEntitlementsFor(ownerType, plan);
    const limit = ent.dailyBurstCap;
    const usageInfo = await service.getUsage(ownerType, ownerId, limit);
    const usage = toUsageOverview({
      used: usageInfo.used,
      limit: usageInfo.limit,
      resetAt: usageInfo.resetAt,
    });
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
