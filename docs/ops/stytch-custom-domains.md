# Stytch Custom Domains with Cloudflare

This guide explains how to configure Stytch Custom Domains using Cloudflare DNS and wire them into this app.

- Two domains are used:
  - `login-test.<your-domain>` for Local/Test
  - `login.<your-domain>` for Staging/Production

## Prerequisites

- Cloudflare account with access to your DNS zone
- Stytch account (TEST and LIVE projects)
- Values from Stytch Custom Domain modal:
  - CNAME target for TEST (e.g. `abc.customers.stytch.dev`)
  - CNAME target for LIVE (e.g. `xyz.customers.stytch.dev`)

## 1) Create DNS Records in Cloudflare (Dashboard)

Create the following records in your zone:

- CNAME for `login-test`
  - Name: `login-test`
  - Content: `<TEST_TARGET>.customers.stytch.dev`
  - Proxy: DNS only (disable orange cloud)
  - TTL: Auto
- CNAME for `login`
  - Name: `login`
  - Content: `<LIVE_TARGET>.customers.stytch.dev`
  - Proxy: DNS only
  - TTL: Auto
- CAA records on the root (not on the subdomain):
  - Type: `CAA`, Name: `@`, Tag: `issue`, Value: `letsencrypt.org`
  - Type: `CAA`, Name: `@`, Tag: `issue`, Value: `ssl.com`
  - Type: `CAA`, Name: `@`, Tag: `issue`, Value: `pki.goog`

Notes:
- CAA must be added on the root domain (e.g. `example.com`), not on `login.example.com`.
- The CNAME must be DNS only to allow Stytch to issue certificates.

## 2) Verify DNS Propagation

Use `dig` to confirm records:

```bash
dig +short CNAME login-test.example.com
dig +short CNAME login.example.com
dig +short CAA example.com
```

Proceed once `login(-test)` resolves to the Stytch `*.customers.stytch.dev` host and CAA issuers are present.

## 3) Verify Domain in Stytch

For each project (TEST and LIVE):

- Go to: Configuration → Custom Domains → Add new
- Enter the full domain exactly as created in DNS:
  - TEST: `login-test.example.com`
  - LIVE: `login.example.com`
- Click “Verify” (certificate issuance can take a few minutes).

## 4) Configure Redirect URLs in Stytch

- TEST project:
  - `http://127.0.0.1:8787/api/auth/oauth/github/callback`
  - `http://localhost:8787/api/auth/oauth/github/callback`
- LIVE project:
  - `https://app.example.com/api/auth/oauth/github/callback` (replace with your app domain)

Custom Domains are used for the PUBLIC OAuth start endpoints; callbacks still point to your app domain.

## 5) Configure the App Environments

Set `STYTCH_CUSTOM_DOMAIN` so PUBLIC OAuth starts use your custom domain. This app already supports it in `src/pages/api/auth/oauth/[provider]/start.ts`.

- Development: `login-test.example.com`
- Staging: `login.example.com`
- Production: `login.example.com`

Wrangler secrets examples:

```bash
printf "login-test.example.com" | npx wrangler secret put STYTCH_CUSTOM_DOMAIN --env development
printf "login.example.com"      | npx wrangler secret put STYTCH_CUSTOM_DOMAIN --env staging
printf "login.example.com"      | npx wrangler secret put STYTCH_CUSTOM_DOMAIN --env production
```

Ensure the following Stytch secrets are set as well (per environment):

- `STYTCH_PUBLIC_TOKEN`
- `STYTCH_PROJECT_ID`
- `STYTCH_SECRET`

## 6) Build & Roundtrip Test

```bash
npm run build:worker
npm run dev:worker:dev
```

Test (Dev/Local):

1. Open `/en/login`.
2. Click “Continue with GitHub”.
3. Expect a 302 to `https://login-test.example.com/v1/public/oauth/github/start?...`.
4. Complete GitHub consent.
5. Expect redirect to `/api/auth/oauth/github/callback` and then to the target page (e.g. `/dashboard`).

For Staging/Prod, expect redirect to `https://login.example.com/...` after deployment.

## Troubleshooting

- **Fallback text shown for button**
  - Hard‑reload. Keys exist in `src/locales/en.json`. App also uses soft fallback + `||` defaults.
- **No redirect to custom domain**
  - `STYTCH_CUSTOM_DOMAIN` set for the current environment? Rebuild/restart Worker.
- **Verification/cert issues**
  - CNAME points to `*.customers.stytch.dev`? CAA present on root? Proxy disabled? Wait a few minutes.
- **Wrong Stytch environment**
  - TEST custom domain must be created in TEST project; LIVE custom domain in LIVE project.
- **Callback errors**
  - Exact callback URL registered in Stytch? Route exists at `/api/auth/oauth/github/callback`?

## Automation (Optional)

A helper script is provided to upsert Cloudflare DNS via API:

- Script: `scripts/cloudflare/setup-stytch-custom-domain.sh`
- Required env vars:
  - `CF_API_TOKEN` (DNS:Edit scoped to the zone)
  - `CF_ZONE_ID`
  - `CF_ROOT_DOMAIN` (e.g. `example.com`)
  - `CF_SUBDOMAIN` (`login` or `login-test`)
  - `STYTCH_TARGET` (e.g. `abc.customers.stytch.dev`)
  - Optional: `ENSURE_CAA=true` to add CAA issuers on the root

Example:

```bash
export CF_API_TOKEN=***
export CF_ZONE_ID=***
export CF_ROOT_DOMAIN=example.com
export STYTCH_TARGET=iris-gibbon-2947.customers.stytch.dev

# TEST
ENSURE_CAA=true  CF_SUBDOMAIN=login-test STYTCH_TARGET="$STYTCH_TARGET" \
  ./scripts/cloudflare/setup-stytch-custom-domain.sh

# LIVE
ENSURE_CAA=false CF_SUBDOMAIN=login      STYTCH_TARGET="$STYTCH_TARGET" \
  ./scripts/cloudflare/setup-stytch-custom-domain.sh
```

### Terraform (Recommended for Infra‑as‑Code)

You can codify the CNAME/CAA records via Terraform (`cloudflare_record`). Keep `proxied=false` for the CNAME.

## Security

- Do not paste API tokens into chat or logs. Export them in your local shell when running scripts.
- Limit Cloudflare tokens to the specific zone and only DNS:Edit (+ Zone:Read for discovery).
- Separate TEST and LIVE flows carefully. Verify the correct project before adding Custom Domains.
