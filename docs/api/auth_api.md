# Auth API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Authentifizierung und Autorisierung im Evolution Hub.

## Security-Features

Alle Auth-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 10 Anfragen pro Minute (authLimiter)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle Authentifizierungsereignisse werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert
* **Anti-User-Enumeration:** Konsistente Antworten unabhängig vom Benutzerexistenz-Status

---

## 1. Login

Authentifiziert einen Benutzer mit E-Mail und Passwort und gibt einen JWT-Token zurück.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/login`
* **Handler-Funktion:** `login` in `login.ts`
* **Security:** Rate-Limiting (10/min), Security-Headers, Audit-Logging, Credential-Stuffing-Schutz

#### Request-Body

```json
{
  "email": "benutzer@beispiel.de",
  "password": "sicheres-passwort123"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "user": {
    "id": "usr_x1y2z3",
    "name": "Max Mustermann",
    "email": "benutzer@beispiel.de",
    "username": "maxmustermann",
    "created_at": "2023-10-27T10:00:00Z"
  }
}
```

#### Fehlerhafte Antwort (`401 Unauthorized`)

```json
{
  "error": "Ungültige E-Mail oder Passwort",
  "success": false
}
```

---

## 2. Registrierung

Registriert einen neuen Benutzer mit E-Mail, Passwort und Namen.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/register`
* **Handler-Funktion:** `register` in `register.ts`
* **Security:** Rate-Limiting (10/min), Security-Headers, Audit-Logging, Passwort-Komplexitätsprüfung

#### Request-Body

```json
{
  "name": "Max Mustermann",
  "email": "benutzer@beispiel.de",
  "username": "maxmustermann",
  "password": "sicheres-passwort123"
}
```

#### Erfolgreiche Antwort (`201 Created`)

```json
{
  "success": true,
  "user": {
    "id": "usr_x1y2z3",
    "name": "Max Mustermann",
    "email": "benutzer@beispiel.de",
    "username": "maxmustermann",
    "created_at": "2023-10-27T10:00:00Z"
  }
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Diese E-Mail-Adresse wird bereits verwendet",
  "success": false
}
```

---

## 3. Passwort vergessen

Sendet eine E-Mail mit einem Token zum Zurücksetzen des Passworts.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/forgot-password`
* **Handler-Funktion:** `forgotPassword` in `forgot-password.ts`
* **Security:** Rate-Limiting (10/min), Security-Headers, Audit-Logging, Anti-User-Enumeration

#### Request-Body

```json
{
  "email": "benutzer@beispiel.de"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Wenn ein Konto mit dieser E-Mail existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet."
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ungültige E-Mail-Adresse",
  "success": false
}
```

---

## 4. Passwort zurücksetzen

Setzt das Passwort eines Benutzers mit einem gültigen Token zurück.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/auth/reset-password`
* **Handler-Funktion:** `resetPassword` in `reset-password.ts`
* **Security:** Rate-Limiting (10/min), Security-Headers, Audit-Logging, Token-Validierung, Passwort-Komplexitätsprüfung

#### Request-Body

```json
{
  "token": "reset_token_123456",
  "password": "neues-sicheres-passwort123"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Passwort erfolgreich zurückgesetzt"
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ungültiger oder abgelaufener Token",
  "success": false
}
```

---

## 5. Sicherheitsrichtlinien

### Passwort-Richtlinien

- Mindestlänge: 8 Zeichen
- Muss enthalten: Groß- und Kleinbuchstaben, Zahlen, Sonderzeichen
- Passwort-Hashing: bcrypt mit angemessenem Work-Faktor
- Keine Wiederverwendung der letzten 3 Passwörter

### Session-Management

- JWT-Sessions nur über HttpOnly-Cookies
- Keine clientseitige Speicherung von Tokens im localStorage oder sessionStorage
- Sichere Cookie-Attribute (Secure, SameSite)
- Session-Timeout nach 24 Stunden Inaktivität

### Anti-Brute-Force-Maßnahmen

- Rate-Limiting für alle Authentifizierungs-Endpunkte
- Exponentielles Backoff bei wiederholten fehlgeschlagenen Versuchen
- IP-basierte Blockierung nach zu vielen fehlgeschlagenen Versuchen
- CAPTCHA-Integration bei verdächtigen Aktivitäten

### Datenschutz

- Keine Preisgabe von Benutzerexistenz bei Passwort-Vergessen-Anfragen
- Konsistente Antwortzeiten unabhängig vom Benutzerexistenz-Status
- Minimale Datenspeicherung (nur notwendige Daten)
- Verschlüsselte Übertragung (HTTPS)
