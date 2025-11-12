'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.paginationSchema = exports.idSchema = void 0;
const zod_1 = require('zod');
exports.idSchema = zod_1.z.string().min(1);
exports.paginationSchema = zod_1.z
  .object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
    cursor: zod_1.z.string().optional(),
  })
  .strict();
