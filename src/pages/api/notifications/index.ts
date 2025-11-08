import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import type { D1Database } from '@cloudflare/workers-types';

import { rateLimit } from '@/lib/rate-limiter';
import { NotificationService } from '@/lib/services/notification-service';
import type {
  NotificationFilters,
  NotificationPriority,
  NotificationType,
} from '@/lib/types/notifications';

const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'comment_reply',
  'comment_mention',
  'comment_approved',
  'comment_rejected',
  'system',
];

const NOTIFICATION_PRIORITIES: readonly NotificationPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
];

function parseNotificationType(value: string | undefined | null): NotificationType | undefined {
  if (!value) return undefined;
  return NOTIFICATION_TYPES.includes(value as NotificationType)
    ? (value as NotificationType)
    : undefined;
}

function parseNotificationPriority(
  value: string | undefined | null
): NotificationPriority | undefined {
  if (!value) return undefined;
  return NOTIFICATION_PRIORITIES.includes(value as NotificationPriority)
    ? (value as NotificationPriority)
    : undefined;
}

function parseBooleanFlag(value: string | undefined | null): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parseInteger(value: string | undefined | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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

type NotificationContext = Parameters<Parameters<typeof app.get>[1]>[0];

const getJwtPayload = (
  c: NotificationContext
): { id?: string | number } | undefined =>
  c.get('jwtPayload') as { id?: string | number } | undefined;

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
    await rateLimit(key, maxRequests, windowSeconds);
    return undefined;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Rate limit exceeded. Please try again later.';
    const retryAfter = message.match(/after (\d+) seconds/i)?.[1];
    if (retryAfter) {
      c.header('Retry-After', retryAfter);
    }
    return c.json(
      {
        success: false,
        error: { type: 'rate_limit', message },
      },
      429
    );
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
app.use('*', async (c, next) => {
  const secret = c.env.JWT_SECRET;
  return jwt({ secret })(c, next);
});

// GET /api/notifications - List user notifications
app.get('/', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:list:${userId}`, 30, 60);
    if (limited) return limited;

    const notificationService = new NotificationService(c.env.DB);

    // Parse query parameters
    const query = c.req.query();
    const filters: NotificationFilters = {
      type: parseNotificationType(query.type),
      isRead: parseBooleanFlag(query.isRead),
      priority: parseNotificationPriority(query.priority),
      limit: Math.max(1, Math.min(100, parseInteger(query.limit, 20))),
      offset: Math.max(0, parseInteger(query.offset, 0)),
      startDate: query.startDate ? parseInteger(query.startDate, NaN) || undefined : undefined,
      endDate: query.endDate ? parseInteger(query.endDate, NaN) || undefined : undefined,
    };

    const result = await notificationService.listNotifications(userId, filters);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json(
      {
        success: false,
        error: { type: 'server', message: 'Internal server error' },
      },
      500
    );
  }
});

// POST /api/notifications/mark-read - Mark notification as read
app.post('/mark-read', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:mark-read:${userId}`, 20, 60);
    if (limited) return limited;

    const body = (await c.req.json().catch(() => null)) as { notificationId?: unknown } | null;
    const notificationId =
      typeof body?.notificationId === 'string' ? body.notificationId : undefined;

    if (!notificationId) {
      return c.json(
        {
          success: false,
          error: { type: 'validation', message: 'notificationId is required' },
        },
        400
      );
    }

    const notificationService = new NotificationService(c.env.DB);

    const notification = await notificationService.markAsRead(notificationId, userId);

    return c.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json(
      {
        success: false,
        error: { type: 'server', message: 'Internal server error' },
      },
      500
    );
  }
});

// POST /api/notifications/mark-all-read - Mark all notifications as read
app.post('/mark-all-read', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:mark-all-read:${userId}`, 10, 60);
    if (limited) return limited;

    const notificationService = new NotificationService(c.env.DB);

    await notificationService.markAllAsRead(userId);

    return c.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json(
      {
        success: false,
        error: { type: 'server', message: 'Internal server error' },
      },
      500
    );
  }
});

// DELETE /api/notifications/:id - Delete a notification
app.delete('/:id', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const notificationId = c.req.param('id');

    const limited = await enforceRateLimit(c, `notifications:delete:${userId}`, 10, 60);
    if (limited) return limited;

    const notificationService = new NotificationService(c.env.DB);

    await notificationService.deleteNotification(notificationId, userId);

    return c.json({
      success: true,
      data: { message: 'Notification deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return c.json(
      {
        success: false,
        error: { type: 'server', message: 'Internal server error' },
      },
      500
    );
  }
});

// GET /api/notifications/stats - Get notification statistics
app.get('/stats', async (c: NotificationContext) => {
  try {
    const userId = requireUserId(c);

    const limited = await enforceRateLimit(c, `notifications:stats:${userId}`, 15, 60);
    if (limited) return limited;

    const notificationService = new NotificationService(c.env.DB);

    const stats = await notificationService.getNotificationStats(userId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return c.json(
      {
        success: false,
        error: { type: 'server', message: 'Internal server error' },
      },
      500
    );
  }
});

export default app;
