import type { APIContext } from 'astro';
import {
  withAuthApiMiddleware,
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { requireAdmin } from '@/lib/auth-helpers';
import type { AdminBindings } from '@/lib/types/admin';
import { listActiveCreditPacksTenths } from '@/lib/kv/usage';
import { z, formatZodError } from '@/lib/validation';

const querySchema = z
  .object({
    userId: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  })
  .strict();

export const GET = withAuthApiMiddleware(
  async (context: APIContext) => {
    const { locals, url } = context;
    const env = (locals.runtime?.env ?? {}) as AdminBindings;

    if (!env.DB || !env.KV_AI_ENHANCER) {
      return createApiError('server_error', 'Infrastructure unavailable');
    }

    try {
      await requireAdmin({ request: context.request, env: { DB: env.DB } });
    } catch {
      return createApiError('forbidden', 'Insufficient permissions');
    }

    const q = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!q.success) {
      return createApiError('validation_error', 'Invalid query', { details: formatZodError(q.error) });
    }
    const { userId } = q.data;

    const packs = await listActiveCreditPacksTenths(env.KV_AI_ENHANCER, userId);
    const items = packs.map((p: { id: string; unitsTenths: number; createdAt: number; expiresAt: number }) => ({
      id: p.id,
      unitsTenths: p.unitsTenths,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    }));

    return createApiSuccess({ items });
  },
  { rateLimiter: apiRateLimiter }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;

