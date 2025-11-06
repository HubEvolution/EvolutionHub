---
description: 'Go-Live Runbook für den AI Image Enhancer (MVP)'
owner: 'Operations Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'docs/ops/, src/lib/services/ai-image-service.ts, src/pages/api/ai-image/**'
---

<!-- markdownlint-disable MD051 -->

# AI Image Enhancer — Go-Live Runbook (MVP)

Scope: Production readiness verification and emergency rollback for the AI Image Enhancer MVP (sync generate + R2 results; provider: Cloudflare Workers AI for Enhance, Replicate for upscale/face on allowed models).

## Preconditions

- Infra/env

  - `[ai]` binding present (Cloudflare Workers AI)

  - R2 buckets: R2_AI_IMAGES; KV namespaces: KV_AI_ENHANCER

  - WORKERS_AI_ENABLED="1" in production

  - CSP/middleware active (global) and API middleware on routes

- Code

  - SDXL default steps set to 20 (provider cap). File: `src/config/ai-image.ts`

  - OpenAPI validated (CF params + PlanEntitlements documented)

- CI gates (green)

  - `npm run openapi:validate`

  - `npm run lint` and `npm run format:check`

  - `npm run test:integration`

  - `npm run test:e2e`

## Smoke Tests (Production)

Run from a terminal. These are same‑origin + CSRF safe.

1) Prepare a sample image (~35KB) and helper vars

```sh
curl -L -o /tmp/eh_test.jpg https://upload.wikimedia.org/wikipedia/commons/3/3f/JPEG_example_flower.jpg
export APP_ORIGIN="https://hub-evolution.com"
```

1) Successful generate (Workers AI SD 1.5)

```sh
CSRF=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
# Seed a guest_id cookie
curl -s -c jar.txt -b jar.txt "$APP_ORIGIN/api/ai-image/usage" >/dev/null
GUEST_ID=$(awk '($0 !~ /^#/) && $6=="guest_id"{print $7}' jar.txt | tail -n1)

curl -sS -D gen_headers.txt -o resp.json \
  -H "Origin: $APP_ORIGIN" \
  -H "Cookie: guest_id=$GUEST_ID; csrf_token=$CSRF" \
  -H "X-CSRF-Token: $CSRF" \
  -F "image=@/tmp/eh_test.jpg" \
  --form-string "model=@cf/runwayml/stable-diffusion-v1-5-img2img" \
  "$APP_ORIGIN/api/ai-image/generate"
node -e 'const j=require("fs").readFileSync("resp.json","utf8"); const o=JSON.parse(j); console.log(o.success,o?.data?.imageUrl,o?.data?.usage)'
```

Expected: HTTP 200, `success: true`, non-empty `data.imageUrl`, `usage.used` incremented.

1) R2 owner‑gating

```sh
IMG_URL=$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync("resp.json","utf8")); console.log(j?.data?.imageUrl||"")')

# 200 with owner cookie

curl -s -o /dev/null -w "%{http_code}\n" -H "Cookie: guest_id=$GUEST_ID" "$IMG_URL"

# 403 without cookie

curl -s -o /dev/null -w "%{http_code}\n" "$IMG_URL"
```

1) CSRF negative

```sh
curl -s -o /dev/null -w "%{http_code}\n" \
  -F "image=@/tmp/eh_test.jpg" \
  --form-string "model=@cf/runwayml/stable-diffusion-v1-5-img2img" \
  "$APP_ORIGIN/api/ai-image/generate"
```

Expected: 403 (forbidden) due to Origin/CSRF.

1) Optional SDXL generate (Advanced)

```sh
CSRF=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
curl -sS -D gen_cf_sdxl.txt -o resp_cf_sdxl.json \
  -H "Origin: $APP_ORIGIN" \
  -H "Cookie: csrf_token=$CSRF" \
  -H "X-CSRF-Token: $CSRF" \
  -F "image=@/tmp/eh_test.jpg" \
  --form-string "model=@cf/stabilityai/stable-diffusion-xl-base-1.0" \
  --form-string "steps=20" \
  "$APP_ORIGIN/api/ai-image/generate"
```

Notes on rate‑limits: The current in‑memory `aiGenerateLimiter` is per‑isolate. Under multi‑edge routing, a short burst may not yield a deterministic 429. For global consistency, see the KV/Durable‑Object plan in `docs/ops/ai-generate-kv-limiter-plan.md`.

## Real‑User Test (Headless)

- Navigate to `/tools/imag-enhancer/app`.

- Upload an image, click "Verbessern".

- Expect compare view with Original/Ergebnis and Usage increment.

- Network: `POST /api/ai-image/generate` 200; `GET /r2-ai/...` 200; Headers: HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, nosniff; POST carries X‑CSRF‑Token matching cookie.

## Observability (optional)

- `wrangler tail --env production --format=pretty` requires a token with tail permission.

- Look for service logs: `generate_start`, `r2_put_*`, `generate_success`, provider warnings.

## Rollback

- Disable CF Workers AI: set `WORKERS_AI_ENABLED="0"` (prod env vars) and redeploy.

- App continues to function for Replicate‑only flows per configuration.

## Acceptance Criteria

- Smoke tests pass (200 on generate, R2 200/403 gating, CSRF negative OK).

- UI real‑user flow completes; no console errors; security headers present.

- OpenAPI validated; SDXL default steps=20 applied.

- Runbook stored in repo with commands reproducible.

```text
