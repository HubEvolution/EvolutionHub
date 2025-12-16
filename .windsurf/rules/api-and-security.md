---
trigger: always_on
---

# API & Security Rules

## Zweck

Kurze, durchsetzbare Baseline für API‑Middleware, Sicherheitsheader, CSRF/Origin und JSON‑Fehlerformen.

## Muss

- Wrap Astro API‑Handler mit [withApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:347:0-476:1) oder [withAuthApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:478:0-513:1) aus [src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0).
- Erfolgs-/Fehlerrückgaben einheitlich:
  - Erfolg: [createApiSuccess(data)](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:330:0-345:1).
  - Fehler: [createApiError({ type, message, details? })](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:302:0-328:1).
- 405 nur über [createMethodNotAllowed('GET, POST')](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:59:0-81:1) (setzt `Allow`).
- Unsafe Methods (POST/PUT/PATCH/DELETE): Same‑Origin Pflicht; bei sensiblen Endpunkten Double‑Submit CSRF (`X-CSRF-Token` == Cookie `csrf_token`).
- Sicherheitsheader auf API‑Responses:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
  - Hinweis: CSP wird in `src/middleware.ts` gesetzt (HTML). API‑JSON benötigt keine CSP.
- `/r2-ai/**` bleibt öffentlich erreichbar. `uploads/*` ist öffentlich (Provider‑Fetch). `results/<ownerType>/<ownerId>/*` ist nur für den jeweiligen Besitzer zugänglich (Owner‑Gating via Session bzw. `guest_id`). Cache‑Hinweis: `private, max-age=31536000, immutable` für results; `public, max-age=900, immutable` für uploads.
- Allowed‑Origin Allowlist per Env zusätzlich zur Request‑Origin zulässig: `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN` (Komma‑separiert).

## Sollte

- Unauthorized (401) im einheitlichen Schema: [createApiError('auth_error', 'Unauthorized')](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:302:0-328:1).
- [withRedirectMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:515:0-568:1) für Redirect‑Flows (z. B. OAuth Callback) nutzen, um Rate‑Limit + CSRF ohne JSON‑Zwang anzuwenden.
- Legacy: `X-XSS-Protection` wird von modernen Browsern ignoriert – nur dokumentarisch erwähnen, nicht erforderlich.

## Nicht

- Keine manuellen 405‑Antworten ohne Helper.
- Keine manuellen if/else‑Validierungen statt Zod.

## Request‑Validierung (Zod)

- Eingaben (Body/Query/Params) mit Zod validieren: `const parsed = schema.safeParse(input)`.
- Bei Fehler: [createApiError('validation_error', 'Invalid request', { details: formatZodError(parsed.error) })](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:302:0-328:1).
- Handler stets mit `APIContext` typisieren; keine impliziten `any`.
  - Kontextuelle Typisierung über [withApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:347:0-476:1)/[withAuthApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:478:0-513:1) ist zulässig; explizite `APIContext`‑Annotation wird empfohlen.

## Typisierung (Lint‑Durchsetzung)

- `@typescript-eslint/no-explicit-any`:
  - `src/**/*.{ts,tsx}`: error (verpflichtend gemäß Projektstandard)
  - `src/**/*.astro` und `tests/**`: warn (schrittweiser Rollout)
  - `.d.ts`‑Shims/Decls: ausgenommen

## Observability

- Client‑Logs: `/api/debug/client-log` (redacted, rate‑limited). Debug Panel via `PUBLIC_ENABLE_DEBUG_PANEL`.
- Auth‑Endpoints (Magic Request und Callbacks (Magic Link/OAuth)) setzen `X-Stytch-Request-Id` in Responses (zur Korrelation). Beim Magic‑Request sowohl auf JSON‑Antworten als auch auf Redirect‑Antworten.

## Code‑Anker

- [src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0)
- `src/middleware.ts`
- `src/lib/validation/**`
- `src/pages/r2-ai/**`

## CI/Gates

- `npm run openapi:validate`
- `npm run test:integration` (API)
- `npm run lint`

## Referenzen

- Cookies & Consent Rules — `.windsurf/rules/cookies-and-consent.md`

## Changelog

- 2025‑11‑13: Observability präzisiert: Magic‑Request setzt `X‑Stytch‑Request‑Id` (JSON + Redirect).
- 2025‑11‑13: Klarstellung R2‑AI: Route öffentlich erreichbar; `uploads/*` öffentlich; `results/<ownerType>/<ownerId>/*` owner‑gegated; Cache‑Hinweise ergänzt.
- 2025‑11‑03: Verweis auf Cookies & Consent Rules ergänzt.
- 2025‑10‑31: Ausrichtung an aktueller Middleware, Headern, CSRF/Origin, JSON‑Shapes.
