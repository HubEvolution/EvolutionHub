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
mkdir -p reports && rm -f reports/code-hygiene-last.log
{ \
  npm run format && \
  npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint && \
  npm run lint:md:fix && \
  npm run docs:toc; \
} 2>&1 | tee -a reports/code-hygiene-last.log
```

## 2) Core strict checks

// turbo

```bash
run-s -c --print-label "format:check" "lint -- --max-warnings=0" "typecheck:src" 2>&1 | tee -a reports/code-hygiene-last.log
```

## 3) Validation suite

// turbo

```bash
run-s -c --print-label "test:unit:run" "test:integration:run" 2>&1 | tee -a reports/code-hygiene-last.log
run-p -c --print-label "openapi:validate" "docs:lint" "lint:md" "docs:links" "docs:inventory" "i18n:audit" "security:scan" 2>&1 | tee -a reports/code-hygiene-last.log
```

## 4) Optional deep checks (manual)

```bash
npm run astro:check:ui
npm run test:e2e:chromium
# Optional link check (external):
# npx linkinator docs --silent --skip '.*(localhost|example\\.com).*'
# Optional spell check for docs:
# npx cspell --no-progress "docs/**/*.md"
# Tipp: Zum Mitschreiben in die Log-Datei auch hier mit tee arbeiten, z. B.:
# (npm run astro:check:ui; npm run test:e2e:chromium) 2>&1 | tee -a reports/code-hygiene-last.log
```

## 5) What to do with failures

- Lint/TypeScript/Test/OpenAPI errors that are not auto-fixable will be handled manually. Share the failing output and I will apply targeted fixes.
