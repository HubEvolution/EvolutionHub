---
description: 'Admin API — Moderation, Status, Users, Credits (secured)'
owner: 'API Team'
lastSync: '2025-10-28'
codeRefs: 'src/pages/api/admin/**, src/lib/api-middleware.ts'
---

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
```

## Users — Summary Lookup

GET `/api/admin/users/summary?email=<email>|id=<userId>`

- Returns user basics, subscription (if any) and credits balance.
- Role: admin

Example:

```bash
curl -i "https://hub-evolution.com/api/admin/users/summary?email=someone%40example.com" \
  -H 'Cookie: __Host-session=<token>'
```

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
```

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
```

## Metrics

GET `/api/admin/metrics`

- Returns live metrics (active sessions/users, totals, 24h counters).
- Role: admin

---

## See also

- `docs/api/api-guidelines.md` (middleware, headers, shapes)
- `openapi.yaml` for machine‑readable specs
