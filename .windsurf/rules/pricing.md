---
Title: Pricing & Stripe Rules
---

# Pricing & Stripe Rules

## Scope

- Billing endpoints, pricing UI, plan propagation to entitlements.

## Dependencies

- `src/pages/api/billing/**`
- Stripe webhook secret management.

## Constraints

- Follow tooling/testing rules.

## Security & Privacy

- Handle webhooks securely; verify signatures; avoid logging PII.

## Related Codemap

- `/.windsurf/codemaps/EH __ Pricing & Stripe __ Codemap v1.md`

## Documentation Reference

- `docs/development/stripe-setup.md`
- `.windsurf/rules/api-and-security.md`
