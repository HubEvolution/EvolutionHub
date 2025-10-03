# Bekannte API-Probleme & Verbesserungspotentiale

Bei der Implementierung und Testabdeckung der APIs wurden verschiedene Verbesserungspotentiale identifiziert, die mittel- bis langfristig behoben werden sollten.

## Auth-API-Probleme (aktueller Stand: Magic Link)

Die Passwort-Reset‑UI ist entfernt; Legacy‑Endpoints (u. a. `reset-password`, `forgot-password`) liefern 410 Gone. Aktive Flows nutzen Magic Link (`POST /api/auth/magic/request`, `GET /api/auth/callback`). Relevante Punkte:

- **Fehlerklassifizierung präzisieren**
  - Für Magic‑Link‑Requests und Callback spezifische Fehlercodes/logging nutzen (z. B. `invalid_email`, `rate_limited`, `token_invalid`, `token_expired`).
  - Einheitliches JSON‑Schema `{ success: false, error: { type, message, details? } }` sicherstellen.

- **User‑Enumeration vermeiden**
  - Bei `POST /api/auth/magic/request` nie preisgeben, ob eine E‑Mail existiert. Immer Erfolgsmeldung im gleichen Format zurückgeben; Fehler (Rate‑Limit, CSRF) nur generisch.

- **Redirect‑Kohärenz**
  - Einheitlich Magic‑Link‑Flow verwenden (kein `/auth/*` UI‑Login). Weiterleitungen über `post_auth_redirect` (HttpOnly) steuern; Query‑`r` hat nachrangige Priorität.

- **E‑Mail‑Versand/Provider-Fehler robust behandeln**
  - Provider‑Antworten mappen (429 → `rate_limited`, 4xx → `validation_error`, 5xx → `server_error`).
  - In DEV/CI deterministischen Fake‑Modus zulassen (Flag), in Live deaktivieren.

### 4. Probleme beim Email-Versand

Der E-Mail-Versand bei Passwort-Reset-Anfragen scheint nicht robust implementiert zu sein:

- **Problem**: Selbst bei korrekt konfiguriertem `resend`-API-Key gibt die `forgot-password.ts`-API häufig einen generischen Fehler zurück
- **Verbesserung**: Bessere Fehlerbehandlung und spezifischere Fehlermeldungen für E-Mail-Versandfehler

## API-Resilienz-Verbesserungen

### 1. Konsistente try/catch-Blöcke

try {
  // API-Logik
} catch (error) {
  // Map auf internes Schema
  return jsonGoneOrError({ type: mapProviderError(error), message: 'Request failed' });
}

- `invalid_input`: Bei Validierungsfehlern
- `not_found`: Bei nicht gefundenen Ressourcen
- `forbidden`: Bei fehlenden Berechtigungen
- `token_expired`: Bei abgelaufenen Tokens (Callback)
- `token_invalid`: Bei ungültigen Tokens (Callback)

### 3. Zentrales Fehlerhandling

Empfehlung: Ein zentrales Fehlerbehandlungsmodul implementieren:

```typescript
// src/lib/error-handler.ts
export function handleApiError(context: any, error: any, path: string): Response {
  console.error(`API error in ${path}:`, error);

  // Spezifische Fehlertypen erkennen und entsprechend behandeln
  if (error instanceof ValidationError) {
    return context.redirect(`${path}?error=ValidationError`, 302);
  }

  // Generischer Fallback
  return context.redirect(`${path}?error=UnknownError`, 302);
}
```

Diese Verbesserungen würden nicht nur die Codebasis robuster machen, sondern auch die Benutzererfahrung verbessern und die Sicherheit erhöhen.
