# Hygiene Report for Assistant

## Summary

```json
{
  "format": {
    "ok": true,
    "code": 0
  },
  "eslint:fix": {
    "ok": true,
    "code": 0
  },
  "md:fix": {
    "ok": true,
    "code": 0
  },
  "docs:toc": {
    "ok": true,
    "code": 0
  },
  "format:check": {
    "ok": true,
    "code": 0
  },
  "lint(strict)": {
    "ok": true,
    "code": 0
  },
  "typecheck:src": {
    "ok": true,
    "code": 0
  },
  "test:unit:run": {
    "ok": true,
    "code": 0
  },
  "test:integration:run": {
    "ok": false,
    "code": 1
  },
  "openapi:validate": {
    "ok": true,
    "code": 0
  },
  "docs:lint": {
    "ok": true,
    "code": 0
  },
  "lint:md": {
    "ok": true,
    "code": 0
  },
  "docs:links": {
    "ok": true,
    "code": 0
  },
  "docs:inventory": {
    "ok": true,
    "code": 0
  },
  "i18n:audit": {
    "ok": true,
    "code": 0
  },
  "security:scan": {
    "ok": true,
    "code": 0
  }
}
```

## Failing Steps
- test:integration:run

## Relevant Logs (tail)
### docs-inventory

```text
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 578 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 579 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 586 files at docs/meta/registry.json
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 594 files at docs/meta/registry.json

```

### docs-links

```text
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] All relative documentation links resolved successfully.

```

### docs-lint

```text
[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"

[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"


```

### docs-toc

```text
"docs/api/rate-limiting-api.md" is up to date
"docs/api/user_api.md" is up to date
"docs/api/voice_api.md" is up to date
"docs/api/webscraper_api.md" is up to date
"docs/architecture/README.md" is up to date
"docs/architecture/ai-image-enhancer.md" is up to date
"docs/architecture/ai-orchestrator-open-questions.md" is up to date
"docs/architecture/api-middleware-inventory.md" is up to date
"docs/architecture/auth-architecture.md" is up to date
"docs/architecture/auth-flow.md" is up to date
"docs/architecture/data-flow.md" is up to date
"docs/architecture/database-schema.md" is up to date
"docs/architecture/locale-middleware.md" is up to date
"docs/architecture/prompt-enhancer.md" is up to date
"docs/architecture/system-overview.md" is up to date
"docs/architecture/voice-visualizer-transcriptor.md" is up to date
"docs/architecture/adrs/0000-adr-template.md" is up to date
"docs/architecture/adrs/0001-astro-cloudflare-stack.md" is up to date
"docs/architecture/adrs/0002-cloudflare-architecture.md" is up to date
"docs/architecture/adrs/0003-astro-frontend-architecture.md" is up to date
"docs/architecture/adrs/0004-database-schema.md" is up to date
"docs/architecture/adrs/0005-auth-route-locale-normalisierung.md" is up to date
"docs/architecture/adrs/0006-dev-echo-non-prod.md" is up to date
"docs/architecture/adrs/deprecated/0001-jwt-authentication.md" is up to date
"docs/architecture/adrs/deprecated/0002-jwt-authentication.md" is up to date
"docs/architecture/adrs/deprecated/0003-database-schema.md" is up to date
"docs/architecture/reviews/BEWERTUNG_LOGIKREVIEW_IMAGE-ENHANCER_USAGE-PILL_PLANANZEIGE.md" is up to date
"docs/archive/README.md" is up to date
"docs/archive/documentation-gap-analysis.md" is up to date
"docs/archive/status-assessment.md" is up to date
"docs/business/infra-costs/ai-operations-cost-report.md" is up to date
"docs/compliance/ai-enhancer-licensing.md" is up to date
"docs/deployment/image-enhancer-mvp.md" is up to date
"docs/development/README.md" is up to date
"docs/development/api-validation.md" is up to date
"docs/development/bugfix-session-cookie-fallback.md" is up to date
"docs/development/ci-cd.md" is up to date
"docs/development/debug-panel-usage.md" is up to date
"docs/development/docs-style-guide.md" is up to date
"docs/development/hybrid-logging-system.md" is up to date
"docs/development/icon-guidelines.md" is up to date
"docs/development/inline-ts-refactor.md" is up to date
"docs/development/local-development.md" is up to date
"docs/development/stripe-setup.md" is up to date
"docs/development/stytch-oauth-dev-guide.md" is up to date
"docs/development/testing-guidelines.md" is up to date
"docs/development/typescript-integration.md" is up to date
"docs/development/prs/imag-enhancer-help-ui.md" is up to date
"docs/features/admin-notifications.md" is up to date
"docs/features/blog+commentsystem-plan.md" is up to date
"docs/features/pricing-system.md" is up to date
"docs/features/production-logging.md" is up to date
"docs/frontend/README.md" is up to date
"docs/frontend/aos-coordinator.md" is up to date
"docs/frontend/card-components.md" is up to date
"docs/frontend/coming-soon.md" is up to date
"docs/frontend/components.md" is up to date
"docs/frontend/design-system.md" is up to date
"docs/frontend/entitlements-ui-gating.md" is up to date
"docs/frontend/header-scroll-animation.md" is up to date
"docs/frontend/imag-enhancer-ui-upgrade.md" is up to date
"docs/frontend/toast-notifications.md" is up to date
"docs/frontend/ui-components.md" is up to date
"docs/frontend/ui-ux.md" is up to date
"docs/lead-magnets/README.md" is up to date
"docs/lead-magnets/content-prompts.md" is up to date
"docs/lead-magnets/prompts.md" is up to date
"docs/lead-magnets/r2-optimization-plan.md" is up to date
"docs/ops/README.md" is up to date
"docs/ops/ai-generate-kv-limiter-plan.md" is up to date
"docs/ops/cloudflare-cache-rules.md" is up to date
"docs/ops/deployment-guide.md" is up to date
"docs/ops/monitoring.md" is up to date
"docs/ops/runbook-image-enhancer-go-live.md" is up to date
"docs/reference/auth-envs-and-secrets.md" is up to date
"docs/reference/environment.md" is up to date
"docs/rules/project-rules-deltas.md" is up to date
"docs/rules/project-structure.md" is up to date
"docs/runbooks/logging-pipeline.md" is up to date
"docs/security/README.md" is up to date
"docs/security/improvements.md" is up to date
"docs/security/rate_limiting.md" is up to date
"docs/security/security_headers.md" is up to date
"docs/testing/README.md" is up to date
"docs/testing/coverage-roadmap-to-95.md" is up to date
"docs/testing/integration-hardening.md" is up to date
"docs/testing/testing-strategy.md" is up to date
"docs/testing/web-eval-executor.md" is up to date
"docs/tools/debug-panel.md" is up to date
"docs/tools/image-enhancer.md" is up to date
"docs/tools/prompt-enhancer.en.md" is up to date
"docs/tools/prompt-enhancer.md" is up to date
"docs/tools/webscraper/IMPLEMENTATION_COMPLETE.md" is up to date
"docs/tools/webscraper/README.md" is up to date
"docs/tools/webscraper/guidelines.md" is up to date
"docs/tools/webscraper/roadmap.md" is up to date
"docs/tools/webscraper/spec.md" is up to date
"docs/tools/webscraper/testing.md" is up to date

Everything is OK.
[docs:toc] $ npm run docs:toc

> evolution-hub@0.0.1 docs:toc
> doctoc docs --update-only --notitle


DocToccing "docs" and its sub directories for github.com.

Found AUDIT.md, README.md, SECURITY.md, SETUP.md, animation.md, architecture.md, cheat-sheet.md, content.md, db_schema_update.md, i18n.md, seo.md in "docs"

Found README.md, admin_api.md, ai-image_api.md, api-guidelines.md, api-overview.md, auth_api.md, billing_api.md, comments_api.md, dashboard_api.md, error-handling.md, known-issues.md, projects_api.md, prompt-enhance.md, public_api.md, rate-limiting-api.md, user_api.md, voice_api.md, webscraper_api.md in "docs/api"

Found nothing in "docs/api/openapi"

Found nothing in "docs/api/openapi/paths"

Found README.md, ai-image-enhancer.md, ai-orchestrator-open-questions.md, api-middleware-inventory.md, auth-architecture.md, auth-flow.md, configuration-analysis-2025-11-12.md, data-flow.md, database-schema.md, locale-middleware.md, prompt-enhancer.md, system-overview.md, voice-visualizer-transcriptor.md in "docs/architecture"

Found 0000-adr-template.md, 0001-astro-cloudflare-stack.md, 0002-cloudflare-architecture.md, 0003-astro-frontend-architecture.md, 0004-database-schema.md, 0005-auth-route-locale-normalisierung.md, 0006-dev-echo-non-prod.md in "docs/architecture/adrs"

Found 0001-jwt-authentication.md, 0002-jwt-authentication.md, 0003-database-schema.md in "docs/architecture/adrs/deprecated"

Found BEWERTUNG_LOGIKREVIEW_IMAGE-ENHANCER_USAGE-PILL_PLANANZEIGE.md in "docs/architecture/reviews"

Found README.md, documentation-gap-analysis.md, status-assessment.md in "docs/archive"

Found nothing in "docs/business"

Found ai-operations-cost-report.md in "docs/business/infra-costs"

Found ai-enhancer-licensing.md in "docs/compliance"

Found image-enhancer-mvp.md in "docs/deployment"

Found README.md, api-validation.md, bugfix-session-cookie-fallback.md, ci-cd.md, debug-panel-usage.md, docs-style-guide.md, hybrid-logging-system.md, icon-guidelines.md, inline-ts-refactor.md, local-development.md, stripe-setup.md, stytch-oauth-dev-guide.md, testing-guidelines.md, typescript-integration.md in "docs/development"

Found imag-enhancer-help-ui.md in "docs/development/prs"

Found admin-notifications.md, blog+commentsystem-plan.md, pricing-system.md, production-logging.md in "docs/features"

Found README.md, aos-coordinator.md, card-components.md, coming-soon.md, components.md, design-system.md, entitlements-ui-gating.md, header-scroll-animation.md, imag-enhancer-ui-upgrade.md, toast-notifications.md, ui-components.md, ui-ux.md in "docs/frontend"

Found README.md, content-prompts.md, prompts.md, r2-optimization-plan.md in "docs/lead-magnets"

Found psi-integration.md in "docs/mcp"

Found nothing in "docs/media"

Found nothing in "docs/meta"

Found README.md, ai-generate-kv-limiter-plan.md, cloudflare-cache-rules.md, deployment-guide.md, monitoring.md, runbook-image-enhancer-go-live.md, web-eval-executor-runbook.md in "docs/ops"

Found nothing in "docs/ops/runbooks"

Found auth-envs-and-secrets.md, environment.md in "docs/reference"

Found project-rules-deltas.md, project-structure.md in "docs/rules"

Found logging-pipeline.md in "docs/runbooks"

Found README.md, improvements.md, rate_limiting.md, security_headers.md in "docs/security"

Found README.md, coverage-roadmap-to-95.md, integration-hardening.md, testing-strategy.md, web-eval-executor.md in "docs/testing"

Found debug-panel.md, image-enhancer.md, prompt-enhancer.en.md, prompt-enhancer.md in "docs/tools"

Found IMPLEMENTATION_COMPLETE.md, README.md, guidelines.md, roadmap.md, spec.md, testing.md in "docs/tools/webscraper"
--update-only flag is enabled. Only updating files that already have a TOC.

==================

"docs/AUDIT.md" is up to date
"docs/README.md" is up to date
"docs/SECURITY.md" is up to date
"docs/SETUP.md" is up to date
"docs/animation.md" is up to date
"docs/architecture.md" is up to date
"docs/cheat-sheet.md" is up to date
"docs/content.md" is up to date
"docs/db_schema_update.md" is up to date
"docs/i18n.md" is up to date
"docs/seo.md" is up to date
"docs/api/README.md" is up to date
"docs/api/admin_api.md" is up to date
"docs/api/ai-image_api.md" is up to date
"docs/api/api-guidelines.md" is up to date
"docs/api/api-overview.md" is up to date
"docs/api/auth_api.md" is up to date
"docs/api/billing_api.md" is up to date
"docs/api/comments_api.md" is up to date
"docs/api/dashboard_api.md" is up to date
"docs/api/error-handling.md" is up to date
"docs/api/known-issues.md" is up to date
"docs/api/projects_api.md" is up to date
"docs/api/prompt-enhance.md" is up to date
"docs/api/public_api.md" is up to date
"docs/api/rate-limiting-api.md" is up to date
"docs/api/user_api.md" is up to date
"docs/api/voice_api.md" is up to date
"docs/api/webscraper_api.md" is up to date
"docs/architecture/README.md" is up to date
"docs/architecture/ai-image-enhancer.md" is up to date
"docs/architecture/ai-orchestrator-open-questions.md" is up to date
"docs/architecture/api-middleware-inventory.md" is up to date
"docs/architecture/auth-architecture.md" is up to date
"docs/architecture/auth-flow.md" is up to date
"docs/architecture/data-flow.md" is up to date
"docs/architecture/database-schema.md" is up to date
"docs/architecture/locale-middleware.md" is up to date
"docs/architecture/prompt-enhancer.md" is up to date
"docs/architecture/system-overview.md" is up to date
"docs/architecture/voice-visualizer-transcriptor.md" is up to date
"docs/architecture/adrs/0000-adr-template.md" is up to date
"docs/architecture/adrs/0001-astro-cloudflare-stack.md" is up to date
"docs/architecture/adrs/0002-cloudflare-architecture.md" is up to date
"docs/architecture/adrs/0003-astro-frontend-architecture.md" is up to date
"docs/architecture/adrs/0004-database-schema.md" is up to date
"docs/architecture/adrs/0005-auth-route-locale-normalisierung.md" is up to date
"docs/architecture/adrs/0006-dev-echo-non-prod.md" is up to date
"docs/architecture/adrs/deprecated/0001-jwt-authentication.md" is up to date
"docs/architecture/adrs/deprecated/0002-jwt-authentication.md" is up to date
"docs/architecture/adrs/deprecated/0003-database-schema.md" is up to date
"docs/architecture/reviews/BEWERTUNG_LOGIKREVIEW_IMAGE-ENHANCER_USAGE-PILL_PLANANZEIGE.md" is up to date
"docs/archive/README.md" is up to date
"docs/archive/documentation-gap-analysis.md" is up to date
"docs/archive/status-assessment.md" is up to date
"docs/business/infra-costs/ai-operations-cost-report.md" is up to date
"docs/compliance/ai-enhancer-licensing.md" is up to date
"docs/deployment/image-enhancer-mvp.md" is up to date
"docs/development/README.md" is up to date
"docs/development/api-validation.md" is up to date
"docs/development/bugfix-session-cookie-fallback.md" is up to date
"docs/development/ci-cd.md" is up to date
"docs/development/debug-panel-usage.md" is up to date
"docs/development/docs-style-guide.md" is up to date
"docs/development/hybrid-logging-system.md" is up to date
"docs/development/icon-guidelines.md" is up to date
"docs/development/inline-ts-refactor.md" is up to date
"docs/development/local-development.md" is up to date
"docs/development/stripe-setup.md" is up to date
"docs/development/stytch-oauth-dev-guide.md" is up to date
"docs/development/testing-guidelines.md" is up to date
"docs/development/typescript-integration.md" is up to date
"docs/development/prs/imag-enhancer-help-ui.md" is up to date
"docs/features/admin-notifications.md" is up to date
"docs/features/blog+commentsystem-plan.md" is up to date
"docs/features/pricing-system.md" is up to date
"docs/features/production-logging.md" is up to date
"docs/frontend/README.md" is up to date
"docs/frontend/aos-coordinator.md" is up to date
"docs/frontend/card-components.md" is up to date
"docs/frontend/coming-soon.md" is up to date
"docs/frontend/components.md" is up to date
"docs/frontend/design-system.md" is up to date
"docs/frontend/entitlements-ui-gating.md" is up to date
"docs/frontend/header-scroll-animation.md" is up to date
"docs/frontend/imag-enhancer-ui-upgrade.md" is up to date
"docs/frontend/toast-notifications.md" is up to date
"docs/frontend/ui-components.md" is up to date
"docs/frontend/ui-ux.md" is up to date
"docs/lead-magnets/README.md" is up to date
"docs/lead-magnets/content-prompts.md" is up to date
"docs/lead-magnets/prompts.md" is up to date
"docs/lead-magnets/r2-optimization-plan.md" is up to date
"docs/mcp/psi-integration.md" is up to date
"docs/ops/README.md" is up to date
"docs/ops/ai-generate-kv-limiter-plan.md" is up to date
"docs/ops/cloudflare-cache-rules.md" is up to date
"docs/ops/deployment-guide.md" is up to date
"docs/ops/monitoring.md" is up to date
"docs/ops/runbook-image-enhancer-go-live.md" is up to date
"docs/ops/web-eval-executor-runbook.md" is up to date
"docs/reference/auth-envs-and-secrets.md" is up to date
"docs/reference/environment.md" is up to date
"docs/rules/project-rules-deltas.md" is up to date
"docs/rules/project-structure.md" is up to date
"docs/runbooks/logging-pipeline.md" is up to date
"docs/security/README.md" is up to date
"docs/security/improvements.md" is up to date
"docs/security/rate_limiting.md" is up to date
"docs/security/security_headers.md" is up to date
"docs/testing/README.md" is up to date
"docs/testing/coverage-roadmap-to-95.md" is up to date
"docs/testing/integration-hardening.md" is up to date
"docs/testing/testing-strategy.md" is up to date
"docs/testing/web-eval-executor.md" is up to date
"docs/tools/debug-panel.md" is up to date
"docs/tools/image-enhancer.md" is up to date
"docs/tools/prompt-enhancer.en.md" is up to date
"docs/tools/prompt-enhancer.md" is up to date
"docs/tools/webscraper/IMPLEMENTATION_COMPLETE.md" is up to date
"docs/tools/webscraper/README.md" is up to date
"docs/tools/webscraper/guidelines.md" is up to date
"docs/tools/webscraper/roadmap.md" is up to date
"docs/tools/webscraper/spec.md" is up to date
"docs/tools/webscraper/testing.md" is up to date
"docs/architecture/configuration-analysis-2025-11-12.md" will be updated

Everything is OK.

```

