---
trigger: always_on
priority: 60
---

# Prompt Enhancer Rules

## Scope

- Prompt UI and `POST /api/prompt-enhance` backend.

## Dependencies

- `src/lib/services/prompt-enhancer-service.ts`
- `src/config/prompt-enhancer.ts`

## Constraints

- Style/Tooling rules apply.
- Testing expectations per `.windsurf/rules/testing-and-ci.md`.

## Security & Privacy

- Same-origin, CSRF for POST; rate limiting.

## Related Codemap

- `/.windsurf/codemaps/EH __ Prompt Enhancer __ Codemap v1.md`

## Documentation Reference

- `.windsurf/rules/api-and-security.md`
- `docs/development/testing-guidelines.md`
- `docs/frontend/ui-components.md`
