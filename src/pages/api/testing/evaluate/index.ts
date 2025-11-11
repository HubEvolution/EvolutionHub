import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { formatZodError, webEvalTaskRequestSchema } from '@/lib/validation';
import { webEvalTaskLimiter } from '@/lib/rate-limiter';
import { createTaskRecord } from '@/lib/testing/web-eval/storage';
import { resolveQueueConfig, type WebEvalEnvBindings } from '@/lib/testing/web-eval/env';
import type { WebEvalTaskCreatePayload, WebEvalTaskRecord } from '@/lib/testing/web-eval';

function ensureGuestIdCookie(context: APIContext): string {
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
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return guestId;
}

async function handler(context: APIContext): Promise<Response> {
  const { locals, request } = context;
  const env = (locals.runtime?.env ?? {}) as WebEvalEnvBindings;
  const kv = env.KV_WEB_EVAL;
  if (!kv) {
    return createApiError('server_error', 'Web evaluation storage is not configured');
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  if (!bodyUnknown || typeof bodyUnknown !== 'object') {
    return createApiError('validation_error', 'Invalid JSON body');
  }

  const parsed = webEvalTaskRequestSchema.safeParse(bodyUnknown);
  if (!parsed.success) {
    return createApiError('validation_error', 'Invalid request parameters', {
      details: formatZodError(parsed.error),
    });
  }

  const ownerType = locals.user?.id ? 'user' : 'guest';
  const ownerId = ownerType === 'user' ? String(locals.user!.id) : ensureGuestIdCookie(context);

  const payload: WebEvalTaskCreatePayload = {
    ownerType,
    ownerId,
    url: parsed.data.url,
    task: parsed.data.task.trim(),
    headless: parsed.data.headless ?? true,
    timeoutMs: parsed.data.timeoutMs ?? 30_000,
  };

  const config = resolveQueueConfig(env);

  let record: WebEvalTaskRecord;
  try {
    record = await createTaskRecord(kv, payload, config);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create task';
    return createApiError('server_error', message);
  }

  return createApiSuccess({
    taskId: record.id,
    status: record.status,
    createdAt: record.createdAt,
  });
}

export const POST = withApiMiddleware(handler, {
  rateLimiter: webEvalTaskLimiter,
  enforceCsrfToken: true,
});

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