### eslint-fix

```text
[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/dashboard/AccountSettingsSection.astro
  327:45  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/comments.astro
  68:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
   41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
  117:63  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/dashboard.astro
  16:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  39:64  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/dashboard.astro
  14:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/tools/imag-enhancer/app.astro
  130:47  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/faq.astro
  38:72  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:47  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 10 problems (1 error, 9 warnings)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/dashboard/AccountSettingsSection.astro
  327:45  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/comments.astro
  68:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
   41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
  117:63  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/dashboard.astro
  16:32  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/dashboard.astro
  14:32  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/tools/imag-enhancer/app.astro
  130:43  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 8 problems (5 errors, 3 warnings)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
  41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 2 problems (1 error, 1 warning)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
  41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 2 problems (1 error, 1 warning)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 1 problem (1 error, 0 warnings)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/testing/evaluate/next/run.ts
  351:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/testing/evaluate/next/run.ts
  351:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint
[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint
[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint
[eslint:fix] $ npx eslint 'src/**/*.{ts,astro}' --fix --cache --cache-location .cache/eslint

```

### format-check

```text
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!

```

### format

```text
src/pages/tools/video-enhancer/app.astro 4ms (unchanged)
src/pages/tools/voice-visualizer/app.astro 4ms (unchanged)
src/pages/tools/web-eval/app.astro 3ms (unchanged)
src/pages/tools/webscraper/app.astro 3ms (unchanged)
src/pages/verify-email.astro 19ms (unchanged)
src/pages/welcome-profile.astro 10ms (unchanged)
src/pages/welcome.astro 6ms (unchanged)
src/scripts/blog-post-enhancements.ts 2ms (unchanged)
src/scripts/landing-bg.ts 12ms (unchanged)
src/scripts/neural-mesh.ts 9ms (unchanged)
src/scripts/orchestrate-entrance.ts 5ms (unchanged)
src/scripts/settings.ts 7ms (unchanged)
src/server/actions.ts 2ms (unchanged)
src/server/utils/hashing.ts 1ms (unchanged)
src/server/utils/jwt.ts 3ms (unchanged)
src/server/utils/log-transports.ts 7ms (unchanged)
src/server/utils/logger-factory.ts 10ms (unchanged)
src/server/utils/logger.ts 5ms (unchanged)
src/setupTests.ts 4ms (unchanged)
src/stores/activityStore.ts 2ms (unchanged)
src/stores/comment-store.ts 13ms (unchanged)
src/stores/index.ts 1ms (unchanged)
src/stores/notificationStore.ts 2ms (unchanged)
src/stores/projectStore.ts 4ms (unchanged)
src/stores/quickActionStore.ts 3ms (unchanged)
src/types/astro-fonts-internal.d.ts 1ms (unchanged)
src/types/blog.ts 1ms (unchanged)
src/types/dashboard.ts 2ms (unchanged)
src/types/jsdom.d.ts 1ms (unchanged)
src/types/logger.ts 3ms (unchanged)
src/types/stubs/rate-limiter.d.ts 1ms (unchanged)
src/types/ts-src-shims.d.ts 6ms (unchanged)
src/types/webscraper.ts 1ms (unchanged)
src/types/ws.d.ts 1ms (unchanged)
src/utils/feature-flags.ts 2ms (unchanged)
src/utils/i18n.ts 4ms (unchanged)
src/utils/sanitizeReturnTo.test.ts 2ms (unchanged)
src/utils/sanitizeReturnTo.ts 1ms (unchanged)
tests/e2e/specs/blog-i18n-seo.spec.ts 3ms (unchanged)
tests/e2e/specs/rate-limit-persistence.spec.ts 1ms (unchanged)
tests/e2e/specs/referral/referral-reward.spec.ts 5ms (unchanged)
tests/integration/ai-image-enhancer.test.ts 20ms
tests/integration/api/__fixtures__/comments-performance.ts 7ms (unchanged)
tests/integration/api/admin-audit-logs.test.ts 3ms (unchanged)
tests/integration/api/admin-auth-checks.test.ts 1ms (unchanged)
tests/integration/api/admin-backup.test.ts 3ms (unchanged)
tests/integration/api/admin-comments.test.ts 2ms (unchanged)
tests/integration/api/admin-credits-deduct.test.ts 2ms (unchanged)
tests/integration/api/admin-credits.test.ts 2ms (unchanged)
tests/integration/api/admin-rate-limits.test.ts 2ms (unchanged)
tests/integration/api/admin-referrals-list.test.ts 3ms (unchanged)
tests/integration/api/admin-sessions.test.ts 2ms (unchanged)
tests/integration/api/admin-users-credits.test.ts 3ms (unchanged)
tests/integration/api/admin-users-lifecycle.test.ts 4ms (unchanged)
tests/integration/api/admin-users-set-plan-happy.test.ts 3ms (unchanged)
tests/integration/api/admin-users-set-plan.test.ts 4ms (unchanged)
tests/integration/api/ai-video/generate.test.ts 5ms (unchanged)
tests/integration/api/ai-video/usage.test.ts 4ms (unchanged)
tests/integration/api/comments-performance.test.ts 4ms (unchanged)
tests/integration/api/comments-routes.test.ts 3ms (unchanged)
tests/integration/api/debug-logs-stream.test.ts 2ms (unchanged)
tests/integration/api/mcp-ping.test.ts 2ms (unchanged)
tests/integration/api/prompt/usage.test.ts 2ms (unchanged)
tests/integration/api/r2-ai-proxy.test.ts 2ms (unchanged)
tests/integration/api/referrals/referral-rewards-webhook.test.ts 4ms (unchanged)
tests/integration/api/voice/transcribe-and-poll.test.ts 4ms (unchanged)
tests/integration/api/voice/transcribe.test.ts 2ms (unchanged)
tests/integration/api/voice/usage.test.ts 2ms (unchanged)
tests/integration/api/web-eval-complete.test.ts 5ms
tests/integration/api/web-eval-next.test.ts 5ms (unchanged)
tests/integration/api/web-eval-run.test.ts 7ms
tests/integration/api/webscraper.test.ts 3ms (unchanged)
tests/integration/auth.test.ts 5ms (unchanged)
tests/integration/billing-api.test.ts 13ms (unchanged)
tests/integration/blog.test.ts 4ms (unchanged)
tests/integration/comments-api.test.ts 4ms (unchanged)
tests/integration/comments.test.ts 14ms (unchanged)
tests/integration/csp-report.test.ts 3ms (unchanged)
tests/integration/dashboard-api.test.ts 16ms (unchanged)
tests/integration/kv-usage.test.ts 2ms (unchanged)
tests/integration/lead-magnet-api.test.ts 10ms
tests/integration/magic-link-happy.test.ts 3ms (unchanged)
tests/integration/magic-link.test.ts 3ms (unchanged)
tests/integration/newsletter-api.test.ts 8ms (unchanged)
tests/integration/projects-api.test.ts 15ms (unchanged)
tests/integration/prompt-enhance-api.test.ts 6ms (unchanged)
tests/integration/prompt-enhance-multipart.test.ts 4ms (unchanged)
tests/integration/routing/blog-i18n-seo-integration.test.ts 2ms
tests/integration/routing/blog-routes.test.ts 2ms (unchanged)
tests/integration/routing/headers.test.ts 2ms (unchanged)
tests/integration/routing/lang-alias.test.ts 1ms (unchanged)
tests/integration/routing/locale-routing.test.ts 3ms (unchanged)
tests/integration/routing/seo-hreflang.test.ts 2ms (unchanged)
tests/integration/routing/voice-visualizer-permissions.test.ts 2ms (unchanged)
tests/integration/setup/global-setup.ts 7ms (unchanged)
tests/integration/setup/referral-fixtures.ts 2ms (unchanged)
tests/integration/user-avatar-api.test.ts 21ms (unchanged)
tests/integration/verify-email.test.ts 3ms (unchanged)
tests/mocks/astro-content.ts 1ms (unchanged)
tests/performance/rate-limiting-perf.test.ts 12ms (unchanged)
tests/performance/run-load-tests.ts 8ms (unchanged)
tests/shared/auth.ts 3ms (unchanged)
tests/shared/http.ts 3ms (unchanged)
tests/src/helpers/rateLimiter.ts 1ms (unchanged)
tests/src/legacy/config/test-config.ts 4ms (unchanged)
tests/src/legacy/utils/database-helpers.ts 7ms (unchanged)
tests/src/legacy/utils/logger.ts 9ms (unchanged)
tests/src/legacy/utils/server-helpers.ts 15ms (unchanged)
tests/src/lib/auth-v2.test.ts 4ms (unchanged)
tests/src/pages/api/ai-video/generate.test.ts 4ms (unchanged)
tests/src/pages/api/auth/login-405.test.ts 2ms (unchanged)
tests/src/pages/api/auth/login-logger.test.ts 17ms (unchanged)
tests/src/pages/api/auth/login-service.test.ts 10ms (unchanged)
tests/src/pages/api/auth/login.test.ts 9ms (unchanged)
tests/src/pages/api/dashboard/activity._test.ts 8ms (unchanged)
tests/src/pages/api/dashboard/perform-action._test.ts 9ms (unchanged)
tests/src/pages/api/dashboard/projects._test.ts 7ms (unchanged)
tests/src/pages/api/projects/index._test.ts 8ms (unchanged)
tests/src/pages/api/tools._test.ts 5ms (unchanged)
tests/src/pages/api/user/me.test.ts 6ms (unchanged)
tests/src/scripts/blog-post-enhancements.test.ts 3ms (unchanged)
tests/src/server/utils/hashing.test.ts 3ms (unchanged)
tests/src/server/utils/jwt.test.ts 3ms (unchanged)
tests/types/upstash-kv.d.ts 1ms (unchanged)
tests/unit/account/delete-account-section.test.tsx 3ms (unchanged)
tests/unit/ai-image-provider-mapping.test.ts 3ms (unchanged)
tests/unit/ai-image/aiimage-retry.test.ts 3ms (unchanged)
tests/unit/ai-jobs-provider-mapping.test.ts 3ms (unchanged)
tests/unit/api/account-delete.test.ts 6ms (unchanged)
tests/unit/api/comments-performance.test.ts 11ms (unchanged)
tests/unit/blog-sorting.spec.ts 5ms (unchanged)
tests/unit/comment-components.test.tsx 13ms (unchanged)
tests/unit/comment-service-simple.test.ts 5ms (unchanged)
tests/unit/comment-service.test.ts 18ms (unchanged)
tests/unit/components/BlogCTA.test.ts 1ms (unchanged)
tests/unit/components/BlogPost.test.ts 1ms (unchanged)
tests/unit/components/imag-enhancer/CreditsPanel.test.tsx 2ms (unchanged)
tests/unit/components/imag-enhancer/ModelControls.test.tsx 2ms (unchanged)
tests/unit/components/imag-enhancer/UploadSection.test.tsx 2ms (unchanged)
tests/unit/dashboard/billing-card.test.tsx 3ms (unchanged)
tests/unit/dashboard/projectStore.test.ts 3ms (unchanged)
tests/unit/dashboard/quickActionStore.test.ts 3ms (unchanged)
tests/unit/hooks/imag-enhancer/useClipboardImagePaste.test.ts 2ms (unchanged)
tests/unit/hooks/imag-enhancer/useCompareInteractions.test.tsx 7ms (unchanged)
tests/unit/hooks/imag-enhancer/useGlobalShortcuts.test.ts 3ms (unchanged)
tests/unit/hooks/imag-enhancer/usePlanGating.test.ts 3ms (unchanged)
tests/unit/hooks/imag-enhancer/useViewportUiMetrics.test.ts 3ms (unchanged)
tests/unit/i18n.test.ts 3ms (unchanged)
tests/unit/imag-enhancer/help-modal-focus.test.tsx 3ms (unchanged)
tests/unit/imag-enhancer/keyboard-shortcuts.test.tsx 5ms (unchanged)
tests/unit/lib/ai-image-service.test.ts 4ms (unchanged)
tests/unit/lib/aos.test.ts 5ms (unchanged)
tests/unit/lib/blog-service.test.ts 5ms (unchanged)
tests/unit/lib/rate-limiter-kv.test.ts 4ms (unchanged)
tests/unit/lib/rate-limiter.test.ts 5ms (unchanged)
tests/unit/pages/api/user/profile.test.ts 15ms (unchanged)
tests/unit/referral-reward-service.test.ts 17ms (unchanged)
tests/unit/security/deprecated-logging.test.ts 8ms (unchanged)
tests/unit/services/provider-error-mapping.test.ts 1ms (unchanged)
tests/unit/services/webscraper-service.test.ts 6ms (unchanged)
tests/unit/spam-detection.test.ts 3ms (unchanged)
tests/unit/telemetry/telemetry-client.test.ts 2ms (unchanged)
tests/unit/testimonials-loader.test.ts 7ms (unchanged)
tests/unit/utils/database-helpers.test.ts 14ms (unchanged)
tests/unit/utils/locale-path.test.ts 3ms (unchanged)
tests/unit/utils/logger-transport.smoke.test.ts 3ms (unchanged)
tests/unit/utils/logger.test.ts 25ms (unchanged)
tests/unit/utils/mime.test.ts 3ms (unchanged)
tests/unit/utils/server-helpers.test.ts 20ms (unchanged)
tests/unit/validation/billing-schema.test.ts 1ms (unchanged)
tests/unit/validation/dashboard-schema.test.ts 1ms (unchanged)
tests/unit/validation/errors.test.ts 2ms (unchanged)
tests/unit/validation/newsletter-schema.test.ts 1ms (unchanged)
tests/unit/validation/newsletter-unsubscribe-schema.test.ts 1ms (unchanged)
tests/unit/validation/prompt-schema.test.ts 2ms (unchanged)
tests/unit/validation/templates-schema.test.ts 1ms (unchanged)
tests/unit/validation/users-sync-schema.test.ts 1ms (unchanged)
tests/unit/validation/webscraper-schema.test.ts 1ms (unchanged)
tests/unit/voice-stream-aggregator.test.ts 3ms (unchanged)
tests/utils/kv-mock.ts 7ms (unchanged)
scripts/ae-run.mjs 5ms (unchanged)
scripts/align-de-to-en.mjs 3ms (unchanged)
scripts/blog-images-audit.ts 4ms (unchanged)
scripts/blog-images-generate.ts 2ms (unchanged)
scripts/check-readme-structure.mjs 2ms (unchanged)
scripts/check-wrangler-secrets.ts 7ms (unchanged)
scripts/coming-soon-client.ts 3ms (unchanged)
scripts/deploy.ts 3ms (unchanged)
scripts/dev-menu.ts 49ms (unchanged)
scripts/dev/capture-readme-screenshots.mjs 2ms (unchanged)
scripts/dev/clean-contentful-slug-drafts.ts 4ms (unchanged)
scripts/dev/docs-linkgraph.mjs 6ms (unchanged)
scripts/dev/fix-contentful-slug.ts 4ms (unchanged)
scripts/dev/gen-cascade-rules-coverage.mjs 8ms (unchanged)
scripts/dev/gen-memory-index.mjs 7ms (unchanged)
scripts/dev/generate-contentful-migration.ts 5ms (unchanged)
scripts/dev/memory-audit.mjs 7ms (unchanged)
scripts/dev/patch-windsurf-rules.mjs 2ms (unchanged)
scripts/dev/publish-contentful-assets.ts 5ms (unchanged)
scripts/dev/publish-contentful-blog-posts.ts 3ms (unchanged)
scripts/dev/sync-windsurf-rules.mjs 2ms (unchanged)
scripts/dev/test-contentful-fetch.ts 2ms (unchanged)
scripts/dev/update-windsurf-rules.mjs 4ms (unchanged)
scripts/dev/upload-contentful-assets.ts 3ms (unchanged)
scripts/dev/verify-enhancer-download.mjs 4ms (unchanged)
scripts/doc-drift.mjs 2ms (unchanged)
scripts/doc-inventory.mjs 6ms (unchanged)
scripts/doc-links.mjs 4ms (unchanged)
scripts/docs-auto-fix.ts 8ms (unchanged)
scripts/docs-disable-md051.ts 2ms (unchanged)
scripts/docs-fix-anchors.ts 7ms (unchanged)
scripts/docs-fix-heading-levels.ts 3ms (unchanged)
scripts/docs-harmonize-anchors.ts 11ms (unchanged)
scripts/docs-link-audit.mjs 3ms (unchanged)
scripts/emoji-to-icon-codemod.mjs 12ms (unchanged)
scripts/fix-blog-images.ts 5ms (unchanged)
scripts/fix-de-faq-structure.mjs 5ms (unchanged)
scripts/gen-env-doc.mjs 6ms (unchanged)
scripts/gen-openapi.mjs 11ms (unchanged)
scripts/generate-test-fixtures.ts 1ms (unchanged)
scripts/generate-wordmark-outlined.ts 5ms (unchanged)
scripts/health-check.ts 5ms (unchanged)
scripts/hygiene-copy.mjs 1ms (unchanged)
scripts/hygiene-to-assistant.mjs 2ms (unchanged)
scripts/i18n-copy-de-to-en.mjs 2ms (unchanged)
scripts/i18n-diff.mjs 4ms (unchanged)
scripts/i18n-diff.ts 4ms (unchanged)
scripts/i18n-empty-report.mjs 3ms (unchanged)
scripts/i18n-fill-missing.mjs 3ms (unchanged)
scripts/i18n-identical.mjs 3ms (unchanged)
scripts/i18n-migrate-paths.mjs 3ms (unchanged)
scripts/i18n-prune-unused.mjs 3ms (unchanged)
scripts/i18n-validate.mjs 3ms (unchanged)
scripts/mcp/cloudflare-mcp.mjs 4ms (unchanged)
scripts/mcp/gsc-extended.mjs 9ms (unchanged)
scripts/mcp/gsc-run-analysis.mjs 4ms (unchanged)
scripts/migrate-imports.js 6ms (unchanged)
scripts/migrate-imports.mjs 6ms (unchanged)
scripts/migrate-imports.ts 8ms (unchanged)
scripts/onboarding.ts 11ms (unchanged)
scripts/psi-sitemap-audit.mjs 6ms
scripts/quality-check.js 3ms (unchanged)
scripts/remark/remark-demote-h1.ts 2ms (unchanged)
scripts/resend-check.mjs 7ms (unchanged)
scripts/run-hygiene.mjs 6ms (unchanged)
scripts/sanitize-locale.mjs 4ms (unchanged)
scripts/security/scan-secrets.mjs 3ms (unchanged)
scripts/setup-contentful-blog.mjs 3ms (unchanged)
scripts/setup-local-dev.js 28ms (unchanged)
scripts/setup-local-dev.ts 22ms (unchanged)
scripts/smoke-inject-enhancer.mjs 3ms (unchanged)
scripts/validate-env.ts 3ms (unchanged)
scripts/validate-frontmatter.mjs 4ms (unchanged)
scripts/warmup.ts 12ms (unchanged)
scripts/web-eval-executor/executor.ts 9ms (unchanged)
scripts/web-eval-executor/menu.ts 17ms (unchanged)
scripts/web-eval-executor/runner.ts 7ms (unchanged)
scripts/web-eval-executor/types.ts 3ms (unchanged)
scripts/zod-openapi-diff.ts 15ms (unchanged)
scripts/zod-openapi-pilot.ts 4ms (unchanged)
.lintstagedrc.json 1ms (unchanged)
.markdownlint.json 1ms (unchanged)
.prettierrc.json 1ms (unchanged)
AGENTS.md 25ms (unchanged)
api-extractor.json 1ms (unchanged)
blog-post-content-type.json 1ms (unchanged)
cache-rules-ci.json 1ms (unchanged)
cache-rules-create.json 2ms (unchanged)
cache-rules-rules.json 1ms (unchanged)
cf-create-ruleset.json 1ms (unchanged)
CHANGELOG.md 17ms (unchanged)
CLAUDE.md 0ms (unchanged)
CODE_OF_CONDUCT.md 3ms (unchanged)
combined-rules.json 1ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-09-01.json 1ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-11-11.json 1ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-16-05.json 1ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-21-42.json 1ms (unchanged)
CONTRIBUTING.md 12ms (unchanged)
developer.mozilla.org--mdn-web-docs--20251025-090628_scrapedwithhub-evolutioncom.json 2ms (unchanged)
existing-rules.json 2ms (unchanged)
package.json 3ms (unchanged)
README.md 26ms (unchanged)
renovate.json 0ms (unchanged)
ruleset-current-staging.json 1ms (unchanged)
rulesets-list.json 1ms (unchanged)
rulesets-staging-list.json 1ms (unchanged)
staging-rules.json 0ms (unchanged)
tsconfig.ai.json 0ms (unchanged)
tsconfig.astro-check.json 0ms (unchanged)
tsconfig.astro-check.ui.json 1ms (unchanged)
tsconfig.astro.json 0ms (unchanged)
tsconfig.build.json 0ms (unchanged)
tsconfig.json 1ms (unchanged)
tsconfig.src.json 0ms (unchanged)
tsconfig.types.json 1ms (unchanged)
tsdoc.json 1ms (unchanged)
update-payload.json 1ms (unchanged)
update-staging.json 1ms (unchanged)

```

