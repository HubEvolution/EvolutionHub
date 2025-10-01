import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rateLimiter } from 'hono-rate-limiter';
import { CommentService } from '../../../lib/services/comment-service';
import { getDb } from '../../../lib/db/helpers';
import { authenticateUser } from '../../../lib/auth';
import { createResponse, createErrorResponse } from '../../../lib/response-helpers';
import type { CreateCommentRequest, CommentFilters } from '../../../lib/types/comments';

const app = new Hono();

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
  keyGenerator: (c) => {
    // Use user ID if authenticated, otherwise IP
    const user = c.get('user');
    return user?.id?.toString() || c.req.header('CF-Connecting-IP') || 'anonymous';
  },
  message: { success: false, error: { type: 'rate_limit', message: 'Too many comments' } },
}));

// GET /api/comments - List comments with filtering
app.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

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

    return createResponse(c, result);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return createErrorResponse(c, 'Failed to fetch comments', 'server_error', 500);
  }
});

// POST /api/comments/create - Create a new comment
app.post('/create', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const commentService = new CommentService(db);

    // Authenticate user (optional for guest comments)
    const user = await authenticateUser(c);
    const userId = user?.id;

    const body = await c.req.json<CreateCommentRequest & { csrfToken?: string }>();
    const { csrfToken, ...commentData } = body;

    // Validate required fields
    if (!commentData.content || !commentData.entityType || !commentData.entityId) {
      return createErrorResponse(c, 'Missing required fields', 'validation_error', 400);
    }

    const comment = await commentService.createComment(commentData, userId, csrfToken);

    return createResponse(c, comment, 201);
  } catch (error) {
    console.error('Error creating comment:', error);

    if (error instanceof Error) {
      if (error.message.includes('CSRF') || error.message.includes('rate limit')) {
        return createErrorResponse(c, error.message, 'validation_error', 400);
      }
      if (error.message.includes('prohibited content')) {
        return createErrorResponse(c, error.message, 'validation_error', 400);
      }
    }

    return createErrorResponse(c, 'Failed to create comment', 'server_error', 500);
  }
});

export default app;