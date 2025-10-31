import { z } from 'zod';

export const idSchema = z.string().min(1);

export const paginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
  })
  .strict();
