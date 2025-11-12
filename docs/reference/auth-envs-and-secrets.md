---
description: 'How environments, domains, and auth secrets fit together'
owner: 'Ops/Platform'
lastSync: '2025-11-11'
codeRefs: 'wrangler.toml, src/lib/stytch.ts, src/pages/api/auth/**, scripts/validate-env.ts'
---

# Auth Environments & Secrets

This page explains how to map domains to Wrangler environments, which secrets go where, and how to work safely with Stytch test vs live credentials.

## Domains ↔ Environments

Map each Wrangler environment to its canonical domains:

- production → [hub-evolution.com](https://hub-evolution.com) and [www.hub-evolution.com](https://www.hub-evolution.com) (routes in `wrangler.toml`)
- staging → [staging.hub-evolution.com](https://staging.hub-evolution.com) (routes in `wrangler.toml`)
- testing/ci → [ci.hub-evolution.com](https://ci.hub-evolution.com) (routes in `wrangler.toml`)
- dev/local → `wrangler dev` on <http://127.0.0.1:8787>

Code uses `ENVIRONMENT` (not `NODE_ENV`) to switch behavior. It’s set per env in `wrangler.toml`.

## Secrets Per Environment

Ensure required secrets are provisioned for each environment:

- Production (live):
  - `STYTCH_PROJECT_ID` (live; starts with `project-live-…`)
  - `STYTCH_SECRET` (live)
  - `STYTCH_PUBLIC_TOKEN` (live)
  - `JWT_SECRET`
  - `RESEND_API_KEY`
  - `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`
  - `TURNSTILE_SECRET_KEY`
- Staging (test): same keys but with Stytch/Stripe test credentials
- Testing/CI (test): same as staging; consider isolating email by not setting `RESEND_API_KEY`

Set them per env in Cloudflare (never commit to git):

- `wrangler secret put STYTCH_PROJECT_ID --env production`
- `wrangler secret put STYTCH_SECRET --env production`
- `wrangler secret put STYTCH_PUBLIC_TOKEN --env production`
- `wrangler secret put JWT_SECRET --env production`
- `wrangler secret put RESEND_API_KEY --env production`
- `wrangler secret put STRIPE_SECRET --env production`
- `wrangler secret put STRIPE_WEBHOOK_SECRET --env production`
- `wrangler secret put TURNSTILE_SECRET_KEY --env production`

Repeat for `--env staging` and `--env testing` with test credentials. List configured secrets:

- `wrangler secret list --env production`

## Non‑Secrets in wrangler.toml

Review the non-secret configuration values defined per environment:

- `ENVIRONMENT`, `BASE_URL`, `AUTH_PROVIDER`, `STYTCH_PKCE`, `PUBLIC_TURNSTILE_SITE_KEY`, pricing maps
- Top‑level comments in `wrangler.toml` outline which secrets must be added via `wrangler secret put`.

## Stytch: Test vs Live

Differentiate Stytch configuration between live and test modes:

- API base selection is automatic: live if `STYTCH_PROJECT_ID` starts with `project-live-…`, otherwise test (@src/lib/stytch.ts#64)
- `STYTCH_PUBLIC_TOKEN` required for OAuth start in all envs.
- Optional `STYTCH_CUSTOM_DOMAIN` per env, e.g.:
  - production: `login.hub-evolution.com` (live)
  - staging/testing: `login-test.hub-evolution.com` (test)
- PKCE: enable in staging (`STYTCH_PKCE="1"`), keep off in production by default (`"0"`).

## Redirect Whitelists in Stytch

Whitelist callback URLs in each Stytch project:

- Add these callback URLs per environment (test/live project):
  - `https://<domain>/api/auth/callback`
  - `https://<domain>/api/auth/oauth/{provider}/callback`
- Example: production → `hub-evolution.com`, staging → `staging.hub-evolution.com`, testing → `ci.hub-evolution.com`.

## CI Guidance

Keep CI secrets isolated and deploy with the correct environment:

- Keep Stytch and other secrets in Cloudflare envs. GitHub only needs a non‑sensitive `STYTCH_TEST_EMAIL` for smoke tests (`.github/workflows/*`).
- Deploy with the correct env so the right secrets are injected:
  - `wrangler deploy --env production`
  - `wrangler deploy --env staging`
  - `wrangler deploy --env testing`

## Local Development

Apply safer defaults when working locally:

- Avoid real emails/magic links locally:
  - `E2E_FAKE_STYTCH=1` simulates Stytch responses (dev only)
  - `STYTCH_BYPASS=1` allows callback with `token=dev-ok` for quick manual flows
- Prefer `BASE_URL` to ensure callback URLs point at local dev (see `wrangler.toml`).

## Validate Configuration

Run automated checks before deployment:

- Quick sanity check: `npm run validate:env`
  - Uses `scripts/validate-env.ts:1` to require the right variables by `ENVIRONMENT`
  - Fails CI if required keys are missing; prints warnings for optional dev relaxations

## Quick Checklist

Verify the essentials before rolling out changes:

- Correct Wrangler env for target domain?
- `STYTCH_PUBLIC_TOKEN` set in all non‑dev envs?
- Production uses live Stytch project (id starts with `project-live-…`)?
- `JWT_SECRET` set for protected APIs?
- Stripe secrets present and match env (test vs live)?
- TURNSTILE keys set where enabled?
- Redirect callback URLs whitelisted in Stytch?

See also

- `docs/api/auth_api.md:1` for endpoint behavior
- `wrangler.toml:1` for per-env vars and routes
- `src/lib/stytch.ts:1` for provider logic
