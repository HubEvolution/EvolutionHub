---
description: 'Leitfaden für API-Validierung mit Zod und Middleware'
owner: 'Platform Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/lib/validation/**, src/lib/api-middleware.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# API Validation with Zod

This doc explains the conventions for server-side validation using Zod in Evolution Hub.

- Shared helpers live in `src/lib/validation/`.
  - `errors.ts`: `formatZodError(err)` to convert `ZodError` into `details` compatible with `createApiError`.

  - `schemas/*`: feature-specific schemas (e.g., `ai-image.ts`, `voice.ts`, `prompt.ts`, `webscraper.ts`).

  - `index.ts`: barrel exports (`z`, `ZodError`, helpers, schemas).

- API routes wrap handlers with `withApiMiddleware` / `withAuthApiMiddleware` and return standardized shapes:
  - Success: `createApiSuccess({ data })`.

  - Errors: `createApiError(type, message, { details? })`.

  - For validation failures, map `ZodError` via `formatZodError` and respond with `type: 'validation_error'`.

- Security expectations are preserved by middleware:
  - Same-origin + CSRF (double-submit when enabled) for unsafe methods.

  - Rate-limits per feature (see `src/lib/rate-limiter.ts`).

## Patterns

- Parse `FormData` only for file fields; validate other fields via Zod schemas with preprocessors for trimming/coercion.

- For JSON, normalize legacy shapes to a canonical object before `schema.safeParse()`.

- Include `details: formatZodError(err)` in `validation_error` responses.

- Keep provider/service error mapping intact (map 4xx to `validation_error`/`forbidden`, 5xx to `server_error`).

## Current Schemas (examples)

- `ai-image.ts`: validates `model`, `scale`, `face_enhance`, `prompt`, `negative_prompt`, `strength`, `guidance`, `steps`; enforces model capabilities.

- `voice.ts`: validates `sessionId`, `jobId?`, `lang?`, `isLastChunk?`.

- `prompt.ts`: validates `text` (length-limited), `mode?`, `safety?`, `includeScores?`, `outputFormat?`.

- `webscraper.ts`: validates `url` (http/https, non-local/private), `options?`.

## OpenAPI

We evaluated deriving OpenAPI from Zod (zod-to-openapi). For now, we keep the existing `openapi.yaml` source of truth and document the mapping:

- Zod schemas define runtime validation.

- OpenAPI is maintained manually (validated via `npm run openapi:validate`).

- In a future pilot, we can generate a component schema for one route (e.g., `PromptEnhanceRequest`) from `promptInputSchema` and reconcile field names.

## Testing

- Unit tests assert schema accept/reject cases and do not depend on provider calls.

- Integration tests should include 400 `validation_error` paths for malformed inputs.
