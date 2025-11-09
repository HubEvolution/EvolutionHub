import { z } from 'zod';

const backupJobTypes = ['full', 'comments', 'users', 'incremental'] as const;
const maintenanceTypes = ['cleanup', 'optimization', 'migration', 'repair'] as const;

export const backupJobsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .strict();

export const maintenanceJobsQuerySchema = backupJobsQuerySchema;

export const backupJobIdParamSchema = z
  .object({
    id: z.string().trim().min(1, 'Job ID is required'),
  })
  .strict();

export const maintenanceJobIdParamSchema = z
  .object({
    id: z.string().trim().min(1, 'Maintenance ID is required'),
  })
  .strict();

export const backupCreateSchema = z
  .object({
    type: z.enum(backupJobTypes, {
      errorMap: () => ({ message: 'Invalid backup type' }),
    }),
    tables: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export const backupScheduleSchema = z
  .object({
    type: z.enum(backupJobTypes, {
      errorMap: () => ({ message: 'Invalid backup type' }),
    }),
    cronExpression: z.string().trim().min(1, 'Cron expression is required'),
  })
  .strict();

export const backupCleanupSchema = z
  .object({
    retentionDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .strict();

export const maintenancePerformSchema = z
  .object({
    type: z.enum(maintenanceTypes, {
      errorMap: () => ({ message: 'Invalid maintenance type' }),
    }),
    description: z.string().trim().min(1, 'Description is required'),
  })
  .strict();

export const backupVerifyParamSchema = z
  .object({
    id: z.string().trim().min(1, 'Backup ID is required'),
  })
  .strict();

export type BackupJobsQueryInput = z.input<typeof backupJobsQuerySchema>;
export type MaintenanceJobsQueryInput = z.input<typeof maintenanceJobsQuerySchema>;
export type BackupCreateInput = z.input<typeof backupCreateSchema>;
export type BackupScheduleInput = z.input<typeof backupScheduleSchema>;
export type BackupCleanupInput = z.input<typeof backupCleanupSchema>;
export type MaintenancePerformInput = z.input<typeof maintenancePerformSchema>;
export type MaintenanceJobIdParamInput = z.input<typeof maintenanceJobIdParamSchema>;
