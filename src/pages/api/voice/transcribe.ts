import type { APIContext } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { voiceTranscribeLimiter } from '@/lib/rate-limiter';
import { VoiceTranscribeService } from '@/lib/services/voice-transcribe-service';
import { VOICE_FREE_LIMIT_USER, VOICE_FREE_LIMIT_GUEST } from '@/config/voice';
import { VoiceStreamAggregator } from '@/lib/services/voice-stream-aggregator';
import { getVoiceEntitlementsFor } from '@/config/voice/entitlements';
import type { Plan } from '@/config/ai-image/entitlements';
import { loggerFactory } from '@/server/utils/logger-factory';
import { formatZodError } from '@/lib/validation';
import { voiceTranscribeParamsSchema } from '@/lib/validation';

type FileLike = {
  size: number;
  type?: string;
  name?: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
  stream?: () => unknown;
};

type VoiceEnv = {
  KV_VOICE_TRANSCRIBE?: import('@cloudflare/workers-types').KVNamespace;
  OPENAI_API_KEY?: string;
  WHISPER_MODEL?: string;
  ENVIRONMENT?: string;
  R2_VOICE?: import('@cloudflare/workers-types').R2Bucket;
  VOICE_R2_ARCHIVE?: string | number | boolean;
  VOICE_DEV_ECHO?: string | number | boolean;
};

type MaybeTypedError = {
  apiErrorType?:
    | 'validation_error'
    | 'auth_error'
    | 'not_found'
    | 'rate_limit'
    | 'server_error'
    | 'db_error'
    | 'forbidden'
    | 'method_not_allowed';
  message?: string;
  details?: Record<string, unknown>;
};

