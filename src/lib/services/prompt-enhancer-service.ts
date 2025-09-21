/**
 * Prompt Enhancer Service
 * 
 * Core service for transforming raw text inputs into structured, agent-ready prompts.
 * Implements modular pipeline: parse, structure, rewrite, safety, score.
 * Tracks usage via KV for guests/users with daily quotas.
 * Includes telemetry logs and env flag for safety.
 */

import { loggerFactory } from '@/server/utils/logger-factory';
import type { KVNamespace } from '@cloudflare/workers-types';
import OpenAI from 'openai';
import { buildProviderError } from '@/lib/services/provider-error';
import type { AttachmentContext } from '@/config/prompt-enhancer';
import {
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
  OUTPUT_TOKENS_MAX,
  TEMPERATURE,
  TOP_P,
} from '@/config/prompt-enhancer';
import { uploadPdfFilesToProvider } from '@/lib/services/prompt-attachments';

export interface EnhanceInput {
  text: string;
}

export interface EnhanceOptions {
  mode?: 'agent' | 'concise';
  safety?: boolean;
  includeScores?: boolean;
  outputFormat?: 'markdown' | 'json';
}

export interface EnhancedPrompt {
  role: string;
  objective: string;
  constraints: string;
  outputFormat: string;
  steps?: string[];
  fewShotExamples?: string[];
  rawText: string;
}

export interface SafetyReport {
  masked: string[];
  types: ('email' | 'phone' | 'address' | 'id')[];
}

export interface Scores {
  clarity: number;
  specificity: number;
  testability: number;
}

export interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

export interface EnhanceResult {
  enhanced: EnhancedPrompt;
  safetyReport: SafetyReport;
  scores?: Scores;
  usage: UsageInfo;
}

interface RuntimeEnv {
  KV_PROMPT_ENHANCER?: KVNamespace;
  ENVIRONMENT?: string;
  ENABLE_PROMPT_SAFETY?: string;
  PROMPT_USER_LIMIT?: string;
  PROMPT_GUEST_LIMIT?: string;
  PUBLIC_PROMPT_ENHANCER_V1?: string;
  OPENAI_API_KEY?: string;
  PROMPT_REWRITE_V1?: string;
  PROMPT_TEXT_MODEL?: string;
  PROMPT_VISION_MODEL?: string;
  PROMPT_OUTPUT_TOKENS_MAX?: string;
  PROMPT_TEMPERATURE?: string;
  PROMPT_TOP_P?: string;
  PROMPT_METRICS_V1?: string;
}

export class PromptEnhancerService {
  private env: RuntimeEnv;
  private log: any;
  private enableSafety: boolean;
  private publicFlag: boolean;
  private rewriteEnabled: boolean;

  constructor(env: RuntimeEnv) {
    this.env = env;
    this.log = loggerFactory.createLogger('prompt-enhancer-service');
    this.enableSafety = this.env.ENABLE_PROMPT_SAFETY !== 'false';
    this.publicFlag = this.env.PUBLIC_PROMPT_ENHANCER_V1 !== 'false';
    this.rewriteEnabled = this.env.PROMPT_REWRITE_V1 !== 'false';
  }

  // Safe logger helpers (tests may mock logger without full interface)
  private logInfo(event: string, data?: unknown) {
    try { this.log?.info ? this.log.info(event, data) : this.log?.log?.(event, data); } catch {}
  }
  private logWarn(event: string, data?: unknown) {
    try { this.log?.warn ? this.log.warn(event, data) : this.log?.info?.(event, data); } catch {}
  }
  private logError(event: string, data?: unknown) {
    try { this.log?.error ? this.log.error(event, data) : this.log?.info?.(event, data); } catch {}
  }
  private logDebug(event: string, data?: unknown) {
    try { this.log?.debug ? this.log.debug(event, data) : this.log?.info?.(event, data); } catch {}
  }

  private getTextModel(): string {
    return this.env.PROMPT_TEXT_MODEL || DEFAULT_TEXT_MODEL;
  }

  private getVisionModel(): string {
    return this.env.PROMPT_VISION_MODEL || DEFAULT_VISION_MODEL;
  }

  private getGenParams() {
    return {
      max_tokens: Number(this.env.PROMPT_OUTPUT_TOKENS_MAX || OUTPUT_TOKENS_MAX),
      temperature: Number(this.env.PROMPT_TEMPERATURE || TEMPERATURE),
      top_p: Number(this.env.PROMPT_TOP_P || TOP_P),
    } as const;
  }

