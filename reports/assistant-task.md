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
    "ok": false,
    "code": 1
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
- test:unit:run
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


```

### docs-toc

```text
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

Found README.md, ai-image-enhancer.md, ai-orchestrator-open-questions.md, api-middleware-inventory.md, auth-architecture.md, auth-flow.md, data-flow.md, database-schema.md, locale-middleware.md, prompt-enhancer.md, system-overview.md, voice-visualizer-transcriptor.md in "docs/architecture"

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

Found nothing in "docs/media"

Found nothing in "docs/meta"

Found README.md, ai-generate-kv-limiter-plan.md, cloudflare-cache-rules.md, deployment-guide.md, monitoring.md, runbook-image-enhancer-go-live.md in "docs/ops"

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

```

### format

```text
src/pages/tools/seo-analyzer.ts 1ms (unchanged)
src/pages/tools/video-enhancer/app.astro 4ms (unchanged)
src/pages/tools/voice-visualizer/app.astro 3ms (unchanged)
src/pages/tools/web-eval/app.astro 3ms (unchanged)
src/pages/tools/webscraper/app.astro 3ms (unchanged)
src/pages/verify-email.astro 18ms (unchanged)
src/pages/welcome-profile.astro 9ms (unchanged)
src/pages/welcome.astro 6ms (unchanged)
src/scripts/blog-post-enhancements.ts 2ms (unchanged)
src/scripts/landing-bg.ts 12ms (unchanged)
src/scripts/neural-mesh.ts 9ms (unchanged)
src/scripts/orchestrate-entrance.ts 5ms (unchanged)
src/scripts/settings.ts 7ms (unchanged)
src/server/actions.ts 2ms (unchanged)
src/server/utils/hashing.ts 1ms (unchanged)
src/server/utils/jwt.ts 2ms (unchanged)
src/server/utils/log-transports.ts 5ms (unchanged)
src/server/utils/logger-factory.ts 10ms (unchanged)
src/server/utils/logger.ts 5ms (unchanged)
src/setupTests.ts 4ms (unchanged)
src/stores/activityStore.ts 2ms (unchanged)
src/stores/comment-store.ts 13ms (unchanged)
src/stores/index.ts 1ms (unchanged)
src/stores/notificationStore.ts 2ms (unchanged)
src/stores/projectStore.ts 5ms (unchanged)
src/stores/quickActionStore.ts 3ms (unchanged)
src/types/astro-fonts-internal.d.ts 1ms (unchanged)
src/types/blog.ts 1ms (unchanged)
src/types/dashboard.ts 2ms (unchanged)
src/types/jsdom.d.ts 0ms (unchanged)
src/types/logger.ts 3ms (unchanged)
src/types/stubs/rate-limiter.d.ts 1ms (unchanged)
src/types/ts-src-shims.d.ts 7ms (unchanged)
src/types/webscraper.ts 1ms (unchanged)
src/types/ws.d.ts 1ms (unchanged)
src/utils/feature-flags.ts 2ms (unchanged)
src/utils/i18n.ts 4ms (unchanged)
src/utils/sanitizeReturnTo.test.ts 2ms (unchanged)
src/utils/sanitizeReturnTo.ts 1ms (unchanged)
tests/e2e/specs/blog-i18n-seo.spec.ts 3ms (unchanged)
tests/e2e/specs/rate-limit-persistence.spec.ts 1ms (unchanged)
tests/e2e/specs/referral/referral-reward.spec.ts 5ms (unchanged)
tests/integration/ai-image-enhancer.test.ts 16ms (unchanged)
tests/integration/api/__fixtures__/comments-performance.ts 7ms (unchanged)
tests/integration/api/admin-audit-logs.test.ts 3ms (unchanged)
tests/integration/api/admin-auth-checks.test.ts 1ms (unchanged)
tests/integration/api/admin-backup.test.ts 2ms (unchanged)
tests/integration/api/admin-comments.test.ts 2ms (unchanged)
tests/integration/api/admin-credits-deduct.test.ts 2ms (unchanged)
tests/integration/api/admin-credits.test.ts 2ms (unchanged)
tests/integration/api/admin-rate-limits.test.ts 2ms (unchanged)
tests/integration/api/admin-referrals-list.test.ts 3ms (unchanged)
tests/integration/api/admin-sessions.test.ts 2ms (unchanged)
tests/integration/api/admin-users-credits.test.ts 2ms (unchanged)
tests/integration/api/admin-users-lifecycle.test.ts 3ms (unchanged)
tests/integration/api/admin-users-set-plan-happy.test.ts 3ms (unchanged)
tests/integration/api/admin-users-set-plan.test.ts 2ms (unchanged)
tests/integration/api/ai-video/generate.test.ts 5ms (unchanged)
tests/integration/api/ai-video/usage.test.ts 4ms (unchanged)
tests/integration/api/comments-performance.test.ts 3ms (unchanged)
tests/integration/api/comments-routes.test.ts 2ms (unchanged)
tests/integration/api/debug-logs-stream.test.ts 2ms (unchanged)
tests/integration/api/mcp-ping.test.ts 2ms (unchanged)
tests/integration/api/prompt/usage.test.ts 1ms (unchanged)
tests/integration/api/r2-ai-proxy.test.ts 1ms (unchanged)
tests/integration/api/referrals/referral-rewards-webhook.test.ts 7ms (unchanged)
tests/integration/api/voice/transcribe-and-poll.test.ts 4ms (unchanged)
tests/integration/api/voice/transcribe.test.ts 2ms (unchanged)
tests/integration/api/voice/usage.test.ts 2ms (unchanged)
tests/integration/api/web-eval-complete.test.ts 4ms (unchanged)
tests/integration/api/web-eval-next.test.ts 5ms (unchanged)
tests/integration/api/web-eval-run.test.ts 6ms (unchanged)
tests/integration/api/webscraper.test.ts 3ms (unchanged)
tests/integration/auth.test.ts 5ms (unchanged)
tests/integration/billing-api.test.ts 12ms (unchanged)
tests/integration/blog.test.ts 4ms (unchanged)
tests/integration/comments-api.test.ts 4ms (unchanged)
tests/integration/comments.test.ts 14ms (unchanged)
tests/integration/csp-report.test.ts 3ms (unchanged)
tests/integration/dashboard-api.test.ts 16ms (unchanged)
tests/integration/kv-usage.test.ts 2ms (unchanged)
tests/integration/lead-magnet-api.test.ts 11ms (unchanged)
tests/integration/magic-link-happy.test.ts 3ms (unchanged)
tests/integration/magic-link.test.ts 3ms (unchanged)
tests/integration/newsletter-api.test.ts 9ms (unchanged)
tests/integration/projects-api.test.ts 14ms (unchanged)
tests/integration/prompt-enhance-api.test.ts 6ms (unchanged)
tests/integration/prompt-enhance-multipart.test.ts 4ms (unchanged)
tests/integration/routing/blog-i18n-seo-integration.test.ts 2ms (unchanged)
tests/integration/routing/blog-routes.test.ts 2ms (unchanged)
tests/integration/routing/headers.test.ts 1ms (unchanged)
tests/integration/routing/lang-alias.test.ts 1ms (unchanged)
tests/integration/routing/locale-routing.test.ts 2ms (unchanged)
tests/integration/routing/seo-hreflang.test.ts 1ms (unchanged)
tests/integration/routing/voice-visualizer-permissions.test.ts 1ms (unchanged)
tests/integration/setup/global-setup.ts 8ms (unchanged)
tests/integration/setup/referral-fixtures.ts 3ms (unchanged)
tests/integration/user-avatar-api.test.ts 9ms (unchanged)
tests/integration/verify-email.test.ts 3ms (unchanged)
tests/mocks/astro-content.ts 1ms (unchanged)
tests/performance/rate-limiting-perf.test.ts 10ms (unchanged)
tests/performance/run-load-tests.ts 8ms (unchanged)
tests/shared/auth.ts 2ms (unchanged)
tests/shared/http.ts 3ms (unchanged)
tests/src/helpers/rateLimiter.ts 1ms (unchanged)
tests/src/legacy/config/test-config.ts 4ms (unchanged)
tests/src/legacy/utils/database-helpers.ts 6ms (unchanged)
tests/src/legacy/utils/logger.ts 10ms (unchanged)
tests/src/legacy/utils/server-helpers.ts 13ms (unchanged)
tests/src/lib/auth-v2.test.ts 4ms (unchanged)
tests/src/pages/api/ai-video/generate.test.ts 5ms (unchanged)
tests/src/pages/api/auth/login-405.test.ts 2ms (unchanged)
tests/src/pages/api/auth/login-logger.test.ts 10ms (unchanged)
tests/src/pages/api/auth/login-service.test.ts 7ms (unchanged)
tests/src/pages/api/auth/login.test.ts 8ms (unchanged)
tests/src/pages/api/dashboard/activity._test.ts 6ms (unchanged)
tests/src/pages/api/dashboard/perform-action._test.ts 8ms (unchanged)
tests/src/pages/api/dashboard/projects._test.ts 7ms (unchanged)
tests/src/pages/api/projects/index._test.ts 7ms (unchanged)
tests/src/pages/api/tools._test.ts 4ms (unchanged)
tests/src/pages/api/user/me.test.ts 5ms (unchanged)
tests/src/scripts/blog-post-enhancements.test.ts 2ms (unchanged)
tests/src/server/utils/hashing.test.ts 2ms (unchanged)
tests/src/server/utils/jwt.test.ts 2ms (unchanged)
tests/types/upstash-kv.d.ts 1ms (unchanged)
tests/unit/account/delete-account-section.test.tsx 3ms (unchanged)
tests/unit/ai-image-provider-mapping.test.ts 3ms (unchanged)
tests/unit/ai-image/aiimage-retry.test.ts 2ms (unchanged)
tests/unit/ai-jobs-provider-mapping.test.ts 3ms (unchanged)
tests/unit/api/account-delete.test.ts 4ms (unchanged)
tests/unit/api/comments-performance.test.ts 9ms (unchanged)
tests/unit/blog-sorting.spec.ts 4ms (unchanged)
tests/unit/comment-components.test.tsx 11ms (unchanged)
tests/unit/comment-service-simple.test.ts 5ms (unchanged)
tests/unit/comment-service.test.ts 15ms (unchanged)
tests/unit/components/BlogCTA.test.ts 1ms (unchanged)
tests/unit/components/BlogPost.test.ts 1ms (unchanged)
tests/unit/components/imag-enhancer/CreditsPanel.test.tsx 2ms (unchanged)
tests/unit/components/imag-enhancer/ModelControls.test.tsx 2ms (unchanged)
tests/unit/components/imag-enhancer/UploadSection.test.tsx 2ms (unchanged)
tests/unit/dashboard/billing-card.test.tsx 3ms (unchanged)
tests/unit/dashboard/projectStore.test.ts 3ms (unchanged)
tests/unit/dashboard/quickActionStore.test.ts 3ms (unchanged)
tests/unit/hooks/imag-enhancer/useClipboardImagePaste.test.ts 1ms (unchanged)
tests/unit/hooks/imag-enhancer/useCompareInteractions.test.tsx 7ms (unchanged)
tests/unit/hooks/imag-enhancer/useGlobalShortcuts.test.ts 2ms (unchanged)
tests/unit/hooks/imag-enhancer/usePlanGating.test.ts 2ms (unchanged)
tests/unit/hooks/imag-enhancer/useViewportUiMetrics.test.ts 2ms (unchanged)
tests/unit/i18n.test.ts 2ms (unchanged)
tests/unit/imag-enhancer/help-modal-focus.test.tsx 2ms (unchanged)
tests/unit/imag-enhancer/keyboard-shortcuts.test.tsx 4ms (unchanged)
tests/unit/lib/ai-image-service.test.ts 3ms (unchanged)
tests/unit/lib/aos.test.ts 5ms (unchanged)
tests/unit/lib/blog-service.test.ts 6ms (unchanged)
tests/unit/lib/rate-limiter-kv.test.ts 3ms (unchanged)
tests/unit/lib/rate-limiter.test.ts 4ms (unchanged)
tests/unit/pages/api/user/profile.test.ts 7ms (unchanged)
tests/unit/referral-reward-service.test.ts 7ms (unchanged)
tests/unit/security/deprecated-logging.test.ts 5ms (unchanged)
tests/unit/services/provider-error-mapping.test.ts 1ms (unchanged)
tests/unit/services/webscraper-service.test.ts 5ms (unchanged)
tests/unit/spam-detection.test.ts 3ms (unchanged)
tests/unit/telemetry/telemetry-client.test.ts 2ms (unchanged)
tests/unit/testimonials-loader.test.ts 4ms (unchanged)
tests/unit/utils/database-helpers.test.ts 8ms (unchanged)
tests/unit/utils/locale-path.test.ts 2ms (unchanged)
tests/unit/utils/logger-transport.smoke.test.ts 2ms (unchanged)
tests/unit/utils/logger.test.ts 19ms (unchanged)
tests/unit/utils/mime.test.ts 2ms (unchanged)
tests/unit/utils/server-helpers.test.ts 16ms (unchanged)
tests/unit/validation/billing-schema.test.ts 1ms (unchanged)
tests/unit/validation/dashboard-schema.test.ts 1ms (unchanged)
tests/unit/validation/errors.test.ts 2ms (unchanged)
tests/unit/validation/newsletter-schema.test.ts 1ms (unchanged)
tests/unit/validation/newsletter-unsubscribe-schema.test.ts 1ms (unchanged)
tests/unit/validation/prompt-schema.test.ts 3ms (unchanged)
tests/unit/validation/templates-schema.test.ts 2ms (unchanged)
tests/unit/validation/users-sync-schema.test.ts 1ms (unchanged)
tests/unit/validation/webscraper-schema.test.ts 1ms (unchanged)
tests/unit/voice-stream-aggregator.test.ts 3ms (unchanged)
tests/utils/kv-mock.ts 7ms (unchanged)
scripts/ae-run.mjs 4ms (unchanged)
scripts/align-de-to-en.mjs 2ms (unchanged)
scripts/blog-images-audit.ts 4ms (unchanged)
scripts/blog-images-generate.ts 2ms (unchanged)
scripts/check-readme-structure.mjs 2ms (unchanged)
scripts/check-wrangler-secrets.ts 5ms (unchanged)
scripts/coming-soon-client.ts 3ms (unchanged)
scripts/deploy.ts 3ms (unchanged)
scripts/dev-menu.ts 47ms (unchanged)
scripts/dev/capture-readme-screenshots.mjs 1ms (unchanged)
scripts/dev/clean-contentful-slug-drafts.ts 3ms (unchanged)
scripts/dev/docs-linkgraph.mjs 4ms (unchanged)
scripts/dev/fix-contentful-slug.ts 3ms (unchanged)
scripts/dev/gen-cascade-rules-coverage.mjs 4ms (unchanged)
scripts/dev/gen-memory-index.mjs 5ms (unchanged)
scripts/dev/generate-contentful-migration.ts 4ms (unchanged)
scripts/dev/memory-audit.mjs 6ms (unchanged)
scripts/dev/patch-windsurf-rules.mjs 2ms (unchanged)
scripts/dev/publish-contentful-assets.ts 4ms (unchanged)
scripts/dev/publish-contentful-blog-posts.ts 2ms (unchanged)
scripts/dev/sync-windsurf-rules.mjs 2ms (unchanged)
scripts/dev/test-contentful-fetch.ts 2ms (unchanged)
scripts/dev/update-windsurf-rules.mjs 3ms (unchanged)
scripts/dev/upload-contentful-assets.ts 3ms (unchanged)
scripts/dev/verify-enhancer-download.mjs 3ms (unchanged)
scripts/doc-drift.mjs 2ms (unchanged)
scripts/doc-inventory.mjs 5ms (unchanged)
scripts/doc-links.mjs 3ms (unchanged)
scripts/docs-auto-fix.ts 5ms (unchanged)
scripts/docs-disable-md051.ts 2ms (unchanged)
scripts/docs-fix-anchors.ts 5ms (unchanged)
scripts/docs-fix-heading-levels.ts 2ms (unchanged)
scripts/docs-harmonize-anchors.ts 8ms (unchanged)
scripts/docs-link-audit.mjs 2ms (unchanged)
scripts/emoji-to-icon-codemod.mjs 8ms (unchanged)
scripts/fix-blog-images.ts 4ms (unchanged)
scripts/fix-de-faq-structure.mjs 4ms (unchanged)
scripts/gen-env-doc.mjs 3ms (unchanged)
scripts/gen-openapi.mjs 7ms (unchanged)
scripts/generate-test-fixtures.ts 1ms (unchanged)
scripts/generate-wordmark-outlined.ts 5ms (unchanged)
scripts/health-check.ts 4ms (unchanged)
scripts/hygiene-copy.mjs 1ms (unchanged)
scripts/hygiene-to-assistant.mjs 2ms (unchanged)
scripts/i18n-copy-de-to-en.mjs 2ms (unchanged)
scripts/i18n-diff.mjs 3ms (unchanged)
scripts/i18n-diff.ts 3ms (unchanged)
scripts/i18n-empty-report.mjs 2ms (unchanged)
scripts/i18n-fill-missing.mjs 3ms (unchanged)
scripts/i18n-identical.mjs 3ms (unchanged)
scripts/i18n-migrate-paths.mjs 4ms (unchanged)
scripts/i18n-prune-unused.mjs 3ms (unchanged)
scripts/i18n-validate.mjs 3ms (unchanged)
scripts/mcp/cloudflare-mcp.mjs 4ms (unchanged)
scripts/mcp/gsc-extended.mjs 9ms (unchanged)
scripts/mcp/gsc-run-analysis.mjs 3ms (unchanged)
scripts/migrate-imports.js 5ms (unchanged)
scripts/migrate-imports.mjs 5ms (unchanged)
scripts/migrate-imports.ts 7ms (unchanged)
scripts/onboarding.ts 9ms (unchanged)
scripts/quality-check.js 2ms (unchanged)
scripts/remark/remark-demote-h1.ts 1ms (unchanged)
scripts/resend-check.mjs 4ms (unchanged)
scripts/run-hygiene.mjs 3ms (unchanged)
scripts/sanitize-locale.mjs 2ms (unchanged)
scripts/security/scan-secrets.mjs 2ms (unchanged)
scripts/setup-contentful-blog.mjs 2ms (unchanged)
scripts/setup-local-dev.js 17ms (unchanged)
scripts/setup-local-dev.ts 16ms (unchanged)
scripts/smoke-inject-enhancer.mjs 3ms (unchanged)
scripts/validate-env.ts 3ms (unchanged)
scripts/validate-frontmatter.mjs 4ms (unchanged)
scripts/warmup.ts 7ms (unchanged)
scripts/web-eval-executor/executor.ts 9ms
scripts/web-eval-executor/menu.ts 15ms (unchanged)
scripts/web-eval-executor/runner.ts 6ms (unchanged)
scripts/web-eval-executor/types.ts 1ms (unchanged)
scripts/zod-openapi-diff.ts 5ms (unchanged)
scripts/zod-openapi-pilot.ts 2ms (unchanged)
.lintstagedrc.json 0ms (unchanged)
.markdownlint.json 1ms (unchanged)
.prettierrc.json 0ms (unchanged)
AGENTS.md 13ms (unchanged)
api-extractor.json 1ms (unchanged)
blog-post-content-type.json 1ms (unchanged)
cache-rules-ci.json 1ms (unchanged)
cache-rules-create.json 1ms (unchanged)
cache-rules-rules.json 1ms (unchanged)
cf-create-ruleset.json 1ms (unchanged)
CHANGELOG.md 7ms (unchanged)
CLAUDE.md 0ms (unchanged)
CODE_OF_CONDUCT.md 1ms (unchanged)
combined-rules.json 0ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-09-01.json 1ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-11-11.json 0ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-16-05.json 0ms (unchanged)
contentful-import-error-log-tmtc6fophkx8-2025-11-08T05-21-42.json 1ms (unchanged)
CONTRIBUTING.md 7ms (unchanged)
developer.mozilla.org--mdn-web-docs--20251025-090628_scrapedwithhub-evolutioncom.json 2ms (unchanged)
existing-rules.json 1ms (unchanged)
package.json 2ms (unchanged)
README.md 20ms (unchanged)
renovate.json 0ms (unchanged)
ruleset-current-staging.json 1ms (unchanged)
rulesets-list.json 1ms (unchanged)
rulesets-staging-list.json 1ms (unchanged)
staging-rules.json 0ms (unchanged)
tsconfig.ai.json 0ms (unchanged)
tsconfig.astro-check.json 0ms (unchanged)
tsconfig.astro-check.ui.json 0ms (unchanged)
tsconfig.astro.json 0ms (unchanged)
tsconfig.build.json 0ms (unchanged)
tsconfig.json 1ms (unchanged)
tsconfig.src.json 0ms (unchanged)
tsconfig.types.json 0ms (unchanged)
tsdoc.json 1ms (unchanged)
update-payload.json 1ms (unchanged)
update-staging.json 2ms (unchanged)

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

