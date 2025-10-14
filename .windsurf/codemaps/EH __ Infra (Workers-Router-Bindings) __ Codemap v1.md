---
description: EH :: Infra (Workers/Router/Bindings) :: Codemap v1
version: 1
feature: infra
---

# EH :: Infra (Workers/Router/Bindings) :: Codemap v1

## Scope

- Cloudflare Worker runtime, router/middleware, D1/R2/KV bindings, build output.

## Entry Points

- Middleware: `src/middleware.ts`
- Config: `wrangler.toml`, `astro.config.mjs`

## Related Rules

- `.windsurf/rules/infra.md`
- `.windsurf/rules/api-and-security.md`
- `.windsurf/rules/project-structure.md`

## Documentation

- `docs/architecture/system-overview.md`
- `docs/archive/migration_pages_zu_worker.md`
- `.windsurf/workflows/validate-update-cloudflare-rulesetsJSON-safely.md`
