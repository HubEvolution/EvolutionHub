---
Title: Auth & OAuth Rules
---

# Auth & OAuth Rules

## Scope

- Login/Magic Link, OAuth callbacks, session, user endpoints, settings.

## Dependencies

- `src/lib/api-middleware.ts` (withAuthApiMiddleware)
- `src/middleware.ts` (redirects, headers)

## Constraints

- Follow `.windsurf/rules/tooling-and-style.md`.
- Testing expectations per `.windsurf/rules/testing-and-ci.md` (Auth E2E suites under `test-suite-v2/src/e2e/auth/`).

## Security & Privacy

- CSRF + Same-Origin for unsafe methods.
- Cookies: `__Host-session` semantics per docs.
- Do not gate `/r2-ai/**` via auth.

## Related Codemap

- `/.windsurf/codemaps/EH __ Auth + OAuth __ Codemap v1.md`

## Documentation Reference

- `.windsurf/rules/api-and-security.md`
- `docs/architecture/auth-architecture.md`
- `docs/architecture/auth-flow.md`
- `docs/development/stytch-oauth-dev-guide.md`
