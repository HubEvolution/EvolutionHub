# Evolution Hub — Production Readiness Audit & Implementation Plan

Last updated: 2025-10-15

This document captures the audit scope, concrete workstreams, exact patch points, commands, validation criteria, and runbooks required to take the project to production according to our verified repository rules.

- Source rules: `AGENTS.md`, `.windsurf/rules/*.md`, `docs/_generated/codemap.md`
- Security/API rules: `src/lib/api-middleware.ts`, `src/middleware.ts`, `src/lib/rate-limiter.ts`

---

## Scope & Goals

- Harden abuse protection across PoPs (distributed rate limit).
- Enforce bot-gating (Turnstile) on Magic Link request in prod-like envs.
- Gate production deployment via staging E2E smokes.
- Verify environment secrets/bindings and Stripe plan mapping.
- Add minor header hardening for HTML.
- Provide monitoring and rollback runbooks.

---

## Workstreams

### W1. Distributed Rate Limiting (KV-backed)

- Why: In-memory limiter is per-isolate; for production, adopt KV-backed windowed limiter for consistency across PoPs.
- Patch points:
  - New: `src/lib/rate-limiter-kv.ts` (KV limiter factory; fixed or sliding window; returns `Retry-After`).
  - Update: `src/lib/rate-limiter.ts` (export new presets or adapter; preserve existing API).
  - Update: `src/pages/api/auth/magic/request.ts` (use KV limiter for `POST`).
  - Update: `src/pages/api/ai-image/generate.ts` (switch to KV preset).
  - Update: `src/pages/api/voice/transcribe.ts` (switch to KV preset).
  - Update: `wrangler.toml` add `KV_RATE_LIMIT` under `env.testing|staging|production`.
  - Tests: `tests/unit/lib/rate-limiter-kv.spec.ts` and `tests/integration/api/*-rate-limit.spec.ts`.
- Commands:
  - Git: `git checkout -b feat/kv-rate-limit`
  - Local tests: `npm run test:once && npm run test:integration:run`
  - Format/Lint: `npm run format:check && npm run lint`
  - CF Namespaces (requires approval):
    - `wrangler kv namespace create KV_RATE_LIMIT --env testing`
    - `wrangler kv namespace create KV_RATE_LIMIT --env staging`
    - `wrangler kv namespace create KV_RATE_LIMIT --env production`
  - Dev: `npm run dev:worker:dev`
  - Commit: `git add -A && git commit -m "feat(rate-limit): KV-backed limiter for hot endpoints" && git push -u origin feat/kv-rate-limit`
- Validation:
  - Burst requests to `POST /api/auth/magic/request`, `POST /api/ai-image/generate`, `POST /api/voice/transcribe` → receive `429` JSON with `Retry-After` header.

### W2. Turnstile-Enforcement for Magic Link

- Why: Prod must enforce bot-gating for Magic Link requests if secret is configured.
- Patch points:
  - Update: `src/pages/api/auth/magic/request.ts` add lightweight observability counters for Turnstile verify `success|failed|unavailable`.
  - Verify: `src/components/auth/MagicLinkForm.astro` sends `cf-turnstile-response`.
- Commands:
  - Git: `git checkout -b chore/turnstile-enforce`
  - CF Secrets (requires approval):
    - `wrangler secret put TURNSTILE_SECRET_KEY --env testing`
    - `wrangler secret put TURNSTILE_SECRET_KEY --env staging`
    - `wrangler secret put TURNSTILE_SECRET_KEY --env production`
  - Tests: `npm run test:integration:run`
  - Commit: `git add -A && git commit -m "chore(auth): enforce Turnstile verify in prod-like envs" && git push -u origin chore/turnstile-enforce`
- Validation:
  - Invalid/missing token → `validation_error`.

### W3. Explicit Allowed Origins

- Why: Harden origin checks using env allowlists.
- Patch points:
  - Update: `wrangler.toml` for `env.staging.vars` and `env.production.vars`:
    - `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`, optionally `ALLOWED_ORIGINS` including apex and www.
- Commands:
  - Git: `git checkout -b chore/allowed-origins`
  - Lint: `npm run format:check && npm run lint`
  - Commit: `git add wrangler.toml && git commit -m "chore(security): set explicit allowed origins for staging/prod" && git push -u origin chore/allowed-origins`
- Validation:
  - Requests with disallowed `Origin` rejected by middleware (`forbidden`).

### W4. Global Referrer-Policy for HTML

- Why: Consistent `Referrer-Policy` for HTML responses.
- Patch points:
  - Update: `src/middleware.ts` to set `Referrer-Policy: strict-origin-when-cross-origin` for HTML responses (only).
- Commands:
  - Git: `git checkout -b chore/referrer-policy-html`
  - Tests: `npm run test:integration:run`
  - Commit: `git add -A && git commit -m "chore(security): add global Referrer-Policy for HTML" && git push -u origin chore/referrer-policy-html`
- Validation:
  - HTML responses include policy; APIs unchanged.
- Status: Completed — PR #60 <https://github.com/HubEvolution/EvolutionHub/pull/60>

