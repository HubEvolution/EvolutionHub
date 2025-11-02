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
    "ok": true,
    "code": 0
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

## Relevant Logs (tail)
### docs-inventory

```text
[docs:inventory] $ npm run docs:inventory

> evolution-hub@0.0.1 docs:inventory
> node ./scripts/doc-inventory.mjs

Documentation registry generated for 230 files at docs/meta/registry.json

```

### docs-links

```text
[docs:links] $ npm run docs:links

> evolution-hub@0.0.1 docs:links
> node ./scripts/doc-links.mjs

[doc-links] Broken relative documentation links detected:
 - docs/README.md -> ./features/blog-system.md
 - docs/README.md -> ./features/comment-system.md
 - docs/content.md -> ./features/blog-system.md
 - docs/feature-roadmap.md -> ./features/comment-system.md
 - docs/tools/image-enhancer.md -> ../architecture/api-middleware.md
 - docs/tools/image-enhancer.md -> ../architecture/entitlements.md
 - docs/tools/image-enhancer.md -> ../infrastructure/cloudflare-r2.md
 - docs/tools/webscraper/README.md -> ./webscraper-overview.md
 - docs/tools/webscraper/README.md -> ./api.md
 - docs/tools/webscraper/README.md -> ./configuration.md
 - docs/tools/webscraper/README.md -> ./usage-examples.md
 - docs/tools/webscraper/README.md -> ./rate-limiting.md
 - docs/tools/webscraper/README.md -> ./security.md
 - docs/tools/webscraper/README.md -> ./setup.md
 - docs/tools/webscraper/README.md -> ./dependencies.md
 - docs/tools/webscraper/README.md -> ./auth.md
 - docs/tools/webscraper/README.md -> ./frontend.md
 - docs/tools/webscraper/README.md -> ./backend.md
 - docs/tools/webscraper/README.md -> ../api/
 - docs/tools/webscraper/README.md -> ../security/
 - docs/tools/webscraper/README.md -> ../development/
 - docs/testing/README.md -> ./test-setup.md
 - docs/testing/README.md -> ./mocking-guidelines.md
 - docs/security/README.md -> ./security-overview.md
 - docs/security/README.md -> ./rate-limiting.md
 - docs/security/README.md -> ./security-headers.md
 - docs/security/README.md -> ./auth-security.md
 - docs/security/README.md -> ./api-security.md
 - docs/security/README.md -> ./input-validation.md
 - docs/security/README.md -> ./audit-logging.md
 - docs/security/README.md -> ./middleware-security.md
 - docs/security/README.md -> ./csrf-protection.md
 - docs/security/README.md -> ./cors-configuration.md
 - docs/security/README.md -> ./csp.md
 - docs/security/README.md -> ./permissions-policy.md
 - docs/security/README.md -> ./hsts.md
 - docs/security/README.md -> ./rate-limiter-presets.md
 - docs/security/README.md -> ./api-rate-limiting.md
 - docs/security/README.md -> ./auth-rate-limiting.md
 - docs/security/README.md -> ./standard-headers.md
 - docs/security/README.md -> ./csp-headers.md
 - docs/security/README.md -> ./hsts-headers.md
 - docs/ops/README.md -> ./deployment.md
 - docs/ops/README.md -> ./cloudflare-setup.md
 - docs/ops/README.md -> ./stytch-integration.md
 - docs/ops/README.md -> ./third-party-services.md
 - docs/ops/README.md -> ./backup-recovery.md
 - docs/ops/README.md -> ./stytch-custom-domains.md
 - docs/ops/README.md -> ./stytch-oauth.md
 - docs/ops/README.md -> ./stytch-magic-link.md
 - docs/ops/README.md -> ./environment-management.md
 - docs/ops/README.md -> ./secrets-management.md
 - docs/ops/README.md -> ./cron-jobs.md
 - docs/lead-magnets/README.md -> ./content-strategy.md
 - docs/lead-magnets/README.md -> ./lead-magnet-creation.md
 - docs/lead-magnets/README.md -> ./blog-guidelines.md
 - docs/lead-magnets/README.md -> ./newsletter-setup.md
 - docs/lead-magnets/README.md -> ./seo-optimization.md
 - docs/lead-magnets/README.md -> ./analytics.md
 - docs/lead-magnets/README.md -> ./blog-categories.md
 - docs/lead-magnets/README.md -> ./writing-guidelines.md
 - docs/lead-magnets/README.md -> ./image-guidelines.md
 - docs/lead-magnets/README.md -> ./ebook-creation.md
 - docs/lead-magnets/README.md -> ./template-library.md
 - docs/lead-magnets/README.md -> ./distribution.md
 - docs/frontend/README.md -> ./animation-system.md
 - docs/frontend/README.md -> ./responsive-design.md
 - docs/frontend/README.md -> ./a11y-guidelines.md
 - docs/frontend/README.md -> ./imag-enhancer-ui.md
 - docs/frontend/README.md -> ./auth-components.md
 - docs/frontend/README.md -> ./dashboard-components.md
 - docs/frontend/README.md -> ./animation-system.md#aos
 - docs/frontend/README.md -> ./animation-system.md#header
 - docs/frontend/README.md -> ./animation-system.md#lottie
 - docs/frontend/README.md -> ./landing-page-animations.md
 - docs/features/admin-notifications.md -> ../development/comment-system-implementation.md
 - docs/development/README.md -> ./auth-flow-audit-phase1.md
 - docs/development/README.md -> ./dashboard-apis.md
 - docs/development/README.md -> ./dashboard-components.md
 - docs/development/README.md -> ./auth-flow-audit-phase1.md
 - docs/development/testing-guidelines.md -> header, message, data|undefined
 - docs/development/testing-guidelines.md -> header, message, [extra], data|undefined
 - docs/archive/README.md -> ./migration-overview.md
 - docs/archive/README.md -> ./deprecated-features.md
 - docs/archive/README.md -> ./historical-decisions.md
 - docs/archive/README.md -> ./legacy-docs.md
 - docs/archive/README.md -> ./obsolete-processes.md
 - docs/architecture/database-schema.md -> ../../features/comment-system.md
 - docs/architecture/database-schema.md -> ../../development/comment-system-implementation.md
 - docs/architecture/database-schema.md -> ../../features/blog-system.md
 - docs/api/README.md -> ./prompt-usage.md
 - docs/api/README.md -> ./ai-image-generate.md
 - docs/api/README.md -> ./ai-image-jobs.md
 - docs/api/README.md -> ./ai-image-cancel.md
 - docs/api/README.md -> ./versioning.md
 - docs/api/README.md -> ./webhooks.md
 - docs/api/README.md -> ./curl-examples.md
 - docs/api/README.md -> ./integration-tests.md
 - docs/api/api-guidelines.md -> ../../architecture/
 - docs/api/api-guidelines.md -> ../../development/
 - docs/api/api-guidelines.md -> ../../security/
 - docs/api/api-guidelines.md -> ../../testing/
 - docs/api/api-overview.md -> ./curl-examples.md
 - docs/api/api-overview.md -> ./integration-tests.md
 - docs/api/api-overview.md -> ../../architecture/
 - docs/api/api-overview.md -> ../../development/
 - docs/api/api-overview.md -> ../../security/
 - docs/api/api-overview.md -> ../../testing/
 - docs/api/comments_api.md -> url
 - docs/api/error-handling.md -> ../../architecture/
 - docs/api/error-handling.md -> ../../security/
 - docs/api/error-handling.md -> ../../testing/
 - docs/api/prompt-enhance.md -> ../../architecture/prompt-enhancer.md
 - docs/api/prompt-enhance.md -> ../../development/
 - docs/api/prompt-enhance.md -> ../../security/
 - docs/api/prompt-enhance.md -> ../../testing/
 - docs/api/rate-limiting-api.md -> ../../architecture/
 - docs/api/rate-limiting-api.md -> ../../security/
 - docs/api/rate-limiting-api.md -> ../../testing/
 - docs/_generated/README-template.md -> ./hauptdokument1.md
 - docs/_generated/README-template.md -> ./hauptdokument2.md
 - docs/_generated/README-template.md -> ./spezial1.md
 - docs/_generated/README-template.md -> ./tooling.md
 - docs/_generated/README-template.md -> ../anderekategorie/

```