```

### test-integration-debug

```text
 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} as owner -> 200 success envelope
AssertionError: expected 405 to be 200 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 200[39m
[31m+ 405[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:256:24
    254|       },
    255|     });
    256|     expect(res.status).toBe(200);
       |                        ^
    257|     const body = await json<ApiEnvelope<AiJobData>>(res);
    258|     expect(body.success).toBe(true);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/23]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and sets guest_id
AssertionError: expected 405 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 405[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:268:24
    266|   it('GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and …
    267|     const res = await fetchManual(`/api/ai-image/jobs/${jobId}`);
    268|     expect(res.status).toBe(403);
       |                        ^
    269|     const setCookie = res.headers.get('set-cookie');
    270|     const gid = extractCookieValue(setCookie, 'guest_id');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/23]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} with different guest_id -> 403 forbidden envelope
AssertionError: expected 405 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 405[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:280:24
    278|       },
    279|     });
    280|     expect(res.status).toBe(403);
       |                        ^
    281|     const body = await json<ApiEnvelope<unknown>>(res);
    282|     expect(body.success).toBe(false);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/23]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel with different guest_id -> 403 forbidden envelope
AssertionError: expected 404 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 404[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:298:24
    296|       },
    297|     });
    298|     expect(res.status).toBe(403);
       |                        ^
    299|     const body = await json<ApiEnvelope<unknown>>(res);
    300|     expect(body.success).toBe(false);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/23]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > R2 proxy: GET uploads URL is public and cached (Cache-Control: public, max-age=900, immutable)
