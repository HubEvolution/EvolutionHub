# Test Issues – Staging Environment

## Skipped / Pending

- OAuth suites still skipped pending staging secret rollout
- Billing integration tests disabled to avoid modifying staging subscriptions

## Fragility

- Dependence on staging worker availability; ensure `TEST_BASE_URL` reachable before runs
- Rate limits stricter vs. dev; throttle AI/Webscraper test invocations

## External Requirements

- Staging secrets sourced from Wrangler (`STRIPE_SECRET`, `STYTCH_*`, Workers AI bindings)
- Ensure Turnstile decisions documented (currently off by default)

## Observations

- Playwright smokes limited to Chromium for speed; consider adding Firefox/WebKit coverage if stability improves
