---
trigger: always_on
---

# Auth & OAuth Rules

## Zweck

Sichere Auth‑Flows (Magic Link/OAuth), konsistente Middleware‑Nutzung, CSRF/Same‑Origin und Cookie‑Semantik nach Baseline.

## Muss

- [withAuthApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:478:0-513:1) für geschützte APIs, [withRedirectMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:515:0-568:1) für Redirect‑Flows (z. B. OAuth Callback).
- Unsafe Methods (POST/PUT/PATCH/DELETE): Same‑Origin Pflicht; Double‑Submit CSRF (`X-CSRF-Token` == Cookie `csrf_token`).
- Session‑Cookie: `__Host-session` Zielzustand (HttpOnly, Secure, SameSite=Strict, Path=/). Fallback `session_id` (SameSite=Lax) nur legacy.
- Observability: Auth‑Endpoints (Magic Request und Callbacks (Magic Link/OAuth)) setzen `X-Stytch-Request-Id` in Responses (Korrelation/Debuggability). Beim Magic‑Request wird der Header sowohl bei JSON‑ als auch bei Redirect‑Antworten gesetzt.
- PKCE (flag `STYTCH_PKCE`):
  - `POST /api/auth/magic/request` setzt HttpOnly Cookie `pkce_verifier` (SameSite=Lax, TTL 10min) und sendet `pkce_code_challenge` an Provider.
  - `GET /api/auth/callback` muss `pkce_code_verifier` vorlegen; Cookie wird danach gelöscht.
  - Mobile Webviews: PKCE deaktivieren (Kontextwechsel‑Risiko).
- `/r2-ai/**` darf nie über Auth/Middleware gegatet werden.

## Sollte

- Redirect‑Antworten über [withRedirectMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:515:0-568:1) (Rate‑Limit + Security‑Header ohne JSON‑Schemazwang).
- Einheitliche 401‑Fehlerform: [createApiError('auth_error', 'Unauthorized')](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:302:0-328:1) (bereits umgesetzt in Middleware).

## Nicht

- Keine manuellen 405/401‑Antworten ohne Helper.
- Keine Business‑Logik in 410‑Stubs.

## Deprecated Endpoints → 410

- Endpunkte (z. B. `change-password`, `forgot-password`, `reset-password`, `logout`, `verify-email`) als 410‑Stubs:
  - Hauptmethode: HTML‑410 (z. B. POST/GET je Endpoint).
  - Andere Methoden: JSON‑410 mit `details.Allow` (z. B. 'POST' | 'GET' | 'GET, POST').
  - [withRedirectMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:515:0-568:1) für unsichere Methoden anwenden (Same‑Origin/CSRF greifen, Response‑Shape bleibt erhalten).

## Checkliste

- [ ] Geschützte APIs nutzen [withAuthApiMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:478:0-513:1)? Redirects nutzen [withRedirectMiddleware](cci:1://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:515:0-568:1)?
- [ ] Same‑Origin/CSRF aktiv für unsafe Methods? Double‑Submit wo sensibel?
- [ ] `__Host-session` Semantik erfüllt (Path=/, Secure, HttpOnly, Strict)?
- [ ] PKCE‑Pfad korrekt (Cookie gesetzt/gelöscht, Verifier/Challenge)?
- [ ] 410‑Stubs korrekt (Hauptmethode HTML‑410; andere JSON‑410 mit Allow; unsafe Methoden via Redirect‑Middleware)?
- [ ] `/r2-ai/**` öffentlich?

## Code‑Anker

- [src/lib/api-middleware.ts](cci:7://file:///Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/src/lib/api-middleware.ts:0:0-0:0)
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

- 2025‑11‑13: Observability ausgeweitet: Magic‑Request setzt `X‑Stytch‑Request‑Id` (JSON + Redirect).
- 2025‑10‑31: PKCE/410‑Stubs/401‑Shape präzisiert; `/r2-ai/**` offen bekräftigt.
