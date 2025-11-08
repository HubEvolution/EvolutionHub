# Test Catalog – Local Environment

## Vitest (Unit & Integration)

### Directories

- `src/**/*.{test,spec}.{ts,tsx}`
- `tests/unit/**`
- `tests/integration/**`
- `test-suite-v2/src/unit/**`

### Common Fixtures & Utilities

- `tests/fixtures/test-user.json`
- `tests/shared/mock-fetch.ts`
- `tests/utils/test-client.ts`
- `tests/integration/setup/global-setup.ts`

### Notable Suites

- Auth integration (`tests/integration/auth.test.ts`, `tests/integration/magic-link-happy.test.ts`)
- Comments & moderation (`tests/integration/comments.test.ts`)
- Services (AI image, prompt enhancer, webscraper) under `tests/unit/services/**`

## Playwright (E2E)

### V1 Legacy Specs

- `tests/e2e/specs/splash-middleware.spec.ts`
- `tests/e2e/specs/referral/referral-reward.spec.ts`

### V2 Suite (`test-suite-v2/src/e2e`)

- Auth flows (`auth/**`)
- Tools (Image Enhancer, Prompt Enhancer, Voice) (`tools/**`, `voice/**`)
- Smoke suites (`smoke/prod-auth-smoke.spec.ts`)

### Fixtures & Helpers

- `test-suite-v2/config/fixtures/auth-helpers.ts`
- `test-suite-v2/config/playwright-global-setup.ts`
- `test-suite-v2/config/test-config.ts`
