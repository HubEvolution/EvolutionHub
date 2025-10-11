---
trigger: always_on
priority: 100
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
