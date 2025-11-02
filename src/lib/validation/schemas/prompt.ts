import { z } from 'zod';
import { TEXT_LENGTH_MAX } from '@/config/prompt-enhancer';

export const promptModeSchema = z.enum(['agent', 'concise', 'creative', 'professional']);

export const promptInputSchema = z
  .object({
    text: z.string().min(1).max(TEXT_LENGTH_MAX),
    mode: promptModeSchema.optional(),
    safety: z.boolean().optional(),
    includeScores: z.boolean().optional(),
    outputFormat: z.enum(['markdown', 'json']).optional(),
  })
  .strict();

export type PromptInput = z.infer<typeof promptInputSchema>;
