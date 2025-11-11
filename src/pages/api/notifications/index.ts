import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import type { D1Database } from '@cloudflare/workers-types';

import { rateLimit } from '@/lib/rate-limiter';
import { NotificationService } from '@/lib/services/notification-service';
import { createApiError, createApiSuccess } from '@/lib/api-middleware';
import { formatZodError } from '@/lib/validation';
import {
  markNotificationReadSchema,
  notificationIdPathSchema,
  notificationsEmptyBodySchema,
  notificationsListQuerySchema,
} from '@/lib/validation/schemas/notifications';

function ensureNumericUserId(rawId: unknown): number {
  const numericId = typeof rawId === 'string' ? Number.parseInt(rawId, 10) : Number(rawId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Unauthorized');
  }
  return numericId;
}

type NotificationBindings = { DB: D1Database; JWT_SECRET: string };
type NotificationVariables = { jwtPayload?: { id?: string | number } };
type NotificationEnv = { Bindings: NotificationBindings; Variables: NotificationVariables };

const app = new Hono<NotificationEnv>();

type NotificationJwtPayload = { id?: string | number };

type NotificationContext = Context<NotificationEnv>;

const getJwtPayload = (c: NotificationContext): NotificationJwtPayload | undefined =>
  c.get('jwtPayload') as NotificationJwtPayload | undefined;

const requireUserId = (c: NotificationContext): string => {
  const numericId = ensureNumericUserId(getJwtPayload(c)?.id);
  return `${numericId}`;
};

const enforceRateLimit = async (
  c: NotificationContext,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<Response | undefined> => {
  try {
    await rateLimit(key, maxRequests, windowSeconds, { kv: (c.env as any).SESSION as KVNamespace });
    return undefined;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Rate limit exceeded. Please try again later.';
    const retryAfter = message.match(/after (\d+) seconds/i)?.[1];
    const response = createApiError('rate_limit', message);
    if (retryAfter) {
      c.header('Retry-After', retryAfter);
      response.headers.set('Retry-After', retryAfter);
    }
    return response;
  }
};

// Apply CORS middleware
app.use(
  '*',
  cors({
    origin: (origin: string | undefined) => {
      const allowedOrigins = [
        process.env.BASE_URL || 'http://localhost:3000',
        'https://evolution-hub.pages.dev',
      ];
      return origin && allowedOrigins.includes(origin) ? origin : null;
    },
    credentials: true,
  })
);

// JWT middleware for authentication
app.use('*', async (c: NotificationContext, next: Next) => {
  const middleware = jwt({ secret: c.env.JWT_SECRET });
  const result = await middleware(c, next);
  const rawPayload = c.get('jwtPayload') as unknown;
  if (rawPayload && typeof rawPayload === 'object') {
    c.set('jwtPayload', rawPayload as NotificationJwtPayload);
  } else {
    c.set('jwtPayload', undefined);
  }
  return result;
});

// GET /api/notifications - List user notifications
app.get('/', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:list:${userId}`, 30, 60);
    if (limited) return limited;

    const query = c.req.query();
    const parsedQuery = notificationsListQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return createApiError('validation_error', 'Invalid query parameters', {
        details: formatZodError(parsedQuery.error),
      });
    }

    const notificationService = new NotificationService(
      c.env.DB,
      (c.env as any).SESSION as KVNamespace
    );
    const result = await notificationService.listNotifications(userId, parsedQuery.data);

    return createApiSuccess(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return createApiError('server_error', 'Internal server error');
  }
});

// POST /api/notifications/mark-read - Mark notification as read
app.post('/mark-read', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:mark-read:${userId}`, 20, 60);
    if (limited) return limited;

    const unknownBody: unknown = await c.req.json().catch(() => null);
    const parsedBody = markNotificationReadSchema.safeParse(unknownBody);
    if (!parsedBody.success) {
      return createApiError('validation_error', 'Invalid JSON body', {
        details: formatZodError(parsedBody.error),
      });
    }

    const notificationService = new NotificationService(
      c.env.DB,
      (c.env as any).SESSION as KVNamespace
    );
    const notification = await notificationService.markAsRead(
      parsedBody.data.notificationId,
      userId
    );

    return createApiSuccess(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return createApiError('server_error', 'Internal server error');
  }
});

// POST /api/notifications/mark-all-read - Mark all notifications as read
app.post('/mark-all-read', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:mark-all-read:${userId}`, 10, 60);
    if (limited) return limited;

    const unknownBody: unknown = await c.req.json().catch(() => ({}));
    const emptyBody = notificationsEmptyBodySchema.safeParse(unknownBody);
    if (!emptyBody.success) {
      return createApiError('validation_error', 'Body must be empty', {
        details: formatZodError(emptyBody.error),
      });
    }

    const notificationService = new NotificationService(
      c.env.DB,
      (c.env as any).SESSION as KVNamespace
    );

    await notificationService.markAllAsRead(userId);

    return createApiSuccess({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return createApiError('server_error', 'Internal server error');
  }
});

// DELETE /api/notifications/:id - Delete a notification
app.delete('/:id', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const parsedPath = notificationIdPathSchema.safeParse({ id: c.req.param('id') });
    if (!parsedPath.success) {
      return createApiError('validation_error', 'Invalid notification id', {
        details: formatZodError(parsedPath.error),
      });
    }

    const limited = await enforceRateLimit(c, `notifications:delete:${userId}`, 10, 60);
    if (limited) return limited;

    const notificationService = new NotificationService(
      c.env.DB,
      (c.env as any).SESSION as KVNamespace
    );

    await notificationService.deleteNotification(parsedPath.data.id, userId);

    return createApiSuccess({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return createApiError('server_error', 'Internal server error');
  }
});

// GET /api/notifications/stats - Get notification statistics
app.get('/stats', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:stats:${userId}`, 15, 60);
    if (limited) return limited;

    const unknownBody: unknown = await c.req.json().catch(() => ({}));
    const emptyBody = notificationsEmptyBodySchema.safeParse(unknownBody);
    if (!emptyBody.success) {
      return createApiError('validation_error', 'Body must be empty', {
        details: formatZodError(emptyBody.error),
      });
    }

    const notificationService = new NotificationService(
      c.env.DB,
      (c.env as any).SESSION as KVNamespace
    );

    const stats = await notificationService.getNotificationStats(userId);

    return createApiSuccess(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return createApiError('server_error', 'Internal server error');
  }
});

export default app;
