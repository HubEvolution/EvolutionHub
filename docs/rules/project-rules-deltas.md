---
description: 'Project Rules Deltas – temporärer Overlay für .windsurf/rules/*'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-04'
codeRefs: '.windsurf/rules/api-and-security.md, .windsurf/rules/tooling-and-style.md, .windsurf/rules/project-structure.md, .windsurf/rules/infra.md, .windsurf/rules/testing-and-ci.md, .windsurf/rules/zod-openapi.md, .windsurf/rules/auth.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Project Rules — Deltas to apply in .windsurf/rules/\* (no code changes)

This document tracks the exact text updates to apply to the protected rules files under `.windsurf/rules/*` to align with current code and decisions. It serves as an overlay until we update those files directly.

## API & Security (api-and-security.md)

- Add: `Referrer-Policy: strict-origin-when-cross-origin` to the Security headers list.

- Clarify: `/r2-ai/**` must remain public and ungated (already true, reaffirmed).

- Note: `X-XSS-Protection` is legacy and ignored by modern browsers; if mentioned, mark as legacy.

- Optional (consistency): When returning 401, prefer unified shape via `createApiError('auth_error', 'Unauthorized')`.

## Tooling & Style (tooling-and-style.md)

- Replace: "warn on any" with "ESLint: `no-explicit-any=error` in `src/**`; in `tests/**` keep as warning".

- Remove: References to `AGENTS.md` (file no longer present). Keep naming guidance inline: Components/Stores PascalCase; Utilities camelCase.

## Project Structure (project-structure.md)

- Remove: References to `AGENTS.md` and replace with "See Global Rules and this file".

- Reassert: R2 proxy paths are `src/pages/r2/**` and `src/pages/r2-ai/**` and must stay public/ungated.

- Keep: Worker build outputs and `.assetsignore` description as-is.

## Infra (infra.md)

- Add: Workers AI binding note if enabled: `[ai]\n binding = "AI"` in `wrangler.toml`.

- Keep: Security headers via middleware; `/r2-ai/**` public.

## Testing & CI (testing-and-ci.md)

- Add: mention of the OpenAPI Zod Pilot/Diff scripts and workflow now present:
  - `npm run openapi:zod:pilot`

  - `npm run openapi:zod:diff`

  - `.github/workflows/openapi-zod-diff.yml`

- Tidy: shorten the repeated Playwright report path sentence to a single canonical path per suite.

## Zod ↔ OpenAPI (zod-openapi.md)

- No change required. Keep guardrails: `.strict()` → `additionalProperties: false` in OpenAPI; no auto-overwrite of YAML.

## Auth (auth.md)

- Align with API & Security deltas: CSRF/Origin and public `/r2-ai/**` reaffirmed.

- Keep PKCE cookie and `X-Stytch-Request-Id` observability notes.

## Notes

- This file is documentation-only. No code changes are included.

- When allowed, apply these deltas directly to `.windsurf/rules/*` and remove this overlay.
