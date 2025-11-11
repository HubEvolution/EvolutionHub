import type { APIContext } from 'astro';
import type { R2Bucket } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import {
  ALLOWED_VIDEO_CONTENT_TYPES,
  MAX_UPLOAD_BYTES_TIER,
  AI_VIDEO_R2_PREFIX,
  type VideoTier,
} from '@/config/ai-video';
import { MAX_DURATION_SECONDS_TIER, VIDEO_RETENTION_DAYS } from '@/config/ai-video';
import { videoUploadSchema } from '@/lib/validation';
import { formatZodError } from '@/lib/validation';
import { aiJobsLimiter } from '@/lib/rate-limiter';

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

function extFromContentType(ct: string): string | null {
  if (!ct) return null;
  if (ct === 'video/mp4') return 'mp4';
  if (ct === 'video/quicktime') return 'mov';
  if (ct === 'video/webm') return 'webm';
  return null;
}

export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;

    let file: File | null = null;
    let tier: VideoTier | null = null;
    let durationMs: number | null = null;

    try {
      const form = await request.formData();
      const f = form.get('file');
      if (f instanceof File) file = f;
      const t = form.get('tier');
      if (typeof t === 'string' && (t === '720p' || t === '1080p')) tier = t as VideoTier;
      const d = form.get('durationMs');
      if (typeof d === 'string' || typeof d === 'number') durationMs = Number(d);
    } catch {
      return createApiError('validation_error', 'Ungültige Formulardaten');
    }

    if (!file)
      return createApiError('validation_error', 'Videodatei (field "file") ist erforderlich');
    if (!tier) return createApiError('validation_error', 'Tier (field "tier") ist erforderlich');
    const parsed = videoUploadSchema.safeParse({ tier, durationMs });
    if (!parsed.success)
      return createApiError('validation_error', 'Invalid form fields', {
        details: formatZodError(parsed.error),
      });

    const ct = file.type || '';
    if (!ALLOWED_VIDEO_CONTENT_TYPES.includes(ct as (typeof ALLOWED_VIDEO_CONTENT_TYPES)[number])) {
      return createApiError('validation_error', `Unsupported content type: ${ct || 'unknown'}`);
    }

    const maxBytes = MAX_UPLOAD_BYTES_TIER[tier];
    if (file.size > maxBytes) {
      return createApiError(
        'validation_error',
        `File too large for ${tier}. Max ${(maxBytes / (1024 * 1024)) | 0} MB`
      );
    }

    // Duration limit per tier (client-provided, validated by Zod coercion)
    const maxSec = MAX_DURATION_SECONDS_TIER[tier];
    const durationSeconds = Math.ceil((durationMs as number) / 1000);
    if (durationSeconds > maxSec) {
      return createApiError('validation_error', `Video too long for ${tier}. Max ${maxSec}s`);
    }

    const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
    const ownerId =
      ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);

    const env = (locals.runtime?.env ?? {}) as { R2_AI_IMAGES?: R2Bucket };
    const bucket = env.R2_AI_IMAGES;
    if (!bucket) return createApiError('server_error', 'R2 bucket not configured');

    const ext = extFromContentType(ct) || 'bin';
    const timestamp = Date.now();
    const baseKey = `${AI_VIDEO_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
    const key = `${baseKey}.${ext}`;

    const buf = await file.arrayBuffer();
    await bucket.put(key, buf, {
      httpMetadata: { contentType: ct },
      customMetadata: {
        feature: 'ai-video',
        expiresAt: String(Date.now() + VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    const origin = new URL(request.url).origin;
    const url = `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;

    return createApiSuccess({ key, url, size: file.size, contentType: ct });
  },
  { rateLimiter: aiJobsLimiter, enforceCsrfToken: true }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
