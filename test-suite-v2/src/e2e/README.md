# E2E v2 – Overview

This folder hosts the Playwright E2E suite for Evolution Hub.

## Structure

```text
src/e2e/
├── auth/            # v1.7.2 comprehensive auth suite (OAuth, Magic Link, Session, Middleware)
├── features/        # App feature flows (e.g., dashboard, comment system)
├── tools/           # Tool-specific flows (Prompt Enhancer, Image Enhancer, ...)
├── smoke/           # Lightweight smokes for CI/staging/prod
└── README.md        # This guide
```

Shared fixtures live in `test-suite-v2/fixtures/`:

- `auth-helpers.ts`
- `common-helpers.ts`
- `tool-helpers.ts`

## Running

- All E2E:
  - `npm run test:e2e`
- Specific folder:
  - `npx playwright test src/e2e/tools -c playwright.config.ts --project=chromium`
- Specific file:
  - `npx playwright test src/e2e/features/dashboard-flow.spec.ts -c playwright.config.ts`

Playwright baseURL comes from `TEST_BASE_URL` or `BASE_URL` or defaults to `http://127.0.0.1:8787`.
If targeting local dev, the config auto-starts the root dev server via `npm --prefix .. run dev:e2e`.

## Config highlights

- File: `test-suite-v2/playwright.config.ts`
- Projects: chromium, firefox, webkit, mobile variants
- CI: retries=2, workers=1, HTML+JSON+JUnit reports under `test-suite-v2/reports/`
- use.extraHTTPHeaders.Origin is set to satisfy same-origin checks in API middleware

## Conventions

- Prefer selectors in this order: `data-testid` > ARIA roles/labels > exact text.
- Use fixtures:
  - Navigation, forms, assertions → `common-helpers.ts`
  - Tools UIs (prompt/image enhancer) → `tool-helpers.ts`
  - Auth flows (OAuth, Magic Link, session) → `auth-helpers.ts`
- Never import DB or server internals in E2E.
- Gate tests by environment when necessary (local vs. remote target).

## Category guides

- Auth: `src/e2e/auth/README.md`
- Features: `src/e2e/features/README.md`
- Tools: `src/e2e/tools/README.md`
- Smoke: `src/e2e/smoke/README.md`
