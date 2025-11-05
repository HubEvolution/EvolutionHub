---
trigger: always_on
---

# AI Video Enhancer Rules

## Zweck

Sicheres Video-Upscaling über Replicate mit strikten Upload-Guardrails, planbasierten Quoten/Krediten, R2-Speicherung und konsistenter Fehlerbehandlung.

## Muss

- Upload & Validierung
  - Form-Data Felder `file`, `tier`, `durationMs` strikt mit `videoUploadSchema` prüfen (`durationMs` ≥ 1, Tier ∈ {720p,1080p}).
  - MIME-Allowlist: `video/mp4`, `video/quicktime`, `video/webm`; Dateigrößen- und Laufzeitlimits per Tier (`MAX_UPLOAD_BYTES_TIER`, `MAX_DURATION_SECONDS_TIER`).
  - Dateien in `R2_AI_IMAGES` unter `ai-video/uploads/...` ablegen; `feature=ai-video`, `expiresAt` (14 Tage) setzen; `/r2-ai/**` bleibt öffentlich.
  - Gäste erhalten `guest_id`-Cookie (SameSite=Lax, HttpOnly, 180 Tage); Nutzer werden über Session identifiziert.
- Sicherheit & Middleware
  - Alle Routen via `withApiMiddleware`; POST-Endpunkte (`/api/ai-video/upload`, `/api/ai-video/generate`) erzwingen Same-Origin + Double-Submit CSRF.
  - Rate-Limit `aiJobsLimiter` für Upload, Generate und Poll; 429 muss `Retry-After` enthalten.
  - Einheitliche Antworten über `createApiSuccess` / `createApiError`; 405 via `createMethodNotAllowed`.
- Provider-Aufrufe
  - `REPLICATE_API_TOKEN` Pflicht; neueste Version von `topazlabs/video-upscale` ermitteln, Input-URL aus R2 (`/r2-ai/<key>`).
  - Provider-Fehler auf `validation_error | forbidden | server_error` mappen (inkl. Text-Snippet ≤200 Zeichen).
- Kredite & Entitlements
  - Besitzer bestimmen (`user`/`guest`); Benutzer: Kreditstand (tenths) via `getCreditsBalanceTenths`, fallback auf planbasierte Monatsquote ([getVideoEntitlementsFor](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/config/ai-video/entitlements.ts:18:0-25:1), `consumeVideoMonthlyQuotaTenths`).
  - Fehlende Credits/Quote → `createApiError('validation_error', 'insufficient_credits' | 'insufficient_quota')`.
  - Aufladungen/Konsum idempotent je Job (`consumeCreditsTenths` mit Job-ID).
- Job-Polling & Ergebnisse
  - Metadaten (`ai-video:job:<id>`) in KV speichern (ownerType, ownerId, tier, key, createdAt).
  - `GET /api/ai-video/jobs/:id` validiert Eigentum (Session vs. `guest_id`); fremde Jobs → `forbidden`.
  - Erfolgreiche Jobs laden Provider-Output, speichern unter `ai-video/results/...` (14 Tage), geben signalisierende URL über `/r2-ai/` zurück.

## Sollte

- Structured Logging der Provider-Responses (redacted) und KV-Charge-Pfade zur Nachvollziehbarkeit.
- UI soll Gebühren (Credits/Quota) und Fortschritt transparent anzeigen; Polling-Intervalle adaptiv an `Retry-After` anpassen.
- Quoten-/Kreditwerte in Docs und OpenAPI synchron halten (TIER_CREDITS, Monatskontingente).

## Nicht

- Keine Provider- oder R2-Credentials im Client speichern.
- Keine Videos außerhalb geprüfter Formate/Limits akzeptieren; keine dauerhafte Speicherung über definierte Retention hinaus.

## Checkliste

- [ ] Upload validiert MIME, Größe, Dauer und schreibt nach `ai-video/uploads`.
- [ ] Rate-Limit `aiJobsLimiter` liefert `Retry-After`.
- [ ] Provider-Fehler korrekt gemappt; `REPLICATE_API_TOKEN` Pflicht.
- [ ] Kredit-/Quota-Pfade idempotent; Fehlermeldungen nutzen `insufficient_*` Shapes.
- [ ] Job-Polling prüft Eigentum, speichert Ergebnisse in `ai-video/results` mit 14-Tage-Retention.

## Code-Anker

- `src/pages/api/ai-video/upload.ts`
- `src/pages/api/ai-video/generate.ts`
- `src/pages/api/ai-video/jobs/[id].ts`
- `src/config/ai-video.ts`, [src/config/ai-video/entitlements.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/config/ai-video/entitlements.ts:0:0-0:0)
- `src/lib/validation/schemas/ai-video.ts`
- `src/lib/kv/usage.ts`
- `src/components/tools/video-enhancer/VideoEnhancerIsland.tsx`

## CI/Gates

- `npm run test:integration` (AI Video Upload/Generate/Poll)
- `npm run openapi:validate`
- `npm run lint`

## Referenzen

- Global Rules; API & Security Rules; Zod↔OpenAPI.
- [.windsurf/rules/image-enhancer.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/image-enhancer.md:0:0-0:0), [.windsurf/rules/transcriptor.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/transcriptor.md:0:0-0:0)

## Changelog

- 2025-11-05: Erstfassung für Video-Upscaling (Upload, Provider, Quoten, Ownership).