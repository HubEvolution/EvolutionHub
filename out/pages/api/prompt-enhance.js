"use strict";
/**
 * API Route for Prompt Enhancer
 *
 * POST /api/prompt-enhance: Enhance raw text to structured prompt.
 * Integrates with PromptEnhancerService, applies middleware for rate-limiting, CSRF, logging.
 * No auth required (MVP), supports guest/user via cookie/locals.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAD = exports.OPTIONS = exports.DELETE = exports.PATCH = exports.PUT = exports.GET = exports.POST = void 0;
const api_middleware_1 = require("@/lib/api-middleware");
const prompt_enhancer_service_1 = require("@/lib/services/prompt-enhancer-service");
const rate_limiter_1 = require("@/lib/rate-limiter");
const prompt_attachments_1 = require("@/lib/services/prompt-attachments");
const validation_1 = require("@/lib/validation");
const prompt_1 = require("@/lib/validation/schemas/prompt");
const promptEnhanceLimiter = (0, rate_limiter_1.createRateLimiter)({
    maxRequests: 15,
    windowMs: 60 * 1000,
    name: 'promptEnhance',
});
function ensureGuestIdCookie(context) {
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
            maxAge: 60 * 60 * 24 * 180, // 180 days
        });
    }
    return guestId;
}
exports.POST = (0, api_middleware_1.withApiMiddleware)(async (context) => {
    const { locals, request } = context;
    const user = locals.user;
    // Parse body: prefer multipart/form-data for file uploads; fallback to JSON for legacy
    let input;
    let options = {};
    let attachments = null;
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
        const form = await request.formData();
        const textRaw = form.get('text');
        const modeRaw = form.get('mode');
        const normalizedMode = typeof modeRaw === 'string' ? modeRaw.trim() : undefined;
        const parsed = prompt_1.promptInputSchema.safeParse({
            text: typeof textRaw === 'string' ? textRaw.trim() : textRaw,
            mode: normalizedMode,
        });
        if (!parsed.success) {
            return (0, api_middleware_1.createApiError)('validation_error', 'Invalid form fields', {
                details: (0, validation_1.formatZodError)(parsed.error),
            });
        }
        const text = parsed.data.text;
        const files = [];
        for (const [key, val] of form.entries()) {
            if (key === 'files[]' && val instanceof File)
                files.push(val);
            if (key === 'file' && val instanceof File)
                files.push(val);
        }
        if (files.length > 0) {
            const valid = (0, prompt_attachments_1.validateFiles)(files);
            if (!valid.ok)
                return (0, api_middleware_1.createApiError)('validation_error', valid.reason || 'Invalid files');
            attachments = await (0, prompt_attachments_1.buildAttachmentContext)(files);
        }
        input = { text };
        const m = (parsed.data.mode ?? 'agent');
        const mNorm = m === 'concise' ? 'concise' : 'agent';
        options = {
            mode: mNorm,
            safety: true,
            includeScores: false,
            outputFormat: 'markdown',
        };
    }
    else {
        try {
            const bodyUnknown = await request.json();
            if (!bodyUnknown || typeof bodyUnknown !== 'object') {
                return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
            }
            const body = bodyUnknown;
            const directText = typeof body.text === 'string' ? body.text : undefined;
            const inputText = body.input && typeof body.input.text === 'string' ? body.input.text : directText;
            const optionsObj = body.options && typeof body.options === 'object'
                ? body.options
                : undefined;
            const legacyMode = typeof body.mode === 'string' ? body.mode : undefined;
            const normalized = {
                text: inputText,
                mode: typeof optionsObj?.mode === 'string' ? optionsObj.mode : legacyMode,
                safety: optionsObj?.safety,
                includeScores: optionsObj?.includeScores,
                outputFormat: optionsObj?.outputFormat,
            };
            const parsed = prompt_1.promptInputSchema.safeParse(normalized);
            if (!parsed.success) {
                return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body', {
                    details: (0, validation_1.formatZodError)(parsed.error),
                });
            }
            input = { text: parsed.data.text };
            const m2 = (parsed.data.mode ?? 'agent');
            const m2Norm = m2 === 'concise' ? 'concise' : 'agent';
            options = {
                mode: m2Norm,
                safety: parsed.data.safety !== false,
                includeScores: Boolean(parsed.data.includeScores),
                outputFormat: parsed.data.outputFormat ?? 'markdown',
            };
        }
        catch {
            return (0, api_middleware_1.createApiError)('validation_error', 'Invalid JSON body');
        }
    }
    // Owner detection
    const ownerType = user ? 'user' : 'guest';
    const ownerId = user?.id || ensureGuestIdCookie(context);
    // Init service with flag check
    const rawEnv = (locals.runtime?.env ?? {});
    const env = {
        KV_PROMPT_ENHANCER: rawEnv.KV_PROMPT_ENHANCER,
        ENVIRONMENT: typeof rawEnv.ENVIRONMENT === 'string' ? rawEnv.ENVIRONMENT : undefined,
        PUBLIC_PROMPT_ENHANCER_V1: typeof rawEnv.PUBLIC_PROMPT_ENHANCER_V1 === 'string'
            ? rawEnv.PUBLIC_PROMPT_ENHANCER_V1
            : undefined,
        OPENAI_API_KEY: typeof rawEnv.OPENAI_API_KEY === 'string' ? rawEnv.OPENAI_API_KEY : undefined,
        PROMPT_REWRITE_V1: typeof rawEnv.PROMPT_REWRITE_V1 === 'string' ? rawEnv.PROMPT_REWRITE_V1 : undefined,
        PROMPT_TEXT_MODEL: typeof rawEnv.PROMPT_TEXT_MODEL === 'string' ? rawEnv.PROMPT_TEXT_MODEL : undefined,
        PROMPT_VISION_MODEL: typeof rawEnv.PROMPT_VISION_MODEL === 'string' ? rawEnv.PROMPT_VISION_MODEL : undefined,
        PROMPT_OUTPUT_TOKENS_MAX: typeof rawEnv.PROMPT_OUTPUT_TOKENS_MAX === 'string'
            ? rawEnv.PROMPT_OUTPUT_TOKENS_MAX
            : undefined,
        PROMPT_TEMPERATURE: typeof rawEnv.PROMPT_TEMPERATURE === 'string' ? rawEnv.PROMPT_TEMPERATURE : undefined,
        PROMPT_TOP_P: typeof rawEnv.PROMPT_TOP_P === 'string' ? rawEnv.PROMPT_TOP_P : undefined,
        PROMPT_USER_LIMIT: typeof rawEnv.PROMPT_USER_LIMIT === 'string' ? rawEnv.PROMPT_USER_LIMIT : undefined,
        PROMPT_GUEST_LIMIT: typeof rawEnv.PROMPT_GUEST_LIMIT === 'string' ? rawEnv.PROMPT_GUEST_LIMIT : undefined,
        USAGE_KV_V2: typeof rawEnv.USAGE_KV_V2 === 'string' ? rawEnv.USAGE_KV_V2 : undefined,
    };
    if (env.PUBLIC_PROMPT_ENHANCER_V1 === 'false') {
        return (0, api_middleware_1.createApiError)('forbidden', 'Feature not enabled');
    }
    const service = new prompt_enhancer_service_1.PromptEnhancerService({
        KV_PROMPT_ENHANCER: env.KV_PROMPT_ENHANCER,
        ENVIRONMENT: env.ENVIRONMENT,
        PUBLIC_PROMPT_ENHANCER_V1: env.PUBLIC_PROMPT_ENHANCER_V1,
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        PROMPT_REWRITE_V1: env.PROMPT_REWRITE_V1,
        PROMPT_TEXT_MODEL: env.PROMPT_TEXT_MODEL,
        PROMPT_VISION_MODEL: env.PROMPT_VISION_MODEL,
        PROMPT_OUTPUT_TOKENS_MAX: env.PROMPT_OUTPUT_TOKENS_MAX,
        PROMPT_TEMPERATURE: env.PROMPT_TEMPERATURE,
        PROMPT_TOP_P: env.PROMPT_TOP_P,
        PROMPT_USER_LIMIT: env.PROMPT_USER_LIMIT,
        PROMPT_GUEST_LIMIT: env.PROMPT_GUEST_LIMIT,
        USAGE_KV_V2: env.USAGE_KV_V2,
    });
    try {
        const result = await service.enhance(input, options, ownerType, ownerId, attachments);
        // If LLM path used, we set outputFormat to 'plain' and store the full enhanced text in objective
        const p = result.enhanced;
        const enhancedString = p.outputFormat === 'plain'
            ? p.objective
            : (() => {
                try {
                    const sections = [];
                    sections.push(`# Role\n${p.role}`);
                    sections.push(`\n## Objective\n${p.objective}`);
                    sections.push(`\n## Constraints\n${p.constraints}`);
                    if (p.steps && p.steps.length)
                        sections.push(`\n## Steps\n- ${p.steps.join('\n- ')}`);
                    if (p.fewShotExamples && p.fewShotExamples.length)
                        sections.push(`\n## Examples\n- ${p.fewShotExamples.join('\n- ')}`);
                    sections.push(`\n## Original (sanitized)\n${p.rawText}`);
                    return sections.join('\n');
                }
                catch {
                    return JSON.stringify(result.enhanced);
                }
            })();
        return (0, api_middleware_1.createApiSuccess)({
            enhancedPrompt: enhancedString,
            safetyReport: result.safetyReport
                ? { score: 0, warnings: result.safetyReport.masked }
                : undefined,
            usage: result.usage,
            limits: {
                user: parseInt(String(rawEnv.PROMPT_USER_LIMIT || '20'), 10),
                guest: parseInt(String(rawEnv.PROMPT_GUEST_LIMIT || '5'), 10),
            },
        });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('quota exceeded')) {
            const typedErr = err;
            const detailsRecord = typedErr.details &&
                typeof typedErr.details === 'object' &&
                !Array.isArray(typedErr.details)
                ? typedErr.details
                : undefined;
            return (0, api_middleware_1.createApiError)('forbidden', err.message, detailsRecord); // preserve quota details
        }
        if (err instanceof Error && err.code === 'feature_disabled') {
            return (0, api_middleware_1.createApiError)('forbidden', err.message);
        }
        if (err instanceof Error && err.apiErrorType) {
            const type = err.apiErrorType ?? 'server_error';
            return (0, api_middleware_1.createApiError)(type, err.message);
        }
        return (0, api_middleware_1.createApiError)('server_error', err instanceof Error ? err.message : 'Unknown error');
    }
}, {
    rateLimiter: promptEnhanceLimiter,
    enforceCsrfToken: true,
    disableAutoLogging: false,
});
// 405 for other methods
const methodNotAllowed = () => (0, api_middleware_1.createMethodNotAllowed)('POST');
exports.GET = methodNotAllowed;
exports.PUT = methodNotAllowed;
exports.PATCH = methodNotAllowed;
exports.DELETE = methodNotAllowed;
exports.OPTIONS = methodNotAllowed;
exports.HEAD = methodNotAllowed;
