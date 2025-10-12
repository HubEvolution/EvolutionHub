---
# Single Source of Truth (SSoT)
# Voice‑Visualizer + Transcriptor Module

Status: draft (MVP plan finalized)
Owners: platform
Affected areas: src/components/tools/, src/pages/api/, src/lib/services/, src/middleware.ts, docs/, openapi.yaml, routes.md
---

# Overview

This document is the single source of truth for the realtime Voice‑Visualizer + Transcriptor module. It defines architecture, API contracts, limits, security, runtime bindings, client structure, testing, and rollout. It must remain authoritative; other docs should link here.

Goals:

- Realtime microphone capture, analyser‑driven visual rendering, and parallel Whisper transcription.
- Minimal latency via small audio chunk uploads (MVP); optional streaming in Phase 2.
- Full compliance with Evolution Hub rules: API middleware, CSRF/same‑origin, rate‑limits, logging, KV quotas, and route‑scoped security headers.

Non‑Goals (MVP):

- Provider WebSocket/Reatime API proxying.
- Long‑term storage of raw audio (optional R2 feature gated behind a flag).

## Repository & Conventions

- Runtime roots per Hub rules.
- New modules align to existing patterns from the Image Enhancer and Prompt Enhancer.
- Typescript strict, ESLint/Prettier, and API shapes via `createApiSuccess`/`createApiError`.
- Security enforced by `withApiMiddleware()` and `src/middleware.ts`.

Key references to reuse:

- `src/lib/api-middleware.ts`
- `src/lib/rate-limiter.ts`
- `src/lib/security/csrf.ts`
- `src/lib/services/provider-error.ts`
- `src/pages/r2-ai/[...path].ts` (proxy gating pattern)
- `src/components/tools/ImagEnhancerIsland.tsx` (island + hooks architecture)

## Runtime Configuration & Bindings

Environment variables (Worker `locals.runtime.env`):

- `OPENAI_API_KEY` (existing)
- `WHISPER_MODEL` (optional; default: provider default, e.g. `whisper-1` or `gpt-4o-mini-transcribe`)
- `KV_VOICE_TRANSCRIBE` (KV namespace for quotas/usage)
- `ENVIRONMENT` (existing; used to treat dev/test as non‑production)
- Optional (only if R2 archive enabled): `R2_VOICE`

Type additions in `src/env.d.ts` (to be implemented):

- `KV_VOICE_TRANSCRIBE?: import('@cloudflare/workers-types').KVNamespace`
- `WHISPER_MODEL?: string`
- `R2_VOICE?: import('@cloudflare/workers-types').R2Bucket` (if archive enabled)

## Limits & Quotas

Daily usage tracked in KV per owner (guest/user), mirroring AI Image patterns.

- Unit: chunk count (MVP; 2s-Kadenz, siehe UI-Cadence unten).
- Defaults (subject to tuning):
  - Guest: 60 chunks/day (~60s if 1s cadence)
  - User (free): 300 chunks/day (~5 min)
  - Higher plans may raise limits (Phase B).

Rate‑limiting (per IP+user key):

- `voiceTranscribeLimiter`: 15 req/min (POST `/api/voice/transcribe`).
- `apiRateLimiter` for `GET /api/voice/usage`.

429 responses include `Retry-After` (seconds) per `src/lib/rate-limiter.ts`.

## Finalized MVP decisions

- **Modell**: `DEFAULT_WHISPER_MODEL = 'whisper-1'` (konservativ, stabil, Repo-kompatibel).
- **Chunk-Kadenz/Größe**: 2s Timeslice, `VOICE_MAX_CHUNK_BYTES = 1_200_000` (Balance Latenz/Traffic).
- **Quota-Einheit/Werte**: Chunks/Tag — `guest=60`, `user=300` (kompatibel zu Tagesfenster-Keys).
- **Dev‑Echo**: nur, wenn `OPENAI_API_KEY` fehlt (echte Fehler bleiben sichtbar).
- **Validierung**: MIME‑Allowlist (MediaRecorder liefert korrekte Typen; kein Audio-Sniffing im MVP).

## Security

