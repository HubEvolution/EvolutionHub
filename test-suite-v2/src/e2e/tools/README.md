# Tools E2E

Tool-specific flows (Prompt Enhancer, Image Enhancer, etc.).

## Conventions

- Use `test-suite-v2/fixtures/tool-helpers.ts` for tool interactions:
  - Generic: `navigateToTool`, `uploadFile`, `waitForProcessing`, `downloadResult`, `getToolOutput`.
  - Prompt Enhancer: `PromptEnhancer.enhance(page, input, mode)` and granular variants.
  - Image Enhancer: `ImageEnhancer.uploadImage`, `selectModel`, `clickEnhance`, `toggleComparison`, `downloadEnhanced`.
- Reuse `common-helpers.ts` for navigation, cookie consent dismissal, and assertions.
- Prefer `data-testid` selectors; fall back to ARIA roles/labels; avoid brittle text selectors.
- Seed a fresh `guest_id` via `seedGuestId(page)` when validating guest rate limits.

## Environment

- Local dev uses the Worker dev server at `http://127.0.0.1:8787` (auto-started by Playwright when not targeting a remote URL).
- On CI or remote targets, set `TEST_BASE_URL`.
- API middleware enforces same-origin for unsafe methods; the Playwright config injects `Origin` automatically.

## Run examples

- Prompt Enhancer only:
  - `npx playwright test src/e2e/prompt-enhancer-flow.spec.ts -c playwright.config.ts --project=chromium`
- Image Enhancer only:
  - `npx playwright test src/e2e/imag-enhancer.spec.ts -c playwright.config.ts --project=chromium`

## Notes

- Respect quotas and plan entitlements (see UI gating and server enforcement). For quota tests, assert both UI messaging and API 429 with `Retry-After`.
- Use deterministic test files from `tests/fixtures/` (e.g., `tiny.pdf`, images) when validating uploads.
