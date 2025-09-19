/**
 * API Route for Prompt Enhancer
 * 
 * POST /api/prompt-enhance: Enhance raw text to structured prompt.
 * Integrates with PromptEnhancerService, applies middleware for rate-limiting, CSRF, logging.
 * No auth required (MVP), supports guest/user via cookie/locals.
 */

import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiSuccess, createApiError, createMethodNotAllowed } from '@/lib/api-middleware';
import { PromptEnhancerService } from '@/lib/services/prompt-enhancer-service';
import { createRateLimiter } from '@/lib/rate-limiter';
import type { EnhanceInput, EnhanceOptions, EnhanceResult } from '@/lib/services/prompt-enhancer-service';

const promptEnhanceLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000,
  name: 'promptEnhance'
});

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
  const cookies = context.cookies;
  let guestId = cookies.get('guest_id')?.value;
  if (!guestId) {
    guestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const url = new URL(context.request.url);
    cookies.set('guestId', guestId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 180 // 180 days
    });
  }
  return guestId;
}

export const POST = withApiMiddleware(async (context) => {
  const { locals, request } = context;
  const user = locals.user;

  // Parse JSON
  let input: EnhanceInput;
  let options: EnhanceOptions = {};
  try {
    const bodyUnknown: unknown = await request.json();
    if (!bodyUnknown || typeof bodyUnknown !== 'object') {
      return createApiError('validation_error', 'Invalid JSON body');
    }
    const body = bodyUnknown as Record<string, any>;
    const inputText = body?.input?.text;
    input = { text: typeof inputText === 'string' ? inputText : undefined } as EnhanceInput;
    if (!input.text || typeof input.text !== 'string' || input.text.trim().length === 0) {
      return createApiError('validation_error', 'Input text is required');
    }
    const bodyOptions = (body?.options ?? {}) as Record<string, any>;
    options = {
      mode: typeof bodyOptions.mode === 'string' ? bodyOptions.mode : 'agent',
      safety: bodyOptions.safety !== false,
      includeScores: Boolean(bodyOptions.includeScores),
      outputFormat: typeof bodyOptions.outputFormat === 'string' ? bodyOptions.outputFormat : 'markdown'
    } as EnhanceOptions;
  } catch {
    return createApiError('validation_error', 'Invalid JSON body');
  }

  // Owner detection
  const ownerType = user ? 'user' : 'guest';
  const ownerId = user?.id || ensureGuestIdCookie(context);

  // Init service with flag check
  const env = (locals.runtime?.env as any) ?? {};
  if (env.PUBLIC_PROMPT_ENHANCER_V1 === 'false') {
    return createApiError('forbidden', 'Feature not enabled');
  }
  const service = new PromptEnhancerService({
    KV_PROMPT_ENHANCER: env.KV_PROMPT_ENHANCER,
    ENVIRONMENT: env.ENVIRONMENT,
    PUBLIC_PROMPT_ENHANCER_V1: env.PUBLIC_PROMPT_ENHANCER_V1,
    OPENAI_API_KEY: env.OPENAI_API_KEY
  });

  try {
    const result: EnhanceResult = await service.enhance(input, options, ownerType, ownerId);
    return createApiSuccess({
      enhanced: result.enhanced,
      safetyReport: result.safetyReport,
      scores: result.scores,
      usage: result.usage
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('quota exceeded')) {
      return createApiError('forbidden', err.message, (err as any).details);
    }
    if (err instanceof Error && (err as any).code === 'feature_disabled') {
      return createApiError('forbidden', err.message);
    }
    if (err instanceof Error && (err as any).apiErrorType === 'validation_error') {
      return createApiError('validation_error', err.message);
    }
    return createApiError('server_error', err instanceof Error ? err.message : 'Unknown error');
  }
}, { 
  rateLimiter: promptEnhanceLimiter,
  enforceCsrfToken: true,
  disableAutoLogging: false 
});

// 405 for other methods
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;