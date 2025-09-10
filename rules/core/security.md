---
category: core
version: 1.0
applies_to: global
rules:
  - Speichere niemals Zugangsdaten im Code
  - Verwende Umgebungsvariablen für sensible Informationen
  - Implementiere Content Security Policy (CSP)
  - Verwende sichere Cookie-Einstellungen (HttpOnly, Secure, SameSite)
  - Nutze `.env.local` für lokale Secrets und `.gitignore` für Ausschluss
  - Implementiere ordnungsgemäße Authentifizierung und Autorisierung
  - Bereinige alle Benutzereingaben
  - Verwende HTTPS für alle Verbindungen
  - Aktualisiere regelmäßig Abhängigkeiten für Sicherheits-Patches
  - Wende das Prinzip der geringsten Berechtigung an
  - Implementiere ordnungsgemäße Fehlerbehandlung ohne Preisgabe sensibler Informationen
  - Registrierung nutzt Double-Opt-In; unverifizierte Nutzer erhalten bis zur Verifizierung keine Session
  - Middleware gated unverifizierte Nutzer: locale-aware Redirect auf `/<locale>/verify-email?email=…`; Logging redacts sensitive Felder
  - Erzwinge Double-Submit-CSRF für unsichere Methoden (POST/PUT/PATCH/DELETE)
  - Header `X-CSRF-Token` MUSS dem Cookie `csrf_token` entsprechen
  - Frontend: `fetch` mit `credentials: 'same-origin'` und gesetztem CSRF-Header
  - Allowed Origins: per ENV definieren; Request-Origin nur whitelisten, wenn explizit erlaubt; Fail-Closed-Default
  - Route-spezifische Rate-Limits: aiGenerate: 15/Minute, auth: 10/Minute, sensitiveAction: 5/Stunde, api: 30/Minute
  - 405-Methoden: standardisiert behandeln (z. B. `createMethodNotAllowed`)
  - Verstöße loggen (z. B. `SUSPICIOUS_ACTIVITY`, RateLimitExceeded) mit minimalen PII
---

### Security & Compliance

– Speichere niemals Zugangsdaten im Code
– Verwende Umgebungsvariablen für sensible Informationen
– Implementiere Content Security Policy (CSP)
– Verwende sichere Cookie-Einstellungen (HttpOnly, Secure, SameSite)
– Nutze `.env.local` für lokale Secrets und `.gitignore` für Ausschluss
– Implementiere ordnungsgemäße Authentifizierung und Autorisierung
– Bereinige alle Benutzereingaben
– Verwende HTTPS für alle Verbindungen
– Aktualisiere regelmäßig Abhängigkeiten für Sicherheits-Patches
– Wende das Prinzip der geringsten Berechtigung an
– Implementiere ordnungsgemäße Fehlerbehandlung ohne Preisgabe sensibler Informationen
– Registrierung nutzt Double-Opt-In; unverifizierte Nutzer erhalten bis zur Verifizierung keine Session
– Middleware gated unverifizierte Nutzer: locale-aware Redirect auf `/<locale>/verify-email?email=…`; Logging redacts sensitive Felder
– Erzwinge Double-Submit-CSRF für unsichere Methoden (POST/PUT/PATCH/DELETE)
– Header `X-CSRF-Token` MUSS dem Cookie `csrf_token` entsprechen
– Frontend: `fetch` mit `credentials: 'same-origin'` und gesetztem CSRF-Header
– Allowed Origins: per ENV definieren; Request-Origin nur whitelisten, wenn explizit erlaubt; Fail-Closed-Default
– Route-spezifische Rate-Limits dokumentieren und durchsetzen: aiGenerate: 15/Minute, auth: 10/Minute, sensitiveAction: 5/Stunde, api: 30/Minute
– 405-Methoden: standardisiert behandeln (z. B. `createMethodNotAllowed`)
– Verstöße loggen (z. B. `SUSPICIOUS_ACTIVITY`, RateLimitExceeded) mit minimalen PII