- Same‑origin checks & CSRF: enable `enforceCsrfToken: true` on mutating routes.
- Response security headers by `withApiMiddleware()`; do not override CSP.
- Global `Permissions-Policy` currently sets `microphone=()`; we must enable microphone only on the tool pages via a route‑scoped override in `src/middleware.ts` (see Route‑Scoped Policies below).
- No third‑party hosts required for the module; visuals are local Canvas/WebGL.

## API Contracts (MVP)

All endpoints use `withApiMiddleware()` from `src/lib/api-middleware.ts` and return standardized JSON shapes.

### POST `/api/voice/transcribe`

- Content‑Type: `multipart/form-data`
- Fields:
  - `chunk`: File (WebM Opus or OGG Opus). Max size per `config/voice`.
  - `sessionId`: string (groups chunks; generated client‑side UUID).
  - `lang` (optional): language hint (ISO tag).
- Headers: `X-CSRF-Token` required. Same‑origin validated.
- Rate limit: `voiceTranscribeLimiter` (15/min recommended).
- 200 OK:

```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "text": "partial or final text",
    "isFinal": false,
    "usage": { "used": 12, "limit": 60, "resetAt": 1738432000000 },
    "limits": { "user": 300, "guest": 60 }
  }
}
```

- 400 validation_error (missing fields, type/size), 403 forbidden (CSRF/quota), 429 Too Many Requests, 5xx server_error.

### GET `/api/voice/usage`

- Returns owner detection + usage/limits (parity with `src/pages/api/ai-image/usage.ts`).
- Debug headers: `X-Usage-OwnerType`, `X-Usage-Plan` (if user), `X-Usage-Limit`.
- 200 OK:

```json
{
  "success": true,
  "data": {
    "ownerType": "guest",
    "usage": { "used": 3, "limit": 60, "resetAt": null },
    "limits": { "user": 300, "guest": 60 },
    "plan": "free"
  }
}
```

### Phase 2 (optional) `GET /api/voice/stream?session=...`

- `text/event-stream` SSE pushing `{ text, partial }` events if we adopt a server aggregator. Not in MVP.

## Service Layer

File: `src/lib/services/voice-transcribe-service.ts`

Responsibilities:

- Validate chunk (content‑type/size) and normalize to provider‑accepted format.
- Call OpenAI Whisper via `openai` client; map provider errors using `buildProviderError()`
  (`src/lib/services/provider-error.ts`).
- Usage tracking via `KV_VOICE_TRANSCRIBE` (get/increment) with 24h windows.
- Optional: archive concatenated session audio to R2 when enabled.

Methods (MVP):

- `transcribeChunk({ ownerType, ownerId, sessionId, file, lang? }): Promise<{ text: string; isFinal?: boolean; usage: UsageInfo }>`
- `getUsage(ownerType, ownerId, limit): Promise<UsageInfo>`
- `incrementUsage(ownerType, ownerId, limit): Promise<UsageInfo>`

## Client (UI) Structure

Directory: `src/components/tools/voice-visualizer/`

- `VoiceVisualizerIsland.tsx` — main island with Start/Stop and text display.
- Hooks:
  - `useMicrophone()` — `getUserMedia({ audio: true })`, permission state, cleanup.
  - `useAnalyser()` — `AudioContext`, `AnalyserNode`, provides RMS/spectrum arrays.
  - `useTranscription()` — `MediaRecorder` → small blob chunks → POST `/api/voice/transcribe` with `X-CSRF-Token` (`ensureCsrfToken()` from `src/lib/security/csrf.ts`); merge partials and handle 429 via a simple retry schedule (reusing ideas from `useRateLimit()`).
  - `useVisualizerCanvas()` — Canvas/WebGL render loop driven by analyser data (amplitude/spectral centroid/onsets).
- `types.ts` — local types for UI state & payloads.
- Styling: Tailwind utility classes and/or a small CSS file; design palette Black/White/Cyan.

Pages:

- `src/pages/en/tools/voice-visualizer/app.astro`
- `src/pages/de/tools/voice-visualizer/app.astro`
  Both mount the island with localized strings.

## Visual Design Mapping (MVP)

- Black canvas background.
- Cyan/white “energy fissure” spline — stroke thickness & glow map to RMS.
- Particle field — density & velocity scale with low‑frequency band magnitude.
- Spectral centroid — hue shift cyan↔white.
- Onset detection — micro‑flashes & small particle bursts (<=250ms).
- Text panel — bottom‑aligned, newest line strong; older fade to 40–60%.
- Token arrival — subtle ripple along fissure.
- Smoothing — 30–60ms moving average; clamp/ease to avoid jitter.

