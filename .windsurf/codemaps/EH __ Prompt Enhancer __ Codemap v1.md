---
description: EH :: Prompt Enhancer :: Codemap v1
version: 1
feature: prompt-enhancer
---

# EH :: Prompt Enhancer :: Codemap v1

## Entry Points

- UI: `src/pages/{de|en}/tools/prompt-enhancer/app.astro`, `src/components/tools/prompt-enhancer/EnhancerForm.tsx`
- API: `src/pages/api/prompt-enhance.ts`

## Services/Config

- `src/lib/services/prompt-enhancer-service.ts`
- `src/config/prompt-enhancer.ts`
- `src/lib/security/csrf.ts`, `src/lib/rate-limiter.ts`

## Related Rules

- `.windsurf/rules/prompt.md`
- `.windsurf/rules/api-and-security.md`

## Documentation

- `docs/development/testing-guidelines.md`
- `docs/frontend/ui-components.md`
