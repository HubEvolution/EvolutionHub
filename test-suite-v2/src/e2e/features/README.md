# Features E2E

Feature-level flows (e.g., dashboard, comment system) that span multiple pages or subsystems.

## Conventions

- Prefer selectors: `data-testid` > ARIA roles/labels > exact text.
- Use shared helpers from `test-suite-v2/fixtures/common-helpers.ts`:
  - Navigation: `navigateToRoute`, `waitForPageReady`, `dismissCookieConsent`.
  - Forms: `fillForm`, `submitForm`.
  - Assertions: `expectErrorMessage`, `expectSuccessMessage`.
- Do not import DB or server internals; test through the UI only.
- Gate long or brittle flows with environment checks (`isLocalDev`,`isCI`,`isStaging`).

## Auth

- If authentication is required, use `test-suite-v2/fixtures/auth-helpers.ts` (e.g., `loginAs`, `assertAuthenticated`).
- Avoid re-implementing login logic in test files.

## Data-testids

- If a robust selector is missing, add a `data-testid` to the component under test in `src/components/**`.
- Keep names stable and documented in the test file header.

## Run examples

- All feature tests:
  - `npx playwright test src/e2e/features -c playwright.config.ts --project=chromium`
- Single spec:
  - `npx playwright test src/e2e/features/dashboard-flow.spec.ts -c playwright.config.ts`
