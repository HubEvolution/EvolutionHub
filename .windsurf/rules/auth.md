---
trigger: always_on
priority: 60
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
- PKCE (feature-flagged): When `STYTCH_PKCE` is enabled, `POST /api/auth/magic/request` sets a short‑lived HttpOnly cookie `pkce_verifier` (SameSite=Lax, TTL 10 min) and includes a `pkce_code_challenge` in the Stytch request. `GET /api/auth/callback` must present `pkce_code_verifier`; the cookie is deleted after consumption. Disable PKCE for mobile webviews to avoid context-switch failures.
- Observability: Auth callbacks (Magic Link and OAuth) set `X-Stytch-Request-Id` on responses to aid provider support correlation.

## Related Codemap

- `/.windsurf/codemaps/EH __ Auth + OAuth __ Codemap v1.md`

## Documentation Reference

- `.windsurf/rules/api-and-security.md`
- `docs/architecture/auth-architecture.md`
- `docs/architecture/auth-flow.md`
- `docs/development/stytch-oauth-dev-guide.md`
