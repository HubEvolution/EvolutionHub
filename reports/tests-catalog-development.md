# Test Catalog – Development Environment

## Vitest (Unit & Integration)

### Directories

- `src/**/*.{test,spec}.{ts,tsx}`
- `tests/unit/**`
- `tests/integration/**`
- `test-suite-v2/src/unit/**`

### Fixtures & Utilities

- `.env.development` for feature flags
- `tests/integration/setup/global-setup.ts` (respects TEST_BASE_URL when provided)
- Shared helpers under `tests/shared/**`, `tests/utils/**`

### Notable Suites

- Auth & session flows (`tests/integration/auth.test.ts`, `tests/integration/magic-link-happy.test.ts`)
- Stripe billing integration tests (require dev secrets)
- AI enhancer service tests (honor WORKERS_AI_ENABLED)

## Playwright (E2E)

### Suites

- `test-suite-v2/src/e2e/auth/**`
- `test-suite-v2/src/e2e/tools/**`
- `test-suite-v2/src/e2e/voice/**`
- `tests/e2e/specs/**` (legacy harness)

### Fixtures

- `test-suite-v2/config/playwright-global-setup.ts`
- `test-suite-v2/config/fixtures/auth-helpers.ts`
- Feature toggles via `test-suite-v2/config/test-config.ts`