## Route‑Scoped Policies (Microphone)

Global default (HTML) is strict; `microphone=()` is set by both API middleware and page middleware. We must enable microphone only on the visualizer pages.

Change in `src/middleware.ts` (conceptual):

- After building `response`, when `path` matches
  `^/(?:de|en)?/tools/voice-visualizer(?:/app)?/?$`, set
  `Permissions-Policy` to include `microphone=(self)` while keeping other directives identical to defaults. This mirrors how other headers are set per‑route (e.g., login no‑cache).

Note: Do NOT relax on other routes. `/r2-ai/**` remains public/ungated per rules; `/r2-voice/**` would be similar only if introduced for R2 (not required for Whisper uploads).

## Storage & Proxy (Optional)

If archival is desired:

- Add R2 binding `R2_VOICE`.
- Write sessions to `voice/uploads/<ownerType>/<ownerId>/<ts>.webm`.
- Create `src/pages/r2-voice/[...path].ts` modeled on `src/pages/r2-ai/[...path].ts` with owner gating for `results/` and public `uploads/` (only if providers must fetch). Whisper upload does not require public fetch, so this is optional.

## i18n Keys (minimum)

- `pages.tools.voiceVisualizer.title`
- `pages.tools.voiceVisualizer.start`
- `pages.tools.voiceVisualizer.stop`
- `pages.tools.voiceVisualizer.listening`
- `pages.tools.voiceVisualizer.permissionDenied`
- `pages.tools.voiceVisualizer.quotaReached`
- `common.loading`
- `common.error`

## Testing & CI

Unit tests:

- Hooks: mock `MediaRecorder` and `AnalyserNode`; verify state transitions and smoothing.
- Service: mock OpenAI client; validate mapping to `validation_error/forbidden/server_error` and content‑type/size checks.

Integration:

- `POST /api/voice/transcribe` with small synthetic blob; assert JSON shape, CSRF required, limiter behavior.
- `GET /api/voice/usage` parity with image usage route.

E2E (Playwright):

- Preflights: `GET /{en|de}/tools/voice-visualizer/app`, `GET /api/voice/usage?debug=1`.
- Smoke (Chromium): simulate mic by injecting pre‑recorded blobs into `useTranscription()` (test hook option), assert text streaming UI responses and visual state changes.
- Reports to standard locations (`playwright-report` or v2 `test-suite-v2/reports/playwright-html-report`).

## Rollout Plan

Phase 0 — Foundations:

- Add config module `src/config/voice/` with defaults (limits, content types, max chunk bytes).
- Add service + endpoints (usage, transcribe) with limiter + CSRF.
- Add route‑scoped `Permissions-Policy` override in `src/middleware.ts` for the tool pages only.

Phase 1 — UI MVP:

- Implement island + hooks and localized pages.
- Verify quotas/limits, rate‑limit UX, and graceful fallbacks.

Phase 2 — Enhancements:

- Optional SSE/WebSocket aggregator for partials.
- Optional R2 archival; observability improvements.
- Plan‑based entitlements integration (if required for billing alignment).

## Documentation & Specs

Authoritative docs:

- This SSoT (link from `README.md`, `docs/frontend/README.md`, `routes.md`).
- `openapi.yaml`: add the two endpoints with schemas and examples above.
- `routes.md`: add both routes under API with allowed methods and notes.

## Implementation Checklist (authoritative)

- **api** `src/pages/api/voice/transcribe.ts` with `withApiMiddleware()`, `enforceCsrfToken: true`, and `voiceTranscribeLimiter`.
- **api** `src/pages/api/voice/usage.ts` modeled on `ai-image/usage.ts`.
- **service** `src/lib/services/voice-transcribe-service.ts` (OpenAI Whisper, KV usage, provider error mapping).
- **config** `src/config/voice/index.ts` (limits, content types, max bytes, model fallback).
- **security** Route‑scoped `Permissions-Policy` microphone enable for `/{locale}/tools/voice-visualizer/*` in `src/middleware.ts` (keep all other directives intact).
  - **ui** `src/components/tools/voice-visualizer/` (island + hooks) and pages under `src/pages/{en,de}/tools/voice-visualizer/app.astro`.
  - **tests** Add unit/integration/E2E per Testing & CI.
  - **docs** Update `openapi.yaml` and `routes.md` to reference this SSoT and the exact contracts.

