import { withAuthApiMiddleware, createApiError, createApiSuccess } from '@/lib/api-middleware';
import { rateLimit } from '@/lib/rate-limiter';
import { handleServiceError, resolveNotificationService, resolveUserId } from './utils';

export const POST = withAuthApiMiddleware(
  async (context) => {
    const userId = resolveUserId(context);
    if (!userId) {
      return createApiError('auth_error', 'Unauthorized');
    }

    try {
      await rateLimit(`notifications:settings:init:${userId}`, 5, 3600);

      const notificationService = resolveNotificationService(context);

      await notificationService.initializeDefaultSettings(userId);
      const settings = await notificationService.getUserNotificationSettings(userId);

      return createApiSuccess(settings);
    } catch (error) {
      return handleServiceError(error);
    }
  },
  {
    requireSameOriginForUnsafeMethods: true,
  }
);
