---
description: 'Architektur des Prompt Enhancers (Service, Limits, UI)'
owner: 'Prompt Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/lib/services/prompt-enhancer-service.ts, src/pages/api/prompt/**'
---

<!-- markdownlint-disable MD051 -->

# Prompt Enhancer – Architecture

---

## Purpose

Transform raw user text (optionally with attachments) into a clear, agent‑ready prompt. Enforce security (CSRF/Same‑Origin), quotas, and consistent API shapes. Operates in Cloudflare Worker runtime.

---

## High‑level Flow

1. API handler: `POST /api/prompt-enhance` (src/pages/api/prompt-enhance.ts)

   - withApiMiddleware: Same‑Origin + Double‑Submit CSRF, rate limiter (15/min), headers/logging

   - Parses request: JSON (text‑only) or multipart (with files)

   - Validates: text 1–1000 chars; files (type/size/count)

   - Detects owner (user|guest via cookie)

   - Builds service env from runtime

   - Calls `PromptEnhancerService.enhance`

   - Maps result to response: `data.enhancedPrompt`, `safetyReport`, `usage`, `limits`

   - Error mapping: 400 validation_error, 403 forbidden (feature/quota), 429 rate limit, 500 server_error

1. Service: `PromptEnhancerService` (src/lib/services/prompt-enhancer-service.ts)

   - Flags/env: PUBLIC_PROMPT_ENHANCER_V1, PROMPT_REWRITE_V1, ENABLE_PROMPT_SAFETY, OPENAI_API_KEY

   - Quotas via KV (rolling 24h when USAGE_KV_V2=1): PROMPT_USER_LIMIT, PROMPT_GUEST_LIMIT

   - Pipeline

     - parseInput: heuristic + optional AI intent classification

     - applySafety: mask PII (email, phone, address, id) on input

     - rewrite (LLM path): Chat Completions (text/vision) or Responses (file_search for PDFs)

     - fallback: deterministic structured prompt (role/objective/constraints/steps/examples)

     - scoring (optional): clarity/specificity/testability

   - Usage increment: returns `{ used, limit, resetAt }`

   - Metrics: increments path counters (text/vision/file_search)

1. Attachments (src/lib/services/prompt-attachments.ts)

   - Validation: ALLOWED_TYPES, MAX_FILES, MAX_FILE_BYTES

   - Build context: images → data URLs; text → clamped snippets; PDFs → file refs

   - Upload PDFs to OpenAI Files for Responses API (file_search)

1. Usage endpoint: `GET /api/prompt/usage` (src/pages/api/prompt/usage.ts)

   - Resolves effective limit from env + ownership

   - Returns `{ ownerType, usage, limits, plan?, entitlements? }`

   - Sets headers: X‑Usage‑OwnerType, X‑Usage‑Limit

---

## Configuration (SSoT)

- Models: PROMPT_TEXT_MODEL (default gpt-4o-mini), PROMPT_VISION_MODEL (gpt-4o-mini)

- Generation: PROMPT_OUTPUT_TOKENS_MAX (400), PROMPT_TEMPERATURE (0.2), PROMPT_TOP_P (0.9)

- Attachments: PROMPT_MAX_FILES (3), PROMPT_MAX_FILE_BYTES (5MB), PROMPT_ALLOWED_TYPES

- Quotas: PROMPT_USER_LIMIT (20), PROMPT_GUEST_LIMIT (5), USAGE_KV_V2 (1)

- Flags: PUBLIC_PROMPT_ENHANCER_V1 (true), PROMPT_REWRITE_V1 (true), ENABLE_PROMPT_SAFETY (true)

- Storage: KV_PROMPT_ENHANCER (KV namespace)

---

## Security

- Same‑Origin for unsafe methods enforced by `withApiMiddleware`

- Double‑Submit CSRF: header `X‑CSRF‑Token` must match `csrf_token` cookie

- Response security headers applied by middleware

---

## API Contracts (excerpt)

- POST /api/prompt-enhance

  - Request JSON: `{ text: string(1..1000), mode?: 'agent'|'concise' }`

  - Request multipart: `text(1..1000)`, optional `mode`, `files[]`

  - 200: `{ success: true, data: { enhancedPrompt, safetyReport?, usage, limits } }`

- GET /api/prompt/usage

  - 200: `{ success: true, data: { ownerType, usage, limits } }` + headers

See openapi.yaml for full schema.

---

## Error Mapping

- Provider errors normalized via `buildProviderError`

- 401/403 → forbidden, other 4xx → validation_error, 5xx → server_error

- Quota exceeded returns 403 with `details` (usage)

---

## Telemetry

- Client events: `prompt_enhance_started|succeeded|failed` (src/lib/client/telemetry.ts)

- Server logs: request summary, path counters, safety stats, latency

---

## Testing

- Unit/integration: Validate request parsing, limits, error mapping

- E2E: Smoke for form, CSRF, rate limiting, quota banners

---

## Notes

- Without OPENAI_API_KEY the deterministic fallback path is used (no hard error)

- LLM output is returned as plain text in `enhancedPrompt`; structured markdown is synthesized for deterministic path