### docs-lint

```text
[docs:lint] $ npm run docs:lint

> evolution-hub@0.0.1 docs:lint
> markdownlint -c .markdownlint.json "docs/**/*.md"


```

### docs-toc

```text
[docs:toc] $ npm run docs:toc

> evolution-hub@0.0.1 docs:toc
> doctoc docs --update-only --notitle


DocToccing "docs" and its sub directories for github.com.

Found AUDIT.md, README.md, SECURITY.md, SETUP.md, animation.md, architecture.md, cheat-sheet.md, content.md, db_schema_update.md, feature-roadmap.md, i18n.md, seo-readonly-launch-2025-10-28.md, seo.md in "docs"

Found README-template.md, cascade-rules-coverage.md, cascade-rules-detection.md, memory-audit.md, memory-index.md in "docs/_generated"

Found README.md, admin_api.md, ai-image_api.md, api-guidelines.md, api-overview.md, auth_api.md, billing_api.md, comments_api.md, dashboard_api.md, error-handling.md, known-issues.md, projects_api.md, prompt-enhance.md, public_api.md, rate-limiting-api.md, user_api.md, voice_api.md, webscraper_api.md in "docs/api"

Found nothing in "docs/api/openapi"

Found nothing in "docs/api/openapi/paths"

Found README.md, ai-image-enhancer.md, api-middleware-inventory.md, auth-architecture.md, auth-flow.md, data-flow.md, database-schema.md, locale-middleware.md, prompt-enhancer.md, system-overview.md, voice-visualizer-transcriptor.md in "docs/architecture"

Found 0000-adr-template.md, 0001-astro-cloudflare-stack.md, 0002-cloudflare-architecture.md, 0003-astro-frontend-architecture.md, 0004-database-schema.md, 0005-auth-route-locale-normalisierung.md, 0006-dev-echo-non-prod.md in "docs/architecture/adrs"

Found 0001-jwt-authentication.md, 0002-jwt-authentication.md, 0003-database-schema.md in "docs/architecture/adrs/deprecated"

Found BEWERTUNG_LOGIKREVIEW_IMAGE-ENHANCER_USAGE-PILL_PLANANZEIGE.md in "docs/architecture/reviews"

Found README.md, documentation-gap-analysis.md, migration_pages_zu_worker.md, status-assessment.md in "docs/archive"

Found ai-enhancer-licensing.md in "docs/compliance"

Found image-enhancer-mvp.md in "docs/deployment"

Found README.md, api-validation.md, bugfix-session-cookie-fallback.md, ci-cd.md, debug-panel-usage.md, docs-style-guide.md, hybrid-logging-system.md, icon-guidelines.md, inline-ts-refactor.md, local-development.md, stripe-setup.md, stytch-oauth-dev-guide.md, testing-guidelines.md, typescript-integration.md in "docs/development"

Found coming-soon-pr-template.md, imag-enhancer-help-ui.md in "docs/development/prs"

Found admin-notifications.md, blog+commentsystem-plan.md, pricing-system.md in "docs/features"

Found README.md, aos-coordinator.md, card-components.md, coming-soon.md, components.md, design-system.md, entitlements-ui-gating.md, header-scroll-animation.md, imag-enhancer-ui-upgrade.md, toast-notifications.md, ui-components.md, ui-ux.md in "docs/frontend"

Found nothing in "docs/guides"

Found README.md, content-prompts.md, prompts.md, r2-optimization-plan.md in "docs/lead-magnets"

Found nothing in "docs/meta"

Found README.md, ai-generate-kv-limiter-plan.md, cloudflare-cache-rules.md, monitoring.md, prod-readiness-ai-image-enhancer.md, production-readiness-checklist.md, runbook-image-enhancer-go-live.md in "docs/ops"

Found nothing in "docs/ops/runbooks"

Found nothing in "docs/process"

Found environment.md in "docs/reference"

Found project-rules-deltas.md, project-structure.md in "docs/rules"

Found README.md, improvements.md, rate_limiting.md, security_headers.md in "docs/security"

Found README.md, coverage-roadmap-to-95.md, integration-hardening.md, testing-strategy.md in "docs/testing"

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
"docs/feature-roadmap.md" is up to date
"docs/i18n.md" is up to date
"docs/seo-readonly-launch-2025-10-28.md" is up to date
"docs/seo.md" is up to date
"docs/_generated/README-template.md" is up to date
"docs/_generated/cascade-rules-coverage.md" is up to date
"docs/_generated/cascade-rules-detection.md" is up to date
"docs/_generated/memory-audit.md" is up to date
"docs/_generated/memory-index.md" is up to date
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
"docs/archive/migration_pages_zu_worker.md" is up to date
"docs/archive/status-assessment.md" is up to date
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
"docs/development/prs/coming-soon-pr-template.md" is up to date
"docs/development/prs/imag-enhancer-help-ui.md" is up to date
"docs/features/admin-notifications.md" is up to date
"docs/features/blog+commentsystem-plan.md" is up to date
"docs/features/pricing-system.md" is up to date
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
"docs/ops/monitoring.md" is up to date
"docs/ops/prod-readiness-ai-image-enhancer.md" is up to date
"docs/ops/production-readiness-checklist.md" is up to date
"docs/ops/runbook-image-enhancer-go-live.md" is up to date
"docs/reference/environment.md" is up to date
"docs/rules/project-rules-deltas.md" is up to date
"docs/rules/project-structure.md" is up to date
"docs/security/README.md" is up to date
"docs/security/improvements.md" is up to date
"docs/security/rate_limiting.md" is up to date
"docs/security/security_headers.md" is up to date
"docs/testing/README.md" is up to date
"docs/testing/coverage-roadmap-to-95.md" is up to date
"docs/testing/integration-hardening.md" is up to date
"docs/testing/testing-strategy.md" is up to date
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

```

### format-check

```text
[format:check] $ npm run format:check

> evolution-hub@0.0.1 format:check
> prettier --check "src/**/*.{ts,tsx,astro,json,md}" "tests/**/*.{ts,tsx}" "scripts/**/*.{ts,js,mjs}" "*.{json,md,yaml,yml}"

Checking formatting...
All matched files use Prettier code style!

```

### format

