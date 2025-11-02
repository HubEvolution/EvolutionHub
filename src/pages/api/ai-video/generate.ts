import type { APIContext } from 'astro';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { aiJobsLimiter } from '@/lib/rate-limiter';
import { videoGenerateSchema } from '@/lib/validation/schemas/ai-video';
import { TIER_CREDITS } from '@/config/ai-video';
import {
  getCreditsBalanceTenths,
  consumeCreditsTenths,
  getVideoMonthlyQuotaRemainingTenths,
  consumeVideoMonthlyQuotaTenths,
} from '@/lib/kv/usage';
import type { Plan } from '@/config/ai-image/entitlements';
import { getVideoEntitlementsFor } from '@/config/ai-video/entitlements';

function ensureGuestIdCookie(context: APIContext): string {
  const existing = context.cookies.get('guest_id')?.value;
  if (existing) return existing;
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

export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { locals, request } = context;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return createApiError('validation_error', 'Ungültiger JSON-Body');
    }
    const parsed = videoGenerateSchema.safeParse(payload);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid parameters');
    }

    const { key, tier } = parsed.data;
    const env = (locals.runtime?.env ?? {}) as {
      REPLICATE_API_TOKEN?: string;
      R2_AI_IMAGES?: R2Bucket;
      KV_AI_ENHANCER?: KVNamespace;
      ENVIRONMENT?: string;
    };

    const token = env.REPLICATE_API_TOKEN;
    if (!token) return createApiError('server_error', 'Missing REPLICATE_API_TOKEN');

    const origin = new URL(request.url).origin;
    const inputUrl = `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;

    // If user, pre-check credits before starting provider job
    const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
    const ownerId = ownerType === 'user' ? (locals.user as { id: string }).id : undefined;
    const kv = env.KV_AI_ENHANCER;
    const neededCredits = TIER_CREDITS[tier];
    const neededTenths = Math.round(neededCredits * 10);

    // Determine charging path for users before starting provider job
    let chargePath: 'credits' | 'quota' | null = null;
    let ym: string | null = null;
    let entTenths = 0;
    if (ownerType === 'user') {
      if (!kv || !ownerId) return createApiError('server_error', 'Storage not configured');
      const balTenths = await getCreditsBalanceTenths(kv, ownerId);
      if (balTenths >= neededTenths) {
        chargePath = 'credits';
      } else {
        const plan = ((locals.user as { plan?: Plan } | null)?.plan ?? 'free') as Plan;
        const ent = getVideoEntitlementsFor('user', plan);
        entTenths = ent.monthlyCreditsTenths;
        const now = new Date();
        ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        const remaining = await getVideoMonthlyQuotaRemainingTenths(kv, ownerId, entTenths, ym);
        if (remaining >= neededTenths) {
          chargePath = 'quota';
        } else {
          // No credits and no remaining quota
          return createApiError('validation_error', 'insufficient_quota');
        }
      }
    }

    // Resolve latest model version for topazlabs/video-upscale
    let versionId: string | null = null;
    try {
      const metaRes = await fetch('https://api.replicate.com/v1/models/topazlabs/video-upscale', {
        headers: { Authorization: `Token ${token}` },
      });
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as {
          latest_version?: { id?: string };
          versions?: Array<{ id?: string }>;
        };
        versionId = meta?.latest_version?.id || meta?.versions?.[0]?.id || null;
      }
    } catch {}
    if (!versionId) return createApiError('server_error', 'Provider metadata unavailable');

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
      const type =
        startRes.status === 401 || startRes.status === 403
          ? 'forbidden'
          : startRes.status >= 400 && startRes.status < 500
            ? 'validation_error'
            : 'server_error';
      return createApiError(type, 'Provider error', { snippet: text.slice(0, 200) });
    }

    const data = (await startRes.json()) as { id: string; status: string };
    // Persist minimal job metadata for later ownership + result persistence
    try {
      const oType: 'user' | 'guest' = ownerType;
      const oId =
        oType === 'user' ? (locals.user as { id: string }).id : ensureGuestIdCookie(context);
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
    } catch {}

    // If user, apply chosen charge path idempotently tied to job id and return charge info
    if (ownerType === 'user' && kv && ownerId) {
      if (chargePath === 'credits') {
        try {
          await consumeCreditsTenths(kv, ownerId, neededTenths, `ai-video:${data.id}`);
          const remainingTenths = await getCreditsBalanceTenths(kv, ownerId);
          return createApiSuccess({
            jobId: data.id,
            status: data.status,
            charge: { credits: neededCredits, balance: Math.floor(remainingTenths / 10) },
          });
        } catch {
          return createApiError('validation_error', 'insufficient_credits');
        }
      }
      if (chargePath === 'quota') {
        try {
          const ym2 =
            ym ||
            (() => {
              const d = new Date();
              return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            })();
          await consumeVideoMonthlyQuotaTenths(
            kv,
            ownerId,
            entTenths,
            neededTenths,
            ym2,
            `ai-video:${data.id}`
          );
          return createApiSuccess({
            jobId: data.id,
            status: data.status,
            charge: { credits: 0, quota: true },
          });
        } catch {
          return createApiError('validation_error', 'insufficient_quota');
        }
      }
    }

    return createApiSuccess({ jobId: data.id, status: data.status });
  },
  { rateLimiter: aiJobsLimiter, enforceCsrfToken: true }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
