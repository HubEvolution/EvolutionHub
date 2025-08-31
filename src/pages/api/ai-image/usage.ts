import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { AiImageService } from '@/lib/services/ai-image-service';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER, type OwnerType } from '@/config/ai-image';

function ensureGuestIdCookie(context: APIContext): string {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;

  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).toString();
  const url = new URL(context.request.url);
  context.cookies.set('guest_id', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 180 // 180 days
  });
  return id;
}

export const GET = withApiMiddleware(async (context) => {
  const { locals } = context;

  // Owner detection
  const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

  const env = locals.runtime?.env ?? {};
  const service = new AiImageService({
    R2_AI_IMAGES: env.R2_AI_IMAGES,
    KV_AI_ENHANCER: env.KV_AI_ENHANCER,
    REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
    ENVIRONMENT: env.ENVIRONMENT
  });

  try {
    const limit = ownerType === 'user' ? FREE_LIMIT_USER : FREE_LIMIT_GUEST;
    const usage = await service.getUsage(ownerType, ownerId, limit);

    return createApiSuccess({
      ownerType,
      usage,
      limits: {
        user: FREE_LIMIT_USER,
        guest: FREE_LIMIT_GUEST,
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    return createApiError('server_error', message);
  }
});

// 405 for unsupported methods
const methodNotAllowed = () => new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
  status: 405,
  headers: {
    'Content-Type': 'application/json',
    'Allow': 'GET'
  }
});
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
