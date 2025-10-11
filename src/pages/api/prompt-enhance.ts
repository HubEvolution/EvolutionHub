/**
 * API Route for Prompt Enhancer
 *
 * POST /api/prompt-enhance: Enhance raw text to structured prompt.
 * Integrates with PromptEnhancerService, applies middleware for rate-limiting, CSRF, logging.
 * No auth required (MVP), supports guest/user via cookie/locals.
 */

import type { APIRoute } from 'astro';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER } from '@/config/ai-image';
import { PromptEnhancerService } from '@/lib/services/prompt-enhancer-service';
import { createRateLimiter } from '@/lib/rate-limiter';
import type {
  EnhanceInput,
  EnhanceOptions,
  EnhanceResult,
} from '@/lib/services/prompt-enhancer-service';
import { validateFiles, buildAttachmentContext } from '@/lib/services/prompt-attachments';

interface PromptEnhancerEnv {
  KV_PROMPT_ENHANCER?: KVNamespace;
  ENVIRONMENT?: string;
  PUBLIC_PROMPT_ENHANCER_V1?: string;
  OPENAI_API_KEY?: string;
  PROMPT_REWRITE_V1?: string;
  PROMPT_TEXT_MODEL?: string;
  PROMPT_VISION_MODEL?: string;
  PROMPT_OUTPUT_TOKENS_MAX?: string;
  PROMPT_TEMPERATURE?: string;
  PROMPT_TOP_P?: string;
}

interface JsonPromptRequest {
  text?: unknown;
  input?: { text?: unknown };
  options?: Partial<EnhanceOptions> & Record<string, unknown>;
  mode?: unknown;
}

interface PromptEnhancerResultError extends Error {
  apiErrorType?: 'forbidden' | 'validation_error' | 'server_error';
  code?: string;
  details?: unknown;
}

const promptEnhanceLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000,
  name: 'promptEnhance',
});

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
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

