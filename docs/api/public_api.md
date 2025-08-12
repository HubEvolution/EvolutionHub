# Öffentliche API Endpunkte

Dieses Dokument beschreibt die öffentlich zugänglichen API-Endpunkte im Evolution Hub.

## Authentifizierung

Im Gegensatz zu anderen API-Endpunkten erfordern die öffentlichen APIs keine Authentifizierung. Sie sind für alle Benutzer zugänglich, unterliegen jedoch strengen Rate-Limiting-Regeln.

## Security-Features

Alle öffentlichen API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen/Minute über `standardApiLimiter` für Endpunkte mit `withApiMiddleware` (aktuell: `/api/tools`, `/api/dashboard/quick-actions`, `/api/debug-login`, `/api/internal/users/sync`). Newsletter- und Lead-Magnets-Endpunkte verwenden derzeit kein Middleware-basiertes Rate-Limiting.
* **Security-Headers:** Per Middleware gesetzt (nur bei Endpunkten mit `withApiMiddleware`). Details siehe Abschnitt „Sicherheitsheader“ unten.
* **Audit-Logging:** Zentralisiert über Middleware für die o.g. Endpunkte; andere Endpunkte loggen lokal (Konsole).
* **Input-Validierung:** Endpunkt-spezifisch (z. B. Newsletter- und Lead-Magnets-Validierung auf Server-Seite).
* **CORS:** Für `POST /api/lead-magnets/download` explizit aktiviert (`Access-Control-Allow-Origin: *`).

---

## 1. Kommentare API

Status: **Nicht implementiert.**
Dieses Dokument ist veraltet und bezieht sich auf eine nicht implementierte API.

---

## 2. Tools API

### 2.1. Tools abrufen

Ruft eine Liste aller verfügbaren Tools ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/tools`
* **Implementierung:** `src/pages/api/tools.ts` (verwendet `withApiMiddleware` und ruft `listTools()` auf)
* **Security:** Rate-Limiting (50/min), Security-Headers (über Middleware), Audit-Logging
* **Authentifizierung:** Nicht erforderlich.

#### Query-Parameter

Keine. Filter, Paginierung und Sortierung werden derzeit nicht unterstützt.

#### Erfolgreiche Antwort (`200 OK`)

```json
[
  {
    "id": "json-formatter",
    "name": "JSON Formatter",
    "description": "Formatiert und validiert JSON-Daten.",
    "url": "/tools/json-formatter",
    "icon": "code"
  }
]
```

### 2.2. Tool abrufen

Status: **Nicht implementiert.**
Es existiert kein implementierter Endpunkt unter `src/pages/api/tools/:id`.

---

## 3. Sicherheitsrichtlinien

### Content-Sicherheit

* Alle benutzergenerierten Inhalte werden gefiltert und sanitisiert
* XSS-Schutz durch Entfernung potenziell gefährlicher HTML-Tags und Attribute
* Keine Ausführung von JavaScript in benutzergenerierten Inhalten
* Maximale Länge für Kommentare und andere Benutzereingaben

### Anti-Spam-Maßnahmen

* Rate-Limiting für alle öffentlichen API-Endpunkte
* CAPTCHA-Integration für Kommentarfunktionen (optional)
* Automatische Erkennung und Blockierung von Spam-Mustern
* Möglichkeit zur Meldung unangemessener Inhalte

### Datenschutz

* Keine Preisgabe sensibler Benutzerinformationen
* Minimale Benutzerinformationen in öffentlichen Antworten
* Verschlüsselte Übertragung aller Daten (HTTPS)
* Keine Speicherung von IP-Adressen oder Tracking-Daten ohne Einwilligung

### Sicherheitsheader

Die folgenden Header werden durch `applySecurityHeaders()` gesetzt (nur bei Endpunkten mit `withApiMiddleware`):

* `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://*; connect-src 'self' https://*.cloudflare.com; font-src 'self' https://cdn.jsdelivr.net;`
* `X-Content-Type-Options`: `nosniff`
* `X-Frame-Options`: `DENY`
* `X-XSS-Protection`: `1; mode=block`
* `Referrer-Policy`: `strict-origin-when-cross-origin`
* `Strict-Transport-Security`: `max-age=31536000; includeSubDomains`
* `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), interest-cohort=()`

---

## 4. Quick Actions API (öffentlich)

Ruft die verfügbaren Quick Actions ab. Nutzt `withApiMiddleware`, benötigt keine Authentifizierung.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/quick-actions`
* **Implementierung:** `src/pages/api/dashboard/quick-actions.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers (über Middleware), Audit-Logging

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "qa1",
      "title": "New Post",
      "description": "Write a new blog article.",
      "icon": "✍️",
      "variant": "primary",
      "action": "createPost"
    }
  ]
}
```

---

## 5. Newsletter API

### 5.1. Abonnieren (Double Opt-in)

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/newsletter/subscribe`
* **Implementierung:** `src/pages/api/newsletter/subscribe.ts` (ohne Middleware)
* **Security:** Kein zentrales Rate-Limiting/Sicherheitsheader per Middleware; eigene Validierung.

#### Request-Body

```json
{
  "email": "user@example.com",
  "firstName": "Max",
  "consent": true,
  "source": "website"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Please check your email to confirm your subscription!",
  "email": "user@example.com",
  "next_step": "confirmation_required",
  "info": "We have sent a confirmation email to your address. Please click the link in the email to complete your subscription."
}
```

#### Fehlerhafte Antworten

