# Test Issues – Production Environment

## Skipped / Pending

- Destructive integration suites skipped to protect live data
- OAuth/OIDC flows only executed when live secrets validated and monitoring active

## Fragility

- Reliance on production worker uptime; ensure smoke tests only run during maintenance windows
- Strict rate limits on AI tools; spacing between runs required

## External Requirements

- Live `STYTCH_*`, `STRIPE_SECRET`, and Workers AI bindings
- Turnstile/CSRF tokens must be respected; smokes include Origin headers

## Observations

- Smokes focus on login and public pages; consider extending to billing checkout once automated rollback is in place
