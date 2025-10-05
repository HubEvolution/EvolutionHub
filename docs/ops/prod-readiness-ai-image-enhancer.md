# AI Image Enhancer – Production Readiness & Go‑Live Checklist

This checklist consolidates everything required to run the AI Image Enhancer reliably in production on Cloudflare Workers with D1, R2, and KV.

## 1) Preconditions

- Build target: Worker build outputs to `dist/_worker.js/index.js`; Wrangler serves static assets from `dist` (see `wrangler.toml [assets]`).
- Routes: `/r2-ai/**` is served via the proxy route `src/pages/r2-ai/[...path].ts` and must remain ungated by Basic Auth or overlays (see `src/middleware.ts`).
- Tests: Run unit/integration locally before deploy. E2E smokes can be run against TEST_BASE_URL or production.

## 2) Required Secrets and Env (Production)

Set in Wrangler production environment:

- **REPLICATE_API_TOKEN** (required for provider calls in production).
- **STRIPE_SECRET** (required for webhook event verification and API calls).
- **STRIPE_WEBHOOK_SECRET** (required to validate webhook signatures).
- Optional: **BASE_URL**/**APP_ORIGIN** if your flows depend on explicit origin.
- Optional UI flags at build time (e.g., `PUBLIC_ENHANCER_PLAN_GATING_V1`).
- Optional UI flag: `PUBLIC_ENABLE_CREDITS_CTA` (default hidden in production; set to `1` to enable credits CTA. In development it is enabled by default).

Verify `wrangler.toml [env.production.vars]` contains:

- `ENVIRONMENT = "production"`
- Pricing tables: `PRICING_TABLE`, `PRICING_TABLE_ANNUAL` mapped to live Stripe price IDs.

## 3) Resource Bindings (Production)

Ensure these bindings exist in `wrangler.toml [env.production]` and in your Cloudflare project:

- **D1**: `DB`
- **R2**: `R2_AI_IMAGES`
- **KV**: `KV_AI_ENHANCER`
- Domains/routes for `hub-evolution.com` and `www.hub-evolution.com`

## 4) Database Migrations (D1)

Apply migrations through the usual pipeline so production D1 includes:

- `0008_create_ai_jobs_table.sql`
- `0009_update_ai_jobs_guest_ownership.sql` (owner_type/owner_ref + indexes)
- `0011_add_users_plan.sql` (`users.plan` default `'free'`)
- `0012_create_billing_tables.sql` (`stripe_customers`, `subscriptions`)

Post-checks:

- Table `ai_jobs` has indexes `idx_ai_jobs_owner_created_at`, etc.
- `users.plan` exists and defaults to `'free'`.

## 5) Stripe Webhook & Billing

Endpoint: `src/pages/api/billing/stripe-webhook.ts`.

- Validates signature (`STRIPE_WEBHOOK_SECRET`).
- Maps price→plan via `PRICING_TABLE` + `PRICING_TABLE_ANNUAL`.
- Persists subscription rows and sets `users.plan` accordingly.
- Handles credit packs via KV key `ai:credits:user:<userId>`.

Actions:

- Create live webhook endpoint to your production domain.
- Confirm live price IDs in `wrangler.toml [env.production.vars]` match Stripe.
- Decide on credit packs for production (configure live prices or hide the CTA in UI).
  - To hide CTA: ensure `PUBLIC_ENABLE_CREDITS_CTA=0` in production builds.

## 6) Security & Middleware

- API handlers wrap with `withApiMiddleware` (`src/lib/api-middleware.ts`) providing:
  - Security headers (HSTS preload, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy).
  - Same-origin checks for unsafe methods and optional CSRF double submit.
- Enhancer endpoints enforce CSRF + origin:
  - `POST /api/ai-image/generate` → `{ enforceCsrfToken: true }`
  - `POST /api/ai-image/jobs` and `POST /api/ai-image/jobs/[id]/cancel` → `{ enforceCsrfToken: true }`
- Stripe webhook disables CSRF/origin (validated by signature instead).
- Global middleware keeps `/r2-ai/**` outside Basic Auth and redirects.

## 7) CSP & Asset Serving

- HTML CSP is nonce-based in production (see `src/middleware.ts`).
- `img-src 'self' data: blob: https:` allows images from the same origin R2 proxy.
- R2 proxy response headers:
  - Uploads (`ai-enhancer/uploads/**`): `Cache-Control: public, max-age=900, immutable`.
  - Results (`ai-enhancer/results/<ownerType>/<ownerId>/**`): `Cache-Control: private, max-age=31536000, immutable`.

## 8) Rate Limiting

- `aiGenerateLimiter` 15/min.
- `aiJobsLimiter` 10/min.
- Returns `429` with `Retry-After` header.
- Note: in-memory per isolate; consider KV-backed limiter if traffic scales horizontally.

## 9) Entitlements & Quotas

- Plan-based entitlements resolved server-side via `getEntitlementsFor()` in routes.
- `locals.user.plan` provided by `validateSession()` (`src/lib/auth-v2.ts`).
- Services enforce:
  - Daily burst cap (KV daily window ~24h).
  - Monthly cap and optional credits bypass for users.
  - Capability gates (maxUpscale, faceEnhance) per plan.

## 10) Post‑Deploy Smoke (Production)

Perform minimal end-to-end checks:

- **Generate (sync)**: `POST /api/ai-image/generate` with a small PNG.
  - Expect 200 JSON `{ success: true, data: { imageUrl, originalUrl, usage, limits } }`.
- **Jobs (async)**: `POST /api/ai-image/jobs` → 202 with `id`, then `GET /api/ai-image/jobs/{id}` → progresses to `succeeded` or supports `cancel`.
- **R2 Proxy**:
  - Upload URL fetch works without cookies and sets public cache headers.
  - Results path requires owner; non-owner → 403, owner 404 if missing, 200 if present.
- **Rate Limits**: Burst calls trigger `429` with `Retry-After`.
- **Security**: 405 responses include `Allow` header.

## 11) Monitoring & Troubleshooting

- Logs: services emit structured logs like `replicate_duration_ms`, `replicate_error`, `usage_increment`.
- Consider enabling Wrangler log push or external monitoring for:
  - Surge of `replicate_error`/5xx on enhancer endpoints.
  - Unusual 429 rates.
  - Missing `REPLICATE_API_TOKEN` (production does not use dev echo) → provider errors.
  - Price→plan mapping mismatch → plan not updated; verify env price IDs.
  - D1 schema outdated → owner gating/usage failures; re-apply migrations.

## 12) Rollback

- Use Wrangler rollback or redeploy previous Git tag.
- Disable webhook delivery temporarily in Stripe if needed.

## 13) E2E Recording (E2E_RECORD)

Use the `E2E_RECORD` environment variable to control Playwright artifacts (trace/screenshots/video):

- Defaults (fast): `E2E_RECORD=0`
  - `trace: retain-on-failure`
  - `screenshot: only-on-failure`
  - `video: off`
- Opt-in recording: `E2E_RECORD=1`
  - `trace: on`
  - `screenshot: on`
  - `video: retain-on-failure`

Configured in:

- `playwright.config.ts` (legacy v1 tests)
- `test-suite-v2/playwright.enhancer.config.ts` (Enhancer E2E)
- CI smoke workflow sets `E2E_RECORD: '0'` by default: `.github/workflows/enhancer-e2e-smoke.yml`

Examples:

```bash
# Local fast run (default)

# Record everything for investigation
E2E_RECORD=1 npx playwright test -c test-suite-v2/playwright.enhancer.config.ts

# Against local dev worker (in another terminal)
E2E_RECORD=1 TEST_BASE_URL=http://127.0.0.1:8787 npx playwright test -c test-suite-v2/playwright.enhancer.config.ts test-suite-v2/src/e2e/tools/image-enhancer.spec.ts
- Services: `src/lib/services/ai-image-service.ts`, `src/lib/services/ai-jobs-service.ts`
- Entitlements: `src/config/ai-image/entitlements.ts`
- R2 Proxy: `src/pages/r2-ai/[...path].ts`
- Billing: `src/pages/api/billing/stripe-webhook.ts`
