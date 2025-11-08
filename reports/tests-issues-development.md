# Test Issues – Development Environment

## Skipped / Pending

- OAuth Playwright suites gated behind `.skip` due to missing secrets or unstable staging callbacks
- Integration auth tests skip destructive flows lacking CSRF token context

## Fragility

- Wrangler dev startup in global setup can fail if port 8787 occupied
- Stripe/Stytch integration require dev secrets; otherwise tests short-circuit
- AI/Webscraper throttled; enforce `--workers=1`

## External Requirements

- `STYTCH_*`, `STRIPE_SECRET`, `PRICING_TABLE[_ANNUAL]`
- R2/KV bindings defined in `wrangler.toml`

## Observations

- Playwright v1 specs still present but not part of dev workflows
- Coverage threshold at 70% requires vigilance when skipping suites
