import { ALLOWED_MODELS, ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, AI_R2_PREFIX, FREE_LIMIT_GUEST, FREE_LIMIT_USER, type AllowedModel, type OwnerType } from '@/config/ai-image';
import { detectImageMimeFromBytes } from '@/lib/utils/mime';
import { loggerFactory } from '@/server/utils/logger-factory';
import { buildProviderError } from './provider-error';
import OpenAI from 'openai';
import type { ExtendedLogger } from '@/types/logger';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';

interface RuntimeEnv {
  R2_AI_IMAGES?: R2Bucket;
  KV_AI_ENHANCER?: KVNamespace;
  REPLICATE_API_TOKEN?: string;
  OPENAI_API_KEY?: string;
  ENVIRONMENT?: string;
}

export interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null; // epoch ms when quota resets (null if not tracked)
}

export interface GenerateParams {
  ownerType: OwnerType;
  ownerId: string; // user id or guest id
  modelSlug: string;
  file: File;
  requestOrigin: string; // e.g., https://hub-evolution.com
  // Optional enhancement parameters from client
  scale?: 2 | 4;
  faceEnhance?: boolean;
  assistantId?: string;
  // Optional: override daily limit based on plan/entitlements resolved by API route
  limitOverride?: number;
  // Optional: plan-based constraints
  monthlyLimitOverride?: number;
  maxUpscaleOverride?: 2 | 4 | 6 | 8;
  allowFaceEnhanceOverride?: boolean;
}

export interface GenerateResult {
  model: string;
  originalUrl: string;
  imageUrl: string; // public URL to the enhanced image
  usage: UsageInfo;
}

export interface AssistantResponse {
  content: string;
}

export class AiImageService {
  private env: RuntimeEnv;
  private log: ExtendedLogger;

  constructor(env: RuntimeEnv) {
    this.env = env;
    this.log = loggerFactory.createLogger('ai-image-service');
  }

