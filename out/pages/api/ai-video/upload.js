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
const ai_video_1 = require('@/config/ai-video');
const ai_video_2 = require('@/config/ai-video');
const ai_video_3 = require('@/lib/validation/schemas/ai-video');
const rate_limiter_1 = require('@/lib/rate-limiter');
function ensureGuestIdCookie(context) {
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
function extFromContentType(ct) {
  if (!ct) return null;
  if (ct === 'video/mp4') return 'mp4';
  if (ct === 'video/quicktime') return 'mov';
  if (ct === 'video/webm') return 'webm';
  return null;
}
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { locals, request } = context;
    let file = null;
    let tier = null;
    let durationMs = null;
    try {
      const form = await request.formData();
      const f = form.get('file');
      if (f instanceof File) file = f;
      const t = form.get('tier');
      if (typeof t === 'string' && (t === '720p' || t === '1080p')) tier = t;
      const d = form.get('durationMs');
      if (typeof d === 'string' || typeof d === 'number') durationMs = Number(d);
    } catch {
      return (0, api_middleware_1.createApiError)('validation_error', 'Ungültige Formulardaten');
    }
    if (!file)
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Videodatei (field "file") ist erforderlich'
      );
    if (!tier)
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Tier (field "tier") ist erforderlich'
      );
    const parsed = ai_video_3.videoUploadSchema.safeParse({ tier, durationMs });
    if (!parsed.success)
      return (0, api_middleware_1.createApiError)('validation_error', 'Invalid form fields');
    const ct = file.type || '';
    if (!ai_video_1.ALLOWED_VIDEO_CONTENT_TYPES.includes(ct)) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        `Unsupported content type: ${ct || 'unknown'}`
      );
    }
    const maxBytes = ai_video_1.MAX_UPLOAD_BYTES_TIER[tier];
    if (file.size > maxBytes) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        `File too large for ${tier}. Max ${(maxBytes / (1024 * 1024)) | 0} MB`
      );
    }
    // Duration limit per tier (client-provided, validated by Zod coercion)
    const maxSec = ai_video_2.MAX_DURATION_SECONDS_TIER[tier];
    const durationSeconds = Math.ceil(durationMs / 1000);
    if (durationSeconds > maxSec) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        `Video too long for ${tier}. Max ${maxSec}s`
      );
    }
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
    const env = locals.runtime?.env ?? {};
    const bucket = env.R2_AI_IMAGES;
    if (!bucket)
      return (0, api_middleware_1.createApiError)('server_error', 'R2 bucket not configured');
    const ext = extFromContentType(ct) || 'bin';
    const timestamp = Date.now();
    const baseKey = `${ai_video_1.AI_VIDEO_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
    const key = `${baseKey}.${ext}`;
    const buf = await file.arrayBuffer();
    await bucket.put(key, buf, {
      httpMetadata: { contentType: ct },
      customMetadata: {
        feature: 'ai-video',
        expiresAt: String(Date.now() + ai_video_2.VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    const origin = new URL(request.url).origin;
    const url = `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
    return (0, api_middleware_1.createApiSuccess)({ key, url, size: file.size, contentType: ct });
  },
  { rateLimiter: rate_limiter_1.aiJobsLimiter, enforceCsrfToken: true }
);
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