```text
src/pages/email-verified.astro 55ms (unchanged)
src/pages/en/account/settings.astro 1ms (unchanged)
src/pages/en/agb.astro 20ms (unchanged)
src/pages/en/blog/[...slug].astro 2ms (unchanged)
src/pages/en/blog/index.astro 3ms (unchanged)
src/pages/en/cookie-settings.astro 2ms (unchanged)
src/pages/en/dashboard.astro 80ms (unchanged)
src/pages/en/datenschutz.astro 37ms (unchanged)
src/pages/en/docs/index.astro 2ms (unchanged)
src/pages/en/email-verified.astro 73ms (unchanged)
src/pages/en/faq.astro 3ms (unchanged)
src/pages/en/impressum.astro 143ms (unchanged)
src/pages/en/index.astro 48ms (unchanged)
src/pages/en/kontakt.astro 1ms (unchanged)
src/pages/en/login.astro 9ms (unchanged)
src/pages/en/pricing.astro 2ms (unchanged)
src/pages/en/register.astro 5ms (unchanged)
src/pages/en/tools/imag-enhancer/app.astro 12ms (unchanged)
src/pages/en/tools/imag-enhancer/index.astro 24ms (unchanged)
src/pages/en/tools/index.astro 23ms (unchanged)
src/pages/en/tools/prompt-enhancer/app.astro 5ms (unchanged)
src/pages/en/tools/prompt-enhancer/index.astro 1ms (unchanged)
src/pages/en/tools/video-enhancer/app.astro 3ms (unchanged)
src/pages/en/tools/voice-visualizer/app.astro 3ms (unchanged)
src/pages/en/tools/webscraper/app.astro 3ms (unchanged)
src/pages/en/verify-email.astro 16ms (unchanged)
src/pages/en/welcome-profile.astro 10ms (unchanged)
src/pages/faq.astro 45ms (unchanged)
src/pages/impressum.astro 57ms (unchanged)
src/pages/index.astro 1ms (unchanged)
src/pages/kontakt.astro 35ms (unchanged)
src/pages/login.astro 10ms (unchanged)
src/pages/newsletter/confirm.astro 40ms (unchanged)
src/pages/pricing.astro 34ms (unchanged)
src/pages/r2-ai/[...path].ts 6ms (unchanged)
src/pages/r2/[...path].ts 2ms (unchanged)
src/pages/register.astro 7ms (unchanged)
src/pages/rss.xml.ts 4ms (unchanged)
src/pages/sitemap.xml.ts 2ms (unchanged)
src/pages/tools/imag-enhancer/app.astro 13ms (unchanged)
src/pages/tools/imag-enhancer/index.astro 23ms (unchanged)
src/pages/tools/index.astro 22ms (unchanged)
src/pages/tools/prompt-enhancer/app.astro 6ms (unchanged)
src/pages/tools/prompt-enhancer/index.astro 2ms (unchanged)
src/pages/tools/video-enhancer/app.astro 5ms (unchanged)
src/pages/tools/voice-visualizer/app.astro 3ms (unchanged)
src/pages/tools/webscraper/app.astro 15ms (unchanged)
src/pages/verify-email.astro 22ms (unchanged)
src/pages/welcome-profile.astro 18ms (unchanged)
src/pages/welcome.astro 9ms (unchanged)
src/scripts/blog-post-enhancements.ts 5ms (unchanged)
src/scripts/landing-bg.ts 14ms (unchanged)
src/scripts/neural-mesh.ts 13ms (unchanged)
src/scripts/orchestrate-entrance.ts 13ms (unchanged)
src/scripts/settings.ts 28ms (unchanged)
src/server/actions.ts 3ms (unchanged)
src/server/utils/hashing.ts 2ms (unchanged)
src/server/utils/jwt.ts 4ms (unchanged)
src/server/utils/logger-factory.ts 9ms (unchanged)
src/server/utils/logger.ts 5ms (unchanged)
src/setupTests.ts 5ms (unchanged)
src/stores/activityStore.ts 3ms (unchanged)
src/stores/comment-store.ts 15ms (unchanged)
src/stores/index.ts 1ms (unchanged)
src/stores/notificationStore.ts 3ms (unchanged)
src/stores/projectStore.ts 5ms (unchanged)
src/stores/quickActionStore.ts 4ms (unchanged)
src/types/astro-fonts-internal.d.ts 1ms (unchanged)
src/types/blog.ts 1ms (unchanged)
src/types/dashboard.ts 2ms (unchanged)
src/types/logger.ts 3ms (unchanged)
src/types/stubs/rate-limiter.d.ts 1ms (unchanged)
src/types/ts-src-shims.d.ts 5ms (unchanged)
src/types/webscraper.ts 1ms (unchanged)
src/types/ws.d.ts 1ms (unchanged)
src/utils/feature-flags.ts 2ms (unchanged)
src/utils/i18n.ts 5ms (unchanged)
src/utils/sanitizeReturnTo.test.ts 2ms (unchanged)
src/utils/sanitizeReturnTo.ts 1ms (unchanged)
tests/e2e/specs/blog-i18n-seo.spec.ts 3ms (unchanged)
tests/integration/ai-image-enhancer.test.ts 19ms (unchanged)
tests/integration/api/admin-audit-logs.test.ts 5ms (unchanged)
tests/integration/api/admin-auth-checks.test.ts 3ms (unchanged)
tests/integration/api/admin-backup.test.ts 3ms (unchanged)
tests/integration/api/admin-comments.test.ts 2ms (unchanged)
tests/integration/api/admin-credits-deduct.test.ts 2ms (unchanged)
tests/integration/api/admin-credits.test.ts 2ms (unchanged)
tests/integration/api/admin-rate-limits.test.ts 2ms (unchanged)
tests/integration/api/admin-sessions.test.ts 3ms (unchanged)
tests/integration/api/admin-users-credits.test.ts 2ms (unchanged)
tests/integration/api/admin-users-set-plan.test.ts 3ms (unchanged)
tests/integration/api/ai-video/generate.test.ts 5ms (unchanged)
tests/integration/api/comments-routes.test.ts 3ms (unchanged)
tests/integration/api/debug-logs-stream.test.ts 3ms (unchanged)
tests/integration/api/prompt/usage.test.ts 2ms (unchanged)
tests/integration/api/r2-ai-proxy.test.ts 2ms (unchanged)
tests/integration/api/voice/transcribe-and-poll.test.ts 4ms (unchanged)
tests/integration/api/voice/transcribe.test.ts 2ms (unchanged)
tests/integration/api/voice/usage.test.ts 2ms (unchanged)
tests/integration/api/webscraper.test.ts 3ms (unchanged)
tests/integration/auth.test.ts 6ms (unchanged)
tests/integration/billing-api.test.ts 16ms (unchanged)
tests/integration/blog.test.ts 5ms (unchanged)
tests/integration/comments-api.test.ts 5ms (unchanged)
tests/integration/comments.test.ts 16ms (unchanged)
tests/integration/csp-report.test.ts 3ms (unchanged)
tests/integration/dashboard-api.test.ts 16ms (unchanged)
tests/integration/kv-usage.test.ts 3ms (unchanged)
tests/integration/lead-magnet-api.test.ts 11ms (unchanged)
tests/integration/magic-link-happy.test.ts 3ms (unchanged)
tests/integration/magic-link.test.ts 4ms (unchanged)
tests/integration/newsletter-api.test.ts 8ms (unchanged)
tests/integration/projects-api.test.ts 19ms (unchanged)
tests/integration/prompt-enhance-api.test.ts 6ms (unchanged)
tests/integration/prompt-enhance-multipart.test.ts 4ms (unchanged)
tests/integration/routing/blog-i18n-seo-integration.test.ts 5ms (unchanged)
tests/integration/routing/blog-routes.test.ts 2ms (unchanged)
tests/integration/routing/headers.test.ts 2ms (unchanged)
tests/integration/routing/lang-alias.test.ts 1ms (unchanged)
tests/integration/routing/locale-routing.test.ts 3ms (unchanged)
tests/integration/routing/seo-hreflang.test.ts 2ms (unchanged)
tests/integration/routing/voice-visualizer-permissions.test.ts 1ms (unchanged)
tests/integration/setup/global-setup.ts 7ms (unchanged)
tests/integration/user-avatar-api.test.ts 13ms (unchanged)
tests/integration/verify-email.test.ts 3ms (unchanged)
tests/mocks/astro-content.ts 1ms (unchanged)
tests/performance/rate-limiting-perf.test.ts 14ms (unchanged)
tests/performance/run-load-tests.ts 11ms (unchanged)
tests/shared/auth.ts 3ms (unchanged)
tests/shared/http.ts 13ms (unchanged)
tests/src/helpers/rateLimiter.ts 1ms (unchanged)
tests/src/legacy/config/test-config.ts 5ms (unchanged)
tests/src/legacy/utils/database-helpers.ts 8ms (unchanged)
tests/src/legacy/utils/logger.ts 9ms (unchanged)
tests/src/legacy/utils/server-helpers.ts 15ms (unchanged)
tests/src/lib/auth-v2.test.ts 4ms (unchanged)
tests/src/pages/api/ai-video/generate.test.ts 7ms (unchanged)
tests/src/pages/api/auth/login-405.test.ts 2ms (unchanged)
tests/src/pages/api/auth/login-logger.test.ts 10ms (unchanged)
tests/src/pages/api/auth/login-service.test.ts 9ms (unchanged)
tests/src/pages/api/auth/login.test.ts 7ms (unchanged)
tests/src/pages/api/dashboard/activity._test.ts 7ms (unchanged)
tests/src/pages/api/dashboard/perform-action._test.ts 13ms (unchanged)
tests/src/pages/api/dashboard/projects._test.ts 7ms (unchanged)
tests/src/pages/api/projects/index._test.ts 9ms (unchanged)
tests/src/pages/api/tools._test.ts 4ms (unchanged)
tests/src/pages/api/user/me.test.ts 6ms (unchanged)
tests/src/pages/api/user/profile.test.ts 14ms (unchanged)
tests/src/scripts/blog-post-enhancements.test.ts 2ms (unchanged)
tests/src/server/utils/hashing.test.ts 2ms (unchanged)
tests/src/server/utils/jwt.test.ts 3ms (unchanged)
tests/types/upstash-kv.d.ts 1ms (unchanged)
tests/unit/account/delete-account-section.test.tsx 3ms (unchanged)
tests/unit/ai-image-provider-mapping.test.ts 3ms (unchanged)
tests/unit/ai-image/aiimage-retry.test.ts 3ms (unchanged)
tests/unit/ai-jobs-provider-mapping.test.ts 3ms (unchanged)
tests/unit/api/account-delete.test.ts 5ms (unchanged)
tests/unit/blog-sorting.spec.ts 4ms (unchanged)
tests/unit/comment-components.test.tsx 11ms (unchanged)
tests/unit/comment-service-simple.test.ts 6ms (unchanged)
tests/unit/comment-service.test.ts 18ms (unchanged)
tests/unit/components/BlogCTA.test.ts 1ms (unchanged)
tests/unit/components/BlogPost.test.ts 1ms (unchanged)
tests/unit/components/imag-enhancer/CreditsPanel.test.tsx 2ms (unchanged)
tests/unit/components/imag-enhancer/ModelControls.test.tsx 2ms (unchanged)
tests/unit/components/imag-enhancer/UploadSection.test.tsx 2ms (unchanged)
tests/unit/dashboard/billing-card.test.tsx 3ms (unchanged)
tests/unit/dashboard/projectStore.test.ts 6ms (unchanged)
tests/unit/dashboard/quickActionStore.test.ts 3ms (unchanged)
tests/unit/hooks/imag-enhancer/useClipboardImagePaste.test.ts 2ms (unchanged)
tests/unit/hooks/imag-enhancer/useCompareInteractions.test.tsx 7ms (unchanged)
tests/unit/hooks/imag-enhancer/useGlobalShortcuts.test.ts 2ms (unchanged)
tests/unit/hooks/imag-enhancer/usePlanGating.test.ts 3ms (unchanged)
tests/unit/hooks/imag-enhancer/useViewportUiMetrics.test.ts 3ms (unchanged)
tests/unit/i18n.test.ts 3ms (unchanged)
tests/unit/imag-enhancer/help-modal-focus.test.tsx 2ms (unchanged)
tests/unit/imag-enhancer/keyboard-shortcuts.test.tsx 5ms (unchanged)
tests/unit/lib/aos.test.ts 5ms (unchanged)
tests/unit/security/deprecated-logging.test.ts 7ms (unchanged)
tests/unit/services/provider-error-mapping.test.ts 1ms (unchanged)
tests/unit/services/webscraper-service.test.ts 6ms (unchanged)
tests/unit/spam-detection.test.ts 4ms (unchanged)
tests/unit/telemetry/telemetry-client.test.ts 2ms (unchanged)
tests/unit/testimonials-loader.test.ts 4ms (unchanged)
tests/unit/utils/logger.test.ts 20ms (unchanged)
tests/unit/utils/mime.test.ts 2ms (unchanged)
tests/unit/validation/billing-schema.test.ts 1ms (unchanged)
tests/unit/validation/dashboard-schema.test.ts 1ms (unchanged)
tests/unit/validation/errors.test.ts 1ms (unchanged)
tests/unit/validation/newsletter-schema.test.ts 1ms (unchanged)
tests/unit/validation/newsletter-unsubscribe-schema.test.ts 1ms (unchanged)
tests/unit/validation/prompt-schema.test.ts 2ms (unchanged)
tests/unit/validation/templates-schema.test.ts 1ms (unchanged)
tests/unit/validation/users-sync-schema.test.ts 1ms (unchanged)
tests/unit/validation/webscraper-schema.test.ts 1ms (unchanged)
tests/unit/voice-stream-aggregator.test.ts 3ms (unchanged)
scripts/ae-run.mjs 5ms (unchanged)
scripts/align-de-to-en.mjs 2ms (unchanged)
scripts/blog-images-audit.ts 3ms (unchanged)
scripts/blog-images-generate.ts 2ms (unchanged)
scripts/coming-soon-client.ts 3ms (unchanged)
scripts/deploy.ts 3ms (unchanged)
scripts/dev-menu.ts 49ms (unchanged)
scripts/dev/docs-linkgraph.mjs 5ms (unchanged)
scripts/dev/gen-cascade-rules-coverage.mjs 4ms (unchanged)
scripts/dev/gen-memory-index.mjs 5ms (unchanged)
scripts/dev/memory-audit.mjs 7ms (unchanged)
scripts/dev/patch-windsurf-rules.mjs 2ms (unchanged)
scripts/dev/sync-windsurf-rules.mjs 1ms (unchanged)
scripts/dev/update-windsurf-rules.mjs 3ms (unchanged)
scripts/dev/verify-enhancer-download.mjs 4ms (unchanged)
scripts/doc-drift.mjs 2ms (unchanged)
scripts/doc-inventory.mjs 6ms (unchanged)
scripts/doc-links.mjs 4ms (unchanged)
scripts/docs-auto-fix.ts 7ms (unchanged)
scripts/docs-disable-md051.ts 2ms (unchanged)
scripts/docs-fix-anchors.ts 6ms (unchanged)
scripts/docs-fix-heading-levels.ts 3ms (unchanged)
scripts/docs-harmonize-anchors.ts 9ms (unchanged)
scripts/docs-link-audit.mjs 2ms (unchanged)
scripts/emoji-to-icon-codemod.mjs 7ms (unchanged)
scripts/fix-blog-images.ts 4ms (unchanged)
scripts/fix-de-faq-structure.mjs 4ms (unchanged)
scripts/gen-env-doc.mjs 2ms (unchanged)
scripts/gen-openapi.mjs 5ms (unchanged)
scripts/generate-test-fixtures.ts 1ms (unchanged)
scripts/generate-wordmark-outlined.ts 5ms (unchanged)
scripts/health-check.ts 4ms (unchanged)
scripts/hygiene-copy.mjs 1ms
scripts/hygiene-to-assistant.mjs 2ms (unchanged)
scripts/i18n-copy-de-to-en.mjs 2ms (unchanged)
scripts/i18n-diff.mjs 4ms (unchanged)
scripts/i18n-diff.ts 4ms (unchanged)
scripts/i18n-empty-report.mjs 2ms (unchanged)
scripts/i18n-fill-missing.mjs 3ms (unchanged)
scripts/i18n-identical.mjs 3ms (unchanged)
scripts/i18n-migrate-paths.mjs 4ms (unchanged)
scripts/i18n-prune-unused.mjs 3ms (unchanged)
scripts/i18n-validate.mjs 3ms (unchanged)
scripts/migrate-imports.js 6ms (unchanged)
scripts/migrate-imports.mjs 7ms (unchanged)
scripts/migrate-imports.ts 8ms (unchanged)
scripts/normalize-routes-links.mjs 1ms (unchanged)
scripts/onboarding.ts 10ms (unchanged)
scripts/quality-check.js 3ms (unchanged)
scripts/remark/remark-demote-h1.ts 1ms (unchanged)
scripts/resend-check.mjs 5ms (unchanged)
scripts/run-hygiene.mjs 3ms
scripts/sanitize-locale.mjs 2ms (unchanged)
scripts/security/scan-secrets.mjs 3ms (unchanged)
scripts/setup-local-dev.js 19ms (unchanged)
scripts/setup-local-dev.ts 16ms (unchanged)
scripts/smoke-inject-enhancer.mjs 3ms (unchanged)
scripts/warmup.ts 9ms (unchanged)
scripts/zod-openapi-diff.ts 6ms (unchanged)
scripts/zod-openapi-pilot.ts 3ms (unchanged)
.lintstagedrc.json 1ms (unchanged)
.markdownlint.json 1ms (unchanged)
.prettierrc.json 0ms (unchanged)
api-extractor.json 1ms (unchanged)
blog-post-content-type.json 1ms (unchanged)
cache-rules-ci.json 1ms (unchanged)
cache-rules-create.json 1ms (unchanged)
cache-rules-rules.json 1ms (unchanged)
cf-create-ruleset.json 1ms (unchanged)
CHANGELOG_COMMENT_SYSTEM.md 31ms (unchanged)
CHANGELOG.md 7ms (unchanged)
CLAUDE.md 20ms (unchanged)
CODE_OF_CONDUCT.md 2ms (unchanged)
combined-rules.json 1ms (unchanged)
CONTRIBUTING.md 37ms (unchanged)
developer.mozilla.org--mdn-web-docs--20251025-090628_scrapedwithhub-evolutioncom.json 3ms (unchanged)
existing-rules.json 1ms (unchanged)
lighthouse-report-de.json 169ms (unchanged)
lighthouse-report-en.json 143ms (unchanged)
package.json 1ms (unchanged)
README.md 26ms (unchanged)
resp_cf_ok.json 0ms (unchanged)
resp_cf_sd15.json 1ms (unchanged)
resp_g2.json 1ms (unchanged)
resp_prod.json 1ms (unchanged)
resp_repl.json 0ms (unchanged)
resp_sdxl.json 0ms (unchanged)
resp.json 0ms (unchanged)
resp2.json 0ms (unchanged)
ruleset-current-staging.json 1ms (unchanged)
rulesets-list.json 0ms (unchanged)
rulesets-staging-list.json 1ms (unchanged)
staging-rules.json 1ms (unchanged)
tsconfig.ai.json 0ms (unchanged)
tsconfig.astro-check.json 0ms (unchanged)
tsconfig.astro-check.ui.json 1ms (unchanged)
tsconfig.astro.json 0ms (unchanged)
tsconfig.build.json 0ms (unchanged)
tsconfig.json 1ms (unchanged)
tsconfig.src.json 0ms (unchanged)
tsdoc.json 1ms (unchanged)
update-payload.json 1ms (unchanged)
update-staging.json 1ms (unchanged)

```

