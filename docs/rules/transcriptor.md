# Transcriptor (Whisper) Rules

## Zweck

Sichere Sprach‑Transkription (Whisper) mit Multipart‑Handling, MIME‑Allowlist, Quoten/Rate‑Limits und klaren Fehlern; optionale SSE/Poll später.

## Muss

- Upload & Sicherheit
  - Multipart‑Upload; Content‑Type/MIME Allowlist (z. B. audio/mpeg, audio/wav, audio/webm; projektspezifisch ergänzen).
  - Größen‑/Chunk‑Limits (z. B. VOICE_MAX_CHUNK_BYTES) serverseitig durchsetzen.
  - Same‑Origin/CSRF für unsafe Methods; keine Fremd‑Origins.
- Limits
  - Rate‑Limit: `voiceTranscribeLimiter` (15/min).
  - Quoten serverseitig (pro Nutzer/Guest) prüfen; KV/D1 Nutzung aktualisieren.
- Fehlerformen
  - Einheitlich via `createApiError(type, message, details?)` (validation/forbidden/server_error).

## Sollte

- Permissions‑Policy (microphone) nur auf relevanten Tool‑Seiten lockern.
- SSE/Poll (Phase 2+) für Streaming‑Transkription designen; jetzt MVP synchron.
- Observability: Korrelation/Timing, redaktierte Logs (keine Audiodaten persistieren).

## Nicht

- Keine Annahme unsicherer MIME‑Typen.
- Keine Prompts/PII im Klartext loggen.

## Checkliste

- [ ] Multipart‑Upload akzeptiert; MIME Allowlist enforced?
- [ ] Größen/Chunk‑Limit aktiv?
- [ ] Rate‑Limit & Quoten aktiv?
- [ ] Fehler‑Mapping korrekt?
- [ ] Permissions‑Policy nur auf Tool‑Seiten aufgelockert?

## Code‑Anker

- `src/lib/services/voice-transcribe-service.ts`
- `src/config/voice/index.ts`
- API: `src/pages/api/voice/transcribe.ts`, `src/pages/api/voice/usage.ts`
- `src/middleware.ts` (Permissions‑Policy override auf Tool‑Seiten)

## CI/Gates

- `npm run test:integration` (Transcribe/Usage)
- `npm run openapi:validate`
- `npm run lint`

## Referenzen

- Global Rules; API & Security Rules; Zod↔OpenAPI.
- `.windsurf/rules/transcriptor.md`

## Changelog

- 2025‑10‑31: Upload/MIME/Quoten/Rate‑Limits/Permissions‑Policy festgelegt.
