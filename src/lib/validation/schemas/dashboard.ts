import { z } from 'zod';

export const dashboardActionSchema = z
  .object({
    action: z.enum(['create_project', 'create_task', 'invite_member', 'view_docs']),
  })
  .strict();

export type DashboardActionInput = z.infer<typeof dashboardActionSchema>;
