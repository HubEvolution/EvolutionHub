# Öffentliche API Endpunkte

Dieses Dokument beschreibt die öffentlich zugänglichen API-Endpunkte im Evolution Hub.

## Authentifizierung

Im Gegensatz zu anderen API-Endpunkten erfordern die öffentlichen APIs keine Authentifizierung. Sie sind für alle Benutzer zugänglich, unterliegen jedoch strengen Rate-Limiting-Regeln.

## Security-Features

Alle öffentlichen API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (standardApiLimiter)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle API-Zugriffe werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert
* **Content-Filterung:** Benutzergenerierte Inhalte werden gefiltert und sanitisiert

---

## 1. Kommentare API

### 1.1. Kommentare abrufen

Ruft Kommentare für eine bestimmte Ressource ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/comments`
* **Handler-Funktion:** `getComments` in `comments.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Content-Filterung

#### Query-Parameter

- `resource_id` (erforderlich): ID der Ressource, für die Kommentare abgerufen werden sollen
- `resource_type` (erforderlich): Typ der Ressource (z.B. "project", "tool", "article")
- `limit` (optional): Maximale Anzahl der zurückgegebenen Kommentare (Standard: 20)
- `offset` (optional): Offset für Paginierung (Standard: 0)

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "comments": [
    {
      "id": "cmt_a1b2c3d4",
      "resource_id": "prj_x1y2z3",
      "resource_type": "project",
      "user_id": "usr_m1n2o3",
      "user_name": "Max Mustermann",
      "user_avatar": "https://example.com/avatars/usr_m1n2o3.jpg",
      "content": "Dies ist ein Kommentar zum Projekt.",
      "created_at": "2023-10-27T10:00:00Z"
    },
    {
      "id": "cmt_e5f6g7h8",
      "resource_id": "prj_x1y2z3",
      "resource_type": "project",
      "user_id": "usr_p4q5r6",
      "user_name": "Erika Musterfrau",
      "user_avatar": "https://example.com/avatars/usr_p4q5r6.jpg",
      "content": "Ein weiterer Kommentar zum Projekt.",
      "created_at": "2023-10-27T11:30:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ressourcen-ID und Ressourcen-Typ sind erforderlich",
  "success": false
}
```

### 1.2. Kommentar erstellen

Erstellt einen neuen Kommentar für eine bestimmte Ressource.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/comments`
* **Handler-Funktion:** `createComment` in `comments.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Input-Validierung, Content-Filterung
* **Authentifizierung:** Erfordert einen gültigen JWT-Token im `Authorization`-Header

#### Request-Body

```json
{
  "resource_id": "prj_x1y2z3",
  "resource_type": "project",
  "content": "Dies ist mein neuer Kommentar zum Projekt."
}
```

#### Erfolgreiche Antwort (`201 Created`)

```json
{
  "success": true,
  "comment": {
    "id": "cmt_i9j0k1l2",
    "resource_id": "prj_x1y2z3",
    "resource_type": "project",
    "user_id": "usr_x1y2z3",
    "user_name": "Max Mustermann",
    "user_avatar": "https://example.com/avatars/usr_x1y2z3.jpg",
    "content": "Dies ist mein neuer Kommentar zum Projekt.",
    "created_at": "2023-10-28T10:00:00Z"
  }
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ungültiger Kommentarinhalt",
  "success": false
}
```

---

## 2. Tools API

### 2.1. Tools abrufen

Ruft eine Liste aller verfügbaren Tools ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/tools`
* **Handler-Funktion:** `getTools` in `tools.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging

#### Query-Parameter

- `category` (optional): Filtert nach Tool-Kategorie
- `limit` (optional): Maximale Anzahl der zurückgegebenen Tools (Standard: 50)
- `offset` (optional): Offset für Paginierung (Standard: 0)

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "tools": [
    {
      "id": "tool_a1b2c3d4",
      "name": "JSON Formatter",
      "description": "Formatiert und validiert JSON-Daten.",
      "category": "development",
      "url": "/tools/json-formatter",
      "icon": "code",
      "popularity": 95,
      "created_at": "2023-09-15T10:00:00Z"
    },
    {
      "id": "tool_e5f6g7h8",
      "name": "Markdown Editor",
      "description": "Ein einfacher Markdown-Editor mit Vorschau.",
      "category": "content",
      "url": "/tools/markdown-editor",
      "icon": "edit",
      "popularity": 87,
      "created_at": "2023-09-20T14:30:00Z"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

### 2.2. Tool abrufen

Ruft die Details eines bestimmten Tools ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/tools/:id`
* **Handler-Funktion:** `getTool` in `tools.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "tool": {
    "id": "tool_a1b2c3d4",
    "name": "JSON Formatter",
    "description": "Formatiert und validiert JSON-Daten.",
    "category": "development",
    "url": "/tools/json-formatter",
    "icon": "code",
    "popularity": 95,
    "usage_count": 12500,
    "features": [
      "JSON-Validierung",
      "Formatierung mit verschiedenen Einrückungsoptionen",
      "Fehlerhervorhebung",
      "JSON-zu-CSV-Konvertierung"
    ],
    "created_at": "2023-09-15T10:00:00Z",
    "updated_at": "2023-10-20T08:45:00Z"
  }
}
```

#### Fehlerhafte Antwort (`404 Not Found`)

```json
{
  "error": "Tool nicht gefunden",
  "success": false
}
```

---

## 3. Sicherheitsrichtlinien

### Content-Sicherheit

- Alle benutzergenerierten Inhalte werden gefiltert und sanitisiert
- XSS-Schutz durch Entfernung potenziell gefährlicher HTML-Tags und Attribute
- Keine Ausführung von JavaScript in benutzergenerierten Inhalten
- Maximale Länge für Kommentare und andere Benutzereingaben

### Anti-Spam-Maßnahmen

- Rate-Limiting für alle öffentlichen API-Endpunkte
- CAPTCHA-Integration für Kommentarfunktionen (optional)
- Automatische Erkennung und Blockierung von Spam-Mustern
- Möglichkeit zur Meldung unangemessener Inhalte

### Datenschutz

- Keine Preisgabe sensibler Benutzerinformationen
- Minimale Benutzerinformationen in öffentlichen Antworten
- Verschlüsselte Übertragung aller Daten (HTTPS)
- Keine Speicherung von IP-Adressen oder Tracking-Daten ohne Einwilligung
