# Projekte API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Projektverwaltung im Evolution Hub.

## Authentifizierung

Alle Endpunkte erfordern eine Authentifizierung über einen JWT, der im `Authorization`-Header als `Bearer <token>` übergeben wird.

## Security-Features

Alle Projekt-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 
  * Standard: 50 Anfragen pro Minute (standardApiLimiter)
  * Projekt-Erstellung: 5 Anfragen pro Minute (sensitiveActionLimiter)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle Projekt-Aktionen werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert
* **Berechtigungsprüfung:** Zugriffskontrolle auf Projektebene (nur Eigentümer und berechtigte Benutzer)

---

## 1. Alle Projekte abrufen

Ruft alle Projekte ab, die dem authentifizierten Benutzer zugeordnet sind.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/projects`
* **Handler-Funktion:** `getProjects` in `index.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Benutzer-spezifische Filterung

#### Query-Parameter

- `status` (optional): Filtert nach Projektstatus (active, paused, completed, archived)
- `limit` (optional): Maximale Anzahl der zurückgegebenen Projekte (Standard: 20)
- `offset` (optional): Offset für Paginierung (Standard: 0)

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "projects": [
    {
      "id": "prj_a1b2c3d4",
      "user_id": "usr_x1y2z3",
      "title": "Mein erstes Projekt",
      "description": "Dies ist eine Beschreibung für mein erstes Projekt.",
      "progress": 75,
      "status": "active",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T12:30:00Z"
    },
    {
      "id": "prj_e5f6g7h8",
      "user_id": "usr_x1y2z3",
      "title": "Ein weiteres Projekt",
      "description": "Beschreibung für ein anderes Projekt.",
      "progress": 25,
      "status": "paused",
      "created_at": "2023-10-26T08:00:00Z",
      "updated_at": "2023-10-26T09:45:00Z"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
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

## 2. Neues Projekt erstellen

Erstellt ein neues Projekt für den authentifizierten Benutzer.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/projects`
* **Handler-Funktion:** `createProject` in `index.ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Input-Validierung, Berechtigungsprüfung

#### Request-Body

```json
{
  "title": "Mein neues Projekt",
  "description": "Dies ist eine Beschreibung für mein neues Projekt.",
  "status": "active"
}
```

#### Erfolgreiche Antwort (`201 Created`)

```json
{
  "success": true,
  "project": {
    "id": "prj_i9j0k1l2",
    "user_id": "usr_x1y2z3",
    "title": "Mein neues Projekt",
    "description": "Dies ist eine Beschreibung für mein neues Projekt.",
    "progress": 0,
    "status": "active",
    "created_at": "2023-10-28T10:00:00Z",
    "updated_at": "2023-10-28T10:00:00Z"
  }
}
```

#### Fehlerhafte Antwort (`400 Bad Request`)

```json
{
  "error": "Ungültiger Projekttitel",
  "success": false
}
```

---

## 3. Projekt abrufen

Ruft die Details eines bestimmten Projekts ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/projects/:id`
* **Handler-Funktion:** `getProject` in `[id].ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Eigentümer-Validierung

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "project": {
    "id": "prj_a1b2c3d4",
    "user_id": "usr_x1y2z3",
    "title": "Mein erstes Projekt",
    "description": "Dies ist eine Beschreibung für mein erstes Projekt.",
    "progress": 75,
    "status": "active",
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-27T12:30:00Z",
    "tasks": [
      {
        "id": "tsk_m3n4o5p6",
        "project_id": "prj_a1b2c3d4",
        "title": "Task 1",
        "completed": true,
        "created_at": "2023-10-27T10:30:00Z"
      },
      {
        "id": "tsk_q7r8s9t0",
        "project_id": "prj_a1b2c3d4",
        "title": "Task 2",
        "completed": false,
        "created_at": "2023-10-27T10:45:00Z"
      }
    ]
  }
}
```

#### Fehlerhafte Antwort (`404 Not Found`)

```json
{
  "error": "Projekt nicht gefunden",
  "success": false
}
```

#### Fehlerhafte Antwort (`403 Forbidden`)

```json
{
  "error": "Keine Berechtigung für dieses Projekt",
  "success": false
}
```

---

## 4. Projekt aktualisieren

Aktualisiert die Details eines bestimmten Projekts.

* **HTTP-Methode:** `PUT`
* **Pfad:** `/api/projects/:id`
* **Handler-Funktion:** `updateProject` in `[id].ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Input-Validierung, Eigentümer-Validierung

#### Request-Body

```json
{
  "title": "Aktualisierter Projekttitel",
  "description": "Dies ist eine aktualisierte Beschreibung.",
  "progress": 80,
  "status": "active"
}
```

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "project": {
    "id": "prj_a1b2c3d4",
    "user_id": "usr_x1y2z3",
    "title": "Aktualisierter Projekttitel",
    "description": "Dies ist eine aktualisierte Beschreibung.",
    "progress": 80,
    "status": "active",
    "created_at": "2023-10-27T10:00:00Z",
    "updated_at": "2023-10-28T14:30:00Z"
  }
}
```

#### Fehlerhafte Antwort (`404 Not Found`)

```json
{
  "error": "Projekt nicht gefunden",
  "success": false
}
```

---

## 5. Projekt löschen

Löscht ein bestimmtes Projekt.

* **HTTP-Methode:** `DELETE`
* **Pfad:** `/api/projects/:id`
* **Handler-Funktion:** `deleteProject` in `[id].ts`
* **Security:** Rate-Limiting (5/min), Security-Headers, Audit-Logging, Eigentümer-Validierung

#### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "message": "Projekt erfolgreich gelöscht"
}
```

#### Fehlerhafte Antwort (`404 Not Found`)

```json
{
  "error": "Projekt nicht gefunden",
  "success": false
}
```

---

## 6. Sicherheitsrichtlinien

### Zugriffskontrolle

- Projekte sind nur für den Eigentümer und explizit berechtigte Benutzer zugänglich
- Alle Zugriffe werden protokolliert und auf Berechtigung geprüft
- Keine Preisgabe von Projektdaten an unbefugte Benutzer
- Konsistente Fehlerantworten ohne Informationslecks

### Datenschutz

- Verschlüsselte Übertragung aller Projektdaten (HTTPS)
- Sichere Speicherung in der Datenbank (Cloudflare D1)
- Regelmäßige Backups der Projektdaten
- Löschung inaktiver Projekte nach definiertem Zeitraum (optional)

### Audit-Trail

- Protokollierung aller Projektänderungen
- Nachverfolgbarkeit von Bearbeitungen und Löschungen
- Zeitstempel für alle Aktionen
- Benutzer-ID für alle Änderungen
