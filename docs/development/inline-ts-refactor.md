# Inline TypeScript Refactor – Working Document

Owner: Engineering
Status: In progress
Last updated: <auto>

## Scope & Goals
- Inventory all inline script usages in `.astro` files, with emphasis on `<script lang="ts">`, `is:inline`, `define:vars`, and `nonce`.
- Understand how inline scripts communicate with external TS/JS assets and components/layouts/pages.
- Maintain CSP compliance while refactoring.
- Draft a sustainable, low-risk approach to externalize scripts and add typing without quick fixes.

## Inventory (current)

### A. Files containing any `<script>` tag (31)
- `src/layouts/BaseLayout.astro`
- `src/components/blog/NewsletterCTA.astro`
- `src/pages/account/settings.astro`
- `src/pages/email-verified.astro`
- `src/pages/en/account/settings.astro`
- `src/pages/en/email-verified.astro`
- `src/components/AvatarUploadModal.astro`
- `src/components/ErrorBoundary.astro`
- `src/components/Header.astro`
- `src/components/Newsletter.astro`
- `src/components/SettingsScript.astro`
- `src/components/ThemeProvider.astro`
- `src/components/blog/BlogCTA.astro`
- `src/components/blog/LeadMagnetCTA.astro`
- `src/components/forms/LeadMagnetForm.astro`
- `src/components/scripts/AOSCoordinator.astro`
- `src/components/scripts/AnalyticsCoordinator.astro`
- `src/components/scripts/HeaderScroll.astro`
- `src/components/scripts/TypewriterComponent.astro`
- `src/components/scripts/VerifyEmailCoordinator.astro`
- `src/pages/blog/[...slug].astro`
- `src/pages/cookie-einstellungen.astro`
- `src/pages/de/register.astro`
- `src/pages/de/reset-password.astro`
- `src/pages/en/register.astro`
- `src/pages/en/reset-password.astro`
- `src/pages/faq.astro`
- `src/pages/kontakt.astro`
- `src/pages/newsletter/confirm.astro`
- `src/pages/register.astro`
- `src/pages/reset-password.astro`

### B. Inline `<script lang="ts">` occurrences (13)
- `src/components/AvatarUploadModal.astro`
- `src/components/ErrorBoundary.astro`
- `src/components/Header.astro`
- `src/components/ThemeProvider.astro`
- `src/components/blog/NewsletterCTA.astro`
- `src/components/forms/LeadMagnetForm.astro`
- `src/components/scripts/AOSCoordinator.astro`
- `src/components/scripts/AnalyticsCoordinator.astro`
- `src/components/scripts/HeaderScroll.astro`
- `src/components/scripts/VerifyEmailCoordinator.astro`
- `src/pages/account/settings.astro`
- `src/pages/blog/[...slug].astro`
- `src/pages/en/account/settings.astro`

### C. `is:inline` usage (3)
- `src/components/scripts/AOSCoordinator.astro`
- `src/components/scripts/TypewriterComponent.astro`
- `src/layouts/BaseLayout.astro`

### D. `define:vars` usage (6)
- `src/layouts/BaseLayout.astro`
- `src/components/blog/NewsletterCTA.astro`
- `src/components/forms/LeadMagnetForm.astro`
- `src/components/scripts/AOSCoordinator.astro`
- `src/components/scripts/AnalyticsCoordinator.astro`
- `src/components/scripts/VerifyEmailCoordinator.astro`

### E. `nonce` usage (6)
- `src/layouts/BaseLayout.astro`
- `src/components/blog/NewsletterCTA.astro`
- `src/components/forms/LeadMagnetForm.astro`
- `src/components/scripts/AOSCoordinator.astro`
- `src/components/scripts/AnalyticsCoordinator.astro`
- `src/components/scripts/VerifyEmailCoordinator.astro`

### F. Related external TS/JS assets and styles
- `scripts/coming-soon-client.ts`
- `public/assets/coming-soon-client.js`
- `src/styles/coming-soon.css`
- `src/components/ui/ComingSoon.astro` (UI entry point for overlay)
- `src/components/scripts/` directory:
  - `AOSCoordinator.astro`
  - `AnalyticsCoordinator.astro`
  - `AuthStatusNotifier.tsx`
  - `HeaderScroll.astro`
  - `TypewriterComponent.astro`
  - `VerifyEmailCoordinator.astro`

## Communication Map (preliminary)
- DOM lifecycle events: `DOMContentLoaded`, `astro:page-load` used to initialize behaviors.
- Global window access: some scripts attach listeners or expose cleanup on `window`.
- Data flow: `define:vars` passes server-side values into inline scripts; some components pass values via attributes/data-*.
- CSP: inline scripts commonly use `nonce` for policy compliance.
- Module usage: inline scripts may dynamically import external modules or use CDN-based scripts.

## Observations
- Inline scripts mix JS and TS; several use `lang="ts"` within `.astro`.
- `nonce` appears concentrated in layout and coordinator scripts.
- Some scripts initialize global behaviors (e.g., analytics, AOS, verify-email flows) that are cross-cutting concerns.

## Open Questions
1. For CSP: Are external scripts (served from `self`) allowed by current `script-src`, enabling us to move logic out of inline blocks without weakening the policy?
2. Constraints on hydration: Should we prefer Astro client directives (e.g., `client:load`) vs. DOM event wiring for global coordinators?
3. Data passing: Should we replace `define:vars` with `data-*` attributes or JSON script tags when externalizing?
4. Any pages/components intentionally relying on inline execution order or `<script is:inline>` semantics that must be preserved?
5. Accessibility requirements to prioritize (e.g., focus management patterns similar to Coming Soon overlay)?

## Next Steps
- Deep-dive review of `src/layouts/BaseLayout.astro` inline scripts to identify externalization seams and variable inputs.
- Pilot: externalize Coming Soon overlay logic (already modular) and validate CSP + hydration + typing.
- Draft detailed refactor guidelines (structure, hydration patterns, CSP, typing, testing) once pilot confirms approach.
- Add tests and linting for script TS safety (e.g., `noImplicitAny`) and critical interactions.

---
This document is provisional and will be updated as we read more files and confirm behaviors.