## Implementation specifics aligned with Image Enhancer

The following details mirror existing patterns in `src/lib/services/ai-image-service.ts` and `src/lib/rate-limiter.ts`, adapted for voice.

### KV key formats and quotas

- Usage (daily window):
  - Key: `voice:usage:${ownerType}:${ownerId}`
  - Value JSON: `{ "count": number, "resetAt": epoch_ms }`
  - TTL: `expiration = Math.floor(resetAt / 1000)` when writing
- Optional monthly counters (if needed later):
  - Key: `voice:usage:month:${ownerType}:${ownerId}:${ym}` where `ym="YYYYMM"`
  - Value JSON: `{ "count": number }`

### Limits and content types (config)

File: `src/config/voice/index.ts`

```ts
export const VOICE_ALLOWED_CONTENT_TYPES = [
  'audio/webm; codecs=opus',
  'audio/ogg; codecs=opus',
  // lenient fallbacks accepted by some browsers/providers
  'audio/webm',
  'audio/ogg',
] as const;

export const VOICE_MAX_CHUNK_BYTES = 1_200_000; // ~1.2MB per chunk (tune as needed)

export const VOICE_FREE_LIMIT_GUEST = 60; // 60 chunks/day (~60s @1s cadence)
export const VOICE_FREE_LIMIT_USER = 300; // 300 chunks/day (~5min)

export const DEFAULT_WHISPER_MODEL = 'whisper-1';
// Alternative if enabled in env: 'gpt-4o-mini-transcribe'

export type VoiceOwnerType = 'user' | 'guest';
```

### Dedicated rate limiter export

File: `src/lib/rate-limiter.ts` (add new export)

```ts
export const voiceTranscribeLimiter = createRateLimiter({
  maxRequests: 15,
  windowMs: 60 * 1000,
  name: 'voiceTranscribe',
});
```

### Service skeleton (OpenAI Whisper)

File: `src/lib/services/voice-transcribe-service.ts`

```ts
import { loggerFactory } from '@/server/utils/logger-factory';
import OpenAI from 'openai';
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

  private usageKey(ownerType: VoiceOwnerType, ownerId: string) {
    return `voice:usage:${ownerType}:${ownerId}`;
  }

  async getUsage(
    ownerType: VoiceOwnerType,
    ownerId: string,
    limit: number
  ): Promise<VoiceUsageInfo> {
    const kv = this.env.KV_VOICE_TRANSCRIBE;
    if (!kv) return { used: 0, limit, resetAt: null };
    const raw = await kv.get(this.usageKey(ownerType, ownerId));
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
    await kv.put(key, JSON.stringify({ count, resetAt }), {
      expiration: Math.floor(resetAt / 1000),
    });
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
    if (!VOICE_ALLOWED_CONTENT_TYPES.some((t) => (file.type || '').includes(t.split(';')[0]))) {
      throw new Error(`Unsupported content type: ${file.type || 'unknown'}`);
    }

    // Quota
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
        // Dev echo: avoid blocking local runs
        const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
        return { text: '[dev] transcription placeholder', isFinal: true, usage };
      }
      throw new Error('OPENAI_API_KEY not configured');
    }

    const model = this.env.WHISPER_MODEL || DEFAULT_WHISPER_MODEL;
    const client = new OpenAI({ apiKey });
    let text = '';
    try {
      // openai v4 style whisper
      const res: any = await (client as any).audio.transcriptions.create({
        file,
        model,
        language: lang,
      });
      text = (res?.text || '').toString();
    } catch (e) {
      const anyErr = e as any;
      const status =
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
        metadata: { status: status ?? 'unknown' },
      });
      throw mapped;
    }

    const usage = await this.incrementUsage(ownerType, ownerId, dailyLimit);
    return { text, isFinal: true, usage };
  }
}
```

### API routes (handlers)

Files:

- `src/pages/api/voice/transcribe.ts`
- `src/pages/api/voice/usage.ts`

Key points:

