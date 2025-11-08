# Test Issues – Local Environment

## Skipped / Pending Suites

- Playwright auth OAuth specs (`test-suite-v2/src/e2e/auth/oauth/*.spec.ts`) contain multiple `test.skip` blocks
  - Awaiting full OAuth secret provisioning & staging stability
- Integration auth tests (`tests/integration/auth.test.ts`) skip destructive cases without CSRF token

## Fragile Dependencies

- Integration setup relies on `wrangler dev` and kills port 8787; concurrent runs may collide
- Stripe/Stytch integration tests require secrets; absence leads to skipped/not-run cases
- AI Image/Webscraper tests hit rate limits; need serialized execution (`--workers=1`)

## External Services

- Stytch/OAuth flows require whitelisted redirect and `STYTCH_*` secrets
- Stripe billing tests must be guarded to avoid real charges (use test keys, env gating)

## Observed Gaps

- Playwright v1 specs still present but not part of main smoke workflows → candidate for archival
- Lack of per-environment documentation for remote Playwright pointing (now addressed via structure reports)
