---
trigger: always_on
---

# API & Security Rules

## Zweck

Kurze, durchsetzbare Baseline für API‑Middleware, Sicherheitsheader, CSRF/Origin und JSON‑Fehlerformen.

## Muss

- Wrap Astro API‑Handler mit [withApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:348:0-473:1) oder [withAuthApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:475:0-510:1) aus [src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0).
- Erfolgs-/Fehlerrückgaben einheitlich:
  - Erfolg: [createApiSuccess(data)](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:331:0-346:1).
  - Fehler: [createApiError({ type, message, details? })](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:303:0-329:1).
- 405 nur über [createMethodNotAllowed('GET, POST')](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:60:0-82:1) (setzt `Allow`).
- Unsafe Methods (POST/PUT/PATCH/DELETE): Same‑Origin Pflicht; bei sensiblen Endpunkten Double‑Submit CSRF aktivieren (`enforceCsrfToken: true`, Header `X-CSRF-Token` == Cookie `csrf_token`).
- Sicherheitsheader auf API‑Responses:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
  - Hinweis: CSP wird in [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0) gesetzt (HTML). API‑JSON benötigt keine CSP.
- `/r2-ai/**` bleibt öffentlich und ungated.
- Allowed‑Origin Allowlist per Env zusätzlich zur Request‑Origin zulässig: `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN` (Komma‑separiert).

## Sollte

- Unauthorized (401) im einheitlichen Schema: [createApiError('auth_error', 'Unauthorized')](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:303:0-329:1).
- [withRedirectMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:512:0-565:1) für Redirect‑Flows (z. B. OAuth Callback) nutzen, um Rate‑Limit + CSRF ohne JSON‑Zwang anzuwenden.
- Legacy: `X-XSS-Protection` wird von modernen Browsern ignoriert – nur dokumentarisch erwähnen, nicht erforderlich.

## Nicht

- Keine manuellen 405‑Antworten ohne Helper.
- Keine manuellen if/else‑Validierungen statt Zod.

## Request‑Validierung (Zod)

- Eingaben (Body/Query/Params) mit Zod validieren: `const parsed = schema.safeParse(input)`.
- Bei Fehler: [createApiError('validation_error', 'Invalid request', { details: formatZodError(parsed.error) })](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:303:0-329:1).
- Handler stets mit `APIContext` typisieren; keine impliziten `any`.

## Observability

- Client‑Logs: `/api/debug/client-log` (redacted, rate‑limited). Debug Panel via `PUBLIC_ENABLE_DEBUG_PANEL`.
- Auth‑Callbacks (Magic Link/OAuth) setzen `X-Stytch-Request-Id` in Responses.

## Code‑Anker

- [src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0)
- [src/middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/middleware.ts:0:0-0:0)
- `src/lib/validation/**`
- `src/pages/r2-ai/**`

## CI/Gates

- `npm run openapi:validate`
- `npm run test:integration` (API)
- `npm run lint`

## Referenzen

- Cookies & Consent Rules — `.windsurf/rules/cookies-and-consent.md` (Consent‑Quelle, Event‑Bridge, Analytics‑Gating/Cleanup)

## Changelog

- 2025‑11‑03: Verweis auf Cookies & Consent Rules ergänzt.
- 2025‑10‑31: Ausrichtung an aktueller Middleware, Headern, CSRF/Origin, JSON‑Shapes.