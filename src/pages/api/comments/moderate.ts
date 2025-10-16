import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { APIContext } from 'astro';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { CommentService } from '@/lib/services/comment-service';
import { requireModerator } from '@/lib/auth-helpers';
import { createCsrfMiddleware, validateCsrfToken } from '@/lib/security/csrf';
import type { ModerateCommentRequest } from '@/lib/types/comments';

type CommentModerationEnv = {
  DB: D1Database;
  KV_COMMENTS?: KVNamespace;
};

interface ModerateRequestPayload extends ModerateCommentRequest {
  commentId: string;
  csrfToken?: string;
}

function resolveModerationEnv(context: APIContext): CommentModerationEnv {
  const runtimeEnv = (context.locals as { runtime?: { env?: CommentModerationEnv } })?.runtime?.env;
  const legacyEnv = (context as { locals?: { env?: CommentModerationEnv } }).locals?.env;
  const env = runtimeEnv ?? legacyEnv;

  if (!env?.DB) {
    throw new Error('Database binding missing');
  }

  return env;
}

function toModeratorId(value: unknown): string {
  const id = String(value ?? '').trim();
  if (!id) throw new Error('Authentication error: invalid moderator id');
  return id;
}

function isModerateRequestPayload(value: unknown): value is ModerateRequestPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.commentId !== 'string' || candidate.commentId.trim().length === 0) {
    return false;
  }

  const { action, reason, notifyUser } = candidate;
  if (typeof action !== 'string') {
    return false;
  }
  if (reason !== undefined && typeof reason !== 'string') {
    return false;
  }
  if (notifyUser !== undefined && typeof notifyUser !== 'boolean') {
    return false;
  }

  if (candidate.csrfToken !== undefined && typeof candidate.csrfToken !== 'string') {
    return false;
  }

  return true;
}

async function readModerateRequest(request: Request): Promise<ModerateRequestPayload> {
  const body = await request.json().catch(() => undefined);
  if (!isModerateRequestPayload(body)) {
    throw new Error('validation_error: Invalid moderation payload');
  }
  return body;
}

const app = new Hono<{ Bindings: { DB: D1Database; KV_COMMENTS?: KVNamespace } }>();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
        return origin;
      }
      return null;
    },
    credentials: true,
  })
);

// CSRF protection for mutating moderation route
app.use('/', createCsrfMiddleware());

// POST /api/comments/moderate - Moderate a comment (approve, reject, flag, hide)
app.post('/', async (c) => {
  try {
    // Require moderator or admin role
    const user = await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const body = await c.req.json<
      ModerateCommentRequest & {
        commentId: string;
        csrfToken: string;
      }
    >();

    const { commentId, csrfToken, ...moderationData } = body;

    if (!commentId || !csrfToken) {
      return c.json(
        {
          success: false,
          error: { type: 'validation_error', message: 'Comment ID and CSRF token required' },
        },
        400
      );
    }

    // Validate CSRF token
    const isValidCsrf = await validateCsrfToken(csrfToken);
    if (!isValidCsrf) {
      return c.json(
        { success: false, error: { type: 'validation_error', message: 'Invalid CSRF token' } },
        400
      );
    }

    const commentService = new CommentService(c.env.DB, c.env.KV_COMMENTS);

    const moderation = await commentService.moderateComment(
      commentId,
      moderationData,
      String(user.id)
    );

    return c.json({ success: true, data: moderation });
  } catch (error) {
    console.error('Error moderating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('not found')) {
        return c.json(
          { success: false, error: { type: 'validation_error', message: error.message } },
          400
        );
      }
      if (error.message.includes('Authentication')) {
        return c.json(
          { success: false, error: { type: 'auth_error', message: error.message } },
          401
        );
      }
    }

    return c.json(
      { success: false, error: { type: 'server_error', message: 'Failed to moderate comment' } },
      500
    );
  }
});

// GET /api/comments/moderation-queue - Get comments needing moderation
app.get('/queue', async (c) => {
  try {
    await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const commentService = new CommentService(c.env.DB);

    const queue = await commentService.getModerationQueue();

    return c.json({ success: true, data: queue });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }

    return c.json(
      {
        success: false,
        error: { type: 'server_error', message: 'Failed to fetch moderation queue' },
      },
      500
    );
  }
});

// GET /api/comments/stats - Get comment statistics
app.get('/stats', async (c) => {
  try {
    await requireModerator({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });

    const commentService = new CommentService(c.env.DB);

    const stats = await commentService.getCommentStats();

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching comment stats:', error);

    if (error instanceof Error && error.message.includes('Authentication')) {
      return c.json({ success: false, error: { type: 'auth_error', message: error.message } }, 401);
    }
    return c.json(
      { success: false, error: { type: 'server_error', message: 'Failed to fetch comment stats' } },
      500
    );
  }
});

// Note: no default export; named handlers are used by the router

// Named POST handler for /api/comments/moderate
export const POST = async (context: APIContext) => {
  try {
    const env = resolveModerationEnv(context);
    const moderator = await requireModerator({ request: context.request, env: { DB: env.DB } });
    const payload = await readModerateRequest(context.request);

    const csrfToken = payload.csrfToken ?? context.request.headers.get('x-csrf-token') ?? undefined;
    if (!csrfToken) {
      return createApiError('forbidden', 'CSRF token required');
    }

    const cookie = context.request.headers.get('cookie') ?? undefined;
    const csrfValid = await validateCsrfToken(csrfToken, cookie);
    if (!csrfValid) {
      return createApiError('forbidden', 'Invalid CSRF token');
    }

    const { commentId, csrfToken: _csrf, ...moderationData } = payload;
    const service = new CommentService(env.DB, env.KV_COMMENTS);
    const result = await service.moderateComment(
      commentId,
      moderationData,
      toModeratorId((moderator as { id?: number | string }).id)
    );

    return createApiSuccess(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.startsWith('validation_error:')) {
      const [, detail] = message.split(':', 2);
      return createApiError('validation_error', (detail ?? '').trim() || message);
    }

    if (message.toLowerCase().includes('authentication')) {
      return createApiError('auth_error', message);
    }

    if (message.toLowerCase().includes('csrf')) {
      return createApiError('forbidden', message);
    }

    return createApiError('server_error', message);
  }
};
