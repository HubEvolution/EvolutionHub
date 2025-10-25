import {
  ALLOWED_MODELS,
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  AI_R2_PREFIX,
  FREE_LIMIT_GUEST,
  FREE_LIMIT_USER,
  type AllowedModel,
  type OwnerType,
} from '@/config/ai-image';
import { detectImageMimeFromBytes as sniffImageMimeFromBytes } from '@/lib/utils/mime';
import { loggerFactory } from '@/server/utils/logger-factory';
import { buildProviderError } from './provider-error';
import OpenAI from 'openai';
import { computeEnhancerCost } from '@/config/ai-image/entitlements';
import type { ExtendedLogger } from '@/types/logger';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';
import { buildWorkersAiPayload } from '@/lib/services/ai-image/providers/workers-ai';
import {
  getUsage as kvGetUsage,
  incrementDailyRolling,
  rollingDailyKey,
  legacyMonthlyKey,
  getCreditsBalanceTenths,
  consumeCreditsTenths,
} from '@/lib/kv/usage';

interface RuntimeEnv {
  R2_AI_IMAGES?: R2Bucket;
  KV_AI_ENHANCER?: KVNamespace;
  REPLICATE_API_TOKEN?: string;
  OPENAI_API_KEY?: string;
  ENVIRONMENT?: string;
  USAGE_KV_V2?: string;
  AI?: any;
  WORKERS_AI_ENABLED?: string;
  TESTING_WORKERS_AI_ALLOW?: string;
  TESTING_ALLOWED_CF_MODELS?: string;
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
  prompt?: string;
  negativePrompt?: string;
  strength?: number;
  guidance?: number;
  steps?: number;
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
  imageUrl: string;
  usage: UsageInfo;
  charge?: { total: number; planPortion: number; creditsPortion: number };
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

