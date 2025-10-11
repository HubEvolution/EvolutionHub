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

Status: **✅ Vollständig implementiert** (Production-Ready 80%)

Das Kommentarsystem bietet vollständige CRUD-Operationen, Moderation und Reporting.

### 1.1. Kommentare abrufen

Ruft Kommentare mit Filterung und Pagination ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/comments`
* **Implementierung:** `src/pages/api/comments/index.ts` (Hono + Astro)
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging
* **Authentifizierung:** Nicht erforderlich

#### Query-Parameter

| Parameter | Typ | Beschreibung | Standard |
|-----------|-----|--------------|----------|
| `entityType` | string | Entity-Typ (`blog_post`, `project`, `general`) | - |
| `entityId` | string | Entity-ID/Slug | - |
| `status` | string | Comment-Status (`approved`, `pending`, `flagged`, `hidden`) | `approved` |
| `authorId` | number | Filter nach Autor-ID | - |
| `limit` | number | Anzahl der Comments | 20 |
| `offset` | number | Offset für Pagination | 0 |
| `includeReplies` | boolean | Nested Replies inkludieren | true |

#### Erfolgreiche Antwort (200 OK)

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "abc123",
        "content": "Great article!",
        "authorId": 42,
        "authorName": "John Doe",
        "authorEmail": "john@example.com",
        "parentId": null,
        "entityType": "blog_post",
        "entityId": "digital-detox-kreativitaet",
        "status": "approved",
        "isEdited": false,
        "createdAt": 1704067200,
        "updatedAt": 1704067200,
        "replies": [
          {
            "id": "def456",
            "parentId": "abc123",
            "content": "Thanks!",
            ...
          }
        ],
        "reportCount": 0
      }
    ],
    "total": 42,
    "hasMore": true
  }
}
```

### 1.2. Kommentar erstellen

Erstellt einen neuen Kommentar (Guest oder Auth User).

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/comments/create`
* **Implementierung:** `src/pages/api/comments/index.ts`
* **Security:** Rate-Limiting (5/min), CSRF-Protection, Spam-Detection, XSS-Sanitization
* **Authentifizierung:** Optional (Guest-Modus möglich)

#### Request-Header

* `Content-Type: application/json`
* `X-CSRF-Token: <token>` (**erforderlich**)

#### Request-Body

**Auth User:**

```json
{
  "content": "This is my comment",
  "entityType": "blog_post",
  "entityId": "digital-detox-kreativitaet",
  "parentId": "abc123"  // Optional (für Replies)
}
```

**Guest User:**

```json
{
  "content": "This is my comment",
  "entityType": "blog_post",
  "entityId": "digital-detox-kreativitaet",
  "authorName": "Guest User",
  "authorEmail": "guest@example.com"
}
```

#### Erfolgreiche Antwort (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "xyz789",
    "content": "This is my comment",
    "authorName": "Guest User",
    "status": "pending",  // 'approved' für auth users
    "createdAt": 1704067200,
    ...
  }
}
```

#### Fehler-Responses

**Validation-Fehler (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Comment content must be at least 3 characters long"
  }
}
```

**Spam-Detection (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Comment rejected due to spam detection. Reasons: Excessive links, Suspicious keywords"
  }
}
```

**Rate-Limit (429 Too Many Requests):**

```json
{
  "success": false,
  "error": {
    "type": "rate_limit",
    "message": "Too many comments. Please wait 45 seconds."
  }
}
```

**CSRF-Fehler (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Invalid CSRF token"
  }
}
```

### 1.3. Kommentar aktualisieren

Aktualisiert einen existierenden Kommentar (nur durch Autor).

* **HTTP-Methode:** `PUT`
* **Pfad:** `/api/comments/[id]`
* **Implementierung:** `src/pages/api/comments/[id].ts`
* **Security:** Rate-Limiting (50/min), CSRF-Protection, XSS-Sanitization
* **Authentifizierung:** **Erforderlich** (nur eigene Comments)

#### Request-Body

```json
{
  "content": "Updated comment text",
  "csrfToken": "abc123..."
}
```

#### Erfolgreiche Antwort (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "xyz789",
    "content": "Updated comment text",
    "isEdited": true,
    "editedAt": 1704067500,
    ...
  }
}
```