### i18n-audit

```text
i18n empty strings report
- en: 24 empty values
- de: 26 empty values

Empty keys in en:
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

Empty keys in de:
 - pages.dashboard.referrals.retry
 - pages.home.hero.status_labels.cta
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

> evolution-hub@0.0.1 i18n:validate
> node scripts/i18n-validate.mjs

[i18n:validate] OK: Strukturen sind konsistent für nav, nav_language, cta, comingSoon, pages.home, pages.blog, pages.tools, pages.pricing, pages.kontakt, pages.verifyEmail, pages.impressum, pages.datenschutz

> evolution-hub@0.0.1 i18n:diff
> node scripts/i18n-diff.mjs

Missing in de (present in en): 0
Missing in en (present in de): 0
[i18n:audit] $ npm run i18n:audit

> evolution-hub@0.0.1 i18n:audit
> npm run i18n:report && npm run i18n:validate && npm run i18n:diff


> evolution-hub@0.0.1 i18n:report
> node scripts/i18n-empty-report.mjs

i18n empty strings report
- en: 24 empty values
- de: 26 empty values

Empty keys in en:
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

Empty keys in de:
 - pages.dashboard.referrals.retry
 - pages.home.hero.status_labels.cta
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

> evolution-hub@0.0.1 i18n:validate
> node scripts/i18n-validate.mjs

[i18n:validate] OK: Strukturen sind konsistent für nav, nav_language, cta, comingSoon, pages.home, pages.blog, pages.tools, pages.pricing, pages.kontakt, pages.verifyEmail, pages.impressum, pages.datenschutz

> evolution-hub@0.0.1 i18n:diff
> node scripts/i18n-diff.mjs

Missing in de (present in en): 0
Missing in en (present in de): 0
[i18n:audit] $ npm run i18n:audit

> evolution-hub@0.0.1 i18n:audit
> npm run i18n:report && npm run i18n:validate && npm run i18n:diff


> evolution-hub@0.0.1 i18n:report
> node scripts/i18n-empty-report.mjs

i18n empty strings report
- en: 24 empty values
- de: 26 empty values

Empty keys in en:
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

Empty keys in de:
 - pages.dashboard.referrals.retry
 - pages.home.hero.status_labels.cta
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

> evolution-hub@0.0.1 i18n:validate
> node scripts/i18n-validate.mjs

[i18n:validate] OK: Strukturen sind konsistent für nav, nav_language, cta, comingSoon, pages.home, pages.blog, pages.tools, pages.pricing, pages.kontakt, pages.verifyEmail, pages.impressum, pages.datenschutz

> evolution-hub@0.0.1 i18n:diff
> node scripts/i18n-diff.mjs

Missing in de (present in en): 0
Missing in en (present in de): 0
[i18n:audit] $ npm run i18n:audit

> evolution-hub@0.0.1 i18n:audit
> npm run i18n:report && npm run i18n:validate && npm run i18n:diff


> evolution-hub@0.0.1 i18n:report
> node scripts/i18n-empty-report.mjs

i18n empty strings report
- en: 24 empty values
- de: 26 empty values

Empty keys in en:
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

Empty keys in de:
 - pages.dashboard.referrals.retry
 - pages.home.hero.status_labels.cta
 - pages.kontakt.info.contact.fax
 - pages.kontakt.info.contact.phone
 - pages.kontakt.info.content_responsible.city_postal_code
 - pages.kontakt.info.content_responsible.name
 - pages.kontakt.info.content_responsible.street
 - pages.kontakt.info.disclaimer.content_liability.paragraph1
 - pages.kontakt.info.disclaimer.content_liability.paragraph2
 - pages.kontakt.info.disclaimer.copyright.paragraph1
 - pages.kontakt.info.disclaimer.copyright.paragraph2
 - pages.kontakt.info.disclaimer.link_liability.paragraph1
 - pages.kontakt.info.disclaimer.link_liability.paragraph2
 - pages.kontakt.info.dispute_resolution.email_note
 - pages.kontakt.info.dispute_resolution.os_platform_intro
 - pages.kontakt.info.dispute_resolution.participation_statement
 - pages.kontakt.info.phone_number
 - pages.kontakt.info.provider.city_postal_code
 - pages.kontakt.info.provider.company_name
 - pages.kontakt.info.provider.country
 - pages.kontakt.info.provider.street_address
 - pages.kontakt.info.registration.register_court
 - pages.kontakt.info.registration.register_entry
 - pages.kontakt.info.registration.register_number
 - pages.kontakt.info.represented_by.managing_directors
 - pages.kontakt.info.vat.vat_id

> evolution-hub@0.0.1 i18n:validate
> node scripts/i18n-validate.mjs

[i18n:validate] OK: Strukturen sind konsistent für nav, nav_language, cta, comingSoon, pages.home, pages.blog, pages.tools, pages.pricing, pages.kontakt, pages.verifyEmail, pages.impressum, pages.datenschutz

> evolution-hub@0.0.1 i18n:diff
> node scripts/i18n-diff.mjs

Missing in de (present in en): 0
Missing in en (present in de): 0

```

