# Test Structure – Local Environment

## Runners & Entry Points

- **Vitest (unit & integration)**: `npm run test:unit`, `npm run test:integration`
- **Playwright v2**: `npm run test:e2e` (multi-browser)
- **Playwright v1 legacy**: `npm run test:e2e:v1`

## Configuration Files

- `vitest.config.ts`
- `test-suite-v2/playwright.config.ts`
- `playwright.config.ts`
- Supporting setup: `tests/integration/setup/global-setup.ts`, `test-suite-v2/config/*`

## Test Directories

- Unit: `src/**/*.{test,spec}.{ts,tsx}`, `tests/unit/**`, `test-suite-v2/src/unit/**`
- Integration: `tests/integration/**`
- E2E (legacy): `tests/e2e/specs/**`
- E2E (v2): `test-suite-v2/src/e2e/**`
- Fixtures & utilities: `tests/fixtures/**`, `tests/shared/**`, `tests/utils/**`, `test-suite-v2/config/fixtures/**`

## Environment Variables

- `TEST_BASE_URL` → overrides base URL; falls back to `BASE_URL`
- `BASE_URL` default `http://127.0.0.1:8787`
- `PW_NO_SERVER` disables local server start for Playwright
- Feature flags (e.g., `E2E_RECORD`, `E2E_FAKE_STYTCH`, `FORCE_CF_MODELS`) respected per script

## Local Execution Notes

- Integration setup runs `npm run db:setup`, `npm run build:worker:dev`, then `wrangler dev` on port 8787
- Playwright auto-starts Wrangler dev server unless `PW_NO_SERVER=1`
- Rate-limited suites (AI Image/Webscraper) require serialized execution (`--workers=1`)
- Coverage thresholds enforced via Vitest (70% statements/branches/functions/lines)
