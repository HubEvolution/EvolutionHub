<!-- markdownlint-disable MD051 -->

# Cloudflare Cache Rules — CI & Staging

## Summary

This document records the cache rules configured via Cloudflare Rulesets for our CI and Staging hosts. We use plan‑compatible expressions (no `matches` operator) and restrict rules by host to avoid impacting Production.

- Host: `ci.hub-evolution.com`

  - Session bypass (cookies)

  - Login/Dashboard/Welcomes bypass

  - API bypass

  - Manual bypass via `__no_cache`

- Host: `staging.hub-evolution.com`

  - API bypass

  - Manual bypass via `__no_cache`

Ruleset Phase: `http_request_cache_settings`
Ruleset ID (current zone): see verify step below.

## CI Rules (active)

1. Session bypass

```text
(http.host eq "ci.hub-evolution.com")
and ((http.cookie contains "session_id=") or (http.cookie contains "__Host-session="))

```text

Action: set_cache_settings → `{ cache: false }`

1. Login/Dashboard/Welcomes bypass

```text
(http.host eq "ci.hub-evolution.com")
and (
  (http.request.uri.path eq "/en/login" or starts_with(http.request.uri.path, "/en/login/")
   or http.request.uri.path eq "/de/login" or starts_with(http.request.uri.path, "/de/login/")
  )
  or starts_with(http.request.uri.path, "/dashboard")
  or starts_with(http.request.uri.path, "/welcome")
  or starts_with(http.request.uri.path, "/welcome-profile")
)
```

Action: `{ cache: false }`

1. API bypass

```text
(http.host eq "ci.hub-evolution.com")
and starts_with(http.request.uri.path, "/api/")

```text

Action: `{ cache: false }`

1. Manual bypass via query flag

```text
(http.host eq "ci.hub-evolution.com")
and (http.request.uri.query contains "__no_cache")
```

Action: `{ cache: false }`

## Staging Rules (Option A — active)

1. API bypass

```text
(http.host eq "staging.hub-evolution.com")
and starts_with(http.request.uri.path, "/api/")

```text

Action: `{ cache: false }`

1. Manual bypass via query flag

```text
(http.host eq "staging.hub-evolution.com")
and (http.request.uri.query contains "__no_cache")
```

Action: `{ cache: false }`

## API Playbook

Prereqs:

- API Token with permissions:

  - Zone → Cache Rules: Edit

  - Zone → Zone: Read

  - Account → Rulesets: Edit

  - Account → Filter Lists: Edit

- Env:

```bash
export TOKEN='...'
export ZONE_ID='14c984ebb05270de08cb82d316f1ba36'
BASE='https://api.cloudflare.com/client/v4'

```bash

Resolve ruleset id:

```bash
RID=$(curl -fsS -H "Authorization: Bearer $TOKEN" \
  "$BASE/zones/$ZONE_ID/rulesets" \
  | jq -r '.result[] | select(.phase=="http_request_cache_settings" and .kind=="zone") | .id' \
  | head -n1)
```

List rules (compact):

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" \
  "$BASE/zones/$ZONE_ID/rulesets/$RID" \
  | jq '.result.rules | map({desc: .description, expr: .expression})'

```bash

Update rules (append):

1. Backup existing rules

```bash
curl -fsS -H "Authorization: Bearer $TOKEN" \
  "$BASE/zones/$ZONE_ID/rulesets/$RID" > ruleset-current.json
jq '.result.rules' ruleset-current.json > existing-rules.json
```

1. Prepare new rules JSON (see sections above)
1. Merge and PUT

```bash
jq -s '{rules: (.[0] + .[1])}' existing-rules.json new-rules.json > update-payload.json
curl -sS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data @update-payload.json "$BASE/zones/$ZONE_ID/rulesets/$RID" \
  | jq '.success,.errors'

```bash

## Verification

- API (GET; HEAD often omitted):

```bash
curl -sD - 'https://staging.hub-evolution.com/api/health' -o /dev/null \
  | egrep -i 'HTTP/|cf-cache-status|cache-control'
```

- Static asset (best shows CF-Cache-Status):

```bash

# without manual bypass

curl -sI 'https://staging.hub-evolution.com/favicon.ico' \
  | egrep -i 'HTTP/|cf-cache-status|age'

# with manual bypass

curl -sI 'https://staging.hub-evolution.com/favicon.ico?__no_cache=1' \
  | egrep -i 'HTTP/|cf-cache-status|age'

```text

## Notes & Constraints

- Free plan does not permit `matches` operator; use `eq`/`starts_with`/`contains`.

- Host scoping ensures Production remains unaffected.

- For Worker/SSR responses, `CF-Cache-Status` may be absent even when a bypass rule exists; confirm via ruleset listing or test with static assets.

- Rotate tokens after use.

```text
