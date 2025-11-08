"use strict";
/**
 * Prompt Enhancer Service
 *
 * Core service for transforming raw text inputs into structured, agent-ready prompts.
 * Implements modular pipeline: parse, structure, rewrite, safety, score.
 * Tracks usage via KV for guests/users with daily quotas.
 * Includes telemetry logs and env flag for safety.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptEnhancerService = void 0;
const logger_factory_1 = require("@/server/utils/logger-factory");
const logger_utils_1 = require("@/lib/services/logger-utils");
const openai_1 = require("openai");
const provider_error_1 = require("@/lib/services/provider-error");
const prompt_enhancer_1 = require("@/config/prompt-enhancer");
const prompt_attachments_1 = require("@/lib/services/prompt-attachments");
const usage_1 = require("@/lib/kv/usage");
class PromptEnhancerService {
    constructor(env) {
        this.env = env;
        this.log = logger_factory_1.loggerFactory.createLogger('prompt-enhancer-service');
        this.enableSafety = this.env.ENABLE_PROMPT_SAFETY !== 'false';
        this.publicFlag = this.env.PUBLIC_PROMPT_ENHANCER_V1 !== 'false';
        this.rewriteEnabled = this.env.PROMPT_REWRITE_V1 !== 'false';
    }
    // Safe logger helpers (tests may mock logger without full interface)
    logInfo(event, context) {
        logger_utils_1.loggerHelpers.info(this.log, event, context);
    }
    logWarn(event, context) {
        logger_utils_1.loggerHelpers.warn(this.log, event, context);
    }
    logError(event, context) {
        logger_utils_1.loggerHelpers.error(this.log, event, context);
    }
    logDebug(event, context) {
        logger_utils_1.loggerHelpers.debug(this.log, event, context);
    }
    detectLanguage(text) {
        try {
            const t = text.toLowerCase();
            const germanHits = (t.match(/\b(und|oder|nicht|ein|eine|erstellen|erstelle|spiel|schlange|konsole|ziel|anforderungen)\b|[äöüß]/g) || []).length;
            const englishHits = (t.match(/\b(and|or|not|create|build|game|snake|console|goal|requirements)\b/g) || []).length;
            return germanHits > englishHits ? 'de' : 'en';
        }
        catch {
            return 'en';
        }
    }
    getTextModel() {
        return this.env.PROMPT_TEXT_MODEL || prompt_enhancer_1.DEFAULT_TEXT_MODEL;
    }
    getVisionModel() {
        return this.env.PROMPT_VISION_MODEL || prompt_enhancer_1.DEFAULT_VISION_MODEL;
    }
    getGenParams() {
        return {
            max_tokens: Number(this.env.PROMPT_OUTPUT_TOKENS_MAX || prompt_enhancer_1.OUTPUT_TOKENS_MAX),
            temperature: Number(this.env.PROMPT_TEMPERATURE || prompt_enhancer_1.TEMPERATURE),
            top_p: Number(this.env.PROMPT_TOP_P || prompt_enhancer_1.TOP_P),
        };
    }
    async incrementPathMetric(pathType) {
        try {
            if (this.env.PROMPT_METRICS_V1 === 'false')
                return;
            const kv = this.env.KV_PROMPT_ENHANCER;
            if (!kv)
                return;
            const d = new Date();
            const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
            const key = `prompt:metrics:path:${pathType}:${ymd}`;
            const raw = await kv.get(key);
            const count = raw ? parseInt(raw, 10) || 0 : 0;
            await kv.put(key, String(count + 1), { expirationTtl: 7 * 24 * 60 * 60 }); // keep a week
        }
        catch {
            // swallow metric errors
        }
    }
    async getUsage(ownerType, ownerId, userLimit, guestLimit) {
        const limit = ownerType === 'user' ? userLimit : guestLimit;
        const kv = this.env.KV_PROMPT_ENHANCER;
        if (!kv)
            return { used: 0, limit, resetAt: null };
        const useV2 = this.env.USAGE_KV_V2 === '1';
        if (useV2) {
            const keyV2 = (0, usage_1.rollingDailyKey)('prompt', ownerType, ownerId);
            const usage = await (0, usage_1.getUsage)(kv, keyV2);
            if (!usage)
                return { used: 0, limit, resetAt: null };
            return { used: usage.count, limit, resetAt: usage.resetAt ? usage.resetAt * 1000 : null };
        }
        const key = `prompt:usage:${ownerType}:${ownerId}`;
        const raw = await kv.get(key);
        if (!raw)
            return { used: 0, limit, resetAt: null };
        try {
            const parsed = JSON.parse(raw);
            return { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
        }
        catch {
            return { used: 0, limit, resetAt: null };
        }
    }
    async incrementUsage(ownerType, ownerId, limit) {
        const kv = this.env.KV_PROMPT_ENHANCER;
        if (!kv)
            return { used: 1, limit, resetAt: null };
        const useV2 = this.env.USAGE_KV_V2 === '1';
        if (useV2) {
            const res = await (0, usage_1.incrementDailyRolling)(kv, 'prompt', ownerType, ownerId, limit);
            return { used: res.usage.count, limit, resetAt: res.usage.resetAt * 1000 };
        }
        const key = `prompt:usage:${ownerType}:${ownerId}`;
        const now = Date.now();
        const windowMs = 24 * 60 * 60 * 1000;
        const resetAt = now + windowMs;
        const raw = await kv.get(key);
        let count = 0;
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                count = parsed.count || 0;
            }
            catch {
                count = 0;
            }
        }
        count += 1;
        const value = JSON.stringify({ count, resetAt });
        const expiration = Math.floor(resetAt / 1000);
        await kv.put(key, value, { expiration });
        return { used: count, limit, resetAt };
    }
    async parseInput(text) {
        const lowerText = text.toLowerCase();
        let intent = 'generate';
        const keywords = [];
        // Normalize tokens: strip punctuation, keep letters/numbers/umlauts/hyphen/underscore
        const rawTokens = lowerText.split(/\s+/).map((w) => w.replace(/[^a-z0-9äöüß_-]+/gi, ''));
        const words = rawTokens.filter((w) => w.length > 3);
        const isComplex = words.length > 50 || text.length > 200;
        let aiUsed = false;
        // Fallback rule-based parsing
        if (lowerText.includes('schreibe') ||
            lowerText.includes('generate') ||
            lowerText.includes('write')) {
            intent = 'generate';
        }
        else if (lowerText.includes('analysiere') || lowerText.includes('analyze')) {
            intent = 'analyze';
        }
        else if (lowerText.includes('übersetze') || lowerText.includes('translate')) {
            intent = 'translate';
        }
        const uniqueKeywords = [...new Set(words.slice(0, 10))];
        keywords.push(...uniqueKeywords);
        // AI-enhanced intent detection if available
        if (this.env.OPENAI_API_KEY) {
            try {
                const openai = new openai_1.default({ apiKey: this.env.OPENAI_API_KEY });
                const prompt = `Classify the intent of this text as 'generate', 'analyze', 'translate', or 'other': "${text}". Respond only with JSON: {"intent": "generate"}`;
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 20,
                });
                const isChatCompletion = (v) => {
                    return (!!v &&
                        typeof v === 'object' &&
                        v !== null &&
                        'choices' in v);
                };
                const response = isChatCompletion(completion)
                    ? Array.isArray(completion.choices) && completion.choices.length > 0
                        ? completion.choices[0]?.message?.content?.trim()
                        : ''
                    : '';
                if (response) {
                    const parsed = JSON.parse(response);
                    if (parsed.intent &&
                        ['generate', 'analyze', 'translate', 'other'].includes(parsed.intent)) {
                        intent = parsed.intent;
                        aiUsed = true;
                        this.logDebug('ai_intent_detected', {
                            metadata: {
                                inputLength: text.length,
                                intent,
                                aiModel: 'gpt-4o-mini',
                            },
                        });
                    }
                }
            }
            catch (error) {
                this.logWarn('ai_intent_failed', {
                    metadata: {
                        inputLength: text.length,
                        error: error.message,
                    },
                });
                // Fallback to rule-based
            }
        }
        return { intent, keywords, isComplex, aiUsed };
    }
    structurePrompt(parsed, rawText) {
        const { intent, keywords, isComplex } = parsed;
        const isCode = /\b(python|java|typescript|javascript|node|c\+\+|c#|go|rust|ruby|php|swift|kotlin|dart|bash|shell|script|programm|code|spiel|game|app|api|web|cli)\b/i.test(rawText);
        const role = isCode
            ? 'You are a senior software engineer and clean coder.'
            : intent === 'analyze'
                ? 'You are a precise analyst.'
                : 'You are an expert prompt engineer.';
        const objective = isCode
            ? `Design and implement a small, testable MVP for: ${keywords.slice(0, 8).join(', ') || rawText.substring(0, 120)}`
            : `Perform ${intent} task based on: ${keywords.slice(0, 8).join(', ') || rawText.substring(0, 120)}`;
        const constraints = isCode
            ? 'Small MVP; idiomatic code; no paid deps unless specified; clear module structure; input validation and error handling; reproducible setup; minimal comments; readable; mask any PII.'
            : 'Keep response clear and concise; cite sources if applicable; limit to 1000 words; mask any PII.';
        const outputFormat = 'Markdown with sections: Role, Goal, Requirements, Constraints, Step-by-step Plan, Output Format, Acceptance Criteria.';
        const steps = isCode
            ? [
                'Define scope and constraints.',
                'Plan modules and data structures.',
                'Set up project scaffolding.',
                'Implement core functionality.',
                'Add input handling and errors.',
                'Write a minimal test.',
                'Provide run instructions.',
            ]
            : isComplex
                ? [
                    'Understand the input.',
                    'Plan the structure.',
                    'Generate content.',
                    'Review for accuracy.',
                    'Format output.',
                ]
                : undefined;
        const fewShotExamples = isComplex
            ? [
                'Example 1: Create a clear outline with sections (Intro, Key Points, Conclusion).',
                'Example 2: Provide 3 bullet points summarizing the main ideas.',
            ]
            : undefined;
        return {
            role,
            objective,
            constraints,
            outputFormat,
            steps,
            fewShotExamples,
            rawText,
        };
    }
    rewriteMode(prompt, mode) {
        if (mode === 'concise') {
            prompt.constraints = prompt.constraints.replace('limit to 1000 words', 'keep under 500 words');
            if (prompt.steps)
                prompt.steps = prompt.steps.slice(0, 3);
        }
        else {
            prompt.constraints += ' Collaborate as needed; think step-by-step.';
            if (!prompt.steps)
                prompt.steps = ['Plan', 'Execute', 'Review'];
        }
        return prompt;
    }
    applySafety(text, enableSafety) {
        if (!enableSafety) {
            return { cleaned: text, report: { masked: [], types: [] } };
        }
        let match;
        let cleaned = text;
        const masked = [];
        const types = [];
        // Mask addresses (e.g., "Strasse 123" or "Street HouseNumber")
        const addressRegex = /(\d+\s+[A-Za-zäöüÄÖÜß]+(?:str|straße|street|haus|house|plz|zip)[^.,;]*)/gi;
        while ((match = addressRegex.exec(text)) !== null) {
            masked.push(String(match[1]).trim());
            types.push('address');
            cleaned = cleaned.replace(match[1], '[REDACTED]');
        }
        // Mask IDs (e.g., user IDs, reference numbers)
        const idRegex = /(?:ID|id):\s*[\w-]+|user_\d+|ref_\w+/gi;
        while ((match = idRegex.exec(text)) !== null) {
            masked.push(String(match[0]).trim());
            types.push('id');
            cleaned = cleaned.replace(match[0], '[REDACTED]');
        }
        // Mask emails
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
        while ((match = emailRegex.exec(text)) !== null) {
            masked.push(String(match[0]).trim());
            types.push('email');
            cleaned = cleaned.replace(match[0], '[REDACTED]');
        }
        // Mask phones
        const phoneRegex = /(\+?[\d\s\-()]{10,})/g;
        while ((match = phoneRegex.exec(text)) !== null) {
            masked.push(String(match[1]).trim());
            types.push('phone');
            cleaned = cleaned.replace(match[1], '[REDACTED]');
        }
        const report = { masked, types };
        return { cleaned, report };
    }
    calculateScores(prompt, _inputText, parsed) {
        const sections = Object.keys(prompt).length - 1; // Exclude rawText
        const clarity = Math.min(1, (sections / 6) * 1.25); // Max 1.0 for full structure
        let specificity = Math.min(1, prompt.objective.split(' ').length / 20); // Keyword density
        const testability = prompt.steps && prompt.steps.length > 0 ? 0.8 : 0.5;
        // Boost specificity if AI was used for better intent detection
        if (parsed?.aiUsed) {
            specificity = Math.min(1, specificity + 0.1);
        }
        return { clarity, specificity, testability };
    }
    composeRewriteMessages(inputText, mode, attachment) {
        const systemParts = [];
        const lang = this.detectLanguage(inputText);
        systemParts.push("You are a prompt engineer. Rewrite the user's prompt into a high-quality, actionable prompt while preserving the original intent and constraints. Output only the enhanced prompt text in Markdown (no preamble). Prefer structured sections.");
        // Enforce explicit output language instead of implicit "same language"
        systemParts.push(lang === 'de' ? 'Antworte ausschließlich auf Deutsch.' : 'Respond in English only.');
        if (attachment &&
            (attachment.texts.length || attachment.images.length || attachment.pdfs.length)) {
            systemParts.push('Use attachments only to resolve ambiguity. Never expose raw PII; summarize safely.');
        }
        if (mode === 'concise') {
            systemParts.push('Produce a compact prompt under ~120 words with the minimal sections: Role, Goal, Requirements, Output.');
        }
        else {
            systemParts.push('Produce a structured prompt with sections: Role, Goal, Context (optional), Requirements, Constraints, Step-by-step Plan, Output Format, Acceptance Criteria. When the task is about software/code, include language and version, libraries/constraints, I/O interface, error handling, testing requirements, and run instructions.');
        }
        const userTextHeader = 'Enhance this prompt. Reply with only the enhanced prompt in Markdown:';
        const content = [{ type: 'text', text: `${userTextHeader}\n\n${inputText}` }];
        // Attach text snippets
        if (attachment && attachment.texts.length) {
            const lines = ['\nAttachment context (summaries/snippets):'];
            for (const t of attachment.texts) {
                lines.push(`- ${t.filename}: ${t.text}`);
            }
            content.push({ type: 'text', text: lines.join('\n') });
        }
        // Attach images as vision inputs
        if (attachment && attachment.images.length) {
            for (const img of attachment.images) {
                content.push({ type: 'image_url', image_url: { url: img.dataUrl } });
            }
        }
        const model = attachment && attachment.images.length ? this.getVisionModel() : this.getTextModel();
        return {
            model,
            messages: [
                { role: 'system', content: systemParts.join(' ') },
                { role: 'user', content },
            ],
            ...this.getGenParams(),
        };
    }
    async callRewriteLLM(inputText, mode, attachment) {
        if (!this.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY missing');
        }
        const client = new openai_1.default({ apiKey: this.env.OPENAI_API_KEY });
        try {
            // If PDFs exist (and have file IDs or files), use Responses API with file_search
            const hasPdfs = !!(attachment && attachment.pdfs && attachment.pdfs.length);
            const hasImages = !!(attachment && attachment.images && attachment.images.length);
            if (hasPdfs && !hasImages) {
                // Upload PDFs first (idempotent if fileId already set)
                await (0, prompt_attachments_1.uploadPdfFilesToProvider)({
                    files: client.files,
                }, attachment, this.log);
                const systemParts = [];
                systemParts.push("You rewrite user prompts into clearer, more specific, policy-compliant prompts. Preserve the user's intent. Do not invent requirements. Respond in the same language as the input. Output only the enhanced prompt (no quotes, no lists, no explanations).");
                if (mode === 'concise') {
                    systemParts.push('Be succinct and unambiguous; remove filler; target under ~120 words unless essential.');
                }
                else {
                    systemParts.push('Use precise, actionable phrasing; add conservative clarifications; avoid adding new facts.');
                }
                const textBlocks = [];
                textBlocks.push('Enhance this prompt. Reply with only the enhanced prompt:\n');
                textBlocks.push(inputText);
                if (attachment && attachment.texts.length) {
                    const lines = ['\nAttachment context (summaries/snippets):'];
                    for (const t of attachment.texts)
                        lines.push(`- ${t.filename}: ${t.text}`);
                    textBlocks.push(lines.join('\n'));
                }
                // Build attachments for file_search
                const attachments = [];
                for (const pdf of attachment.pdfs) {
                    if (pdf.fileId)
                        attachments.push({ file_id: pdf.fileId, tools: [{ type: 'file_search' }] });
                }
                const resp = await client.responses.create({
                    model: this.getTextModel(),
                    input: [
                        {
                            role: 'system',
                            content: [{ type: 'input_text', text: systemParts.join(' ') }],
                        },
                        {
                            role: 'user',
                            content: [{ type: 'input_text', text: textBlocks.join('\n\n') }],
                            attachments,
                        },
                    ],
                    max_output_tokens: this.getGenParams().max_tokens,
                    temperature: this.getGenParams().temperature,
                    top_p: this.getGenParams().top_p,
                    tools: [{ type: 'file_search' }],
                });
                const out = resp;
                const tryOutputText = typeof out.output_text === 'string' ? out.output_text : undefined;
                if (tryOutputText && typeof tryOutputText === 'string')
                    return { text: tryOutputText.trim(), pathType: 'llm_file_search' };
                // Fallback parse for nested output format
                const maybeText = (() => {
                    const output = out.output;
                    if (Array.isArray(output) && output.length > 0) {
                        const c0 = output[0].content;
                        if (Array.isArray(c0) && c0.length > 0) {
                            const t = c0.find((c) => typeof c === 'object' &&
                                c !== null &&
                                'type' in c &&
                                (c.type === 'output_text' ||
                                    c.type === 'text'));
                            if (t &&
                                typeof t.text === 'object' &&
                                t.text !== null &&
                                'value' in t.text) {
                                const v = t.text.value;
                                if (typeof v === 'string')
                                    return v;
                            }
                            if (t && typeof t.text === 'string')
                                return t.text;
                        }
                    }
                    return '';
                })();
                return { text: (maybeText || '').trim(), pathType: 'llm_file_search' };
            }
            // Default path (no PDFs or images present): chat.completions (with optional images via composeRewriteMessages)
            const params = this.composeRewriteMessages(inputText, mode, attachment);
            const completion = await client.chat.completions.create(params);
            const isChatCompletion = (v) => {
                return (!!v && typeof v === 'object' && v !== null && 'choices' in v);
            };
            let raw = '';
            if (isChatCompletion(completion) &&
                Array.isArray(completion.choices) &&
                completion.choices.length > 0) {
                const txt = completion.choices[0]?.message?.content;
                raw = typeof txt === 'string' ? txt : '';
            }
            const text = (raw || '').trim();
            const pathType = attachment && attachment.images && attachment.images.length ? 'llm_vision' : 'llm_text';
            return { text, pathType };
        }
        catch (err) {
            // Map provider errors to standardized errors
            const errObj = err;
            const status = errObj?.status ||
                errObj?.statusCode ||
                (typeof errObj?.code === 'number' ? errObj.code : undefined);
            const mapped = (0, provider_error_1.buildProviderError)(status ?? 500, 'openai', (typeof errObj?.message === 'string' ? errObj.message : '').slice(0, 200));
            this.logError('rewrite_llm_failed', {
                metadata: {
                    message: err.message,
                    status: status ?? 'unknown',
                },
            });
            throw mapped;
        }
    }
    async enhance(input, options = {
        mode: 'agent',
        safety: true,
        includeScores: false,
        outputFormat: 'markdown',
    }, ownerType = 'guest', ownerId, attachments = null) {
        if (!this.publicFlag) {
            const err = new Error('feature_not_enabled');
            err.code = 'feature_disabled';
            this.logWarn('enhance_blocked_by_flag', {
                requestId: 'init',
                metadata: {
                    ownerType,
                    ownerIdSuffix: ownerId.slice(-4),
                },
            });
            throw err;
        }
        const startTime = Date.now();
        const reqId = `enhance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const userLimit = parseInt(this.env.PROMPT_USER_LIMIT || '20', 10);
        const guestLimit = parseInt(this.env.PROMPT_GUEST_LIMIT || '5', 10);
        const limit = ownerType === 'user' ? userLimit : guestLimit;
        this.logDebug('enhance_requested', {
            requestId: reqId,
            metadata: {
                inputLength: input.text.length,
                ownerType,
                ownerIdSuffix: ownerId.slice(-4),
                mode: options.mode,
                flagEnabled: this.publicFlag,
            },
        });
        // Quota check
        const currentUsage = await this.getUsage(ownerType, ownerId, userLimit, guestLimit);
        if (currentUsage.used >= currentUsage.limit) {
            const err = new Error(`Quota exceeded. Used ${currentUsage.used}/${limit}`);
            err.code = 'quota_exceeded';
            err.details = currentUsage;
            this.logError('enhance_failed', {
                requestId: reqId,
                metadata: {
                    errorKind: 'quota_exceeded',
                    inputLength: input.text.length,
                    ownerType,
                    ownerIdSuffix: ownerId.slice(-4),
                },
            });
            throw err;
        }
        // Pipeline
        const parsed = await this.parseInput(input.text);
        // Safety (on input only; attachments should be prepared upstream)
        const { cleaned: safeText, report } = this.applySafety(input.text, options.safety !== false && this.enableSafety);
        let enhancedPromptText = null;
        let pathType = null;
        if (this.rewriteEnabled) {
            try {
                const out = await this.callRewriteLLM(safeText, options.mode || 'agent', attachments);
                enhancedPromptText = out.text;
                pathType = out.pathType;
            }
            catch (e) {
                this.logWarn('rewrite_fallback', {
                    metadata: { reason: e.message },
                });
            }
        }
        if (enhancedPromptText) {
            // LLM path: wrap as minimal EnhancedPrompt with objective containing the whole enhanced text
            const structured = {
                role: 'Optimized Prompt',
                objective: enhancedPromptText,
                constraints: 'Generated by LLM rewrite. No additional metadata.',
                outputFormat: 'plain',
                steps: undefined,
                fewShotExamples: undefined,
                rawText: safeText,
            };
            const scores = options.includeScores
                ? this.calculateScores(structured, input.text, parsed)
                : undefined;
            const usage = await this.incrementUsage(ownerType, ownerId, limit);
            const latency = Date.now() - startTime;
            const finalPathType = pathType || 'llm_text';
            // Lightweight counter log for metrics pipelines
            this.logInfo('enhance_path_counter', {
                metadata: { pathType: finalPathType, inc: 1 },
            });
            await this.incrementPathMetric(finalPathType);
            this.logInfo('enhance_completed', {
                requestId: reqId,
                metadata: {
                    latency,
                    enhancedLength: enhancedPromptText.length,
                    maskedCount: report.masked.length,
                    aiUsed: true,
                    path: 'llm',
                    pathType: finalPathType,
                },
            });
            return { enhanced: structured, safetyReport: report, scores, usage };
        }
        // Deterministic fallback
        let structured = this.structurePrompt(parsed, safeText);
        structured = this.rewriteMode(structured, options.mode || 'agent');
        const scores = options.includeScores
            ? this.calculateScores(structured, input.text, parsed)
            : undefined;
        const usage = await this.incrementUsage(ownerType, ownerId, limit);
        const latency = Date.now() - startTime;
        this.logInfo('enhance_completed', {
            requestId: reqId,
            metadata: {
                latency,
                enhancedLength: JSON.stringify(structured).length,
                maskedCount: report.masked.length,
                aiUsed: parsed.aiUsed,
                path: 'deterministic',
            },
        });
        return { enhanced: structured, safetyReport: report, scores, usage };
    }
}
exports.PromptEnhancerService = PromptEnhancerService;
