# Authentifizierungsflow

Diese Dokumentation beschreibt den vollständigen Authentifizierungsflow im Evolution Hub System, einschließlich der Benutzerregistrierung, Anmeldung, Sitzungsverwaltung und Sicherheitsmaßnahmen.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Authentifizierungskomponenten](#authentifizierungskomponenten)
3. [Registrierungsflow](#registrierungsflow)
4. [Anmeldeflow](#anmeldeflow)
5. [Sitzungsverwaltung](#sitzungsverwaltung) <!-- markdownlint-disable-line MD051 -->
6. [Passwort-Reset-Flow](#passwort-reset-flow)
7. [Abmeldeflow](#abmeldeflow)
8. [Sicherheitsmaßnahmen](#sicherheitsmaßnahmen)
9. [Fehlerbehandlung](#fehlerbehandlung)
10. [Middleware-Integration](#middleware-integration)

---

## Überblick

Das Evolution Hub Authentifizierungssystem verwendet serverseitige Sitzungen mit einem sicheren HttpOnly-Cookie (`session_id`) und implementiert Best Practices für Webanwendungssicherheit. Es werden keine JWTs verwendet.

...

## Sicherheitsmaßnahmen

- **Rate-Limiting**: Schutz vor Brute-Force/Abuse auf allen Auth-APIs und global in der Middleware.
- **Security Headers**: Strenge Standard-Header inkl. CSP (in Produktion strikt), HSTS, Frame-/Referrer-Policies.
- **CSRF/Origin-Checks**: CSRF-Token/Origin-Validierung an state-changing Endpunkten.
- **Cookie-Härtung**: `session_id` als HttpOnly, SameSite=Lax, Secure (prod), kurze Standardlebensdauer.
- **Audit-Logging**: Relevante Ereignisse (Login/Logout, Passwort-Reset) werden protokolliert.

---

## Fehlerbehandlung

- **Kanonischer Code: `InvalidCredentials`** für `ServiceErrorType.AUTHENTICATION` (z. B. falsche Login-Daten).
- **Passwort-Reset:** Ungültige oder abgelaufene Tokens führen zu `InvalidInput`. Das übermittelte
  `token` bleibt in der Redirect-URL erhalten (Kontext für die UI/Toasts).
- **Rate-Limiting:** `TooManyRequests`.
- **Unerwartete Fehler:** `ServerError`.
- **Spezialfall E-Mail-Verifizierung:** Wenn der Service mit `details.reason = 'email_not_verified'`
  wirft, leitet `handleAuthError()` locale-aware auf `/verify-email` um und hängt – falls vorhanden –
  `email=<adresse>` an. Beispiel: `/verify-email?error=EmailNotVerified&email=user%40example.com`.

Technische Details

- Zentraler Handler: `src/lib/error-handler.ts` (`getErrorCode()`, `handleAuthError()`).
- Redirect-Basis-URL ist locale-aware, z. B. `'/en/login'` oder `'/en/reset-password'`.
- Kontext-Parameter (z. B. `token`) werden durchgereicht und in die Redirect-URL übernommen.
- Die Reihenfolge von Query-Parametern ist unerheblich; Tests prüfen auf Vorhandensein, nicht auf
  die exakte Reihenfolge.

Beispiele

- Login (falsches Passwort): `/en/login?error=InvalidCredentials`.
- Reset-Password (ungültiges Token `abc`): `/en/reset-password?token=abc&error=InvalidInput`.
- E-Mail nicht verifiziert: `/verify-email?error=EmailNotVerified&email=user%40example.com`.

Referenzen

- `src/lib/error-handler.ts`
- `src/pages/api/auth/login.ts`
- `src/pages/api/auth/reset-password.ts`

---

## Middleware-Integration

Die Authentifizierung ist in die Middleware-Pipeline integriert und wird für alle geschützten Routen automatisch angewendet:

### Middleware-Konfiguration

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { validateSession } from '@/lib/auth-v2';

export const onRequest = defineMiddleware(async (context, next) => {
  // Session-ID aus Cookie lesen
  const sessionId = context.cookies.get('session_id')?.value ?? null;

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
    // Benutzer muss bereits authentifiziert sein
    if (!request.user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required'
      }), { status: 401 });
    }
    
    // Rollen überprüfen
    const hasRequiredRole = roles.some(role => request.user.roles.includes(role));
    
    if (!hasRequiredRole) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      }), { status: 403 });
    }
    
    // Anfrage mit ausreichenden Berechtigungen weiterleiten
    return next();
  };
}
```

### Verwendung in API-Routen

```typescript
// src/pages/api/admin/users.ts
import { requireRole } from '../../../lib/auth';

// Nur für Administratoren zugänglich
export const all = [requireRole(['admin'])];

export async function GET({ request, env }) {
  // Implementierung der Admin-API
  // ...
}
