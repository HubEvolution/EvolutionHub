---
description: 'Admin API — Moderation, Status, Users, Plan, Credits, Discounts (secured)'
owner: 'API Team'
priority: 'high'
lastSync: '2025-11-28'
codeRefs: 'src/pages/api/admin/**, src/lib/api-middleware.ts, src/lib/rate-limiter.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Admin API

- Access: requires authenticated user with role `admin` (or `moderator` where noted).

- Security: Same‑Origin required for unsafe methods; Double‑Submit CSRF when enforced (`X-CSRF-Token` header must match `csrf_token` cookie).

- Rate limiting: reads use `apiRateLimiter` (30/min).
  - Schreibende Endpunkte verwenden in der Regel `sensitiveActionLimiter` (5/h),
    für bestimmte Admin‑Flows (z. B. Kommentar‑Moderation) wird der etwas großzügigere
    `adminSensitiveLimiter` (20/h) eingesetzt.

- Response format: `createApiSuccess({ data })` on success, `createApiError({ type, message, details? })` on error.
- Feature Flags / Env:
  - `INTERNAL_CREDIT_GRANT` (`"1"` = erlaubt) schützt Kredit-Anpassungen in Produktion.
  - `ENVIRONMENT=production` erzwingt zusätzliche Guards (z. B. Kredit-Anpassung nur mit Flag).
  - Rate-Limiter-Stände abrufbar über `/api/admin/rate-limits/state` (siehe unten).

## Status

GET `/api/admin/status`

- Returns snapshot for the current user (plan, credits, recent subscriptions).

- Role: admin

Example:

```bash
curl -i https://hub-evolution.com/api/admin/status \
  -H 'Cookie: __Host-session=<token>'

```text

## Users — Set Plan (Admin Override)

POST `/api/admin/users/set-plan`

- Body:
  - Pflicht: genau eines von `email` oder `userId`, sowie `plan` (`free|pro|premium|enterprise`)
  - Optional (Stripe‑Orchestrierung):
    - `interval`: `monthly|annual` (wählt Price‑Tabelle für bezahlte Pläne)
    - `prorationBehavior`: `create_prorations|none` (Proration bei Update)
    - `cancelAtPeriodEnd`: boolean (Downgrade→free: zum Periodenende kündigen; Standard)
    - `cancelImmediately`: boolean (Downgrade→free: sofort kündigen)
  - Optional: `reason` (Audit‑Notiz)

- Verhalten:
  - Paid→Paid: vorhandenes Abo wird auf neue Price (`interval`) umgestellt (Proration laut `prorationBehavior`), sonst neues Abo erstellt.
  - Any→Free: Abo wird gekündigt. Standard: zum Periodenende (`cancel_at_period_end=true`), sofortige Kündigung nur bei `cancelImmediately=true`.
  - Quelle der Wahrheit: Der Stripe‑Webhook (`/api/billing/stripe-webhook`) setzt `users.plan` final anhand des Subscription‑Status. Der Admin‑Endpoint schreibt nicht direkt den Plan.

- Headers: `X-CSRF-Token`, `Content-Type: application/json`, Same‑Origin erforderlich

- Role: admin; Rate‑Limit: sensitive (5/hour)

- Audit: schreibt `ADMIN_ACTION` (resource `user`, action `set_plan`, `{ from, to, reason }`)

Example:

```bash
# Upgrade (monatlich) mit Proration
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/users/set-plan \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"email":"user@example.com","plan":"pro","interval":"monthly","prorationBehavior":"create_prorations","reason":"support override"}'

# Downgrade auf free – sofortige Kündigung
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/users/set-plan \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"userId":"<user-id>","plan":"free","cancelImmediately":true,"reason":"requested by user"}'
```

## Discounts — Admin Discount Codes & Stripe Coupons

### Create Discount Code

POST `/api/admin/discounts/create`

- Body (Zod-validiert, `strict`):

  ```json
  {
    "code": "WELCOME2025",
    "stripeCouponId": "coupon_...", // optional
    "type": "percentage" | "fixed",
    "value": 10,
    "maxUses": 100,          // optional, null = unlimited
    "validFrom": 1731024000000, // optional (ms)
    "validUntil": 1733616000000, // optional (ms)
    "description": "Onboarding discount",
    "status": "active" | "inactive" | "expired" // optional, default active
  }
  ```

- Verhalten:

  - Legt einen Datensatz in `discount_codes` an (`code` unique, `stripe_coupon_id` initial leer oder gemappt).

  - `status` default `active`; `max_uses=null` bedeutet unbegrenzte Nutzung.

