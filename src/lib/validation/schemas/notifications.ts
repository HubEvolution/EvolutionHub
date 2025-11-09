import { z } from 'zod';

import type {
  NotificationFilters,
  NotificationPriority,
  NotificationType,
} from '@/lib/types/notifications';

const notificationTypeSchema = z.enum([
  'comment_reply',
  'comment_mention',
  'comment_approved',
  'comment_rejected',
  'system',
] as const satisfies readonly NotificationType[]);

const notificationPrioritySchema = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
] as const satisfies readonly NotificationPriority[]);

const optionalBooleanFromString = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

const optionalNumberFromString = (options: { min?: number; max?: number } = {}) =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }, z.number().int().optional())
    .superRefine((num, ctx) => {
      if (num === undefined) return;
      if (Number.isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected a numeric value',
        });
        return;
      }
      if (typeof options.min === 'number' && num < options.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: options.min,
          type: 'number',
          inclusive: true,
        });
      }
      if (typeof options.max === 'number' && num > options.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: options.max,
          type: 'number',
          inclusive: true,
        });
      }
    });

export const notificationsListQuerySchema = z
  .object({
    type: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      return value;
    }, notificationTypeSchema.optional()),
    isRead: optionalBooleanFromString,
    priority: z.preprocess((value) => {
      if (value === undefined || value === null || value === '') return undefined;
      return value;
    }, notificationPrioritySchema.optional()),
    limit: optionalNumberFromString({ min: 1, max: 100 }).default(20),
    offset: optionalNumberFromString({ min: 0 }).default(0),
    startDate: optionalNumberFromString(),
    endDate: optionalNumberFromString(),
  })
  .strict()
  .transform((value) => {
    const filters: NotificationFilters = {
      type: value.type,
      isRead: value.isRead,
      priority: value.priority,
      limit: value.limit,
      offset: value.offset,
      startDate: value.startDate,
      endDate: value.endDate,
    };
    return filters;
  });

export type NotificationsListQueryInput = z.input<typeof notificationsListQuerySchema>;
export type NotificationsListQuery = NotificationFilters;

export const markNotificationReadSchema = z
  .object({
    notificationId: z.string().trim().min(1, 'notificationId is required'),
  })
  .strict();

export const notificationIdPathSchema = z
  .object({
    id: z.string().trim().min(1, 'Notification id is required'),
  })
  .strict();

export const notificationsEmptyBodySchema = z.object({}).strict();
