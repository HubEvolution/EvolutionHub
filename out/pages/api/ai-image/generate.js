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
const ai_image_service_1 = require('@/lib/services/ai-image-service');
const ai_image_1 = require('@/config/ai-image');
const entitlements_1 = require('@/config/ai-image/entitlements');
const rate_limiter_1 = require('@/lib/rate-limiter');
const validation_1 = require('@/lib/validation');
const ai_image_2 = require('@/lib/validation/schemas/ai-image');
function ensureGuestIdCookie(context) {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;
  // Generate a stable guest ID
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
exports.POST = (0, api_middleware_1.withApiMiddleware)(
  async (context) => {
    const { locals, request } = context;
    // FormData parsing (file handled separately; other fields validated via Zod)
    let imageFile = null;
    let modelSlug = null;
    let scale;
    let faceEnhance;
    let prompt;
    let negativePrompt;
    let strength;
    let guidance;
    let steps;
    try {
      const form = await request.formData();
      const f = form.get('image');
      if (f instanceof File) imageFile = f;
      // Normalize optional numeric fields so that '', null or 'NaN' are treated as undefined
      const num = (v) => {
        if (v === null || typeof v === 'undefined') return undefined;
        const s = typeof v === 'string' ? v.trim() : String(v);
        if (s === '' || s.toLowerCase() === 'nan') return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
      };
      const parsed = ai_image_2.aiImageParamsSchema.safeParse({
        model: form.get('model'),
        scale: num(form.get('scale')),
        face_enhance: form.get('face_enhance'),
        prompt: form.get('prompt'),
        negative_prompt: form.get('negative_prompt'),
        strength: num(form.get('strength')),
        guidance: num(form.get('guidance')),
        steps: num(form.get('steps')),
      });
      if (!parsed.success) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid parameters', {
          details: (0, validation_1.formatZodError)(parsed.error),
        });
      }
      const data = parsed.data;
      modelSlug = data.model;
      // cast is safe due to schema refine
      scale = data.scale;
      faceEnhance = data.face_enhance;
      prompt = data.prompt;
      negativePrompt = data.negative_prompt;
      strength = data.strength;
      guidance = data.guidance;
      steps = data.steps;
    } catch (_e) {
      return (0, api_middleware_1.createApiError)('validation_error', 'Ungültige Formulardaten');
    }
    if (!imageFile) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Bilddatei (field "image") ist erforderlich'
      );
    }
    if (!modelSlug) {
      return (0, api_middleware_1.createApiError)(
        'validation_error',
        'Model (field "model") ist erforderlich'
      );
    }
    // Owner detection: user or guest
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
    const plan = ownerType === 'user' ? (locals.user?.plan ?? 'free') : undefined;
    const ent = (0, entitlements_1.getEntitlementsFor)(ownerType, plan);
    const effectiveLimit = ent.dailyBurstCap;
    // Init service with runtime env
    const env = locals.runtime?.env ?? {};
    const service = new ai_image_service_1.AiImageService({
      R2_AI_IMAGES: env.R2_AI_IMAGES,
      KV_AI_ENHANCER: env.KV_AI_ENHANCER,
      REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
      ENVIRONMENT: env.ENVIRONMENT,
      AI: env.AI,
      WORKERS_AI_ENABLED: env.WORKERS_AI_ENABLED,
      TESTING_WORKERS_AI_ALLOW: env.TESTING_WORKERS_AI_ALLOW,
      TESTING_ALLOWED_CF_MODELS: env.TESTING_ALLOWED_CF_MODELS,
    });
    const origin = new URL(request.url).origin;
    try {
      const result = await service.generate({
        ownerType,
        ownerId,
        modelSlug,
        file: imageFile,
        requestOrigin: origin,
        scale,
        faceEnhance,
        prompt,
        negativePrompt,
        strength,
        guidance,
        steps,
        limitOverride: effectiveLimit,
        monthlyLimitOverride: ent.monthlyImages,
        maxUpscaleOverride: ent.maxUpscale,
        allowFaceEnhanceOverride: ent.faceEnhance,
      });
      // Standard success shape
      return (0, api_middleware_1.createApiSuccess)({
        model: result.model,
        imageUrl: result.imageUrl,
        originalUrl: result.originalUrl,
        usage: result.usage,
        limits: {
          user: ai_image_1.FREE_LIMIT_USER,
          guest: ai_image_1.FREE_LIMIT_GUEST,
        },
        // expose plan entitlements so the UI can render upgrade hints if desired
        entitlements: ent,
        // optional charge breakdown for UI visibility and billing reconciliation
        charge: result.charge ?? undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      // Prefer typed errors coming from services (e.g., provider mapping)
      const e = err;
      if (e.apiErrorType) {
        return (0, api_middleware_1.createApiError)(e.apiErrorType, message);
      }
      if (typeof e.code === 'string' && e.code === 'quota_exceeded') {
        return (0, api_middleware_1.createApiError)(
          'forbidden',
          'Kostenloses Nutzungslimit erreicht',
          e.details || undefined
        );
      }
      // Map common validation failures
      if (
        message.includes('Unsupported content type') ||
        message.includes('File too large') ||
        message.includes('Unsupported model') ||
        message.includes('Invalid file') ||
        message.includes("Unsupported parameter 'scale'") ||
        message.includes("Unsupported parameter 'face_enhance'") ||
        message.includes("Unsupported value for 'scale'")
      ) {
        return (0, api_middleware_1.createApiError)('validation_error', message);
      }
      return (0, api_middleware_1.createApiError)('server_error', message);
    }
  },
  { rateLimiter: rate_limiter_1.aiGenerateLimiter, enforceCsrfToken: true }
);
// Explicit 405 for unsupported methods (standardized error shape)
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
