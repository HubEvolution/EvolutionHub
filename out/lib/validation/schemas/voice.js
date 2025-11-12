'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.voiceTranscribeParamsSchema = void 0;
const zod_1 = require('zod');
const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
exports.voiceTranscribeParamsSchema = zod_1.z
  .object({
    sessionId: zod_1.z.preprocess(
      (v) => (typeof v === 'string' ? v.trim() : v),
      zod_1.z.string().min(1)
    ),
    jobId: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().min(1).optional()),
    lang: zod_1.z.preprocess(emptyToUndefined, zod_1.z.string().min(1).max(10).optional()),
    isLastChunk: zod_1.z
      .preprocess((v) => {
        if (typeof v === 'string') {
          const t = v.trim().toLowerCase();
          if (t === 'true' || t === '1' || t === 'on' || t === 'yes') return true;
          if (t === 'false' || t === '0' || t === 'off' || t === 'no') return false;
        }
        return emptyToUndefined(v);
      }, zod_1.z.boolean().optional())
      .default(false),
  })
  .strict();
