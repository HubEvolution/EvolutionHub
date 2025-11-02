---
description: One-click Code Hygiene workflow (auto-fix + strict checks)
auto_execution_mode: 3
---

# Code Hygiene — Auto-Fix and Strict Checks

This workflow runs a fast auto-fix pass (Prettier + ESLint --fix) and then executes strict, read-only checks (lint, typecheck, tests, OpenAPI, docs/markdown lint, i18n audit, security scan). Use it after completing a feature or refactor.

## Prerequisites

- Node dependencies are installed (npm install or npm ci).
- Dev servers are stopped to avoid port/file locks.

## 1) Auto-fix pass
// turbo

```bash
npm run format && \
npx eslint 'src/**/*.{ts,astro}' --fix
```

## 2) Core strict checks
// turbo

```bash
npm run format:check && \
npm run lint -- --max-warnings=0 && \
npm run typecheck:src
```

## 3) Validation suite
// turbo

```bash
npm run test:unit:run && \
npm run test:integration:run && \
npm run openapi:validate && \
npm run docs:lint && \
npm run lint:md && \
npm run i18n:audit && \
npm run security:scan
```

## 4) Optional deep checks (manual)

```bash
npm run astro:check:ui
npm run test:e2e:chromium
```

## 5) What to do with failures
- Lint/TypeScript/Test/OpenAPI errors that are not auto-fixable will be handled manually. Share the failing output and I will apply targeted fixes.

