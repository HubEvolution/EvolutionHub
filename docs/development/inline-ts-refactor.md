# Inline TypeScript Refactor – Working Document

Owner: Engineering
Status: In progress
Last updated: 2025-08-24T23:27:01+02:00

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
- Pilot: externalize blog page enhancements from `src/pages/blog/[...slug].astro` into `src/scripts/blog-post-enhancements.ts`; wire with CSP-safe inline loader; validate CSP + hydration + typing.
- Draft detailed refactor guidelines (structure, hydration patterns, CSP, typing, testing) once pilot confirms approach.
- Add tests and linting for script TS safety (e.g., `noImplicitAny`) and critical interactions.

---
This document is provisional and will be updated as we read more files and confirm behaviors.

## Decisions (Pilot)

- **CSP & Loading**: Production CSP (`script-src 'self' 'nonce-${cspNonce}' 'strict-dynamic' https://cdn.jsdelivr.net`) requires a tiny nonced inline bootstrap that uses `import(Astro.resolve('...'))` to load external modules.
- **Hydration timing**: Default to DOMContentLoaded. No need for delayed hydration; mirrors existing coordinator pattern (e.g., `AnalyticsCoordinator.astro`).
- **Module API**: External scripts export `init()` and optional `cleanup()`; idempotent, no top-level side-effects.
- **Lifecycle**: Expose cleanup via `window['moduleCleanup']` and call it on `beforeunload`.
- **Data passing**: Prefer DOM data-* attributes or JSON script tags; use `define:vars` only when necessary.
- **Global handlers**: Cross-cutting listeners (e.g., smooth scrolling for `a[href^="#"]`) are centralized in `src/layouts/BaseLayout.astro`. Feature modules must not duplicate these to avoid double-binding.

## Pilot Implementation – Blog Post Enhancements

- **Files**:
  - `src/pages/blog/[...slug].astro`: replaced inline script with CSP-safe loader using `nonce={Astro.locals.cspNonce}` and `Astro.resolve()`.
  - `src/scripts/blog-post-enhancements.ts`: new module exporting `init()`/`cleanup()`.
- **Behavior parity**:
  - Lazy-load article images (`loading="lazy"`).
  - Smooth scrolling remains handled globally by `src/layouts/BaseLayout.astro` (module does not add its own click listener).
  - Add underline/tooltip styles for footnote links.
- **Lifecycle & safety**:
  - Idempotent `init()`, cleanup on `beforeunload`.

## Migration Template

1. Move inline logic into `src/scripts/<feature>.ts` with `export function init()` and optional `export function cleanup()`.

1. Replace inline script with nonced loader:

```astro
<script is:inline nonce={Astro.locals.cspNonce}>
  function initFeature() {
    import(Astro.resolve('@/scripts/<feature>.ts'))
      .then((m) => {
        if (typeof m?.cleanup === 'function') window['<feature>Cleanup'] = m.cleanup;
        if (typeof m?.init === 'function') m.init();
        else if (typeof m?.default === 'function') m.default();
      })
      .catch((err) => console.error('[Feature] Failed to load module', err));
  }
  if (document.readyState !== 'loading') initFeature();
  else document.addEventListener('DOMContentLoaded', initFeature);
  window.addEventListener('beforeunload', () => { try { window['<feature>Cleanup']?.(); } catch {} });
</script>
```

1. Testing: Unit test the module API; E2E verify UX behavior and cleanup across navigation.

## Staging Deployment (Pilot) – Cloudflare Workers

This pilot is deployed to a staging Cloudflare Worker with strict environment isolation.

### Resource isolation (staging)

- D1 database binding `DB` → `evolution-hub-main-local` (`11c6dad1-b35b-488e-a5f3-1d2e707afa65`).
- R2 avatars binding `R2_AVATARS` → `evolution-hub-avatars-local`.
- R2 lead magnets binding `R2_LEADMAGNETS` → `evolution-hub-lead-magnets-dev`.
- KV `SESSION` → `bc180c72cdbe4701a221ab8002f2de72` (preview: `79810af7adff409a9a7fed6cb849b845`).
- `BASE_URL` → `https://staging.hub-evolution.com`.

See `wrangler.toml` under `[env.staging]` for authoritative bindings.

### Migrations (staging DB)

```bash
wrangler d1 migrations list --env staging evolution-hub-main-local
wrangler d1 migrations apply --env staging evolution-hub-main-local
```

### Deploy to staging

```bash
wrangler deploy --env staging
```

### E2E tests against staging

Playwright config reads `BASE_URL` and will not start a local server for remote targets.

```bash
BASE_URL=https://staging.hub-evolution.com npm run test:e2e:chromium
# Full matrix (optional)
BASE_URL=https://staging.hub-evolution.com npm run test:e2e
```

### Validation checklist

- CSP headers present; scripts execute via nonced inline loader (`nonce={Astro.locals.cspNonce}`) and `strict-dynamic`.
- Smooth scroll works (centralized in `src/layouts/BaseLayout.astro`), no duplicate handlers.
- Blog footnotes accessible (focus/scroll-to/underline styling preserved).
- No duplicate event handlers or memory leaks (idempotent `init()`/`cleanup()`).

### Troubleshooting

- If avatars fail on staging, verify `R2_AVATARS` points to `evolution-hub-avatars-local` and the proxy route `src/pages/r2/[...path].ts` is served.
- If DB writes fail, confirm D1 binding `DB` uses `evolution-hub-main-local` and migrations are applied.
- For CSP violations, check `src/middleware.ts` and ensure the inline loader is nonced and uses `Astro.resolve()` dynamic import.

## Ranked Backlog (next candidates)

1. **`src/layouts/BaseLayout.astro`**: smooth-scroll and misc inline handlers → extract to `src/scripts/base-layout-ux.ts`.
2. **`src/components/Newsletter.astro`**: form submission/validation → `src/scripts/newsletter-form.ts` (with data-* config).
3. **`src/components/scripts/TypewriterComponent.astro`**: unify loader pattern; move logic if substantial.
4. **`src/components/scripts/HeaderScroll.astro`**: align with coordinator template and idempotent API.
5. **`src/pages/* account/settings`**: consolidate settings logic under a module with clear init/cleanup.
