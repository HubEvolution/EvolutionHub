# Test Structure – Staging Environment

## Runners & Entry Points

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e` (Playwright v2)
- GitHub Actions workflows: `.github/workflows/enhancer-e2e-smoke.yml`, `.github/workflows/prod-auth-smoke.yml`

## Configuration Files

- `vitest.config.ts`
- `test-suite-v2/playwright.config.ts`
- `playwright.config.ts`
- `wrangler.toml` + `[env.staging]` bindings

## Environment Variables

- `.env.staging` used for local parity but secrets injected via Workers
- `TEST_BASE_URL=https://ci.hub-evolution.com`
- `PW_NO_SERVER=1` to avoid local server start
- Stripe/Stytch secrets via Wrangler environment
- Feature flags: staging enables Workers AI (`WORKERS_AI_ENABLED=1`), debug panel optional

## Execution Notes

- Unit/Integration typically run read-only (no destructive mutations)
- Integration tests requiring write access rely on staging D1 fixtures; verify `db:setup` not executed remotely
- Playwright smoke jobs focus on Enhancer & Auth flows; limited to Chromium with retries=2 on CI
- Respect rate limits and quota: AI Image Enhance limited to plan entitlements; Webscraper quotas enforced server-side
