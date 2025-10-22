import type { APIRoute } from 'astro';
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

function ensureGuestIdCookie(context: Parameters<APIRoute>[0]): string {
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
  async (context) => {
    const { locals, request } = context;

    // FormData parsing
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
      const m = form.get('model');
      const s = form.get('scale');
      const fe = form.get('face_enhance');
      const pr = form.get('prompt');
      const npr = form.get('negative_prompt');
      const st = form.get('strength');
      const gd = form.get('guidance');
      const sp = form.get('steps');
      if (f instanceof File) imageFile = f;
      if (typeof m === 'string') modelSlug = m.trim();
      if (typeof s === 'string') {
        const n = Number(s);
        if (n === 2 || n === 4) scale = n;
      }
      if (typeof fe === 'string') {
        const v = fe.trim().toLowerCase();
        if (v === 'true' || v === '1' || v === 'on' || v === 'yes') faceEnhance = true;
        else if (v === 'false' || v === '0' || v === 'off' || v === 'no') faceEnhance = false;
      }
      if (typeof pr === 'string' && pr.trim()) prompt = pr.trim();
      if (typeof npr === 'string' && npr.trim()) negativePrompt = npr.trim();
      if (typeof st === 'string') {
        const n = Number(st);
        if (Number.isFinite(n)) strength = n;
      }
      if (typeof gd === 'string') {
        const n = Number(gd);
        if (Number.isFinite(n)) guidance = n;
      }
      if (typeof sp === 'string') {
        const n = Number(sp);
        if (Number.isInteger(n)) steps = n;
      }
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
    const env = locals.runtime?.env ?? {};
    const service = new AiImageService({
      R2_AI_IMAGES: env.R2_AI_IMAGES,
      KV_AI_ENHANCER: env.KV_AI_ENHANCER,
      REPLICATE_API_TOKEN: env.REPLICATE_API_TOKEN,
      ENVIRONMENT: env.ENVIRONMENT,
      AI: (env as any).AI,
      WORKERS_AI_ENABLED: (env as any).WORKERS_AI_ENABLED,
      TESTING_WORKERS_AI_ALLOW: (env as any).TESTING_WORKERS_AI_ALLOW,
      TESTING_ALLOWED_CF_MODELS: (env as any).TESTING_ALLOWED_CF_MODELS,
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
      const typed = (err as any)?.apiErrorType as
        | 'validation_error'
        | 'auth_error'
        | 'not_found'
        | 'rate_limit'
        | 'server_error'
        | 'db_error'
        | 'forbidden'
        | 'method_not_allowed'
        | undefined;
      if (typed) {
        return createApiError(typed, message);
      }
      if (typeof (err as any)?.code === 'string' && (err as any).code === 'quota_exceeded') {
        return createApiError(
          'forbidden',
          'Kostenloses Nutzungslimit erreicht',
          (err as any).details || undefined
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
