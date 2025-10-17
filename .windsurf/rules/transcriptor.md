---
trigger: always_on
priority: 60
---

# Transcriptor (Whisper) Rules

## Scope

- Voice Visualizer UI, `POST /api/voice/transcribe`, `GET /api/voice/usage`; planned SSE/Poll.

## Dependencies

- `src/lib/services/voice-transcribe-service.ts`
- `src/config/voice/index.ts`

## Constraints

- Tooling/Style rules apply.
- Testing: integration for transcribe/usage; E2E smoke for UI.

## Security & Privacy

- CSRF/Origin for POST; rate limiting 15/min; quotas per plan.

## Related Codemap

- `/.windsurf/codemaps/EH __ Transcriptor (Whisper) __ Codemap v1.md`

## Documentation Reference

- `.windsurf/rules/api-and-security.md`
- `docs/architecture/voice-visualizer-transcriptor.md`
