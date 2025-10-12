import OpenAI from 'openai';
import { loggerFactory } from '@/server/utils/logger-factory';
import type { KVNamespace } from '@cloudflare/workers-types';
import { buildProviderError } from '@/lib/services/provider-error';
import {
  VOICE_ALLOWED_CONTENT_TYPES,
  VOICE_MAX_CHUNK_BYTES,
  VOICE_FREE_LIMIT_GUEST,
  VOICE_FREE_LIMIT_USER,
  DEFAULT_WHISPER_MODEL,
  type VoiceOwnerType,
} from '@/config/voice';

interface RuntimeEnv {
  KV_VOICE_TRANSCRIBE?: KVNamespace;
  OPENAI_API_KEY?: string;
  WHISPER_MODEL?: string;
  ENVIRONMENT?: string;
}

export interface VoiceUsageInfo {
  used: number;
  limit: number;
  resetAt: number | null;
}

export class VoiceTranscribeService {
  private env: RuntimeEnv;
  private log = loggerFactory.createLogger('voice-transcribe-service');

  constructor(env: RuntimeEnv) {
    this.env = env;
  }

  private isDevelopment(): boolean {
    const env = (this.env.ENVIRONMENT || '').toLowerCase();
    return (
      env === 'development' ||
      env === 'dev' ||
      env === 'testing' ||
      env === 'test' ||
      env === 'local' ||
      env === ''
    );
  }

  private usageKey(ownerType: VoiceOwnerType, ownerId: string): string {
    return `voice:usage:${ownerType}:${ownerId}`;
  }

  async getUsage(
    ownerType: VoiceOwnerType,
    ownerId: string,
    limit: number
  ): Promise<VoiceUsageInfo> {
    const kv = this.env.KV_VOICE_TRANSCRIBE;
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

  private async incrementUsage(
    ownerType: VoiceOwnerType,
    ownerId: string,
    limit: number
  ): Promise<VoiceUsageInfo> {
    const kv = this.env.KV_VOICE_TRANSCRIBE;
    if (!kv) return { used: 0, limit, resetAt: null };
    const key = this.usageKey(ownerType, ownerId);
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000; // 24h

    let count = 0;
    let resetAt = now + windowMs;

    const raw = await kv.get(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { count: number; resetAt: number };
        if (parsed.resetAt && parsed.resetAt > now) {
          count = parsed.count || 0;
          resetAt = parsed.resetAt;
        }
      } catch {
        // ignore parse failures
      }
    }

    count += 1;
    const value = JSON.stringify({ count, resetAt });
    const expiration = Math.floor(resetAt / 1000);
    await kv.put(key, value, { expiration });

    try {
      const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
      this.log.debug('usage_increment', {
        action: 'usage_increment',
        metadata: { ownerType, ownerId: mask, key, used: count, limit, expiration },
      });
    } catch {
      // ignore log failures
    }

    return { used: count, limit, resetAt };
  }

  async transcribeChunk(
    ownerType: VoiceOwnerType,
    ownerId: string,
    sessionId: string,
    file: File,
    lang?: string,
    limitOverride?: number
  ): Promise<{ text: string; isFinal?: boolean; usage: VoiceUsageInfo }> {
    // Validate file
    if (!(file instanceof File)) throw new Error('Invalid file');
    if (file.size > VOICE_MAX_CHUNK_BYTES)
      throw new Error(`File too large. Max ${Math.round(VOICE_MAX_CHUNK_BYTES / 1024)} KB`);

    const providedType = file.type || '';
    const containerOk = VOICE_ALLOWED_CONTENT_TYPES.some((t) =>
      providedType.includes(t.split(';')[0])
    );
    if (!containerOk) {
      throw new Error(`Unsupported content type: ${providedType || 'unknown'}`);
    }

    // Quota check
    const dailyLimit =
      typeof limitOverride === 'number'
        ? limitOverride
        : ownerType === 'user'
          ? VOICE_FREE_LIMIT_USER
          : VOICE_FREE_LIMIT_GUEST;
    const current = await this.getUsage(ownerType, ownerId, dailyLimit);
    if (current.used >= current.limit) {
      const err: any = new Error(`Quota exceeded. Used ${current.used}/${current.limit}`);
      err.code = 'quota_exceeded';
      err.details = { scope: 'daily', ...current };
      throw err;
    }

    // Provider call
    const apiKey = this.env.OPENAI_API_KEY;
    if (!apiKey) {
      if (this.isDevelopment()) {
        const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
        return { text: '[dev] transcription placeholder', isFinal: true, usage };
      }
      throw new Error('OPENAI_API_KEY not configured');
    }

    const client = new OpenAI({ apiKey });
    const model = this.env.WHISPER_MODEL || DEFAULT_WHISPER_MODEL;

    let text = '';
    try {
      const res: any = await (client as any).audio.transcriptions.create({
        file,
        model,
        language: lang,
      });
      text = (res?.text || '').toString();
    } catch (e) {
      const anyErr = e as any;
      const status: number | undefined =
        anyErr?.status ||
        anyErr?.statusCode ||
        (typeof anyErr?.code === 'number' ? anyErr.code : undefined);
      const mapped = buildProviderError(
        status ?? 500,
        'openai',
        (anyErr?.message || '').slice(0, 200)
      );
      this.log.warn('whisper_error', {
        action: 'whisper_error',
        metadata: { status: status ?? 'unknown', message: (anyErr?.message || '').slice(0, 200) },
      });
      throw mapped;
    }

    const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
    this.log.info('transcribe_success', {
      action: 'transcribe_success',
      metadata: { sessionId, ownerType, ownerMasked: ownerId ? `…${ownerId.slice(-4)}` : '' },
    });
    return { text, isFinal: true, usage };
  }
}