- Security:

  - Middleware: `withAuthApiMiddleware` mit `sensitiveActionLimiter` (5/h), CSRF enforced.

  - Role: admin.

- Response:

  ```json
  {
    "success": true,
    "data": {
      "discountCode": {
        "id": "disc_...",
        "code": "WELCOME2025",
        "stripeCouponId": "", // leer, solange kein Stripe-Coupon erzeugt wurde
        "type": "percentage",
        "value": 10,
        "maxUses": 100,
        "usesCount": 0,
        "validFrom": 1731024000000,
        "validUntil": 1733616000000,
        "status": "active",
        "description": "Onboarding discount",
        "createdBy": "usr_admin",
        "createdAt": 1731024000000,
        "updatedAt": 1731024000000
      }
    }
  }
  ```

### List Discount Codes

GET `/api/admin/discounts/list`

- Query-Parameter (Zod-validiert):

  - `status`: `active|inactive|expired` (optional)

  - `search`: Freitextfilter auf `code` (optional)

  - `isActiveNow`: boolean (optional; berücksichtigt Zeitfenster `valid_from/valid_until`)

  - `hasRemainingUses`: boolean (optional; filtert Codes mit verbleibenden Nutzungen, inkl. unlimited)

  - `limit`: 1..100 (Standard 25)

  - `cursor`: Opaque Cursor (`created_at`-basiert)

- Response (`200`): `{ success, data: { items: DiscountCode[], pagination } }`

- Security: `withAuthApiMiddleware` + `apiRateLimiter` (30/min), Role admin.

### Create Stripe Coupon for Discount

POST `/api/admin/discounts/{id}/create-stripe-coupon`

- Zweck: Erzeugt einen Stripe-Coupon zu einem bestehenden Discount-Code, der noch keine `stripe_coupon_id` besitzt.

- Verhalten:

  - Lädt Discount aus `discount_codes` (per ID). Fehlerfälle: `not_found`, Tabelle fehlt.

  - Validiert Rabattwert:
    - `type=percentage`: `1..100` Prozent.
    - `type=fixed`: positiver Betrag in EUR; wird als `amount_off` in Cent an Stripe übergeben.

  - Erzeugt Stripe-Coupon (einmalig, `duration='once'`) über `Stripe.coupons.create(...)`.

  - Persistiert `stripe_coupon_id` im Discount (`stripe_coupon_id` + `updated_at`).

- Security:

  - Middleware: `withAuthApiMiddleware` mit CSRF und `sensitiveActionLimiter`.

  - Role: admin.

- Error-Codes:

  - `validation_error`: z. B. Discount bereits mit `stripe_coupon_id` belegt oder ungültiger Wert.

  - `not_found`: Discount nicht vorhanden oder Tabelle nicht provisioniert.

  - `server_error`: Stripe-Fehler oder DB-Update fehlgeschlagen.

## Users — Summary Lookup

GET `/api/admin/users/summary?email=<email>|id=<userId>`

- Returns user basics, subscription (if any) and credits balance.

- Role: admin

Example:

```bash
curl -i "https://hub-evolution.com/api/admin/users/summary?email=someone%40example.com" \
  -H 'Cookie: __Host-session=<token>'

```bash

## Credits — Grant

POST `/api/admin/credits/grant`

- Body: `{ email: string, amount?: number }` (amount in credits; default from server config)

- Headers: `X-CSRF-Token` (Double‑Submit), `Content-Type: application/json`

- Role: admin

Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/credits/grant \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"email":"user@example.com","amount":1000}'
```

## Comments

### List

GET `/api/admin/comments`

- **Filter/Query‑Parameter**
  - `status`: `pending|approved|rejected|flagged|hidden|all` (Standard: `all`)
  - `entityType`: `blog_post|project|general` (optional)
  - `entityId`: ID/Slug der Entität (optional)
  - `authorId`: User‑ID des Autors (optional)
  - `q`: Freitextsuche über Kommentar‑Inhalt, gespeicherten Autor‑Namen/-E‑Mail und
    verknüpfte `users.name`/`users.email` (optional)
  - `limit`: 1..100 (Standard 12)
  - `offset`: Offset für klassische Pagination
  - `includeReports`: `true|false` – wenn `true`, werden aggregierte Report‑Zahlen je Kommentar
    zurückgegeben (Total/Pending).

- **Antwort:**

  ```json
  {
    "success": true,
    "data": {
      "comments": [
        {
          "id": "…",
          "content": "…",
          "author": { "id": "…", "email": "…", "name": "…" },
          "entityType": "blog_post",
          "entityId": "ki-als-kollege",
          "status": "approved|pending|rejected|flagged|hidden",
          "createdAt": "2025-11-28T10:00:00.000Z",
          "updatedAt": "2025-11-28T10:15:00.000Z",
          "reports": { "total": 3, "pending": 1 }
        }
      ],
      "stats": {
        "total": 42,
        "pending": 3,
        "approved": 30,
        "rejected": 5,
        "flagged": 2,
        "hidden": 2
      },
      "pagination": { "limit": 12, "offset": 0, "count": 12 },
      "filters": {
        "status": "all",
        "entityType": "blog_post",
        "entityId": "ki-als-kollege"
      }
    }
  }
  ```

- **Role:** moderator or admin

### Details

GET `/api/admin/comments/{id}`

- Returns comment with admin metadata.

- Role: moderator or admin

### Moderate

POST `/api/admin/comments/{id}/moderate`

- Body: `{ action: "approve"|"reject"|"flag"|"hide", reason?: string, notifyUser?: boolean }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