### W5. CI Gate: Staging Smokes before Production

- Why: Prevent production deploy without passing critical smokes.
- Patch points:
  - Update: `.github/workflows/deploy.yml`:
    - In `pre-deploy`: add `npm run openapi:validate`.
    - After staging deploy: run Auth Magic Link smoke and Image Enhancer smoke against staging URL.
- Commands:
  - Git: `git checkout -b ci/staging-smokes-gate`
  - Local: `npm run openapi:validate`
  - Commit: `git add .github/workflows/deploy.yml && git commit -m "ci: gate production on staging smokes + openapi validate" && git push -u origin ci/staging-smokes-gate`
- Validation:
  - Prod job waits for staging smokes to pass.
- Status: Completed — PR #61 <https://github.com/HubEvolution/EvolutionHub/pull/61>

### W6. Secrets & Bindings Audit

- Why: Ensure all envs are wired for prod.
- Patch points:
  - New/Update Doc: `docs/ops/production-readiness-checklist.md` matrix (this file).
  - Update: `wrangler.toml` if any binding missing.
- Commands (requires approval for remote):
  - Inspect: `wrangler d1 list --env staging`
  - Inspect: `wrangler kv namespace list`
  - Inspect: `wrangler r2 bucket list`
  - Health: `npm run health-check -- --url https://staging.hub-evolution.com`

### W7. Monitoring & Runbooks

- Why: Operational readiness.
- Patch points:
  - Update Doc: `docs/ops/production-readiness-checklist.md` with Logpush/Tail usage, health procedure, key events.
- Commands:
  - Tail staging: `npm run tail:staging`
  - Tail prod: `npm run tail:prod`

### W8. Voice SSE Flags & Limits

- Why: Confirm flags for prod and document behavior.
- Patch points:
  - Update: `wrangler.toml` ensure `VOICE_STREAM_SSE=1`, `VOICE_STREAM_POLL=1` for `env.production.vars`.
  - Update Doc: note connection retry/heartbeat.
- Commands:
  - Git: `git checkout -b chore/voice-sse-flags`
  - Commit: `git add wrangler.toml && git commit -m "chore(voice): ensure SSE/POLL flags for prod" && git push -u origin chore/voice-sse-flags`

### W9. Stripe Prices & Plan Mapping

- Why: Correct plan propagation.
- Patch points:
  - Update: `wrangler.toml` `PRICING_TABLE` / `PRICING_TABLE_ANNUAL` (prod) to live price IDs.
  - Update: `docs/development/stripe-setup.md` if changed.
- Commands:
  - Git: `git checkout -b chore/stripe-price-mapping`
  - Commit: `git add wrangler.toml docs/development/stripe-setup.md && git commit -m "chore(stripe): verify price mapping and docs" && git push -u origin chore/stripe-price-mapping`

### W10. Tests (Unit/Integration/E2E) — Additions

- Unit: KV limiter math + `Retry-After` semantics.
- Integration: Burst tests for hot endpoints expecting `429`.
- E2E: Ensure existing smokes remain green (Auth, Enhancer, Voice SSE/Poll).
- Commands:
  - Run unit: `npm run test:once`
  - Run integration: `npm run test:integration:run`
  - Run E2E (local): `npm run test:e2e:chromium`

---

## Environment Matrix (to verify)

- Stytch: `STYTCH_PROJECT_ID`, `STYTCH_SECRET`, `STYTCH_PUBLIC_TOKEN`, `STYTCH_CUSTOM_DOMAIN`
- Stripe: `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `PRICING_TABLE*`
- AI: `REPLICATE_API_TOKEN`, `OPENAI_API_KEY`
- Security: `TURNSTILE_SECRET_KEY` (testing/staging/production)
- Storage/State: `DB`(D1), `KV_*`(SESSION/KV*AI_ENHANCER/KV_VOICE_TRANSCRIBE/KV_RATE_LIMIT), `R2*\*`(R2_AI_IMAGES/R2_AVATARS)
- Origin: `APP_ORIGIN`, `PUBLIC_APP_ORIGIN`, optional `ALLOWED_ORIGINS`
- Voice Flags: `VOICE_STREAM_SSE`, `VOICE_STREAM_POLL`, `VOICE_R2_ARCHIVE`

---

## Operational Runbook (Short)

- Health check after deploy:
  - `npm run health-check -- --url https://staging.hub-evolution.com`
- Logs:
  - `npm run tail:staging` / `npm run tail:prod`
- Rollback:
  - Re-deploy previous tag via GitHub Release or `wrangler deploy --env production --branch <tag>`

---

## Approval & Execution Order

1. W5 (CI gate) — safe; adds OpenAPI validation and staging smokes.
2. W2 (Turnstile) — secrets only + small logging.
3. W3 (Origins) — env vars only.
4. W4 (Referrer-Policy) — small middleware change.
5. W1 (KV limiter) — code + KV namespaces; add tests.
6. W6–W9 documentation/flags/secrets verifications.

---

## Proposed First Command (no side-effects)

To verify OpenAPI before wiring CI gate:

```plain
npm run openapi:validate
```

Run only after approval.
