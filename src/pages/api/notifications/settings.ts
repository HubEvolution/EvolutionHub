import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { rateLimit } from '../../../lib/rate-limiter';
import { NotificationService } from '../../../lib/services/notification-service';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { notificationSettings } from '../../../lib/db/schema';
import type { UpdateNotificationSettingsRequest } from '../../../lib/types/notifications';

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

// GET /api/notifications/settings - Get user notification settings
app.get('/', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 20 requests per minute
    await rateLimit(`notifications:settings:${userId}`, 20, 60);

    const notificationService = new NotificationService(c.env.DB);

    const settings = await notificationService.getUserNotificationSettings(userId);

    return c.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// POST /api/notifications/settings - Update notification settings
app.post('/', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 10 requests per minute
    await rateLimit(`notifications:settings:update:${userId}`, 10, 60);

    const body = await c.req.json();
    const { type, channel, enabled, frequency } = body;

    // Validate required fields
    if (!type || !channel) {
      return c.json({
        success: false,
        error: {
          type: 'validation',
          message: 'type and channel are required'
        },
      }, 400);
    }

    // Validate enums
    const validTypes = ['comment_reply', 'comment_mention', 'comment_approved', 'comment_rejected', 'system', 'email_digest'];
    const validChannels = ['in_app', 'email', 'push'];
    const validFrequencies = ['immediate', 'daily', 'weekly', 'never'];

    if (!validTypes.includes(type)) {
      return c.json({
        success: false,
        error: {
          type: 'validation',
          message: 'Invalid notification type'
        },
      }, 400);
    }

    if (!validChannels.includes(channel)) {
      return c.json({
        success: false,
        error: {
          type: 'validation',
          message: 'Invalid notification channel'
        },
      }, 400);
    }

    if (frequency && !validFrequencies.includes(frequency)) {
      return c.json({
        success: false,
        error: {
          type: 'validation',
          message: 'Invalid notification frequency'
        },
      }, 400);
    }

    const request: UpdateNotificationSettingsRequest = {
      type,
      channel,
      enabled: Boolean(enabled),
      frequency: frequency || 'immediate',
    };

    const notificationService = new NotificationService(c.env.DB);

    await notificationService.updateNotificationSettings(userId, request);

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// POST /api/notifications/settings/initialize - Initialize default settings for new user
app.post('/initialize', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 5 requests per hour (users shouldn't need to initialize often)
    await rateLimit(`notifications:settings:init:${userId}`, 5, 3600);

    const notificationService = new NotificationService(c.env.DB);

    await notificationService.initializeDefaultSettings(userId);

    const settings = await notificationService.getUserNotificationSettings(userId);

    return c.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error initializing notification settings:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

// POST /api/notifications/settings/reset - Reset settings to defaults
app.post('/reset', async (c) => {
  try {
    const userId = c.get('jwtPayload')?.id;
    if (!userId) {
      return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
    }

    // Rate limiting: 5 requests per hour
    await rateLimit(`notifications:settings:reset:${userId}`, 5, 3600);

    const notificationService = new NotificationService(c.env.DB);

    // Delete existing settings
    const db = drizzle(c.env.DB);
    await db.delete(notificationSettings).where(eq(notificationSettings.userId, userId));

    // Initialize with defaults
    await notificationService.initializeDefaultSettings(userId);

    const settings = await notificationService.getUserNotificationSettings(userId);

    return c.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error resetting notification settings:', error);
    return c.json({
      success: false,
      error: { type: 'server', message: 'Internal server error' },
    }, 500);
  }
});

export default app;