  private async getCreditsBalance(userId: string): Promise<number> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return 0;
    const key = this.creditsKey(userId);
    const raw = await kv.get(key);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  private async decrementCreditsBalance(userId: string): Promise<number> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return 0;
    const key = this.creditsKey(userId);
    const raw = await kv.get(key);
    let n = 0;
    if (raw) {
      const parsed = parseInt(raw, 10);
      n = Number.isFinite(parsed) ? parsed : 0;
    }
    n = Math.max(0, n - 1);
    await kv.put(key, String(n));
    return n;
  }

  private async getMonthlyUsage(ownerType: OwnerType, ownerId: string, limit: number, ym: string): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    const key = this.monthlyUsageKey(ownerType, ownerId, ym);
    const raw = await kv.get(key);
    if (!raw) return { used: 0, limit, resetAt: null };
    try {
      const parsed = JSON.parse(raw) as { count: number };
      return { used: parsed.count || 0, limit, resetAt: null };
    } catch {
      return { used: 0, limit, resetAt: null };
    }
  }

  private async incrementMonthlyUsage(ownerType: OwnerType, ownerId: string, limit: number, ym: string): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    const key = this.monthlyUsageKey(ownerType, ownerId, ym);
    const raw = await kv.get(key);
    let count = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { count: number };
        count = parsed.count || 0;
      } catch {}
    }
    count += 1;
    await kv.put(key, JSON.stringify({ count }));
    return { used: count, limit, resetAt: null };
  }

  private isLocalHost(origin: string): boolean {
    try {
      const u = new URL(origin);
      const host = u.hostname;
      return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.local') ||
        /^192\.168\./.test(host) ||
        /^10\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      );
    } catch {
      // Best-effort fallback
      return /^(localhost|127\.0\.0\.1)/.test(origin);
    }
  }

  // Public API
  async getUsage(ownerType: OwnerType, ownerId: string, limit: number): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };

    const key = this.usageKey(ownerType, ownerId);
    const raw = await kv.get(key);
    if (!raw) {
      try {
        const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
        this.log.debug('usage_get_empty', { action: 'usage_get_empty', metadata: { ownerType, ownerId: mask, key, limit } });
      } catch {}
      return { used: 0, limit, resetAt: null };
    }

    try {
      const parsed = JSON.parse(raw) as { count: number; resetAt: number };
      const resp = { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
      try {
        const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
        this.log.debug('usage_get_ok', { action: 'usage_get_ok', metadata: { ownerType, ownerId: mask, key, used: resp.used, limit: resp.limit, hasReset: !!resp.resetAt } });
      } catch {}
      return resp;
    } catch {
      try {
        const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
        this.log.warn('usage_get_parse_failed', { action: 'usage_get_parse_failed', metadata: { ownerType, ownerId: mask, key } });
      } catch {}
      return { used: 0, limit, resetAt: null };
    }
  }

  public async callCustomAssistant(prompt: string, assistantId: string): Promise<AssistantResponse> {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const openai = new OpenAI({ apiKey });

    try {
      const thread = await openai.beta.threads.create();

      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: prompt,
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistantId,
      });

      let status = run.status;
      while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        status = runStatus.status;
      }

      if (status !== 'completed') {
        throw new Error(`Run failed with status: ${status}`);
      }

      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((m) => m.role === 'assistant');

      if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
        throw new Error('No response from assistant');
      }

      const content = assistantMessage.content[0].type === 'text' ? assistantMessage.content[0].text.value : '';

      return { content };
    } catch (error) {
      this.log.error('assistant_call_failed', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Failed to call assistant');
    }
  }

  async generate({ ownerType, ownerId, modelSlug, file, requestOrigin, scale, faceEnhance, assistantId, limitOverride, monthlyLimitOverride, maxUpscaleOverride, allowFaceEnhanceOverride }: GenerateParams): Promise<GenerateResult> {
    // Validate input
    const model = this.getAllowedModel(modelSlug);
    if (!model) throw new Error('Unsupported model');

    if (!(file instanceof File)) throw new Error('Invalid file');

    // Validate model capabilities for optional params
    if (typeof scale !== 'undefined') {
      if (!model.supportsScale) {
        const err: any = new Error(`Unsupported parameter 'scale' for model ${model.slug}`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
      if (!(scale === 2 || scale === 4)) {
        const err: any = new Error(`Unsupported value for 'scale': ${scale}`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
      // Enforce plan-based max upscale
      if (typeof maxUpscaleOverride === 'number' && scale > maxUpscaleOverride) {
        const err: any = new Error(`Requested 'scale' exceeds plan limit (${maxUpscaleOverride}x)`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
    }
    if (typeof faceEnhance !== 'undefined') {
      if (!model.supportsFaceEnhance) {
        const err: any = new Error(`Unsupported parameter 'face_enhance' for model ${model.slug}`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
      if (faceEnhance === true && allowFaceEnhanceOverride === false) {
        const err: any = new Error(`'face_enhance' not allowed on current plan`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
    }

    // Optional: Use assistant to suggest or override parameters
    if (assistantId) {
      const assistantPrompt = `Suggest optimal enhancement parameters for an image using model ${modelSlug}. Current params: scale=${scale}, faceEnhance=${faceEnhance}. Provide JSON: {"scale": 2|4, "faceEnhance": boolean}`;
      const response = await this.callCustomAssistant(assistantPrompt, assistantId);
      try {
        const suggested = JSON.parse(response.content);
        if (typeof suggested.scale === 'number' && (suggested.scale === 2 || suggested.scale === 4)) {
          scale = suggested.scale;
        }
        if (typeof suggested.faceEnhance === 'boolean') {
          faceEnhance = suggested.faceEnhance;
        }
        this.log.debug('assistant_params_applied', { assistantId, suggested });
      } catch {
        this.log.warn('assistant_suggestion_parse_failed', { assistantId });
      }
    }

    // Enforce size limit first
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`);
    }

    // Sniff MIME type from magic bytes (do not trust client-provided type)
    const fileBuffer = await file.arrayBuffer();
    const sniffed = detectImageMimeFromBytes(fileBuffer);
    if (!sniffed || !ALLOWED_CONTENT_TYPES.includes(sniffed as any)) {
      const display = sniffed ?? (file.type || 'unknown');
      throw new Error(`Unsupported content type: ${display}`);
    }

    // Dev debug: request context
    const reqId = `AIIMG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.log.debug('generate_start', {
      reqId,
      ownerType,
      ownerId,
      modelSlug,
      fileType: file.type,
      fileSize: file.size,
    });

    // Quota checks (monthly first, then daily burst), without increment yet
    const dailyLimit = typeof limitOverride === 'number' ? limitOverride : (ownerType === 'user' ? FREE_LIMIT_USER : FREE_LIMIT_GUEST);
    const monthlyLimit = typeof monthlyLimitOverride === 'number' ? monthlyLimitOverride : Number.POSITIVE_INFINITY;

    const now = new Date();
    const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthly = await this.getMonthlyUsage(ownerType, ownerId, monthlyLimit, ym);
    let usedCreditPack = false;
    if (monthly.used >= monthly.limit) {
      // Allow users (not guests) to consume credits if available
      const credits = ownerType === 'user' ? await this.getCreditsBalance(ownerId) : 0;
      if (credits > 0) {
        usedCreditPack = true;
      } else {
        const msgM = `Monthly quota exceeded. Used ${monthly.used}/${monthly.limit}`;
        const errM: any = new Error(msgM);
        errM.code = 'quota_exceeded';
        errM.details = { scope: 'monthly', ...monthly };
        throw errM;
      }
    }

    const currentUsage = await this.getUsage(ownerType, ownerId, dailyLimit);
    if (currentUsage.used >= currentUsage.limit) {
      const resetInfo = currentUsage.resetAt ? new Date(currentUsage.resetAt).toISOString() : null;
      const msg = `Quota exceeded. Used ${currentUsage.used}/${currentUsage.limit}` + (resetInfo ? `, resets at ${resetInfo}` : '');
      const err: any = new Error(msg);
      err.code = 'quota_exceeded';
      err.details = { scope: 'daily', ...currentUsage };
      throw err;
    }

    // Upload original to R2 (so provider can fetch by public URL)
    const bucket = this.env.R2_AI_IMAGES;
    if (!bucket) throw new Error('R2_AI_IMAGES bucket not configured');

    const originalExt = this.extFromContentType(sniffed) || this.extFromFilename(file.name) || 'bin';
    const timestamp = Date.now();
    const baseKey = `${AI_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
    const originalKey = `${baseKey}.${originalExt}`;

    const putOriginalStart = Date.now();
    await bucket.put(originalKey, fileBuffer, { httpMetadata: { contentType: sniffed } });
    this.log.debug('r2_put_original_ms', { reqId, ms: Date.now() - putOriginalStart });

    const originalUrl = this.buildPublicUrl(requestOrigin, originalKey);

    this.log.debug('uploaded_original', { reqId, originalKey, originalUrl });

    // Call provider (Replicate) with the originalUrl
    let outputUrl: string;
    let devEcho = false;
    // In any non-production environment, prefer deterministic dev echo over provider calls
    // to avoid external dependencies in local/integration runs.
    const forceDevEcho = this.isDevelopment();
    if (forceDevEcho) {
      this.log.warn('dev_echo_enabled', { reqId, reason: 'development_environment' });
      outputUrl = originalUrl;
      devEcho = true;
    } else {
      try {
        this.log.debug('replicate_call_start', { reqId, model: model.slug, originalUrl, scale, faceEnhance });
        // Build provider input parameters safely per model
        const replicateInput: Record<string, unknown> = { image: originalUrl };
        if (typeof scale === 'number' && model.supportsScale) {
          replicateInput.scale = scale;
        }
        if (typeof faceEnhance === 'boolean' && model.supportsFaceEnhance) {
          (replicateInput as any).face_enhance = faceEnhance;
        }
        outputUrl = await this.runReplicate(model, replicateInput);
        this.log.debug('replicate_call_success', { reqId, outputUrl });
      } catch (err) {
        // Graceful dev fallback to unblock local UI testing: use original image
        // Applies in development when Replicate responds 404 (slug/version issues)
        // OR when the token is missing locally.
        const message = err instanceof Error ? err.message : String(err);
        const is404 = /Replicate error\s+404/i.test(message);
        const missingToken = /Missing REPLICATE_API_TOKEN/i.test(message);
        if (this.isDevelopment() && (is404 || missingToken)) {
          this.log.warn('dev_echo_enabled', { reqId, reason: is404 ? 'provider_404' : 'missing_token', model: model.slug });
          outputUrl = originalUrl;
          devEcho = true;
        } else {
          throw err;
        }
      }
    }

    // In dev echo mode, skip fetching via HTTP and re-writing to R2 to avoid transient 404s
    if (devEcho && this.isDevelopment() && outputUrl === originalUrl) {
      const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
      if (usedCreditPack) {
        // consume one credit instead of incrementing monthly
        await this.decrementCreditsBalance(ownerId);
      } else {
        await this.incrementMonthlyUsage(ownerType, ownerId, monthlyLimit, ym);
      }
      this.log.debug('dev_echo_return', { reqId, imageUrl: originalUrl, usage });
      return { model: model.slug, originalUrl, imageUrl: originalUrl, usage };
    }

    // Fetch output and store to R2
    this.log.debug('fetch_output_start', { reqId, outputUrl });
    const { arrayBuffer, contentType } = await this.fetchBinary(outputUrl);
    this.log.debug('fetch_output_done', { reqId, contentType, bytes: arrayBuffer.byteLength });
    const resultExt = this.extFromContentType(contentType) || 'png';
    const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
    const putResultStart = Date.now();
    await bucket.put(resultKey, arrayBuffer, { httpMetadata: { contentType } });
    this.log.debug('r2_put_result_ms', { reqId, ms: Date.now() - putResultStart });
    this.log.debug('stored_result', { reqId, resultKey, contentType });

    const imageUrl = this.buildPublicUrl(requestOrigin, resultKey);

    // Increment usage after success (both monthly and daily)
    const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
    if (usedCreditPack) {
      await this.decrementCreditsBalance(ownerId);
    } else {
      await this.incrementMonthlyUsage(ownerType, ownerId, monthlyLimit, ym);
    }
    this.log.info('generate_success', { reqId, imageUrl, usage });

    return { model: model.slug, originalUrl, imageUrl, usage };
  }

  // Internals
  private getAllowedModel(slug: string): AllowedModel | undefined {
    return ALLOWED_MODELS.find((m) => m.slug === slug);
  }

  private usageKey(ownerType: OwnerType, ownerId: string): string {
    return `ai:usage:${ownerType}:${ownerId}`;
  }

  private monthlyUsageKey(ownerType: OwnerType, ownerId: string, ym: string): string {
    return `ai:usage:month:${ownerType}:${ownerId}:${ym}`;
  }

  private creditsKey(userId: string): string {
    return `ai:credits:user:${userId}`;
  }

  private async incrementUsage(ownerType: OwnerType, ownerId: string, limit: number): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };

    const key = this.usageKey(ownerType, ownerId);
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24h

    const raw = await kv.get(key);
    let count = 0;
    let resetAt = now + windowMs;

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { count: number; resetAt: number };
        if (parsed.resetAt && parsed.resetAt > now) {
          count = parsed.count || 0;
          resetAt = parsed.resetAt;
        }
      } catch {
        // ignore
      }
    }

    count += 1;
    const value = JSON.stringify({ count, resetAt });
    const expiration = Math.floor(resetAt / 1000);
    await kv.put(key, value, { expiration });

    const resp = { used: count, limit, resetAt };
    try {
      const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
      this.log.debug('usage_increment', { action: 'usage_increment', metadata: { ownerType, ownerId: mask, key, used: resp.used, limit: resp.limit, expiration } });
    } catch {}
    return resp;
  }

  private extFromFilename(name: string): string | null {
    const i = name.lastIndexOf('.');
    if (i === -1) return null;
    return name.slice(i + 1).toLowerCase();
  }

  private extFromContentType(ct: string): string | null {
    if (!ct) return null;
    if (ct === 'image/jpeg') return 'jpg';
    if (ct === 'image/png') return 'png';
    if (ct === 'image/webp') return 'webp';
    return null;
  }

  private buildPublicUrl(origin: string, key: string): string {
    // Served via src/pages/r2-ai/[...path].ts
    // Normalize origin and coerce to https on non-local hosts to avoid CSP blocking http images on production.
    try {
      const u = new URL(origin);
      const host = u.hostname;
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.local') ||
        /^192\.168\./.test(host) ||
        /^10\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
      // If not local and protocol is http, switch to https
      if (!isLocal && u.protocol === 'http:') {
        u.protocol = 'https:';
      }
      return `${u.origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
    } catch {
      // Fallback: assume provided origin is already a valid origin string
      return `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
    }
  }

  private async fetchBinary(url: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string }> {
    const started = Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch output ${res.status} from ${url}`);
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    const buf = await res.arrayBuffer();
    if (this.isDevelopment()) {
      console.debug('[AiImageService] fetchBinary(ms)', { ms: Date.now() - started, contentType: ct, bytes: buf.byteLength });
    }
    return { arrayBuffer: buf, contentType: ct };
  }

  private async runReplicate(model: AllowedModel, input: Record<string, unknown>): Promise<string> {
    const token = this.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('Missing REPLICATE_API_TOKEN');

    const payload = { input: { ...model.defaultParams, ...input } };

    // Use the "run" endpoint with slug, which supports owner/model:tag
    const url = `https://api.replicate.com/v1/run/${model.slug}`;
    if (this.isDevelopment()) {
      console.debug('[AiImageService] Replicate POST', { url, model: model.slug });
    }
    const started = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - started;
    this.log.debug('replicate_duration_ms', { model: model.slug, ms: durationMs });

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      // Build standardized provider error (typed for API middleware)
      const err = buildProviderError(status, 'replicate', text);
      // Avoid leaking provider payloads to clients; keep truncated snippet in logs only
      this.log.warn('replicate_error', { status, provider: 'replicate', snippet: text.slice(0, 200) });
      throw err;
    }

    const data = (await res.json()) as { output?: unknown };
    const out = data.output;

    if (typeof out === 'string') return out;
    if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string') return out[0] as string;

    throw new Error('Replicate response missing output');
  }

  private isDevelopment(): boolean {
    const env = (this.env.ENVIRONMENT || '').toLowerCase();
    // Treat only explicit dev/test/local as development-like
    return env === 'development' || env === 'dev' || env === 'testing' || env === 'test' || env === 'local' || env === '';
  }
}