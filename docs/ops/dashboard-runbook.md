---
description: 'Runbook — Dashboard System (Billing, Credits, Avatars, Newsletter)'
owner: 'Operations Team'
priority: 'high'
lastSync: '2025-11-13'
codeRefs: 'src/pages/api/dashboard/*, src/pages/api/billing/*, src/pages/api/user/avatar.ts, src/pages/api/newsletter/*, src/pages/r2-ai/*, wrangler.toml'
testRefs: 'tests/integration/api/**/*, tests/integration/user-avatar-api.test.ts, tests/integration/newsletter-api.test.ts'
---

# Runbook — Dashboard System

- **Scope**
  - Dashboard APIs: billing-summary, referral-summary, billing/credits, billing/sync, user/avatar, newsletter.
  - Infra: R2 buckets (avatars, ai images), KV namespaces, DB, public `/r2-ai/**` routes.

## Preflight (per environment)

- **Bindings**
  - R2: `R2_AVATARS`, `R2_AI_IMAGES` present in `wrangler.toml`.
  - KV: `KV_AI_ENHANCER`, `SESSION` present.
  - D1: `DB` present; migrations applied.
- **Stripe**
  - Secrets present: `STRIPE_SECRET`.
  - Pricing maps:
    - Subscriptions: `PRICING_TABLE`, `PRICING_TABLE_ANNUAL`.
    - Credits: `CREDITS_PRICING_TABLE` (pack→priceId).
- **Public routes**
  - `/r2-ai/**` publicly reachable.
  - Policy: `uploads/*` public; `results/<ownerType>/<ownerId>/*` owner‑gated.

## Security requirements

- **Middleware**: all API routes via `withApiMiddleware`/`withAuthApiMiddleware`.
- **Unsafe methods**: Same‑Origin enforced; Double‑Submit CSRF (`X-CSRF-Token` == cookie `csrf_token`).
- **Headers**: HSTS preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict‑origin‑when‑cross‑origin, minimal Permissions‑Policy.
- **429**: Include `Retry-After`.

## Operational flows

- **Credits checkout** (`POST /api/billing/credits`)
  - Validates JSON body, maps `pack` via `CREDITS_PRICING_TABLE`.
  - On missing secret → `server_error: stripe_not_configured`.
  - Success returns `{ url }` to Stripe Checkout.

- **Subscription sync** (`GET /api/billing/sync`)
  - Requires auth.
  - Without secret → redirect `?billing=stripe_not_configured`.
  - Without `session_id` → redirect `?billing=missing_session`.
  - On provider error → redirect `?billing=sync_error`.
  - Upserts `stripe_customers`/`subscriptions` and updates `users.plan`.

- **Avatar upload** (`POST /api/user/avatar`)
  - Multipart; stores into `R2_AVATARS`; returns R2 proxy URL under `/r2/`.
  - CSRF + Same‑Origin + rate limit enforced.

- **Newsletter** (`POST /api/newsletter/subscribe`)
  - Validates email; rate limit enforced; returns validation errors consistently.

## Verification checklist

- API tests: `npm run test:integration` (dashboard, billing, avatar, newsletter).
- OpenAPI: `npm run openapi:validate`.
- Logs: security/user events emitted; no PII.
- R2 proxy owner‑gating works (tests under `api/r2-ai-proxy.test.ts`).

## Rollback

- Revert latest deploy using Wrangler versions; no data migrations in this runbook’s scope.
- If Stripe misconfigured, disable checkout UI and set banner; restore env vars and redeploy.
