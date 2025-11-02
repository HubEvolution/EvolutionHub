---
description: 'Admin API — Moderation, Status, Users, Plan, Credits (secured)'
owner: 'API Team'
lastSync: '2025-10-31'
codeRefs: 'src/pages/api/admin/**, src/lib/api-middleware.ts'
---

<!-- markdownlint-disable MD051 -->

# Admin API

- Access: requires authenticated user with role `admin` (or `moderator` where noted).

- Security: Same‑Origin required for unsafe methods; Double‑Submit CSRF when enforced (`X-CSRF-Token` header must match `csrf_token` cookie).

- Rate limiting: reads use `apiRateLimiter` (30/min), writes use `sensitiveActionLimiter` (5/hour).

- Response format: `createApiSuccess({ data })` on success, `createApiError({ type, message })` on error.

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

- Body: `{ email?: string, userId?: string, plan: "free"|"pro"|"premium"|"enterprise", reason?: string }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`, Same‑Origin required

- Role: admin; Rate‑Limit: sensitive (5/hour)

- Audit: writes `ADMIN_ACTION` (resource `user`, action `set_plan`, `{ from, to, reason }`)

- Hinweis: Aktive Stripe‑Subscription‑Webhooks können den Plan später überschreiben.

Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/users/set-plan \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"email":"user@example.com","plan":"pro","reason":"support override"}'
```

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

- Filters: `status`, `entityType`, `entityId`, `authorId`, `limit`, `offset`, `includeReports`

- Role: moderator or admin

### Details

GET `/api/admin/comments/{id}`

- Returns comment with admin metadata.

- Role: moderator or admin

### Moderate

POST `/api/admin/comments/{id}/moderate`

- Body: `{ action: "approve"|"reject"|"flag"|"hide", reason?: string, notifyUser?: boolean }`

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

- Rate limit: sensitive (5/hour)

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

## Users Summary

GET `/api/admin/users/summary?email=<email>` or `?id=<userId>`

- Returns user core info, latest subscription snapshot, and credits balance.

- Access: admin

Example:

```bash
curl -i "https://hub-evolution.com/api/admin/users/summary?email=someone@example.com" \
  -H 'Cookie: __Host-session=<token>'

```bash

## Credits Grant

POST `/api/admin/credits/grant`

- Body: `{ email: string, amount?: number }` (credits; default 1000)

- Headers: `X-CSRF-Token`, `Content-Type: application/json`

- Access: admin; feature‑gated by `INTERNAL_CREDIT_GRANT`

Example:

```bash
CSRF=abc123
curl -i -X POST https://hub-evolution.com/api/admin/credits/grant \
  -H 'Origin: https://hub-evolution.com' \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -H "Cookie: csrf_token=$CSRF; __Host-session=<token>" \
  --data '{"email":"someone@example.com","amount":1000}'
```

## See also

- `docs/api/api-guidelines.md` (middleware, headers, shapes)

- `openapi.yaml` for machine-readable specs
