---
description: EH :: Auth + OAuth :: Codemap v1
version: 1
feature: auth
---

# EH :: Auth + OAuth :: Codemap v1

## Scope

- Auth flows (Magic Link, OAuth), session, account endpoints.

## Entry Points

- Login/Welcome pages under `src/pages/{de|en}/**` (per routing).
- Middleware-related redirects in `src/middleware.ts`.

## Primary API Modules

- `src/pages/api/user/**`
- `src/pages/api/billing/**`
- Debug panel (auth-relevant): `src/pages/api/debug/**`

## Security/Middleware

- Use `withAuthApiMiddleware` for authenticated endpoints.
- Same-origin checks and CSRF per `src/lib/api-middleware.ts`.

## Related Rules

- `.windsurf/rules/auth.md`
- `.windsurf/rules/api-and-security.md`

## Documentation

- `docs/architecture/auth-architecture.md`
- `docs/architecture/auth-flow.md`
- `docs/development/stytch-oauth-dev-guide.md`
