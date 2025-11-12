'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.videoJobIdSchema =
  exports.videoGenerateSchema =
  exports.videoUploadSchema =
  exports.videoTierSchema =
    void 0;
const zod_1 = require('zod');
exports.videoTierSchema = zod_1.z.enum(['720p', '1080p']);
exports.videoUploadSchema = zod_1.z.object({
  tier: exports.videoTierSchema,
  durationMs: zod_1.z.coerce.number().int().min(1),
});
exports.videoGenerateSchema = zod_1.z.object({
  key: zod_1.z.string().min(1),
  tier: exports.videoTierSchema,
});
exports.videoJobIdSchema = zod_1.z.object({
  id: zod_1.z.string().min(1), // keep flexible; can refine to uuid if needed
});
