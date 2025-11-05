"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSetPlanRequestSchema = void 0;
const zod_1 = require("zod");
exports.adminSetPlanRequestSchema = zod_1.z
    .object({
    email: zod_1.z.string().email().trim().optional(),
    userId: zod_1.z.string().trim().min(1).optional(),
    plan: zod_1.z.enum(['free', 'pro', 'premium', 'enterprise']),
    reason: zod_1.z.string().trim().max(500).optional(),
    interval: zod_1.z.enum(['monthly', 'annual']).optional(),
    prorationBehavior: zod_1.z.enum(['create_prorations', 'none']).optional(),
    cancelAtPeriodEnd: zod_1.z.boolean().optional(),
    cancelImmediately: zod_1.z.boolean().optional(),
})
    .refine((v) => !!v.email !== !!v.userId, {
    message: 'Provide exactly one of email or userId',
    path: ['email'],
});