### lint-md

```text
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[lint:md] $ npm run lint:md

> evolution-hub@0.0.1 lint:md
> markdownlint-cli2 --config .markdownlint-cli2.jsonc "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 126 file(s)
Summary: 0 error(s)

```

### lint-strict

```text
[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/dashboard/AccountSettingsSection.astro
  327:45  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/comments.astro
  68:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
   41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
  117:63  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/dashboard.astro
  16:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  39:64  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/dashboard.astro
  14:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/tools/imag-enhancer/app.astro
  130:47  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/faq.astro
  38:72  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:47  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 10 problems (1 error, 9 warnings)

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/dashboard/AccountSettingsSection.astro
  327:45  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/comments.astro
  68:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
   41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
  117:63  warning  Unexpected any. Specify a different type                                      @typescript-eslint/no-explicit-any

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/dashboard.astro
  16:32  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/dashboard.astro
  14:32  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/en/tools/imag-enhancer/app.astro
  130:43  error  'App' is not defined  no-undef

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 8 problems (5 errors, 3 warnings)

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
  41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 2 problems (1 error, 1 warning)

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/admin/status.astro
  41:12  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 2 problems (1 error, 1 warning)

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/tools/imag-enhancer/app.astro
  143:43  error  'App' is not defined  no-undef

✖ 1 problem (1 error, 0 warnings)

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/testing/evaluate/next/run.ts
  351:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

ESLint found too many warnings (maximum: 0).
[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/pages/api/testing/evaluate/next/run.ts
  351:14  warning  'e' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)

ESLint found too many warnings (maximum: 0).
[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0

[lint(strict)] $ npm run lint -- --max-warnings=0

> evolution-hub@0.0.1 lint
> eslint 'src/**/*.{ts,astro}' --max-warnings=280 --max-warnings=0


```

