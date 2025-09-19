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
}

export class PromptEnhancerService {
  private env: RuntimeEnv;
  private log: any;
  private enableSafety: boolean;
  private publicFlag: boolean;

  constructor(env: RuntimeEnv) {
    this.env = env;
    this.log = loggerFactory.createLogger('prompt-enhancer-service');
    this.enableSafety = this.env.ENABLE_PROMPT_SAFETY !== 'false';
    this.publicFlag = this.env.PUBLIC_PROMPT_ENHANCER_V1 !== 'false';
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
    const words = lowerText.split(/\s+/).filter(w => w.length > 3);
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
        const response = completion.choices[0]?.message?.content?.trim();
        if (response) {
          const parsed = JSON.parse(response);
          if (parsed.intent && ['generate', 'analyze', 'translate', 'other'].includes(parsed.intent)) {
            intent = parsed.intent;
            aiUsed = true;
            this.log.debug('ai_intent_detected', { inputLength: text.length, intent, aiModel: 'gpt-4o-mini' });
          }
        }
      } catch (error) {
        this.log.warn('ai_intent_failed', { inputLength: text.length, error: (error as Error).message });
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
      masked.push(match[1]);
      types.push('address');
      cleaned = cleaned.replace(match[1], '[REDACTED]');
    }

    // Mask IDs (e.g., user IDs, reference numbers)
    const idRegex = /(?:ID|id):\s*[\w\-]+|user_\d+|ref_\w+/gi;
    while ((match = idRegex.exec(text)) !== null) {
      masked.push(match[0]);
      types.push('id');
      cleaned = cleaned.replace(match[0], '[REDACTED]');
    }

    // Mask emails
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
    
    while ((match = emailRegex.exec(text)) !== null) {
      masked.push(match[0]);
      types.push('email');
      cleaned = cleaned.replace(match[0], '[REDACTED]');
    }

    // Mask phones
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      masked.push(match[1]);
      types.push('phone');
      cleaned = cleaned.replace(match[1], '[REDACTED]');
    }

    const report: SafetyReport = { masked, types };

    return { cleaned, report };
  }

  private calculateScores(prompt: EnhancedPrompt, inputText: string, parsed: Awaited<ReturnType<typeof this.parseInput>>): Scores {
    const inputWords = inputText.split(/\s+/).length;
    const sections = Object.keys(prompt).length - 1; // Exclude rawText
    const clarity = Math.min(1, (sections / 6) * 1.25); // Max 1.0 for full structure
    let specificity = Math.min(1, prompt.objective.split(' ').length / 20); // Keyword density
    const testability = prompt.steps && prompt.steps.length > 0 ? 0.8 : 0.5;

    // Boost specificity if AI was used for better intent detection
    if (parsed.aiUsed) {
      specificity = Math.min(1, specificity + 0.1);
    }

    return { clarity, specificity, testability };
  }

  public async enhance(input: EnhanceInput, options: EnhanceOptions = { mode: 'agent' as const, safety: true, includeScores: false, outputFormat: 'markdown' as const }, ownerType: 'user' | 'guest' = 'guest', ownerId: string): Promise<EnhanceResult> {
    if (!this.publicFlag) {
      const err = new Error('feature_not_enabled');
      (err as any).code = 'feature_disabled';
      this.log.warn('enhance_blocked_by_flag', { reqId: 'init', ownerType, ownerId: ownerId.slice(-4) });
      throw err;
    }

    const startTime = Date.now();
    const reqId = `enhance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userLimit = parseInt(this.env.PROMPT_USER_LIMIT || '20', 10);
    const guestLimit = parseInt(this.env.PROMPT_GUEST_LIMIT || '5', 10);
    const limit = ownerType === 'user' ? userLimit : guestLimit;

    this.log.debug('enhance_requested', { reqId, inputLength: input.text.length, ownerType, ownerId: ownerId.slice(-4), mode: options.mode, flagEnabled: this.publicFlag });

    // Quota check
    const currentUsage = await this.getUsage(ownerType, ownerId, userLimit, guestLimit);
    if (currentUsage.used >= currentUsage.limit) {
      const err = new Error(`Quota exceeded. Used ${currentUsage.used}/${limit}`);
      (err as any).code = 'quota_exceeded';
      (err as any).details = currentUsage;
      this.log.error('enhance_failed', { reqId, errorKind: 'quota_exceeded', inputLength: input.text.length, ownerType, ownerId: ownerId.slice(-4) });
      throw err;
    }

    // Pipeline
    const parsed = await this.parseInput(input.text);
    let structured = this.structurePrompt(parsed, input.text);
    structured = this.rewriteMode(structured, options.mode || 'agent');

    const { cleaned: safeText, report } = this.applySafety(input.text, options.safety !== false && this.enableSafety);
    structured.rawText = safeText; // Use safe text for structure, original in field for reference

    const scores = options.includeScores ? this.calculateScores(structured, input.text, parsed) : undefined;

    // Increment usage
    const usage = await this.incrementUsage(ownerType, ownerId, limit);

    const latency = Date.now() - startTime;
    this.log.info('enhance_completed', { reqId, latency, enhancedLength: JSON.stringify(structured).length, maskedCount: report.masked.length, aiUsed: parsed.aiUsed });

    return { enhanced: structured, safetyReport: report, scores, usage };
  }
}