- Wrap with `withApiMiddleware()`; set `rateLimiter: voiceTranscribeLimiter` for `POST /transcribe`.
- Enforce `enforceCsrfToken: true` for POST.
- Use `createMethodNotAllowed()` for unsupported verbs.
- Owner detection mirrors Image Enhancer: `ownerType` is `'user'` when `locals.user?.id` exists; otherwise `'guest'` using guest cookie.

Skeletons:

```ts
// src/pages/api/voice/transcribe.ts
import type { APIRoute } from 'astro';
import {
  withApiMiddleware,
  createApiSuccess,
  createApiError,
  createMethodNotAllowed,
} from '@/lib/api-middleware';
import { voiceTranscribeLimiter } from '@/lib/rate-limiter';
import { VoiceTranscribeService } from '@/lib/services/voice-transcribe-service';
import { VOICE_FREE_LIMIT_USER, VOICE_FREE_LIMIT_GUEST } from '@/config/voice';

export const POST: APIRoute = withApiMiddleware(
  async ({ request, locals, cookies }) => {
    const form = await request.formData();
    const file = form.get('chunk');
    const sessionId = String(form.get('sessionId') || '');
    const lang = form.get('lang') ? String(form.get('lang')) : undefined;
    if (!(file instanceof File) || !sessionId) {
      return createApiError('validation_error', 'Missing chunk or sessionId');
    }
    const ownerType = locals.user?.id ? 'user' : 'guest';
    const ownerId = locals.user?.id || cookies.get('guest_id')?.value || '';
    const service = new VoiceTranscribeService(locals.runtime.env as any);
    try {
      const out = await service.transcribeChunk(ownerType as any, ownerId, sessionId, file, lang);
      return createApiSuccess({
        sessionId,
        text: out.text,
        isFinal: out.isFinal,
        usage: out.usage,
        limits: { user: VOICE_FREE_LIMIT_USER, guest: VOICE_FREE_LIMIT_GUEST },
      });
    } catch (e) {
      const err: any = e;
      const type = err.apiErrorType || 'server_error';
      return createApiError(type, err.message, err.details || undefined);
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
```

```ts
// src/pages/api/voice/usage.ts
import type { APIRoute } from 'astro';
import { withApiMiddleware, createApiSuccess, createMethodNotAllowed } from '@/lib/api-middleware';
import { VoiceTranscribeService } from '@/lib/services/voice-transcribe-service';
import { VOICE_FREE_LIMIT_GUEST, VOICE_FREE_LIMIT_USER } from '@/config/voice';

export const GET: APIRoute = withApiMiddleware(async ({ locals, cookies, request }) => {
  const ownerType = locals.user?.id ? 'user' : 'guest';
  const ownerId =
    ownerType === 'user'
      ? (locals.user as { id: string }).id
      : cookies.get('guest_id')?.value || '';
  const limit = ownerType === 'user' ? VOICE_FREE_LIMIT_USER : VOICE_FREE_LIMIT_GUEST;
  const service = new VoiceTranscribeService(locals.runtime.env as any);
  const usage = await service.getUsage(ownerType as any, ownerId, limit);
  const resp = createApiSuccess({
    ownerType,
    usage,
    limits: { user: VOICE_FREE_LIMIT_USER, guest: VOICE_FREE_LIMIT_GUEST },
    plan: locals.user?.plan || 'free',
  });
  try {
    resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    resp.headers.set('Pragma', 'no-cache');
    resp.headers.set('Expires', '0');
    resp.headers.set('X-Usage-OwnerType', ownerType);
    resp.headers.set(
      'X-Usage-Plan',
      ownerType === 'user' ? String(locals.user?.plan || 'free') : ''
    );
    resp.headers.set('X-Usage-Limit', String(limit));
  } catch {}
  return resp;
});

const methodNotAllowed = () => createMethodNotAllowed('GET');
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
```

### Middleware: route-scoped Permissions-Policy

File: `src/middleware.ts` (concept, after response created)

```ts
const url = new URL(request.url);
const path = url.pathname;
const voicePaths = /^\/(?:de|en)?\/tools\/voice-visualizer(?:\/app)?\/?$/;
if (voicePaths.test(path)) {
  const base = response.headers.get('Permissions-Policy') || '';
  // Reuse base directives, but ensure microphone self is allowed here
  response.headers.set('Permissions-Policy', base.replace(/microphone=\(\)/, 'microphone=(self)'));
}
```

