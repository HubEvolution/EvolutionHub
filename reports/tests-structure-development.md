# Test Structure – Development Environment

## Runners & Entry Points

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e` (Playwright v2)
- `npm run test:e2e:v1` (legacy)

## Configuration Files

- `vitest.config.ts`
- `test-suite-v2/playwright.config.ts`
- `playwright.config.ts`
- `tests/integration/setup/global-setup.ts`

## Environment Variables

- `.env.development` values load automatically via Astro/Vite
- `TEST_BASE_URL` → point to shared dev worker; skip local wrangler when set
- `PW_NO_SERVER=1` when targeting remote dev deployment
- Feature flags: `E2E_FAKE_STYTCH`, `FORCE_CF_MODELS`, `PUBLIC_ENABLE_DEBUG_PANEL`

## Execution Notes

- Ensure dev D1/KV/R2 resources seeded before running suites
- Integration setup expects access to dev secrets (Stripe/Stytch); otherwise tests skip or fail fast
- Playwright v2 can run multi-browser; prefer `--project=chromium` for faster smoke checks
- Respect rate limits (AI/Webscraper) by limiting workers or staggering runs
