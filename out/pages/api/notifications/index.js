"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const jwt_1 = require("hono/jwt");
const rate_limiter_1 = require("../../../lib/rate-limiter");
const notification_service_1 = require("../../../lib/services/notification-service");
const NOTIFICATION_TYPES = [
    'comment_reply',
    'comment_mention',
    'comment_approved',
    'comment_rejected',
    'system',
];
const NOTIFICATION_PRIORITIES = [
    'low',
    'normal',
    'high',
    'urgent',
];
function parseNotificationType(value) {
    if (!value)
        return undefined;
    return NOTIFICATION_TYPES.includes(value)
        ? value
        : undefined;
}
function parseNotificationPriority(value) {
    if (!value)
        return undefined;
    return NOTIFICATION_PRIORITIES.includes(value)
        ? value
        : undefined;
}
function parseBooleanFlag(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    return undefined;
}
function parseInteger(value, fallback) {
    if (!value)
        return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function ensureNumericUserId(rawId) {
    const numericId = typeof rawId === 'string' ? Number.parseInt(rawId, 10) : Number(rawId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
        throw new Error('Unauthorized');
    }
    return numericId;
}
const app = new hono_1.Hono();
// Apply CORS middleware
app.use('*', (0, cors_1.cors)({
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
app.use('/api/notifications/*', (0, jwt_1.jwt)({
    secret: process.env.JWT_SECRET,
}));
// GET /api/notifications - List user notifications
app.get('/', async (c) => {
    try {
        const rawUserId = c.get('jwtPayload')?.id;
        const userId = ensureNumericUserId(rawUserId);
        if (!userId) {
            return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
        }
        // Rate limiting: 30 requests per minute
        await (0, rate_limiter_1.rateLimit)(`notifications:list:${userId}`, 30, 60);
        const notificationService = new notification_service_1.NotificationService(c.env.DB);
        // Parse query parameters
        const query = c.req.query();
        const filters = {
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
    }
    catch (error) {
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
        const rawUserId = c.get('jwtPayload')?.id;
        const userId = ensureNumericUserId(rawUserId);
        if (!userId) {
            return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
        }
        // Rate limiting: 20 requests per minute
        await (0, rate_limiter_1.rateLimit)(`notifications:mark-read:${userId}`, 20, 60);
        const body = (await c.req.json().catch(() => null));
        const notificationId = typeof body?.notificationId === 'string' ? body.notificationId : undefined;
        if (!notificationId) {
            return c.json({
                success: false,
                error: { type: 'validation', message: 'notificationId is required' },
            }, 400);
        }
        const notificationService = new notification_service_1.NotificationService(c.env.DB);
        const notification = await notificationService.markAsRead(notificationId, userId);
        return c.json({
            success: true,
            data: notification,
        });
    }
    catch (error) {
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
        const rawUserId = c.get('jwtPayload')?.id;
        const userId = ensureNumericUserId(rawUserId);
        if (!userId) {
            return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
        }
        // Rate limiting: 10 requests per minute
        await (0, rate_limiter_1.rateLimit)(`notifications:mark-all-read:${userId}`, 10, 60);
        const notificationService = new notification_service_1.NotificationService(c.env.DB);
        await notificationService.markAllAsRead(userId);
        return c.json({
            success: true,
            data: { message: 'All notifications marked as read' },
        });
    }
    catch (error) {
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
        const rawUserId = c.get('jwtPayload')?.id;
        const userId = ensureNumericUserId(rawUserId);
        if (!userId) {
            return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
        }
        const notificationId = c.req.param('id');
        // Rate limiting: 10 requests per minute
        await (0, rate_limiter_1.rateLimit)(`notifications:delete:${userId}`, 10, 60);
        const notificationService = new notification_service_1.NotificationService(c.env.DB);
        await notificationService.deleteNotification(notificationId, userId);
        return c.json({
            success: true,
            data: { message: 'Notification deleted successfully' },
        });
    }
    catch (error) {
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
        const rawUserId = c.get('jwtPayload')?.id;
        const userId = ensureNumericUserId(rawUserId);
        if (!userId) {
            return c.json({ success: false, error: { type: 'auth', message: 'Unauthorized' } }, 401);
        }
        // Rate limiting: 15 requests per minute
        await (0, rate_limiter_1.rateLimit)(`notifications:stats:${userId}`, 15, 60);
        const notificationService = new notification_service_1.NotificationService(c.env.DB);
        const stats = await notificationService.getNotificationStats(userId);
        return c.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Error fetching notification stats:', error);
        return c.json({
            success: false,
            error: { type: 'server', message: 'Internal server error' },
        }, 500);
    }
});
exports.default = app;
