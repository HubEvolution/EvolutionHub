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

function isAllowedContentType(v: string): v is (typeof ALLOWED_CONTENT_TYPES)[number] {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(v);
}

interface RuntimeEnv {
  R2_AI_IMAGES?: R2Bucket;
  KV_AI_ENHANCER?: KVNamespace;
  REPLICATE_API_TOKEN?: string;
  OPENAI_API_KEY?: string;
  ENVIRONMENT?: string;
  USAGE_KV_V2?: string;
  AI?: {
    run: (model: string, payload: Record<string, unknown>) => Promise<unknown>;
  };
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
    const ai = this.env.AI;
    if (!ai) {
      const err = new Error('Workers AI binding not configured') as Error & {
        apiErrorType?: 'server_error' | 'validation_error' | 'forbidden';
      };
      err.apiErrorType = 'server_error';
      throw err;
    }
    // Build payload via adapter (enforces image_b64 + param mapping)
    const payload: Record<string, unknown> = buildWorkersAiPayload(model, input);
    const chosen: 'b64' | null = 'b64';
    try {
      const img = (payload as Record<string, unknown>)['image_b64'];
      const t = typeof img;
      const s = t === 'string' ? String(img).slice(0, 60) : '';
      this.log.info('workers_ai_payload_image', {
        action: 'workers_ai_payload_image',
        metadata: { type: t, snippet: s, model: model.slug, chosen, field: 'image_b64' },
      });
    } catch {}
    const started = Date.now();
    let out: unknown;
    try {
      out = await ai.run(model.slug, payload);
    } catch (err) {
      try {
        const img = (payload as Record<string, unknown>)['image_b64'];
        const t = typeof img;
        const s = t === 'string' ? String(img).slice(0, 60) : '';
        this.log.warn('workers_ai_run_failed', {
          action: 'workers_ai_run_failed',
          metadata: {
            model: model.slug,
            error: err instanceof Error ? err.message : String(err),
            payloadKeys: Object.keys(payload as Record<string, unknown>),
            imageType: t,
            imageSnippet: s,
          },
        });
      } catch {}
      throw err;
    }
    let buf: ArrayBuffer | null = null;
    let ct = 'image/png';
    if (out instanceof Blob) {
      const blob = out;
      buf = await blob.arrayBuffer();
      const maybeType = blob.type;
      if (typeof maybeType === 'string') ct = maybeType;
    } else if (out instanceof Response) {
      const res = out;
      ct = res.headers.get('content-type') || ct;
      buf = await res.arrayBuffer();
    } else if (out instanceof ArrayBuffer) {
      buf = out;
    } else if (out instanceof Uint8Array) {
      buf = out.buffer as unknown as ArrayBuffer;
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
      const orec = out as Record<string, unknown>;
      if (typeof orec.image === 'string') {
        b64 = orec.image as string;
      } else if (Array.isArray(orec.images) && typeof (orec.images as unknown[])[0] === 'string') {
        b64 = (orec.images as unknown[])[0] as string;
      } else if (orec.image instanceof Uint8Array) {
        buf = (orec.image as Uint8Array).buffer as unknown as ArrayBuffer;
      } else if (
        Array.isArray(orec.images) &&
        (orec.images as unknown[])[0] instanceof Uint8Array
      ) {
        buf = ((orec.images as unknown[])[0] as Uint8Array).buffer as unknown as ArrayBuffer;
      } else if (orec.output) {
        const o = orec.output as unknown;
        if (typeof o === 'string') {
          b64 = o;
        } else if (typeof (o as Record<string, unknown> | undefined)?.image === 'string') {
          b64 = (o as Record<string, unknown>).image as string;
        } else if (
          Array.isArray((o as Record<string, unknown> | undefined)?.images) &&
          typeof ((o as Record<string, unknown>).images as unknown[])[0] === 'string'
        ) {
          b64 = ((o as Record<string, unknown>).images as unknown[])[0] as string;
        } else if (Array.isArray(o) && typeof (o as unknown[])[0] === 'string') {
          b64 = (o as unknown[])[0] as string;
        } else if (o instanceof Uint8Array) {
          buf = (o as Uint8Array).buffer as unknown as ArrayBuffer;
        } else if ((o as Record<string, unknown> | undefined)?.image instanceof Uint8Array) {
          buf = ((o as Record<string, unknown>).image as Uint8Array)
            .buffer as unknown as ArrayBuffer;
        } else if (
          Array.isArray((o as Record<string, unknown> | undefined)?.images) &&
          ((o as Record<string, unknown>).images as unknown[])[0] instanceof Uint8Array
        ) {
          buf = (((o as Record<string, unknown>).images as unknown[])[0] as Uint8Array)
            .buffer as unknown as ArrayBuffer;
        }
      } else if (orec.result) {
        const r = orec.result as unknown;
        if (typeof r === 'string') {
          b64 = r;
        } else if (typeof (r as Record<string, unknown> | undefined)?.image === 'string') {
          b64 = (r as Record<string, unknown>).image as string;
        } else if (
          Array.isArray((r as Record<string, unknown> | undefined)?.images) &&
          typeof ((r as Record<string, unknown>).images as unknown[])[0] === 'string'
        ) {
          b64 = ((r as Record<string, unknown>).images as unknown[])[0] as string;
        } else if (Array.isArray(r) && typeof (r as unknown[])[0] === 'string') {
          b64 = (r as unknown[])[0] as string;
        } else if (r instanceof Uint8Array) {
          buf = (r as Uint8Array).buffer as unknown as ArrayBuffer;
        } else if ((r as Record<string, unknown> | undefined)?.image instanceof Uint8Array) {
          buf = ((r as Record<string, unknown>).image as Uint8Array)
            .buffer as unknown as ArrayBuffer;
        } else if (
          Array.isArray((r as Record<string, unknown> | undefined)?.images) &&
          ((r as Record<string, unknown>).images as unknown[])[0] instanceof Uint8Array
        ) {
          buf = (((r as Record<string, unknown>).images as unknown[])[0] as Uint8Array)
            .buffer as unknown as ArrayBuffer;
        }
      }
      if (b64 && typeof b64 === 'string') {
        try {
          buf = this.base64ToArrayBuffer(b64);
        } catch (_e) {
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
          const res2 = new Response(out as unknown as BodyInit);
          const ct2 = res2.headers.get('content-type');
          if (ct2) ct = ct2;
          buf = await res2.arrayBuffer();
        } catch (_e) {
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

  // One-shot retry wrapper for Workers AI when output is suspiciously tiny (likely a bad decode)
  private async runWorkersAiWithRetry(
    model: AllowedModel,
    input: Record<string, unknown>
  ): Promise<{ arrayBuffer: ArrayBuffer; contentType: string }> {
    const TINY_BYTES = 15000; // ~15KB heuristic for black/invalid PNGs
    const first = await this.runWorkersAi(model, input);
    if ((first.arrayBuffer?.byteLength || 0) >= TINY_BYTES) return first;
    try {
      this.log.warn('workers_ai_tiny_output_retry', {
        action: 'workers_ai_tiny_output_retry',
        metadata: { model: model.slug, bytes: first.arrayBuffer?.byteLength || 0 },
      });
    } catch {}
    const second = await this.runWorkersAi(model, input);
    if ((second.arrayBuffer?.byteLength || 0) >= TINY_BYTES) return second;
    const err = new Error('Workers AI returned unexpectedly small image') as Error & {
      apiErrorType?: 'server_error' | 'validation_error' | 'forbidden';
    };
    err.apiErrorType = 'server_error';
    throw err;
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
    return sniffImageMimeFromBytes(buffer);
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

  async getMonthlyUsageFor(
    ownerType: OwnerType,
    ownerId: string,
    limit: number
  ): Promise<UsageInfo> {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return this.getMonthlyUsage(ownerType, ownerId, limit, ym);
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
      const threadIdMaybe = (thread as unknown as { id?: unknown })?.id;
      if (!thread || typeof threadIdMaybe !== 'string') {
        throw new Error('Thread creation returned no id');
      }
      threadId = threadIdMaybe;

      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: prompt,
      });

      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });
      const runLike = run as unknown as { id?: unknown; status?: unknown };
      if (!run || typeof runLike.id !== 'string') {
        throw new Error('Run creation returned no id');
      }
      runId = runLike.id;
      runStatusValue = typeof runLike.status === 'string' ? runLike.status : '';
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
        const runStatus = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
        const stat = (runStatus as unknown as { status?: unknown })?.status;
        status = typeof stat === 'string' ? stat : '';
      }
      if (status !== 'completed') {
        throw new Error(`Run failed with status: ${status}`);
      }

