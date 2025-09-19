import { ALLOWED_CONTENT_TYPES, ALLOWED_MODELS, AI_R2_PREFIX, FREE_LIMIT_GUEST, FREE_LIMIT_USER, MAX_UPLOAD_BYTES, type AllowedModel, type OwnerType } from '@/config/ai-image';
import { detectImageMimeFromBytes } from '@/lib/utils/mime';
import { AbstractBaseService } from './base-service';
import { buildProviderError } from './provider-error';
import { loggerFactory } from '@/server/utils/logger-factory';
import type { ExtendedLogger } from '@/types/logger';
import type { ServiceDependencies } from './types';
import type { KVNamespace, R2Bucket } from '@cloudflare/workers-types';

interface RuntimeEnv {
  R2_AI_IMAGES?: R2Bucket;
  KV_AI_ENHANCER?: KVNamespace;
  REPLICATE_API_TOKEN?: string;
  ENVIRONMENT?: string;
}

export type AiJobStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'canceled';

export interface UsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

export interface CreateJobParams {
  ownerType: OwnerType;
  ownerId: string; // user id or guest id
  userId?: string | null; // optional for ownerType === 'user'
  modelSlug: string;
  file: File;
  requestOrigin: string;
  // Optional: override daily limit resolved by API (plan-based entitlements)
  limitOverride?: number;
  // Optional: override monthly limit
  monthlyLimitOverride?: number;
}

export interface GetJobParams {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
  requestOrigin: string;
  // Optional: override daily limit for usage increment after success
  limitOverride?: number;
  // Optional: override monthly limit for usage increment after success
  monthlyLimitOverride?: number;
}

export interface CancelJobParams {
  id: string;
  ownerType: OwnerType;
  ownerId: string;
}

export interface AiJobResponse {
  id: string;
  status: AiJobStatus;
  provider: 'replicate';
  model: string | null;
  input?: { key: string; url: string | null; contentType?: string | null; size?: number | null } | null;
  output?: { key: string; url: string | null } | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  usage?: UsageInfo | null; // present on success when incremented
}

export class AiJobsService extends AbstractBaseService {
  private env: RuntimeEnv;
  private log: ExtendedLogger;

  constructor(deps: ServiceDependencies, env: RuntimeEnv) {
    super(deps);
    this.env = env;
    this.log = loggerFactory.createLogger('ai-jobs-service');
  }

  private creditsKey(userId: string): string {
    return `ai:credits:user:${userId}`;
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

  async createJob(params: CreateJobParams): Promise<AiJobResponse> {
    const { ownerType, ownerId, userId, modelSlug, file, requestOrigin } = params;

    // Validate
    const model = this.getAllowedModel(modelSlug);
    if (!model) throw new Error('Unsupported model');
    if (!(file instanceof File)) throw new Error('Invalid file');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`);
    }
    const fileBuffer = await file.arrayBuffer();
    const sniffed = detectImageMimeFromBytes(fileBuffer);
    if (!sniffed || !ALLOWED_CONTENT_TYPES.includes(sniffed as any)) {
      const display = sniffed ?? (file.type || 'unknown');
      throw new Error(`Unsupported content type: ${display}`);
    }

    // Quota checks (monthly first, then daily) — no increment yet
    const dailyLimit = typeof params.limitOverride === 'number'
      ? params.limitOverride
      : (ownerType === 'user' ? FREE_LIMIT_USER : FREE_LIMIT_GUEST);
    const monthlyLimit = typeof params.monthlyLimitOverride === 'number' ? params.monthlyLimitOverride : Number.POSITIVE_INFINITY;

    const now = new Date();
    const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthly = await this.getMonthlyUsage(ownerType, ownerId, monthlyLimit, ym);
    if (monthly.used >= monthly.limit) {
      // Credits-Bypass für User zulassen
      if (ownerType === 'user') {
        const credits = await this.getCreditsBalance(ownerId);
        if (credits > 0) {
          try {
            const masked = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
            this.log.debug('credits_path_allowed_queue', { action: 'credits_path_allowed_queue', metadata: { ownerType, ownerId: masked, credits } });
          } catch {}
        } else {
          const errM: any = new Error(`Monthly quota exceeded. Used ${monthly.used}/${monthly.limit}`);
          errM.code = 'quota_exceeded';
          errM.details = { scope: 'monthly', ...monthly };
          throw errM;
        }
      } else {
        const errM: any = new Error(`Monthly quota exceeded. Used ${monthly.used}/${monthly.limit}`);
        errM.code = 'quota_exceeded';
        errM.details = { scope: 'monthly', ...monthly };
        throw errM;
      }
    }

    const currentUsage = await this.getUsage(ownerType, ownerId, dailyLimit);
    if (currentUsage.used >= currentUsage.limit) {
      const resetInfo = currentUsage.resetAt ? new Date(currentUsage.resetAt).toISOString() : null;
      const err: any = new Error(
        `Quota exceeded. Used ${currentUsage.used}/${currentUsage.limit}` + (resetInfo ? `, resets at ${resetInfo}` : '')
      );
      err.code = 'quota_exceeded';
      err.details = { scope: 'daily', ...currentUsage };
      throw err;
    }

    // Upload input to R2
    const bucket = this.env.R2_AI_IMAGES;
    if (!bucket) throw new Error('R2_AI_IMAGES bucket not configured');

    const ext = this.extFromContentType(sniffed) || this.extFromFilename(file.name) || 'bin';
    const timestamp = Date.now();
    const baseKey = `${AI_R2_PREFIX}/uploads/${ownerType}/${ownerId}/${timestamp}`;
    const inputKey = `${baseKey}.${ext}`;

    await bucket.put(inputKey, fileBuffer, { httpMetadata: { contentType: sniffed } });

    const inputUrl = this.buildPublicUrl(requestOrigin, inputKey);

    // Create DB record in queued status
    const id = globalThis.crypto.randomUUID();
    await this.safeDbOperation(async () => {
      await this.db
        .prepare(
          `INSERT INTO ai_jobs (
            id, user_id, owner_type, owner_ref, provider, model, status,
            input_r2_key, input_content_type, input_size, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        )
        .bind(
          id,
          ownerType === 'user' ? (userId || ownerId) : null,
          ownerType,
          ownerId,
          'replicate',
          model.slug,
          inputKey,
          file.type,
          file.size
        )
        .run();
    });

