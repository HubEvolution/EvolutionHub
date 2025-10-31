import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const voiceTranscribeParamsSchema = z
  .object({
    sessionId: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1)),
    jobId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    lang: z.preprocess(emptyToUndefined, z.string().min(1).max(10).optional()),
    isLastChunk: z
      .preprocess((v) => {
        if (typeof v === 'string') {
          const t = v.trim().toLowerCase();
          if (t === 'true' || t === '1' || t === 'on' || t === 'yes') return true;
          if (t === 'false' || t === '0' || t === 'off' || t === 'no') return false;
        }
        return emptyToUndefined(v);
      }, z.boolean().optional())
      .default(false),
  })
  .strict();

export type VoiceTranscribeParams = z.infer<typeof voiceTranscribeParamsSchema>;