### i18n-audit

```text
[i18n:audit] $ npm run i18n:audit

> evolution-hub@0.0.1 i18n:audit
> npm run i18n:report && npm run i18n:validate && npm run i18n:diff


> evolution-hub@0.0.1 i18n:report
> node scripts/i18n-empty-report.mjs

i18n empty strings report
- en: 0 empty values
- de: 0 empty values

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
Linting: 127 file(s)
Summary: 0 error(s)

```

### lint-strict

```text
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
Linting: 127 file(s)
Summary: 0 error(s)

```

### openapi-validate

```text
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

```

### test-integration-run

```text
  "requestId": "ycekjzmnmhi4orkj",
  "endpoint": "/",
  "method": "GET"
}
[2025-11-02T19:52:54.931Z] [DEBUG][ycekjzmn] [Middleware] pref_locale cookie explicitly set
Context: {
  "requestId": "ycekjzmnmhi4orkj",
  "targetLocale": "en"
}
[wrangler:info] GET / 302 Found (3ms)
 ✓ |integration| tests/integration/routing/lang-alias.test.ts (1 test) 54ms
 ✓ |integration| tests/integration/api/webscraper.test.ts (7 tests) 4ms
 ✓ |integration| tests/integration/kv-usage.test.ts (2 tests) 3ms
stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > charges credits when balance is sufficient
[2025-11-02T19:52:55.186Z] [INFO][U:user1] API_ACCESS
Context: {
  "securityEventType": "API_ACCESS",
  "details": {
    "endpoint": "/api/ai-video/generate",
    "method": "POST"
  },
  "userId": "user1",
  "ipAddress": "unknown",
  "timestamp": 1762113175186
}

stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > uses monthly quota when credits are 0 and quota remains
[2025-11-02T19:52:55.192Z] [INFO][U:user1] API_ACCESS
Context: {
  "securityEventType": "API_ACCESS",
  "details": {
    "endpoint": "/api/ai-video/generate",
    "method": "POST"
  },
  "userId": "user1",
  "ipAddress": "unknown",
  "timestamp": 1762113175192
}

stdout | tests/integration/api/ai-video/generate.test.ts > ai-video generate (quota fallback) > returns insufficient_quota when credits=0 and quota exhausted
[2025-11-02T19:52:55.197Z] [INFO][U:user1] API_ACCESS
Context: {
  "securityEventType": "API_ACCESS",
  "details": {
    "endpoint": "/api/ai-video/generate",
    "method": "POST"
  },
  "userId": "user1",
  "ipAddress": "unknown",
  "timestamp": 1762113175197
}

 ✓ |integration| tests/integration/api/ai-video/generate.test.ts (3 tests) 32ms
 ↓ |integration| tests/integration/magic-link-happy.test.ts (1 test | 1 skipped)
 ↓ |integration| tests/integration/comments.test.ts (28 tests | 28 skipped)
[dev] [2025-11-02T19:52:58.133Z] [INFO] enhance_path_counter {
  timestamp: 2025-11-02T19:52:58.133Z,
  resource: 'prompt-enhancer-service',
  pathType: 'llm_text',
  inc: 1
}
[2025-11-02T19:52:58.136Z] [INFO] enhance_completed {
  timestamp: 2025-11-02T19:52:58.136Z,
  resource: 'prompt-enhancer-service',
  reqId: 'enhance-1762113172787-g5c4b',
  latency: 5346,
  enhancedLength: 1183,
  maskedCount: 0,
  aiUsed: true,
  path: 'llm',
  pathType: 'llm_text'
}
[dev] [2025-11-02T19:52:58.138Z] [DEBUG][fj02evsx] [Middleware] Outgoing response
Context: {
  "requestId": "fj02evsxmhi4opwy",
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
[2025-11-02T19:52:58.139Z] [DEBUG][fj02evsx] [Middleware] Processing path
Context: {
  "requestId": "fj02evsxmhi4opwy",
  "path": "/api/prompt-enhance"
}
[dev] [2025-11-02T19:52:58.140Z] [INFO][fj02evsx] POST /api/prompt-enhance -> 200 (5354ms)
Context: {
  "requestId": "fj02evsxmhi4opwy",
  "duration": 5354,
  "status": 200
}
[dev] [wrangler:info] POST /api/prompt-enhance 200 OK (5456ms)
[dev] [2025-11-02T19:52:58.160Z] [INFO][314bwf8x] POST /api/prompt-enhance
Context: {
  "requestId": "314bwf8xmhi4ou28",
  "endpoint": "/api/prompt-enhance",
  "method": "POST"
}
[dev] [2025-11-02T19:52:58.161Z] [DEBUG][314bwf8x] [Middleware] Session ID from cookie
Context: {
  "requestId": "314bwf8xmhi4ou28",
  "present": false
}
[2025-11-02T19:52:58.161Z] [INFO][U:anonymous] API_ACCESS
Context: {
  "securityEventType": "API_ACCESS",
  "details": {
    "endpoint": "/api/prompt-enhance",
    "method": "POST"
  },
  "userId": "anonymous",
  "ipAddress": "::1",
  "timestamp": 1762113178161
}
[2025-11-02T19:52:58.161Z] [DEBUG][314bwf8x] [Middleware] Outgoing response
Context: {
  "requestId": "314bwf8xmhi4ou28",
  "status": 400,
  "statusText": "Bad Request",
  "headers": {
    "content-type": "application/json",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  }
}
[2025-11-02T19:52:58.161Z] [DEBUG][314bwf8x] [Middleware] Processing path
Context: {
  "requestId": "314bwf8xmhi4ou28",
  "path": "/api/prompt-enhance"
}
[2025-11-02T19:52:58.161Z] [INFO][314bwf8x] POST /api/prompt-enhance -> 400 (1ms)
Context: {
  "requestId": "314bwf8xmhi4ou28",
  "duration": 1,
  "status": 400
}
[dev] [wrangler:info] POST /api/prompt-enhance 400 Bad Request (5ms)
 ✓ |integration| tests/integration/prompt-enhance-multipart.test.ts (4 tests) 7870ms
   ✓ POST /api/prompt-enhance (multipart) > accepts image/png + text and returns success  2389ms
   ✓ POST /api/prompt-enhance (multipart) > accepts text/plain + text and returns success  5465ms

 Test Files  42 passed | 2 skipped (44)
      Tests  217 passed | 34 skipped (251)
   Start at  20:52:26
   Duration  31.91s (transform 1.11s, setup 0ms, collect 4.28s, tests 22.49s, environment 10ms, prepare 4.35s)

[dev] 🪵  Logs were written to "/Users/lucas/Library/Preferences/.wrangler/logs/wrangler-2025-11-02_19-52-45_885.log"
(node:66201) ExperimentalWarning: `--experimental-loader` may be removed in the future; instead use `register()`:
--import 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));'
(Use `node --trace-warnings ...` to show where the warning was created)
Error: in prepare, no such table: users
⚠️ Could not add column users.email_verified on /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite (may already exist). Error: Command failed: sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;"
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at addColumnIfMissing (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:68:13)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:505:17
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66387,
  stdout: null,
  stderr: null
}
Error: in prepare, no such table: users
⚠️ Could not add column users.email_verified_at on /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite (may already exist). Error: Command failed: sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite "ALTER TABLE users ADD COLUMN email_verified_at INTEGER NULL;"
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at addColumnIfMissing (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:68:13)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:507:17
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66389,
  stdout: null,
  stderr: null
}
Error: in prepare, no such table: users
⚠️ Could not add column users.plan on /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite (may already exist). Error: Command failed: sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite "ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';"
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at addColumnIfMissing (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:68:13)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:509:17
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66391,
  stdout: null,
  stderr: null
}
Error: in prepare, no such table: notifications
⚠️ Could not add column notifications.is_read on /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite (may already exist). Error: Command failed: sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite "ALTER TABLE notifications ADD COLUMN is_read INTEGER DEFAULT 0;"
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at addColumnIfMissing (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:68:13)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:604:17
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66437,
  stdout: null,
  stderr: null
}
Parse error near line 2: no such table: users
❌ Fehler beim Erstellen des Test-Benutzers in /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite: Error: Command failed: cat /var/folders/zj/f8vrzrv13fjg2yl65gm09pr00000gn/T/test_user_1762113150184.sql | sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at createTestUser (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:145:17)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:685:15
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66569,
  stdout: null,
  stderr: null
}
Parse error near line 2: no such table: users
❌ Fehler beim Erstellen/Aktualisieren für admin@test-suite.local in /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite: Error: Command failed: cat /var/folders/zj/f8vrzrv13fjg2yl65gm09pr00000gn/T/suitev2_user_admin_1762113150250.sql | sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at createSuiteV2TestUsers (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:240:21)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:686:15 {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66584,
  stdout: null,
  stderr: null
}
Parse error near line 2: no such table: users
❌ Fehler beim Erstellen/Aktualisieren für user@test-suite.local in /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite: Error: Command failed: cat /var/folders/zj/f8vrzrv13fjg2yl65gm09pr00000gn/T/suitev2_user_user_1762113150325.sql | sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at createSuiteV2TestUsers (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:240:21)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:686:15 {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66599,
  stdout: null,
  stderr: null
}
Parse error near line 2: no such table: users
❌ Fehler beim Erstellen/Aktualisieren für premium@test-suite.local in /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite: Error: Command failed: cat /var/folders/zj/f8vrzrv13fjg2yl65gm09pr00000gn/T/suitev2_user_premium_1762113150378.sql | sqlite3 /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/6d5e765e2e1fa599cbe1476e8483b36e425091821a30372b3c5fbbf212e36fba.sqlite
    at genericNodeError (node:internal/errors:984:15)
    at wrappedFn (node:internal/errors:538:14)
    at checkExecSyncError (node:child_process:891:11)
    at execSync (node:child_process:963:15)
    at createSuiteV2TestUsers (file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:240:21)
    at file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/scripts/setup-local-dev.ts:686:15 {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 66614,
  stdout: null,
  stderr: null
}
(node:66668) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
(Use `node --trace-warnings ...` to show where the warning was created)
[33m▲ [43;33m[[43;30mWARNING[43;33m][0m [1mAI bindings always access remote resources, and so may incur usage charges even in local dev. To suppress this warning, set `remote: true` for the binding definition in your configuration file.[0m



```

