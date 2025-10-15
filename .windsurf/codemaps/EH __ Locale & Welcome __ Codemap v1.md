---
description: EH :: Locale & Welcome :: Codemap v1
version: 1.0
feature: locale-welcome
---

# EH :: Locale & Welcome :: Codemap v1

## Entry Points

- `src/middleware.ts` (Locale handling, splash gate, cookies, headers)
- `src/pages/welcome.astro` (auto-continue with delay, `?noauto=1`)
- `src/layouts/BaseLayout.astro` (SEO: canonical/hreflang)

## New Utilities

- `src/lib/i18n/accept-language.ts`
  - `parseAcceptLanguage(header: string | null): Array<{ lang: 'de'|'en', q: number }>`
  - Parse Accept-Language with q-values, normalize to base `de|en`, aggregate and sort.
- `src/lib/i18n/paths.ts`
  - Build canonical/alternate URLs (DE neutral, EN under `/en/...`).

## Middleware Touchpoints (`src/middleware.ts`)

- Replace simple `detectFromAcceptLanguage()` with q-value best-match using `parseAcceptLanguage()`.
- Keep referer-based EN preference, cookie persistence (180d), session splash gate, bot handling, and exemptions (APIs, assets, `/r2-ai/**`, auth, guest tool routes).
- Headers: preserve `Content-Language` and `Vary: Cookie, Accept-Language`.

## Flags / Env

- `WELCOME_BYPASS_SPLASH` (server): when `"1"`, bypass welcome splash for first neutral visits by directly setting cookie + redirect.
- `PUBLIC_WELCOME_AUTO_DELAY_MS` (client): controls welcome auto-continue delay; default 400ms.

## Tests

- Integration (`tests/integration/routing/`):
  - q-values weighted selection (EN/DE), referer hint, bot path, `?lang=` alias, bypass flag behavior, headers (`Content-Language`, `Vary`).
- E2E (optional): neutral visit flow with and without bypass; ensure auth/tools not gated.

## Docs

- `docs/architecture/locale-middleware.md`: q-values, alias, flags, SEO tags, exemptions, bots.
- `routes.md`: document `?lang=de|en` alias.

## Rollout

- DEV default: `WELCOME_BYPASS_SPLASH=0`.
- Staging: optional temporary `WELCOME_BYPASS_SPLASH=1` smoke, then revert.
- Prod: keep defaults until product decision.
