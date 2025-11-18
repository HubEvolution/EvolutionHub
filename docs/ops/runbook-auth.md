---
description: Runbook für Auth (Magic Request, Callbacks, Observability, Limits, Cookies)
owner: Auth Team
priority: high
lastSync: '2025-11-16'
codeRefs: 'src/pages/api/auth/**, src/lib/api-middleware.ts, src/lib/stytch.ts, src/middleware.ts, openapi.yaml'
testRefs: 'tests/integration/magic-link.test.ts, tests/e2e/specs/auth-deprecated.spec.ts'
---

# Runbook – Auth (Magic Link & OAuth)

## Zweck

Betriebshandbuch für Auth in Production/Staging/Testing: Secrets/Flags, Limits, Observability, Cookies, Troubleshooting, Validierung.

## Environments & Secrets

- Pflicht (per Wrangler je Env setzen):
  - `AUTH_PROVIDER=stytch`
  - `STYTCH_PROJECT_ID`, `STYTCH_SECRET`
  - `STYTCH_PUBLIC_TOKEN` (OAuth Start)
- Optional:
  - `STYTCH_CUSTOM_DOMAIN` (z. B. login.example.com)
  - `STYTCH_PKCE` = `"0"|"1"` (Standard: off in Prod)
  - `TURNSTILE_SECRET_KEY` (+ Client: `PUBLIC_TURNSTILE_SITE_KEY`)
- Hinweise:
  - Redirect‑Whitelist in Stytch Live: `https://<domain>/api/auth/callback`
  - Cookies: `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/)

### Environment matrix (Auth, DB, Stripe)

| Env        | ENVIRONMENT | Base URL                        | D1 DB name               | Stripe mode | Notes                                   |
| ---------- | ----------- | -------------------------------- | ------------------------ | ----------- | --------------------------------------- |
| Local dev  | development | http://127.0.0.1:8787            | evolution-hub-main-dev   | test        | `STYTCH_BYPASS=1`, debug-login allowed  |
| Testing    | testing     | https://ci.hub-evolution.com     | evolution-hub-main-local | test        | CI/e2e target; no debug-login endpoint |
| Staging    | staging     | https://staging.hub-evolution.com| evolution-hub-main-local | test        | Near-prod; manual QA, no backdoors     |
| Production | production  | https://hub-evolution.com        | evolution-hub-main       | live        | Real users & billing                    |

## Middleware & Sicherheit

- `withApiMiddleware` (JSON‑APIs), `withRedirectMiddleware` (Redirect‑Flows)
- Unsafe Methods: Same‑Origin + Double‑Submit CSRF (`X-CSRF-Token` == Cookie `csrf_token`)
- Security‑Header: HSTS, XFO=DENY, XCTO=nosniff, Referrer‑Policy=strict‑origin‑when‑cross‑origin, Permissions‑Policy minimal

## Magic Request (POST /api/auth/magic/request)

- Body: `email`, optional `r`, `name`, `username`, `locale`, `cf-turnstile-response`
- Turnstile aktiv, wenn `TURNSTILE_SECRET_KEY` gesetzt
- PKCE optional (`STYTCH_PKCE=1`): setzt `pkce_verifier` (HttpOnly, TTL 10min), Callback benötigt Verifier
- Progressive Enhancement: Form‑POST → 303 auf `/[en|de]/login?success=magic_sent`

### Limits (zusätzlich zu `authLimiter`)

- pro E‑Mail: 5/min und 50/Tag
- pro IP: 10/min
- Überschreitung → `429` + `Retry-After: 60`

### Observability

- Antwortheader: `X-Stytch-Request-Id` (auch bei 303‑Redirect) für Korrelation mit Stytch (`request_id`).
- Metriken via `logMetricCounter`:
  - `auth_magic_request_success` / `auth_magic_request_error` mit `source: "magic_request"`.
  - `turnstile_verify_success` / `turnstile_verify_failed` / `turnstile_verify_unavailable` mit `source: "magic_request"`.
- Providerfehler werden als strukturierte Logs mit `status`, `providerType` und `requestId` geschrieben (keine E‑Mail/PII).
- API-Fehler-Response-Typen: `validation_error | forbidden | rate_limit | server_error` (siehe OpenAPI).

## Cookies (Überblick)

- `__Host-session`: Session (HttpOnly, Secure, Strict, Path=/)
- `post_auth_redirect`: gewünschte Ziel‑URL (10min, HttpOnly)
- `post_auth_profile`: `name`/`username` (10min, HttpOnly)
- `post_auth_locale`: `en|de` (10min, HttpOnly)
- `post_auth_referral`: Referral‑Code (10min, HttpOnly)
- `pkce_verifier`: (10min, HttpOnly) – nur wenn PKCE aktiv

## Legacy 410‑Stubs

- 410: `login`, `logout`, `change-password`, `forgot-password`, `reset-password`, `register`, `verify-email`
- Unsichere Methoden via `withRedirectMiddleware` gehärtet
- Hinweis: Cloudflare kann Cross‑Site‑POSTs bereits mit `403` blocken, bevor der Request den 410‑Stub erreicht; `410` ist die kanonische App‑Antwort, sobald der Worker greift.

## Troubleshooting

- 403 bei Magic Request:
  - Prüfe Same‑Origin/CSRF (Header und Cookie)
  - Prüfe Turnstile‑Token + Secret
- 429 bei Magic Request:
  - Prüfe Email/IP Limits, `Retry-After`
- Kein `X-Stytch-Request-Id`:
  - Prüfe Provider‑Erreichbarkeit oder Fake‑Mode

## Validierung (befehle)

```bash
npm run openapi:validate
npm run test:integration
npm run test:e2e:v1 -- tests/e2e/specs/auth-deprecated.spec.ts
```

## Referenzen

- Code: `src/pages/api/auth/**`, `src/lib/api-middleware.ts`, `src/lib/stytch.ts`
- OpenAPI: `openapi.yaml`
- Tests: Integration + E2E (siehe testRefs)