      // Step 3: Fetch messages, ensure assistant response exists (bubble specific error)
      const messages = await openai.beta.threads.messages.list(threadId);
      const data = (messages as unknown as { data?: unknown })?.data;
      const assistantMessage = Array.isArray(data)
        ? (data as Array<{ role?: unknown; content?: unknown[] }>).find(
            (m) => m && m.role === 'assistant'
          )
        : undefined;
      if (
        !assistantMessage ||
        !Array.isArray(assistantMessage.content) ||
        assistantMessage.content.length === 0
      ) {
        throw new Error('No response from assistant');
      }
      const first = assistantMessage.content[0] as unknown as {
        type?: unknown;
        text?: { value?: unknown };
      };
      const content =
        first?.type === 'text' && typeof first?.text?.value === 'string' ? first.text.value : '';
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
        const err = new Error(`Unsupported parameter 'scale' for model ${model.slug}`) as Error & {
          apiErrorType?: 'validation_error';
        };
        err.apiErrorType = 'validation_error';
        throw err;
      }
      if (!(scale === 2 || scale === 4)) {
        const err = new Error(`Unsupported value for 'scale': ${scale}`) as Error & {
          apiErrorType?: 'validation_error';
        };
        err.apiErrorType = 'validation_error';
        throw err;
      }
      // Enforce plan-based max upscale
      if (typeof maxUpscaleOverride === 'number' && scale > maxUpscaleOverride) {
        const err = new Error(
          `Requested 'scale' exceeds plan limit (${maxUpscaleOverride}x)`
        ) as Error & { apiErrorType?: 'validation_error' };
        err.apiErrorType = 'validation_error';
        throw err;
      }
    }
    if (typeof faceEnhance !== 'undefined') {
      if (!model.supportsFaceEnhance) {
        const err = new Error(
          `Unsupported parameter 'face_enhance' for model ${model.slug}`
        ) as Error & { apiErrorType?: 'validation_error' };
        err.apiErrorType = 'validation_error';
        throw err;
      }
      if (faceEnhance === true && allowFaceEnhanceOverride === false) {
        const err = new Error(`'face_enhance' not allowed on current plan`) as Error & {
          apiErrorType?: 'validation_error';
        };
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
    if (!sniffed || !isAllowedContentType(sniffed)) {
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
    const planPortion = Math.min(cost, monthlyRemaining);
    const creditsPortion = Math.max(0, Math.round((cost - planPortion) * 10) / 10);
    if (creditsPortion > 0 && ownerType === 'user') {
      const tenths = await getCreditsBalanceTenths(this.env.KV_AI_ENHANCER!, ownerId);
      if (tenths < Math.round(creditsPortion * 10)) {
        const msgM = `Monthly quota exceeded. Used ${monthly.used}/${monthly.limit}`;
        const errM = new Error(msgM) as Error & { code?: string; details?: unknown };
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
      const err = new Error(msg) as Error & { code?: string; details?: unknown };
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
        const err = new Error('Model not allowed in this environment') as Error & {
          apiErrorType?: 'forbidden';
        };
        err.apiErrorType = 'forbidden';
        throw err;
      }
      if (model.provider === 'workers_ai') {
        const enabled = this.env.WORKERS_AI_ENABLED === '1';
        if (!enabled) {
          const err = new Error('Workers AI disabled') as Error & { apiErrorType?: 'forbidden' };
          err.apiErrorType = 'forbidden';
          throw err;
        }
        if (envName === 'testing') {
          const allow = this.env.TESTING_WORKERS_AI_ALLOW === '1';
          if (!allow) {
            const err = new Error('Workers AI not allowed in testing') as Error & {
              apiErrorType?: 'forbidden';
            };
            err.apiErrorType = 'forbidden';
            throw err;
          }
          let allowedList: string[] = [];
          try {
            const raw = this.env.TESTING_ALLOWED_CF_MODELS || '[]';
            allowedList = JSON.parse(raw);
          } catch {}
          if (!allowedList.includes(model.slug)) {
            const err = new Error('Model not allowed in testing') as Error & {
              apiErrorType?: 'forbidden';
            };
            err.apiErrorType = 'forbidden';
            throw err;
          }
          if (typeof strength === 'number') strength = Math.min(0.6, Math.max(0.1, strength));
          if (typeof guidance === 'number') guidance = Math.min(9, Math.max(3, guidance));
          if (typeof steps === 'number' && ![10, 20, 30].includes(steps)) {
            const err = new Error('Unsupported steps in testing') as Error & {
              apiErrorType?: 'validation_error';
            };
            err.apiErrorType = 'validation_error';
            throw err;
          }
        }
        const wa = await this.runWorkersAiWithRetry(model, {
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
        const err = new Error('Unsupported provider') as Error & {
          apiErrorType?: 'validation_error';
        };
        err.apiErrorType = 'validation_error';
        throw err;
      }
    } else {
      if (model.provider === 'workers_ai') {
        const enabled = this.env.WORKERS_AI_ENABLED === '1';
        if (!enabled) {
          const err = new Error('Workers AI disabled') as Error & { apiErrorType?: 'forbidden' };
          err.apiErrorType = 'forbidden';
          throw err;
        }
        const wa = await this.runWorkersAiWithRetry(model, {
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
        this.log.debug('replicate_call_start', {
          action: 'replicate_call_start',
          metadata: { reqId, model: model.slug, originalUrl, scale, faceEnhance },
        });
        const replicateInput: Record<string, unknown> = {};
        if (
          model.slug.startsWith('tencentarc/gfpgan') ||
          model.slug.startsWith('sczhou/codeformer')
        ) {
          replicateInput['img'] = originalUrl;
        } else {
          replicateInput['image'] = originalUrl;
        }
        if (typeof scale === 'number' && model.supportsScale) {
          replicateInput['scale'] = scale;
        }
        if (typeof faceEnhance === 'boolean' && model.supportsFaceEnhance) {
          replicateInput['face_enhance'] = faceEnhance;
        }
        const outputUrl = await this.runReplicate(model, replicateInput);
        this.log.debug('replicate_call_success', {
          action: 'replicate_call_success',
          metadata: { reqId, outputUrl },
        });
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
        await consumeCreditsTenths(this.env.KV_AI_ENHANCER!, ownerId, cp, reqId);
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

    // Ensure slug contains a version for the /v1/run endpoint. If absent, resolve latest_version.
    let resolvedSlug = model.slug;
    if (!model.slug.includes(':')) {
      try {
        const [owner, name] = model.slug.split('/');
        if (owner && name) {
          const metaRes = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
            headers: { Authorization: `Token ${token}` },
          });
          if (metaRes.ok) {
            const meta = (await metaRes.json()) as {
              latest_version?: { id?: string };
              versions?: Array<{ id?: string }>;
            };
            const latestId = meta?.latest_version?.id || meta?.versions?.[0]?.id;
            if (typeof latestId === 'string' && latestId.length > 0) {
              resolvedSlug = `${owner}/${name}:${latestId}`;
            }
          }
        }
      } catch {}
    }

    const preferPredictions = resolvedSlug.startsWith('topazlabs/');
    const url = `https://api.replicate.com/v1/run/${resolvedSlug}`;
    if (this.isDevelopment()) {
      console.debug('[AiImageService] Replicate POST', {
        url,
        model: model.slug,
        preferPredictions,
      });
    }
    const started = Date.now();
    let res: Response;
    let usedPredictions = false;
    if (!preferPredictions) {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } else {
      // Skip run for Topaz; go predictions path directly
      res = new Response(null, { status: 404 });
    }

    // Fallback: some providers/models may not support the /v1/run endpoint.
    // If we get a 404 from /v1/run, retry via /v1/predictions with explicit version id.
    if (res.status === 404) {
      try {
        // Extract version id from resolved slug owner/name:version
        let versionId: string | null = null;
        const colonIdx = resolvedSlug.indexOf(':');
        if (colonIdx > 0 && colonIdx < resolvedSlug.length - 1) {
          versionId = resolvedSlug.slice(colonIdx + 1);
        }
        if (!versionId) {
          const [owner, name] = model.slug.split('/');
          if (owner && name) {
            const metaRes = await fetch(`https://api.replicate.com/v1/models/${owner}/${name}`, {
              headers: { Authorization: `Token ${token}` },
            });
            if (metaRes.ok) {
              const meta = (await metaRes.json()) as {
                latest_version?: { id?: string };
                versions?: Array<{ id?: string }>;
              };
              versionId = meta?.latest_version?.id || meta?.versions?.[0]?.id || null;
            }
          }
        }
        if (versionId) {
          const predUrl = 'https://api.replicate.com/v1/predictions';
          const predBody = {
            version: versionId,
            input: { ...model.defaultParams, ...(input as Record<string, unknown>) },
          };
          res = await fetch(predUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify(predBody),
          });
          usedPredictions = true;
        }
      } catch {}
    }

    const durationMs = Date.now() - started;
    this.log.debug('replicate_duration_ms', {
      action: 'replicate_duration_ms',
      metadata: { model: model.slug, ms: durationMs },
    });

    // If we used the predictions API, poll until completion and return output
    if (usedPredictions) {
      if (!res.ok) {
        const status = res.status;
        const text = await res.text();
        const { buildProviderError } = await import('./' + 'provider-error');
        this.log.warn('replicate_error', {
          action: 'replicate_error',
          metadata: {
            status,
            provider: 'replicate',
            model: model.slug,
            snippet: text.slice(0, 200),
          },
        });
        throw buildProviderError(status, 'replicate', text);
      }
      type Pred = { id: string; status: string; output?: unknown; error?: unknown };
      let data = (await res.json()) as Pred;
      const startPoll = Date.now();
      const maxMs = 60000; // 60s cap
      const poll = async (id: string) => {
        const getRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
          headers: { Authorization: `Token ${token}` },
        });
        return (await getRes.json()) as Pred;
      };
      while (
        data &&
        data.status &&
        data.status !== 'succeeded' &&
        data.status !== 'failed' &&
        data.status !== 'canceled' &&
        Date.now() - startPoll < maxMs
      ) {
        await new Promise((r) => setTimeout(r, 600));
        data = await poll(data.id);
      }
      if (data.status !== 'succeeded') {
        const { buildProviderError } = await import('./' + 'provider-error');
        // Treat as validation error if failed, otherwise server error
        const mapped = data.status === 'failed' ? 422 : 500;
        this.log.warn('replicate_error', {
          action: 'replicate_error',
          metadata: {
            status: mapped,
            provider: 'replicate',
            model: model.slug,
            snippet: String(data.error || data.status),
          },
        });
        throw buildProviderError(mapped, 'replicate', String(data.error || data.status));
      }
      const out = data.output as unknown;
      if (typeof out === 'string') return out;
      if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string')
        return out[0] as string;
      throw new Error('Replicate response missing output');
    }

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      // Build standardized provider error (typed for API middleware)
      const { buildProviderError } = await import('./' + 'provider-error');
      const err = buildProviderError(status, 'replicate', text);
      // Avoid leaking provider payloads to clients; keep truncated snippet in logs only
      this.log.warn('replicate_error', {
        action: 'replicate_error',
        metadata: { status, provider: 'replicate', model: model.slug, snippet: text.slice(0, 200) },
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
