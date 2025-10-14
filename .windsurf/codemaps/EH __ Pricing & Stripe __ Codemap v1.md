---
description: EH :: Pricing & Stripe :: Codemap v1
version: 1
feature: pricing-stripe
---

# EH :: Pricing & Stripe :: Codemap v1

## Entry Points

- API: `src/pages/api/billing/{session,credits,cancel,stripe-webhook,sync,sync-callback}.ts`
- UI: Pricing pages under `src/pages/{de|en}/pricing.*` (if present)

## Services/Config

- Stripe integration via server handlers; plan propagation to entitlements.

## Related Rules

- `.windsurf/rules/pricing.md`

## Documentation

- `docs/development/stripe-setup.md`
- `docs/development/ci-cd.md`
