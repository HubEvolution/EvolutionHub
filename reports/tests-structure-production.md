# Test Structure – Production Environment

## Runners & Entry Points

- `npm run test:unit` (run cautiously against read-only replicas)
- `npm run test:integration` (only when targeting safe GET-only scenarios)
- Playwright smoke workflows: `.github/workflows/prod-auth-smoke.yml`, optional feature-specific smokes

## Configuration Files

- `vitest.config.ts`
- `test-suite-v2/playwright.config.ts`
- `playwright.config.ts`
- Worker configuration: `wrangler.toml` `[env.production]`

## Environment Variables

- `.env.production` documents defaults; actual secrets injected via Workers KV/Secrets
- `TEST_BASE_URL=https://hub-evolution.com`
- `PW_NO_SERVER=1`
- Feature flags typically minimized (debug panel disabled, consent/analytics live)

## Execution Notes

- Avoid destructive tests; limit to smoke checks that validate public routes/auth login flows
- Ensure Turnstile/Stytch live secrets configured before running auth smokes
- Respect production rate limits and quotas—AI tools enforce strict limits; prefer manual throttling between runs
- Capture artifacts (screenshots, videos) for audit trail; review for PII before sharing