## Implemented Artifacts (MVP)

- **env typings**: `src/env.d.ts` extended with `KV_VOICE_TRANSCRIBE`, `WHISPER_MODEL`, `OPENAI_API_KEY`, optional `R2_VOICE`.
- **config**: `src/config/voice/index.ts` with constants and types.
- **rate limiting**: `voiceTranscribeLimiter` in `src/lib/rate-limiter.ts` (15/min).
- **service**: `src/lib/services/voice-transcribe-service.ts` with KV usage, validation, Whisper call, dev-echo, provider error mapping.
- **api routes**: `src/pages/api/voice/transcribe.ts`, `src/pages/api/voice/usage.ts` using `withApiMiddleware()`.
- **middleware**: `src/middleware.ts` microphone override for `/{locale}/tools/voice-visualizer[/app]`.

## Phase 2 — Detailed Plan (optional, feature-gated)

- **SSE/Long-Poll Aggregator**
  - Endpoint: `GET /api/voice/stream?sessionId=...` (SSE via `text/event-stream`) behind `withRedirectMiddleware()`.
  - Fallback: `GET /api/voice/poll?sessionId=...&cursor=n` returning `{ items: [...], cursor }`.
  - Storage (KV queue):
    - `voice:session:${sessionId}:seq` → last index (number)
    - `voice:session:${sessionId}:item:${i}` → `{ text, ts }` (TTL: 24h)
  - Producer: `POST /api/voice/transcribe` appends `{i -> text}` for same `sessionId`.
  - Limits: inherit `voiceTranscribeLimiter` for POST; SSE guarded by `apiRateLimiter` and idle timeout (e.g., 60s).

- **Optional R2 archival**
  - Bucket: `R2_VOICE` (if bound).
  - Keys: `voice/uploads/${ownerType}/${ownerId}/${sessionId}/${ts}.webm`.
  - Proxy route: `src/pages/r2-voice/[...path].ts` (like `r2-ai`) with owner gating; `Content-Type: audio/webm`.
  - Feature flag env: `VOICE_ARCHIVE_ENABLED=true`.

- **Entitlements (plans)**
  - Mirror `src/config/ai-image/entitlements.ts` pattern: map plan → `{ dailyBurstCap, monthlyCap?, allowedChunkBytes, allowedTypes }`.
  - UI reflects `limits` and any plan-specific toggles.

- **Observability & UX**
  - Add `transcribe_start`, `transcribe_partial`, `transcribe_complete`, `quota_blocked` events.
  - UI: compact backoff on 429 honoring `Retry-After`.

- **Security**
  - SSE uses same-origin + rate limit; no CSRF on GET; keep security headers via middleware.

### Logging & dev behavior

- Use `loggerFactory` with event names similar to Image Enhancer (`generate_start`, `usage_increment`). Suggested events: `transcribe_start`, `whisper_error`, `transcribe_success`.
- Dev echo: if `ENVIRONMENT` is dev-like and `OPENAI_API_KEY` missing, return a placeholder transcript and still increment daily usage to exercise UI flows.

### Owner detection & cookies

- Owner detection mirrors existing routes: prefer `locals.user?.id` when authenticated, else a stable `guestId` from cookies (`guest_id`). Ensure guest cookie creation exists (middleware or a helper).

### Response shape consistency

- Always respond via `createApiSuccess({ data })` or `createApiError({ type, message, details? })`.
- Provider errors must be mapped via `buildProviderError` to one of `forbidden | validation_error | server_error`.

#### UI cadence & recording format (client)

- **MediaRecorder**: bevorzugt `audio/webm;codecs=opus`, Fallback `audio/ogg;codecs=opus`, sonst Default.
- **timeslice**: `2000` ms (2s) für balancierte Latenz/Request-Rate.
- **Upload**: bei `dataavailable` Blobs als `chunk` an `POST /api/voice/transcribe` senden, Header `X-CSRF-Token` (via `ensureCsrfToken()`).
- **429 Handling**: `Retry-After` beachten, kurzer Backoff (z. B. `setTimeout(retry, seconds*1000)`), Queue leeren, wenn Session gestoppt.
