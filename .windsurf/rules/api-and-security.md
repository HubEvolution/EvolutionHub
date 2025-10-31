---
trigger: always_on
---

# API & Security Rules

- Wrap Astro API handlers with `withApiMiddleware`/`withAuthApiMiddleware` from `src/lib/api-middleware.ts` to inherit security headers, logging, and default `apiRateLimiter` (30 req/min) unless a different preset from `src/lib/rate-limiter.ts` is required.
- Return JSON via `createApiSuccess({ data })` for success and `createApiError({ type, message, details? })` for errors to keep response shapes consistent (`src/lib/api-middleware.ts`).
- Always supply 405 responses through `createMethodNotAllowed` so the `Allow` header is set (`src/lib/api-middleware.ts`).
- Unsafe methods (POST/PUT/PATCH/DELETE) must satisfy same-origin checks; enable double-submit validation by passing `enforceCsrfToken: true` when endpoints rely on the `csrf_token` cookie (`src/lib/api-middleware.ts`, `src/lib/security/csrf.ts`).

- Allowed origin env variables: same-origin checks accept allowlists from `ALLOWED_ORIGINS`, `ALLOW_ORIGINS`, `APP_ORIGIN`, or `PUBLIC_APP_ORIGIN` (comma-separated), in addition to the request origin and any `allowedOrigins` passed to middleware (`src/lib/api-middleware.ts:120-151`).
- Keep `/r2-ai/**` routes publicly accessible and exempt from overlays or auth, per middleware safeguards (`src/middleware.ts`).
- Preserve security headers established by middleware and API helpers (HSTS preload, X-Frame-Options DENY, Permissions-Policy camera/microphone/geolocation empty) (`src/lib/api-middleware.ts`).

- Redirect endpoints should use `withRedirectMiddleware` to apply rate limiting, CSRF/Origin checks, and security headers without forcing JSON shapes (e.g., OAuth callback handlers) (`src/lib/api-middleware.ts:505-558`, example import in `src/pages/api/auth/oauth/[provider]/callback.ts`).
- Observability: client logs are batched to `src/pages/api/debug/client-log.ts` (headers redacted, rate-limited). Enable the Debug Panel via `PUBLIC_ENABLE_DEBUG_PANEL`; see `src/components/ui/DebugPanel.tsx`.
- AI Image Enhancer entitlements: server enforces plan-based quotas; UI reflects `allowedScales`/`canUseFaceEnhance`. Plans propagate via Stripe webhook; guests have separate KV-based limits.
- Observability: auth callbacks include `X-Stytch-Request-Id` in responses. Capture/log this ID for provider support.
- PKCE cookie: `pkce_verifier` is HttpOnly, SameSite=Lax, TTL 10 minutes; created by `POST /api/auth/magic/request` when `STYTCH_PKCE` is enabled and deleted by `GET /api/auth/callback` after use.

## Request-Validierung (Zod) — Verbindlich

- Alle Astro API-Handler müssen Request-Daten (Body/Query/Params) mit Zod validieren.
- Validierung: `const parsed = schema.safeParse(input)`. Bei Fehler:
  - Antwort über `createApiError('validation_error', 'Invalid request', { details: formatZodError(parsed.error) })`.
  - Keine manuellen if/else-Checks anstelle von Zod.

## Handler-Typisierung & Middleware

- Handler mit `APIContext` typisieren; keine impliziten `any`.
- API-Routen weiterhin über `withApiMiddleware` oder `withAuthApiMiddleware` (Rate-Limits, Security-Header, Same-Origin/CSRF).
- 405 nur über `createMethodNotAllowed` (setzt Allow-Header).

## OpenAPI-Kopplung (Hybrid)

- Jede Schema-Änderung in Zod muss in [openapi.yaml](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/openapi.yaml:0:0-0:0) gespiegelt werden.
- Einfache JSON-Requests: können mit Zod→OpenAPI-Pilot verifiziert werden (siehe zod-openapi.md).
- Komplexe Endpunkte (Multipart, Header inkl. CSRF, SSRF-Hinweise): bleiben manuell kuratiert.
- Für strikte Objekte (`z.object().strict()`): in OpenAPI `additionalProperties: false` setzen.

## Fehlerschapes (Konsistenz)

- Erfolg: `createApiSuccess({ data })`.
- Fehler: `createApiError({ type, message, details? })`; Typen z. B. `validation_error | forbidden | server_error`.