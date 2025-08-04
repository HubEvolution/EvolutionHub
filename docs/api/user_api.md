# User API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Benutzerverwaltung im Evolution Hub.

## Authentifizierung

Alle Endpunkte erfordern eine Authentifizierung über einen JWT, der im `Authorization`-Header als `Bearer <token>` übergeben wird.

## Security-Features

Alle User-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 
  * Standard: 50 Anfragen pro Minute (standardApiLimiter)
  * Sensible Aktionen: 5 Anfragen pro Minute (sensitiveActionLimiter)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle API-Zugriffe und Profiländerungen werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert
* **Whitelist-Filterung:** Sensible Daten werden vor der Rückgabe gefiltert

---

## 1. Benutzerinformationen

Ruft die Informationen des aktuell authentifizierten Benutzers ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/user/me`
* **Handler-Funktion:** `getUserInfo` in `me.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Whitelist-Filterung sensibler Daten

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "user": {
    "id": "usr_x1y2z3",
    "name": "Max Mustermann",
    "email": "benutzer@beispiel.de",
    "username": "maxmustermann",
    "avatar_url": "https://example.com/avatars/usr_x1y2z3.jpg",
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T12:30:00Z"
  }
}
```

#### Fehlerhafte Antwort (`401 Unauthorized`)

```json
{
  "error": "Nicht authentifiziert",
  "success": false
}
```

---

## 2. Benutzerprofil aktualisieren

Aktualisiert das Profil des aktuell authentifizierten Benutzers.

* **HTTP-Methode:** `PUT`
* **Pfad:** `/api/user/profile`
* **Handler-Funktion:** `updateProfile` in `profile.ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Input-Validierung, Username-Kollisionsprüfung

#### Request-Body

```json
{
  "name": "Max Neuer-Name",
  "username": "maxneuerusername",
  "bio": "Dies ist meine neue Biografie"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "user": {
    "id": "usr_x1y2z3",
    "name": "Max Neuer-Name",
    "email": "benutzer@beispiel.de",
    "username": "maxneuerusername",
    "bio": "Dies ist meine neue Biografie",
    "avatar_url": "https://example.com/avatars/usr_x1y2z3.jpg",
    "updated_at": "2023-10-27T14:30:00Z"
  }
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Dieser Benutzername wird bereits verwendet",
  "success": false
}
```

---

## 3. Abmelden

Meldet den aktuell authentifizierten Benutzer ab und invalidiert die Session.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/user/logout`
* **Handler-Funktion:** `logout` in `logout.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Session-Invalidierung

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Erfolgreich abgemeldet"
}
```

#### Fehlerhafte Antwort (`401 Unauthorized`)

```json
{
  "error": "Nicht authentifiziert",
  "success": false
}
```

---

## 4. Avatar hochladen

Lädt ein neues Profilbild für den aktuell authentifizierten Benutzer hoch.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/user/avatar`
* **Handler-Funktion:** `uploadAvatar` in `avatar.ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Datei-Validierung, Größenbeschränkung

#### Request-Body

Multipart/form-data mit einem Feld `avatar`, das die Bilddatei enthält.

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "avatar_url": "https://example.com/avatars/usr_x1y2z3.jpg"
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ungültiges Bildformat. Erlaubte Formate: JPEG, PNG, GIF",
  "success": false
}
```

---

## 5. Passwort ändern

Ändert das Passwort des aktuell authentifizierten Benutzers.

* **HTTP-Methode:** `PUT`
* **Pfad:** `/api/user/password`
* **Handler-Funktion:** `changePassword` in `password.ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Passwort-Komplexitätsprüfung, Alte-Passwort-Validierung

#### Request-Body

```json
{
  "current_password": "altes-passwort123",
  "new_password": "neues-sicheres-passwort456"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Passwort erfolgreich geändert"
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Aktuelles Passwort ist falsch",
  "success": false
}
```

---

## 6. Kontoeinstellungen

Aktualisiert die Einstellungen des aktuell authentifizierten Benutzers.

* **HTTP-Methode:** `PUT`
* **Pfad:** `/api/user/settings`
* **Handler-Funktion:** `updateSettings` in `settings.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Input-Validierung

#### Request-Body

```json
{
  "email_notifications": true,
  "theme": "dark",
  "language": "de"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "settings": {
    "email_notifications": true,
    "theme": "dark",
    "language": "de",
    "updated_at": "2023-10-27T14:30:00Z"
  }
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ungültige Einstellungen",
  "success": false
}
```

---

## 7. Konto löschen

Löscht das Konto des aktuell authentifizierten Benutzers.

* **HTTP-Methode:** `DELETE`
* **Pfad:** `/api/user/account`
* **Handler-Funktion:** `deleteAccount` in `account.ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Passwort-Bestätigung

#### Request-Body

```json
{
  "password": "passwort-zur-bestätigung"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Konto erfolgreich gelöscht"
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Falsches Passwort",
  "success": false
}
```

---

## 8. Sicherheitsrichtlinien

### Datenschutz

- Whitelist-Filterung sensibler Daten vor der Rückgabe
- Keine Rückgabe von Passwort-Hashes oder Security-Tokens
- Minimale Datenspeicherung (nur notwendige Daten)
- Verschlüsselte Übertragung (HTTPS)

### Profiländerungen

- Validierung aller Eingabefelder
- Überprüfung auf Benutzernamen-Kollisionen
- Protokollierung aller Profiländerungen
- Benachrichtigung bei kritischen Änderungen (z.B. E-Mail-Änderung)

### Avatar-Upload

- Beschränkung auf sichere Bildformate (JPEG, PNG, GIF)
- Größenbeschränkung (max. 2 MB)
- Automatische Bildoptimierung
- Speicherung in Cloudflare R2 mit sicheren Zugriffsrechten
