---
trigger: always_on
priority: 60
---

# Image Enhancer Rules

## Scope

- UI Enhancer pages and islands, ai-image APIs, jobs, R2 proxy.

## Dependencies

- `src/lib/services/ai-image-service.ts`, `src/lib/services/ai-jobs-service.ts`
- `src/config/ai-image.ts`, `src/config/ai-image/entitlements.ts`

## Constraints

- Apply `.windsurf/rules/tooling-and-style.md`.
- Testing: unit for hooks/components; E2E smoke per CI; see `.windsurf/rules/testing-and-ci.md`.

## Security & Privacy

- Server enforces quotas/entitlements; UI only mirrors.
- Provider error mapping to `validation_error|forbidden|server_error`.

## Related Codemap

- `/.windsurf/codemaps/EH __ Image Enhancer __ Codemap v1.md`

## Documentation Reference

- `.windsurf/rules/api-and-security.md`
- `docs/architecture/ai-image-enhancer.md`
- `docs/development/ci-cd.md`
