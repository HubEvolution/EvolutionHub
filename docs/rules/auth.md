# Auth & OAuth Rules

## Zweck

Sichere Auth‑Flows (Magic Link/OAuth), konsistente Middleware‑Nutzung, CSRF/Same‑Origin und Cookie‑Semantik nach Baseline.

## Muss

- `withAuthApiMiddleware` für geschützte APIs, `withRedirectMiddleware` für Redirect‑Flows (z. B. OAuth Callback).
- Unsafe Methods (POST/PUT/PATCH/DELETE): Same‑Origin Pflicht; bei sensiblen Endpunkten Double‑Submit CSRF (`X-CSRF-Token` == Cookie `csrf_token`).
- Session‑Cookie: `__Host-session` Zielzustand (HttpOnly, Secure, SameSite=Strict, Path=/). Fallback `session_id` (SameSite=Lax) nur legacy.
- Observability: Auth‑Callbacks setzen `X-Stytch-Request-Id` in Responses (Logging/Korrelation).
- PKCE (flag `STYTCH_PKCE`):
  - `POST /api/auth/magic/request` setzt HttpOnly Cookie `pkce_verifier` (SameSite=Lax, TTL 10min) und sendet `pkce_code_challenge` an Provider.
  - `GET /api/auth/callback` muss `pkce_code_verifier` vorlegen; Cookie wird danach gelöscht.
  - Mobile Webviews: PKCE deaktivieren (Kontextwechsel‑Risiko).
- `/r2-ai/**` darf nie über Auth/Middleware gegatet werden.

## Sollte

- Redirect‑Antworten über `withRedirectMiddleware` (Rate‑Limit + Security‑Header ohne JSON‑Schemazwang).
- Einheitliche 401‑Fehlerform: `createApiError('auth_error', 'Unauthorized')` (bereits umgesetzt in Middleware).

## Nicht

- Keine manuellen 405/401‑Antworten ohne Helper.
- Keine Business‑Logik in 410‑Stubs.

## Deprecated Endpoints → 410

- Endpunkte (z. B. `change-password`, `forgot-password`, `reset-password`, `logout`, `verify-email`) als 410‑Stubs:
  - Hauptmethode: HTML‑410 (z. B. POST/GET je Endpoint).
  - Andere Methoden: JSON‑410 mit `details.Allow` (z. B. 'POST' | 'GET' | 'GET, POST').
  - `withRedirectMiddleware` nur für unsichere Methoden.

## Checkliste

- [ ] Geschützte APIs nutzen `withAuthApiMiddleware`? Redirects nutzen `withRedirectMiddleware`?
- [ ] Same‑Origin/CSRF aktiv für unsafe Methods? Double‑Submit wo sensibel?
- [ ] `__Host-session` Semantik erfüllt (Path=/, Secure, HttpOnly, Strict)?
- [ ] PKCE‑Pfad korrekt (Cookie gesetzt/gelöscht, Verifier/Challenge)?
- [ ] 410‑Stubs korrekt (Hauptmethode HTML‑410; andere JSON‑410 mit Allow)?
- [ ] `/r2-ai/**` öffentlich?

## Code‑Anker

- `src/lib/api-middleware.ts`
- `src/middleware.ts`
- `src/pages/api/auth/**`

## CI/Gates

- `npm run test:e2e -- src/e2e/auth/` (v2)
- `npm run openapi:validate`
- `npm run lint`

## Referenzen

- Global Rules
- API & Security Rules
- `.windsurf/rules/auth.md`

## Changelog

- 2025‑10‑31: PKCE/410‑Stubs/401‑Shape präzisiert; `/r2-ai/**` offen bekräftigt.