  private async runWorkersAi(
    model: AllowedModel,
    input: Record<string, unknown>
  ): Promise<{ arrayBuffer: ArrayBuffer; contentType: string }> {
    const ai = (this.env as any).AI;
    if (!ai) {
      const err: any = new Error('Workers AI binding not configured');
      err.apiErrorType = 'server_error';
      throw err;
    }
    // Build payload via adapter (enforces image_b64 + param mapping)
    const payload: Record<string, unknown> = buildWorkersAiPayload(model, input);
    const chosen: 'b64' | null = 'b64';
    try {
      const t = typeof (payload as any).image_b64;
      const s = t === 'string' ? String((payload as any).image_b64).slice(0, 60) : '';
      this.log.info('workers_ai_payload_image', {
        action: 'workers_ai_payload_image',
        metadata: { type: t, snippet: s, model: model.slug, chosen, field: 'image_b64' },
      });
    } catch {}
    const started = Date.now();
    let out: any;
    try {
      out = await ai.run(model.slug, payload);
    } catch (err) {
      try {
        const t = typeof (payload as any).image_b64;
        const s = t === 'string' ? String((payload as any).image_b64).slice(0, 60) : '';
        this.log.warn('workers_ai_run_failed', {
          action: 'workers_ai_run_failed',
          metadata: {
            model: model.slug,
            error: err instanceof Error ? err.message : String(err),
            payloadKeys: Object.keys(payload as any),
            imageType: t,
            imageSnippet: s,
          },
        });
      } catch {}
      throw err;
    }
    let buf: ArrayBuffer | null = null;
    let ct = 'image/png';
    if (out && typeof out.arrayBuffer === 'function') {
      const blob = out as Blob;
      buf = await blob.arrayBuffer();
      ct = (blob as any).type || ct;
    } else if (out && typeof out.headers === 'object' && typeof out.arrayBuffer === 'function') {
      const res = out as Response;
      ct = res.headers.get('content-type') || ct;
      buf = await res.arrayBuffer();
    } else if (out instanceof ArrayBuffer) {
      buf = out as ArrayBuffer;
    } else if (out instanceof Uint8Array) {
      buf = (out as Uint8Array).buffer as unknown as ArrayBuffer;
    } else if (typeof out === 'string') {
      // Some models may return a data URI or raw base64 string
      const m = /^data:(.*?);base64,(.*)$/.exec(out);
      if (m) {
        ct = m[1] || ct;
        buf = this.base64ToArrayBuffer(m[2]);
      } else {
        buf = this.base64ToArrayBuffer(out);
      }
    } else if (out && typeof out === 'object') {
      // Some CF models return JSON with base64 fields
      // Try common shapes: { image: base64 }, { images: [base64] }, { output: { image }, output: { images } }, { output: [base64] }, { result: ... }
      let b64: string | undefined;
      if (typeof (out as any).image === 'string') {
        b64 = (out as any).image as string;
      } else if (Array.isArray((out as any).images) && typeof (out as any).images[0] === 'string') {
        b64 = (out as any).images[0] as string;
      } else if ((out as any).image instanceof Uint8Array) {
        buf = ((out as any).image as Uint8Array).buffer as unknown as ArrayBuffer;
      } else if (
        Array.isArray((out as any).images) &&
        (out as any).images[0] instanceof Uint8Array
      ) {
        buf = ((out as any).images[0] as Uint8Array).buffer as unknown as ArrayBuffer;
      } else if ((out as any).output) {
        const o = (out as any).output;
        if (typeof o === 'string') {
          b64 = o;
        } else if (typeof o?.image === 'string') {
          b64 = o.image as string;
        } else if (Array.isArray(o?.images) && typeof o.images[0] === 'string') {
          b64 = o.images[0] as string;
        } else if (Array.isArray(o) && typeof o[0] === 'string') {
          b64 = o[0] as string;
        } else if (o instanceof Uint8Array) {
          buf = (o as Uint8Array).buffer as unknown as ArrayBuffer;
        } else if (o?.image instanceof Uint8Array) {
          buf = (o.image as Uint8Array).buffer as unknown as ArrayBuffer;
        } else if (Array.isArray(o?.images) && o.images[0] instanceof Uint8Array) {
          buf = (o.images[0] as Uint8Array).buffer as unknown as ArrayBuffer;
        }
      } else if ((out as any).result) {
        const r = (out as any).result;
        if (typeof r === 'string') {
          b64 = r;
        } else if (typeof r?.image === 'string') {
          b64 = r.image as string;
        } else if (Array.isArray(r?.images) && typeof r.images[0] === 'string') {
          b64 = r.images[0] as string;
        } else if (Array.isArray(r) && typeof r[0] === 'string') {
          b64 = r[0] as string;
        } else if (r instanceof Uint8Array) {
          buf = (r as Uint8Array).buffer as unknown as ArrayBuffer;
        } else if (r?.image instanceof Uint8Array) {
          buf = (r.image as Uint8Array).buffer as unknown as ArrayBuffer;
        } else if (Array.isArray(r?.images) && r.images[0] instanceof Uint8Array) {
          buf = (r.images[0] as Uint8Array).buffer as unknown as ArrayBuffer;
        }
      }
      if (b64 && typeof b64 === 'string') {
        try {
          buf = this.base64ToArrayBuffer(b64);
        } catch (e) {
          this.log.warn('workers_ai_b64_decode_failed', {
            action: 'workers_ai_b64_decode_failed',
            metadata: { snippet: b64.slice(0, 40) },
          });
          throw new Error('Workers AI returned invalid base64 image');
        }
      } else if (buf) {
        // buf was set from a Uint8Array path above; keep default ct
      } else {
        const jsonLike = JSON.stringify(out).slice(0, 120);
        this.log.warn('workers_ai_unknown_output', {
          action: 'workers_ai_unknown_output',
          metadata: { snippet: jsonLike },
        });
        // Last-resort: attempt to coerce via Response wrapper (covers ReadableStream, ArrayBufferView, etc.)
        try {
          const res2 = new Response(out as any);
          const ct2 = res2.headers.get('content-type');
          if (ct2) ct = ct2;
          buf = await res2.arrayBuffer();
        } catch (e) {
          throw new Error('Workers AI returned unsupported output');
        }
      }
    } else {
      const jsonLike = typeof out === 'object' ? JSON.stringify(out).slice(0, 120) : String(out);
      this.log.warn('workers_ai_unknown_output', {
        action: 'workers_ai_unknown_output',
        metadata: { snippet: jsonLike },
      });
      throw new Error('Workers AI returned unsupported output');
    }
    this.log.debug('workers_ai_duration_ms', {
      action: 'workers_ai_duration_ms',
      metadata: { model: model.slug, ms: Date.now() - started },
    });
    if (!buf) {
      throw new Error('Workers AI returned unsupported output');
    }
    return { arrayBuffer: buf as ArrayBuffer, contentType: ct };
  }

