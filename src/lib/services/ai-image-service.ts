import { ALLOWED_MODELS, ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, AI_R2_PREFIX, FREE_LIMIT_GUEST, FREE_LIMIT_USER, type AllowedModel, type OwnerType } from '@/config/ai-image';
import { detectImageMimeFromBytes } from '@/lib/utils/mime';
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';

interface RuntimeEnv {
  R2_AI_IMAGES?: R2Bucket;
  KV_AI_ENHANCER?: KVNamespace;
  REPLICATE_API_TOKEN?: string;
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
}

export interface GenerateResult {
  model: string;
  originalUrl: string;
  imageUrl: string; // public URL to the enhanced image
  usage: UsageInfo;
}

export class AiImageService {
  private env: RuntimeEnv;

  constructor(env: RuntimeEnv) {
    this.env = env;
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
    if (!raw) return { used: 0, limit, resetAt: null };

    try {
      const parsed = JSON.parse(raw) as { count: number; resetAt: number };
      return { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
    } catch {
      return { used: 0, limit, resetAt: null };
    }
  }

  async generate({ ownerType, ownerId, modelSlug, file, requestOrigin, scale, faceEnhance }: GenerateParams): Promise<GenerateResult> {
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
    }
    if (typeof faceEnhance !== 'undefined') {
      if (!model.supportsFaceEnhance) {
        const err: any = new Error(`Unsupported parameter 'face_enhance' for model ${model.slug}`);
        err.apiErrorType = 'validation_error';
        throw err;
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
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] generate start`, {
        ownerType,
        ownerId,
        modelSlug,
        fileType: file.type,
        fileSize: file.size,
      });
    }

    // Quota check (without increment yet)
    const limit = ownerType === 'user' ? FREE_LIMIT_USER : FREE_LIMIT_GUEST;
    const currentUsage = await this.getUsage(ownerType, ownerId, limit);
    if (currentUsage.used >= currentUsage.limit) {
      const resetInfo = currentUsage.resetAt ? new Date(currentUsage.resetAt).toISOString() : null;
      const msg = `Quota exceeded. Used ${currentUsage.used}/${currentUsage.limit}` + (resetInfo ? `, resets at ${resetInfo}` : '');
      const err: any = new Error(msg);
      err.code = 'quota_exceeded';
      err.details = currentUsage;
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
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] R2 put original(ms)`, { ms: Date.now() - putOriginalStart });
    }

    const originalUrl = this.buildPublicUrl(requestOrigin, originalKey);

    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] uploaded original`, { originalKey, originalUrl });
    }

    // Call provider (Replicate) with the originalUrl
    let outputUrl: string;
    let devEcho = false;
    // In any non-production environment, prefer deterministic dev echo over provider calls
    // to avoid external dependencies in local/integration runs.
    const forceDevEcho = this.isDevelopment();
    if (forceDevEcho) {
      console.warn(`[AiImageService][${reqId}] Development environment; forcing dev echo without Replicate call`);
      outputUrl = originalUrl;
      devEcho = true;
    } else {
      try {
        if (this.isDevelopment()) {
          console.debug(`[AiImageService][${reqId}] calling Replicate`, { model: model.slug, originalUrl, scale, faceEnhance });
        }
        // Build provider input parameters safely per model
        const replicateInput: Record<string, unknown> = { image: originalUrl };
        if (typeof scale === 'number' && model.supportsScale) {
          replicateInput.scale = scale;
        }
        if (typeof faceEnhance === 'boolean' && model.supportsFaceEnhance) {
          (replicateInput as any).face_enhance = faceEnhance;
        }
        outputUrl = await this.runReplicate(model, replicateInput);
        if (this.isDevelopment()) {
          console.debug(`[AiImageService][${reqId}] Replicate output URL`, { outputUrl });
        }
      } catch (err) {
        // Graceful dev fallback to unblock local UI testing: use original image
        // Applies in development when Replicate responds 404 (slug/version issues)
        // OR when the token is missing locally.
        const message = err instanceof Error ? err.message : String(err);
        const is404 = /Replicate error\s+404/i.test(message);
        const missingToken = /Missing REPLICATE_API_TOKEN/i.test(message);
        if (this.isDevelopment() && (is404 || missingToken)) {
          console.warn(
            `[AiImageService] Dev fallback active (${is404 ? '404' : 'missing token'}) for model '${model.slug}'. ` +
              `Echoing original. Hint: verify ALLOWED_MODELS in src/config/ai-image.ts and your Replicate model slug/tag. Error: ${message}`
          );
          if (this.isDevelopment()) {
            console.debug(`[AiImageService][${reqId}] dev echo enabled due to ${is404 ? '404' : 'missing token'}`);
          }
          outputUrl = originalUrl;
          devEcho = true;
        } else {
          throw err;
        }
      }
    }

    // In dev echo mode, skip fetching via HTTP and re-writing to R2 to avoid transient 404s
    if (devEcho && this.isDevelopment() && outputUrl === originalUrl) {
      const usage = await this.incrementUsage(ownerType, ownerId, currentUsage.limit);
      if (this.isDevelopment()) {
        console.debug(`[AiImageService][${reqId}] returning dev echo`, { imageUrl: originalUrl, usage });
      }
      return { model: model.slug, originalUrl, imageUrl: originalUrl, usage };
    }

    // Fetch output and store to R2
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] fetching output URL`, { outputUrl });
    }
    const { arrayBuffer, contentType } = await this.fetchBinary(outputUrl);
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] fetched output`, { contentType, bytes: arrayBuffer.byteLength });
    }
    const resultExt = this.extFromContentType(contentType) || 'png';
    const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
    const putResultStart = Date.now();
    await bucket.put(resultKey, arrayBuffer, { httpMetadata: { contentType } });
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] R2 put result(ms)`, { ms: Date.now() - putResultStart });
    }
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] stored result`, { resultKey, contentType });
    }

    const imageUrl = this.buildPublicUrl(requestOrigin, resultKey);

    // Increment usage after success
    const usage = await this.incrementUsage(ownerType, ownerId, currentUsage.limit);
    if (this.isDevelopment()) {
      console.debug(`[AiImageService][${reqId}] success`, { imageUrl, usage });
    }

    return { model: model.slug, originalUrl, imageUrl, usage };
  }

  // Internals
  private getAllowedModel(slug: string): AllowedModel | undefined {
    return ALLOWED_MODELS.find((m) => m.slug === slug);
  }

  private usageKey(ownerType: OwnerType, ownerId: string): string {
    return `ai:usage:${ownerType}:${ownerId}`;
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

    return { used: count, limit, resetAt };
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
    if (this.isDevelopment()) {
      console.debug('[AiImageService] Replicate duration(ms)', { model: model.slug, ms: durationMs });
    }

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      // Create a typed error consumed by api-middleware
      const err: any = new Error(
        status === 401 || status === 403
          ? 'Provider access denied'
          : status === 404
          ? 'Provider model or endpoint not found'
          : status >= 400 && status < 500
          ? 'Provider rejected the request (validation error)'
          : 'Provider service error'
      );
      err.status = status;
      err.provider = 'replicate';
      err.apiErrorType = status === 401 || status === 403
        ? 'forbidden'
        : status >= 400 && status < 500
        ? 'validation_error'
        : 'server_error';
      // In development, add minimal debug info to message tail
      if (this.isDevelopment()) {
        err.message += ` [${status}]`;
      }
      // Avoid leaking provider payloads to clients; keep text only for local logs
      if (this.isDevelopment()) {
        console.warn('[AiImageService] Replicate error payload (dev only)', { status, text: text.slice(0, 500) });
      }
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
