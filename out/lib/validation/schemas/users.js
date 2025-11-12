'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.internalUserSyncSchema = void 0;
const zod_1 = require('zod');
exports.internalUserSyncSchema = zod_1.z.object({
  id: zod_1.z.string().trim().min(1),
  email: zod_1.z.string().email(),
  name: zod_1.z.string().trim().min(1).optional(),
  image: zod_1.z.string().trim().min(1).optional(),
});