### 1.4. Kommentar löschen

Löscht einen Kommentar (Soft-Delete → Status: `hidden`).

* **HTTP-Methode:** `DELETE`
* **Pfad:** `/api/comments/[id]`
* **Implementierung:** `src/pages/api/comments/[id].ts`
* **Security:** Rate-Limiting (50/min), CSRF-Protection
* **Authentifizierung:** **Erforderlich** (nur eigene Comments)

#### Request-Body

```json
{
  "csrfToken": "abc123..."
}
```

#### Erfolgreiche Antwort (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Comment deleted successfully"
  }
}
```

### 1.5. Kommentar moderieren

Moderiert einen Kommentar (nur Admin/Moderator).

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/comments/moderate`
* **Implementierung:** `src/pages/api/comments/moderate.ts`
* **Security:** Rate-Limiting (50/min), CSRF-Protection
* **Authentifizierung:** **Erforderlich** (Admin/Moderator-Rolle)

#### Request-Body

```json
{
  "commentId": "xyz789",
  "action": "approve",  // 'approve', 'reject', 'flag', 'hide', 'unhide'
  "reason": "Spam detected"  // Optional
}
```

#### Erfolgreiche Antwort (200 OK)

```json
{
  "success": true,
  "data": {
    "id": 123,
    "commentId": "xyz789",
    "moderatorId": 42,
    "action": "approve",
    "reason": "Spam detected",
    "createdAt": 1704067200
  }
}
```

### 1.6. Security-Features

Das Kommentarsystem implementiert mehrere Sicherheitsebenen:

#### XSS-Protection

* **DOMPurify-Sanitization** für alle User-Inputs
* Erlaubte Tags: `p`, `br`, `strong`, `em`, `u`, `a`, `code`, `pre`
* Verbotene Tags: `script`, `iframe`, `object`, `embed`
* Verbotene Attributes: `onclick`, `onerror`, `onload`

#### Spam-Detection

* **Multi-Heuristik-System** mit Score-basierter Erkennung
* Checks: Keywords, Links, Caps-Lock, Wiederholungen, Länge, Patterns
* Strictness-Levels: `low`, `medium`, `high`
* Auto-Flag bei Score > 40, Auto-Reject bei Score > 60

#### Rate-Limiting

* **Dual-Layer**: Hono-Middleware + Service-Layer
* Comment-Creation: **5 req/min** pro IP/User
* Other Endpoints: **50 req/min**

#### CSRF-Protection

* **Double-Submit Token**: Cookie `csrf_token` == Header `X-CSRF-Token`
* Enforced für alle mutierenden Operationen (POST, PUT, DELETE)

#### Audit-Logging

* Alle Aktionen in `comment_audit_logs` protokolliert
* Anonymized IP-Logging (letzte Oktett/Hextet → 0)
* Details: Action, User-ID, IP, User-Agent, Timestamp

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

### Erfolgreiche Antwort (`200 OK`)

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

### Erfolgreiche Antwort (`200 OK`)

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

### Request-Body

```json
{
  "email": "user@example.com",
  "firstName": "Max",
  "consent": true,
  "source": "website"
}
```

### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Please check your email to confirm your subscription!",
  "email": "user@example.com",
  "next_step": "confirmation_required",
  "info": "We have sent a confirmation email to your address. Please click the link in the email to complete your subscription."
}
```

### Fehlerhafte Antworten

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

### Request-Body

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

### Cookies

Der Endpunkt setzt bei Erfolg ein Session-Cookie mit folgenden Attributen:

* Name: `__Host-session`
* Pfad: `/`
* Ablauf: 7 Tage
* HttpOnly: `true`
* SameSite: `strict`
* Secure: `true`

### Erfolgreiche Antwort (Entwicklung)

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

### Fehlerhafte Antwort (Produktion)

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

### Request-Body

```json
{ "id": "<uuid>", "name": "Max Mustermann", "email": "user@example.com", "image": "https://..." }
```

### Erfolgreiche Antwort (`200 OK`)

```json
{ "success": true, "data": { "message": "User synced successfully", "userId": "<uuid>" } }
```

### Fehlerhafte Antwort (Validierung)

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
