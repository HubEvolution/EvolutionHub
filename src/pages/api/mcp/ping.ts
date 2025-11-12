import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createMethodNotAllowed,
  createApiError,
} from '@/lib/api-middleware';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import { verifyCloudflareAccessJwt } from '@/lib/security/cloudflare-access';

function getEnv(context: APIContext): Record<string, string> {
  try {
    return (
      (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env ||
      {}
    );
  } catch {
    return {};
  }
}

async function handler(context: APIContext): Promise<Response> {
  const { request, clientAddress } = context;

  if (request.method !== 'GET') {
    return createMethodNotAllowed('GET');
  }

  const env = getEnv(context);

  // First preference: Cloudflare Access JWT (service or user policy)
  const accessCheck = await verifyCloudflareAccessJwt(request, env);

  // Fallback: pre-shared executor token (header X-Executor-Token)
  const executorHeader =
    request.headers.get('x-executor-token') ?? request.headers.get('X-Executor-Token');
  const hasExecutorMatch =
    !!env.WEB_EVAL_EXECUTOR_TOKEN && executorHeader === env.WEB_EVAL_EXECUTOR_TOKEN;

  if (!accessCheck.valid && !hasExecutorMatch) {
    return createApiError('auth_error', 'Unauthorized');
  }

  const now = Date.now();
  const data = {
    ok: true as const,
    method: 'GET' as const,
    time: now,
    ip: clientAddress || 'unknown',
    // surface limited identity info for diagnostics only when Access JWT present
    identity: accessCheck.valid
      ? {
          email: accessCheck.email || null,
          sub: accessCheck.sub || null,
          aud: accessCheck.aud || null,
        }
      : null,
  };

  return createApiSuccess(data);
}

export const GET = withApiMiddleware(handler, {
  rateLimiter: webEvalTaskLimiter,
  // GET is safe; keep default same-origin checks only for unsafe methods
});
