import type { APIContext } from 'astro';
import { AI_R2_PREFIX, type OwnerType } from '@/config/ai-image';

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
    maxAge: 60 * 60 * 24 * 180, // 180 days
  });
  return id;
}

/**
 * Proxy route for R2 AI Images bucket with owner gating for results
 * - Uploads under ai-enhancer/uploads/... are public (for provider fetches)
 * - Results under ai-enhancer/results/<ownerType>/<ownerId>/... are gated to the owner
 */
export async function GET(context: APIContext) {
  const { params, locals, request } = context;
  const key = String(params.path || '');

  const reqId = `R2AI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const envVal = String(locals.runtime?.env?.ENVIRONMENT || '').toLowerCase();
  const isDev = envVal === 'development' || envVal === 'dev' || envVal === '';

  if (isDev) {
    console.debug(`[R2Proxy][${reqId}] start`, { url: request.url, key });
  }

  try {
    const bucket = locals.runtime?.env?.R2_AI_IMAGES;
    if (!bucket) {
      if (isDev) console.error(`[R2Proxy][${reqId}] R2_AI_IMAGES bucket not available`);
      return new Response('R2 bucket not configured', { status: 500 });
    }

    // Basic prefix validation
    if (!key || !key.startsWith(`${AI_R2_PREFIX}/`)) {
      if (isDev)
        console.warn(`[R2Proxy][${reqId}] invalid prefix`, {
          key,
          expectedPrefix: `${AI_R2_PREFIX}/`,
        });
      return new Response('Not found', { status: 404 });
    }

    // Owner gating for results
    // Expected structures:
    //  - ai-enhancer/uploads/<ownerType>/<ownerId>/<file>
    //  - ai-enhancer/results/<ownerType>/<ownerId>/<file>
    const parts = key.split('/');
    const category = parts[1]; // 'uploads' | 'results'
    const pathOwnerType = parts[2] as OwnerType | undefined;
    const pathOwnerId = parts[3] as string | undefined;

    if (isDev) {
      console.debug(`[R2Proxy][${reqId}] parsed path`, { category, pathOwnerType, pathOwnerId });
    }

    if (category === 'results') {
      if (!pathOwnerType || !pathOwnerId) {
        return new Response('Not found', { status: 404 });
      }
      const currentOwnerType: OwnerType = locals.user?.id ? 'user' : 'guest';
      const currentOwnerId =
        currentOwnerType === 'user'
          ? (locals.user as { id: string }).id
          : ensureGuestIdCookie(context);
      const isOwner = currentOwnerType === pathOwnerType && currentOwnerId === pathOwnerId;
      if (isDev) {
        console.debug(`[R2Proxy][${reqId}] owner gate`, {
          currentOwnerType,
          currentOwnerId,
          isOwner,
        });
      }
      if (!isOwner) {
        if (isDev) console.warn(`[R2Proxy][${reqId}] forbidden for non-owner`);
        return new Response('Forbidden', { status: 403 });
      }
    }

    const object = await bucket.get(key);
    if (!object) {
      if (isDev) console.warn(`[R2Proxy][${reqId}] R2 object not found`, { key });
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }
    headers.set('ETag', object.httpEtag || '');

    if (category === 'results') {
      headers.set('Cache-Control', 'private, max-age=31536000, immutable');
    } else {
      // uploads: keep public so external providers can fetch
      headers.set('Cache-Control', 'public, max-age=900, immutable');
    }

    if (isDev) {
      console.debug(`[R2Proxy][${reqId}] serve`, {
        key,
        category,
        contentType: headers.get('Content-Type'),
        cacheControl: headers.get('Cache-Control'),
        etag: headers.get('ETag'),
      });
    }

    const buf = await object.arrayBuffer();
    return new Response(buf, { status: 200, headers });
  } catch (error) {
    if (isDev) console.error(`[R2Proxy][${reqId}] error`, error);
    return new Response('Internal server error', { status: 500 });
  }
}
