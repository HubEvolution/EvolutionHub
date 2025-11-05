"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const ai_jobs_service_1 = require("@/lib/services/ai-jobs-service");
const entitlements_1 = require("@/config/ai-image/entitlements");
function ensureGuestIdCookie(context) {
    const existing = context.cookies.get('guest_id')?.value;
    if (existing)
        return existing;
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
exports.POST = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { locals, request } = context;
    // FormData parsing
    let imageFile = null;
    let modelSlug = null;
    try {
        const form = await request.formData();
        const f = form.get('image');
        const m = form.get('model');
        if (f instanceof File)
            imageFile = f;
        if (typeof m === 'string')
            modelSlug = m.trim();
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Ungültige Formulardaten');
    }
    if (!imageFile) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Bilddatei (field "image") ist erforderlich');
    }
    if (!modelSlug) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Model (field "model") ist erforderlich');
    }
    // Owner detection
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
    const plan = ownerType === 'user'
        ? (locals.user?.plan ?? 'free')
        : undefined;
    const ent = (0, entitlements_1.getEntitlementsFor)(ownerType, plan);
    const effectiveLimit = ent.dailyBurstCap;
    const rawEnv = (locals.runtime?.env ?? {});
    const deps = {
        db: rawEnv.DB,
        isDevelopment: (rawEnv.ENVIRONMENT || '') !== 'production',
    };
    const service = new ai_jobs_service_1.AiJobsService(deps, {
        R2_AI_IMAGES: rawEnv.R2_AI_IMAGES,
        KV_AI_ENHANCER: rawEnv.KV_AI_ENHANCER,
        REPLICATE_API_TOKEN: rawEnv.REPLICATE_API_TOKEN,
        ENVIRONMENT: rawEnv.ENVIRONMENT,
    });
    const origin = new URL(request.url).origin;
    try {
        const job = await service.createJob({
            ownerType,
            ownerId,
            userId: ownerType === 'user' ? locals.user.id : null,
            modelSlug,
            file: imageFile,
            requestOrigin: origin,
            limitOverride: effectiveLimit,
            monthlyLimitOverride: ent.monthlyImages,
        });
        return (0, api_middleware_1.createApiSuccess)(job, 202);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        const e = err;
        if (typeof e?.code === 'string' && e.code === 'quota_exceeded') {
            return (0, api_middleware_1.createApiError)('forbidden', 'Kostenloses Nutzungslimit erreicht', e.details || undefined);
        }
        if (message.includes('Unsupported content type') ||
            message.includes('File too large') ||
            message.includes('Unsupported model') ||
            message.includes('Invalid file')) {
            return (0, api_middleware_1.createApiError)('validation_error', message);
        }
        return (0, api_middleware_1.createApiError)('server_error', message);
    }
}, { rateLimiter: rate_limiter_1.aiJobsLimiter, enforceCsrfToken: true });
// 405s (standardized error shape)
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
