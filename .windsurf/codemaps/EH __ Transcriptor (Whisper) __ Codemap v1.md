---
description: EH :: Transcriptor (Whisper) :: Codemap v1
version: 1
feature: transcriptor
---

# EH :: Transcriptor (Whisper) :: Codemap v1

## Entry Points

- UI: `src/pages/{de|en}/tools/voice-visualizer/app.astro`, `src/components/tools/voice-visualizer/*`
- API: `src/pages/api/voice/{transcribe,usage}.ts` (found)
- Streaming (planned): `src/pages/api/voice/{stream,poll}.ts` (not found in scan)

## Services/Config

- `src/lib/services/voice-transcribe-service.ts`
- `src/config/voice/index.ts`
- `src/lib/security/csrf.ts`, `src/lib/rate-limiter.ts`

## Related Rules

- `.windsurf/rules/transcriptor.md`
- `.windsurf/rules/api-and-security.md`

## Documentation

- `docs/architecture/voice-visualizer-transcriptor.md`
