import { z } from 'zod';
import { ALLOWED_MODELS } from '@/config/ai-image';

const allowedSlugSet = new Set(ALLOWED_MODELS.map((m) => m.slug));

// Treat empty strings AND null/undefined as "not provided" so optional fields
// parsed from FormData don't fail validation when missing.
const emptyToUndefined = (v: unknown) => {
  if (v === null || typeof v === 'undefined') return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
};

export const aiImageParamsSchema = z
  .object({
    model: z
      .string()
      .min(1)
      .refine((v) => allowedSlugSet.has(v), 'Unsupported model'),
    scale: z.preprocess((val) => {
      const v = emptyToUndefined(val);
      if (typeof v === 'string') {
        const n = Number(v);
        if (!Number.isFinite(n)) return undefined;
        return n;
      }
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) return undefined;
        return v;
      }
      return v;
    }, z.union([z.undefined(), z.number().int().refine((n) => n === 2 || n === 4, "Unsupported value for 'scale'")])),
    face_enhance: z.preprocess((val) => {
      if (typeof val === 'string') {
        const v = val.trim().toLowerCase();
        if (v === 'true' || v === '1' || v === 'on' || v === 'yes') return true;
        if (v === 'false' || v === '0' || v === 'off' || v === 'no') return false;
      }
      return emptyToUndefined(val);
    }, z.union([z.undefined(), z.boolean()])),
    prompt: z.preprocess(
      emptyToUndefined,
      z.union([z.undefined(), z.string().min(1).max(500)])
    ),
    negative_prompt: z.preprocess(
      emptyToUndefined,
      z.union([z.undefined(), z.string().min(1).max(500)])
    ),
    strength: z.preprocess(
      emptyToUndefined,
      z.union([z.undefined(), z.coerce.number().min(0).max(1)])
    ),
    guidance: z.preprocess(
      emptyToUndefined,
      z.union([z.undefined(), z.coerce.number().min(1).max(12)])
    ),
    steps: z.preprocess(
      emptyToUndefined,
      z.union([z.undefined(), z.coerce.number().int().min(1).max(60)])
    ),
  })
  .strict()
  .superRefine((data, ctx) => {
    const model = ALLOWED_MODELS.find((m) => m.slug === data.model);
    if (!model) return;
    if (typeof data.scale !== 'undefined' && !model.supportsScale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scale'],
        message: "Unsupported parameter 'scale'",
      });
    }
    if (typeof data.face_enhance !== 'undefined' && !model.supportsFaceEnhance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['face_enhance'],
        message: "Unsupported parameter 'face_enhance'",
      });
    }
  });

export type AiImageParams = z.infer<typeof aiImageParamsSchema>;
