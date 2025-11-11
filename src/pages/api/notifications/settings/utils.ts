import type { APIContext } from 'astro';
import { createApiError } from '@/lib/api-middleware';
import { NotificationService } from '@/lib/services/notification-service';

export function resolveRuntimeEnv(context: APIContext): Record<string, unknown> {
  return (context.locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env ?? {};
}

export function resolveDbBinding(context: APIContext): D1Database {
  const env = resolveRuntimeEnv(context);
  const db = env.DB as D1Database | undefined;
  if (!db) {
    throw new Error('Database binding missing');
  }
  return db;
}

export function resolveNotificationService(context: APIContext): NotificationService {
  const db = resolveDbBinding(context);
  const env = resolveRuntimeEnv(context);
  const kv =
    (env.SESSION as KVNamespace | undefined) ?? (env.KV_PROMPT_ENHANCER as KVNamespace | undefined);
  return new NotificationService(db, kv);
}

export function resolveUserId(context: APIContext): string | null {
  const locals = context.locals as {
    user?: { id?: string } | null;
    runtime?: { user?: { id?: string } | null };
  };
  const user = locals.user ?? locals.runtime?.user;
  const userId = typeof user?.id === 'string' && user.id.trim().length > 0 ? user.id : null;
  return userId;
}

export function handleServiceError(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes('Rate limit exceeded')) {
      const retryMatch = error.message.match(/after (\d+) seconds/i);
      const retryAfter = retryMatch ? Number.parseInt(retryMatch[1] ?? '', 10) : undefined;
      return createApiError(
        'rate_limit',
        'Too many requests. Please try again later.',
        retryAfter ? { retryAfter } : undefined
      );
    }

    return createApiError('server_error', error.message || 'Unhandled error');
  }

  return createApiError('server_error', 'Unhandled error');
}
