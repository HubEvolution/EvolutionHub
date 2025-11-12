---
description: 'Funktionsweise der Locale-Middleware und URL-Normalisierung'
owner: 'Platform Team'
priority: 'medium'
lastSync: '2025-11-03'
codeRefs: 'src/middleware.ts, docs/architecture/auth-flow.md'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Splash Page & Locale Middleware

This document describes the locale selection splash page at `/welcome` and the middleware logic in `src/middleware.ts` that handles locale redirects and cookies.

## Overview

- The site supports two locales: `de` (default, neutral paths) and `en` (English paths are `/en/...`).

- First-time human visitors without a locale cookie and without a locale in the URL are redirected to `/welcome` to explicitly choose their language.

- Bots and assets/APIs are never redirected to the splash page.

### Auto-Continue and One-Time Gate

- The welcome page (`src/pages/welcome.astro`) includes a short client-side auto-continue: it chooses `?set_locale=de|en` based on `navigator.language` and then follows `next`. Opt-out: `?noauto=1`.

- The middleware sets a session-scoped cookie to show the splash only once per browser session (`session_welcome_seen`); subsequent navigations skip `/welcome`.

## Cookie

- Name: `pref_locale`

- Values: `de` or `en`

- Attributes: `HttpOnly`, `SameSite=Lax`, `Secure` when HTTPS, `Path=/`, `Max-Age=180 days`

- Set when:
  - The user visits a URL with explicit `?set_locale=de|en`.

  - A user browses a locale-prefixed URL (e.g., `/en/...`) and the cookie differs; middleware syncs the cookie to match URL locale.

- Manual override: `?lang=de|en` is an alias to `?set_locale=de|en` and uses the same same‑origin `next` guard and welcome loop‑guard.

## Redirect Rules (simplified)

- First visit (no cookie, no `/de` or `/en` prefix, not API/asset, not bot) → 302 to `/welcome?next=<original-url>`.

- Explicit selection: `/welcome?set_locale=en|de&next=<path>` → sets cookie, 302 to mapped `next` path respecting chosen locale.

- Neutral path with cookie `en` (not API/asset, not `/welcome`) → 302 to `/en/...` equivalent.

- `/de/...` visited while cookie `en` → 308 redirect to `/en/...` equivalent of the same path (preference for user’s cookie on DE-prefixed paths).

- Bots (no cookie, no locale in URL) → skip splash; redirect neutrals to `/en/...` if `Accept-Language` indicates EN; otherwise keep neutral (DE).

- Early neutral redirect: when no cookie is present, a recent referer from `/en/*` may trigger a one-time redirect to `/en/*` for better continuity.

## Accept-Language q-values

- The middleware selects the best supported language (`de|en`) using q‑values from the `Accept-Language` header. Example: `en-GB;q=0.9, de;q=0.8` picks EN.

- Fallback is `de` when the header is missing or unsupported.

- Referer‑based EN hint remains in effect when no cookie is present.

## SEO

- `src/pages/welcome.astro` includes: `<meta name="robots" content="noindex, nofollow, noarchive" />`.

- `public/robots.txt` disallows `/welcome`.

- `src/middleware.ts` setzt zusätzlich HTTP `X-Robots-Tag: noindex, nofollow, noarchive` für `/welcome`.

## Security & Headers

- `Content-Language` and `Vary: Cookie, Accept-Language` set on responses.

- Security headers applied: CSP, HSTS, COOP, X-Frame-Options, etc.

- Splash canonical link is emitted only for same-origin `next` URLs.

## Flags

- `PUBLIC_WELCOME_AUTO_DELAY_MS` (client): controls the auto-continue delay on `src/pages/welcome.astro`. Default `400`.

- `WELCOME_BYPASS_SPLASH` (server): when `"1"` or `"true"`, and for first neutral visits without cookie/URL-locale and outside exempt routes, the middleware sets `pref_locale` using `Accept-Language` best-match and redirects directly to the localized route, skipping `/welcome`.

## Testing Locally

Start the dev server:

````bash
npm run dev:astro

# Local: http://localhost:4321/

```bash

Smoke tests with curl (safe and read-only):

```bash
# 1) First visit → redirect to welcome with next
curl -I http://localhost:4321/

# 2) Explicit EN selection sets cookie and redirects to /en/
curl -sv -D - -o /dev/null "http://localhost:4321/welcome?set_locale=en&next=/"

# 3) Neutral root with EN cookie → redirect to /en/
curl -sv -D - -o /dev/null --header "Cookie: pref_locale=en" http://localhost:4321/

# 4) Explicit DE selection sets cookie and keeps neutral root
curl -sv -D - -o /dev/null "http://localhost:4321/welcome?set_locale=de&next=/"

# 5) Welcome page is served (no redirect) and should be noindex
curl -I http://localhost:4321/welcome
````

Expected highlights:

- Step 1: `302` with `Location: /welcome?next=...` and `Vary: Cookie, Accept-Language`.

- Step 2: `302` with `Set-Cookie: pref_locale=en; ...` and `Location: /en/`.

- Step 3: `302` redirect to `/en/`.

- Step 4: `302` with `Set-Cookie: pref_locale=de; ...` and `Location: /`.

- Step 5: `200 OK` and the HTML includes the robots noindex meta tag (source at `src/pages/welcome.astro`).

## E2E Tests

- Playwright Specs: `tests/e2e/specs/splash-middleware.spec.ts`

- Deckt ab:
  - First visit → Redirect zu `/welcome?next=...`

  - `?set_locale=de|en` setzt Cookie und mapped Redirect

  - Neutraler Root-Pfad mit `pref_locale=en` → Redirect zu `/en/`

  - `/de/*` Pfade mit `pref_locale=en` → 308 Redirect zu `/en/*`

  - Bot (EN Accept-Language) → neutral `/` → `/en/`

  - SEO: `meta[name=robots]` enthält `noindex`; Header optional

## CI Integration

- Workflow: `.github/workflows/e2e-tests.yml`

- Schritte:
  - Playwright E2E Tests ausführen

  - i18n Empty-Strings Report: `npm run i18n:report` → `i18n-empty-report.txt`

  - Artefakte: `playwright-report/`, `i18n-empty-report.txt`

## Known Limitations / Notes

- Only `de` and `en` are supported. Neutral paths represent German content.

- Redirects are avoided for asset and API routes. See `isApi` and `isAsset` checks in `src/middleware.ts`.

- The first-visit splash is skipped for bots to keep crawl paths stable and efficient.
