"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.POST = exports.GET = void 0;
const ai_video_1 = require("@/config/ai-video");
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const ai_video_2 = require("@/lib/validation/schemas/ai-video");
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
        maxAge: 60 * 60 * 24 * 180,
    });
    return id;
}
function extFromContentType(ct) {
    if (!ct)
        return null;
    if (ct === 'video/mp4')
        return 'mp4';
    if (ct === 'video/quicktime')
        return 'mov';
    if (ct === 'video/webm')
        return 'webm';
    return null;
}
exports.GET = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { locals, request, params } = context;
    const parsed = ai_video_2.videoJobIdSchema.safeParse({ id: params?.id || '' });
    if (!parsed.success)
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid job id');
    const jobId = parsed.data.id;
    const env = (locals.runtime?.env ?? {});
    const token = env.REPLICATE_API_TOKEN;
    if (!token)
        return (0, api_middleware_1.createApiError)('server_error', 'Missing REPLICATE_API_TOKEN');
    const kv = env.KV_AI_ENHANCER;
    const bucket = env.R2_AI_IMAGES;
    if (!kv || !bucket)
        return (0, api_middleware_1.createApiError)('server_error', 'Storage not configured');
    // Ownership guard via KV metadata
    const metaRaw = await kv.get(`ai-video:job:${jobId}`);
    if (!metaRaw)
        return (0, api_middleware_1.createApiError)('not_found', 'Job not found');
    let meta;
    try {
        meta = JSON.parse(metaRaw);
    }
    catch {
        return (0, api_middleware_1.createApiError)('server_error', 'Corrupt job metadata');
    }
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
    if (!(ownerType === meta.ownerType && ownerId === meta.ownerId)) {
        return (0, api_middleware_1.createApiError)('forbidden', 'Not authorized');
    }
    // Poll provider status
    const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
        headers: { Authorization: `Token ${token}` },
    });
    if (!statusRes.ok) {
        const text = await statusRes.text();
        const type = statusRes.status === 401 || statusRes.status === 403
            ? 'forbidden'
            : statusRes.status >= 400 && statusRes.status < 500
                ? 'validation_error'
                : 'server_error';
        return (0, api_middleware_1.createApiError)(type, 'Provider error', { snippet: text.slice(0, 200) });
    }
    const pred = (await statusRes.json());
    // If succeeded, persist to R2 and return
    if (pred.status === 'succeeded') {
        const origin = new URL(request.url).origin;
        let outUrl = null;
        const out = pred.output;
        if (typeof out === 'string')
            outUrl = out;
        if (!outUrl && Array.isArray(out) && typeof out[0] === 'string')
            outUrl = out[0];
        if (!outUrl)
            return (0, api_middleware_1.createApiError)('server_error', 'Provider response missing output');
        const binRes = await fetch(outUrl);
        if (!binRes.ok)
            return (0, api_middleware_1.createApiError)('server_error', `Failed to fetch output (${binRes.status})`);
        const ct = binRes.headers.get('content-type') || 'application/octet-stream';
        const buf = await binRes.arrayBuffer();
        const ext = extFromContentType(ct) || 'mp4';
        const resultKey = `ai-video/results/${ownerType}/${ownerId}/${Date.now()}.${ext}`;
        await bucket.put(resultKey, buf, {
            httpMetadata: { contentType: ct },
            customMetadata: {
                feature: 'ai-video',
                expiresAt: String(Date.now() + ai_video_1.VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000),
            },
        });
        // Optionally we could delete the meta or store resultKey for later; keep simple idempotent
        const url = `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(resultKey)}`;
        return (0, api_middleware_1.createApiSuccess)({ status: 'succeeded', output: { key: resultKey, url } });
    }
    if (pred.status === 'failed' || pred.status === 'canceled') {
        return (0, api_middleware_1.createApiSuccess)({ status: pred.status });
    }
    return (0, api_middleware_1.createApiSuccess)({ status: pred.status });
}, { rateLimiter: rate_limiter_1.aiJobsLimiter, enforceCsrfToken: false });
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('GET');
exports.POST = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
