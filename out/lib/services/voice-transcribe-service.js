'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.VoiceTranscribeService = void 0;
const openai_1 = require('openai');
const logger_factory_1 = require('@/server/utils/logger-factory');
const provider_error_1 = require('@/lib/services/provider-error');
const usage_1 = require('@/lib/kv/usage');
const voice_1 = require('@/config/voice');
class VoiceTranscribeService {
  constructor(env) {
    this.log = logger_factory_1.loggerFactory.createLogger('voice-transcribe-service');
    this.env = env;
  }
  isDevelopment() {
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
  usageKey(ownerType, ownerId) {
    return `voice:usage:${ownerType}:${ownerId}`;
  }
  async getUsage(ownerType, ownerId, limit) {
    const kv = this.env.KV_VOICE_TRANSCRIBE;
    if (!kv) return { used: 0, limit, resetAt: null };
    const useV2 = this.env.USAGE_KV_V2 === '1';
    if (useV2) {
      const keyV2 = (0, usage_1.rollingDailyKey)('voice', ownerType, ownerId);
      const usage = await (0, usage_1.getUsage)(kv, keyV2);
      if (!usage) return { used: 0, limit, resetAt: null };
      return { used: usage.count, limit, resetAt: usage.resetAt ? usage.resetAt * 1000 : null };
    }
    const key = this.usageKey(ownerType, ownerId);
    const raw = await kv.get(key);
    if (!raw) return { used: 0, limit, resetAt: null };
    try {
      const parsed = JSON.parse(raw);
      return { used: parsed.count || 0, limit, resetAt: parsed.resetAt || null };
    } catch {
      return { used: 0, limit, resetAt: null };
    }
  }
  async incrementUsage(ownerType, ownerId, limit) {
    const kv = this.env.KV_VOICE_TRANSCRIBE;
    if (!kv) return { used: 0, limit, resetAt: null };
    const useV2 = this.env.USAGE_KV_V2 === '1';
    if (useV2) {
      const res = await (0, usage_1.incrementDailyRolling)(kv, 'voice', ownerType, ownerId, limit);
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
    try {
      const mask = ownerId ? `…${ownerId.slice(-4)}(${ownerId.length})` : '';
      this.log.debug('usage_increment', {
        action: 'usage_increment',
        metadata: { ownerType, ownerId: mask, key, used: count, limit, expiration },
      });
    } catch {}
    return { used: count, limit, resetAt };
  }
  async transcribeChunk(ownerType, ownerId, sessionId, file, lang, limitOverride) {
    const t0 = Date.now();
    // Validate file (cross-realm safe)
    const isFileLike = (v) => !!v && typeof v === 'object' && typeof v.size === 'number';
    if (!isFileLike(file)) throw new Error('Invalid file');
    if (file.size > voice_1.VOICE_MAX_CHUNK_BYTES)
      throw new Error(`File too large. Max ${Math.round(voice_1.VOICE_MAX_CHUNK_BYTES / 1024)} KB`);
    const providedType = file.type || '';
    const containerOk = voice_1.VOICE_ALLOWED_CONTENT_TYPES.some((t) =>
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
          ? voice_1.VOICE_FREE_LIMIT_USER
          : voice_1.VOICE_FREE_LIMIT_GUEST;
    const current = await this.getUsage(ownerType, ownerId, dailyLimit);
    if (current.used >= current.limit) {
      const err = new Error(`Quota exceeded. Used ${current.used}/${current.limit}`);
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
    const client = new openai_1.default({ apiKey });
    const model = this.env.WHISPER_MODEL || voice_1.DEFAULT_WHISPER_MODEL;
    let text = '';
    try {
      let normalized = file;
      try {
        const t = (file.type || '').toLowerCase();
        const baseType = t.includes('webm')
          ? 'audio/webm'
          : t.includes('ogg')
            ? 'audio/ogg'
            : t.includes('mp4')
              ? 'audio/mp4'
              : 'audio/webm';
        const n = (file.name || '').toLowerCase();
        const hasExt = n.endsWith('.webm') || n.endsWith('.ogg') || n.endsWith('.mp4');
        const name = hasExt
          ? file.name
          : baseType === 'audio/ogg'
            ? 'chunk.ogg'
            : baseType === 'audio/mp4'
              ? 'chunk.mp4'
              : 'chunk.webm';
        const buf = await file.arrayBuffer();
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
      const resUnknown = await client.audio.transcriptions.create({
        file: normalized,
        model,
        language: lang,
      });
      const maybe = resUnknown;
      text = typeof maybe.text === 'string' ? maybe.text : String(maybe.text ?? '');
    } catch (e) {
      const errObj = e;
      const status =
        errObj?.status ||
        errObj?.statusCode ||
        (typeof errObj?.code === 'number' ? errObj.code : undefined);
      const mapped = (0, provider_error_1.buildProviderError)(
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
exports.VoiceTranscribeService = VoiceTranscribeService;
