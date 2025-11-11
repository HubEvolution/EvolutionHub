import type { APIContext } from 'astro';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';
import { VIDEO_RETENTION_DAYS } from '@/config/ai-video';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { aiJobsLimiter } from '@/lib/rate-limiter';
import { videoJobIdSchema } from '@/lib/validation';
import { formatZodError } from '@/lib/validation';

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
    maxAge: 60 * 60 * 24 * 180,
  });
  return id;
}

function extFromContentType(ct: string): string | null {
  if (!ct) return null;
  if (ct === 'video/mp4') return 'mp4';
  if (ct === 'video/quicktime') return 'mov';
  if (ct === 'video/webm') return 'webm';
  return null;
}

export const GET = withApiMiddleware(
  async (context: APIContext) => {
    const { locals, request, params } = context;
    const parsed = videoJobIdSchema.safeParse({ id: params?.id || '' });
    if (!parsed.success)
      return createApiError('validation_error', 'Invalid job id', {
        details: formatZodError(parsed.error),
      });
    const jobId = parsed.data.id;

    const env = (locals.runtime?.env ?? {}) as {
      REPLICATE_API_TOKEN?: string;
      R2_AI_IMAGES?: R2Bucket;
      KV_AI_ENHANCER?: KVNamespace;
      ENVIRONMENT?: string;
    };

    const token = env.REPLICATE_API_TOKEN;
    if (!token) return createApiError('server_error', 'Missing REPLICATE_API_TOKEN');
    const kv = env.KV_AI_ENHANCER;
    const bucket = env.R2_AI_IMAGES;
    if (!kv || !bucket) return createApiError('server_error', 'Storage not configured');

    // Ownership guard via KV metadata
    const metaRaw = await kv.get(`ai-video:job:${jobId}`);
    if (!metaRaw) return createApiError('not_found', 'Job not found');
    let meta: { ownerType: 'user' | 'guest'; ownerId: string; key: string; tier: '720p' | '1080p' };
    try {
      meta = JSON.parse(metaRaw) as {
        ownerType: 'user' | 'guest';
        ownerId: string;
        key: string;
        tier: '720p' | '1080p';
      };
    } catch {
      return createApiError('server_error', 'Corrupt job metadata');
    }

    const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
    const ownerId =
      ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);
    if (!(ownerType === meta.ownerType && ownerId === meta.ownerId)) {
      return createApiError('forbidden', 'Not authorized');
    }

    // Poll provider status
    const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!statusRes.ok) {
      const text = await statusRes.text();
      const type =
        statusRes.status === 401 || statusRes.status === 403
          ? 'forbidden'
          : statusRes.status >= 400 && statusRes.status < 500
            ? 'validation_error'
            : 'server_error';
      return createApiError(type, 'Provider error', { snippet: text.slice(0, 200) });
    }
    const pred = (await statusRes.json()) as { status: string; output?: unknown };

    // If succeeded, persist to R2 and return
    if (pred.status === 'succeeded') {
      const origin = new URL(request.url).origin;
      let outUrl: string | null = null;
      const out = pred.output as unknown;
      if (typeof out === 'string') outUrl = out;
      if (!outUrl && Array.isArray(out) && typeof out[0] === 'string') outUrl = out[0] as string;

      if (!outUrl) return createApiError('server_error', 'Provider response missing output');

      const binRes = await fetch(outUrl);
      if (!binRes.ok)
        return createApiError('server_error', `Failed to fetch output (${binRes.status})`);

      const ct = binRes.headers.get('content-type') || 'application/octet-stream';
      const buf = await binRes.arrayBuffer();
      const ext = extFromContentType(ct) || 'mp4';
      const resultKey = `ai-video/results/${ownerType}/${ownerId}/${Date.now()}.${ext}`;
      await bucket.put(resultKey, buf, {
        httpMetadata: { contentType: ct },
        customMetadata: {
          feature: 'ai-video',
          expiresAt: String(Date.now() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      // Optionally we could delete the meta or store resultKey for later; keep simple idempotent
      const url = `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(resultKey)}`;
      return createApiSuccess({ status: 'succeeded', output: { key: resultKey, url } });
    }

    if (pred.status === 'failed' || pred.status === 'canceled') {
      return createApiSuccess({ status: pred.status });
    }

    return createApiSuccess({ status: pred.status });
  },
  { rateLimiter: aiJobsLimiter, enforceCsrfToken: false }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
