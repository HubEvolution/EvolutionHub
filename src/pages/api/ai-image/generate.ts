import type { APIContext } from 'astro';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { AiImageService } from '@/lib/services/ai-image-service';
import { FREE_LIMIT_GUEST, FREE_LIMIT_USER, type OwnerType, type Plan } from '@/config/ai-image';
import { getEntitlementsFor } from '@/config/ai-image/entitlements';
import { aiGenerateLimiter } from '@/lib/rate-limiter';
import { formatZodError } from '@/lib/validation';
import { aiImageParamsSchema } from '@/lib/validation/schemas/ai-image';

type AiEnvBindings = {
  R2_AI_IMAGES?: R2Bucket;
  KV_AI_ENHANCER?: KVNamespace;
  REPLICATE_API_TOKEN?: string;
  ENVIRONMENT?: string;
  AI?: { run: (model: string, payload: Record<string, unknown>) => Promise<unknown> };
  WORKERS_AI_ENABLED?: string;
  TESTING_WORKERS_AI_ALLOW?: string;
  TESTING_ALLOWED_CF_MODELS?: string;
};

type MaybeTypedError = {
  apiErrorType?:
    | 'validation_error'
    | 'auth_error'
    | 'not_found'
    | 'rate_limit'
    | 'server_error'
    | 'db_error'
    | 'forbidden'
    | 'method_not_allowed';
  code?: string;
  details?: Record<string, unknown>;
};

function ensureGuestIdCookie(context: APIContext): string {
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

export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;

    // FormData parsing (file handled separately; other fields validated via Zod)
    let imageFile: File | null = null;
    let modelSlug: string | null = null;
    let scale: 2 | 4 | undefined;
    let faceEnhance: boolean | undefined;
    let prompt: string | undefined;
    let negativePrompt: string | undefined;
    let strength: number | undefined;
    let guidance: number | undefined;
    let steps: number | undefined;

    try {
      const form = await request.formData();
      const f = form.get('image');
      if (f instanceof File) imageFile = f;

      // Normalize optional numeric fields so that '', null or 'NaN' are treated as undefined
      const num = (v: FormDataEntryValue | null) => {
        if (v === null || typeof v === 'undefined') return undefined;
        const s = typeof v === 'string' ? v.trim() : String(v);
        if (s === '' || s.toLowerCase() === 'nan') return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
      };

      const parsed = aiImageParamsSchema.safeParse({
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
        return createApiError('validation_error', 'Invalid parameters', {
          details: formatZodError(parsed.error),
        });
      }
      const data = parsed.data;
      modelSlug = data.model;
      // cast is safe due to schema refine
      scale = data.scale as 2 | 4 | undefined;
      faceEnhance = data.face_enhance;
      prompt = data.prompt;
      negativePrompt = data.negative_prompt;
      strength = data.strength;
      guidance = data.guidance;
      steps = data.steps;
    } catch (_e) {
      return createApiError('validation_error', 'Ungültige Formulardaten');
    }

    if (!imageFile) {
      return createApiError('validation_error', 'Bilddatei (field "image") ist erforderlich');
    }
    if (!modelSlug) {
      return createApiError('validation_error', 'Model (field "model") ist erforderlich');
    }

    // Owner detection: user or guest
    const ownerType: OwnerType = locals.user?.id ? 'user' : 'guest';
    const ownerId =
      ownerType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);
    const plan =
      ownerType === 'user'
        ? (((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan)
        : undefined;
    const ent = getEntitlementsFor(ownerType, plan);
    const effectiveLimit = ent.dailyBurstCap;

    // Init service with runtime env
    const env = (locals.runtime?.env ?? {}) as AiEnvBindings;
    const service = new AiImageService({
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
      return createApiSuccess({
        model: result.model,
        imageUrl: result.imageUrl,
        originalUrl: result.originalUrl,
        usage: result.usage,
        limits: {
          user: FREE_LIMIT_USER,
          guest: FREE_LIMIT_GUEST,
        },
        // expose plan entitlements so the UI can render upgrade hints if desired
        entitlements: ent,
        // optional charge breakdown for UI visibility and billing reconciliation
        charge: result.charge ?? undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      // Prefer typed errors coming from services (e.g., provider mapping)
      const e = err as MaybeTypedError;
      if (e.apiErrorType) {
        return createApiError(e.apiErrorType, message);
      }
      if (typeof e.code === 'string' && e.code === 'quota_exceeded') {
        return createApiError(
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
        return createApiError('validation_error', message);
      }
      return createApiError('server_error', message);
    }
  },
  { rateLimiter: aiGenerateLimiter, enforceCsrfToken: true }
);

// Explicit 405 for unsupported methods (standardized error shape)
const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
