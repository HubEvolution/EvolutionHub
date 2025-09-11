# Auth API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Authentifizierung und Autorisierung im Evolution Hub.

## Security-Features

Alle Auth-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (`standardApiLimiter`)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle Authentifizierungsereignisse werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert
* **Anti-User-Enumeration:** Gleiches Redirect-Verhalten unabhängig vom Benutzerexistenz-Status

Hinweis: Die Auth-Endpunkte sind formularbasiert und antworten mit Redirects statt JSON. Bei Erfolg wird ein HttpOnly-Cookie `session_id` gesetzt –
mit Ausnahme der Registrierung (Double-Opt-In), die keine Session erstellt und stattdessen auf `/verify-email` weiterleitet.
Hinweis: Die frühere Login-Variante `login-v2` wurde entfernt. Verwende ausschließlich den kanonischen Login-Endpunkt (Service-Layer, zentrale Fehlerbehandlung, konsistente Redirects).

## Endpunkte (kanonisch)

* Endpunkte (Stytch Magic Link):
  * `POST /api/auth/magic/request` — Fordert einen Magic Link an (JSON `{ success: true, data: { sent: true } }`)
  * `GET  /api/auth/callback` — Callback, setzt Session‑Cookies und leitet direkt zum Ziel weiter
  * `GET|POST /api/user/logout` — weiterhin aktiv (v2 bevorzugt)
* Eigenschaften:
  * Stytch‑Integration in `src/lib/stytch.ts` (Fake‑Modus via `E2E_FAKE_STYTCH` für Tests)
  * Zentrale Fehlerbehandlung/Headers: `src/lib/api-middleware.ts`, `src/lib/response-helpers.ts`
  * Session‑Cookies Ziel: `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/); Legacy `session_id` kann parallel vorkommen
* Verhalten:
  * `magic/request` antwortet JSON (kein Redirect)
  * `callback` antwortet mit direktem Redirect zum Ziel (ggf. lokalisiert)

---

> Hinweis: Alle legacy Passwort-basierten Endpunkte (login/register/forgot/reset) wurden entfernt. Das System verwendet ausschließlich Stytch Magic Link (`/api/auth/magic/request` → `/api/auth/callback`).

## 5. Logout

Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie.

### Abmelden

* **HTTP-Methoden:** `GET`, `POST`
* **Pfade:**
  * `/api/user/logout`
  * `/api/user/logout-v2`
* **Handler-Funktion:** GET/POST-Handler in `user/logout.ts` bzw. `user/logout-v2.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging

### Erfolgreiche Antwort (Logout) (`302 Redirect`)

```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: session_id=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0
```

### Fehlerhafte Antwort (Logout) (`302 Redirect`)

Beispiele:

```http
# v1: Rate-Limit überschritten
HTTP/1.1 302 Found
Location: /login?error=rate_limit
```

```http
# v2: Rate-Limit überschritten
HTTP/1.1 302 Found
Location: /login?error=TooManyRequests
```

---

## 6. Sicherheitsrichtlinien

### Session-Management

* Session über HttpOnly-Cookie `__Host-session` (Secure, SameSite=Strict, Path=/)
* Keine clientseitige Speicherung von Tokens im localStorage oder sessionStorage
* Sichere Cookie-Attribute erzwungen; `session_id` wird nicht mehr verwendet

### Anti-Brute-Force-Maßnahmen

* Rate-Limiting für alle Authentifizierungs-Endpunkte
* Exponentielles Backoff: aktuell nicht implementiert
* IP-basierte Blockierung: aktuell nicht implementiert
* CAPTCHA-Integration: aktuell nicht implementiert

### Datenschutz

* Keine Preisgabe von Benutzerexistenz bei Passwort-Vergessen-Anfragen
* Gleiches Redirect-Verhalten unabhängig vom Benutzerexistenz-Status (Anti-Enumeration)
* Verschlüsselte Übertragung (HTTPS)