### test-unit-debug

```text
This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at DeleteAccountSection (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/account/DeleteAccountSection.tsx:19:3)
Warning: An update to DeleteAccountSection inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at DeleteAccountSection (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/account/DeleteAccountSection.tsx:19:3)
Warning: An update to DeleteAccountSection inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at DeleteAccountSection (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/account/DeleteAccountSection.tsx:19:3)
Warning: An update to DeleteAccountSection inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at DeleteAccountSection (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/account/DeleteAccountSection.tsx:19:3)
Warning: An update to DeleteAccountSection inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at DeleteAccountSection (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/account/DeleteAccountSection.tsx:19:3)

stderr | tests/unit/comment-components.test.tsx > CommentList > should handle comment deletion
Error: Not implemented: window.confirm
    at module.exports (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/browser/not-implemented.js:9:17)
    at /Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/browser/Window.js:960:7
    at handleDelete (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/components/comments/CommentList.tsx:122:9)
    at HTMLUnknownElement.callCallback (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/react-dom/cjs/react-dom.development.js:4164:14)
    at HTMLUnknownElement.callTheUserObjectsOperation (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/generated/EventListener.js:26:30)
    at innerInvokeEventListeners (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:350:25)
    at invokeEventListeners (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
    at HTMLUnknownElementImpl._dispatch (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
    at HTMLUnknownElementImpl.dispatchEvent (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
    at HTMLUnknownElement.dispatchEvent (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js:241:34) [90mundefined[39m

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject non-HTTP(S) URLs
[2025-11-02T19:53:14.620Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:53:14.620Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113194618-zaeft'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'ftp://example.com'[39m,
  error: [32m'Only HTTP/HTTPS URLs are allowed'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject blocked domains (or invalid port)
[2025-11-02T19:53:14.628Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:53:14.628Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113194628-4s00u'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'http://localhost:3000'[39m,
  error: [32m'Only ports 80/443 are allowed'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject too long URLs
[2025-11-02T19:53:14.634Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:53:14.634Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113194629-wpccs'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'[39m,
  error: [32m'URL too long or empty'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > Quota Management > should enforce guest quota
[2025-11-02T19:53:14.650Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:53:14.650Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113194650-slcz9'[39m,
  errorKind: [32m'quota_exceeded'[39m,
  url: [32m'https://example.com'[39m,
  ownerType: [32m'guest'[39m,
  ownerId: [32m'-123'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > Robots.txt Compliance > should block scraping when robots.txt disallows
[2025-11-02T19:53:14.666Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:53:14.666Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113194661-2wzq5'[39m,
  errorKind: [32m'robots_txt_blocked'[39m,
  url: [32m'https://example.com/admin'[39m
}

stderr | tests/unit/hooks/useRateLimit.test.tsx > useRateLimit (prompt) > parses Retry-After header and JSON details fallback
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useRateLimit.test.tsx:10:54)

stderr | tests/unit/hooks/useRateLimit.test.tsx > useRateLimit (prompt) > parses Retry-After header and JSON details fallback
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useRateLimit.test.tsx:10:54)

stderr | tests/unit/hooks/useRateLimit.test.tsx > useRateLimit (prompt) > parses Retry-After header and JSON details fallback
Warning: An update to Harness inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at Harness (/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/tests/unit/hooks/useRateLimit.test.tsx:10:54)

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-02T19:53:16.405Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:16.406Z[39m,
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
[2025-11-02T19:53:16.416Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:16.416Z[39m,
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
[2025-11-02T19:53:16.419Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:16.419Z[39m,
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
[2025-11-02T19:53:16.420Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:16.420Z[39m,
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
[2025-11-02T19:53:16.420Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:16.420Z[39m,
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
[2025-11-02T19:53:16.591Z] [WARN] workers_ai_tiny_output_retry {
  timestamp: [35m2025-11-02T19:53:16.591Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'workers_ai_tiny_output_retry'[39m,
  metadata: { model: [32m'@cf/runwayml/stable-diffusion-v1-5-img2img'[39m, bytes: [33m1000[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-02T19:53:17.599Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:17.599Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m401[39m, provider: [32m'replicate'[39m, snippet: [32m'unauthorized'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 403 to forbidden
[2025-11-02T19:53:17.605Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:17.605Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m403[39m, provider: [32m'replicate'[39m, snippet: [32m'forbidden'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 404 to validation_error
[2025-11-02T19:53:17.606Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:17.606Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m404[39m, provider: [32m'replicate'[39m, snippet: [32m'not found'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 422 to validation_error
[2025-11-02T19:53:17.609Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:17.609Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m422[39m, provider: [32m'replicate'[39m, snippet: [32m'unprocessable'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 500 to server_error
[2025-11-02T19:53:17.611Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:53:17.611Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m500[39m, provider: [32m'replicate'[39m, snippet: [32m'server err'[39m }
}

stderr | tests/unit/i18n.test.ts > i18n Utils > should return fallback for non-existing key
Key "non.existing.key" not found in locale "de". Falling back to English.

stderr | tests/unit/i18n.test.ts > i18n Utils > should fallback to English for unknown locale (simulated)
Locale "xx" not found. Using English as fallback.


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |unit| tests/unit/prompt-enhancer-service.test.ts > PromptEnhancerService > enhance > should enhance input successfully for guest with quota available
AssertionError: expected 'You are an expert prompt engineer.' to be 'You are an expert content creator.' // Object.is equality

Expected: [32m"You are an expert [7mcontent creato[27mr."[39m
Received: [31m"You are an expert [7mprompt enginee[27mr."[39m

 ❯ tests/unit/prompt-enhancer-service.test.ts:161:36
    159|       const result = await service.enhance(defaultInput, defaultOption…
    160| 
    161|       expect(result.enhanced.role).toBe('You are an expert content cre…
       |                                    ^
    162|       expect(result.enhanced.objective).toContain('Perform generate ta…
    163|       expect(result.usage.used).toBe(1);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  |unit| tests/unit/prompt-enhancer-service.test.ts > PromptEnhancerService > enhance > should handle complex input with steps and examples
AssertionError: expected undefined to be defined
 ❯ tests/unit/prompt-enhancer-service.test.ts:225:47
    223|       expect(result.enhanced.steps).toBeDefined();
    224|       expect(result.enhanced.steps!.length).toBe(5);
    225|       expect(result.enhanced.fewShotExamples).toBeDefined();
       |                                               ^
    226|       expect(result.enhanced.fewShotExamples!.length).toBe(2);
    227|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


```

