/**
 * Prompt Enhancer Service
 * 
 * Core service for transforming raw text inputs into structured, agent-ready prompts.
 * Implements modular pipeline: parse, structure, rewrite, safety, score.
 * Tracks usage via KV for guests/users with daily/monthly quotas.
 */

import { loggerFactory } from '@/server/utils/logger-factory';
import type { KVNamespace } from '@cloudflare/workers-types';

export interface EnhanceInput {
  text: string;
}

export interface EnhanceOptions {
  mode: 'agent' | 'concise';
  safety: boolean;
  includeScores: boolean;
  outputFormat: 'markdown' | 'json';
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
  types: ('email' | 'phone')[];
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
}

export class PromptEnhancerService {
  private enableSafety: boolean;

  constructor(env: RuntimeEnv) {
    this.env = env;
    this.log = loggerFactory.createLogger('prompt-enhancer-service');
    this.enableSafety = this.env.ENABLE_PROMPT_SAFETY !== 'false';
  }

  private env: RuntimeEnv;
  private log: any;

  private async getUsage(ownerType: 'user' | 'guest', ownerId: string, limit: number): Promise<UsageInfo> {
    const kv = this.env.KV_PROMPT_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };

    const key = `prompt:usage:${ownerType}:${ownerId}`;
    const raw = await kv.get(key);
    if (!raw) return { used: 0, limit, resetAt: null };

    try {
      const parsed = JSON.parse(raw) as UsageInfo;
      return { used: parsed.used || 0, limit, resetAt: parsed.resetAt || null };
    } catch {
      return { used: 0, limit, resetAt: null };
    }
  }

  private async incrementUsage(ownerType: 'user' | 'guest', ownerId: string, limit: number): Promise<UsageInfo> {
    const kv = this.env.KV_PROMPT_ENHANCER;
    if (!kv) return { used: 1, limit, resetAt: null };

    const key = `prompt:usage:${ownerType}:${ownerId}`;
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // Daily
    const expiration = Math.floor(now / 1000) + (windowMs / 1000);

    let used = 0;
    let resetAt = now + windowMs;
    const raw = await kv.get(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UsageInfo;
        used = (parsed.used || 0) + 1;
        resetAt = parsed.resetAt || now + windowMs;
      } catch {
        used = 1;
      }
    } else {
      used = 1;
    }

    await kv.put(key, JSON.stringify({ used, limit, resetAt }), { expiration });

    return { used, limit, resetAt };
  }

  private parseInput(text: string): { intent: string; keywords: string[]; isComplex: boolean } {
    const lowerText = text.toLowerCase();
    let intent = 'generate';
    const keywords: string[] = [];
    const words = lowerText.split(/\s+/).filter(w => w.length > 3);
    const isComplex = words.length > 50 || text.length > 200;

    if (lowerText.includes('schreibe') || lowerText.includes('generate') || lowerText.includes('write')) {
      intent = 'generate';
    } else if (lowerText.includes('analysiere') || lowerText.includes('analyze')) {
      intent = 'analyze';
    } else if (lowerText.includes('übersetze') || lowerText.includes('translate')) {
      intent = 'translate';
    }

    // Extract unique keywords (simple, no NLP)
    const uniqueKeywords = [...new Set(words.slice(0, 10))];
    keywords.push(...uniqueKeywords);

    return { intent, keywords, isComplex };
  }

  private structurePrompt(parsed: ReturnType<typeof this.parseInput>, rawText: string): EnhancedPrompt {
    const { intent, keywords, isComplex } = parsed;
    const role = intent === 'generate' ? 'You are an expert content creator.' : 
                 intent === 'analyze' ? 'You are a precise analyst.' : 'You are a helpful assistant.';

    const objective = `Perform ${intent} task based on: ${keywords.slice(0, 5).join(', ') || rawText.substring(0, 100)}`;

    const constraints = 'Keep response clear and concise; cite sources if applicable; limit to 1000 words; mask any PII.';

    const outputFormat = 'Markdown with sections for key parts.';

    const steps: string[] = isComplex ? [
      'Understand the input.',
      'Plan the structure.',
      'Generate content.',
      'Review for accuracy.',
      'Format output.'
    ] : undefined;

    const fewShotExamples: string[] = keywords.length > 3 ? [
      'Input: Write blog on AI. Output: Structured post with intro/body/conclusion.',
      'Input: Analyze code. Output: Strengths/issues/suggestions.'
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
    }

    return prompt;
  }

  private applySafety(text: string, enableSafety: boolean): { cleaned: string; report: SafetyReport } {
    if (!enableSafety) return { cleaned: text, report: { masked: [], types: [] } };

    let cleaned = text;
    const masked: string[] = [];
    const types: ('email' | 'phone')[] = [];

    // Mask emails
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      masked.push(match[0]);
      types.push('email');
      cleaned = cleaned.replace(match[0], '[REDACTED]');
    }

    // Mask phones (basic pattern)
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      masked.push(match[1]);
      types.push('phone');
      cleaned = cleaned.replace(match[1], '[REDACTED]');
    }

    const report: SafetyReport = { masked, types };

    return { cleaned, report };
  }

  private calculateScores(prompt: EnhancedPrompt, inputText: string): Scores {
    const inputWords = inputText.split(/\s+/).length;
    const sections = Object.keys(prompt).length - 1; // Exclude rawText
    const clarity = Math.min(1, (sections / 6) * 1.25); // Max 1.0 for full structure
    const specificity = Math.min(1, prompt.objective.split(' ').length / 20); // Keyword density
    const testability = prompt.steps && prompt.steps.length > 0 ? 0.8 : 0.5;

    return { clarity: Number(clarity.toFixed(1)), specificity: Number(specificity.toFixed(1)), testability: Number(testability.toFixed(1)) };
  }

  public async enhance(input: EnhanceInput, options: EnhanceOptions = { mode: 'agent' as const, safety: true, includeScores: false, outputFormat: 'markdown' as const }, ownerType: 'user' | 'guest', ownerId: string): Promise<EnhanceResult> {
    const startTime = Date.now();
    const reqId = `enhance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const limit = ownerType === 'user' ? 20 : 5;

    this.log.debug('enhance_requested', { reqId, inputLength: input.text.length, ownerType, ownerId: ownerId.slice(-4), mode: options.mode });

    // Check quota
    const currentUsage = await this.getUsage(ownerType, ownerId, limit);
    if (currentUsage.used >= limit) {
      const err = new Error(`Daily quota exceeded. Used ${currentUsage.used}/${limit}`);
      (err as any).code = 'quota_exceeded';
      (err as any).details = currentUsage;
      this.log.error('enhance_failed', { reqId, errorKind: 'quota_exceeded', inputLength: input.text.length, ownerType, ownerId: ownerId.slice(-4) });
      throw err;
    }

    // Pipeline
    const parsed = this.parseInput(input.text);
    let structured = this.structurePrompt(parsed, input.text);
    structured = this.rewriteMode(structured, options.mode);

    const { cleaned: safeText, report } = this.applySafety(input.text, options.safety && this.enableSafety);
    structured.rawText = safeText; // Use safe text for structure (but rawText is original)

    const scores = options.includeScores ? this.calculateScores(structured, input.text) : undefined;

    // Increment usage
    const usage = await this.incrementUsage(ownerType, ownerId, limit);

    const latency = Date.now() - startTime;
    this.log.info('enhance_completed', { reqId, latency, enhancedLength: JSON.stringify(structured).length, maskedCount: report.masked.length });

    const enhanced: EnhancedPrompt = structured;

    return { enhanced, safetyReport: report, scores, usage };
  }
}