- Rate limit: `adminSensitiveLimiter` (20/hour)

- Role: moderator or admin

Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/comments/COMMENT_ID/moderate \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"action":"approve","reason":"OK"}'

```bash

### Bulk Moderate

POST `/api/admin/comments/bulk-moderate`

- Body: `{ commentIds: string[], action: same as above, reason?: string }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

- Rate limit: sensitive (5/hour)

- Role: moderator or admin

Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/comments/bulk-moderate \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"commentIds":["c1","c2"],"action":"reject","reason":"TOS"}'
```

### Delete (Soft‑Hide)

DELETE `/api/admin/comments/{id}`

- Body (optional): `{ reason?: string, notifyUser?: boolean }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

- Rate limit: sensitive (5/hour)

- Role: moderator or admin

Example:

```bash
CSRF=abc123
curl -i -X DELETE https://hub-evolution.com/api/admin/comments/COMMENT_ID \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"reason":"Removed for policy"}'

```text

## Metrics

GET `/api/admin/metrics`

- Returns live metrics (active sessions/users, totals, 24h counters).
- Role: admin

## Audit Logs

### List

GET `/api/admin/audit/logs`

- Query params (all optional):
  - `userId`: filter by actor user id
  - `eventType`: `API_ACCESS|ADMIN_ACTION|SECURITY_EVENT`
  - `from` / `to`: Unix ms timestamps for created_at range
  - `limit`: default 50, clamps 1..200
  - `cursor`: opaque cursor from previous response
- Role: admin; Rate limit: `apiRateLimiter`
- Response: `{ success, data: { items, nextCursor } }`

### Details

GET `/api/admin/audit/logs/{id}`

- Returns a single audit log entry (or 404 if missing).
- Role: admin; Rate limit: `apiRateLimiter`

## Referrals — Events List

GET `/api/admin/referrals/list`

- Feature Flag: `ENABLE_REFERRAL_REWARDS` muss aktiv sein (
  Env `ENABLE_REFERRAL_REWARDS=1`).
- Role: admin, Middleware: `withAuthApiMiddleware` inkl. `apiRateLimiter` (30/min).
- Query-Parameter (alle optional):
  - `status`: `pending|verified|paid|cancelled|all` (Standard: `all`)
  - `ownerUserId`: Filter auf Referral-Owner
  - `referralCode`: exakter Referral-Code, sanitized (`sanitizeReferralCode`)
  - `limit`: 1..100 (Standard 25)
  - `offset`: klassische Pagination (Fallback, wenn `cursor` nicht genutzt wird)
  - `cursor`: Opaque Cursor (`nextCursor` aus vorheriger Response)