### md-fix

```text
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 123 file(s)
Summary: 0 error(s)
[md:fix] $ npm run lint:md:fix

> evolution-hub@0.0.1 lint:md:fix
> markdownlint-cli2 --fix "docs/**/*.md"

markdownlint-cli2 v0.18.1 (markdownlint v0.38.0)
Finding: docs/**/*.md
Linting: 126 file(s)
Summary: 0 error(s)

```

### openapi-validate

```text
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid
[openapi:validate] $ npm run openapi:validate

> evolution-hub@0.0.1 openapi:validate
> npx swagger-cli validate openapi.yaml

openapi.yaml is valid

```

### security-scan

```text
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.
[security:scan] $ npm run security:scan

> evolution-hub@0.0.1 security:scan
> node ./scripts/security/scan-secrets.mjs

[security:scan] OK — no obvious secrets detected.

```

### test-integration-debug

```text
    hasHeader: false,
    hasCookie: false
  }
}
[2025-11-12T18:46:59.291Z] [DEBUG][5alihypr] [Middleware] Outgoing response
Context: {
  "requestId": "5alihyprmhwcqi1n",
  "status": 403,
  "statusText": "Forbidden",
  "headers": {
    "content-type": "application/json",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  }
}
[2025-11-12T18:46:59.291Z] [DEBUG][5alihypr] [Middleware] Processing path
Context: {
  "requestId": "5alihyprmhwcqi1n",
  "path": "/api/admin/credits/deduct"
}
[2025-11-12T18:46:59.291Z] [INFO][5alihypr] POST /api/admin/credits/deduct -> 403
Context: {
  "requestId": "5alihyprmhwcqi1n",
  "duration": 0,
  "status": 403
}
[wrangler:info] POST /api/admin/credits/deduct 403 Forbidden (3ms)
[dev] [2025-11-12T18:46:59.294Z] [INFO][1slibmq9] GET /
Context: {
  "requestId": "1slibmq9mhwcqi1q",
  "endpoint": "/",
  "method": "GET"
}
[2025-11-12T18:46:59.295Z] [DEBUG][1slibmq9] [Middleware] pref_locale cookie explicitly set
Context: {
  "requestId": "1slibmq9mhwcqi1q",
  "targetLocale": "en"
}
[wrangler:info] GET / 301 Moved Permanently (3ms)
 ✓ |integration| tests/integration/routing/lang-alias.test.ts > Locale alias ?lang= > redirects using ?lang=en&next=/pricing to /en/pricing 141ms
 ✓ |integration| tests/integration/api/admin-credits-deduct.test.ts > Admin Credits Deduct — auth/csrf checks > POST /api/admin/credits/deduct without CSRF → 403 130ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should validate request structure 2ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should require URL field 0ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should accept valid HTTP URLs 0ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should reject invalid URL formats 0ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should handle response format 1ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should handle error response format 0ms
 ✓ |integration| tests/integration/api/webscraper.test.ts > Webscraper API Integration Tests > should validate quota response 0ms
 ✓ |integration| tests/integration/kv-usage.test.ts > KV usage helpers (integration-ish with in-memory KV) > getUsage returns null when key missing; incrementMonthlyNoTtl sets count and resetAt 1ms
 ✓ |integration| tests/integration/kv-usage.test.ts > KV usage helpers (integration-ish with in-memory KV) > incrementDailyRolling increments within a small window and enforces limit flag 0ms
stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled
[2025-11-12T18:46:59.425Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/billing/stripe-webhook'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled
[stripe_webhook] received { id: [32m'evt_checkout'[39m, type: [32m'checkout.session.completed'[39m }

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled
[stripe_webhook] referral_reward_verified { userId: [32m'user-123'[39m, referralEventId: [32m'evt_test'[39m }
[stripe_webhook] handled checkout.session.completed {
  userId: [32m'user-123'[39m,
  customerId: [32m'set'[39m,
  subscriptionId: [32m'set'[39m,
  plan: [32m'pro'[39m
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled
[2025-11-12T18:46:59.431Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/billing/stripe-webhook'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled
[stripe_webhook] received { id: [32m'evt_checkout_disabled'[39m, type: [32m'checkout.session.completed'[39m }

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled
[stripe_webhook] handled checkout.session.completed {
  userId: [32m'user-222'[39m,
  customerId: [32m'set'[39m,
  subscriptionId: [32m'set'[39m,
  plan: [32m'pro'[39m
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update
[2025-11-12T18:46:59.435Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/billing/stripe-webhook'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update
[stripe_webhook] received {
  id: [32m'evt_subscription_update'[39m,
  type: [32m'customer.subscription.updated'[39m
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update
[stripe_webhook] referral_reward_verified {
  userId: [32m'user-linked'[39m,
  referralEventId: [32m'evt_test'[39m,
  subscriptionId: [32m'sub_789'[39m
}
[stripe_webhook] handled subscription event {
  event: [32m'customer.subscription.updated'[39m,
  userId: [32m'user-linked'[39m,
  status: [32m'active'[39m,
  plan: [32m'pro'[39m
}

stdout | tests/integration/api/ai-video/usage.test.ts > GET /api/ai-video/usage > returns guest limits when no KV entry exists
[2025-11-12T18:46:59.431Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/usage'[39m, method: [32m'GET'[39m }
}

 ✓ |integration| tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled 22ms
 ✓ |integration| tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled 4ms
 ✓ |integration| tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update 2ms
stdout | tests/integration/api/ai-video/usage.test.ts > GET /api/ai-video/usage > honours existing KV usage for users
[2025-11-12T18:46:59.447Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user-123'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/usage'[39m, method: [32m'GET'[39m }
}

 ✓ |integration| tests/integration/api/ai-video/usage.test.ts > GET /api/ai-video/usage > returns guest limits when no KV entry exists 26ms
 ✓ |integration| tests/integration/api/ai-video/usage.test.ts > GET /api/ai-video/usage > honours existing KV usage for users 4ms
 ↓ |integration| tests/integration/magic-link-happy.test.ts > Magic Link Happy Path (dev bypass) > GET /api/auth/callback?token=dev-ok&email=...&r=/dashboard -> 302 to /dashboard and session works
 ✓ |integration| tests/integration/api/admin-users-set-plan-happy.test.ts > Admin Users Set Plan — happy paths (opt-in with STRIPE config) > POST set-plan upgrade to pro (monthly, proration none) → 200 when Stripe configured 1ms
 ✓ |integration| tests/integration/api/admin-users-set-plan-happy.test.ts > Admin Users Set Plan — happy paths (opt-in with STRIPE config) > POST set-plan downgrade to free (cancel at period end) → 200 when Stripe configured 0ms
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments > should create a comment successfully for authenticated user
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments > should create a comment for guest user
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments > should reject comment with insufficient content length
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments > should reject comment with excessive length
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments > should reject comment with spam content
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments > should enforce rate limiting
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments > should list comments for an entity
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments > should filter comments by status
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments > should paginate results correctly
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments > should return empty result for non-existent entity
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments/[id] > should retrieve comment by ID
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments/[id] > should throw error for non-existent comment
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > PUT /api/comments/[id] > should update comment successfully
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > PUT /api/comments/[id] > should reject update with invalid content
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > PUT /api/comments/[id] > should reject update by non-author
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > DELETE /api/comments/[id] > should delete comment successfully
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > DELETE /api/comments/[id] > should reject deletion by non-author
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments/[id]/moderate > should approve comment successfully
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments/[id]/moderate > should reject comment successfully
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments/[id]/moderate > should flag comment successfully
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments/[id]/report > should report comment successfully
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > POST /api/comments/[id]/report > should reject duplicate reports from same user
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > GET /api/comments/stats > should return comment statistics
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > Nested Comments (Replies) > should create reply to comment
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > Nested Comments (Replies) > should limit reply depth
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > Comment Validation and Security > should sanitize HTML content
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > Comment Validation and Security > should validate entity type
 ↓ |integration| tests/integration/comments.test.ts > Comment API Integration Tests > Comment Validation and Security > should validate entity ID format
stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > charges credits when balance is sufficient
[2025-11-12T18:46:59.719Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user1'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/generate'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > uses monthly quota when credits are 0 and quota remains
[2025-11-12T18:46:59.724Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user1'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/generate'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > returns insufficient_quota when credits=0 and quota exhausted
[2025-11-12T18:46:59.726Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user1'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/generate'[39m, method: [32m'POST'[39m }
}

 ✓ |integration| tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > charges credits when balance is sufficient 16ms
 ✓ |integration| tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > uses monthly quota when credits are 0 and quota remains 2ms
 ✓ |integration| tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > returns insufficient_quota when credits=0 and quota exhausted 1ms

 Test Files  2 failed | 50 passed | 2 skipped (54)
      Tests  2 failed | 249 passed | 35 skipped (286)
   Start at  19:46:35
   Duration  24.53s (transform 1.18s, setup 0ms, collect 3.83s, tests 32.42s, environment 10ms, prepare 4.06s)

[dev] 🪵  Logs were written to "/Users/lucas/Library/Preferences/.wrangler/logs/wrangler-2025-11-12_18-46-51_414.log"
(node:57743) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Error: in prepare, no such table: notifications
⚠️ Could not add column notifications.is_read on /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9510d25c6d8e2674e15c2fca537338f4d182e73228e0d7f57d38d82ad01d2ce5.sqlite (may already exist). Error: Command failed: sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9510d25c6d8e2674e15c2fca537338f4d182e73228e0d7f57d38d82ad01d2ce5.sqlite "ALTER TABLE notifications ADD COLUMN is_read INTEGER DEFAULT 0;"
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at addColumnIfMissing (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:68:13)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:636:17
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 57921,
  stdout: null,
  stderr: null
}
(node:58012) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel as owner -> 200 success envelope with status=canceled
[integration] jobId is empty; skipping owner cancel test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} as owner -> 200 success envelope
[integration] jobId is empty; skipping owner GET test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and sets guest_id
[integration] jobId is empty; skipping unauth GET test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} with different guest_id -> 403 forbidden envelope
[integration] jobId is empty; skipping non-owner GET test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel with different guest_id -> 403 forbidden envelope
[integration] jobId is empty; skipping non-owner cancel test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > R2 proxy: GET uploads URL is public and cached (Cache-Control: public, max-age=900, immutable)
[integration] uploadUrl is null (R2 not configured); skipping this test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > Rate limiting: excessive GET /api/ai-image/jobs/{id} eventually returns 429 with Retry-After
[integration] No 429 observed on GET /api/ai-image/jobs in dev; skipping strict assertion


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/generate (multipart) -> 200 success envelope with limits
AssertionError: expected [ 200, 403 ] to include 429
 ❯ tests/integration/ai-image-enhancer.test.ts:456:24
    454|       },
    455|     });
    456|     expect([200, 403]).toContain(res.status);
       |                        ^
    457|     if (res.status !== 200) return;
    458|     const body = await json<ApiEnvelope<unknown>>(res);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  |integration| tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte Rate-Limiting korrekt handhaben
AssertionError: expected undefined to be false // Object.is equality

[32m- Expected:[39m 
false

[31m+ Received:[39m 
undefined

 ❯ tests/integration/lead-magnet-api.test.ts:206:32
    204|         const json = safeParseJson<ApiJson>(responses[0].text);
    205|         if (json) {
    206|           expect(json.success).toBe(false);
       |                                ^
    207|         }
    208|       }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


```

