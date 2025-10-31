import { z } from 'zod';

export const internalUserSyncSchema = z.object({
  id: z.string().trim().min(1),
  email: z.string().email(),
  name: z.string().trim().min(1).optional(),
  image: z.string().trim().min(1).optional(),
});

export type InternalUserSyncInput = z.infer<typeof internalUserSyncSchema>;
