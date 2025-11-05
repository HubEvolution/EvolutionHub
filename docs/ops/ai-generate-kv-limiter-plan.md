---
description: 'Plan für KV/Durable Object Limiter von /api/ai-image/generate (deterministische 429)'
owner: 'Platform Team'
priority: 'high'
lastSync: '2025-11-04'
codeRefs: 'src/lib/rate-limiter.ts, src/pages/api/ai-image/generate.ts, wrangler.toml, workers/edge/do/rate-limiter.ts'
---

<!-- markdownlint-disable MD051 -->

# Plan: KV/Durable Object–backed limiter for /api/ai-image/generate

Goal: Deterministic 429s in production regardless of multi‑edge routing by sharing counters across isolates.

## Requirements

- Preserve current API middleware contract (returns 429 with `Retry-After`).

- Low latency under normal load (single increment + read per request).

- Resilient to occasional KV eventual consistency; prefer Durable Object (DO) for strictness, but allow KV fallback.

## Design Options

### A) Durable Object (preferred)

- One DO instance keyed by a stable shard, e.g., `rate:aiGenerate:<ip>` or `rate:aiGenerate:<owner>`.

- On request:

  - Compute key (IP + ownerType+ownerId suffix to reduce hot keys).

  - `state.storage.get(key)`, mutate `{count, resetAt}`, `put` with TTL.

  - Return `429 + Retry-After` when `count >= maxRequests`.

- Pros: strong consistency; simple semantics.

- Cons: DO provisioning + binding required.

### B) KV with script-side locking (acceptable)

- Key format: `rl:aiGenerate:<ip>`; value `{count, resetAt}`.

- Use `get` + compare-and-swap via `if-match` ETag (KV supports conditional writes via `If-Match` header in REST; Pages/Workers API requires fetch to KV REST). If conditional not feasible in this stack, accept minor race and slightly over‑admit during split‑brain.

- Pros: easy to add.

- Cons: eventual consistency; possible under/over limiting.

## Sharding Key

- Default: IP address from `context.clientAddress`.

- Augment with ownerType/ownerId to reduce hot‑spotting: `ip|ownerType|ownerId[:/24]`.

## Config

- Window: 60s; Limit: 15 (as today).

- Headers: always include `Retry-After` seconds when 429.

## Implementation Sketch (DO)

1. Add DO binding in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "DO_RATE"
class_name = "RateLimiterDO"

[migrations]
bindings = [
  { name = "DO_RATE", class_name = "RateLimiterDO" }
]

```text

1. Create `workers/edge/do/rate-limiter.ts`:

```ts
export class RateLimiterDO {
  constructor(state: DurableObjectState, env: Env) { this.state = state }
  async fetch(req: Request) { /* increment + return JSON {ok, retryAfter?} */ }
}
```

1. In `src/lib/rate-limiter.ts`, add `aiGenerateLimiterDO(context)` that calls DO fetch with key computed from IP/owner, returns Response when limited or `{success:true}` otherwise.
1. Swap `aiGenerateLimiter` usage in `withApiMiddleware` options for `/api/ai-image/generate` to the DO-backed version (guarded by env flag `AI_LIMITER_DO=1`).

## Implementation Sketch (KV fallback)

- Keys: `rl:aiGenerate:<shard>`; value `{count, resetAt}`.

- Use `KV_AI_ENHANCER` store; `get/put` with TTL; tolerate small race.

- Reuse existing `getLimiterState` tooling for debugging by exposing an inspection endpoint under admin.

## Testing

- Unit: counter math, reset boundary conditions.

- Integration: burst 20 requests with single edge (dev) → expect 429; verify `Retry-After` monotonic.

- E2E (staging): small burst from one agent → 429 deterministically.

## Rollout

- Phase 1 (staging): `AI_LIMITER_DO=1` → verify; else fall back to KV.

- Phase 2 (prod): enable flag; monitor logs; keep in‑memory as secondary guard.

## Risks & Mitigations

- DO hot‑spot: shard by /24 and owner to spread load.

- KV eventual consistency: accept slight over‑admit; keep window low.

- Backoff: ensure clients respect `Retry-After` header; document in API.

## Acceptance

- 429 reproducible with single client under burst in production.

- `Retry-After` present and accurate; logs confirm limiter decisions.

- No material latency regression under normal load.
