---
trigger: always_on
scope: cross-cutting
extends:
  - api-and-security.md
  - tooling-and-style.md
  - testing-and-ci.md
  - infra.md
priority: high
---

# Observability Rules

## Zweck

Einheitliche, sichere Observability über Logs, Korrelation (Request IDs), minimale Telemetrie/Metriken und Debug‑Flows – ohne PII/Secrets in Logs und ohne “Log-Spam” in Hot‑Paths.

## Muss

- Korrelation / Request IDs
  - Jede Request‑Verarbeitung erhält eine **Request ID** und führt sie in Logs mit:
    - `src/server/utils/logger.ts` → `generateRequestId()`
    - `src/middleware.ts` erzeugt `requestId` pro Request und loggt Start/Ende.
  - Für Auth‑Flows gilt zusätzlich die bestehende Observability‑Regel:
    - Auth‑Endpoints setzen `X-Stytch-Request-Id` (Korrelation/Debuggability).

- Logging‑API (Server)
  - Server‑seitiges Logging läuft über das zentrale Logging‑System:
    - `src/config/logging.ts` (Log‑Level, Sanitization, Transports)
    - `src/server/utils/logger-factory.ts` (Factory, Security Logger)
    - `src/lib/services/logger-utils.ts` (`logWithFallback`, kein Logging‑Crash)
  - Logging darf **niemals** den Request fehlschlagen lassen (Logging‑Fehler werden geschluckt / Fallback).

- Redaction / PII‑Schutz
  - Keine Secrets/PII in Logs.
  - Sensible Keys müssen redacted werden (z. B. `password`, `token`, `secret`, `apiKey`, `authorization`):
    - `src/config/logging.ts` → `LOG_CONFIG.filters.sensitiveKeys`
    - `LogUtils.sanitizeObject()` ist der Standard, wenn Details/Objects geloggt werden.
  - HTTP Header Logging nur in redacted Form:
    - `src/middleware.ts` → `sanitizeHeaders()` redacted `cookie`, `authorization`, `set-cookie` und anonymisiert IPs.

- Logging‑Volumen / Hot‑Path
  - Keine ungefilterten Payload‑Dumps (Request Body, große Provider‑Responses, Audio/Video Daten).
  - Strings werden begrenzt (siehe `maxStringLength`), Objekt‑Tiefe begrenzt (`maxObjectDepth`).
  - Debug‑/Info‑Logs in Hot‑Paths nur, wenn sie:
    - klaren Nutzen haben (Korrelation, Fehleranalyse) und
    - nicht personenbezogen sind und
    - in Production nicht “flooden” (Default Log‑Level in Production ist restriktiver).

- Debug Panel / Client Logs
  - Client‑Logs dürfen nur über den dedizierten Endpoint laufen und müssen env‑gegated sein:
    - `src/pages/api/debug/client-log.ts` ist nur aktiv, wenn `PUBLIC_ENABLE_DEBUG_PANEL === 'true'`.
    - Client Logger: `src/lib/client-logger.ts` sendet nur, wenn `PUBLIC_ENABLE_DEBUG_PANEL === 'true'`.
  - Client‑Logs müssen minimal bleiben (keine PII, keine Tokens, keine kompletten HTML/DOM Dumps).

- Security Events
  - Security‑relevante Ereignisse sollen über den Security Logger laufen:
    - `src/lib/security-logger.ts`
  - Event‑Details sind vor Logging zu sanitizen/redacten (Factory macht das via `LogUtils.sanitizeObject`).

## Sollte

- Konsistente Event‑Shapes
  - Für Security/Metrics Events einheitliche Felder verwenden (wo möglich):
    - `securityEventType`, `requestId`, `userId` (nur ID), `resource/endpoint`, `timestamp`
  - Bei API‑Errors: logge nur notwendige Debug‑Informationen (keine Request‑Bodies, keine Cookies).

- “Observability by Design” bei neuen APIs
  - Für neue API‑Handler gilt:
    - Middleware über `withApiMiddleware`/`withAuthApiMiddleware` (Rate‑Limits + Security Headers + strukturierte Fehler).
    - Validierung via Zod + `formatZodError`.
    - Logs nur mit redacted Kontext (z. B. `requestId`, `endpoint`, `userId`).

- Debug‑Gating & Rate‑Limits
  - Debug‑Endpoints (z. B. Client‑Logs) sollten rate‑limited sein und nur gezielt in Dev/Staging genutzt werden.
  - Debug Panel bleibt via `PUBLIC_ENABLE_DEBUG_PANEL` deaktiviert, außer explizit aktiviert.

- Metriken (leichtgewichtig)
  - Metriken sollen sparsam und aggregierbar sein (z. B. “counts/latency buckets”), keine High‑Cardinality Labels (keine E‑Mails, keine freien Texte).
  - Wenn “Metrics API” existiert/ausgebaut wird: klare Ownership und Caching‑Strategie, keine PII.

## Nicht

- Keine Secrets/PII in Logs:
  - Keine Cookies, keine Authorization Header, keine Token/Secrets.
  - Keine vollständigen Provider‑Payloads (Stripe/Replicate/AI) ohne harte Redaction und Längenbegrenzung.
- Kein Client‑Side Logging ohne env‑Gating (`PUBLIC_ENABLE_DEBUG_PANEL`) und ohne dedizierten Endpoint.
- Keine ungefilterten Stacktraces/Request Bodies in Production Logs, wenn sie sensitive Daten enthalten könnten.

## Checkliste

- [ ] Logs enthalten `requestId` (oder sind anderweitig sauber korrelierbar).
- [ ] Log‑Kontext ist redacted (`LogUtils.sanitizeObject`) und enthält keine Secrets/PII.
- [ ] Header werden nur via `sanitizeHeaders()` geloggt (Cookies/Auth redacted).
- [ ] Debug Panel / Client Logs sind env‑gegated (`PUBLIC_ENABLE_DEBUG_PANEL`).
- [ ] Security Events laufen über `src/lib/security-logger.ts`.
- [ ] Neue APIs nutzen Middleware + Zod‑Validation; Fehler sind im einheitlichen Schema.

## Code‑Anker

- Logging Config: `src/config/logging.ts`
- Logger Factory: `src/server/utils/logger-factory.ts`
- Logger (Request IDs, SSE Buffer): `src/server/utils/logger.ts`
- Logger Helpers: `src/lib/services/logger-utils.ts`
- Security Logger: `src/lib/security-logger.ts`
- Client Logger: `src/lib/client-logger.ts`
- Client Log Endpoint: `src/pages/api/debug/client-log.ts`
- Middleware (Request logging + header redaction): `src/middleware.ts`

## CI/Gates

- `npm run lint`
- `npm run test`
- Bei Änderungen an API/Debug Endpoints zusätzlich:
  - `npm run test:integration`

## Referenzen

- [.windsurf/rules/api-and-security.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/api-and-security.md:0:0-0:0)
- [.windsurf/rules/auth.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/auth.md:0:0-0:0) (X‑Stytch‑Request‑Id, Auth Observability)
- [.windsurf/rules/testing-and-ci.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/testing-and-ci.md:0:0-0:0)
- [.windsurf/rules/tooling-and-style.md](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.windsurf/rules/tooling-and-style.md:0:0-0:0)

## Changelog

- 2025-12-16: Erstfassung Observability (Request ID, Redaction, Debug Panel Client Logs, Security Events).
