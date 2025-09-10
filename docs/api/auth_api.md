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

## 1. Login (Legacy)

Hinweis: Der E‑Mail/Passwort‑Login ist deprecatet und liefert `410 Gone`. Verwende ausschließlich den Stytch Magic Link Flow (`/api/auth/magic/request` → `/api/auth/callback`).

* **Legacy‑Pfad:** `/api/auth/login` → `410 Gone`
* **Aktuell:** Kein Passwort‑Login mehr im UI; Login‑Seiten zeigen nur das Magic‑Link‑Formular

### Request-Felder (Login)

* `email`: string (erforderlich)
* `password`: string (erforderlich)
* `rememberMe`: boolean (optional, z. B. `on`/`true` → aktiv)

Beispiel:

```bash
curl -i -X POST \
  -F 'email=benutzer@beispiel.de' \
  -F 'password=sicheres-passwort123' \
  -F 'rememberMe=on' \
  https://<host>/api/auth/login
```

### Erfolgreiche Antwort (Login) (`302 Redirect`)

Beispiel-Header:

```http
HTTP/1.1 302 Found
Location: /dashboard
Set-Cookie: session_id=<opaque>; Path=/; HttpOnly; SameSite=Lax; Secure
```

### Fehlerhafte Antwort (Login) (`302 Redirect`)

Beispiel-Header:

```http
HTTP/1.1 302 Found
Location: /login?error=InvalidCredentials
```

### Sonderfall: E-Mail nicht verifiziert

Wenn der Benutzer existiert, die Zugangsdaten korrekt sind, aber `email_verified = false`,
liefert der Service-Layer einen speziellen Fehler (`details.reason = 'email_not_verified'`).
Der zentrale Error-Handler leitet daraufhin auf die Verifizierungsseite um:

```http
HTTP/1.1 302 Found
Location: /verify-email?email=<email>
```

Es wird in diesem Fall keine Session erstellt.

### Fehlercodes (Login)

* Kanonisch (`login.ts`): `InvalidCredentials`, `InvalidInput`, `ValidationFailed`, `TooManyRequests`, `ServerError`, `MissingRuntime`

---

## 2. Registrierung (Legacy)

Legacy‑Registrierung mit Passwort ist deprecatet und liefert `410 Gone`. Registrierung erfolgt implizit über Magic Link beim ersten erfolgreichen Callback (Profilfelder optional per Cookie `post_auth_profile`).

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/register`
* **Handler-Funktion:** POST-Handler in `register.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging
* **Validierung:** Name (≥ 2), E-Mail (Gültig & <255), Username (≥ 3, nur Buchstaben/Zahlen), Passwort (≥ 6)

### Request-Felder (Registrierung)

* `name`: string (≥ 2 Zeichen)
* `email`: string (erforderlich)
* `username`: string (≥ 3 Zeichen)
* `password`: string (≥ 6 Zeichen)

Beispiel:

```bash
curl -i -X POST \
  -F 'name=Max Mustermann' \
  -F 'email=benutzer@beispiel.de' \
  -F 'username=maxmustermann' \
  -F 'password=sicheres-passwort123' \
  https://<host>/api/auth/register
```

### Erfolgreiche Antwort (Registrierung) (`302 Redirect`)

Beispiel-Header:

```http
HTTP/1.1 302 Found
Location: /verify-email?email=<email>
```

### Fehlerhafte Antwort (Registrierung) (`302 Redirect`)

Beispiel-Header:

```http
HTTP/1.1 302 Found
Location: /register?error=UserExists
```

### Fehlercodes (Registrierung)

* v1 (`register.ts`): `InvalidInput`, `UserExists`, `TooManyRequests`, `UnknownError`, `ServerError`
* v2 (`register-v2.ts`): `InvalidInput`, `UsernameExists`, `UserExists`, `TooManyRequests`, `ServerError`

---

## 3. Passwort vergessen (Legacy)

Deprecatet. Endpunkt liefert `410 Gone`. UI‑Seiten wurden entfernt.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/forgot-password`
* **Handler-Funktion:** POST-Handler in `forgot-password.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Anti-User-Enumeration
* **Methoden-Policy:** Nur `POST`; alle anderen Methoden → `405 Method Not Allowed` (Header: `Allow: POST`)
* **Reset-Link-Format:** Der in der E-Mail versendete Link enthält das Token als Fragment (`/reset-password#token=<token>`), um Leaks in Server-Logs/Proxys zu minimieren. Die Reset-Seite akzeptiert sowohl `?token=<...>` (Legacy) als auch `#token=<...>`.

