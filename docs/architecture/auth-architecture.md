# Authentifizierungs-Architektur

Stand: 2025-09-11 – Post-Refactoring Phase 1. Diese Dokumentation fasst den aktuellen Authentifizierungsflow, die Migrationshistorie und Sicherheitsmaßnahmen zusammen. Für Middleware-Details siehe [api-middleware-inventory.md](api-middleware-inventory.md). Historische ADR: [adrs/deprecated/0001-jwt-authentication.md](adrs/deprecated/0001-jwt-authentication.md) (deprecated zugunsten serverseitiger Sessions).

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Aktueller Authentifizierungsflow](#aktueller-authentifizierungsflow)
3. [Sicherheitsmaßnahmen](#sicherheitsmaßnahmen)
4. [Fehlerbehandlung](#fehlerbehandlung)
5. [Middleware-Integration](#middleware-integration)
6. [Migrationshistorie](#migrationshistorie)
7. [Endpunkte](#endpunkte)
8. [Datenfluss-Diagramm](#datenfluss-diagramm)
9. [Phasenplan und Checkliste](#phasenplan-und-checkliste)
10. [Environments und Secrets](#environments-und-secrets)
11. [Testing](#testing)

---

## Überblick

Das Evolution Hub Authentifizierungssystem verwendet serverseitige Sitzungen mit einem sicheren HttpOnly-Cookie (`__Host-session`, Secure, SameSite=Strict, Path=/) und implementiert Best Practices für Webanwendungssicherheit. Es werden keine JWTs verwendet. Das System ist auf Stytch Magic Link migriert, ergänzt um Social OAuth (Google, GitHub, Apple, Microsoft). Entfernt (410 Gone) Passwort-Flows sind entfernt und liefern 410 Gone.

Der Flow basiert auf Redirects:

- `POST /api/auth/magic/request` (JSON)
- `GET /api/auth/callback` (setzt Session und leitet weiter)

Feature-Flag: `AUTH_PROVIDER=legacy|stytch` für Rollout/Rollback. Domains: prod (`https://hub-evolution.com`), staging (`https://staging.hub-evolution.com`), test (`https://test.hub-evolution.com`), dev (`http://localhost:8787`).

## Aktueller Authentifizierungsflow

### Magic Link

1. **POST `/api/auth/magic/request`**
   - Body: `{ email, r?, name?, username? }`
   - Checks: Rate-Limit (IP+email), optional Turnstile, Redirect-Whitelist (`r`), CORS eigene Domains.
   - Aktion: Stytch Magic Link anfordern; Transaktions-ID loggen (ohne PII).
   - Optionales Profil (bei Registrierung): `name` (2–50), `username` (3–30, `/^[a-zA-Z0-9_]+$/`). Kurzlebiges HttpOnly-Cookie `post_auth_profile` (10 Min, SameSite=Lax) setzen.

2. **GET `/api/auth/callback`**
   - Query: `token=...`, optional `state`
   - Aktion: Token mit Stytch validieren, Session erzeugen, Cookie setzen, Redirect auf erlaubtes Ziel.
   - Profil-Cookie: Auswerten für Neuanmeldungen; Username-Kollision → Suffix. `post_auth_redirect` hat Vorrang vor Query-`r`.

### Logout

- **POST `/api/auth/logout`**: Session invalidieren (Server), Cookie löschen, Redirect auf Startseite/Login.

### Social OAuth

- **GET `/api/auth/oauth/:provider/start`**: Redirect zu Provider.
- **GET `/api/auth/oauth/:provider/callback`**: Code-Exchange bei Stytch, Session erzeugen, Redirect.
- Account-Linking: E-Mail-Abgleich; optional expliziter Flow.

### Redirect- und Locale-Policy (aktualisiert)

- **Ziel-Priorität (Callback):**
  1. `post_auth_redirect` (HttpOnly-Cookie; nur relative gleiche-Origin-Pfade)
  2. Query `r` (nur relativ)
  3. Fallback `AUTH_REDIRECT` (Standard: `/dashboard`)

- **Locale-Ermittlung:**
  - Bevorzugt `post_auth_locale` (kurzlebiger Cookie), danach `pref_locale` (Middleware‑Cookie), andernfalls aus Pfadpräfix.
  - Wenn das Ziel nicht lokalisiert ist, wird es anhand der ermittelten Locale gemappt (`/` → `/en/` etc.).

- **Welcome / Splash:**
  - Ist beim Callback keine Locale bekannt (weder Pfadpräfix noch Cookies), erfolgt einmalig ein Redirect zu `/welcome?next=…`.
  - Die Seite `src/pages/welcome.astro` löst eine kurze Auto‑Weiterleitung basierend auf `navigator.language` aus (Opt‑out: `?noauto=1`).
  - `/_welcome` ist per Meta und Header `noindex` und damit ausgeschlossen.

- **Erst-Login ohne Profildaten:**
  - Neue Nutzer ohne übermittelte Profildaten werden auf die locale‑spezifische `/<locale>/welcome-profile?next=…` geleitet.
  - Die Locale wird dabei anhand `post_auth_locale`/`pref_locale` ermittelt; Fallback ist das Pfadpräfix des Ziels.

- **Hinweis (Entfernung BroadcastChannel):**
  - Der frühere `/auth/notify` BroadcastChannel‑Zwischenschritt wurde entfernt. Der Callback leitet jetzt direkt weiter; Login‑Seiten lauschen nicht mehr darauf.

## Sicherheitsmaßnahmen

- **Rate-Limiting**: Schutz vor Brute-Force/Abuse auf Auth-APIs und global in der Middleware (siehe [api-middleware-inventory.md](api-middleware-inventory.md)).
- **Security Headers**: Strenge Standard-Header inkl. CSP (in Produktion strikt), HSTS, Frame-/Referrer-Policies.
- **CSRF/Origin-Checks**: CSRF-Token/Origin-Validierung an state-changing Endpunkten (Double-Submit-CSRF, same-origin `Origin`).
- **Cookie-Härtung**: `__Host-session` als HttpOnly, Secure, SameSite=Strict, Path=/, serverseitige Lebensdauersteuerung.
- **Audit-Logging**: Relevante Ereignisse (Login/Logout, Passwort-Reset) protokollieren (ohne PII).
- **CORS**: Nur eigene Origins (prod/staging/test/dev).
- **CSP**: OAuth-Redirects/Popups nicht blockieren; Nonce aktiv.
- **Turnstile**: Optional in Prod erzwingen.
- **PKCE (feature‑flagged)**: Wenn `STYTCH_PKCE` aktiviert ist, setzt `POST /api/auth/magic/request` einen kurzlebigen HttpOnly‑Cookie `pkce_verifier` (SameSite=Lax, 10 Min) und sendet einen `pkce_code_challenge` an Stytch. `GET /api/auth/callback` muss dann den `pkce_code_verifier` übergeben; der Cookie wird danach gelöscht. Für Mobile‑Webviews deaktivieren, da Context‑Switch den Verifier verhindern kann.

## Fehlerbehandlung

- **Kanonischer Code**: `InvalidCredentials` für `ServiceErrorType.AUTHENTICATION`.
- **Rate-Limiting**: `TooManyRequests`.
- **Unerwartete Fehler**: `ServerError`.
- **E-Mail-Verifizierung**: Bei `details.reason = 'email_not_verified'` locale-aware Redirect auf `/verify-email?email=<adresse>`.
- Zentraler Handler: `src/lib/error-handler.ts` (`getErrorCode()`, `handleAuthError()`).
- Redirect-Basis-URL locale-aware (z.B. `'/en/login'`). Kontext-Parameter (z.B. `token`) durchreichen.

Beispiele:

- Magic Link Request: `{ success: true }`.
- Callback: Redirect auf `/dashboard`.
- E-Mail nicht verifiziert: `/verify-email?error=EmailNotVerified&email=user%40example.com`.

Referenzen:

- `src/lib/error-handler.ts`
- `src/pages/api/auth/magic/request.ts`
- `src/pages/api/auth/callback.ts`

## Middleware-Integration

Die Authentifizierung ist in die Middleware-Pipeline integriert (`src/middleware.ts`):

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { validateSession } from '@/lib/auth-v2';

export const onRequest = defineMiddleware(async (context, next) => {
  // Session-ID aus Cookie lesen
  const sessionId = context.cookies.get('__Host-session')?.value ?? null;

  if (!sessionId || !context.locals?.runtime) {
    context.locals.session = null;
    context.locals.user = null;
    return next();
  }

  try {
    const { session, user } = await validateSession(context.locals.runtime.env.DB, sessionId);
    context.locals.session = session;
    context.locals.user = user;
  } catch {
    context.locals.session = null;
    context.locals.user = null;
  }

  return next();
});
```

### Rollenbasierte Zugriffskontrolle

```typescript
// src/lib/auth.ts
export function requireRole(roles) {
  return async ({ request, env, next }) => {
    if (!request.user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
        { status: 401 }
      );
    }

    const hasRequiredRole = roles.some((role) => request.user.roles.includes(role));

    if (!hasRequiredRole) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        }),
        { status: 403 }
      );
    }

    return next();
  };
}
```

Verwendung in API-Routen: `export const all = [requireRole(['admin'])];`.

## Migrationshistorie

Die Migration von Entfernt (410 Gone) (E-Mail/Passwort mit Resend) zu Stytch Magic Link + Social erfolgte schrittweise:

- **Ziel**: Ersetze Passwort-Auth durch Magic Link; minimale UI-Änderungen.
- **Status**: Phase 1 (Root-Workspace-Aliases) abgeschlossen 2025-09-04.
- **Entfernt (410 Gone)-Endpunkte**: 410 Gone (z.B. `/api/auth/login`, `/register`, `/forgot-password`).
- **Feature-Flag**: `AUTH_PROVIDER` steuert Entfernt (410 Gone) vs. Stytch; Guards in Middleware/Routen.
- **Multi-Domain-Entscheidung**: Ein Stytch-Projekt mit whitelisten Redirect-URIs (Option A) für Einfachheit. Siehe ADR [deprecated/0001-jwt-authentication.md](adrs/deprecated/0001-jwt-authentication.md) für Übergang von JWT zu Sessions.

Protokoll:

- 2025-09-03: Initiales Konzept, Entfernt (410 Gone)-Tests (410 Gone).
- 2025-09-08: UX-Verbesserungen (Cooldown, BroadcastChannel).
- 2025-09-04: HEAD-Methoden-Tests, Workspace-Phase 1 abgeschlossen.
- 2025-09-05: Login-Endpoint verifiziert (historisch).

## Endpunkte

- **Magic Link**: `/api/auth/magic/request` (POST), `/api/auth/callback` (GET).
  - Wenn `STYTCH_PKCE=1`: Request setzt `pkce_verifier`; Callback übermittelt `pkce_code_verifier` und antwortet zusätzlich mit `X-Stytch-Request-Id` zur Support‑Korrelation.
- **Logout**: `/api/auth/logout` (POST).
- **OAuth**: `/api/auth/oauth/:provider/start` (GET), `/api/auth/oauth/:provider/callback` (GET).
- Entfernt (410 Gone): 410 Gone mit JSON/HTML, Cache-Control: no-store.

Sicherheit: Rate-Limits, Turnstile (Prod), CSRF für unsichere Methoden.

## Datenfluss-Diagramm

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Stytch
    participant DB
    participant Middleware

    Client->>API: POST /api/auth/magic/request {email}
    API->>Middleware: Rate-Limit & CSRF-Check
    Middleware-->>API: Valid
    API->>Stytch: Magic Link anfordern
    Stytch->>Client: E-Mail mit Link
    Client->>API: GET /api/auth/callback?token=...
    API->>Stytch: Token validieren
    Stytch->>API: Valid
    API->>DB: Session erzeugen
    DB->>API: Session-ID
    API->>Client: Set-Cookie &__Host-session; Redirect /dashboard
```

## Phasenplan und Checkliste

### Umsetzungs-Checkliste

- [x] Edge-kompatibler Stytch-Fetch-Wrapper (`src/lib/stytch.ts`).
- [x] MVP Magic-Link Endpoints (`request.ts`, `callback.ts`).
- [x] UI-Update (Login-Seiten mit Magic-Link-Formular).
- [x] Feature-Flag & Secrets.
- [ ] Turnstile (Prod).
- [ ] Sicherheits-Entscheidungen (Redirect-Policy).
- [x] Tests (Integration, Guards, Flag-Wechsel).
- [ ] CI (`astro check`, Vitest Workspace, Playwright).
- [ ] Cleanup (Entfernt (410 Gone) entfernen, Doku aktualisieren).

### Nächste Schritte

1. Tests erweitern (Happy-/Error-Paths, r-Cookie).
2. CI aktualisieren (Coverage-Gates).
3. Staging/Prod vorbereiten (Secrets, Smoke-Tests).

## Environments und Secrets

Envs: production, staging, testing, development.

Benötigte Secrets (Wrangler):

- `AUTH_PROVIDER` (stytch)
- `AUTH_REDIRECT` (/dashboard)
- `STYTCH_PROJECT_ID`, `STYTCH_SECRET`
- `E2E_FAKE_STYTCH` (Dev/CI: "1")
- `STYTCH_TEST_EMAIL` (optional)

Redirect-URIs (Stytch Whitelist):

- Dev: `http://127.0.0.1:8787/api/auth/callback`
- Testing: `https://test.hub-evolution.com/api/auth/callback`
- Staging: `https://staging.hub-evolution.com/api/auth/callback`
- Production: `https://hub-evolution.com/api/auth/callback`

Stytch Dashboard: TEST-Umgebung für Dev/Testing/Staging; LIVE für Prod.

## Testing

Die Authentifizierung wird durch schrittweise Tests validiert, inkl. Stytch-Wrapper, Endpunkte und Flows. Ziel: >70% Coverage, CI-Integration (Vitest, Playwright gegen Wrangler mit TEST_BASE_URL). ADR-Referenz: Tests decken Übergang von JWT zu Sessions ab (siehe [deprecated/0001-jwt-authentication.md](adrs/deprecated/0001-jwt-authentication.md)).

### Unit-Tests (Vitest)

- Tests für Stytch-Wrapper: Mock API-Calls, prüfe validateSession (Erfolg/Invalid/Expired).
- Coverage: Kritische Pfade (Token-Validierung, Session-Erstellung).

```typescript
// tests/unit/lib/stytch.test.ts
import { describe, it, expect, vi } from 'vitest';
import { validateSession } from '@/lib/auth-v2';

describe('Stytch Wrapper', () => {
  const mockDB = vi.fn();
  const mockFetch = vi.fn();

  it('should validate valid session', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => ({ session }) });
    const result = await validateSession(mockDB, 'valid-id');
    expect(result.user).toBeDefined();
  });

  it('should reject invalid token', async () => {
    mockFetch.mockRejectedValue(new Error('Invalid'));
    await expect(validateSession(mockDB, 'invalid')).rejects.toThrow(AuthenticationError);
  });
});
```

### Integrationstests (Vitest)

- Endpunkte: Magic-Request → Callback (Mock Stytch, echte DB), Rate-Limit/CSRF-Integration.
- Guards: Feature-Flag-Wechsel (legacy → stytch), Middleware-Session-Setzung.

```typescript
// tests/integration/auth.test.ts
describe('Auth Integration', () => {
  it('magic link flow', async () => {
    const requestRes = await fetch(`${TEST_BASE_URL}/api/auth/magic/request`, { method: 'POST', body: JSON.stringify({ email: 'test@example.com' }) });
    expect(requestRes.status).toBe(200);

    const callbackRes = await fetch(`${TEST_BASE_URL}/api/auth/callback?token=mock-token`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.get('Set-Cookie')).toContain('__Host-session');
  });

  it('CSRF in magic request', async () => {
    const res = await fetch(..., { headers: { 'X-CSRF-Token': 'invalid' } });
    expect(res.status).toBe(403);
  });
});
```

### E2E-Tests (Playwright)

- Flows: Magic-Link (Email-Simulation via Fake-Modus E2E_FAKE_STYTCH=1), OAuth-Redirect, Logout → Session-Clear.
- Gegen Wrangler (echte Bindings), locale-aware Redirects, Accessibility (WCAG AA).
- Specs: test-suite-v2/src/e2e/auth/magic-link-flow.spec.ts – Request → Email → Callback → Dashboard; Error-Paths (Invalid Token → Error-Page).
- Zusätzlich: Multi-Browser (Chrome/Firefox), Mobile, Post-Deploy Smoke (BASE_URL).
- CI: Automatisiert, Coverage-Gates, Vulnerability-Scans (npm audit).
- Einschränkungen: Echt-Stytch in Prod-Tests vermeiden (Fake-Modus); Workaround: Env-Overrides.
