# Test Catalog – Production Environment

## Vitest (Unit & Integration)

### Directories

- `src/**/*.{test,spec}.{ts,tsx}`
- `tests/unit/**`
- `tests/integration/**`

### Notes

- Run only non-destructive suites against production replicas
- Skip integration tests that mutate data or require admin roles

## Playwright (E2E)

### Active Workflows

- `.github/workflows/prod-auth-smoke.yml`
- Optional feature smokes (Enhancer, Voice) when explicitly triggered

### Coverage

- Auth Magic Link happy path (`test-suite-v2/src/e2e/auth/magic-link-flow*.spec.ts`)
- Public landing & tools smoke specs as needed

### Fixtures

- `test-suite-v2/config/test-config.ts` (provides base URL)
- `test-suite-v2/config/playwright-global-setup.ts` with `PW_NO_SERVER=1`