### test-integration-run

```text
}
[dev] [wrangler:info] POST /api/testing/evaluate 200 OK (6ms)
[dev] [2025-11-12T18:46:33.512Z] [INFO][6fya0duq] POST /api/testing/evaluate/next
Context: {
  "requestId": "6fya0duqmhwcpy5k",
  "endpoint": "/api/testing/evaluate/next",
  "method": "POST"
}
[2025-11-12T18:46:33.512Z] [DEBUG][6fya0duq] [Middleware] Session ID from cookie
Context: {
  "requestId": "6fya0duqmhwcpy5k",
  "present": false
}
[2025-11-12T18:46:33.514Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: 'security',
  userId: 'anonymous',
  ipAddress: '::1',
  securityEventType: 'API_ACCESS',
  details: { endpoint: '/api/testing/evaluate/next', method: 'POST' }
}
[dev] [2025-11-12T18:46:33.521Z] [DEBUG][6fya0duq] [Middleware] Outgoing response
Context: {
  "requestId": "6fya0duqmhwcpy5k",
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  }
}
[2025-11-12T18:46:33.522Z] [DEBUG][6fya0duq] [Middleware] Processing path
Context: {
  "requestId": "6fya0duqmhwcpy5k",
  "path": "/api/testing/evaluate/next"
}
[dev] [2025-11-12T18:46:33.522Z] [INFO][6fya0duq] POST /api/testing/evaluate/next -> 200 (10ms)
Context: {
  "requestId": "6fya0duqmhwcpy5k",
  "duration": 10,
  "status": 200
}
[wrangler:info] POST /api/testing/evaluate/next 200 OK (12ms)
[dev] [2025-11-12T18:46:33.528Z] [INFO][6nbfb2fm] POST /api/testing/evaluate/next
Context: {
  "requestId": "6nbfb2fmmhwcpy60",
  "endpoint": "/api/testing/evaluate/next",
  "method": "POST"
}
[2025-11-12T18:46:33.528Z] [DEBUG][6nbfb2fm] [Middleware] Session ID from cookie
Context: {
  "requestId": "6nbfb2fmmhwcpy60",
  "present": false
}
[2025-11-12T18:46:33.531Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: 'security',
  userId: 'anonymous',
  ipAddress: '::1',
  securityEventType: 'API_ACCESS',
  details: { endpoint: '/api/testing/evaluate/next', method: 'POST' }
}
stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled
[2025-11-12T18:46:33.550Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/billing/stripe-webhook'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled
[stripe_webhook] received { id: [32m'evt_checkout'[39m, type: [32m'checkout.session.completed'[39m }

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > calls verifyReferral on checkout.session.completed when rewards enabled
[stripe_webhook] referral_reward_verified { userId: [32m'user-123'[39m, referralEventId: [32m'evt_test'[39m }
[stripe_webhook] handled checkout.session.completed {
  userId: [32m'user-123'[39m,
  customerId: [32m'set'[39m,
  subscriptionId: [32m'set'[39m,
  plan: [32m'pro'[39m
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled
[2025-11-12T18:46:33.559Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/billing/stripe-webhook'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled
[stripe_webhook] received { id: [32m'evt_checkout_disabled'[39m, type: [32m'checkout.session.completed'[39m }

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > skips verifyReferral when rewards feature flag disabled
[stripe_webhook] handled checkout.session.completed {
  userId: [32m'user-222'[39m,
  customerId: [32m'set'[39m,
  subscriptionId: [32m'set'[39m,
  plan: [32m'pro'[39m
}

stdout | tests/integration/api/ai-video/usage.test.ts > GET /api/ai-video/usage > returns guest limits when no KV entry exists
[2025-11-12T18:46:33.552Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/usage'[39m, method: [32m'GET'[39m }
}

stdout | tests/integration/api/ai-video/usage.test.ts > GET /api/ai-video/usage > honours existing KV usage for users
[2025-11-12T18:46:33.556Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user-123'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/usage'[39m, method: [32m'GET'[39m }
}

[dev] [2025-11-12T18:46:33.556Z] [DEBUG][6nbfb2fm] [Middleware] Outgoing response
Context: {
  "requestId": "6nbfb2fmmhwcpy60",
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  }
}
[2025-11-12T18:46:33.556Z] [DEBUG][6nbfb2fm] [Middleware] Processing path
Context: {
  "requestId": "6nbfb2fmmhwcpy60",
  "path": "/api/testing/evaluate/next"
}
[2025-11-12T18:46:33.556Z] [INFO][6nbfb2fm] POST /api/testing/evaluate/next -> 200 (28ms)
Context: {
  "requestId": "6nbfb2fmmhwcpy60",
  "duration": 28,
  "status": 200
}
[wrangler:info] POST /api/testing/evaluate/next 200 OK (33ms)
stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update
[2025-11-12T18:46:33.561Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'anonymous'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/billing/stripe-webhook'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update
[stripe_webhook] received {
  id: [32m'evt_subscription_update'[39m,
  type: [32m'customer.subscription.updated'[39m
}

stdout | tests/integration/api/referrals/referral-rewards-webhook.test.ts > POST /api/billing/stripe-webhook referral rewards integration > triggers verifyReferral on active subscription update
[stripe_webhook] referral_reward_verified {
  userId: [32m'user-linked'[39m,
  referralEventId: [32m'evt_test'[39m,
  subscriptionId: [32m'sub_789'[39m
}
[stripe_webhook] handled subscription event {
  event: [32m'customer.subscription.updated'[39m,
  userId: [32m'user-linked'[39m,
  status: [32m'active'[39m,
  plan: [32m'pro'[39m
}

 ✓ |integration| tests/integration/api/ai-video/usage.test.ts (2 tests) 22ms
 ✓ |integration| tests/integration/api/web-eval-next.test.ts (3 tests) 303ms
 ✓ |integration| tests/integration/api/referrals/referral-rewards-webhook.test.ts (3 tests) 27ms
 ✓ |integration| tests/integration/kv-usage.test.ts (2 tests) 2ms
 ✓ |integration| tests/integration/api/admin-users-set-plan-happy.test.ts (2 tests) 1ms
 ✓ |integration| tests/integration/api/webscraper.test.ts (7 tests) 3ms
 ↓ |integration| tests/integration/magic-link-happy.test.ts (1 test | 1 skipped)
stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > charges credits when balance is sufficient
[2025-11-12T18:46:33.797Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user1'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/generate'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > uses monthly quota when credits are 0 and quota remains
[2025-11-12T18:46:33.802Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user1'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/generate'[39m, method: [32m'POST'[39m }
}

stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > returns insufficient_quota when credits=0 and quota exhausted
[2025-11-12T18:46:33.804Z] [INFO] API_ACCESS {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user1'[39m,
  ipAddress: [32m'unknown'[39m,
  securityEventType: [32m'API_ACCESS'[39m,
  details: { endpoint: [32m'/api/ai-video/generate'[39m, method: [32m'POST'[39m }
}

 ✓ |integration| tests/integration/api/ai-video/generate.test.ts (3 tests) 22ms
 ↓ |integration| tests/integration/comments.test.ts (28 tests | 28 skipped)

 Test Files  1 failed | 51 passed | 2 skipped (54)
      Tests  1 failed | 250 passed | 35 skipped (286)
   Start at  19:45:56
   Duration  37.53s (transform 1.29s, setup 0ms, collect 4.16s, tests 46.40s, environment 11ms, prepare 4.81s)

[dev] 🪵  Logs were written to "/Users/lucas/Library/Preferences/.wrangler/logs/wrangler-2025-11-12_18-46-21_731.log"
(node:56957) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Error: in prepare, no such table: notifications
⚠️ Could not add column notifications.is_read on /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9510d25c6d8e2674e15c2fca537338f4d182e73228e0d7f57d38d82ad01d2ce5.sqlite (may already exist). Error: Command failed: sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/9510d25c6d8e2674e15c2fca537338f4d182e73228e0d7f57d38d82ad01d2ce5.sqlite "ALTER TABLE notifications ADD COLUMN is_read INTEGER DEFAULT 0;"
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at addColumnIfMissing (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:68:13)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:636:17
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 57179,
  stdout: null,
  stderr: null
}
(node:57282) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
(Use `node --trace-warnings ...` to show where the warning was created)
stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel as owner -> 200 success envelope with status=canceled
[integration] jobId is empty; skipping owner cancel test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} as owner -> 200 success envelope
[integration] jobId is empty; skipping owner GET test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and sets guest_id
[integration] jobId is empty; skipping unauth GET test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} with different guest_id -> 403 forbidden envelope
[integration] jobId is empty; skipping non-owner GET test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel with different guest_id -> 403 forbidden envelope
[integration] jobId is empty; skipping non-owner cancel test

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > R2 proxy: GET uploads URL is public and cached (Cache-Control: public, max-age=900, immutable)
[integration] uploadUrl is null (R2 not configured); skipping this test

stderr | tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte Rate-Limiting korrekt handhaben
[integration] No 429 observed on lead-magnet rate-limit in dev; skipping strict check

stderr | tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > Rate limiting: excessive GET /api/ai-image/jobs/{id} eventually returns 429 with Retry-After
[integration] No 429 observed on GET /api/ai-image/jobs in dev; skipping strict assertion


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/api/web-eval-complete.test.ts > /api/testing/evaluate/:id/complete > rejects invalid payload → 400 validation_error
AssertionError: expected 403 to be 400 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 400[39m
[31m+ 403[39m

 ❯ tests/integration/api/web-eval-complete.test.ts:97:24
     95|       { 'x-executor-token': EXECUTOR_TOKEN as string }
     96|     );
     97|     expect(res.status).toBe(400);
       |                        ^
     98|     expect(json?.success).toBe(false);
     99|     expect(json?.error?.type).toBe('validation_error');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


```

