import { z, formatZodError } from '@/lib/validation';
import {
  createApiError,
  createApiSuccess,
  createMethodNotAllowed,
  withAuthApiMiddleware,
} from '@/lib/api-middleware';
import { rateLimit } from '@/lib/rate-limiter';
import { handleServiceError, resolveNotificationService, resolveUserId } from './utils';

const NOTIFICATION_TYPES = [
  'comment_reply',
  'comment_mention',
  'comment_approved',
  'comment_rejected',
  'system',
] as const;

const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push'] as const;
const NOTIFICATION_FREQUENCIES = ['immediate', 'daily', 'weekly', 'never'] as const;

const updateSettingsSchema = z
  .object({
    type: z.enum([...NOTIFICATION_TYPES, 'email_digest'] as const),
    channel: z.enum(NOTIFICATION_CHANNELS),
    enabled: z.coerce.boolean(),
    frequency: z.enum(NOTIFICATION_FREQUENCIES).optional(),
  })
  .strict();

type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const GET = withAuthApiMiddleware(async (context) => {
  try {
    const userId = resolveUserId(context);
    if (!userId) {
      return createApiError('auth_error', 'Unauthorized');
    }

    await rateLimit(`notifications:settings:${userId}`, 20, 60, {
      env: (context.locals as any)?.runtime?.env as Record<string, unknown>,
    });

    const notificationService = resolveNotificationService(context);
    const settings = await notificationService.getUserNotificationSettings(userId);

    return createApiSuccess(settings);
  } catch (error) {
    return handleServiceError(error);
  }
});

export const POST = withAuthApiMiddleware(
  async (context) => {
    const userId = resolveUserId(context);
    if (!userId) {
      return createApiError('auth_error', 'Unauthorized');
    }

    const rawBody: unknown = await context.request.json().catch(() => null);
    const parsed = updateSettingsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid request payload', {
        details: formatZodError(parsed.error),
      });
    }

    const payload: UpdateSettingsInput = parsed.data;

    try {
      await rateLimit(`notifications:settings:update:${userId}`, 10, 60, {
        env: (context.locals as any)?.runtime?.env as Record<string, unknown>,
      });

      const notificationService = resolveNotificationService(context);
      await notificationService.updateNotificationSettings(userId, {
        type: payload.type,
        channel: payload.channel,
        enabled: payload.enabled,
        frequency: payload.frequency ?? 'immediate',
      });

      return createApiSuccess({});
    } catch (error) {
      return handleServiceError(error);
    }
  },
  {
    requireSameOriginForUnsafeMethods: true,
  }
);

const methodNotAllowed = () => createMethodNotAllowed('GET, POST');
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
