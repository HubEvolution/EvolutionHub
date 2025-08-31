import { ALLOWED_MODELS, ALLOWED_CONTENT_TYPES, MAX_UPLOAD_BYTES, AI_R2_PREFIX, FREE_LIMIT_GUEST, FREE_LIMIT_USER, type AllowedModel, type OwnerType } from '@/config/ai-image';
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

  async generate({ ownerType, ownerId, modelSlug, file, requestOrigin }: GenerateParams): Promise<GenerateResult> {
    // Validate input
    const model = this.getAllowedModel(modelSlug);
    if (!model) throw new Error('Unsupported model');

    if (!(file instanceof File)) throw new Error('Invalid file');

    if (!ALLOWED_CONTENT_TYPES.includes(file.type as any)) {
      throw new Error(`Unsupported content type: ${file.type}`);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`);
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

    const originalExt = this.extFromContentType(file.type) || this.extFromFilename(file.name) || 'bin';
    const timestamp = Date.now();
    const baseKey = `${AI_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
    const originalKey = `${baseKey}.${originalExt}`;

    const fileBuffer = await file.arrayBuffer();
    await bucket.put(originalKey, fileBuffer, { httpMetadata: { contentType: file.type } });

    const originalUrl = this.buildPublicUrl(requestOrigin, originalKey);

    // Call provider (Replicate) with the originalUrl
    const outputUrl = await this.runReplicate(model, { image: originalUrl });

    // Fetch output and store to R2
    const { arrayBuffer, contentType } = await this.fetchBinary(outputUrl);
    const resultExt = this.extFromContentType(contentType) || 'png';
    const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${timestamp}.${resultExt}`;
    await bucket.put(resultKey, arrayBuffer, { httpMetadata: { contentType } });

    const imageUrl = this.buildPublicUrl(requestOrigin, resultKey);

    // Increment usage after success
    const usage = await this.incrementUsage(ownerType, ownerId, currentUsage.limit);

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
    return `${origin.replace(/\/$/, '')}/r2-ai/${encodeURI(key)}`;
  }

  private async fetchBinary(url: string): Promise<{ arrayBuffer: ArrayBuffer; contentType: string }> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch output: ${res.status}`);
    const ct = res.headers.get('content-type') || 'application/octet-stream';
    const buf = await res.arrayBuffer();
    return { arrayBuffer: buf, contentType: ct };
  }

  private async runReplicate(model: AllowedModel, input: Record<string, unknown>): Promise<string> {
    const token = this.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('Missing REPLICATE_API_TOKEN');

    const payload = { input: { ...model.defaultParams, ...input } };

    // Use the "run" endpoint with slug, which supports owner/model:tag
    const url = `https://api.replicate.com/v1/run/${model.slug}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { output?: unknown };
    const out = data.output;

    if (typeof out === 'string') return out;
    if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string') return out[0] as string;

    throw new Error('Replicate response missing output');
  }
}