export const POST = withApiMiddleware(
  async (context) => {
    const { locals, request } = context;
    const user = locals.user;

    // Parse body: prefer multipart/form-data for file uploads; fallback to JSON for legacy
    let input: EnhanceInput;
    let options: EnhanceOptions = {};
    let attachments: import('@/config/prompt-enhancer').AttachmentContext | null = null;
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      const form = await request.formData();
      const text = String(form.get('text') || '').trim();
      if (!text) return createApiError('validation_error', 'Input text is required');
      const modeRaw = String(form.get('mode') || 'agent');
      const files: File[] = [];
      for (const [key, val] of form.entries()) {
        if (key === 'files[]' && val instanceof File) files.push(val);
        if (key === 'file' && val instanceof File) files.push(val);
      }
      if (files.length > 0) {
        const valid = validateFiles(files);
        if (!valid.ok) return createApiError('validation_error', valid.reason || 'Invalid files');
        attachments = await buildAttachmentContext(files);
      }
      input = { text };
      options = {
        mode: modeRaw === 'concise' ? 'concise' : 'agent',
        safety: true,
        includeScores: false,
        outputFormat: 'markdown',
      };
    } else {
      try {
        const bodyUnknown: unknown = await request.json();
        if (!bodyUnknown || typeof bodyUnknown !== 'object') {
          return createApiError('validation_error', 'Invalid JSON body');
        }
        const body = bodyUnknown as JsonPromptRequest;
        const directText = typeof body.text === 'string' ? body.text : undefined;
        const inputText =
          body.input && typeof body.input.text === 'string' ? body.input.text : directText;
        input = { text: inputText } as EnhanceInput;
        if (!input.text || typeof input.text !== 'string' || input.text.trim().length === 0) {
          return createApiError('validation_error', 'Input text is required');
        }
        const bodyOptions = body.options ?? {};
        const legacyMode = typeof body.mode === 'string' ? body.mode : undefined;
        options = {
          mode:
            bodyOptions.mode && typeof bodyOptions.mode === 'string'
              ? bodyOptions.mode
              : legacyMode || 'agent',
          safety: bodyOptions.safety !== false,
          includeScores: Boolean(bodyOptions.includeScores),
          outputFormat:
            typeof bodyOptions.outputFormat === 'string' ? bodyOptions.outputFormat : 'markdown',
        } as EnhanceOptions;
      } catch {
        return createApiError('validation_error', 'Invalid JSON body');
      }
    }

    // Owner detection
    const ownerType = user ? 'user' : 'guest';
    const ownerId = user?.id || ensureGuestIdCookie(context);

    // Init service with flag check
    const rawEnv = (locals.runtime?.env ?? {}) as Record<string, unknown>;
    const env: PromptEnhancerEnv = {
      KV_PROMPT_ENHANCER: rawEnv.KV_PROMPT_ENHANCER as KVNamespace | undefined,
      ENVIRONMENT: typeof rawEnv.ENVIRONMENT === 'string' ? rawEnv.ENVIRONMENT : undefined,
      PUBLIC_PROMPT_ENHANCER_V1:
        typeof rawEnv.PUBLIC_PROMPT_ENHANCER_V1 === 'string'
          ? rawEnv.PUBLIC_PROMPT_ENHANCER_V1
          : undefined,
      OPENAI_API_KEY: typeof rawEnv.OPENAI_API_KEY === 'string' ? rawEnv.OPENAI_API_KEY : undefined,
      PROMPT_REWRITE_V1:
        typeof rawEnv.PROMPT_REWRITE_V1 === 'string' ? rawEnv.PROMPT_REWRITE_V1 : undefined,
      PROMPT_TEXT_MODEL:
        typeof rawEnv.PROMPT_TEXT_MODEL === 'string' ? rawEnv.PROMPT_TEXT_MODEL : undefined,
      PROMPT_VISION_MODEL:
        typeof rawEnv.PROMPT_VISION_MODEL === 'string' ? rawEnv.PROMPT_VISION_MODEL : undefined,
      PROMPT_OUTPUT_TOKENS_MAX:
        typeof rawEnv.PROMPT_OUTPUT_TOKENS_MAX === 'string'
          ? rawEnv.PROMPT_OUTPUT_TOKENS_MAX
          : undefined,
      PROMPT_TEMPERATURE:
        typeof rawEnv.PROMPT_TEMPERATURE === 'string' ? rawEnv.PROMPT_TEMPERATURE : undefined,
      PROMPT_TOP_P: typeof rawEnv.PROMPT_TOP_P === 'string' ? rawEnv.PROMPT_TOP_P : undefined,
    };
    if (env.PUBLIC_PROMPT_ENHANCER_V1 === 'false') {
      return createApiError('forbidden', 'Feature not enabled');
    }
    const service = new PromptEnhancerService({
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
    });

    try {
      const result: EnhanceResult = await service.enhance(
        input,
        options,
        ownerType,
        ownerId,
        attachments
      );
      // If LLM path used, we set outputFormat to 'plain' and store the full enhanced text in objective
      const p = result.enhanced;
      const enhancedString =
        p.outputFormat === 'plain'
          ? p.objective
          : (() => {
              try {
                const sections: string[] = [];
                sections.push(`# Role\n${p.role}`);
                sections.push(`\n## Objective\n${p.objective}`);
                sections.push(`\n## Constraints\n${p.constraints}`);
                if (p.steps && p.steps.length)
                  sections.push(`\n## Steps\n- ${p.steps.join('\n- ')}`);
                if (p.fewShotExamples && p.fewShotExamples.length)
                  sections.push(`\n## Examples\n- ${p.fewShotExamples.join('\n- ')}`);
                sections.push(`\n## Original (sanitized)\n${p.rawText}`);
                return sections.join('\n');
              } catch {
                return JSON.stringify(result.enhanced);
              }
            })();

      return createApiSuccess({
        enhancedPrompt: enhancedString,
        safetyReport: result.safetyReport
          ? { score: 0, warnings: result.safetyReport.masked }
          : undefined,
        usage: result.usage,
        limits: { user: FREE_LIMIT_USER, guest: FREE_LIMIT_GUEST },
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('quota exceeded')) {
        const typedErr = err as PromptEnhancerResultError;
        const detailsRecord =
          typedErr.details &&
          typeof typedErr.details === 'object' &&
          !Array.isArray(typedErr.details)
            ? (typedErr.details as Record<string, unknown>)
            : undefined;
        return createApiError('forbidden', err.message, detailsRecord); // preserve quota details
      }
      if (err instanceof Error && (err as PromptEnhancerResultError).code === 'feature_disabled') {
        return createApiError('forbidden', err.message);
      }
      if (err instanceof Error && (err as PromptEnhancerResultError).apiErrorType) {
        const type = (err as PromptEnhancerResultError).apiErrorType ?? 'server_error';
        return createApiError(type, err.message);
      }
      return createApiError('server_error', err instanceof Error ? err.message : 'Unknown error');
    }
  },
  {
    rateLimiter: promptEnhanceLimiter,
    enforceCsrfToken: true,
    disableAutoLogging: false,
  }
);

// 405 for other methods
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
