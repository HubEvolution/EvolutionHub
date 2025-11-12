---
description: 'Stripe-Konfiguration für Billing Phase 2 (Produkte, Webhooks, Env Vars)'
owner: 'Billing Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'docs/development/stripe-setup.md, docs/api/billing_api.md, src/pages/api/billing/**'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Stripe Setup (Billing Phase 2)

This guide shows how to set up Stripe for plan-based entitlements: create products/prices, configure the webhook, and set environment variables.

## Prerequisites

- Stripe account (Test mode is fine)

- Stripe CLI installed: <https://stripe.com/docs/stripe-cli>

- Project running locally on <http://127.0.0.1:8787>

## 1) Create Products and Prices

You can do this in the Dashboard (Products → Add product → Add recurring price) or via Stripe CLI:

````bash

# Login (browser opens)

stripe login

# Example: Create products for Pro / Premium / Enterprise

stripe products create --name "Evolution Hub Pro"

# Copy the returned product.id (e.g., prod_123)

# Create a recurring monthly price (EUR) for that product

# Note: use -d flags for recurring fields and product linkage

stripe prices create \
  --unit-amount 999 \
  --currency eur \
  -d "recurring[interval]=month" \
  -d "product=prod_123"

# Copy the returned price.id (e.g., price_abc)

# Repeat for Premium / Enterprise with different amounts

```bash

Collect your `price.id` values and fill the `PRICING_TABLE` env as a JSON string mapping plan → priceId.

Example:

```bash
PRICING_TABLE='{"free":"","pro":"price_abc","premium":"price_def","enterprise":"price_ghi"}'
PRICING_TABLE_ANNUAL='{"free":"","pro":"price_annual_pro","premium":"price_annual_premium","enterprise":"price_annual_enterprise"}'
````

The app reads both variables at runtime and supports stringified JSON or pre-parsed objects. Invalid JSON is treated as an empty map, so keep the structure valid.

## 2) Configure Environment Variables

Local development (`.env`):

````bash

# Stripe server secret (sk_test_...)

STRIPE_SECRET=""

# Webhook signing secret (whsec_...)

STRIPE_WEBHOOK_SECRET=""

# Plan → Price mapping (monthly)

PRICING_TABLE='{"free":"","pro":"price_abc","premium":"price_def","enterprise":"price_ghi"}'

# Plan → Price mapping (annual)

PRICING_TABLE_ANNUAL='{"free":"","pro":"price_annual_pro","premium":"price_annual_premium","enterprise":"price_annual_enterprise"}'

# Optional: product-independent payment links used as fallback when Checkout creation fails

PRICING_LINKS='{"pro":"https://buy.stripe.com/...","premium":"https://buy.stripe.com/..."}'
PRICING_LINKS_ANNUAL='{"pro":"https://buy.stripe.com/...","premium":"https://buy.stripe.com/..."}'

# Credits Checkout mapping (see section below)

CREDITS_PRICING_TABLE='{"100":"price_credit_100","500":"price_credit_500","1500":"price_credit_1500"}'

```bash

Cloudflare (staging/production) via Wrangler:

```bash
# Staging
wrangler secret put STRIPE_SECRET --env staging
wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
# PRICING_TABLE can be a plain text var in wrangler.toml or a secret if preferred

# Production
wrangler secret put STRIPE_SECRET --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
````

Notes:

- Never commit real secrets. Use Wrangler secrets for deployed environments.

- `PRICING_TABLE*` and `CREDITS_PRICING_TABLE` can be plain-text since they hold non-sensitive Stripe price IDs.

- The code gracefully handles stringified JSON. If you prefer storing plain JSON objects, Wrangler `vars` can hold those as well.

## 3) Webhook Setup

Webhook endpoint in this project:

````bash
POST /api/billing/stripe-webhook

```bash

### Local (Stripe CLI forwarder)

```bash
stripe listen --forward-to http://127.0.0.1:8787/api/billing/stripe-webhook
# Copy the printed whsec_... value into STRIPE_WEBHOOK_SECRET
````

### Dashboard (Staging/Prod)

- Go to Developers → Webhooks → Add endpoint

- Events to enable:
  - `checkout.session.completed`

  - `customer.subscription.created`

  - `customer.subscription.updated`

  - `customer.subscription.deleted`

- Copy the Signing secret (whsec\_...) into the appropriate environment.

### Permanent webhook via Stripe CLI (staging/prod)

````bash

# Create a permanent webhook endpoint pointing to your staging/prod URL

stripe webhook_endpoints create \
  -d url="https://your-domain/api/billing/stripe-webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d description="Evolution Hub – Staging Webhook"

# The response contains a secret field (whsec_...). Put it into STRIPE_WEBHOOK_SECRET

```bash

## 4) Checkout Session

The app exposes `POST /api/billing/session` which creates a Stripe Hosted Checkout session.

- It includes `metadata: { userId, plan, workspaceId }`, `client_reference_id`, and `customer_email`.

- The webhook syncs `stripe_customers`, `subscriptions`, and updates `users.plan` based on the active subscription.

## 5) Testing

```bash
# Local: forward events
stripe listen --forward-to http://127.0.0.1:8787/api/billing/stripe-webhook

# Triggers (examples)
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
````

Check D1 tables:

- `stripe_customers` (user_id ↔ customer_id)

- `subscriptions` (id, user_id, plan, status, current_period_end, ...)

- `users.plan` is set to the active plan (or `free` on cancel).

## 6) Credits & Plan Propagation

The Image Enhancer supports consumable credits alongside plan quotas.

- Credits are stored in KV and consumed by services when the monthly plan limit is reached.

- Key format (KV_AI_ENHANCER): `ai:credits:user:<userId>` with a numeric balance.

- Sync and Jobs paths will attempt a credits bypass if the user has remaining credits.

- Example purchase endpoint (UI calls): `POST /api/billing/credits` (preconfigured amounts like 200/1000)

Notes:

- Plan is still the primary source for daily/monthly limits; credits are only consumed when monthly is exceeded.

- The Stripe webhook updates `users.plan`; credits top‑ups may be handled via a dedicated credits checkout/session or internal admin tooling.

- Never expose balances in client code without proper API routes; use server responses to display entitlements and usage.

## Troubleshooting

- 401/403 in webhook: verify `STRIPE_WEBHOOK_SECRET` is correct and forwarded to the correct endpoint.

- `plan` not updating: ensure product/price mapping in `PRICING_TABLE` matches your Stripe `price.id`s.

- Dashboard vs CLI: Both are supported; keep IDs consistent and update env accordingly.
