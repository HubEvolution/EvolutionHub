import OpenAI from 'openai';
import { loggerFactory } from '@/server/utils/logger-factory';
import type { KVNamespace } from '@cloudflare/workers-types';
import { buildProviderError } from '@/lib/services/provider-error';
import { getUsage as kvGetUsage, incrementDailyRolling, rollingDailyKey } from '@/lib/kv/usage';
import {
  VOICE_ALLOWED_CONTENT_TYPES,
  VOICE_MAX_CHUNK_BYTES,
  VOICE_FREE_LIMIT_GUEST,
  VOICE_FREE_LIMIT_USER,
  DEFAULT_WHISPER_MODEL,
  type VoiceOwnerType,
} from '@/config/voice';
import { sniffAudioMime } from '@/lib/validation/voice-mime-sniffer';
import type { R2Bucket } from '@cloudflare/workers-types';

interface RuntimeEnv {
  KV_VOICE_TRANSCRIBE?: KVNamespace;
  OPENAI_API_KEY?: string;
  WHISPER_MODEL?: string;
  ENVIRONMENT?: string;
  R2_VOICE?: R2Bucket;
  VOICE_R2_ARCHIVE?: string;
  VOICE_DEV_ECHO?: string;
  USAGE_KV_V2?: string;
  VOICE_MIME_SNIFF_ENABLE?: string;
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