AssertionError: expected null to be truthy

[32m- Expected:[39m 
true

[31m+ Received:[39m 
null

 ❯ tests/integration/ai-image-enhancer.test.ts:307:23
    305| 
    306|   it('R2 proxy: GET uploads URL is public and cached (Cache-Control: p…
    307|     expect(uploadUrl).toBeTruthy();
       |                       ^
    308|     if (!uploadUrl) throw new Error('Missing uploadUrl');
    309| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/23]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > Rate limiting: excessive GET /api/ai-image/jobs/{id} eventually returns 429 with Retry-After
AssertionError: expected false to be true // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:385:20
    383|       }
    384|     }
    385|     expect(saw429).toBe(true);
       |                    ^
    386|   });
    387| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/23]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/generate (multipart) -> 200 success envelope with limits
AssertionError: expected [ 200, 403 ] to include 429
 ❯ tests/integration/ai-image-enhancer.test.ts:414:24
    412|       },
    413|     });
    414|     expect([200, 403]).toContain(res.status);
       |                        ^
    415|     if (res.status !== 200) return;
    416|     const body = await json<ApiEnvelope<unknown>>(res);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/23]⎯

 FAIL  |integration| tests/integration/comments-api.test.ts > Comments API (edge) > POST /api/comments/create should reject without CSRF (403)
