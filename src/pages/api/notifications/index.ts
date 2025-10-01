import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { rateLimit } from '../../../lib/rate-limiter';
import { NotificationService } from '../../../lib/services/notification-service';
import type { NotificationFilters } from '../../../lib/types/notifications';

const app = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

// Apply CORS middleware
app.use('*', cors({
  origin: (origin) => {
    // Allow requests from the same origin and configured domains
    const allowedOrigins = [
      process.env.BASE_URL || 'http://localhost:3000',
      'https://evolution-hub.pages.dev',
    ];
    return allowedOrigins.includes(origin) ? origin : null;
  },
  credentials: true,
}));

// JWT middleware for authentication
app.use('/api/notifications/*', jwt({
  secret: process.env.JWT_SECRET!,
}));

// GET /api/notifications - List user notifications
app.get('/', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 30 requests per minute
    await rateLimit(`notifications:list:${userId}`, 30, 60);

    const notificationService = new NotificationService(c.env.DB);

    // Parse query parameters
    const query = c.req.query();
    const filters: NotificationFilters = {
      type: query.type as any,
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
      priority: query.priority as any,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
      startDate: query.startDate ? parseInt(query.startDate) : undefined,
      endDate: query.endDate ? parseInt(query.endDate) : undefined,
    };

    const result = await notificationService.listNotifications(userId, filters);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// POST /api/notifications/mark-read - Mark notification as read
app.post('/mark-read', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 20 requests per minute
    await rateLimit(`notifications:mark-read:${userId}`, 20, 60);

    const body = await c.req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return c.json({
        success: false,
        error: { type: 'validation', message: 'notificationId is required' },
      }, 400);
    }

    const notificationService = new NotificationService(c.env.DB);

    const notification = await notificationService.markAsRead(notificationId, userId);

    return c.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// POST /api/notifications/mark-all-read - Mark all notifications as read
app.post('/mark-all-read', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 10 requests per minute
    await rateLimit(`notifications:mark-all-read:${userId}`, 10, 60);

    const notificationService = new NotificationService(c.env.DB);

    await notificationService.markAllAsRead(userId);

    return c.json({
      success: true,
      data: { message: 'All notifications marked as read' },
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// DELETE /api/notifications/:id - Delete a notification
app.delete('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    const notificationId = c.req.param('id');

    // Rate limiting: 10 requests per minute
    await rateLimit(`notifications:delete:${userId}`, 10, 60);

    const notificationService = new NotificationService(c.env.DB);

    await notificationService.deleteNotification(notificationId, userId);

    return c.json({
      success: true,
      data: { message: 'Notification deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// GET /api/notifications/stats - Get notification statistics
app.get('/stats', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 15 requests per minute
    await rateLimit(`notifications:stats:${userId}`, 15, 60);

    const notificationService = new NotificationService(c.env.DB);

    const stats = await notificationService.getNotificationStats(userId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

export default app;