  // Encode ArrayBuffer to base64 string for Workers AI image_b64 input
  private arrayBufferToBase64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Decode base64 (optionally data URI) to ArrayBuffer
  private base64ToArrayBuffer(b64: string): ArrayBuffer {
    const m = /^data:(.*?);base64,(.*)$/.exec(b64);
    const data = m ? m[2] : b64;
    const binary = atob(data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // For testability: expose a method that forwards to the shared MIME sniffer
  // so unit tests can spy on instance instead of module import.
  private detectImageMimeFromBytes(buffer: ArrayBuffer): string | null {
    return sniffImageMimeFromBytes(buffer) as any;
  }

  private async getMonthlyUsage(
    ownerType: OwnerType,
    ownerId: string,
    limit: number,
    ym: string
  ): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    if (this.kvV2Enabled()) {
      const keyV2 = legacyMonthlyKey('ai', ownerType, ownerId);
      const rawV2 = await kv.get(keyV2);
      if (!rawV2) return { used: 0, limit, resetAt: null };
      try {
        const obj = JSON.parse(rawV2) as { count?: number; countTenths?: number };
        const used = typeof obj.countTenths === 'number' ? obj.countTenths / 10 : obj.count || 0;
        return { used, limit, resetAt: null };
      } catch {
        return { used: 0, limit, resetAt: null };
      }
    }
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

  private async incrementMonthlyBy(
    ownerType: OwnerType,
    ownerId: string,
    limit: number,
    ym: string,
    delta: number
  ): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    if (this.kvV2Enabled()) {
      const keyV2 = legacyMonthlyKey('ai', ownerType, ownerId);
      const raw = await kv.get(keyV2);
      let countTenths = 0;
      if (raw) {
        try {
          const obj = JSON.parse(raw) as { count?: number; countTenths?: number };
          countTenths =
            typeof obj.countTenths === 'number' ? obj.countTenths : (obj.count || 0) * 10;
        } catch {}
      }
      const addTenths = Math.max(0, Math.round((typeof delta === 'number' ? delta : 0) * 10));
      countTenths += addTenths;
      const count = Math.floor(countTenths / 10);
      await kv.put(keyV2, JSON.stringify({ count, countTenths }));
      return { used: countTenths / 10, limit, resetAt: null };
    }
    const key = this.monthlyUsageKey(ownerType, ownerId, ym);
    const raw = await kv.get(key);
    let count = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { count: number };
        count = parsed.count || 0;
      } catch {}
    }
    count += typeof delta === 'number' ? delta : 0;
    await kv.put(key, JSON.stringify({ count }));
    return { used: count, limit, resetAt: null };
  }

  private kvV2Enabled(): boolean {
    const v = (this.env.USAGE_KV_V2 || '').toString().toLowerCase();
    return v === '1' || v === 'true';
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
    const useV2 = this.kvV2Enabled();
    if (useV2) {
      const keyV2 = rollingDailyKey('ai', ownerType, ownerId);
      const usage = await kvGetUsage(kv, keyV2);
      if (!usage) return { used: 0, limit, resetAt: null };
      return { used: usage.count, limit, resetAt: usage.resetAt ? usage.resetAt * 1000 : null };
    }

    const key = this.usageKey(ownerType, ownerId);
    const raw = await kv.get(key);
    if (!raw) {
      try {
        const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
        this.log.debug('usage_get_empty', {
          action: 'usage_get_empty',
          metadata: { ownerType, ownerId: mask, key, limit },
        });
      } catch {}
      return { used: 0, limit, resetAt: null };
    }

    try {
      const parsed = JSON.parse(raw) as { count: number; resetAt: number };
      const resp = { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
      try {
        const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
        this.log.debug('usage_get_ok', {
          action: 'usage_get_ok',
          metadata: {
            ownerType,
            ownerId: mask,
            key,
            used: resp.used,
            limit: resp.limit,
            hasReset: !!resp.resetAt,
          },
        });
      } catch {}
      return resp;
    } catch {
      try {
        const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
        this.log.warn('usage_get_parse_failed', {
          action: 'usage_get_parse_failed',
          metadata: { ownerType, ownerId: mask, key },
        });
      } catch {}
      return { used: 0, limit, resetAt: null };
    }
  }

  public async callCustomAssistant(
    prompt: string,
    assistantId: string
  ): Promise<AssistantResponse> {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const openai = new OpenAI({ apiKey });

    // Step 1: Create thread, add user message, create run (wrap network errors)
    let threadId: string;
    let runId: string;
    let runStatusValue: string;
    try {
      const thread = await openai.beta.threads.create();
      if (!thread || !(thread as any).id) {
        throw new Error('Thread creation returned no id');
      }
      threadId = (thread as any).id as string;

      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: prompt,
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });
      if (!run || !(run as any).id) {
        throw new Error('Run creation returned no id');
      }
      runId = (run as any).id as string;
      runStatusValue = (run as any).status as string;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log.error('assistant_call_failed', {
        action: 'assistant_call_failed',
        metadata: { error: msg },
      });
      throw new Error('Failed to call assistant');
    }

    // Step 2: Poll run status (bubble failures with specific message)
    try {
      let status = runStatusValue;
      while (status !== 'completed' && status !== 'failed' && status !== 'cancelled') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId as any);
        status = (runStatus as any).status;
      }
      if (status !== 'completed') {
        throw new Error(`Run failed with status: ${status}`);
      }

      // Step 3: Fetch messages, ensure assistant response exists (bubble specific error)
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessage = (messages as any).data.find((m: any) => m.role === 'assistant');
      if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
        throw new Error('No response from assistant');
      }
      const content =
        assistantMessage.content[0].type === 'text' ? assistantMessage.content[0].text.value : '';
      return { content };
    } catch (error) {
      // Ensure we surface a consistent error while allowing specific message assertions in tests
      if (error instanceof Error && /Run failed with status:/.test(error.message)) {
        throw error;
      }
      if (error instanceof Error && /No response from assistant/.test(error.message)) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      this.log.error('assistant_call_failed', {
        action: 'assistant_call_failed',
        metadata: { error: msg },
      });
      throw new Error('Failed to call assistant');
    }
  }

  async generate({
    ownerType,
    ownerId,
    modelSlug,
    file,
    requestOrigin,
    scale,
    faceEnhance,
    assistantId,
    prompt,
    negativePrompt,
    strength,
    guidance,
    steps,
    limitOverride,
    monthlyLimitOverride,
    maxUpscaleOverride,
    allowFaceEnhanceOverride,
  }: GenerateParams): Promise<GenerateResult> {
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
        if (
          typeof suggested.scale === 'number' &&
          (suggested.scale === 2 || suggested.scale === 4)
        ) {
          scale = suggested.scale;
        }
        if (typeof suggested.faceEnhance === 'boolean') {
          faceEnhance = suggested.faceEnhance;
        }
        this.log.debug('assistant_params_applied', {
          action: 'assistant_params_applied',
          metadata: { assistantId, suggested },
        });
      } catch {
        this.log.warn('assistant_suggestion_parse_failed', {
          action: 'assistant_suggestion_parse_failed',
          metadata: { assistantId },
        });
      }
    }

    // Enforce size limit first
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`);
    }

    // Sniff MIME type from magic bytes (do not trust client-provided type)
    const fileBuffer = await file.arrayBuffer();
    const sniffed = this.detectImageMimeFromBytes(fileBuffer);
    if (!sniffed || !ALLOWED_CONTENT_TYPES.includes(sniffed as any)) {
      const display = sniffed ?? (file.type || 'unknown');
      throw new Error(`Unsupported content type: ${display}`);
    }

    // Dev debug: request context
    const reqId = `AIIMG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.log.debug('generate_start', {
      action: 'generate_start',
      metadata: { reqId, ownerType, ownerId, modelSlug, fileType: file.type, fileSize: file.size },
    });

    // Quota checks (monthly first, then daily burst), without increment yet
    const dailyLimit =
      typeof limitOverride === 'number'
        ? limitOverride
        : ownerType === 'user'
          ? FREE_LIMIT_USER
          : FREE_LIMIT_GUEST;
    const monthlyLimit =
      typeof monthlyLimitOverride === 'number' ? monthlyLimitOverride : Number.POSITIVE_INFINITY;

    const now = new Date();
    const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthly = await this.getMonthlyUsage(ownerType, ownerId, monthlyLimit, ym);
    const cost = computeEnhancerCost({ modelSlug, scale, faceEnhance });
    const monthlyRemaining = Math.max(0, monthly.limit - monthly.used);
    let planPortion = Math.min(cost, monthlyRemaining);
    const creditsPortion = Math.max(0, Math.round((cost - planPortion) * 10) / 10);
    if (creditsPortion > 0 && ownerType === 'user') {
      const tenths = await getCreditsBalanceTenths(this.env.KV_AI_ENHANCER as any, ownerId);
      if (tenths < Math.round(creditsPortion * 10)) {
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
      const msg =
        `Quota exceeded. Used ${currentUsage.used}/${currentUsage.limit}` +
        (resetInfo ? `, resets at ${resetInfo}` : '');
      const err: any = new Error(msg);
      err.code = 'quota_exceeded';
      err.details = { scope: 'daily', ...currentUsage };
      throw err;
    }

    // Upload original to R2 (so provider can fetch by public URL)
    const bucket = this.env.R2_AI_IMAGES;
    if (!bucket) throw new Error('R2_AI_IMAGES bucket not configured');

    const originalExt =
      this.extFromContentType(sniffed) || this.extFromFilename(file.name) || 'bin';
    const timestamp = Date.now();
    const baseKey = `${AI_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
    const originalKey = `${baseKey}.${originalExt}`;

    const putOriginalStart = Date.now();
    await bucket.put(originalKey, fileBuffer, { httpMetadata: { contentType: sniffed } });
    this.log.debug('r2_put_original_ms', {
      action: 'r2_put_original_ms',
      metadata: { reqId, ms: Date.now() - putOriginalStart },
    });

    const originalUrl = this.buildPublicUrl(requestOrigin, originalKey);

    this.log.debug('uploaded_original', {
      action: 'uploaded_original',
      metadata: { reqId, originalKey, originalUrl },
    });
    try {
      const envName = (this.env.ENVIRONMENT || '').toLowerCase();
      if (envName !== 'production') {
        console.log('[uploaded_original]', { originalUrl });
      }
    } catch {}

    const envName = (this.env.ENVIRONMENT || '').toLowerCase();
    let imageUrl: string;
    if (envName === 'development' || envName === 'testing') {
      if (model.provider === 'replicate') {
        const err: any = new Error('Model not allowed in this environment');
        err.apiErrorType = 'forbidden';
        throw err;
      }
      if (model.provider === 'workers_ai') {
        const enabled = this.env.WORKERS_AI_ENABLED === '1';
        if (!enabled) {
          const err: any = new Error('Workers AI disabled');
          err.apiErrorType = 'forbidden';
          throw err;
        }
        if (envName === 'testing') {
          const allow = this.env.TESTING_WORKERS_AI_ALLOW === '1';
          if (!allow) {
            const err: any = new Error('Workers AI not allowed in testing');
            err.apiErrorType = 'forbidden';
            throw err;
          }
          let allowedList: string[] = [];
          try {
            const raw = this.env.TESTING_ALLOWED_CF_MODELS || '[]';
            allowedList = JSON.parse(raw);
          } catch {}
          if (!allowedList.includes(model.slug)) {
            const err: any = new Error('Model not allowed in testing');
            err.apiErrorType = 'forbidden';
            throw err;
          }
          if (typeof strength === 'number') strength = Math.min(0.6, Math.max(0.1, strength));
          if (typeof guidance === 'number') guidance = Math.min(9, Math.max(3, guidance));
          if (typeof steps === 'number' && ![10, 20, 30].includes(steps)) {
            const err: any = new Error('Unsupported steps in testing');
            err.apiErrorType = 'validation_error';
            throw err;
          }
        }
        const wa = await this.runWorkersAi(model, {
          image_b64: this.arrayBufferToBase64(fileBuffer),
          prompt,
          negative_prompt: negativePrompt,
          strength,
          guidance,
          steps,
        });
        const resultExt = this.extFromContentType(wa.contentType) || 'png';
        const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
        const putResultStart = Date.now();
        await bucket.put(resultKey, wa.arrayBuffer, {
          httpMetadata: { contentType: wa.contentType },
        });
        this.log.debug('r2_put_result_ms', {
          action: 'r2_put_result_ms',
          metadata: { reqId, ms: Date.now() - putResultStart },
        });
        this.log.debug('stored_result', {
          action: 'stored_result',
          metadata: { reqId, resultKey, contentType: wa.contentType },
        });
        imageUrl = this.buildPublicUrl(requestOrigin, resultKey);
      } else {
        const err: any = new Error('Unsupported provider');
        err.apiErrorType = 'validation_error';
        throw err;
      }
    } else {
      if (model.provider === 'workers_ai') {
        const enabled = this.env.WORKERS_AI_ENABLED === '1';
        if (!enabled) {
          const err: any = new Error('Workers AI disabled');
          err.apiErrorType = 'forbidden';
          throw err;
        }
        const wa = await this.runWorkersAi(model, {
          image_b64: this.arrayBufferToBase64(fileBuffer),
          prompt,
          negative_prompt: negativePrompt,
          strength,
          guidance,
          steps,
        });
        const resultExt = this.extFromContentType(wa.contentType) || 'png';
        const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
        const putResultStart = Date.now();
        await bucket.put(resultKey, wa.arrayBuffer, {
          httpMetadata: { contentType: wa.contentType },
        });
        this.log.debug('r2_put_result_ms', {
          action: 'r2_put_result_ms',
          metadata: { reqId, ms: Date.now() - putResultStart },
        });
        this.log.debug('stored_result', {
          action: 'stored_result',
          metadata: { reqId, resultKey, contentType: wa.contentType },
        });
        imageUrl = this.buildPublicUrl(requestOrigin, resultKey);
      } else {
        let outputUrl: string;
        try {
          this.log.debug('replicate_call_start', {
            action: 'replicate_call_start',
            metadata: { reqId, model: model.slug, originalUrl, scale, faceEnhance },
          });
          const replicateInput: Record<string, unknown> = {};
          if (
            model.slug.startsWith('tencentarc/gfpgan') ||
            model.slug.startsWith('sczhou/codeformer')
          ) {
            (replicateInput as any).img = originalUrl;
          } else {
            (replicateInput as any).image = originalUrl;
          }
          if (typeof scale === 'number' && model.supportsScale) {
            (replicateInput as any).scale = scale;
          }
          if (typeof faceEnhance === 'boolean' && model.supportsFaceEnhance) {
            (replicateInput as any).face_enhance = faceEnhance;
          }
          outputUrl = await this.runReplicate(model, replicateInput);
          this.log.debug('replicate_call_success', {
            action: 'replicate_call_success',
            metadata: { reqId, outputUrl },
          });
        } catch (err) {
          throw err;
        }
        this.log.debug('fetch_output_start', {
          action: 'fetch_output_start',
          metadata: { reqId, outputUrl },
        });
        const { arrayBuffer, contentType } = await this.fetchBinary(outputUrl);
        this.log.debug('fetch_output_done', {
          action: 'fetch_output_done',
          metadata: { reqId, contentType, bytes: arrayBuffer.byteLength },
        });
        const resultExt = this.extFromContentType(contentType) || 'png';
        const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
        const putResultStart = Date.now();
        await bucket.put(resultKey, arrayBuffer, { httpMetadata: { contentType } });
        this.log.debug('r2_put_result_ms', {
          action: 'r2_put_result_ms',
          metadata: { reqId, ms: Date.now() - putResultStart },
        });
        this.log.debug('stored_result', {
          action: 'stored_result',
          metadata: { reqId, resultKey, contentType },
        });
        imageUrl = this.buildPublicUrl(requestOrigin, resultKey);
      }
    }

    // Increment usage after success (both monthly and daily)
    const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
    if (planPortion > 0) {
      await this.incrementMonthlyBy(ownerType, ownerId, monthlyLimit, ym, planPortion);
    }
    if (ownerType === 'user') {
      const cp = Math.max(0, Math.round((cost - planPortion) * 10));
      if (cp > 0) {
        await consumeCreditsTenths(this.env.KV_AI_ENHANCER as any, ownerId, cp, reqId);
      }
    }
    this.log.info('generate_success', {
      action: 'generate_success',
      metadata: { reqId, imageUrl, usage },
    });

    return {
      model: model.slug,
      originalUrl,
      imageUrl,
      usage,
      charge: {
        total: cost,
        planPortion,
        creditsPortion: Math.max(0, Math.round((cost - planPortion) * 10) / 10),
      },
    };
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

  private async incrementUsage(
    ownerType: OwnerType,
    ownerId: string,
    limit: number
  ): Promise<UsageInfo> {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    const useV2 = this.env.USAGE_KV_V2 === '1';
    if (useV2) {
      const res = await incrementDailyRolling(kv, 'ai', ownerType, ownerId, limit);
      return { used: res.usage.count, limit, resetAt: res.usage.resetAt * 1000 };
    }

    const key = this.usageKey(ownerType, ownerId);
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;

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
      } catch {}
    }

    count += 1;
    const value = JSON.stringify({ count, resetAt });
    const expiration = Math.floor(resetAt / 1000);
    await kv.put(key, value, { expiration });

    const resp = { used: count, limit, resetAt };
    try {
      const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
      this.log.debug('usage_increment', {
        action: 'usage_increment',
        metadata: { ownerType, ownerId: mask, key, used: resp.used, limit: resp.limit, expiration },
      });
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
      // If not local and protocol is http, switch to https
      if (!this.isLocalHost(origin) && u.protocol === 'http:') {
        u.protocol = 'https:';
      }
      return `${u.origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
    } catch {
      // Fallback: assume provided origin is already a valid origin string
      return `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
    }
  }

  private async fetchBinary(
    url: string
  ): Promise<{ arrayBuffer: ArrayBuffer; contentType: string }> {
    const started = Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch output ${res.status} from ${url}`);
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    const buf = await res.arrayBuffer();
    if (this.isDevelopment()) {
      console.debug('[AiImageService] fetchBinary(ms)', {
        ms: Date.now() - started,
        contentType: ct,
        bytes: buf.byteLength,
      });
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
    this.log.debug('replicate_duration_ms', {
      action: 'replicate_duration_ms',
      metadata: { model: model.slug, ms: durationMs },
    });

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      // Build standardized provider error (typed for API middleware)
      const err = buildProviderError(status, 'replicate', text);
      // Avoid leaking provider payloads to clients; keep truncated snippet in logs only
      this.log.warn('replicate_error', {
        action: 'replicate_error',
        metadata: { status, provider: 'replicate', snippet: text.slice(0, 200) },
      });
      // Ensure visibility on Wrangler tail for non-production envs
      try {
        const envName = (this.env.ENVIRONMENT || '').toLowerCase();
        if (envName !== 'production') {
          console.warn('[replicate_error]', {
            status,
            provider: 'replicate',
            snippet: String(text).slice(0, 200),
          });
        }
      } catch {}
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
    return (
      env === 'development' ||
      env === 'dev' ||
      env === 'testing' ||
      env === 'test' ||
      env === 'local' ||
      env === ''
    );
  }
}
