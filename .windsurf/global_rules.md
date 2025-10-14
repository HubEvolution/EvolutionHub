---
description: Global rules base for Evolution Hub
version: 1
---

# Global Rules (Authoritative Base)

- Canonical guides live under `.windsurf/rules/`:
  - `api-and-security.md`
  - `project-structure.md`
  - `tooling-and-style.md`
  - `testing-and-ci.md`

## Feature Codemap Integration

- Active Codemaps:
  - EH :: Auth + OAuth :: Codemap v1
  - EH :: Image Enhancer :: Codemap v1
  - EH :: Prompt Enhancer :: Codemap v1
  - EH :: WebScraper :: Codemap v1
  - EH :: Transcriptor (Whisper) :: Codemap v1
  - EH :: Pricing & Stripe :: Codemap v1
  - EH :: Content :: Codemap v1
  - EH :: Infra (Workers/Router/Bindings) :: Codemap v1
- Inheritance: Each feature-level ruleset inherits global SoTA standards unless explicitly overridden.
- Agent guidance: When a codemap is active, auto-load `.windsurf/rules/<feature>.md`.

## Repository Layout & Locations

- See `.windsurf/rules/project-structure.md` for canonical locations and build details.

## Style/Tooling Policy

- See `.windsurf/rules/tooling-and-style.md`.

## Testing Policy

- See `.windsurf/rules/testing-and-ci.md`.
