---
description: EH :: Image Enhancer :: Codemap v1
version: 1
feature: image-enhancer
---

# EH :: Image Enhancer :: Codemap v1

## Entry Points

- UI: `src/pages/{de|en}/tools/imag-enhancer/app.astro`, `src/components/tools/ImagEnhancerIsland.tsx`
- API: `src/pages/api/ai-image/{generate,usage}.ts`, `src/pages/api/ai-image/jobs/**`
- R2 Proxy: `src/pages/r2-ai/[...path].ts`

## Services/Config

- `src/lib/services/ai-image-service.ts`
- `src/lib/services/ai-jobs-service.ts`
- `src/config/ai-image.ts`, `src/config/ai-image/entitlements.ts`
- `src/lib/security/csrf.ts`, `src/lib/rate-limiter.ts`

## Related Rules

- `.windsurf/rules/enhancer.md`
- `.windsurf/rules/api-and-security.md`

## Documentation

- `docs/architecture/ai-image-enhancer.md`
