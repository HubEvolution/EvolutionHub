# User API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Benutzerverwaltung im Evolution Hub.

## Authentifizierung

Alle Endpunkte erfordern eine authentifizierte Session über ein HttpOnly-Cookie `session_id`. Es wird kein JWT im `Authorization`-Header verwendet.

## Security-Features

Alle User-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (`standardApiLimiter`)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle API-Zugriffe und Profiländerungen werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert
* **Whitelist-Filterung:** Sensible Daten werden vor der Rückgabe gefiltert

---

## 1. Benutzerinformationen

Gibt die Daten des aktuell eingeloggten Benutzers zurück. Nutzt `withAuthApiMiddleware` für Authentifizierung, Rate-Limiting, Security-Headers und Audit-Logging. Sensitive Daten werden über einen Whitelist-Ansatz gefiltert.

### Benutzerinformationen abrufen

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/user/me`
* **Handler-Funktion:** GET-Handler in `me.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Whitelist-Filterung sensibler Daten

### Erfolgreiche Antwort – /api/user/me (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "usr_x1y2z3",
    "email": "benutzer@beispiel.de",
    "name": "Max Mustermann",
    "username": "maxmustermann",
    "created_at": "2023-10-27T10:00:00Z"
  }
}
```

### Fehlerhafte Antwort – /api/user/me (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "type": "auth_error",
    "message": "Für diese Aktion ist eine Anmeldung erforderlich"
  }
}
```

---

## 2. Benutzerprofil aktualisieren

Aktualisiert das Profil des aktuell authentifizierten Benutzers. Verwendet `withAuthApiMiddleware` und beinhaltet u.a. Username-Kollisionsprüfung.

### Benutzerprofil aktualisieren

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/user/profile`
* **Handler-Funktion:** `updateProfile` in `profile.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Input-Validierung, Username-Kollisionsprüfung

### Request-Felder (FormData)

* `name`: string (2–50 Zeichen)
* `username`: string (3–30 Zeichen, nur Buchstaben/Zahlen/Underscore)

Beispiel:

```bash
curl -i -X POST \
  -F 'name=Max Neuer-Name' \
  -F 'username=maxneuerusername' \
  https://<host>/api/user/profile
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "user": {
      "id": "usr_x1y2z3",
      "name": "Max Neuer-Name",
      "username": "maxneuerusername"
    }
  }
}
```

### Fehlerhafte Antwort – /api/user/profile (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "type": "server_error",
    "message": "Username already taken"
  }
}
```

---

## 3. Abmelden

Meldet den aktuell authentifizierten Benutzer ab und invalidiert die Session. Nutzt `handleLogout` für gemeinsame Logik und Redirects.

### Abmelden

* **HTTP-Methoden:** `GET`, `POST`
* **Pfad:** `/api/user/logout` (oder `/api/user/logout-v2`)
* **Handler-Funktion:** GET/POST-Handler in `logout.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Session-Invalidierung

### Erfolgreiche Antwort – /api/user/logout (302 Redirect)

```http
HTTP/1.1 302 Found
Location: /
Set-Cookie: session_id=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0
```

### Fehlerhafte Antwort – /api/user/logout (302 Redirect)

Beispiel (Rate-Limit):

```http
HTTP/1.1 302 Found
Location: /login?error=rate_limit
```

---

## 4. Avatar hochladen

Lädt ein neues Profilbild hoch und speichert es in R2 Storage. Handhabung erfolgt direkt im `avatar.ts` ohne komplexe Middleware, inklusive Sicherheits-Header.

### Avatar hochladen

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/user/avatar`
* **Handler-Funktion:** `uploadAvatar` in `avatar.ts`
* **Security:** Security-Headers, Audit-Logging, Authentifizierung erforderlich; Kein zentrales Rate-Limiting aktiv.

### Request-Body

Multipart/form-data mit einem Feld `avatar`, das die Bilddatei enthält.

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "imageUrl": "/r2/avatar-usr_x1y2z3-1700000000000.jpg",
  "message": "Avatar updated successfully"
}
```

### Fehlerhafte Antwort – /api/user/avatar (401 Unauthorized)

```json
{
  "success": false,
  "error": {
    "type": "auth_error",
    "message": "Für diese Aktion ist eine Anmeldung erforderlich"
  }
}
```

---

## 5. Passwort ändern (Deprecated – 410 Gone)

Im Stytch-only Flow ist die Passwortänderung über die API nicht mehr unterstützt. Der Endpoint ist deprecatet und liefert 410 Gone.

### Verhalten

* **HTTP-Methode:** `POST` → 410 Gone (HTML)
* **Andere Methoden:** `GET, PUT, PATCH, DELETE, OPTIONS, HEAD` → 410 Gone (JSON)
* **Pfad:** `/api/user/password`
* **Details:** `Allow: 'POST'`

#### Beispielantwort (JSON)

```json
{
  "success": false,
  "error": {
    "type": "gone",
    "message": "This endpoint has been deprecated. Password changes are no longer supported; use Stytch flows.",
    "details": { "Allow": "POST" }
  }
}
```

---

## 6. Kontoeinstellungen

Aktualisiert die Einstellungen des aktuell authentifizierten Benutzers. Derzeit ein Stub, der eine Erfolgsmeldung zurückgibt.

### Kontoeinstellungen aktualisieren

* **HTTP-Methode:** `PUT`
* **Pfad:** `/api/user/settings`
* **Handler-Funktion:** `updateSettings` in `settings.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging

#### Request-Body

Beliebig (derzeit ignoriert)

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "data": {
    "message": "Settings updated successfully"
  }
}
```

### Fehlerhafte Antwort – /api/user/settings (400 Bad Request)

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Ungültige Einstellungen"
  }
}
```

---

## 7. Konto löschen

Löscht das Benutzerkonto und alle zugehörigen Daten, inklusive Sessions, Aktivitäten und Projekte. Die Benutzerdaten werden anonymisiert, um DSGVO-Konformität zu gewährleisten.

### Konto löschen

* **HTTP-Methode:** `DELETE`
* **Pfad:** `/api/user/account`
* **Handler-Funktion:** `deleteAccount` in `account.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging. Erfordert Bestätigung über Request Body (`{ "confirm": true }`).

### Erfolgreiche Antwort (`204 No Content`)

HTTP/1.1 204 No Content

### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Confirmation required to delete account"
  }
}
```

---

## 8. Sicherheitsrichtlinien

### Datenschutz

* Whitelist-Filterung sensibler Daten vor der Rückgabe
* Keine Rückgabe von Passwort-Hashes oder Security-Tokens
* Minimale Datenspeicherung (nur notwendige Daten)
* Verschlüsselte Übertragung (HTTPS)

### Profiländerungen

* Validierung aller Eingabefelder
* Überprüfung auf Benutzername-Kollisionen
* Protokollierung aller Profiländerungen
* Benachrichtigung bei kritischen Änderungen (z.B. E-Mail-Änderung)

### Avatar-Upload

* Empfehlungen: Beschränkung auf sichere Bildformate (z. B. JPEG/PNG), Größenlimits, Bildoptimierung
* Aktueller Stand: Keine strikten Typ-/Größenprüfungen durchgesetzt
* Speicherung in Cloudflare R2 mit sicheren Zugriffsrechten
