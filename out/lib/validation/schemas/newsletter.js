"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsletterUnsubscribeSchema = exports.newsletterSubscribeSchema = void 0;
const zod_1 = require("zod");
exports.newsletterSubscribeSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().trim().min(1).max(100).optional(),
    consent: zod_1.z.literal(true),
    source: zod_1.z.string().trim().min(1).max(100).optional(),
});
exports.newsletterUnsubscribeSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
