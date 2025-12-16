---
description: Read-only Code Hygiene (checks only; no auto-fix, no reports)
auto_execution_mode: 3
---

# Code Hygiene (Read-only) — Checks only

Dieser Workflow führt ausschließlich read-only Checks aus (kein --fix, kein prettier --write, keine TOC-Generierung, keine Report-Dateien).

## 1) Core Code Hygiene (read-only)

// turbo

```bash
run-s -c --print-label \
  "format:check" \
  "lint" \
  "typecheck:src" \
  "astro:check:ui" \
  "openapi:validate"
npx prettier --list-different "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}" || true
```
