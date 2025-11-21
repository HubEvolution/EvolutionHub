import { z } from '@/lib/validation';

export const webEvalTaskIdParamSchema = z
  .object({
    id: z.string().trim().min(1, 'Task ID is required').max(128),
  })
  .strict();

const webEvalStepSchema = z
  .object({
    action: z.string().trim().min(1),
    timestamp: z.string().trim().min(1),
    selectorUsed: z.string().trim().min(1).optional(),
    screenshotKey: z.string().trim().min(1).optional(),
  })
  .strict();

const webEvalConsoleLogSchema = z
  .object({
    level: z.enum(['log', 'error', 'warn', 'info', 'debug']),
    message: z.string(),
    timestamp: z.string().trim().min(1),
  })
  .strict();

const webEvalNetworkRequestSchema = z
  .object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD']),
    url: z.string().trim().min(1),
    status: z.number().int().min(0),
    durationMs: z.number().int().min(0).optional(),
  })
  .strict();

const webEvalAssertionKindSchema = z.enum(['textIncludes', 'selectorExists']);

const webEvalAssertionDefinitionInputSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    kind: webEvalAssertionKindSchema,
    value: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
  })
  .strict();

const webEvalAssertionDefinitionSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: webEvalAssertionKindSchema,
    value: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
  })
  .strict();

const webEvalAssertionResultSchema = webEvalAssertionDefinitionSchema
  .extend({
    passed: z.boolean(),
    details: z.string().optional(),
  })
  .strict();

const webEvalVerdictSchema = z.enum(['pass', 'fail', 'inconclusive']);

export const webEvalTaskRequestSchema = z
  .object({
    url: z.string().url('Invalid URL format').max(2048),
    task: z.string().trim().min(5, 'Task must be at least 5 characters').max(500),
    headless: z.boolean().optional(),
    timeoutMs: z.number().int().min(1_000).max(300_000).optional(),
    assertions: z.array(webEvalAssertionDefinitionInputSchema).max(20).optional(),
  })
  .strict();

export const webEvalReportSchema = z
  .object({
    taskId: z.string().trim().min(1),
    url: z.string().trim().min(1),
    taskDescription: z.string().trim().min(1),
    success: z.boolean(),
    steps: z.array(webEvalStepSchema),
    consoleLogs: z.array(webEvalConsoleLogSchema),
    networkRequests: z.array(webEvalNetworkRequestSchema),
    errors: z.array(z.string()),
    durationMs: z.number().int().min(0),
    startedAt: z.string().trim().min(1),
    finishedAt: z.string().trim().min(1),
    verdict: webEvalVerdictSchema.optional(),
    assertions: z.array(webEvalAssertionResultSchema).optional(),
  })
  .strict();

export const webEvalCompletionSchema = z
  .object({
    status: z.enum(['completed', 'failed']),
    report: webEvalReportSchema,
    error: z.string().optional(),
  })
  .strict();

export type WebEvalTaskRequestInput = z.input<typeof webEvalTaskRequestSchema>;
export type WebEvalTaskRequest = z.infer<typeof webEvalTaskRequestSchema>;
export type WebEvalTaskIdParamInput = z.input<typeof webEvalTaskIdParamSchema>;
export type WebEvalTaskIdParam = z.infer<typeof webEvalTaskIdParamSchema>;
export type WebEvalReportInput = z.input<typeof webEvalReportSchema>;
export type WebEvalReportPayload = z.infer<typeof webEvalReportSchema>;
export type WebEvalCompletionInput = z.input<typeof webEvalCompletionSchema>;
export type WebEvalCompletionPayload = z.infer<typeof webEvalCompletionSchema>;
export type WebEvalAssertionDefinitionInput = z.input<typeof webEvalAssertionDefinitionInputSchema>;
export type WebEvalAssertionResultInput = z.input<typeof webEvalAssertionResultSchema>;
export type WebEvalAssertionResultPayload = z.infer<typeof webEvalAssertionResultSchema>;