### test-unit-debug

```text
This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)

stderr | tests/unit/lib/rate-limiter-kv.test.ts > KV-backed rate limiter > persists counters across limiter instances via KV
[2025-11-12T13:08:14.429Z] [ERROR] Security Event: RATE_LIMIT_EXCEEDED
Context: {
  "ipAddress": "127.0.0.1",
  "targetResource": "/api/kv",
  "securityEventType": "RATE_LIMIT_EXCEEDED",
  "originalDetails": {
    "limiterName": "kvLimiterTest",
    "maxRequests": 2,
    "windowMs": 10000,
    "resetAt": 1762952904429
  },
  "logLevel": "error",
  "eventSnapshot": {
    "type": "RATE_LIMIT_EXCEEDED",
    "targetResource": "/api/kv",
    "ipAddress": "127.0.0.1",
    "timestamp": 1762952894429,
    "details": {
      "limiterName": "kvLimiterTest",
      "maxRequests": 2,
      "windowMs": 10000,
      "resetAt": 1762952904429
    }
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-12T13:08:14.462Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m401[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'unauthorized'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 403 to forbidden
[2025-11-12T13:08:14.465Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m403[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'forbidden'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 404 to validation_error
[2025-11-12T13:08:14.466Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m404[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'not found'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 422 to validation_error
[2025-11-12T13:08:14.466Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m422[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'unprocessable'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 500 to server_error
[2025-11-12T13:08:14.467Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m500[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'server err'[39m
  }
}

stderr | tests/unit/i18n.test.ts > i18n Utils > should return fallback for non-existing key
Key "non.existing.key" not found in locale "de". Falling back to English.

stderr | tests/unit/i18n.test.ts > i18n Utils > should fallback to English for unknown locale (simulated)
Locale "xx" not found. Using English as fallback.

stderr | tests/unit/ai-image/aiimage-retry.test.ts > AiImageService - Workers AI tiny output retry > retries once on tiny output and succeeds with larger image
[2025-11-12T13:08:15.181Z] [WARN] workers_ai_tiny_output_retry {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'workers_ai_tiny_output_retry'[39m,
  metadata: { model: [32m'@cf/runwayml/stable-diffusion-v1-5-img2img'[39m, bytes: [33m1000[39m }
}

stderr | tests/unit/utils/logger-transport.smoke.test.ts > logger transports smoke > routes SecurityLogger through transport with redaction
[2025-11-12T13:08:15.257Z] [ERROR] AUTH_FAILURE {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'u_9'[39m,
  securityEventType: [32m'AUTH_FAILURE'[39m,
  details: { reason: [32m'invalid_password'[39m, password: [32m'[FILTERED]'[39m }
}


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |unit| tests/unit/blog-sorting.spec.ts > Blog sorting by updatedDate ?? pubDate (desc) > BlogService.getBlogIndexData returns posts sorted by updatedDate first, then pubDate desc
AssertionError: expected 'updated-new' to be 'UpdatedNew' // Object.is equality

Expected: [32m"[7mU[27mpdated[7mN[27mew"[39m
Received: [31m"[7mu[27mpdated[7m-n[27mew"[39m

 ❯ tests/unit/blog-sorting.spec.ts:147:23
    145|     const { posts } = await blog.getBlogIndexData(1, 50, { includeDraf…
    146|     const titles = posts.map((p) => String(p.data.title));
    147|     expect(titles[0]).toBe('UpdatedNew');
       |                       ^
    148|     expect(titles).toContain('NewPublished');
    149|     expect(titles).toContain('Old');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  |unit| tests/unit/prompt-enhancer-service.test.ts > PromptEnhancerService > enhance > should throw quota exceeded error when limit reached
AssertionError: expected "spy" to be called with arguments: [ 'enhance_failed', …(1) ][90m

Received: 

[1m  1st spy call:

[22m[2m  [[22m
[2m    "enhance_failed",[22m
[32m-   ObjectContaining {[90m
[31m+   {[90m
[31m+     "metadata": {[90m
[2m        "errorKind": "quota_exceeded",[22m
[31m+       "inputLength": 31,[90m
[31m+       "ownerIdSuffix": "t-id",[90m
[31m+       "ownerType": "guest",[90m
[31m+     },[90m
[31m+     "requestId": "enhance-1762952891867-03m10",[90m
[2m    },[22m
[2m  ][22m
[39m[90m

Number of calls: [1m1[22m
[39m
 ❯ tests/unit/prompt-enhancer-service.test.ts:205:32
    203|         service.enhance(defaultInput, defaultOptions, 'guest', 'test-g…
    204|       ).rejects.toThrow('Quota exceeded. Used 5/5');
    205|       expect(mockLogger.error).toHaveBeenCalledWith('enhance_failed', …
       |                                ^
    206|     });
    207| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  |unit| tests/unit/lib/ai-image-service.test.ts > AiImageService > getUsage > delegates to rolling usage helper when KV v2 is enabled
AssertionError: expected "spy" to be called with arguments: [ { get: [Function spy], …(1) }, …(1) ][90m

Received: 

[1m  1st spy call:

[22m[2m  [[22m
[2m    {[22m
[2m      "get": [Function spy],[22m
[2m      "put": [Function spy],[22m
[2m    },[22m
[32m-   "ai:rolling:key",[90m
[31m+   undefined,[90m
[2m  ][22m
[39m[90m

Number of calls: [1m1[22m
[39m
 ❯ tests/unit/lib/ai-image-service.test.ts:81:32
     79|       const result = await service.getUsage('user' as OwnerType, 'abc'…
     80| 
     81|       expect(mockedKvGetUsage).toHaveBeenCalledWith(kv, 'ai:rolling:ke…
       |                                ^
     82|       expect(result).toEqual({ used: 4, limit: 10, resetAt: 1700000 * …
     83|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯


```