  private async incrementPathMetric(pathType: 'llm_text' | 'llm_vision' | 'llm_file_search'): Promise<void> {
    try {
      if (this.env.PROMPT_METRICS_V1 === 'false') return;
      const kv = this.env.KV_PROMPT_ENHANCER;
      if (!kv) return;
      const d = new Date();
      const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
      const key = `prompt:metrics:path:${pathType}:${ymd}`;
      const raw = await kv.get(key);
      const count = raw ? parseInt(raw, 10) || 0 : 0;
      await kv.put(key, String(count + 1), { expirationTtl: 7 * 24 * 60 * 60 }); // keep a week
    } catch {
      // swallow metric errors
    }
  }

  private async getUsage(ownerType: 'user' | 'guest', ownerId: string, userLimit: number, guestLimit: number): Promise<UsageInfo> {
    const limit = ownerType === 'user' ? userLimit : guestLimit;
    const kv = this.env.KV_PROMPT_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };

    const key = `prompt:usage:${ownerType}:${ownerId}`;
    const raw = await kv.get(key);
    if (!raw) return { used: 0, limit, resetAt: null };

    try {
      const parsed = JSON.parse(raw) as { count: number; resetAt: number };
      return { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
    } catch {
      return { used: 0, limit, resetAt: null };
    }
  }

