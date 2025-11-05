"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const rate_limiter_1 = require("@/lib/rate-limiter");
const ai_video_1 = require("@/lib/validation/schemas/ai-video");
const ai_video_2 = require("@/config/ai-video");
const usage_1 = require("@/lib/kv/usage");
const entitlements_1 = require("@/config/ai-video/entitlements");
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
exports.POST = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { locals, request } = context;
    let payload;
    try {
        payload = await request.json();
    }
    catch {
        return (0, api_middleware_1.createApiError)('validation_error', 'Ungültiger JSON-Body');
    }
    const parsed = ai_video_1.videoGenerateSchema.safeParse(payload);
    if (!parsed.success) {
        return (0, api_middleware_1.createApiError)('validation_error', 'Invalid parameters');
    }
    const { key, tier } = parsed.data;
    const env = (locals.runtime?.env ?? {});
    const token = env.REPLICATE_API_TOKEN;
    if (!token)
        return (0, api_middleware_1.createApiError)('server_error', 'Missing REPLICATE_API_TOKEN');
    const origin = new URL(request.url).origin;
    const inputUrl = `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
    // If user, pre-check credits before starting provider job
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? locals.user.id : undefined;
    const kv = env.KV_AI_ENHANCER;
    const neededCredits = ai_video_2.TIER_CREDITS[tier];
    const neededTenths = Math.round(neededCredits * 10);
    // Determine charging path for users before starting provider job
    let chargePath = null;
    let ym = null;
    let entTenths = 0;
    if (ownerType === 'user') {
        if (!kv || !ownerId)
            return (0, api_middleware_1.createApiError)('server_error', 'Storage not configured');
        const balTenths = await (0, usage_1.getCreditsBalanceTenths)(kv, ownerId);
        if (balTenths >= neededTenths) {
            chargePath = 'credits';
        }
        else {
            const plan = (locals.user?.plan ?? 'free');
            const ent = (0, entitlements_1.getVideoEntitlementsFor)('user', plan);
            entTenths = ent.monthlyCreditsTenths;
            const now = new Date();
            ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
            const remaining = await (0, usage_1.getVideoMonthlyQuotaRemainingTenths)(kv, ownerId, entTenths, ym);
            if (remaining >= neededTenths) {
                chargePath = 'quota';
            }
            else {
                // No credits and no remaining quota
                return (0, api_middleware_1.createApiError)('validation_error', 'insufficient_quota');
            }
        }
    }
    // Resolve latest model version for topazlabs/video-upscale
    let versionId = null;
    try {
        const metaRes = await fetch('https://api.replicate.com/v1/models/topazlabs/video-upscale', {
            headers: { Authorization: `Token ${token}` },
        });
        if (metaRes.ok) {
            const meta = (await metaRes.json());
            versionId = meta?.latest_version?.id || meta?.versions?.[0]?.id || null;
        }
    }
    catch { }
    if (!versionId)
        return (0, api_middleware_1.createApiError)('server_error', 'Provider metadata unavailable');
    // Attempt to start prediction. Input fields are subject to provider spec; we use common field names.
    const predUrl = 'https://api.replicate.com/v1/predictions';
    const predBody = {
        version: versionId,
        input: {
            video: inputUrl,
            output_resolution: tier,
        },
    };
    const startRes = await fetch(predUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify(predBody),
    });
    if (!startRes.ok) {
        const text = await startRes.text();
        const type = startRes.status === 401 || startRes.status === 403
            ? 'forbidden'
            : startRes.status >= 400 && startRes.status < 500
                ? 'validation_error'
                : 'server_error';
        return (0, api_middleware_1.createApiError)(type, 'Provider error', { snippet: text.slice(0, 200) });
    }
    const data = (await startRes.json());
    // Persist minimal job metadata for later ownership + result persistence
    try {
        const oType = ownerType;
        const oId = oType === 'user' ? locals.user.id : ensureGuestIdCookie(context);
        if (env.KV_AI_ENHANCER) {
            const meta = {
                ownerType: oType,
                ownerId: oId,
                key,
                tier,
                createdAt: Date.now(),
            };
            await env.KV_AI_ENHANCER.put(`ai-video:job:${data.id}`, JSON.stringify(meta), {
                expirationTtl: 60 * 60 * 24,
            });
        }
    }
    catch { }
    // If user, apply chosen charge path idempotently tied to job id and return charge info
    if (ownerType === 'user' && kv && ownerId) {
        if (chargePath === 'credits') {
            try {
                await (0, usage_1.consumeCreditsTenths)(kv, ownerId, neededTenths, `ai-video:${data.id}`);
                const remainingTenths = await (0, usage_1.getCreditsBalanceTenths)(kv, ownerId);
                return (0, api_middleware_1.createApiSuccess)({
                    jobId: data.id,
                    status: data.status,
                    charge: { credits: neededCredits, balance: Math.floor(remainingTenths / 10) },
                });
            }
            catch {
                return (0, api_middleware_1.createApiError)('validation_error', 'insufficient_credits');
            }
        }
        if (chargePath === 'quota') {
            try {
                const ym2 = ym ||
                    (() => {
                        const d = new Date();
                        return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                    })();
                await (0, usage_1.consumeVideoMonthlyQuotaTenths)(kv, ownerId, entTenths, neededTenths, ym2, `ai-video:${data.id}`);
                return (0, api_middleware_1.createApiSuccess)({
                    jobId: data.id,
                    status: data.status,
                    charge: { credits: 0, quota: true },
                });
            }
            catch {
                return (0, api_middleware_1.createApiError)('validation_error', 'insufficient_quota');
            }
        }
    }
    return (0, api_middleware_1.createApiSuccess)({ jobId: data.id, status: data.status });
}, { rateLimiter: rate_limiter_1.aiJobsLimiter, enforceCsrfToken: true });
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