### test-unit-run

```text
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

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject non-HTTP(S) URLs
[2025-11-02T19:52:20.487Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:52:20.487Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113140484-uuty1'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'ftp://example.com'[39m,
  error: [32m'Only HTTP/HTTPS URLs are allowed'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject blocked domains (or invalid port)
[2025-11-02T19:52:20.490Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:52:20.490Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113140488-267zy'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'http://localhost:3000'[39m,
  error: [32m'Only ports 80/443 are allowed'[39m
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > callCustomAssistant > should throw error on run failure (status: failed)
[2025-11-02T19:52:20.516Z] [ERROR] assistant_call_failed {
  timestamp: [35m2025-11-02T19:52:20.516Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_call_failed'[39m,
  metadata: { error: [32m'Thread creation returned no id'[39m }
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > callCustomAssistant > should throw error if no assistant message
[2025-11-02T19:52:20.538Z] [ERROR] assistant_call_failed {
  timestamp: [35m2025-11-02T19:52:20.538Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_call_failed'[39m,
  metadata: { error: [32m'Thread creation returned no id'[39m }
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > URL Validation > should reject too long URLs
[2025-11-02T19:52:20.509Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:52:20.509Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113140491-zbhhe'[39m,
  errorKind: [32m'validation_error'[39m,
  url: [32m'https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'[39m,
  error: [32m'URL too long or empty'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > Quota Management > should enforce guest quota
[2025-11-02T19:52:20.529Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:52:20.529Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113140529-zdn38'[39m,
  errorKind: [32m'quota_exceeded'[39m,
  url: [32m'https://example.com'[39m,
  ownerType: [32m'guest'[39m,
  ownerId: [32m'-123'[39m
}

stderr | tests/unit/services/webscraper-service.test.ts > WebscraperService > Robots.txt Compliance > should block scraping when robots.txt disallows
[2025-11-02T19:52:20.536Z] [ERROR] scrape_failed {
  timestamp: [35m2025-11-02T19:52:20.536Z[39m,
  resource: [32m'webscraper-service'[39m,
  reqId: [32m'scrape-1762113140535-xie28'[39m,
  errorKind: [32m'robots_txt_blocked'[39m,
  url: [32m'https://example.com/admin'[39m
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > callCustomAssistant > should throw error on network error during run creation
[2025-11-02T19:52:20.554Z] [ERROR] assistant_call_failed {
  timestamp: [35m2025-11-02T19:52:20.554Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_call_failed'[39m,
  metadata: { error: [32m'Thread creation returned no id'[39m }
}

stderr | tests/unit/services/ai-image-service.test.ts > AiImageService > generate with assistant > should ignore invalid assistant suggestion and use original params
[2025-11-02T19:52:20.591Z] [WARN] assistant_suggestion_parse_failed {
  timestamp: [35m2025-11-02T19:52:20.591Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'assistant_suggestion_parse_failed'[39m,
  metadata: { assistantId: [32m'asst-123'[39m }
}

stderr | tests/unit/ai-image-provider-mapping.test.ts > AiImageService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-02T19:52:21.507Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:21.507Z[39m,
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
[2025-11-02T19:52:21.511Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:21.511Z[39m,
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
[2025-11-02T19:52:21.512Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:21.512Z[39m,
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
[2025-11-02T19:52:21.513Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:21.513Z[39m,
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
[2025-11-02T19:52:21.513Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:21.513Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: {
    status: [33m500[39m,
    provider: [32m'replicate'[39m,
    model: [32m'owner/model:tag'[39m,
    snippet: [32m'server err'[39m
  }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 401 to forbidden
[2025-11-02T19:52:22.576Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:22.576Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m401[39m, provider: [32m'replicate'[39m, snippet: [32m'unauthorized'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 403 to forbidden
[2025-11-02T19:52:22.579Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:22.579Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m403[39m, provider: [32m'replicate'[39m, snippet: [32m'forbidden'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 404 to validation_error
[2025-11-02T19:52:22.580Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:22.580Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m404[39m, provider: [32m'replicate'[39m, snippet: [32m'not found'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 422 to validation_error
[2025-11-02T19:52:22.580Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:22.580Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m422[39m, provider: [32m'replicate'[39m, snippet: [32m'unprocessable'[39m }
}

stderr | tests/unit/ai-jobs-provider-mapping.test.ts > AiJobsService.runReplicate() provider error mapping > maps 500 to server_error
[2025-11-02T19:52:22.581Z] [WARN] replicate_error {
  timestamp: [35m2025-11-02T19:52:22.581Z[39m,
  resource: [32m'ai-jobs-service'[39m,
  action: [32m'replicate_error'[39m,
  metadata: { status: [33m500[39m, provider: [32m'replicate'[39m, snippet: [32m'server err'[39m }
}

stderr | tests/unit/ai-image/aiimage-retry.test.ts > AiImageService - Workers AI tiny output retry > retries once on tiny output and succeeds with larger image
[2025-11-02T19:52:22.818Z] [WARN] workers_ai_tiny_output_retry {
  timestamp: [35m2025-11-02T19:52:22.818Z[39m,
  resource: [32m'ai-image-service'[39m,
  action: [32m'workers_ai_tiny_output_retry'[39m,
  metadata: { model: [32m'@cf/runwayml/stable-diffusion-v1-5-img2img'[39m, bytes: [33m1000[39m }
}

stderr | tests/unit/i18n.test.ts > i18n Utils > should return fallback for non-existing key
Key "non.existing.key" not found in locale "de". Falling back to English.

stderr | tests/unit/i18n.test.ts > i18n Utils > should fallback to English for unknown locale (simulated)
Locale "xx" not found. Using English as fallback.


⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  |unit| tests/unit/prompt-enhancer-service.test.ts > PromptEnhancerService > enhance > should enhance input successfully for guest with quota available
AssertionError: expected 'You are an expert prompt engineer.' to be 'You are an expert content creator.' // Object.is equality

Expected: [32m"You are an expert [7mcontent creato[27mr."[39m
Received: [31m"You are an expert [7mprompt enginee[27mr."[39m

 ❯ tests/unit/prompt-enhancer-service.test.ts:161:36
    159|       const result = await service.enhance(defaultInput, defaultOption…
    160| 
    161|       expect(result.enhanced.role).toBe('You are an expert content cre…
       |                                    ^
    162|       expect(result.enhanced.objective).toContain('Perform generate ta…
    163|       expect(result.usage.used).toBe(1);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  |unit| tests/unit/prompt-enhancer-service.test.ts > PromptEnhancerService > enhance > should handle complex input with steps and examples
AssertionError: expected undefined to be defined
 ❯ tests/unit/prompt-enhancer-service.test.ts:225:47
    223|       expect(result.enhanced.steps).toBeDefined();
    224|       expect(result.enhanced.steps!.length).toBe(5);
    225|       expect(result.enhanced.fewShotExamples).toBeDefined();
       |                                               ^
    226|       expect(result.enhanced.fewShotExamples!.length).toBe(2);
    227|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


```

### typecheck-src

```text
[typecheck:src] $ npm run typecheck:src

> evolution-hub@0.0.1 typecheck:src
> tsc -p tsconfig.src.json --noEmit


```

## Next Actions (for Assistant)
- Analyze failing steps and propose minimal patches.
- If tests fail, provide targeted code edits and updated tests where needed.
- Keep changes small and standards-compliant (TypeScript strict, ESLint rules).