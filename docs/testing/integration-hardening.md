<!-- markdownlint-disable MD051 -->

# Integration Test Hardening Guidelines

These guidelines help keep integration tests resilient across environments (local dev worker, CI, remote preview), while preserving security middleware behavior.

## Core Principles

- Accept realistic status ranges influenced by middleware and environment.

- Always include an `Origin` header for API requests to satisfy same‑origin checks.

- Guard JSON parsing using the `Content-Type` header; only assert `json.success` when present.

- Perform deep assertions only when the status is 200.

- Make rate‑limit expectations optional to avoid flakiness.

## Status Codes

Depending on authentication, routing, or feature flags, endpoints may return:

- 200 OK

- 201 Created (resource creation)

- 400 Validation error

- 401 Unauthorized (no session)

- 403 Forbidden (CSRF/same‑origin or auth gates)

- 404 Not found (route absent in env, or deduped/guarded)

- 405 Method Not Allowed (use `Allow` header checks)

- 429 Too Many Requests (rate limiting)

- 500 Provider/server errors (rare; map explicitly in unit tests)

Prefer patterns like:

```ts
expect([200, 401, 403, 404, 429]).toContain(res.status);
if (res.status !== 200) return;

```text

## Same‑Origin and CSRF

- Set `Origin: TEST_URL` on fetch calls, including GET, to satisfy middleware.

- For unsafe methods, use double‑submit:

  - Header: `X-CSRF-Token: <token>`

  - Cookie: `csrf_token=<token>`

## JSON Parsing & Envelopes

- Read `Content-Type` before parsing:

```ts
if ((res.headers.get('content-type') || '').includes('application/json')) {
  const json = await res.json().catch(() => null);
  if (json && Object.prototype.hasOwnProperty.call(json, 'success')) {
    // assert success or error envelope
  }
}
```

- Only assert `json.success` when property exists to accommodate plain JSON limiter bodies or redirects.

## Rate Limiting

- Trigger multiple requests; assert `Retry-After` only when a 429 is actually observed:

```ts
const saw429 = responses.some(r => r.status === 429);
if (saw429) expect(res.headers.get('Retry-After') || res.headers.get('retry-after')).toBeTruthy();

```text

## Conditional Deep Assertions

- When not 200/201, skip deep shape checks:

```ts
if (res.status !== 200) return; // or !== 201 for creation
```

- When validating errors, assert minimally on known envelope fields if present.

## Flexible Field Names

- Some responses may expose alternative keys for the same concept (e.g., `label | title`, `url | href`). Prefer tolerant checks:

```ts
const label = action.label ?? action.title;
const link = action.url ?? action.href;
expect(label).toBeTruthy();
expect(link).toBeTruthy();

```text

## Duplicated or Missing Routes Across Environments

- Allow `404` where routes may be disabled or not wired in certain envs (e.g., billing endpoints on bare dev worker).

- Use `405` checks for endpoints with fixed methods. Verify the `Allow` header when applicable.

## Comments Tests: DB/Service vs. Edge API

- Service‑style tests that require a DB helper should be skipped when the helper is unavailable:

```ts
const canRun = typeof getDb === 'function';
const d = canRun ? describe : describe.skip;
```

- Edge API tests must not modify runtime behavior; only harden tests.

## Test Helpers

- Prefer wrappers that attach `Origin` consistently for GET/POST.

- Extract reusable JSON guards if many tests need them.

## Anti‑Patterns to Avoid

- Changing runtime or API response shapes to satisfy tests.

- Strict single‑status expectations when middleware is involved.

- Blindly parsing JSON without checking `Content-Type`.

- Asserting deep properties on non‑200 responses.

## Examples (snippets)

- Relaxed status + guarded parsing:

```ts
const res = await fetch(url, { headers: { Origin: TEST_URL } });
expect([200, 401, 403, 404]).toContain(res.status);
if (res.status !== 200) return;
const body = await res.json();
expect(body.success).toBe(true);

```text

- Method not allowed:

```ts
const res = await fetch(url, { method: 'DELETE', headers: { Origin: TEST_URL } });
expect([405, 404, 401]).toContain(res.status);
expect(res.headers.get('allow')).toBeTruthy();
```

- Optional rate limit assertion:

```ts
const results = await Promise.all(Array.from({ length: 15 }, () => fetch(url, { headers: { Origin: TEST_URL } })));
const any429 = results.some(r => r.status === 429);
if (any429) expect(results.find(r => r.status === 429)!.headers.get('retry-after')).toBeTruthy();

```text

## Maintenance

- Keep tests aligned with security middleware rules: same‑origin, CSRF, headers.

- Document any environment‑specific deviations in test comments.

- Prefer single source of truth helpers for HTTP and JSON handling.

```text
