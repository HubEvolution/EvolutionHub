---
description: 'API-Referenz für Authentifizierungs- und Session-Endpunkte'
owner: 'Auth Team'
priority: 'high'
lastSync: '2025-11-03'
codeRefs: 'src/pages/api/auth/**, src/lib/stytch.ts, src/lib/api-middleware.ts'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# Auth API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Authentifizierung und Autorisierung im Evolution Hub.

## Security-Features

Alle Auth-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

- **Rate-Limiting:** 50 Anfragen pro Minute (`standardApiLimiter`)

- **Security-Headers:** Alle Standard-Security-Headers werden angewendet

- **Audit-Logging:** Alle Authentifizierungsereignisse werden protokolliert

- **Input-Validierung:** Alle Eingabeparameter werden validiert

- **Anti-User-Enumeration:** Gleiches Redirect-Verhalten unabhängig vom Benutzerexistenz-Status

Hinweis: Die Stytch-Auth verwendet JSON (Magic Link Request) und Redirect (Callback). Die Session wird im Callback mit einem HttpOnly-Cookie `__Host-session` gesetzt (Secure, SameSite=Strict, Path=/).
Hinweis: Die frühere Login-Variante `login-v2` wurde entfernt. Verwende ausschließlich den kanonischen Login-Endpunkt (Service-Layer, zentrale Fehlerbehandlung, konsistente Redirects).

## Endpunkte (kanonisch)

- Endpunkte (Stytch Magic Link):
  - `POST /api/auth/magic/request` — Fordert einen Magic Link an (JSON `{ success: true, data: { sent: true } }`)

  - `GET  /api/auth/callback` — Callback, setzt Session‑Cookies und leitet direkt zum Ziel weiter

  - `GET|POST /api/user/logout` — weiterhin aktiv (v2 bevorzugt)

- Eigenschaften:
  - Stytch‑Integration in `src/lib/stytch.ts` (Fake‑Modus via `E2E_FAKE_STYTCH` für Tests)

  - Zentrale Fehlerbehandlung/Headers: `src/lib/api-middleware.ts`, `src/lib/response-helpers.ts`

  - Session‑Cookie: `__Host-session` (HttpOnly, Secure, SameSite=Strict, Path=/)

- Verhalten:
  - `magic/request` antwortet
    - JSON `{ success: true, data: { sent: true } }` bei programmatic calls

    - HTML `303 See Other` Redirect zur lokalisierten Login-Seite mit `?success=magic_sent` bei klassischem Formular‑POST

  - `callback` antwortet mit direktem `302` Redirect zum Ziel (ggf. lokalisiert)

### Beispiele

#### Magic Link anfordern (JSON)

````bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: http://127.0.0.1:8787" \
  -d '{"email":"user@example.com","r":"/dashboard","locale":"en"}' \
  http://127.0.0.1:8787/api/auth/magic/request

```text

Erfolg (200):

```json
{ "success": true, "data": { "sent": true } }
````

#### Magic Link anfordern (Form‑POST, progressive enhancement)

````bash
curl -X POST \
  -H "Origin: http://127.0.0.1:8787" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'email=user@example.com&r=/dashboard&locale=en' \
  -i http://127.0.0.1:8787/api/auth/magic/request

```text

Antwort (303):

```http
HTTP/1.1 303 See Other
Location: /en/login?success=magic_sent
````

#### Callback

````bash
curl -i "http://127.0.0.1:8787/api/auth/callback?token=dev-ok&email=user@example.com&r=/dashboard"

```text

Antwort (302):

```http
HTTP/1.1 302 Found
Location: /en/dashboard
Set-Cookie: __Host-session=...; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=2592000
````

### Production‑Hinweise (Stytch Live)

- Redirect‑URLs in Stytch (Live) whitelisten:
  - `https://hub-evolution.com/api/auth/callback`

  - optional zusätzlich: `https://www.hub-evolution.com/api/auth/callback`

- Erforderliche Secrets/Variablen (Wrangler, `--env production`):
  - `AUTH_PROVIDER=stytch`
  - `STYTCH_PROJECT_ID` (Live, beginnt mit `project-live-…`)
  - `STYTCH_SECRET`
  - `STYTCH_PUBLIC_TOKEN` (für Public OAuth Start)
  - `JWT_SECRET` (geschützte Admin/Notifications‑APIs)
  - optional: `STYTCH_CUSTOM_DOMAIN` (z. B. `login.hub-evolution.com`)
  - optional: `STYTCH_PKCE` (`"0"|"1"`; Standard Prod: `"0"`)
  - optional: `PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (Spam‑Schutz beim Magic‑Request)

- CSRF/Origin: `POST /api/auth/magic/request` verlangt same‑origin `Origin`/`Referer`.
  - curl‑Beispiel: `-H 'Origin: https://hub-evolution.com'`

### Staging/Testing

- `AUTH_PROVIDER=stytch`
- `STYTCH_PUBLIC_TOKEN` Pflicht (OAuth Start)
- `STYTCH_PKCE="1"` empfohlen (PKCE aktiv)
- optional: `STYTCH_CUSTOM_DOMAIN` (falls vorhanden)
- `JWT_SECRET` setzen, wenn Admin/Notifications‑APIs aktiv getestet werden

---

> Hinweis: Alle legacy Passwort-basierten Endpunkte (login/register/forgot/reset) wurden entfernt. Das System verwendet ausschließlich Stytch Magic Link (`/api/auth/magic/request` → `/api/auth/callback`).

### 5. Logout

Beendet die aktuelle Benutzersitzung und löscht das Session-Cookie.

### Abmelden

- **HTTP-Methoden:** `GET`, `POST`

- **Pfade:**
  - `/api/user/logout`

  - `/api/user/logout-v2`

- **Handler-Funktion:** GET/POST-Handler in `user/logout.ts` bzw. `user/logout-v2.ts`

- **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging

### Erfolgreiche Antwort (Logout) (`302 Redirect`)

````http
HTTP/1.1 302 Found
Location: /
Set-Cookie: __Host-session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0

```text

### Fehlerhafte Antwort (Logout) (`302 Redirect`)

Beispiele:

```http
# v1: Rate-Limit überschritten
HTTP/1.1 302 Found
Location: /login?error=rate_limit
````

````http

# v2: Rate-Limit überschritten

HTTP/1.1 302 Found
Location: /login?error=TooManyRequests

```text

---

## 6. Sicherheitsrichtlinien

### Session-Management

* Session über HttpOnly-Cookie `__Host-session` (Secure, SameSite=Strict, Path=/) — auf HTTP- (Dev-)Umgebungen wird stattdessen kein Session-Cookie gesetzt
* Keine clientseitige Speicherung von Tokens im localStorage oder sessionStorage
* Sichere Cookie-Attribute erzwungen; `session_id` ist entfernt

### Anti-Brute-Force-Maßnahmen

* Rate-Limiting für alle Authentifizierungs-Endpunkte

* Exponentielles Backoff: aktuell nicht implementiert

* IP-basierte Blockierung: aktuell nicht implementiert

* CAPTCHA-Integration: aktuell nicht implementiert

### Datenschutz

* Keine Preisgabe von Benutzerexistenz bei Passwort-Vergessen-Anfragen

* Gleiches Redirect-Verhalten unabhängig vom Benutzerexistenz-Status (Anti-Enumeration)

* Verschlüsselte Übertragung (HTTPS)

```text

## See also

- `docs/reference/auth-envs-and-secrets.md` (mapping domains → Wrangler envs, and which secrets to set per env)
````
