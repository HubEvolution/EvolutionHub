import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';
import { CommentService } from '../../../lib/services/comment-service';
import { getAuthUser } from '../../../lib/auth-helpers';
import { createCsrfMiddleware } from '../../../lib/security/csrf';
import type { CreateCommentRequest, CommentFilters } from '../../../lib/types/comments';

const app = new Hono<{ Bindings: { DB: D1Database } }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow requests from the same origin and localhost for development
    if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app')) {
      return origin;
    }
    return null; // Reject other origins
  },
  credentials: true,
}));

// Rate limiting for comment creation
app.use('/create', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // 5 comments per minute
  keyGenerator: (c) =>
    c.req.header('CF-Connecting-IP') ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    c.req.header('x-real-ip') ||
    'anonymous',
  message: { success: false, error: { type: 'rate_limit', message: 'Too many comments' } },
}));

// CSRF protection for mutating route
app.use('/create', createCsrfMiddleware());

// GET /api/comments - List comments with filtering
app.get('/', async (c) => {
  try {
    const commentService = new CommentService(c.env.DB);

    const query = c.req.query();

    // Parse filters from query parameters
    const filters: CommentFilters = {
      status: query.status as any,
      entityType: query.entityType as any,
      entityId: query.entityId,
      authorId: query.authorId ? parseInt(query.authorId) : undefined,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
      includeReplies: query.includeReplies !== 'false',
    };

    const result = await commentService.listComments(filters);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to fetch comments' } }, 500);
  }
});

// POST /api/comments/create - Create a new comment
app.post('/create', async (c) => {
  try {
    const commentService = new CommentService(c.env.DB);

    // Authenticate user (optional for guest comments)
    const user = await getAuthUser({
      req: { header: (name: string) => c.req.header(name) },
      request: c.req.raw,
      env: { DB: c.env.DB },
    });
    const userId = user ? Number(user.id) : undefined;

    const body = await c.req.json<CreateCommentRequest & { csrfToken?: string }>();
    const { csrfToken, ...commentData } = body;

    // Validate required fields
    if (!commentData.content || !commentData.entityType || !commentData.entityId) {
      return c.json({ success: false, error: { type: 'validation_error', message: 'Missing required fields' } }, 400);
    }

    const comment = await commentService.createComment(commentData, userId, csrfToken);
    return c.json({ success: true, data: comment }, 201);
  } catch (error) {
    console.error('Error creating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('rate limit')) {
        return c.json({ success: false, error: { type: 'validation_error', message: error.message } }, 400);
      }
      if (error.message.includes('prohibited content')) {
        return c.json({ success: false, error: { type: 'validation_error', message: error.message } }, 400);
      }
    }

    return c.json({ success: false, error: { type: 'server_error', message: 'Failed to create comment' } }, 500);
  }
});

export default app;