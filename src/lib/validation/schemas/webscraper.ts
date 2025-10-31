import { z } from 'zod';

// Schema for Webscraper API request body
// Keeps options optional and strictly typed with a few safe knobs.
export const webscraperRequestSchema = z
  .object({
    url: z.string().url(),
    options: z
      .object({
        selector: z.string().min(1).optional(),
        format: z.enum(['text', 'html', 'json']).optional(),
        maxDepth: z.number().int().min(0).max(3).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();