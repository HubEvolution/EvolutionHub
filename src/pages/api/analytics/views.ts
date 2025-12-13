import type { APIContext } from 'astro';
import { withApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { z, formatZodError } from '@/lib/validation';

function getAnalyticsViewsMode(context: APIContext): 'disabled' | 'db' {
  try {
    const env =
      (context.locals as unknown as { runtime?: { env?: Record<string, string> } })?.runtime?.env ||
      {};
    const raw = (env as Record<string, string>).ANALYTICS_VIEWS_MODE;
    const normalized = raw?.toLowerCase();
    if (normalized === 'disabled') {
      return 'disabled';
    }
    // Default: echte D1-basierte Pageviews, solange nicht explizit deaktiviert
    return 'db';
  } catch {
    return 'db';
  }
}

async function getDb(context: APIContext): Promise<D1Database> {
  const env = (context.locals?.runtime?.env || {}) as { DB?: unknown };
  const dbUnknown =
    env?.DB || (context as unknown as { locals?: { env?: { DB?: unknown } } }).locals?.env?.DB;
  if (!dbUnknown)
    throw Object.assign(new Error('Database binding missing'), {
      apiErrorType: 'server_error',
    });
  if (typeof (dbUnknown as { prepare?: unknown }).prepare !== 'function') {
    throw Object.assign(new Error('Database binding invalid'), {
      apiErrorType: 'server_error',
    });
  }
  return dbUnknown as D1Database;
}

const querySchema = z.object({ slug: z.string().min(1).max(200) }).strict();

export const GET = withApiMiddleware(async (context: APIContext) => {
  try {
    const url = new URL(context.request.url);
    const parsed = querySchema.safeParse({ slug: url.searchParams.get('slug') || '' });
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request', {
        details: formatZodError(parsed.error),
      });
    }
    const { slug } = parsed.data;
    const now = Date.now();

    const mode = getAnalyticsViewsMode(context);
    if (mode === 'disabled') {
      return createApiSuccess({ slug, count: 0, ts: now });
    }

    const db = await getDb(context);
    const row = await db
      .prepare('SELECT count FROM page_views WHERE id = ?')
      .bind(slug)
      .first<{ count: number }>();
    const count = row?.count ?? 0;
    return createApiSuccess({ slug, count, ts: now });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return createApiError('server_error', msg);
  }
});

export const POST = withApiMiddleware(async (context: APIContext) => {
  try {
    const body = await context.request.json().catch(() => ({}));
    const parsed = querySchema.safeParse({ slug: body?.slug || '' });
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request', {
        details: formatZodError(parsed.error),
      });
    }
    const { slug } = parsed.data;
    const now = Date.now();

    const mode = getAnalyticsViewsMode(context);
    if (mode === 'disabled') {
      return createApiSuccess({ slug, count: 0, ts: now });
    }

    const db = await getDb(context);
    // Upsert counter
    await db
      .prepare(
        'INSERT INTO page_views (id, count, updated_at) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at'
      )
      .bind(slug, now)
      .run();

    const row = await db
      .prepare('SELECT count FROM page_views WHERE id = ?')
      .bind(slug)
      .first<{ count: number }>();
    const count = row?.count ?? 1;
    return createApiSuccess({ slug, count, ts: now });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return createApiError('server_error', msg);
  }
});
