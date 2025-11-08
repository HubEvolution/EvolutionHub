# Test Catalog – Staging Environment

## Vitest (Unit & Integration)

### Directories

- `src/**/*.{test,spec}.{ts,tsx}`
- `tests/unit/**`
- `tests/integration/**`
- `test-suite-v2/src/unit/**`

### Notes

- Prefer read-only checks; destructive integration tests should target dedicated staging resources only
- Ensure staging secrets (Stripe/Stytch) are available before running billing/auth suites

## Playwright (E2E)

### Active Workflows

- `.github/workflows/enhancer-e2e-smoke.yml`
- `.github/workflows/prod-auth-smoke.yml`

### Suites & Coverage

- Enhancer smoke (Chromium only, EN route)
- Auth smoke (Magic Link flow)
- Optional voice/tool smokes when staging features enabled

### Fixtures

- `test-suite-v2/config/playwright-global-setup.ts` (sets `TEST_BASE_URL`)
- `test-suite-v2/config/test-config.ts`
