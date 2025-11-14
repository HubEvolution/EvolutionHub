---
description: Chronologische Änderungen an der öffentlichen API (Auth‑Schwerpunkt)
owner: Auth Team
priority: high
lastSync: '2025-11-13'
codeRefs: 'openapi.yaml, src/pages/api/auth/**, src/lib/api-middleware.ts'
testRefs: 'tests/integration/magic-link.test.ts, tests/e2e/specs/auth-deprecated.spec.ts'
---

# API Changelog

## 2025-11-13 — Auth Production Readiness

- **Magic Request (POST /api/auth/magic/request)**
  - CSRF (Double‑Submit, `X-CSRF-Token`) und Same‑Origin für POST
  - Service‑Level Rate‑Limits zusätzlich zum globalen Limiter:
    - pro E‑Mail: 5/min und 50/Tag
    - pro IP: 10/min
    - Überschreitung → `429` mit `Retry-After: 60`
  - Observability: `X-Stytch-Request-Id` auf JSON‑Antworten und 303‑Redirects
  - OpenAPI aktualisiert (Headers, 429, Request/Response)
  - Doku: siehe ../api/routes.md und ../ops/runbook-auth.md

- **Legacy 410‑Stubs gehärtet**
  - Endpunkte (410 Gone): `login`, `logout`, `change-password`, `forgot-password`, `reset-password`, `register`, `verify-email`
  - Unsichere Methoden (POST/PUT/PATCH/DELETE) über `withRedirectMiddleware` mit Same‑Origin/CSRF abgesichert
  - OpenAPI ergänzt (Paths, 410‑Responses)

- **Tests**
  - Integration: `tests/integration/magic-link.test.ts` (429 + Retry‑After, 405/Allow, CSRF)
  - E2E Smoke: `tests/e2e/specs/auth-deprecated.spec.ts` (410 + Security‑Header)

- **Regeln/Guides**
  - API & Security und Auth & OAuth: Observability erweitert (Magic Request setzt `X-Stytch-Request-Id`)

## Vorherige Einträge

- N/A