function ensureGuestIdCookie(context: APIContext): string {
  const cookies = context.cookies;
  let guestId = cookies.get('guest_id')?.value;
  if (!guestId) {
    guestId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const url = new URL(context.request.url);
    cookies.set('guest_id', guestId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return guestId;
}

function normalizeFlag(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  return undefined;
}

export const POST = withApiMiddleware(
  async (context: APIContext) => {
    const { request, locals } = context;
    const log = loggerFactory.createLogger('voice-transcribe-api');
    const t0 = Date.now();
    const env = (locals.runtime?.env ?? {}) as Partial<VoiceEnv>;
    const form = await request.formData();
    const isFileLike = (v: unknown): v is FileLike =>
      !!v &&
      typeof v === 'object' &&
      typeof (v as { size?: unknown }).size === 'number' &&
      (typeof (v as { arrayBuffer?: unknown }).arrayBuffer === 'function' ||
        typeof (v as { stream?: unknown }).stream === 'function');
    let file: unknown = form.get('chunk');
    if (!isFileLike(file)) file = form.get('file');
    if (!isFileLike(file)) {
      for (const [, val] of form.entries()) {
        if (isFileLike(val)) {
          file = val;
          break;
        }
      }
    }
    // In dev echo mode we tolerate missing file by fabricating a tiny dummy audio blob
    if (!isFileLike(file) && String(env.VOICE_DEV_ECHO) === '1') {
      try {
        const dummy = new Blob([new Uint8Array(16)], { type: 'audio/webm' });
        const buf = await dummy.arrayBuffer();
        file = new File([buf], 'chunk.webm', { type: 'audio/webm' });
      } catch {}
    }

    const getField = (name: string) => {
      const v = form.get(name);
      return v === null ? undefined : v;
    };
    const parsed = voiceTranscribeParamsSchema.safeParse({
      sessionId: getField('sessionId'),
      jobId: getField('jobId'),
      lang: getField('lang'),
      isLastChunk: getField('isLastChunk'),
    });
    if (!parsed.success) {
      return createApiError('validation_error', 'Invalid form fields', {
        details: formatZodError(parsed.error),
      });
    }
    const sessionId = parsed.data.sessionId;
    const jobIdForm = parsed.data.jobId || '';
    const lang = parsed.data.lang;
    const isLastChunk = parsed.data.isLastChunk ?? false;
    try {
      log.debug('transcribe_api_received', {
        action: 'transcribe_api_received',
        metadata: {
          sessionId,
          jobId: jobIdForm || null,
          isLastChunk,
          providedType: isFileLike(file) ? file.type || 'unknown' : 'none',
          sizeBytes: isFileLike(file) ? file.size : 0,
        },
      });
    } catch {}
    if (!isFileLike(file)) {
      return createApiError('validation_error', 'Missing chunk file');
    }

    const ownerType: 'user' | 'guest' = locals.user?.id ? 'user' : 'guest';
    const ownerId = locals.user?.id || ensureGuestIdCookie(context);

    const openaiKey = String(env.VOICE_DEV_ECHO) === '1' ? undefined : env.OPENAI_API_KEY;
    const service = new VoiceTranscribeService({
      KV_VOICE_TRANSCRIBE: env.KV_VOICE_TRANSCRIBE,
      OPENAI_API_KEY: openaiKey,
      WHISPER_MODEL: env.WHISPER_MODEL,
      ENVIRONMENT: env.ENVIRONMENT,
      R2_VOICE:
        typeof env.R2_VOICE === 'object' && env.R2_VOICE !== null
          ? (env.R2_VOICE as import('@cloudflare/workers-types').R2Bucket)
          : undefined,
      VOICE_R2_ARCHIVE: normalizeFlag(env.VOICE_R2_ARCHIVE),
      VOICE_DEV_ECHO: normalizeFlag(env.VOICE_DEV_ECHO),
    });
    const aggregator = new VoiceStreamAggregator(env.KV_VOICE_TRANSCRIBE);
    const jobId = jobIdForm || (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2));
    await aggregator.ensure(jobId);

    try {
      const plan: Plan | undefined =
        ownerType === 'user' ? ((locals.user?.plan as Plan | undefined) ?? 'free') : undefined;
      const ent = getVoiceEntitlementsFor(ownerType, plan);
      const out = await service.transcribeChunk(
        ownerType,
        ownerId,
        sessionId,
        file as File,
        lang,
        ent.dailyBurstCap
      );
      // Aggregator-Update für Streaming/Polling
      if (out.text) {
        if (out.isFinal || isLastChunk) {
          await aggregator.setFinal(jobId, out.text);
        } else {
          await aggregator.appendPartial(jobId, out.text);
        }
      }
      if (out.usage) {
        const usage = {
          count: out.usage.used,
          limit: out.usage.limit,
          window: out.usage.resetAt ? new Date(out.usage.resetAt).toISOString() : 'rolling-24h',
        };
        await aggregator.setUsage(jobId, usage);
      }
      try {
        const dt = Date.now() - t0;
        log.info('transcribe_api_success', {
          action: 'transcribe_api_success',
          metadata: {
            sessionId,
            jobId,
            ownerType,
            isFinal: out.isFinal || isLastChunk,
            latencyMs: dt,
            sizeBytes: file.size,
          },
        });
      } catch {}
      return createApiSuccess({
        sessionId,
        jobId,
        text: out.text,
        isFinal: out.isFinal || isLastChunk,
        usage: out.usage,
        limits: { user: VOICE_FREE_LIMIT_USER, guest: VOICE_FREE_LIMIT_GUEST },
      });
    } catch (e) {
      const err = e as MaybeTypedError;
      const type = err.apiErrorType || 'server_error';
      try {
        const dt = Date.now() - t0;
        log.warn('transcribe_api_error', {
          action: 'transcribe_api_error',
          metadata: {
            sessionId,
            jobId: jobIdForm || null,
            errorType: type,
            message: (err?.message || '').slice(0, 200),
            latencyMs: dt,
          },
        });
      } catch {}
      return createApiError(type, err.message || 'Unknown error', err.details || undefined);
    }
  },
  { rateLimiter: voiceTranscribeLimiter, enforceCsrfToken: true }
);

const methodNotAllowed = () => createMethodNotAllowed('POST');
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
