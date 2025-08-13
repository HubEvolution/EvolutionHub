# Auth API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Authentifizierung und Autorisierung im Evolution Hub.

## Security-Features

Alle Auth-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (`standardApiLimiter`)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle Authentifizierungsereignisse werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert
* **Anti-User-Enumeration:** Gleiches Redirect-Verhalten unabhängig vom Benutzerexistenz-Status

Hinweis: Die Auth-Endpunkte sind formularbasiert und antworten mit Redirects statt JSON. Bei Erfolg wird ein HttpOnly-Cookie `session_id` gesetzt.
Hinweis: Die früheren `-v2` Varianten wurden in die kanonischen Endpunkte integriert (Service-Layer, zentrale Fehlerbehandlung, konsistente Redirects).

## Endpunkte (kanonisch)

* Endpunkte:
  * `POST /api/auth/login`
  * `POST /api/auth/register`
  * `POST /api/auth/reset-password`
  * `GET|POST /api/user/logout`
* Eigenschaften:
  * Service-Layer: `src/lib/services/auth-service-impl.ts`
  * Zentrale Fehlerbehandlung: `src/lib/error-handler.ts`
  * Konsistente Redirects: `src/lib/response-helpers.ts` (`createSecureRedirect`)
  * bcrypt Work-Faktor: 12
  * Passwort-Reset-Token-TTL: 24h
  * Bei Reset-Fehlern bleibt der `token`-Query-Parameter im Redirect erhalten
* Verhalten:
  * Antworten als `302 Redirect`
  * Cookie-Verhalten: `session_id` (HttpOnly, SameSite=Lax, Secure über HTTPS)

---

## 1. Login

Authentifiziert einen Benutzer mit E-Mail und Passwort. Setzt eine Server-Session (HttpOnly-Cookie) und antwortet mit Redirect.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/login`
* **Handler-Funktion:** POST-Handler in `login.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Eingabevalidierung

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

### Fehlercodes (Login)

* v1 (`login.ts`): `InvalidCredentials`, `InvalidInput`, `ValidationFailed`, `TooManyRequests`, `ServerError`, `MissingRuntime`
* v2 (`login-v2.ts`): `AuthFailed`, `InvalidInput`, `TooManyRequests`, `ServerError`

---

## 2. Registrierung

Registriert einen neuen Benutzer mit E-Mail, Passwort und Namen.

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
Location: /dashboard
Set-Cookie: session_id=<opaque>; Path=/; HttpOnly; SameSite=Lax; Secure
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

## 3. Passwort vergessen

Sendet eine E-Mail mit einem Token zum Zurücksetzen des Passworts. Nutzt Resend API für den E-Mail-Versand.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/forgot-password`
* **Handler-Funktion:** POST-Handler in `forgot-password.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Anti-User-Enumeration

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

## 4. Passwort zurücksetzen

Setzt das Passwort eines Benutzers mit einem gültigen Token zurück.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/reset-password`
* **Handler-Funktion:** POST-Handler in `reset-password.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Token-Validierung

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
