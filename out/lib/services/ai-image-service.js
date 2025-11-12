'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AiImageService = void 0;
const ai_image_1 = require('@/config/ai-image');
const mime_1 = require('@/lib/utils/mime');
const logger_factory_1 = require('@/server/utils/logger-factory');
const openai_1 = require('openai');
const entitlements_1 = require('@/config/ai-image/entitlements');
const workers_ai_1 = require('@/lib/services/ai-image/providers/workers-ai');
const usage_1 = require('@/lib/kv/usage');
function isAllowedContentType(v) {
  return ai_image_1.ALLOWED_CONTENT_TYPES.includes(v);
}
class AiImageService {
  constructor(env) {
    this.env = env;
    this.log = logger_factory_1.loggerFactory.createLogger('ai-image-service');
  }
  async runWorkersAi(model, input) {
    const ai = this.env.AI;
    if (!ai) {
      const err = new Error('Workers AI binding not configured');
      err.apiErrorType = 'server_error';
      throw err;
    }
    // Build payload via adapter (enforces image_b64 + param mapping)
    const payload = (0, workers_ai_1.buildWorkersAiPayload)(model, input);
    const chosen = 'b64';
    try {
      const img = payload['image_b64'];
      const t = typeof img;
      const s = t === 'string' ? String(img).slice(0, 60) : '';
      this.log.info('workers_ai_payload_image', {
        action: 'workers_ai_payload_image',
        metadata: { type: t, snippet: s, model: model.slug, chosen, field: 'image_b64' },
      });
    } catch {}
    const started = Date.now();
    let out;
    try {
      out = await ai.run(model.slug, payload);
    } catch (err) {
      try {
        const img = payload['image_b64'];
        const t = typeof img;
        const s = t === 'string' ? String(img).slice(0, 60) : '';
        this.log.warn('workers_ai_run_failed', {
          action: 'workers_ai_run_failed',
          metadata: {
            model: model.slug,
            error: err instanceof Error ? err.message : String(err),
            payloadKeys: Object.keys(payload),
            imageType: t,
            imageSnippet: s,
          },
        });
      } catch {}
      throw err;
    }
    let buf = null;
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
      buf = out.buffer;
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
      let b64;
      const orec = out;
      if (typeof orec.image === 'string') {
        b64 = orec.image;
      } else if (Array.isArray(orec.images) && typeof orec.images[0] === 'string') {
        b64 = orec.images[0];
      } else if (orec.image instanceof Uint8Array) {
        buf = orec.image.buffer;
      } else if (Array.isArray(orec.images) && orec.images[0] instanceof Uint8Array) {
        buf = orec.images[0].buffer;
      } else if (orec.output) {
        const o = orec.output;
        if (typeof o === 'string') {
          b64 = o;
        } else if (typeof o?.image === 'string') {
          b64 = o.image;
        } else if (Array.isArray(o?.images) && typeof o.images[0] === 'string') {
          b64 = o.images[0];
        } else if (Array.isArray(o) && typeof o[0] === 'string') {
          b64 = o[0];
        } else if (o instanceof Uint8Array) {
          buf = o.buffer;
        } else if (o?.image instanceof Uint8Array) {
          buf = o.image.buffer;
        } else if (Array.isArray(o?.images) && o.images[0] instanceof Uint8Array) {
          buf = o.images[0].buffer;
        }
      } else if (orec.result) {
        const r = orec.result;
        if (typeof r === 'string') {
          b64 = r;
        } else if (typeof r?.image === 'string') {
          b64 = r.image;
        } else if (Array.isArray(r?.images) && typeof r.images[0] === 'string') {
          b64 = r.images[0];
        } else if (Array.isArray(r) && typeof r[0] === 'string') {
          b64 = r[0];
        } else if (r instanceof Uint8Array) {
          buf = r.buffer;
        } else if (r?.image instanceof Uint8Array) {
          buf = r.image.buffer;
        } else if (Array.isArray(r?.images) && r.images[0] instanceof Uint8Array) {
          buf = r.images[0].buffer;
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
          const res2 = new Response(out);
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
    return { arrayBuffer: buf, contentType: ct };
  }
  // One-shot retry wrapper for Workers AI when output is suspiciously tiny (likely a bad decode)
  async runWorkersAiWithRetry(model, input) {
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
    const err = new Error('Workers AI returned unexpectedly small image');
    err.apiErrorType = 'server_error';
    throw err;
  }
  // Encode ArrayBuffer to base64 string for Workers AI image_b64 input
  arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  // Decode base64 (optionally data URI) to ArrayBuffer
  base64ToArrayBuffer(b64) {
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
  detectImageMimeFromBytes(buffer) {
    return (0, mime_1.detectImageMimeFromBytes)(buffer);
  }
  async getMonthlyUsage(ownerType, ownerId, limit, ym) {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    if (this.kvV2Enabled()) {
      const keyV2 = (0, usage_1.legacyMonthlyKey)('ai', ownerType, ownerId);
      const rawV2 = await kv.get(keyV2);
      if (!rawV2) return { used: 0, limit, resetAt: null };
      try {
        const obj = JSON.parse(rawV2);
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
      const parsed = JSON.parse(raw);
      return { used: parsed.count || 0, limit, resetAt: null };
    } catch {
      return { used: 0, limit, resetAt: null };
    }
  }
  async incrementMonthlyBy(ownerType, ownerId, limit, ym, delta) {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    if (this.kvV2Enabled()) {
      const keyV2 = (0, usage_1.legacyMonthlyKey)('ai', ownerType, ownerId);
      const raw = await kv.get(keyV2);
      let countTenths = 0;
      if (raw) {
        try {
          const obj = JSON.parse(raw);
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
        const parsed = JSON.parse(raw);
        count = parsed.count || 0;
      } catch {}
    }
    count += typeof delta === 'number' ? delta : 0;
    await kv.put(key, JSON.stringify({ count }));
    return { used: count, limit, resetAt: null };
  }
  kvV2Enabled() {
    const v = (this.env.USAGE_KV_V2 || '').toString().toLowerCase();
    return v === '1' || v === 'true';
  }
  isLocalHost(origin) {
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
  async getUsage(ownerType, ownerId, limit) {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    const useV2 = this.kvV2Enabled();
    if (useV2) {
      const keyV2 = (0, usage_1.rollingDailyKey)('ai', ownerType, ownerId);
      const usage = await (0, usage_1.getUsage)(kv, keyV2);
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
      const parsed = JSON.parse(raw);
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
  async callCustomAssistant(prompt, assistantId) {
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    const openai = new openai_1.default({ apiKey });
    // Step 1: Create thread, add user message, create run (wrap network errors)
    let threadId;
    let runId;
    let runStatusValue;
    try {
      const thread = await openai.beta.threads.create();
      const threadIdMaybe = thread?.id;
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
      const runLike = run;
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
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
        const stat = runStatus?.status;
        status = typeof stat === 'string' ? stat : '';
      }
      if (status !== 'completed') {
        throw new Error(`Run failed with status: ${status}`);
      }
      // Step 3: Fetch messages, ensure assistant response exists (bubble specific error)
      const messages = await openai.beta.threads.messages.list(threadId);
      const data = messages?.data;
      const assistantMessage = Array.isArray(data)
        ? data.find((m) => m && m.role === 'assistant')
        : undefined;
      if (
        !assistantMessage ||
        !Array.isArray(assistantMessage.content) ||
        assistantMessage.content.length === 0
      ) {
        throw new Error('No response from assistant');
      }
      const first = assistantMessage.content[0];
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
  }) {
    // Validate input
    const model = this.getAllowedModel(modelSlug);
    if (!model) throw new Error('Unsupported model');
    if (!(file instanceof File)) throw new Error('Invalid file');
    // Validate model capabilities for optional params
    if (typeof scale !== 'undefined') {
      if (!model.supportsScale) {
        const err = new Error(`Unsupported parameter 'scale' for model ${model.slug}`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
      if (!(scale === 2 || scale === 4)) {
        const err = new Error(`Unsupported value for 'scale': ${scale}`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
      // Enforce plan-based max upscale
      if (typeof maxUpscaleOverride === 'number' && scale > maxUpscaleOverride) {
        const err = new Error(`Requested 'scale' exceeds plan limit (${maxUpscaleOverride}x)`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
    }
    if (typeof faceEnhance !== 'undefined') {
      if (!model.supportsFaceEnhance) {
        const err = new Error(`Unsupported parameter 'face_enhance' for model ${model.slug}`);
        err.apiErrorType = 'validation_error';
        throw err;
      }
      if (faceEnhance === true && allowFaceEnhanceOverride === false) {
        const err = new Error(`'face_enhance' not allowed on current plan`);
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
    if (file.size > ai_image_1.MAX_UPLOAD_BYTES) {
      throw new Error(
        `File too large. Max ${Math.round(ai_image_1.MAX_UPLOAD_BYTES / (1024 * 1024))} MB`
      );
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
          ? ai_image_1.FREE_LIMIT_USER
          : ai_image_1.FREE_LIMIT_GUEST;
    const monthlyLimit =
      typeof monthlyLimitOverride === 'number' ? monthlyLimitOverride : Number.POSITIVE_INFINITY;
    const now = new Date();
    const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthly = await this.getMonthlyUsage(ownerType, ownerId, monthlyLimit, ym);
    const cost = (0, entitlements_1.computeEnhancerCost)({ modelSlug, scale, faceEnhance });
    const monthlyRemaining = Math.max(0, monthly.limit - monthly.used);
    const planPortion = Math.min(cost, monthlyRemaining);
    const creditsPortion = Math.max(0, Math.round((cost - planPortion) * 10) / 10);
    if (creditsPortion > 0 && ownerType === 'user') {
      const tenths = await (0, usage_1.getCreditsBalanceTenths)(this.env.KV_AI_ENHANCER, ownerId);
      if (tenths < Math.round(creditsPortion * 10)) {
        const msgM = `Monthly quota exceeded. Used ${monthly.used}/${monthly.limit}`;
        const errM = new Error(msgM);
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
      const err = new Error(msg);
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
    const baseKey = `${ai_image_1.AI_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
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
    let imageUrl;
    if (envName === 'development' || envName === 'testing') {
      if (model.provider === 'replicate') {
        const err = new Error('Model not allowed in this environment');
        err.apiErrorType = 'forbidden';
        throw err;
      }
      if (model.provider === 'workers_ai') {
        const enabled = this.env.WORKERS_AI_ENABLED === '1';
        if (!enabled) {
          const err = new Error('Workers AI disabled');
          err.apiErrorType = 'forbidden';
          throw err;
        }
        if (envName === 'testing') {
          const allow = this.env.TESTING_WORKERS_AI_ALLOW === '1';
          if (!allow) {
            const err = new Error('Workers AI not allowed in testing');
            err.apiErrorType = 'forbidden';
            throw err;
          }
          let allowedList = [];
          try {
            const raw = this.env.TESTING_ALLOWED_CF_MODELS || '[]';
            allowedList = JSON.parse(raw);
          } catch {}
          if (!allowedList.includes(model.slug)) {
            const err = new Error('Model not allowed in testing');
            err.apiErrorType = 'forbidden';
            throw err;
          }
          if (typeof strength === 'number') strength = Math.min(0.6, Math.max(0.1, strength));
          if (typeof guidance === 'number') guidance = Math.min(9, Math.max(3, guidance));
          if (typeof steps === 'number' && ![10, 20, 30].includes(steps)) {
            const err = new Error('Unsupported steps in testing');
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
        const resultKey = `${ai_image_1.AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
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
        const err = new Error('Unsupported provider');
        err.apiErrorType = 'validation_error';
        throw err;
      }
    } else {
      if (model.provider === 'workers_ai') {
        const enabled = this.env.WORKERS_AI_ENABLED === '1';
        if (!enabled) {
          const err = new Error('Workers AI disabled');
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
        const resultKey = `${ai_image_1.AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
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
        const replicateInput = {};
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
        const resultKey = `${ai_image_1.AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
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
        await (0, usage_1.consumeCreditsTenths)(this.env.KV_AI_ENHANCER, ownerId, cp, reqId);
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
  getAllowedModel(slug) {
    return ai_image_1.ALLOWED_MODELS.find((m) => m.slug === slug);
  }
  usageKey(ownerType, ownerId) {
    return `ai:usage:${ownerType}:${ownerId}`;
  }
  monthlyUsageKey(ownerType, ownerId, ym) {
    return `ai:usage:month:${ownerType}:${ownerId}:${ym}`;
  }
  async incrementUsage(ownerType, ownerId, limit) {
    const kv = this.env.KV_AI_ENHANCER;
    if (!kv) return { used: 0, limit, resetAt: null };
    const useV2 = this.env.USAGE_KV_V2 === '1';
    if (useV2) {
      const res = await (0, usage_1.incrementDailyRolling)(kv, 'ai', ownerType, ownerId, limit);
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
        const parsed = JSON.parse(raw);
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
  extFromFilename(name) {
    const i = name.lastIndexOf('.');
    if (i === -1) return null;
    return name.slice(i + 1).toLowerCase();
  }
  extFromContentType(ct) {
    if (!ct) return null;
    if (ct === 'image/jpeg') return 'jpg';
    if (ct === 'image/png') return 'png';
    if (ct === 'image/webp') return 'webp';
    return null;
  }
  buildPublicUrl(origin, key) {
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
  async fetchBinary(url) {
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
  async runReplicate(model, input) {
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
            const meta = await metaRes.json();
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
    let res;
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
        let versionId = null;
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
              const meta = await metaRes.json();
              versionId = meta?.latest_version?.id || meta?.versions?.[0]?.id || null;
            }
          }
        }
        if (versionId) {
          const predUrl = 'https://api.replicate.com/v1/predictions';
          const predBody = {
            version: versionId,
            input: { ...model.defaultParams, ...input },
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
        const { buildProviderError } = await Promise.resolve(`${'./' + 'provider-error'}`).then(
          (s) => require(s)
        );
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
      let data = await res.json();
      const startPoll = Date.now();
      const maxMs = 60000; // 60s cap
      const poll = async (id) => {
        const getRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
          headers: { Authorization: `Token ${token}` },
        });
        return await getRes.json();
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
        const { buildProviderError } = await Promise.resolve(`${'./' + 'provider-error'}`).then(
          (s) => require(s)
        );
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
      const out = data.output;
      if (typeof out === 'string') return out;
      if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string') return out[0];
      throw new Error('Replicate response missing output');
    }
    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      // Build standardized provider error (typed for API middleware)
      const { buildProviderError } = await Promise.resolve(`${'./' + 'provider-error'}`).then((s) =>
        require(s)
      );
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
    const data = await res.json();
    const out = data.output;
    if (typeof out === 'string') return out;
    if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string') return out[0];
    throw new Error('Replicate response missing output');
  }
  isDevelopment() {
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
exports.AiImageService = AiImageService;
