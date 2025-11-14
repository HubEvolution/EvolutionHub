---
description: Konsolidierte Routen-Übersicht mit Auth-Schwerpunkt (Magic Request, 410-Stubs)
owner: Auth Team
priority: high
lastSync: '2025-11-13'
codeRefs: 'src/pages/api/auth/**, src/lib/api-middleware.ts, src/lib/stytch.ts, openapi.yaml'
testRefs: 'tests/integration/magic-link.test.ts, tests/e2e/specs/auth-deprecated.spec.ts'
---

# API Routes — Auth (Kanonisch + Legacy)

Diese Seite fasst die Auth-relevanten Routen zusammen, inklusive Sicherheitsanforderungen, Rate‑Limits und Observability.

## POST /api/auth/magic/request

- **Zweck**: Magic‑Link anfordern (Stytch).
- **Security**
  - Same‑Origin Pflicht für POST.
  - Double‑Submit CSRF: Header `X-CSRF-Token` muss Cookie `csrf_token` entsprechen.
  - Sicherheits‑Header werden zentral gesetzt (HSTS, X‑Frame‑Options, X‑Content‑Type‑Options, Referrer‑Policy, Permissions‑Policy).
- **Rate‑Limits (service‑level, zusätzlich zum globalen `authLimiter`)**
  - pro E‑Mail: 5/min und 50/Tag
  - pro IP: 10/min
  - Überschreitung → `429` mit Header `Retry-After: 60`
- **Observability**
  - Antwort setzt `X-Stytch-Request-Id` (JSON und 303‑Redirect), zur Korrelation mit Provider.
- **Request**
  - Header: `X-CSRF-Token`
  - Body (JSON|Form): `{ email, r?, name?, username?, locale?, cf-turnstile-response? }`
- **Responses (Auszug)**
  - 200 JSON: `{ success: true, data: { sent: true } }`
  - 303 Redirect (Form‑POST): Location `/[en|de]/login?success=magic_sent`
  - 400 `validation_error` (z. B. ungültige E‑Mail)
  - 403 `forbidden` (CSRF/Origin/Turnstile)
  - 429 `rate_limit` mit `Retry-After`
- **Turnstile**
  - Wenn `TURNSTILE_SECRET_KEY` gesetzt ist, ist ein Token erforderlich (`cf-turnstile-response`).
- **PKCE (optional via `STYTCH_PKCE`)**
  - Setzt `pkce_verifier` (HttpOnly, TTL 10min); Callback muss Verifier liefern.
- **OpenAPI**
  - Siehe `openapi.yaml` → `/api/auth/magic/request`.

### Beispiele

```bash
curl -X POST \
  -H 'Origin: http://127.0.0.1:8787' \
  -H 'Content-Type: application/json' \
  -H 'X-CSRF-Token: 0123456789abcdef' \
  --cookie 'csrf_token=0123456789abcdef' \
  -d '{"email":"user@example.com","r":"/dashboard","locale":"en"}' \
  http://127.0.0.1:8787/api/auth/magic/request -i
```

Erwartete Header (Auszug): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, ggf. `X-Stytch-Request-Id`.

## GET /api/auth/callback

- **Zweck**: Verarbeitung des Magic‑Links, Setzen von Session‑Cookies, Redirect zum Ziel.
- **Observability**: setzt `X-Stytch-Request-Id`.

## Legacy 410‑Stubs (entfernt)

Die folgenden Endpunkte sind deprecates und liefern `410 Gone`. Unsichere Methoden sind via `withRedirectMiddleware` gegen CSRF/Same‑Origin gehärtet.

- `POST /api/auth/login` → 410
- `GET|POST /api/auth/logout` → 410
- `POST /api/auth/change-password` → 410
- `POST /api/auth/forgot-password` → 410
- `POST /api/auth/reset-password` → 410
- `POST /api/auth/register` → 410
- `GET /api/auth/verify-email` → 410

Siehe auch OpenAPI `openapi.yaml` (Paths dokumentiert).

## Code‑/Test‑Anker

- Handler/Middleware: `src/lib/api-middleware.ts`
- Magic Request: `src/pages/api/auth/magic/request.ts`
- Callback: `src/pages/api/auth/callback.ts`
- Provider: `src/lib/stytch.ts`
- Tests: `tests/integration/magic-link.test.ts`, `tests/e2e/specs/auth-deprecated.spec.ts`