### Anfrageparameter für Passwort vergessen

* `email`: string (erforderlich)

Beispiel:

```bash
curl -i -X POST \
  -F 'email=benutzer@beispiel.de' \
  https://<host>/api/auth/forgot-password
```

### Erfolgreiche Antwort (Passwort vergessen) (`302 Redirect`)

```http
HTTP/1.1 302 Found
Location: /auth/password-reset-sent
```

Hinweis: Existiert die E-Mail nicht, erfolgt trotzdem derselbe Erfolg-Redirect (Anti-User-Enumeration).

### Fehlerhafte Antwort (Passwort vergessen) (`302 Redirect`)

```http
HTTP/1.1 302 Found
Location: /forgot-password?error=InvalidEmail
```

### Fehlercodes (Passwort vergessen)

* `InvalidEmail`
* `TooManyRequests`
* `ServerError`

---

## 4. Passwort zurücksetzen (Legacy)

Deprecatet. Endpunkt liefert `410 Gone`.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/reset-password`
* **Handler-Funktion:** POST-Handler in `reset-password.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Token-Validierung

Hinweise zum Token-Transport und zur URL-Hygiene:

* Die UI-Reset-Seite liest das Token aus dem Query-String (`?token=...`) oder aus dem Hash-Fragment (`#token=...`).
* Nach dem Rendern entfernt die Seite das Token aus der URL (Query/Hash) via `history.replaceState`, um das Risiko von Token-Leaks (Referrer, Logs) zu reduzieren. Andere Query-Parameter und Hash-Bestandteile bleiben erhalten.
* Bei Fehler-Redirects durch den Server wird das Token weiterhin als Query-Parameter in der Redirect-URL mitgegeben (Fragmente können serverseitig nicht gesetzt werden).

### Anfrageparameter für Passwort zurücksetzen

* `token`: string (erforderlich)
* `password`: string (≥ 6 Zeichen)

Beispiel:

```bash
curl -i -X POST \
  -F 'token=<token>' \
  -F 'password=neues-sicheres-passwort123' \
  https://<host>/api/auth/reset-password
```

### Erfolgreiche Antwort (Passwort zurücksetzen) (`302 Redirect`)

```http
HTTP/1.1 302 Found
Location: /login?success=PasswordReset
```

### Fehlerhafte Antwort (Passwort zurücksetzen) (`302 Redirect`)

```http
HTTP/1.1 302 Found
Location: /reset-password?token=<token>&error=InvalidToken
```

### Fehlercodes (Passwort zurücksetzen)

* `InvalidInput`
* `TooManyRequests`
* `ServerError`

Hinweis: Bei Fehlern wird der ursprüngliche `token`-Query-Parameter im Redirect beibehalten. Fehlt der `token`-Parameter vollständig, erfolgt der Redirect nach `/reset-password?error=InvalidInput`.

---

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

### Passwort-Richtlinien

* Mindestlänge: 6 Zeichen (aktuell erzwungen)
* Komplexitätsregeln: derzeit nicht erzwungen (Empfehlung: Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen)
* Passwort-Hashing: bcrypt (bcrypt-ts) mit Work-Faktor 10 (v1) bzw. 12 (Service-Layer v2)
* Passwort-Wiederverwendungsprüfung: aktuell nicht implementiert

### Session-Management

* Session-Management über DB-gestützte Session-ID im HttpOnly-Cookie `session_id`
* Keine clientseitige Speicherung von Tokens im localStorage oder sessionStorage
* Sichere Cookie-Attribute (Secure nur über HTTPS, SameSite=Lax)
* Cookie-Lebensdauer: 1 Tag (Standard) bzw. 30 Tage mit `rememberMe` oder nach Registrierung

### Passwort-Reset-Token

* Gültigkeitsdauer: 1 Stunde (v1) bzw. 24 Stunden (Service-Layer v2)
* Löschung: Token wird nach erfolgreicher Verwendung oder Ablauf entfernt

### Anti-Brute-Force-Maßnahmen

* Rate-Limiting für alle Authentifizierungs-Endpunkte
* Exponentielles Backoff: aktuell nicht implementiert
* IP-basierte Blockierung: aktuell nicht implementiert
* CAPTCHA-Integration: aktuell nicht implementiert

### Datenschutz

* Keine Preisgabe von Benutzerexistenz bei Passwort-Vergessen-Anfragen
* Gleiches Redirect-Verhalten unabhängig vom Benutzerexistenz-Status (Anti-Enumeration)
* Verschlüsselte Übertragung (HTTPS)