```json
// 400 – Fehlende/ungültige Felder
{ "success": false, "message": "E-Mail-Adresse ist erforderlich" }
{ "success": false, "message": "Bitte geben Sie eine gültige E-Mail-Adresse ein" }
{ "success": false, "message": "Zustimmung zur Datenschutzerklärung ist erforderlich" }

// 500 – Versandfehler/Serverfehler
{ "success": false, "error": "Failed to send confirmation email. Please try again." }
{ "success": false, "message": "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." }
```

### 5.2. Bestätigung

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/newsletter/confirm`
* **Implementierung:** `src/pages/api/newsletter/confirm.ts` (ohne Middleware)

#### Query-Parameter

* `token` (erforderlich)
* `email` (optional, muss zum Token passen)

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Email address confirmed successfully! You are now subscribed to our newsletter.",
  "email": "user@example.com",
  "subscription_date": "2025-01-01T12:00:00.000Z"
}
```

#### Fehlerhafte Antworten

```json
// 400 – Ungültiger Link / Email-Mismatch
{ "success": false, "error": "Invalid confirmation link", "details": [/* zod errors */] }
{ "success": false, "error": "Email address does not match confirmation link" }

// 404 – Token unbekannt
{ "success": false, "error": "Confirmation link expired or invalid" }

// 410 – Token abgelaufen
{ "success": false, "error": "Confirmation link has expired. Please subscribe again." }

// 500 – Serverfehler
{ "success": false, "error": "Internal server error during confirmation", "message": "Please try again later or contact support if the problem persists." }
```

---

## 6. Lead Magnets API

### 6.1. Download anfordern (mit E-Mail-Gate)

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/lead-magnets/download`
* **Implementierung:** `src/pages/api/lead-magnets/download.ts` (ohne Middleware; CORS aktiviert)

#### Request-Body

```json
{
  "leadMagnetId": "new-work-guide",
  "email": "user@example.com",
  "firstName": "Max",
  "source": "landing-page",
  "utmSource": "newsletter"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "leadId": "lead_1700000000000_abcd1234",
  "downloadUrl": "/lead-magnets/new-work-transformation-guide.pdf",
  "fileName": "new-work-transformation-guide.pdf",
  "title": "New Work Transformation Guide",
  "message": "Lead-Magnet erfolgreich angefordert. Sie erhalten eine E-Mail mit dem Download-Link."
}
```

#### Fehlerhafte Antworten

```json
// 400 – Validierungsfehler
{ "success": false, "error": "Lead-Magnet-ID ist erforderlich" }
{ "success": false, "error": "Gültige E-Mail-Adresse ist erforderlich" }

// 404 – Unbekannte ID
{ "success": false, "error": "Ungültige Lead-Magnet-ID" }

// 500 – Serverfehler
{ "success": false, "error": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." }
```

#### CORS

Antwort-Header u.a.: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`.
Zusätzlich wird ein CORS-Preflight über `OPTIONS /api/lead-magnets/download` unterstützt.

### 6.2. Lead-Magnet Metadaten abrufen

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/lead-magnets/download?id=<id>`

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "leadMagnet": {
    "id": "new-work-guide",
    "title": "New Work Transformation Guide",
    "description": "Umfassender Guide zur erfolgreichen Einführung von New Work",
    "fileName": "new-work-transformation-guide.pdf",
    "requiresEmail": true
  }
}
```

#### Fehlerhafte Antworten

```json
// 400 – fehlende ID
{ "success": false, "error": "Lead-Magnet-ID erforderlich" }

// 404 – nicht gefunden
{ "success": false, "error": "Lead-Magnet nicht gefunden" }
```

---

## 7. Debug-Login (nur Entwicklung)

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/debug-login`
* **Implementierung:** `src/pages/api/debug-login.ts` (mit `withApiMiddleware`)
* **Hinweis:** In Produktionsumgebungen blockiert (Antwort sollte `403 Forbidden` sein).

#### Cookies

Der Endpunkt setzt bei Erfolg ein Session-Cookie mit folgenden Attributen:

- Name: `session_id`
- Pfad: `/`
- Ablauf: 7 Tage
- HttpOnly: `true`
- SameSite: `lax`
- Secure: `true` in Produktion (`false` in Entwicklung)

#### Erfolgreiche Antwort (Entwicklung)

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Debug session created for real user.",
    "userId": "<uuid>"
  }
}
```

#### Fehlerhafte Antwort (Produktion)

```json
{
  "success": false,
  "error": { "type": "forbidden", "message": "Debug login not available in production" }
}
```

---

## 8. Interner User Sync (intern, ohne Auth)

Synchronisiert Benutzerdaten in der internen Datenbank. Nur für vertrauenswürdige Systeme!

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/internal/users/sync`
* **Implementierung:** `src/pages/api/internal/users/sync.ts` (mit `withApiMiddleware`)

#### Request-Body

```json
{ "id": "<uuid>", "name": "Max Mustermann", "email": "user@example.com", "image": "https://..." }
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{ "success": true, "data": { "message": "User synced successfully", "userId": "<uuid>" } }
```

#### Fehlerhafte Antwort (Validierung)

```json
{ "success": false, "error": { "type": "validation_error", "message": "User ID and email are required" } }
```

---

## 9. Rate-Limiting & Fehlerformat

Bei mit Middleware geschützten Endpunkten führt Überschreitung des Limits zu:

```json
{ "success": false, "error": { "type": "rate_limit", "message": "Zu viele Anfragen. Bitte versuchen Sie es später erneut." } }
```

HTTP-Status: `429` und ggf. `Retry-After`-Header.
