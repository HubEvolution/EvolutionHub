import { z } from 'zod';

export const videoTierSchema = z.enum(['720p', '1080p']);

export const videoUploadSchema = z.object({
  tier: videoTierSchema,
  durationMs: z.coerce.number().int().min(1),
});

export const videoGenerateSchema = z.object({
  key: z.string().min(1),
  tier: videoTierSchema,
});

export const videoJobIdSchema = z.object({
  id: z.string().min(1), // keep flexible; can refine to uuid if needed
});