    // Return queued job; processing will happen on first poll
    const nowIso = new Date().toISOString();
    return {
      id,
      status: 'queued',
      provider: 'replicate',
      model: model.slug,
      input: { key: inputKey, url: inputUrl, contentType: sniffed, size: file.size },
      output: null,
      error: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      usage: currentUsage
    };
  }

  async getAndProcessIfNeeded(params: GetJobParams): Promise<AiJobResponse> {
    const { id, ownerType, ownerId, requestOrigin } = params;

    const row = await this.safeDbOperation(async () => {
      return this.db
        .prepare(
          `SELECT id, user_id, owner_type, owner_ref, provider, model, status, provider_job_id,
                  input_r2_key, input_content_type, input_size, output_r2_key, error_message,
                  created_at, updated_at
           FROM ai_jobs WHERE id = ?`
        )
        .bind(id)
        .first<{
          id: string;
          user_id: string | null;
          owner_type: OwnerType;
          owner_ref: string;
          provider: 'replicate';
          model: string | null;
          status: AiJobStatus;
          provider_job_id: string | null;
          input_r2_key: string | null;
          input_content_type: string | null;
          input_size: number | null;
          output_r2_key: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        }>();
    });

    if (!row) throw new Error('Job not found');
    if (!(row.owner_type === ownerType && row.owner_ref === ownerId)) {
      throw new Error('not authorized');
    }

    // If already terminal state, return
    if (row.status === 'succeeded' || row.status === 'failed' || row.status === 'canceled') {
      return this.rowToResponse(row, requestOrigin);
    }

    // If queued, advance to processing and run
    if (row.status === 'queued') {
      await this.safeDbOperation(async () => {
        await this.db
          .prepare(`UPDATE ai_jobs SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(row.id)
          .run();
      });
      row.status = 'processing';
    }

    if (row.status === 'processing') {
      try {
        // call provider using input URL
        const inputUrl = row.input_r2_key ? this.buildPublicUrl(requestOrigin, row.input_r2_key) : null;
        if (!inputUrl) throw new Error('Missing input');
        const model = this.getAllowedModel(row.model || '');
        if (!model) throw new Error('Unsupported model');

        const outputUrl = await this.runReplicate(model, { image: inputUrl });

        const { arrayBuffer, contentType } = await this.fetchBinary(outputUrl);
        const resultExt = this.extFromContentType(contentType) || 'png';
        const resultKey = `${AI_R2_PREFIX}/results/${ownerType}/${ownerId}/${Date.now()}.${resultExt}`;

        const bucket = this.env.R2_AI_IMAGES;
        if (!bucket) throw new Error('R2_AI_IMAGES bucket not configured');
        await bucket.put(resultKey, arrayBuffer, { httpMetadata: { contentType } });

        // Update DB to succeeded
        await this.safeDbOperation(async () => {
          await this.db
            .prepare(
              `UPDATE ai_jobs SET status = 'succeeded', output_r2_key = ?, error_message = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            )
            .bind(resultKey, row.id)
            .run();
        });

        // Increment usage upon success (daily always), monthly or credits depending on plan state
        const limit = typeof params.limitOverride === 'number'
          ? params.limitOverride
          : (ownerType === 'user' ? FREE_LIMIT_USER : FREE_LIMIT_GUEST);
        const usage = await this.incrementUsage(ownerType, ownerId, limit);
        const now2 = new Date();
        const ym2 = `${now2.getUTCFullYear()}${String(now2.getUTCMonth() + 1).padStart(2, '0')}`;
        const monthlyLimit2 = typeof params.monthlyLimitOverride === 'number' ? params.monthlyLimitOverride : Number.POSITIVE_INFINITY;
        const monthly2 = await this.getMonthlyUsage(ownerType, ownerId, monthlyLimit2, ym2);
        if (monthly2.used >= monthly2.limit) {
          if (ownerType === 'user') {
            const credits = await this.getCreditsBalance(ownerId);
            if (credits > 0) {
              await this.decrementCreditsBalance(ownerId);
              try {
                const masked = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
                this.log.info('credits_consumed', { action: 'credits_consumed', metadata: { jobId: row.id, ownerId: masked, remaining: credits - 1 } });
              } catch {}
            } else {
              try {
                const masked = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
                this.log.warn('credits_missing', { action: 'credits_missing', metadata: { jobId: row.id, ownerId: masked } });
              } catch {}
              // Kein Monats-Increment mehr möglich; wir lassen den Erfolg aber stehen (analog Sync-Service Verhalten)
            }
          }
        } else {
          await this.incrementMonthlyUsage(ownerType, ownerId, monthlyLimit2, ym2);
        }

        // Reflect latest
        row.status = 'succeeded';
        row.output_r2_key = resultKey;
        row.error_message = null;

        const resp = this.rowToResponse(row, requestOrigin);
        resp.usage = usage;
        return resp;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        await this.safeDbOperation(async () => {
          await this.db
            .prepare(
              `UPDATE ai_jobs SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            )
            .bind(message, row.id)
            .run();
        });
        row.status = 'failed';
        row.error_message = message;
        return this.rowToResponse(row, requestOrigin);
      }
    }

    // Fallback
    return this.rowToResponse(row, requestOrigin);
  }

  async cancelJob(params: CancelJobParams): Promise<AiJobResponse> {
    const { id, ownerType, ownerId } = params;

    const row = await this.safeDbOperation(async () => {
      return this.db
        .prepare(
          `SELECT id, owner_type, owner_ref, status, input_r2_key, output_r2_key, model, provider, error_message, created_at, updated_at
           FROM ai_jobs WHERE id = ?`
        )
        .bind(id)
        .first<{
          id: string;
          owner_type: OwnerType;
          owner_ref: string;
          status: AiJobStatus;
          input_r2_key: string | null;
          output_r2_key: string | null;
          model: string | null;
          provider: 'replicate';
          error_message: string | null;
          created_at: string;
          updated_at: string;
        }>();
    });

    if (!row) throw new Error('Job not found');
    if (!(row.owner_type === ownerType && row.owner_ref === ownerId)) {
      throw new Error('not authorized');
    }

    if (row.status === 'queued' || row.status === 'processing') {
      await this.safeDbOperation(async () => {
        await this.db
          .prepare(`UPDATE ai_jobs SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .bind(row.id)
          .run();
      });
      row.status = 'canceled';
    }

    return this.rowToResponse(row, '');
  }

  // ----- Helpers -----
  private getAllowedModel(slug: string): AllowedModel | undefined {
    return ALLOWED_MODELS.find((m) => m.slug === slug);
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

  private buildPublicUrl(origin: string, key: string | null): string | null {
    if (!key) return null;
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
    const url = `https://api.replicate.com/v1/run/${model.slug}`;

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
    this.log.debug('replicate_duration_ms', { action: 'replicate_duration_ms', metadata: { model: model.slug, ms: durationMs } });

    if (!res.ok) {
      const status = res.status;
      const text = await res.text();
      const err = buildProviderError(status, 'replicate', text);
      this.log.warn('replicate_error', { action: 'replicate_error', metadata: { status, provider: 'replicate', snippet: text.slice(0, 200) } });
      throw err;
    }

    const data = (await res.json()) as { output?: unknown };
    const out = data.output;

    if (typeof out === 'string') return out;
    if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string') return out[0] as string;

    throw new Error('Replicate response missing output');
  }

  private usageKey(ownerType: OwnerType, ownerId: string): string {
    return `ai:usage:${ownerType}:${ownerId}`;
  }

  private monthlyUsageKey(ownerType: OwnerType, ownerId: string, ym: string): string {
    return `ai:usage:month:${ownerType}:${ownerId}:${ym}`;
  }

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

  private rowToResponse(
    row: {
      id: string;
      owner_type: OwnerType;
      owner_ref: string;
      provider: 'replicate';
      model: string | null;
      status: AiJobStatus;
      provider_job_id?: string | null;
      input_r2_key: string | null;
      input_content_type?: string | null;
      input_size?: number | null;
      output_r2_key: string | null;
      error_message: string | null;
      created_at: string;
      updated_at: string;
    },
    origin: string
  ): AiJobResponse {
    return {
      id: row.id,
      status: row.status,
      provider: 'replicate',
      model: row.model,
      input: row.input_r2_key
        ? {
            key: row.input_r2_key,
            url: this.buildPublicUrl(origin, row.input_r2_key),
            contentType: row.input_content_type || null,
            size: row.input_size ?? null
          }
        : null,
      output: row.output_r2_key
        ? {
            key: row.output_r2_key,
            url: this.buildPublicUrl(origin, row.output_r2_key)
          }
        : null,
      error: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