- Response (`200`):

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "refevt_...",
        "status": "verified",
        "referralCode": "lucas-123",
        "creditsAwarded": 200,
        "occurredAt": "2025-11-07T17:21:00.000Z",
        "owner": {
          "userId": "usr_admin",
          "email": "owner@example.com",
          "name": "Owner Name"
        },
        "referred": {
          "userId": "usr_referred",
          "email": "friend@example.com"
        },
        "metadata": {
          "stripeCheckoutId": "cs_test_123"
        }
      }
    ],
    "stats": {
      "pending": 2,
      "verified": 5,
      "paid": 3,
      "cancelled": 1,
      "total": 11
    },
    "pagination": {
      "count": 11,
      "hasMore": false,
      "nextCursor": null
    },
    "filters": {
      "status": "verified",
      "ownerUserId": "usr_admin"
    }
  }
}
```

- Fehlerfälle:
  - `auth_error` (401) wenn Session fehlt oder kein Admin
  - `forbidden` (403) wenn Feature Flag deaktiviert
  - `validation_error` für ungültige Filter (z. B. Status nicht in Allowlist)

## Referrals — Summary

GET `/api/admin/referrals/summary`

- Feature Flag: `ENABLE_REFERRAL_REWARDS=1`
- Role: admin, Middleware inkl. `apiRateLimiter`
- Antwort (`200`):

```json
{
  "success": true,
  "data": {
    "stats": {
      "totals": {
        "totalEvents": 42,
        "totalCredits": 8600,
        "ownerCount": 18,
        "referredCount": 27
      },
      "breakdown": {
        "pending": 5,
        "verified": 21,
        "paid": 12,
        "cancelled": 4
      }
    },
    "recentEvents": [
      {
        "id": "refevt_123",
        "status": "paid",
        "referralCode": "lucas-123",
        "creditsAwarded": 400,
        "occurredAt": 1731024000000,
        "owner": {
          "userId": "usr_admin",
          "email": "admin@hub-evolution.com"
        },
        "referred": {
          "userId": "usr_customer",
          "email": "customer@example.com"
        }
      }
    ],
    "topOwners": [
      {
        "userId": "usr_top",
        "email": "champ@example.com",
        "name": "Champion",
        "eventCount": 6,
        "totalCredits": 1200,
        "lastEventAt": 1731024000000
      }
    ]
  }
}
```

- Fehlerfälle: Analog zur Liste (`auth_error`, `forbidden`, `server_error`)

Die Summary wird im Admin-Dashboard als „Referral Insights“-Card gerendert.@src/pages/admin/index.astro#472-620

## Referrals — Update Status

POST `/api/admin/referrals/update-status`

- Feature Flag: `ENABLE_REFERRAL_REWARDS=1`
- Role: admin; Rate limit: sensitive (5/hour); CSRF enforced
- Body (validated via Zod):

```json
{
  "referralEventId": "refevt_...",
  "action": "mark_paid" | "cancel",
  "reason": "optional admin note"
}
```

- Behaviour:
  - `mark_paid` → credits awarded, logs admin action; errors: `already_paid`, `not_found`
  - `cancel` → cancels reward; errors: `already_cancelled`, `not_found`
- Response: `{ success, data: { status, referralEventId } }`

## Traffic (24h)

GET `/api/admin/traffic-24h`

- Returns Cloudflare traffic for the last 24 hours.
- Payload: `{ pageViews: number, visits: number, from: ISO, to: ISO, series?: Array<{ t: string, pageViews?: number, visits?: number }> }`

- Query: `?series=1` to include a 24‑point series for a sparkline.

- Role: admin

Example:

```bash
curl -i "https://hub-evolution.com/api/admin/traffic-24h?series=1" \
  -H 'Cookie: __Host-session=<token>'
```

---

## Backup

- Access: admin

- Security: Same‑Origin for unsafe. CSRF required on POST (`X-CSRF-Token` must match `csrf_token` cookie).

- Rate limiting: reads `apiRateLimiter` (30/min), writes `sensitiveActionLimiter` (5/hour).

### Jobs

GET `/api/admin/backup/jobs?limit=50`

- Returns recent backup jobs (desc by `startedAt`).

Example:

```bash
curl -i "https://hub-evolution.com/api/admin/backup/jobs?limit=50" \
  -H 'Cookie: __Host-session=<token>'

```text

GET `/api/admin/backup/jobs/{id}`

- Returns a single job by ID.

GET `/api/admin/backup/jobs/{id}/progress`

- Returns a progress snapshot for a job.

### Maintenance

GET `/api/admin/backup/maintenance/jobs?limit=50`

- Returns recent maintenance jobs (cleanup/optimization/migration/repair).

GET `/api/admin/backup/maintenance/jobs/{id}`

- Returns a single maintenance job by ID.

### Stats

GET `/api/admin/backup/stats`

- Aggregated stats (totals, completed/failed/running counts, size, jobsByType).

### Create

POST `/api/admin/backup/create`

- Body: `{ type: string, tables?: string[] }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/backup/create \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"type":"full","tables":["users","comments"]}'
```

### Schedule

POST `/api/admin/backup/schedule`

- Body: `{ type: string, cronExpression: string }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

### Perform Maintenance

POST `/api/admin/backup/maintenance/perform`

