import { z } from 'zod';

export const templateSaveSchema = z.object({
  templateId: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  prompt: z.string().trim().min(1).max(5000),
});

export type TemplateSaveInput = z.infer<typeof templateSaveSchema>;
