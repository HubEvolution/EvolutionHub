'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.aiImageParamsSchema = void 0;
const zod_1 = require('zod');
const ai_image_1 = require('@/config/ai-image');
const allowedSlugSet = new Set(ai_image_1.ALLOWED_MODELS.map((m) => m.slug));
// Treat empty strings AND null/undefined as "not provided" so optional fields
// parsed from FormData don't fail validation when missing.
const emptyToUndefined = (v) => {
  if (v === null || typeof v === 'undefined') return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
};
exports.aiImageParamsSchema = zod_1.z
  .object({
    model: zod_1.z
      .string()
      .min(1)
      .refine((v) => allowedSlugSet.has(v), 'Unsupported model'),
    scale: zod_1.z.preprocess(
      (val) => {
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
      },
      zod_1.z.union([
        zod_1.z.undefined(),
        zod_1.z
          .number()
          .int()
          .refine((n) => n === 2 || n === 4, "Unsupported value for 'scale'"),
      ])
    ),
    face_enhance: zod_1.z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          const v = val.trim().toLowerCase();
          if (v === 'true' || v === '1' || v === 'on' || v === 'yes') return true;
          if (v === 'false' || v === '0' || v === 'off' || v === 'no') return false;
        }
        return emptyToUndefined(val);
      },
      zod_1.z.union([zod_1.z.undefined(), zod_1.z.boolean()])
    ),
    prompt: zod_1.z.preprocess(
      emptyToUndefined,
      zod_1.z.union([zod_1.z.undefined(), zod_1.z.string().min(1).max(500)])
    ),
    negative_prompt: zod_1.z.preprocess(
      emptyToUndefined,
      zod_1.z.union([zod_1.z.undefined(), zod_1.z.string().min(1).max(500)])
    ),
    strength: zod_1.z.preprocess(
      emptyToUndefined,
      zod_1.z.union([zod_1.z.undefined(), zod_1.z.coerce.number().min(0).max(1)])
    ),
    guidance: zod_1.z.preprocess(
      emptyToUndefined,
      zod_1.z.union([zod_1.z.undefined(), zod_1.z.coerce.number().min(1).max(12)])
    ),
    steps: zod_1.z.preprocess(
      emptyToUndefined,
      zod_1.z.union([zod_1.z.undefined(), zod_1.z.coerce.number().int().min(1).max(60)])
    ),
  })
  .strict()
  .superRefine((data, ctx) => {
    const model = ai_image_1.ALLOWED_MODELS.find((m) => m.slug === data.model);
    if (!model) return;
    if (typeof data.scale !== 'undefined' && !model.supportsScale) {
      ctx.addIssue({
        code: zod_1.z.ZodIssueCode.custom,
        path: ['scale'],
        message: "Unsupported parameter 'scale'",
      });
    }
    if (typeof data.face_enhance !== 'undefined' && !model.supportsFaceEnhance) {
      ctx.addIssue({
        code: zod_1.z.ZodIssueCode.custom,
        path: ['face_enhance'],
        message: "Unsupported parameter 'face_enhance'",
      });
    }
  });
