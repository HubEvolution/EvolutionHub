# AGENTS.md (Lib & Services)

Geltung: `src/lib/**` (Services, Utils, Validation, Feature-Flags, KV/Rate-Limiter, Logging).

## Baseline-Rules

- Core/Infra: `.windsurf/rules/api-and-security.md`, `.windsurf/rules/auth.md`, `.windsurf/rules/infra.md`, `.windsurf/rules/project-structure.md`.
- Quality/Tooling: `.windsurf/rules/testing-and-ci.md`, `.windsurf/rules/tooling-and-style.md`, `.windsurf/rules/zod-openapi.md`.
- Cross-Cutting: `.windsurf/rules/content.md` (falls Content-Typen betroffen), `.windsurf/rules/cookies-and-consent.md` (Tracking/Consent), `.windsurf/rules/caching-kv.md` (KV/Caching), `.windsurf/rules/observability.md` (Logging/Redaction), `.windsurf/rules/background-jobs.md` (Cron/Worker Patterns), `.windsurf/rules/email-notifications.md` (Resend/D1 Queue), `.windsurf/rules/performance.md` (Budgets/Caching), `.windsurf/rules/i18n.md` (Locales/Keys).

## Services & Utils

- Business-Logik gehört in Services (`src/lib/services/**`); API/Pages nur als dünne Adapter.
- Strikte Typen; keine neuen `any`. Re-use bestehender Typen (`src/lib/types`, `src/lib/db/types.ts`, `src/content/types.ts`).
- Feature-Flags nur über `src/utils/feature-flags.ts`; Defaults „off“, sichere Fallbacks.
- Kein PII-Leak: Logging über `src/lib/services/logger-utils.ts`, sensible Felder maskieren.

## Validation & Errors

- Eingaben schema-first unter `src/lib/validation/schemas/**`; Typen aus Schemas ableiten.
- Keine stillen Fallbacks: invalid → Fehler nach `docs/api/error-handling.md`.
- `.strict()` Schemas nutzen, wenn möglich; bei OpenAPI-Export `additionalProperties: false` beachten.

## Caching / Rate Limiting

- KV/Caching nur gemäß `.windsurf/rules/caching-kv.md`; TTL/Budget dokumentieren.
- Rate Limiter (`src/lib/rate-limiter.ts`) respektieren; keine Umgehungen.

## Tests

- Unit-Tests für Services/Utils (`tests/unit/**` oder `test-suite-v2/**`).
- Coverage-Ziel ≥70% bleibt bestehen; hot-paths mit zusätzlichen Cases abdecken.