  private isMimeSniffingEnabled(): boolean {
    const flag = (this.env.VOICE_MIME_SNIFF_ENABLE || '').toLowerCase();
    return flag === '1' || flag === 'true';
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
    const useV2 = this.env.USAGE_KV_V2 === '1';
    if (useV2) {
      const keyV2 = rollingDailyKey('voice', ownerType, ownerId);
      const usage = await kvGetUsage(kv, keyV2);
      if (!usage) return { used: 0, limit, resetAt: null };
      return { used: usage.count, limit, resetAt: usage.resetAt ? usage.resetAt * 1000 : null };
    }
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
    const useV2 = this.env.USAGE_KV_V2 === '1';
    if (useV2) {
      const res = await incrementDailyRolling(kv, 'voice', ownerType, ownerId, limit);
      return { used: res.usage.count, limit, resetAt: res.usage.resetAt * 1000 };
    }
    const key = this.usageKey(ownerType, ownerId);
    const now = Date.now();
    const windowMs = 24 * 60 * 60 * 1000;

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
      } catch {}
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
    } catch {}

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
    const t0 = Date.now();
    // Validate file (cross-realm safe)
    const isFileLike = (v: unknown): v is File =>
      !!v && typeof v === 'object' && typeof (v as { size?: unknown }).size === 'number';
    if (!isFileLike(file)) throw new Error('Invalid file');
    if (file.size > VOICE_MAX_CHUNK_BYTES)
      throw new Error(`File too large. Max ${Math.round(VOICE_MAX_CHUNK_BYTES / 1024)} KB`);

    const providedType = file.type || '';
    const containerOk = VOICE_ALLOWED_CONTENT_TYPES.some((t) =>
      providedType.includes(t.split(';')[0])
    );

    // Hard MIME sniffing: prefer content-based detection when enabled
    const buf = await file.arrayBuffer();
    const sniff = sniffAudioMime(buf);

    if (this.isMimeSniffingEnabled()) {
      const allowedSniffed: Array<'audio/webm' | 'audio/ogg' | 'audio/mp4'> = [
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
      ];
      const ok =
        sniff.ok && allowedSniffed.includes(sniff.mime as 'audio/webm' | 'audio/ogg' | 'audio/mp4');
      if (!ok) {
        const err = new Error('Unsupported or invalid audio content') as Error & {
          apiErrorType?: 'validation_error';
          details?: Record<string, unknown>;
        };
        err.apiErrorType = 'validation_error';
        err.details = {
          reason: sniff.reason || 'invalid_mime',
          sniffed: sniff.mime,
          claimedType: providedType || 'unknown',
          sizeBytes: file.size,
        };
        try {
          this.log.warn('voice_mime_invalid', {
            action: 'voice_mime_invalid',
            metadata: {
              claimedType: providedType || 'unknown',
              sniffed: sniff.mime,
              reason: sniff.reason || 'invalid_mime',
              sizeBytes: file.size,
            },
          });
        } catch {}
        throw err;
      }
    } else if (!containerOk) {
      // Legacy fallback when sniffing is disabled
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
      const err = new Error(`Quota exceeded. Used ${current.used}/${current.limit}`) as Error & {
        code?: string;
        details?: unknown;
      };
      err.code = 'quota_exceeded';
      err.details = { scope: 'daily', ...current };
      try {
        this.log.info('voice_limit', {
          action: 'voice_limit',
          metadata: {
            ownerType,
            ownerMasked: ownerId ? `…${ownerId.slice(-4)}` : '',
            used: current.used,
            limit: current.limit,
          },
        });
      } catch {}
      throw err;
    }

    // Optional dev-echo bypass for integration/dev runs
    if (this.env.VOICE_DEV_ECHO === '1') {
      const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
      return { text: '[dev] transcription placeholder', isFinal: true, usage };
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
      let normalized: File = file;
      try {
        const t = (file.type || '').toLowerCase();
        const sniffedBase = sniff.ok && sniff.mime !== 'unknown' ? sniff.mime : undefined;
        const baseType =
          sniffedBase ||
          (t.includes('webm')
            ? 'audio/webm'
            : t.includes('ogg')
              ? 'audio/ogg'
              : t.includes('mp4')
                ? 'audio/mp4'
                : 'audio/webm');
        const n = (file.name || '').toLowerCase();
        const hasExt = n.endsWith('.webm') || n.endsWith('.ogg') || n.endsWith('.mp4');
        const name = hasExt
          ? file.name
          : baseType === 'audio/ogg'
            ? 'chunk.ogg'
            : baseType === 'audio/mp4'
              ? 'chunk.mp4'
              : 'chunk.webm';
        normalized = new File([buf], name, { type: baseType });
      } catch {}
      try {
        if (this.env.VOICE_R2_ARCHIVE === '1' && this.env.R2_VOICE) {
          const tt = (normalized.type || '').toLowerCase();
          const ext = tt.includes('ogg') ? 'ogg' : tt.includes('mp4') ? 'mp4' : 'webm';
          const key = `voice/sess-${sessionId}/${Date.now()}.${ext}`;
          const ab = await normalized.arrayBuffer();
          await this.env.R2_VOICE.put(key, new Uint8Array(ab), {
            httpMetadata: { contentType: normalized.type || 'application/octet-stream' },
          });
        }
      } catch {}
      try {
        if (this.isDevelopment()) {
          this.log.debug('transcribe_chunk_meta', {
            action: 'transcribe_chunk_meta',
            metadata: {
              providedType: file.type || 'unknown',
              providedName: file.name || 'unknown',
              providedSize: file.size,
              normalizedType: normalized.type || 'unknown',
              normalizedName: normalized.name || 'unknown',
              normalizedSize: normalized.size,
            },
          });
        }
      } catch {}
      type TranscriptionsAPI = {
        create: (args: { file: File; model: string; language?: string }) => Promise<unknown>;
      };
      type OpenAIClientSubset = { audio: { transcriptions: TranscriptionsAPI } };
      const resUnknown = await (
        client as unknown as OpenAIClientSubset
      ).audio.transcriptions.create({
        file: normalized,
        model,
        language: lang,
      });
      const maybe = resUnknown as { text?: unknown };
      text = typeof maybe.text === 'string' ? maybe.text : String(maybe.text ?? '');
    } catch (e) {
      const errObj = e as {
        status?: number;
        statusCode?: number;
        code?: unknown;
        message?: unknown;
      };
      const status: number | undefined =
        errObj?.status ||
        errObj?.statusCode ||
        (typeof errObj?.code === 'number' ? (errObj.code as number) : undefined);
      const mapped = buildProviderError(
        status ?? 500,
        'openai',
        (typeof errObj?.message === 'string' ? errObj.message : '').slice(0, 200)
      );
      try {
        this.log.warn('whisper_error', {
          action: 'whisper_error',
          metadata: {
            status: status ?? 'unknown',
            message: (typeof errObj?.message === 'string' ? errObj.message : '').slice(0, 200),
            ownerType,
            ownerMasked: ownerId ? `…${ownerId.slice(-4)}` : '',
          },
        });
      } catch {}
      throw mapped;
    }

    const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
    try {
      const dt = Date.now() - t0;
      this.log.info('transcribe_success', {
        action: 'transcribe_success',
        metadata: {
          sessionId,
          ownerType,
          ownerMasked: ownerId ? `…${ownerId.slice(-4)}` : '',
          latencyMs: dt,
          sizeBytes: file.size,
        },
      });
    } catch {}
    return { text, isFinal: true, usage };
  }
}
