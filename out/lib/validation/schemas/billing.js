"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingCancelRequestSchema = exports.billingCreditsRequestSchema = void 0;
const zod_1 = require("zod");
exports.billingCreditsRequestSchema = zod_1.z.object({
    pack: zod_1.z.union([zod_1.z.literal(100), zod_1.z.literal(500), zod_1.z.literal(1500)]),
    workspaceId: zod_1.z.string().trim().min(1).max(100).optional(),
    returnTo: zod_1.z.string().trim().max(300).optional(),
});
exports.billingCancelRequestSchema = zod_1.z.object({
    subscriptionId: zod_1.z.string().trim().min(1),
});
