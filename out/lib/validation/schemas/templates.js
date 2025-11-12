'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.templateSaveSchema = void 0;
const zod_1 = require('zod');
exports.templateSaveSchema = zod_1.z.object({
  templateId: zod_1.z.string().trim().min(1).max(100),
  name: zod_1.z.string().trim().min(1).max(200),
  description: zod_1.z.string().trim().min(1).max(500),
  prompt: zod_1.z.string().trim().min(1).max(5000),
});
