"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptInputSchema = exports.promptModeSchema = void 0;
const zod_1 = require("zod");
const prompt_enhancer_1 = require("@/config/prompt-enhancer");
exports.promptModeSchema = zod_1.z.enum(['agent', 'concise', 'creative', 'professional']);
exports.promptInputSchema = zod_1.z
    .object({
    text: zod_1.z.string().min(1).max(prompt_enhancer_1.TEXT_LENGTH_MAX),
    mode: exports.promptModeSchema.optional(),
    safety: zod_1.z.boolean().optional(),
    includeScores: zod_1.z.boolean().optional(),
    outputFormat: zod_1.z.enum(['markdown', 'json']).optional(),
})
    .strict();
