---
description: EH :: Global :: Codemap v1 (workspace-wide)
version: 1
feature: global
---

# EH :: Global :: Codemap v1

## Scope

- Workspace-wide: `src/**`, `public/**`, `migrations/**`, `scripts/**`.

## Entry Points

- `src/pages/index.astro`
- `src/middleware.ts`

## Primary Modules

- UI/Pages: `src/pages/**`, `src/components/**`, `src/layouts/**`
- API: `src/pages/api/**`
- Middleware: `src/middleware.ts`
- Lib/Config: `src/lib/**`, `src/config/**`, `src/utils/**`
- Storage Proxies: `src/pages/r2/**`, `src/pages/r2-ai/**`

## Security/Middleware

- Global headers, CSP nonce, locale redirects per `src/middleware.ts`.
- `/r2-ai/**` remains public and ungated.

## Related Rules

- `.windsurf/global_rules.md`
- `.windsurf/rules/api-and-security.md`
- `.windsurf/rules/project-structure.md`
- `.windsurf/rules/tooling-and-style.md`
- `.windsurf/rules/testing-and-ci.md`
