import type { APIContext, APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { createRateLimiter } from '@/lib/rate-limiter';
import { CommentService } from '@/lib/services/comment-service';

const commentsHealthLimiter = createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000,
  name: 'commentsHealthCheck',
});

type CommentEntityType = 'blog_post' | 'project' | 'general';

function isCommentEntityType(v: string): v is CommentEntityType {
  return v === 'blog_post' || v === 'project' || v === 'general';
}

function getEnv(context: APIContext): {
  DB?: D1Database;
  ENVIRONMENT?: string;
  INTERNAL_HEALTH_TOKEN?: string;
} {
  try {
    return (
      (
        context.locals as unknown as {
          runtime?: {
            env?: { DB?: D1Database; ENVIRONMENT?: string; INTERNAL_HEALTH_TOKEN?: string };
          };
        }
      )?.runtime?.env || {}
    );
  } catch {
    return {};
  }
}

type CommentsSchemaKind = 'modern' | 'legacy' | 'unknown';

export const GET: APIRoute = withApiMiddleware(
  async (context) => {
    const env = getEnv(context);
    const startTime = Date.now();

    const provided = context.request.headers.get('x-internal-health');
    const expected = env.INTERNAL_HEALTH_TOKEN;
    if (!expected || !provided || provided !== expected) {
      return createApiError('forbidden', 'Missing or invalid internal health token');
    }

    if (!env.DB) {
      return createApiSuccess({
        status: 'degraded',
        environment: env.ENVIRONMENT || null,
        timestamp: new Date().toISOString(),
        duration: `${Date.now() - startTime}ms`,
        checks: {
          db: false,
          schema: null,
          sample: null,
          list: null,
        },
        errors: ['Database binding not available'],
      });
    }

    const errors: string[] = [];

    let schema: CommentsSchemaKind = 'unknown';
    let columnsSample: string[] = [];

    try {
      const info = await env.DB.prepare("PRAGMA table_info('comments')").all();
      const cols = new Set<string>(
        Array.isArray(info?.results)
          ? info.results.map((r) => String((r as { name?: unknown }).name))
          : []
      );

      columnsSample = Array.from(cols).slice(0, 25);

      const isModern = cols.has('entity_type') && cols.has('entity_id');
      const isLegacy = cols.has('postId') && cols.has('approved') && cols.has('createdAt');

      schema = isModern ? 'modern' : isLegacy ? 'legacy' : 'unknown';
    } catch (err) {
      errors.push(`schema: ${err instanceof Error ? err.message : 'Unknown error'}`);
      schema = 'unknown';
    }

    let sample: { entityType: CommentEntityType; entityId: string } | null = null;

    if (schema === 'modern') {
      try {
        const row = await env.DB.prepare(
          "SELECT entity_type as entityType, entity_id as entityId FROM comments WHERE status != 'hidden' ORDER BY updated_at DESC LIMIT 1"
        ).first<{ entityType: string; entityId: string }>();

        if (row?.entityType && row?.entityId && isCommentEntityType(row.entityType)) {
          sample = { entityType: row.entityType, entityId: row.entityId };
        }
      } catch (err) {
        errors.push(`sample(modern): ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else if (schema === 'legacy') {
      try {
        const row = await env.DB.prepare(
          'SELECT postId as entityId FROM comments ORDER BY createdAt DESC LIMIT 1'
        ).first<{ entityId: string }>();

        if (row?.entityId) {
          sample = { entityType: 'blog_post', entityId: row.entityId };
        }
      } catch (err) {
        errors.push(`sample(legacy): ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      errors.push('schema: unknown (skipping sample selection)');
    }

    let listCheck:
      | {
          ok: true;
          usedSample: { entityType: CommentEntityType; entityId: string };
          total: number;
          returned: number;
          hasMore: boolean;
          repliesAttached: boolean;
        }
      | { ok: false; reason: string }
      | null = null;

    if (sample) {
      try {
        const service = new CommentService(env.DB);
        const list = await service.listComments({
          entityType: sample.entityType,
          entityId: sample.entityId,
          limit: 5,
          offset: 0,
          includeReplies: true,
        });

        const repliesAttached = list.comments.some((c) => Array.isArray(c.replies));

        listCheck = {
          ok: true,
          usedSample: sample,
          total: list.total,
          returned: list.comments.length,
          hasMore: list.hasMore,
          repliesAttached,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`listComments: ${message}`);
        listCheck = { ok: false, reason: message };
      }
    } else {
      listCheck = { ok: false, reason: 'no_sample_comment_found' };
    }

    const duration = Date.now() - startTime;
    const status = errors.length === 0 ? 'ok' : 'degraded';

    return createApiSuccess({
      status,
      environment: env.ENVIRONMENT || null,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      checks: {
        db: true,
        schema,
        columnsSample,
        sample: sample ? sample : null,
        list: listCheck,
      },
      ...(errors.length > 0 && { errors }),
    });
  },
  {
    rateLimiter: commentsHealthLimiter,
    enforceCsrfToken: false,
    disableAutoLogging: true,
    logMetadata: { action: 'comments_health_check' },
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST: APIRoute = methodNotAllowed;
export const PUT: APIRoute = methodNotAllowed;
export const PATCH: APIRoute = methodNotAllowed;
export const DELETE: APIRoute = methodNotAllowed;
export const OPTIONS: APIRoute = methodNotAllowed;
export const HEAD: APIRoute = methodNotAllowed;