- Body: `{ type: "cleanup"|"optimization"|"migration"|"repair", description: string }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

### Cleanup

POST `/api/admin/backup/cleanup`

- Body: `{ retentionDays?: number }` (default 30, max 365)

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

### Verify

POST `/api/admin/backup/verify/{id}`

- Verifies checksum/integrity of a completed backup.

- Headers: `X-CSRF-Token`

## Rate Limits

### State

GET `/api/admin/rate-limits/state`

- Optional query param `name` filters a specific limiter.
- Response shape mirrors `getLimiterState()` result: `{ [limiterName]: { maxRequests, windowMs, entries[] } }`
- Role: admin; Rate limit: `apiRateLimiter`

### Reset

POST `/api/admin/rate-limits/reset`

- Body:

```json
{
  "name": "limiterName",
  "key": "limiterKey"
}
```

- CSRF required, Same-Origin enforced; Rate limit: sensitive (5/hour)
- Response: `{ success, data: { reset: true } }`

## Users Summary

GET `/api/admin/users/summary?email=<email>` or `?id=<userId>`

- Returns user core info, latest subscription snapshot, and credits balance.

- Access: admin

Example:

```bash
curl -i "https://hub-evolution.com/api/admin/users/summary?email=someone@example.com" \
  -H 'Cookie: __Host-session=<token>'

```bash

## Credits — Grant

POST `/api/admin/credits/grant`

- Body (strict Zod-Validierung):

```json
{
  "email": "user@example.com",
  "amount": 1000
}
```

- `email`: Pflicht, `includes('@')`
- `amount`: optional, Standard 1000 Credits; wird auf `1..100000` geclamped (Ganzzahl)

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

- Access: admin; feature‑gated by `INTERNAL_CREDIT_GRANT`

- Audit-Log: `ADMIN_ACTION` (`resource=credits`, `action=credit_grant`, Details JSON mit `email`, `userId`, `amount`, `packId`).

- Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/credits/grant \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"email":"someone@example.com","amount":1000}'
```

## Credits — Deduct

POST `/api/admin/credits/deduct`

- Body:

```json
{
  "email": "user@example.com",
  "amount": 500,
  "idempotencyKey": "manual-case-42",
  "strict": true
}
```

- `amount`: Pflicht, clamp 1..100000 Credits (Ganzzahl).
- `strict`: Standard `true`; bei `true` wird der aktuelle Kontostand geprüft (`insufficient_credits`).
- `idempotencyKey`: optional; wird auf 64 Zeichen gekappt, sonst auto-generiert.

- Headers: `X-CSRF-Token`, `Content-Type: application/json`
- Access: admin; `INTERNAL_CREDIT_GRANT` muss für Prod aktiviert sein.
- Response: `{ success, data: { requested, deducted, remainingTenths, balance, jobId, breakdown, idempotent } }`
- Audit-Log: `ADMIN_ACTION` (`action=credit_deduct`, Details inkl. `requested`, `deducted`, `strict`, `jobId`).

## Credits — Usage

GET `/api/admin/credits/usage?userId=<uuid>`

- Query: `userId` (Pflicht, string)
- Antwort: `{ success, data: { userId, balance, tenths } }`
- Rolle: admin
- Rate-Limiter: `apiRateLimiter`
- Fehler:
  - `validation_error` (fehlender/leer userId)
  - `not_found` falls Nutzer nicht existiert

## Credits — History

GET `/api/admin/credits/history?userId=<uuid>&limit=50&cursor=<opaque>`

- Query Validierung via Zod: `userId` Pflicht, `limit` 1..100, `cursor` optional.
- Antwort: `{ success, data: { items: [{ id, unitsTenths, createdAt, expiresAt }, ...] } }`
- Rolle: admin; Rate-Limiter `apiRateLimiter`

## Users — Sessions

GET `/api/admin/users/sessions?userId=<uuid>`

- Returns up to 200 active sessions for a user, ordered by `expiresAt` desc.
- Role: admin; Rate limit: `apiRateLimiter`
- Validation: `userId` mandatory; errors: `validation_error`, `server_error`

## Users — Revoke Sessions

POST `/api/admin/users/revoke-sessions`

- Body (JSON): `{ userId?: string, sessionId?: string }` — at least one required
- CSRF enforced, Same-Origin required; Rate limit: sensitive (5/hour)
- Deletes matching rows from `sessions`; response `{ success, data: { deleted } }`

## IP Geo Lookup

GET `/api/admin/ip-geo?ip=<ipv4|ipv6>`

- Role: admin; Rate limit: `apiRateLimiter`
- When `ip` omitted, uses `CF-Connecting-IP`/`X-Forwarded-For`; invalid IP returns empty location but still `success: true`
- Response: `{ success, data: { city, country, display, ip } }`

## See also

- `docs/api/api-guidelines.md` (middleware, headers, shapes)

- `openapi.yaml` for machine-readable specs
