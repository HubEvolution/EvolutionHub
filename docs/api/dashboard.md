---
description: 'Dashboard APIs — billing/referral summaries, credits, sync, avatar, newsletter'
owner: 'API Team'
priority: 'high'
lastSync: '2025-11-13'
codeRefs: 'src/pages/api/dashboard/*, src/pages/api/billing/*, src/pages/api/user/avatar.ts, src/pages/api/newsletter/*, src/pages/r2-ai/*'
testRefs: 'tests/integration/api/dashboard/billing-referrals.test.ts, tests/integration/api/billing/stripe-config.test.ts, tests/integration/user-avatar-api.test.ts, tests/integration/newsletter-api.test.ts'
---

# Dashboard APIs — Overview

- **Endpoints**
  - `GET /api/dashboard/billing-summary` — Auth required. Returns plan, credits, subscription state. 405 for non‑GET.
  - `GET /api/dashboard/referral-summary` — Auth required. Returns referral code/link and counters. 405 for non‑GET.
  - `POST /api/billing/credits` — Auth + Same‑Origin + Double‑Submit CSRF. Creates Stripe Checkout for credit packs via `CREDITS_PRICING_TABLE`. Errors: `stripe_not_configured`, `pack_not_configured`.
  - `GET /api/billing/sync` — Auth required. Syncs subscription by `session_id` and redirects to dashboard with `billing=*` flags (`stripe_not_configured|missing_session|sync_error`).
  - `POST /api/user/avatar` — Auth + Same‑Origin + CSRF. Multipart image upload to `R2_AVATARS`; returns public proxy URL under `/r2/`.
  - `POST /api/newsletter/subscribe` — Validates email; applies rate limits; returns validation errors consistently.

- **Security & Headers**
  - Middleware: `withApiMiddleware` / `withAuthApiMiddleware`.
  - Unsafe methods: require Same‑Origin; Double‑Submit CSRF (`X-CSRF-Token` == cookie `csrf_token`).
  - Security headers: HSTS (preload), X‑Frame‑Options DENY, X‑Content‑Type‑Options nosniff, Referrer‑Policy strict‑origin‑when‑cross‑origin, minimal Permissions‑Policy.
  - 405 via helper sets `Allow`.
  - 429 includes `Retry-After`.
  - 200 responses include Server‑Timing.

- **Stripe configuration**
  - `STRIPE_SECRET` must be present.
  - Subscriptions: `PRICING_TABLE`, `PRICING_TABLE_ANNUAL` (JSON or object).
  - Credits: `CREDITS_PRICING_TABLE` mapping `pack` → `priceId`.

- **R2 AI proxy policy**
  - `/r2-ai/**` is public. `uploads/*` public. `results/<ownerType>/<ownerId>/*` owner‑gated.

- **References**
  - OpenAPI: `openapi.yaml` (CSRF header notes and 405/429 documented).
  - Tests: see testRefs for coverage of auth/CSRF/405/429 and redirect flows.