### test-unit-run

```text
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useUsage.test.tsx:16:93)

stderr | tests/unit/comment-components.test.tsx > CommentList > should handle comment deletion
Error: Not implemented: window.confirm
    at module.exports (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
    at /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/browser/Window.js:960:7
    at handleDelete (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/comments/CommentList.tsx:127:9)
    at HTMLUnknownElement.callCallback (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/react-dom/cjs/react-dom.development.js:4164:14)
    at HTMLUnknownElement.callTheUserObjectsOperation (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/generated/EventListener.js:26:30)
    at innerInvokeEventListeners (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:350:25)
    at invokeEventListeners (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
    at HTMLUnknownElementImpl._dispatch (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
    at HTMLUnknownElementImpl.dispatchEvent (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
    at HTMLUnknownElement.dispatchEvent (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js:241:34) [90mundefined[39m

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject non-HTTP(S) URLs
[2025-11-12T18:46:00.890Z] [ERROR] scrape_failed {
  timestamp: {},
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762973160876-gdkv4'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'ftp://example.com'[39m,
  error: [32m'Only HTTP/HTTPS URLs are allowed'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject blocked domains (or invalid port)
[2025-11-12T18:46:00.892Z] [ERROR] scrape_failed {
  timestamp: {},
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762973160892-9py48'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'http://localhost:3000'[39m,
  error: [32m'Only ports 80/443 are allowed'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject too long URLs
[2025-11-12T18:46:00.896Z] [ERROR] scrape_failed {
  timestamp: {},
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762973160893-qeg8l'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa…'[39m,
  error: [32m'URL too long or empty'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > Quota Management > should enforce guest quota
[2025-11-12T18:46:00.934Z] [ERROR] scrape_failed {
  timestamp: {},
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762973160934-6if5v'[39m,
  errorKind: [32m'quota_exceeded'[39m,
  url: [32m'https://example.com'[39m,
  ownerType: [32m'guest'[39m,
  ownerId: [32m'-123'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > Robots.txt Compliance > should block scraping when robots.txt disallows
[2025-11-12T18:46:00.942Z] [ERROR] scrape_failed {
  timestamp: {},
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762973160942-gfulw'[39m,
  errorKind: [32m'robots_txt_blocked'[39m,
  url: [32m'https://example.com/admin'[39m
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > callCustomAssistant > should throw error on run failure (status: failed)
[2025-11-12T18:46:02.832Z] [ERROR] assistant_call_failed {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_call_failed'[39m,
  metadata: { error: [32m'Thread creation returned no id'[39m }
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > callCustomAssistant > should throw error if no assistant message
[2025-11-12T18:46:02.840Z] [ERROR] assistant_call_failed {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_call_failed'[39m,
  metadata: { error: [32m'Thread creation returned no id'[39m }
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > callCustomAssistant > should throw error on network error during run creation
[2025-11-12T18:46:02.844Z] [ERROR] assistant_call_failed {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_call_failed'[39m,
  metadata: { error: [32m'Thread creation returned no id'[39m }
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > generate with assistant > should ignore invalid assistant suggestion and use original params
[2025-11-12T18:46:02.864Z] [WARN] assistant_suggestion_parse_failed {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_suggestion_parse_failed'[39m,
  metadata: { assistantId: [32m'asst-123'[39m }
}

stderr | tests/unit/pages/api/user/profile.test.ts > POST /api/user/profile > propagates database errors as server error response
[2025-11-12T18:46:03.029Z] [ERROR] Error in POST /api/user/profile: Database error during update { timestamp: {}, resource: [32m'api-middleware'[39m }
[2025-11-12T18:46:03.038Z] [ERROR] API_ERROR {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'user-123'[39m,
  ipAddress: [32m'127.0.0.1'[39m,
  securityEventType: [32m'API_ERROR'[39m,
  details: {
    endpoint: [32m'/api/user/profile'[39m,
    method: [32m'POST'[39m,
    error: [32m'Database error during update'[39m,
    stack: [32m'Error: Database error during update\n'[39m +
      [32m'    at /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/pages/api/user/profile.test.ts:199:21\n'[39m +
      [32m'    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/@vitest/runner/dist/chunk-hooks.js:155:11\n'[39m +
      [32m'    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/@vitest/runner/dist/chunk-hooks.js:752:26\n'[39m +
      [32m'    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/@vitest/runner/dist/chunk-hooks.js:1897:20\n'[39m +
      [32m'    at new Promise (<anonymous>)\n'[39m +
      [32m'    at runWithTimeout (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/@vitest/runner/dist/chunk-hooks.js:1863:10)\n'[39m +
      [32m'    at runTest (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/@vitest/runner/dist/chunk-hooks.js:1574:12)\n'[39m +
      [32m'    at processTicksAndRejections (node:internal/process/task_queues:95:5)\n'[39m +
      [32m'    at runSuite (file://…'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-12T18:46:04.294Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m401[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'unauthorized'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 403 to forbidden
[2025-11-12T18:46:04.307Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m403[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'forbidden'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 404 to validation_error
[2025-11-12T18:46:04.308Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m404[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'not found'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 422 to validation_error
[2025-11-12T18:46:04.310Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m422[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'unprocessable'[39m
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 500 to server_error
[2025-11-12T18:46:04.311Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m500[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'server err'[39m
  }
}

stderr | tests/unit/i18n.test.ts > i18n Utils > should return fallback for non-existing key
Key "non.existing.key" not found in locale "de". Falling back to English.

stderr | tests/unit/i18n.test.ts > i18n Utils > should fallback to English for unknown locale (simulated)
Locale "xx" not found. Using English as fallback.

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-12T18:46:06.668Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m401[39m, provider: [32m'replicate'[39m, snippet: [32m'unauthorized'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 403 to forbidden
[2025-11-12T18:46:06.670Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m403[39m, provider: [32m'replicate'[39m, snippet: [32m'forbidden'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 404 to validation_error
[2025-11-12T18:46:06.671Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m404[39m, provider: [32m'replicate'[39m, snippet: [32m'not found'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 422 to validation_error
[2025-11-12T18:46:06.672Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m422[39m, provider: [32m'replicate'[39m, snippet: [32m'unprocessable'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 500 to server_error
[2025-11-12T18:46:06.673Z] [WARN] replicate_error {
  timestamp: {},
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m500[39m, provider: [32m'replicate'[39m, snippet: [32m'server err'[39m }
}

stderr | tests/unit/lib/rate-limiter-kv.test.ts > KV-backed rate limiter > persists counters across limiter instances via KV
[2025-11-12T18:46:06.719Z] [ERROR] Security Event: RATE_LIMIT_EXCEEDED
Context: {
  "ipAddress": "127.0.0.1",
  "targetResource": "/api/kv",
  "securityEventType": "RATE_LIMIT_EXCEEDED",
  "originalDetails": {
    "limiterName": "kvLimiterTest",
    "maxRequests": 2,
    "windowMs": 10000,
    "resetAt": 1762973176719
  },
  "logLevel": "error",
  "eventSnapshot": {
    "type": "RATE_LIMIT_EXCEEDED",
    "targetResource": "/api/kv",
    "ipAddress": "127.0.0.1",
    "timestamp": 1762973166719,
    "details": {
      "limiterName": "kvLimiterTest",
      "maxRequests": 2,
      "windowMs": 10000,
      "resetAt": 1762973176719
    }
  }
}

stderr | tests/unit/utils/logger-transport.smoke.test.ts > logger transports smoke > routes SecurityLogger through transport with redaction
[2025-11-12T18:46:07.381Z] [ERROR] AUTH_FAILURE {
  timestamp: {},
  resource: [32m'security'[39m,
  userId: [32m'u_9'[39m,
  securityEventType: [32m'AUTH_FAILURE'[39m,
  details: { reason: [32m'invalid_password'[39m, password: [32m'[FILTERED]'[39m }
}

stderr | tests/unit/ai-image/aiimage-retry.test.ts > AiImageService - Workers AI tiny output retry > retries once on tiny output and succeeds with larger image
[2025-11-12T18:46:07.725Z] [WARN] workers_ai_tiny_output_retry {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'workers_ai_tiny_output_retry'[39m,
  metadata: { model: [32m'@cf/runwayml/stable-diffusion-v1-5-img2img'[39m, bytes: [33m1000[39m }
}


```

### typecheck-src

```text
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

src/pages/api/testing/evaluate/next/run.ts(8,10): error TS2305: Module '"@/lib/rate-limiter"' has no exported member 'webEvalBrowserLimiter'.
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit

[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit


```

## Next Actions (for Assistant)
- Analyze failing steps and propose minimal patches.
- If tests fail, provide targeted code edits and updated tests where needed.
- Keep changes small and standards-compliant (TypeScript strict, ESLint rules).