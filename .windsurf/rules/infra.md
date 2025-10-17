---
trigger: always_on
priority: 60
---

# Infra (Workers/Router/Bindings) Rules

## Scope

- Worker runtime, middleware, bindings, build/deploy configuration.

## Dependencies

- `astro.config.mjs`, `wrangler.toml`, `src/middleware.ts`

## Constraints

- Respect `.windsurf/rules/project-structure.md` for assets and build outputs.
- Edge Rulesets: use workflow `.windsurf/workflows/cloudflare_rulesets_validate_update.json` (docs: `.windsurf/workflows/validate-update-cloudflare-rulesetsJSON-safely.md`).

## Security & Privacy

- Security headers via middleware; ensure `/r2-ai/**` remains public per policy.
- CSRF/origin rules apply to APIs (see API & Security rules).

## Related Codemap

- `/.windsurf/codemaps/EH __ Infra (Workers-Router-Bindings) __ Codemap v1.md`

## Documentation Reference

- `.windsurf/rules/api-and-security.md`
- `.windsurf/rules/project-structure.md`
- `docs/architecture/system-overview.md`
- `docs/archive/migration_pages_zu_worker.md`
