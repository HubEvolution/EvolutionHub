---
description: EH :: Transcriptor (Whisper) :: Codemap v1
version: 1.1
feature: transcriptor
---

# EH :: Transcriptor (Whisper) :: Codemap v1

## Entry Points

- UI: `src/pages/tools/voice-visualizer/app.astro` (DE neutral), `src/pages/en/tools/voice-visualizer/app.astro`, `src/components/tools/voice-visualizer/*`
- API: `src/pages/api/voice/{transcribe,usage,stream,poll}.ts` (found)

## Services/Config

- `src/lib/services/voice-transcribe-service.ts`
- `src/lib/services/voice-stream-aggregator.ts`
- `src/config/voice/index.ts`
- `src/config/voice/entitlements.ts`
- `src/lib/security/csrf.ts`, `src/lib/rate-limiter.ts`

## Middleware & i18n

- `src/middleware.ts`: Permissions‑Policy Mikrofon‑Override für Tool‑Routen
  - Regex: `^\/(?:(?:de|en)\/)?tools\/voice-visualizer(?:\/app)?\/?$`
- `src/lib/locale-path.ts`: DE neutral (kein `/de`), EN unter `/en/...`.

## Related Rules

- `.windsurf/rules/transcriptor.md`
- `.windsurf/rules/api-and-security.md`

## Documentation

- `docs/architecture/voice-visualizer-transcriptor.md`

## Environment & Flags

- Wrangler `[env.development.vars]`: `VOICE_STREAM_SSE=1`, `VOICE_STREAM_POLL=1`, `VOICE_R2_ARCHIVE=0`, `VOICE_DEV_ECHO=1`

## Quick Verification (DEV)

```sh
JOB="job-$(date +%s)"
curl -i -N --max-time 3 "http://127.0.0.1:8787/api/voice/stream?jobId=$JOB"  # expect: 200 + connected
curl -i "http://127.0.0.1:8787/api/voice/poll?jobId=$JOB"                     # expect: 200 JSON snapshot
```

## Tests

- **Integration**: `tests/integration/api/voice/transcribe-and-poll.test.ts`
- **Routing/Headers**: `tests/integration/routing/voice-visualizer-permissions.test.ts`
- **E2E Smoke**: `test-suite-v2/src/e2e/voice/stream-and-poll.spec.ts`

Notes:

- SSE is flag-gated via `VOICE_STREAM_SSE`; polling via `VOICE_STREAM_POLL`.
- Permissions-Policy microphone override is applied in `src/middleware.ts` for tool routes.