  private async incrementUsage(ownerType: 'user' | 'guest', ownerId: string, limit: number): Promise<UsageInfo> {
    const kv = this.env.KV_PROMPT_ENHANCER;
    if (!kv) return { used: 1, limit, resetAt: null };

    const key = `prompt:usage:${ownerType}:${ownerId}`;
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;
    const resetAt = now + windowMs;

    const raw = await kv.get(key);
    let count = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { count: number; resetAt: number };
        count = parsed.count || 0;
      } catch {
        count = 0;
      }
    }

    count += 1;
    const value = JSON.stringify({ count, resetAt });
    const expiration = Math.floor(resetAt / 1000);
    await kv.put(key, value, { expiration });

    return { used: count, limit, resetAt };
  }

  private async parseInput(text: string): Promise<{ intent: string; keywords: string[]; isComplex: boolean; aiUsed: boolean }> {
    const lowerText = text.toLowerCase();
    let intent = 'generate';
    const keywords: string[] = [];
    // Normalize tokens: strip punctuation, keep letters/numbers/umlauts/hyphen/underscore
    const rawTokens = lowerText.split(/\s+/).map(w => w.replace(/[^a-z0-9äöüß_-]+/gi, ''));
    const words = rawTokens.filter(w => w.length > 3);
    const isComplex = words.length > 50 || text.length > 200;
    let aiUsed = false;

    // Fallback rule-based parsing
    if (lowerText.includes('schreibe') || lowerText.includes('generate') || lowerText.includes('write')) {
      intent = 'generate';
    } else if (lowerText.includes('analysiere') || lowerText.includes('analyze')) {
      intent = 'analyze';
    } else if (lowerText.includes('übersetze') || lowerText.includes('translate')) {
      intent = 'translate';
    }

    const uniqueKeywords = [...new Set(words.slice(0, 10))];
    keywords.push(...uniqueKeywords);

    // AI-enhanced intent detection if available
    if (this.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });
        const prompt = `Classify the intent of this text as 'generate', 'analyze', 'translate', or 'other': "${text}". Respond only with JSON: {"intent": "generate"}`;
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20,
        });
        const isChatCompletion = (v: unknown): v is OpenAI.Chat.Completions.ChatCompletion => {
          return !!v && typeof v === 'object' && 'choices' in (v as any);
        };
        const response = isChatCompletion(completion)
          ? completion.choices[0]?.message?.content?.trim()
          : '';
        if (response) {
          const parsed = JSON.parse(response);
          if (parsed.intent && ['generate', 'analyze', 'translate', 'other'].includes(parsed.intent)) {
            intent = parsed.intent;
            aiUsed = true;
            this.logDebug('ai_intent_detected', { inputLength: text.length, intent, aiModel: 'gpt-4o-mini' });
          }
        }
      } catch (error) {
        this.logWarn('ai_intent_failed', { inputLength: text.length, error: (error as Error).message });
        // Fallback to rule-based
      }
    }

    return { intent, keywords, isComplex, aiUsed };
  }

  private structurePrompt(parsed: Awaited<ReturnType<typeof this.parseInput>>, rawText: string): EnhancedPrompt {
    const { intent, keywords, isComplex } = parsed;
    const role = intent === 'generate' ? 'You are an expert content creator.' : 
                 intent === 'analyze' ? 'You are a precise analyst.' : 'You are a helpful assistant.';

    const objective = `Perform ${intent} task based on: ${keywords.slice(0, 5).join(', ') || rawText.substring(0, 100)}`;

    const constraints = 'Keep response clear and concise; cite sources if applicable; limit to 1000 words; mask any PII.';

    const outputFormat = 'Markdown with sections for key parts.';

    const steps: string[] | undefined = isComplex ? [
      'Understand the input.',
      'Plan the structure.',
      'Generate content.',
      'Review for accuracy.',
      'Format output.'
    ] : undefined;

    const fewShotExamples: string[] | undefined = isComplex ? [
      'Input: Write blog on AI. Output: Structured post with intro/body/conclusion.',
      'Input: Analyze sales data. Output: Key insights in bullet points.'
    ] : undefined;

    return {
      role,
      objective,
      constraints,
      outputFormat,
      steps,
      fewShotExamples,
      rawText
    };
  }

  private rewriteMode(prompt: EnhancedPrompt, mode: 'agent' | 'concise'): EnhancedPrompt {
    if (mode === 'concise') {
      prompt.constraints = prompt.constraints.replace('limit to 1000 words', 'keep under 500 words');
      if (prompt.steps) prompt.steps = prompt.steps.slice(0, 3);
    } else {
      prompt.constraints += ' Collaborate as needed; think step-by-step.';
      if (!prompt.steps) prompt.steps = ['Plan', 'Execute', 'Review'];
    }

    return prompt;
  }

  private applySafety(text: string, enableSafety: boolean): { cleaned: string; report: SafetyReport } {
    if (!enableSafety) {
      return { cleaned: text, report: { masked: [], types: [] } };
    }

    let match;
    let cleaned = text;
    const masked: string[] = [];
    const types: ('email' | 'phone' | 'address' | 'id')[] = [];

    // Mask addresses (e.g., "Strasse 123" or "Street HouseNumber")
    const addressRegex = /(\d+\s+[A-Za-zäöüÄÖÜß]+(?:str|straße|street|haus|house|plz|zip)[^.,;]*)/gi;
    while ((match = addressRegex.exec(text)) !== null) {
      masked.push(String(match[1]).trim());
      types.push('address');
      cleaned = cleaned.replace(match[1], '[REDACTED]');
    }

    // Mask IDs (e.g., user IDs, reference numbers)
    const idRegex = /(?:ID|id):\s*[\w\-]+|user_\d+|ref_\w+/gi;
    while ((match = idRegex.exec(text)) !== null) {
      masked.push(String(match[0]).trim());
      types.push('id');
      cleaned = cleaned.replace(match[0], '[REDACTED]');
    }

    // Mask emails
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
    
    while ((match = emailRegex.exec(text)) !== null) {
      masked.push(String(match[0]).trim());
      types.push('email');
      cleaned = cleaned.replace(match[0], '[REDACTED]');
    }

    // Mask phones
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      masked.push(String(match[1]).trim());
      types.push('phone');
      cleaned = cleaned.replace(match[1], '[REDACTED]');
    }

    const report: SafetyReport = { masked, types };

    return { cleaned, report };
  }

  private calculateScores(prompt: EnhancedPrompt, _inputText: string, parsed?: Awaited<ReturnType<typeof this.parseInput>>): Scores {
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

  private composeRewriteMessages(inputText: string, mode: 'agent' | 'concise', attachment: AttachmentContext | null): Parameters<OpenAI.Chat.Completions['create']>[0] {
    const systemParts: string[] = [];
    systemParts.push(
      'You rewrite user prompts into clearer, more specific, policy-compliant prompts. Preserve the user\'s intent. Do not invent requirements. Respond in the same language as the input. Output only the enhanced prompt (no quotes, no lists, no explanations).'
    );
    if (attachment && (attachment.texts.length || attachment.images.length || attachment.pdfs.length)) {
      systemParts.push('Use attachments only to resolve ambiguity. Do not expose sensitive data or PII.');
    }
    if (mode === 'concise') {
      systemParts.push('Be succinct and unambiguous; remove filler; target under ~120 words unless essential.');
    } else {
      // agent mode maps to more elaborate but precise output
      systemParts.push('Use precise, actionable phrasing; add conservative clarifications; avoid adding new facts.');
    }

    const userTextHeader = 'Enhance this prompt. Reply with only the enhanced prompt:';

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    > = [
      { type: 'text', text: `${userTextHeader}\n\n${inputText}` },
    ];

    // Attach text snippets
    if (attachment && attachment.texts.length) {
      const lines: string[] = ['\nAttachment context (summaries/snippets):'];
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

  private async callRewriteLLM(
    inputText: string,
    mode: 'agent' | 'concise',
    attachment: AttachmentContext | null
  ): Promise<{ text: string; pathType: 'llm_text' | 'llm_vision' | 'llm_file_search' }> {
    if (!this.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing');
    }
    const client = new OpenAI({ apiKey: this.env.OPENAI_API_KEY });

    try {
      // If PDFs exist (and have file IDs or files), use Responses API with file_search
      const hasPdfs = !!(attachment && attachment.pdfs && attachment.pdfs.length);
      const hasImages = !!(attachment && attachment.images && attachment.images.length);
      if (hasPdfs && !hasImages) {
        // Upload PDFs first (idempotent if fileId already set)
        await uploadPdfFilesToProvider(client as any, attachment as any, this.log);

        const systemParts: string[] = [];
        systemParts.push(
          'You rewrite user prompts into clearer, more specific, policy-compliant prompts. Preserve the user\'s intent. Do not invent requirements. Respond in the same language as the input. Output only the enhanced prompt (no quotes, no lists, no explanations).'
        );
        if (mode === 'concise') {
          systemParts.push('Be succinct and unambiguous; remove filler; target under ~120 words unless essential.');
        } else {
          systemParts.push('Use precise, actionable phrasing; add conservative clarifications; avoid adding new facts.');
        }

        const textBlocks: string[] = [];
        textBlocks.push('Enhance this prompt. Reply with only the enhanced prompt:\n');
        textBlocks.push(inputText);
        if (attachment && attachment.texts.length) {
          const lines: string[] = ['\nAttachment context (summaries/snippets):'];
          for (const t of attachment.texts) lines.push(`- ${t.filename}: ${t.text}`);
          textBlocks.push(lines.join('\n'));
        }

        // Build attachments for file_search
        const attachments: Array<{ file_id: string; tools: Array<{ type: 'file_search' }> }> = [];
        for (const pdf of attachment!.pdfs) {
          if (pdf.fileId) attachments.push({ file_id: pdf.fileId, tools: [{ type: 'file_search' }] });
        }

        const resp = await (client as any).responses.create({
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

        const out: any = resp as any;
        const tryOutputText = out?.output_text as string | undefined;
        if (tryOutputText && typeof tryOutputText === 'string') return { text: tryOutputText.trim(), pathType: 'llm_file_search' };
        // Fallback parse for nested output format
        const maybeText = (() => {
          const output = out?.output;
          if (Array.isArray(output) && output.length > 0) {
            const c0 = output[0]?.content;
            if (Array.isArray(c0) && c0.length > 0) {
              const t = c0.find((c: any) => c?.type === 'output_text' || c?.type === 'text');
              if (t?.text?.value) return t.text.value as string;
              if (typeof t?.text === 'string') return t.text as string;
            }
          }
          return '';
        })();
        return { text: (maybeText || '').trim(), pathType: 'llm_file_search' };
      }

      // Default path (no PDFs or images present): chat.completions (with optional images via composeRewriteMessages)
      const params = this.composeRewriteMessages(inputText, mode, attachment);
      const completion = await client.chat.completions.create(params);
      // Type guard: ChatCompletion vs Stream
      const isChatCompletion = (v: unknown): v is OpenAI.Chat.Completions.ChatCompletion => {
        return !!v && typeof v === 'object' && 'choices' in (v as any);
      };
      let raw = '';
      if (isChatCompletion(completion)) {
        raw = completion.choices?.[0]?.message?.content || '';
      }
      const text = (raw || '').trim();
      const pathType: 'llm_text' | 'llm_vision' = attachment && attachment.images && attachment.images.length ? 'llm_vision' : 'llm_text';
      return { text, pathType };
    } catch (err) {
      // Map provider errors to standardized errors
      const anyErr = err as any;
      const status: number | undefined = anyErr?.status || anyErr?.statusCode || (typeof anyErr?.code === 'number' ? anyErr.code : undefined);
      const mapped = buildProviderError(status ?? 500, 'openai', (anyErr?.message || '').slice(0, 200));
      this.logError('rewrite_llm_failed', { message: (err as Error).message, status: status ?? 'unknown' });
      throw mapped;
    }
  }

  public async enhance(
    input: EnhanceInput,
    options: EnhanceOptions = { mode: 'agent' as const, safety: true, includeScores: false, outputFormat: 'markdown' as const },
    ownerType: 'user' | 'guest' = 'guest',
    ownerId: string,
    attachments: AttachmentContext | null = null,
  ): Promise<EnhanceResult> {
    if (!this.publicFlag) {
      const err = new Error('feature_not_enabled');
      (err as any).code = 'feature_disabled';
      this.logWarn('enhance_blocked_by_flag', { reqId: 'init', ownerType, ownerId: ownerId.slice(-4) });
      throw err;
    }

    const startTime = Date.now();
    const reqId = `enhance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userLimit = parseInt(this.env.PROMPT_USER_LIMIT || '20', 10);
    const guestLimit = parseInt(this.env.PROMPT_GUEST_LIMIT || '5', 10);
    const limit = ownerType === 'user' ? userLimit : guestLimit;

    this.logDebug('enhance_requested', { reqId, inputLength: input.text.length, ownerType, ownerId: ownerId.slice(-4), mode: options.mode, flagEnabled: this.publicFlag });

    // Quota check
    const currentUsage = await this.getUsage(ownerType, ownerId, userLimit, guestLimit);
    if (currentUsage.used >= currentUsage.limit) {
      const err = new Error(`Quota exceeded. Used ${currentUsage.used}/${limit}`);
      (err as any).code = 'quota_exceeded';
      (err as any).details = currentUsage;
      this.logError('enhance_failed', { reqId, errorKind: 'quota_exceeded', inputLength: input.text.length, ownerType, ownerId: ownerId.slice(-4) });
      throw err;
    }

    // Pipeline
    const parsed = await this.parseInput(input.text);

    // Safety (on input only; attachments should be prepared upstream)
    const { cleaned: safeText, report } = this.applySafety(input.text, options.safety !== false && this.enableSafety);

    let enhancedPromptText: string | null = null;
    let pathType: 'llm_text' | 'llm_vision' | 'llm_file_search' | null = null;
    if (this.rewriteEnabled) {
      try {
        const out = await this.callRewriteLLM(safeText, options.mode || 'agent', attachments);
        enhancedPromptText = out.text;
        pathType = out.pathType;
      } catch (e) {
        this.logWarn('rewrite_fallback', { reason: (e as Error).message });
      }
    }

    if (enhancedPromptText) {
      // LLM path: wrap as minimal EnhancedPrompt with objective containing the whole enhanced text
      const structured: EnhancedPrompt = {
        role: 'Optimized Prompt',
        objective: enhancedPromptText,
        constraints: 'Generated by LLM rewrite. No additional metadata.',
        outputFormat: 'plain',
        steps: undefined,
        fewShotExamples: undefined,
        rawText: safeText,
      };
      const scores = options.includeScores ? this.calculateScores(structured, input.text, parsed) : undefined;
      const usage = await this.incrementUsage(ownerType, ownerId, limit);
      const latency = Date.now() - startTime;
      const finalPathType = pathType || 'llm_text';
      // Lightweight counter log for metrics pipelines
      this.logInfo('enhance_path_counter', { pathType: finalPathType, inc: 1 });
      await this.incrementPathMetric(finalPathType);
      this.logInfo('enhance_completed', { reqId, latency, enhancedLength: enhancedPromptText.length, maskedCount: report.masked.length, aiUsed: true, path: 'llm', pathType: finalPathType });
      return { enhanced: structured, safetyReport: report, scores, usage };
    }

    // Deterministic fallback
    let structured = this.structurePrompt(parsed, safeText);
    structured = this.rewriteMode(structured, options.mode || 'agent');
    const scores = options.includeScores ? this.calculateScores(structured, input.text, parsed) : undefined;
    const usage = await this.incrementUsage(ownerType, ownerId, limit);
    const latency = Date.now() - startTime;
    this.logInfo('enhance_completed', { reqId, latency, enhancedLength: JSON.stringify(structured).length, maskedCount: report.masked.length, aiUsed: parsed.aiUsed, path: 'deterministic' });
    return { enhanced: structured, safetyReport: report, scores, usage };
  }
}