AssertionError: expected 'forbidden' to be 'csrf_error' // Object.is equality

Expected: [32m"csrf_error"[39m
Received: [31m"forbidden"[39m

 ❯ tests/integration/comments-api.test.ts:39:31
     37|     expect(res.status).toBe(403);
     38|     expect(json?.success).toBe(false);
     39|     expect(json?.error?.type).toBe('csrf_error');
       |                               ^
     40|   });
     41| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/23]⎯

 FAIL  |integration| tests/integration/dashboard-api.test.ts > Dashboard-API-Integration > POST /api/dashboard/perform-action > sollte 401 für nicht authentifizierte Anfragen zurückgeben
AssertionError: expected 'auth_error' to be 'UNAUTHORIZED' // Object.is equality

Expected: [32m"UNAUTHORIZED"[39m
Received: [31m"auth_error"[39m

 ❯ tests/integration/dashboard-api.test.ts:368:34
    366|       if (json) {
    367|         expect(json.success).toBe(false);
    368|         expect(json.error?.type).toBe('UNAUTHORIZED');
       |                                  ^
    369|       }
    370|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/23]⎯

 FAIL  |integration| tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte Rate-Limiting korrekt handhaben
AssertionError: expected undefined to be false // Object.is equality

[32m- Expected:[39m 
false

[31m+ Received:[39m 
undefined

 ❯ tests/integration/lead-magnet-api.test.ts:201:32
    199|         const json = safeParseJson<ApiJson>(responses[0].text);
    200|         if (json) {
    201|           expect(json.success).toBe(false);
       |                                ^
    202|         }
    203|       }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/23]⎯

 FAIL  |integration| tests/integration/newsletter-api.test.ts > Newsletter-API-Integration > POST /api/newsletter/subscribe > sollte Rate-Limiting korrekt handhaben
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/newsletter-api.test.ts:197:43
    195|       // Mindestens eine sollte Rate-Limited sein (429)
    196|       const rateLimitedResponses = responses.filter((r) => r.status ==…
    197|       expect(rateLimitedResponses.length).toBeGreaterThan(0);
       |                                           ^
    198| 
    199|       // Rate-Limit Response sollte Retry-After Header haben

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/23]⎯

 FAIL  |integration| tests/integration/api/admin-users-lifecycle.test.ts > Admin Users Lifecycle — CSRF and auth enforcement > debug-login non-admin with CSRF token → 403 forbidden
 FAIL  |integration| tests/integration/api/admin-users-lifecycle.test.ts > Admin Users Lifecycle — CSRF and auth enforcement > debug-login non-admin with CSRF token → 403 forbidden
 FAIL  |integration| tests/integration/api/admin-users-lifecycle.test.ts > Admin Users Lifecycle — CSRF and auth enforcement > debug-login non-admin with CSRF token → 403 forbidden
AssertionError: expected 429 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 429[39m

 ❯ tests/integration/api/admin-users-lifecycle.test.ts:74:22
     72|         body: method === 'DELETE' ? undefined : JSON.stringify({ reaso…
     73|       });
     74|       expect(status).toBe(403);
       |                      ^
     75|     });
     76|   }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/23]⎯

 FAIL  |integration| tests/integration/api/comments-performance.test.ts > /api/comments/performance (integration) > returns paginated data for seeded post
Error: Failed to create comment: 400 Bad Request — {"success":false,"error":{"type":"validation_error","message":"Invalid request body","details":{"details":{"fieldErrors":{"_form":["Unrecognized key(s) in object: 'csrfToken'"]},"issues":[{"path":[],"code":"unrecognized_keys","message":"Unrecognized key(s) in object: 'csrfToken'"}]}}}}
 ❯ createComment tests/integration/api/__fixtures__/comments-performance.ts:81:11
     79|   if (!response.ok) {
     80|     const body = await response.text().catch(() => '');
     81|     throw new Error(
       |           ^
     82|       `Failed to create comment: ${response.status} ${response.statusT…
     83|     );
 ❯ seedCommentsPerformance tests/integration/api/__fixtures__/comments-performance.ts:114:23
 ❯ tests/integration/api/comments-performance.test.ts:39:24

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/23]⎯

 FAIL  |integration| tests/integration/api/comments-performance.test.ts > /api/comments/performance (integration) > returns search results when authenticated
Error: Failed to create comment: 400 Bad Request — {"success":false,"error":{"type":"validation_error","message":"Invalid request body","details":{"details":{"fieldErrors":{"_form":["Unrecognized key(s) in object: 'csrfToken'"]},"issues":[{"path":[],"code":"unrecognized_keys","message":"Unrecognized key(s) in object: 'csrfToken'"}]}}}}
 ❯ createComment tests/integration/api/__fixtures__/comments-performance.ts:81:11
     79|   if (!response.ok) {
     80|     const body = await response.text().catch(() => '');
     81|     throw new Error(
       |           ^
     82|       `Failed to create comment: ${response.status} ${response.statusT…
     83|     );
 ❯ seedCommentsPerformance tests/integration/api/__fixtures__/comments-performance.ts:114:23
 ❯ tests/integration/api/comments-performance.test.ts:56:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/23]⎯

 FAIL  |integration| tests/integration/api/mcp-ping.test.ts > /api/mcp/ping > rejects unauthenticated requests
Error: expected error shape (rate_limit)
 ❯ tests/integration/api/mcp-ping.test.ts:19:50
     17|     const { res, json } = await getJson<ApiResponse<unknown>>(ENDPOINT…
     18|     if (res.status === 429) {
     19|       if (!json || json.success !== false) throw new Error('expected e…
       |                                                  ^
     20|       expect(json.error.type).toBe('rate_limit');
     21|       expect(res.headers.get('Retry-After')).toBeTruthy();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/23]⎯

 FAIL  |integration| tests/integration/api/web-eval-next.test.ts > /api/testing/evaluate/next > rejects requests without executor token
Error: Expected rate_limit response
 ❯ tests/integration/api/web-eval-next.test.ts:109:50
    107|     const { res, json } = await callNext();
    108|     if (res.status === 429) {
    109|       if (!json || json.success !== false) throw new Error('Expected r…
       |                                                  ^
    110|       expect(json.error.type).toBe('rate_limit');
    111|       expect(res.headers.get('Retry-After')).toBeTruthy();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/23]⎯

 FAIL  |integration| tests/integration/api/web-eval-run.test.ts > /api/testing/evaluate/next/run > returns null task when no pending entries exist
Error: Expected rate_limit response
 ❯ tests/integration/api/web-eval-run.test.ts:119:15
    117|       // Rate-limited: assert shape and Retry-After header
    118|       if (!json || json.success !== false) {
    119|         throw new Error('Expected rate_limit response');
       |               ^
    120|       }
    121|       expect((json as any).error.type).toBe('rate_limit');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/23]⎯

 FAIL  |integration| tests/integration/api/web-eval-run.test.ts > /api/testing/evaluate/next/run > claims and fails with browser_disabled when CBR is disabled (no binding/flag)
TypeError: Body is unusable: Body has already been read
 ❯ createTask tests/integration/api/web-eval-run.test.ts:71:69
     69| 
     70|   if (res.status !== 200 || !json || json.success !== true) {
     71|     throw new Error(`Failed to seed task: ${res.status} ${await res.te…
       |                                                                     ^
     72|   }
     73| 
 ❯ tests/integration/api/web-eval-run.test.ts:133:32

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/23]⎯

 FAIL  |integration| tests/integration/routing/blog-i18n-seo-integration.test.ts > Blog i18n & SEO (integration) > EN: category uses /en/blog/category/, share links have prod origin, single H1, related heading present
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/routing/blog-i18n-seo-integration.test.ts:43:28
     41|     // Canonical EN route redirects to /blog/<slug>, category links ar…
     42|     const catLink = $('a[href*="/blog/category/"]');
     43|     expect(catLink.length).toBeGreaterThan(0);
       |                            ^
     44| 
     45|     // Share links host (env-agnostic)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/23]⎯


```

### test-integration-run

```text
⎯⎯⎯⎯⎯⎯ Failed Tests 19 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs (multipart) -> 202 and success envelope; sets guest_id cookie
AssertionError: expected 500 to be 202 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 202[39m
[31m+ 500[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:136:24
    134|     });
    135| 
    136|     expect(res.status).toBe(202);
       |                        ^
    137|     expect(res.headers.get('content-type') || '').toContain('applicati…
    138| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel as owner -> 200 success envelope with status=canceled
AssertionError: expected 404 to be 200 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 200[39m
[31m+ 404[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:241:24
    239|       },
    240|     });
    241|     expect(res.status).toBe(200);
       |                        ^
    242|     const body = await json<ApiEnvelope<AiJobData>>(res);
    243|     expect(body.success).toBe(true);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} as owner -> 200 success envelope
AssertionError: expected 405 to be 200 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 200[39m
[31m+ 405[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:256:24
    254|       },
    255|     });
    256|     expect(res.status).toBe(200);
       |                        ^
    257|     const body = await json<ApiEnvelope<AiJobData>>(res);
    258|     expect(body.success).toBe(true);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and sets guest_id
AssertionError: expected 405 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 405[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:268:24
    266|   it('GET /api/ai-image/jobs/{id} without cookie -> 403 forbidden and …
    267|     const res = await fetchManual(`/api/ai-image/jobs/${jobId}`);
    268|     expect(res.status).toBe(403);
       |                        ^
    269|     const setCookie = res.headers.get('set-cookie');
    270|     const gid = extractCookieValue(setCookie, 'guest_id');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > GET /api/ai-image/jobs/{id} with different guest_id -> 403 forbidden envelope
AssertionError: expected 405 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 405[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:280:24
    278|       },
    279|     });
    280|     expect(res.status).toBe(403);
       |                        ^
    281|     const body = await json<ApiEnvelope<unknown>>(res);
    282|     expect(body.success).toBe(false);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > POST /api/ai-image/jobs/{id}/cancel with different guest_id -> 403 forbidden envelope
AssertionError: expected 404 to be 403 // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- 403[39m
[31m+ 404[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:298:24
    296|       },
    297|     });
    298|     expect(res.status).toBe(403);
       |                        ^
    299|     const body = await json<ApiEnvelope<unknown>>(res);
    300|     expect(body.success).toBe(false);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > R2 proxy: GET uploads URL is public and cached (Cache-Control: public, max-age=900, immutable)
AssertionError: expected null to be truthy

[32m- Expected:[39m 
true

[31m+ Received:[39m 
null

 ❯ tests/integration/ai-image-enhancer.test.ts:307:23
    305| 
    306|   it('R2 proxy: GET uploads URL is public and cached (Cache-Control: p…
    307|     expect(uploadUrl).toBeTruthy();
       |                       ^
    308|     if (!uploadUrl) throw new Error('Missing uploadUrl');
    309| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/19]⎯

 FAIL  |integration| tests/integration/ai-image-enhancer.test.ts > AI Image Enhancer API + R2 Proxy (Integration) > Rate limiting: excessive GET /api/ai-image/jobs/{id} eventually returns 429 with Retry-After
AssertionError: expected false to be true // Object.is equality

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

 ❯ tests/integration/ai-image-enhancer.test.ts:385:20
    383|       }
    384|     }
    385|     expect(saw429).toBe(true);
       |                    ^
    386|   });
    387| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/19]⎯

 FAIL  |integration| tests/integration/comments-api.test.ts > Comments API (edge) > POST /api/comments/create should reject without CSRF (403)
AssertionError: expected 'forbidden' to be 'csrf_error' // Object.is equality

Expected: [32m"csrf_error"[39m
Received: [31m"forbidden"[39m

 ❯ tests/integration/comments-api.test.ts:39:31
     37|     expect(res.status).toBe(403);
     38|     expect(json?.success).toBe(false);
     39|     expect(json?.error?.type).toBe('csrf_error');
       |                               ^
     40|   });
     41| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/19]⎯

 FAIL  |integration| tests/integration/dashboard-api.test.ts > Dashboard-API-Integration > POST /api/dashboard/perform-action > sollte 401 für nicht authentifizierte Anfragen zurückgeben
AssertionError: expected 'auth_error' to be 'UNAUTHORIZED' // Object.is equality

Expected: [32m"UNAUTHORIZED"[39m
Received: [31m"auth_error"[39m

 ❯ tests/integration/dashboard-api.test.ts:368:34
    366|       if (json) {
    367|         expect(json.success).toBe(false);
    368|         expect(json.error?.type).toBe('UNAUTHORIZED');
       |                                  ^
    369|       }
    370|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/19]⎯

 FAIL  |integration| tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte Rate-Limiting korrekt handhaben
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/lead-magnet-api.test.ts:191:43
    189|       // Mindestens eine sollte Rate-Limited sein (429)
    190|       const rateLimitedResponses = responses.filter((r) => r.status ==…
    191|       expect(rateLimitedResponses.length).toBeGreaterThan(0);
       |                                           ^
    192| 
    193|       // Rate-Limit Response sollte Retry-After Header haben

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/19]⎯

 FAIL  |integration| tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte 405 für GET-Methode zurückgeben
AssertionError: expected [ 405, 404, 429 ] to include 400
 ❯ tests/integration/lead-magnet-api.test.ts:283:31
    281|       });
    282| 
    283|       expect([405, 404, 429]).toContain(response.status);
       |                               ^
    284|       if ((response.headers.get('content-type') || '').includes('appli…
    285|         const json = safeParseJson<ApiJson>(await response.text());

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/19]⎯

 FAIL  |integration| tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte CSRF-Schutz korrekt handhaben
AssertionError: expected [ 400, 403, 429 ] to include 500
 ❯ tests/integration/lead-magnet-api.test.ts:310:31
    308|       });
    309| 
    310|       expect([400, 403, 429]).toContain(response.status);
       |                               ^
    311|       const text = await response.text();
    312|       if ((response.headers.get('content-type') || '').includes('appli…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/19]⎯

 FAIL  |integration| tests/integration/lead-magnet-api.test.ts > Lead-Magnet-API-Integration > POST /api/lead-magnets/download > sollte Audit-Logging für erfolgreiche Downloads durchführen
AssertionError: expected [ 200, 429 ] to include 500
 ❯ tests/integration/lead-magnet-api.test.ts:344:26
    342|       const response = await submitForm('/api/lead-magnets/download', …
    343| 
    344|       expect([200, 429]).toContain(response.status);
       |                          ^
    345|       if (response.status === 200 && (response.contentType || '').incl…
    346|         const json = safeParseJson<ApiJson>(response.text);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/19]⎯

 FAIL  |integration| tests/integration/newsletter-api.test.ts > Newsletter-API-Integration > POST /api/newsletter/subscribe > sollte Rate-Limiting korrekt handhaben
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/newsletter-api.test.ts:197:43
    195|       // Mindestens eine sollte Rate-Limited sein (429)
    196|       const rateLimitedResponses = responses.filter((r) => r.status ==…
    197|       expect(rateLimitedResponses.length).toBeGreaterThan(0);
       |                                           ^
    198| 
    199|       // Rate-Limit Response sollte Retry-After Header haben

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/19]⎯

 FAIL  |integration| tests/integration/api/comments-performance.test.ts > /api/comments/performance (integration) > returns paginated data for seeded post
Error: Failed to create comment: 400 Bad Request — {"success":false,"error":{"type":"validation_error","message":"Invalid request body","details":{"details":{"fieldErrors":{"_form":["Unrecognized key(s) in object: 'csrfToken'"]},"issues":[{"path":[],"code":"unrecognized_keys","message":"Unrecognized key(s) in object: 'csrfToken'"}]}}}}
 ❯ createComment tests/integration/api/__fixtures__/comments-performance.ts:81:11
     79|   if (!response.ok) {
     80|     const body = await response.text().catch(() => '');
     81|     throw new Error(
       |           ^
     82|       `Failed to create comment: ${response.status} ${response.statusT…
     83|     );
 ❯ seedCommentsPerformance tests/integration/api/__fixtures__/comments-performance.ts:114:23
 ❯ tests/integration/api/comments-performance.test.ts:39:24

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/19]⎯

 FAIL  |integration| tests/integration/api/comments-performance.test.ts > /api/comments/performance (integration) > returns search results when authenticated
Error: Failed to create comment: 400 Bad Request — {"success":false,"error":{"type":"validation_error","message":"Invalid request body","details":{"details":{"fieldErrors":{"_form":["Unrecognized key(s) in object: 'csrfToken'"]},"issues":[{"path":[],"code":"unrecognized_keys","message":"Unrecognized key(s) in object: 'csrfToken'"}]}}}}
 ❯ createComment tests/integration/api/__fixtures__/comments-performance.ts:81:11
     79|   if (!response.ok) {
     80|     const body = await response.text().catch(() => '');
     81|     throw new Error(
       |           ^
     82|       `Failed to create comment: ${response.status} ${response.statusT…
     83|     );
 ❯ seedCommentsPerformance tests/integration/api/__fixtures__/comments-performance.ts:114:23
 ❯ tests/integration/api/comments-performance.test.ts:56:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/19]⎯

 FAIL  |integration| tests/integration/api/web-eval-run.test.ts > /api/testing/evaluate/next/run > claims and fails with browser_disabled when CBR is disabled (no binding/flag)
TypeError: Body is unusable: Body has already been read
 ❯ createTask tests/integration/api/web-eval-run.test.ts:71:69
     69| 
     70|   if (res.status !== 200 || !json || json.success !== true) {
     71|     throw new Error(`Failed to seed task: ${res.status} ${await res.te…
       |                                                                     ^
     72|   }
     73| 
 ❯ tests/integration/api/web-eval-run.test.ts:133:32

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/19]⎯

 FAIL  |integration| tests/integration/routing/blog-i18n-seo-integration.test.ts > Blog i18n & SEO (integration) > EN: category uses /en/blog/category/, share links have prod origin, single H1, related heading present
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/routing/blog-i18n-seo-integration.test.ts:43:28
     41|     // Canonical EN route redirects to /blog/<slug>, category links ar…
     42|     const catLink = $('a[href*="/blog/category/"]');
     43|     expect(catLink.length).toBeGreaterThan(0);
       |                            ^
     44| 
     45|     // Share links host (env-agnostic)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/19]⎯


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
[2025-11-12T13:07:40.655Z] [ERROR] Security Event: RATE_LIMIT_EXCEEDED
Context: {
  "ipAddress": "127.0.0.1",
  "targetResource": "/api/kv",
  "securityEventType": "RATE_LIMIT_EXCEEDED",
  "originalDetails": {
    "limiterName": "kvLimiterTest",
    "maxRequests": 2,
    "windowMs": 10000,
    "resetAt": 1762952870655
  },
  "logLevel": "error",
  "eventSnapshot": {
    "type": "RATE_LIMIT_EXCEEDED",
    "targetResource": "/api/kv",
    "ipAddress": "127.0.0.1",
    "timestamp": 1762952860655,
    "details": {
      "limiterName": "kvLimiterTest",
      "maxRequests": 2,
      "windowMs": 10000,
      "resetAt": 1762952870655
    }
  }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-12T13:07:40.705Z] [WARN] replicate_error {
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
[2025-11-12T13:07:40.714Z] [WARN] replicate_error {
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
[2025-11-12T13:07:40.719Z] [WARN] replicate_error {
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
[2025-11-12T13:07:40.734Z] [WARN] replicate_error {
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

stderr | tests/unit/i18n.test.ts > i18n Utils > should return fallback for non-existing key
Key "non.existing.key" not found in locale "de". Falling back to English.

stderr | tests/unit/i18n.test.ts > i18n Utils > should fallback to English for unknown locale (simulated)
Locale "xx" not found. Using English as fallback.

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 500 to server_error
[2025-11-12T13:07:40.740Z] [WARN] replicate_error {
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

stderr | tests/unit/ai-image/aiimage-retry.test.ts > AiImageService - Workers AI tiny output retry > retries once on tiny output and succeeds with larger image
[2025-11-12T13:07:42.095Z] [WARN] workers_ai_tiny_output_retry {
  timestamp: {},
  resource: [32m'ai-image-service'[39m,
  action: [32m'workers_ai_tiny_output_retry'[39m,
  metadata: { model: [32m'@cf/runwayml/stable-diffusion-v1-5-img2img'[39m, bytes: [33m1000[39m }
}

stderr | tests/unit/utils/logger-transport.smoke.test.ts > logger transports smoke > routes SecurityLogger through transport with redaction
[2025-11-12T13:07:42.123Z] [ERROR] AUTH_FAILURE {
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
[31m+     "requestId": "enhance-1762952856116-v98kw",[90m
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


```

## Next Actions (for Assistant)
- Analyze failing steps and propose minimal patches.
- If tests fail, provide targeted code edits and updated tests where needed.
- Keep changes small and standards-compliant (TypeScript strict, ESLint rules).