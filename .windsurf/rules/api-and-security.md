# API & Security Rules

## Zweck

Kurze, durchsetzbare Baseline für API‑Middleware, Sicherheitsheader, CSRF/Origin und JSON‑Fehlerformen.

## Muss

- Wrap Astro API‑Handler mit `withApiMiddleware` oder `withAuthApiMiddleware` aus `src/lib/api-middleware.ts`.
- Erfolgs-/Fehlerrückgaben einheitlich:
  - Erfolg: `createApiSuccess(data)`.
  - Fehler: `createApiError({ type, message, details? })`.
- 405 nur über `createMethodNotAllowed('GET, POST')` (setzt `Allow`).
- Unsafe Methods (POST/PUT/PATCH/DELETE): Same‑Origin Pflicht; bei sensiblen Endpunkten Double‑Submit CSRF aktivieren (`enforceCsrfToken: true`, Header `X-CSRF-Token` == Cookie `csrf_token`).
- Sicherheitsheader auf API‑Responses:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - Hinweis: CSP wird in `src/middleware.ts` gesetzt (HTML). API‑JSON benötigt keine CSP.
- `/r2-ai/**` bleibt öffentlich und ungated.
- Allowed‑Origin Allowlist per Env zusätzlich zur Request‑Origin zulässig: `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, `PUBLIC_APP_ORIGIN` (Komma‑separiert).

## Sollte

- Unauthorized (401) im einheitlichen Schema: `createApiError('auth_error', 'Unauthorized')`.
- `withRedirectMiddleware` für Redirect‑Flows (z. B. OAuth Callback) nutzen, um Rate‑Limit + CSRF ohne JSON‑Zwang anzuwenden.
- Legacy: `X-XSS-Protection` wird von modernen Browsern ignoriert – nur dokumentarisch erwähnen, nicht erforderlich.

## Nicht

- Keine manuellen 405‑Antworten ohne Helper.
- Keine manuellen if/else‑Validierungen statt Zod.

## Request‑Validierung (Zod)

- Eingaben (Body/Query/Params) mit Zod validieren: `const parsed = schema.safeParse(input)`.
- Bei Fehler: `createApiError('validation_error', 'Invalid request', { details: formatZodError(parsed.error) })`.
- Handler stets mit `APIContext` typisieren; keine impliziten `any`.

## Observability

- Client‑Logs: `/api/debug/client-log` (redacted, rate‑limited). Debug Panel via `PUBLIC_ENABLE_DEBUG_PANEL`.
- Auth‑Callbacks (Magic Link/OAuth) setzen `X-Stytch-Request-Id` in Responses.

## Code‑Anker

- `src/lib/api-middleware.ts`
- `src/middleware.ts`
- `src/lib/validation/**`
- `src/pages/r2-ai/**`

## CI/Gates

- `npm run openapi:validate`
- `npm run test:integration` (API)
- `npm run lint`

## Changelog

- 2025‑10‑31: Ausrichtung an aktueller Middleware, Headern, CSRF/Origin, JSON‑Shapes.
