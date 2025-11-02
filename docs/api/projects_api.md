<!-- markdownlint-disable MD051 -->

# Projekte API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für die Projektverwaltung im Evolution Hub.

## Authentifizierung

Alle Endpunkte erfordern eine Authentifizierung über eine Server-Session (HttpOnly-Cookie `__Host-session`). Die Prüfung erfolgt zentral über `withAuthApiMiddleware`.

## Security-Features

Alle Projekt-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (`standardApiLimiter`)

* **Security-Headers:** Alle Standard-Security-Headers werden angewendet

* **Audit-Logging:** Alle Projekt-Aktionen werden protokolliert

* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert

* **Berechtigungsprüfung:** Zugriffskontrolle auf Projektebene (nur Eigentümer und berechtigte Benutzer)

---

## 1. Alle Projekte abrufen

Ruft alle Projekte ab, die dem authentifizierten Benutzer zugeordnet sind.

* **HTTP-Methode:** `GET`

* **Pfad:** `/api/dashboard/projects`

* **Handler-Funktion:** GET-Handler in `dashboard/projects.ts`

* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Benutzer-spezifische Filterung

### Erfolgreiche Antwort (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "prj_a1b2c3d4",
      "title": "Mein erstes Projekt",
      "description": "Beschreibung",
      "progress": 75,
      "status": "active",
      "lastUpdated": "2023-10-27T12:30:00Z",
      "members": []
    }
  ]
}

```text

### Fehlerhafte Antwort (`401 Unauthorized`)

```json
{ "success": false, "error": { "type": "auth_error", "message": "Für diese Aktion ist eine Anmeldung erforderlich" } }
```

---

## 2. Neues Projekt erstellen

Erstellt ein neues Projekt für den authentifizierten Benutzer.

* **HTTP-Methode:** `POST`

* **Pfad:** `/api/projects`

* **Handler-Funktion:** POST-Handler in `index.ts`

* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Input-Validierung

### Request-Body

```json
{
  "title": "Mein neues Projekt",
  "description": "Dies ist eine Beschreibung für mein neues Projekt.",
  "status": "active"
}

```text

### Erfolgreiche Antwort (`201 Created`)

```json
{
  "success": true,
  "data": {
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

### Fehlerhafte Antwort (`400 Bad Request`)

```json
{ "success": false, "error": { "type": "validation_error", "message": "Title is required" } }

```text

---

## 3. Projekt abrufen

Status: **Nicht implementiert.**
Dieser Endpunkt ist derzeit nicht funktional und gibt bei Aufruf einen 404-Fehler zurück. Laut Codebasis ist kein spezifischer Handler für GET `/api/projects/:id` vorhanden.

Ruft die Details eines bestimmten Projekts ab.

* **HTTP-Methode:** `GET`

* **Pfad:** `/api/projects/:id`

* **Hander-Datei:** Nicht vorhanden in `src/pages/api/projects/`.

* **Security:** Theoretisch Rate-Limiting (50/min), Security-Headers, Audit-Logging, Eigentümer-Validierung

### Theoretische Erfolgreiche Antwort (`200 OK`)

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

### Theoretische Fehlerhafte Antwort (`404 Not Found` / `403 Forbidden`)

```json
{
  "error": "Projekt nicht gefunden",
  "success": false
}

```text

---

## 4. Projekt aktualisieren

Status: **Nicht implementiert.**
Dieser Endpunkt ist derzeit nicht funktional und gibt bei Aufruf einen 404-Fehler zurück. Laut Codebasis ist kein spezifischer Handler für PUT `/api/projects/:id` vorhanden.

Aktualisiert die Details eines bestimmten Projekts.

* **HTTP-Methode:** `PUT`

* **Pfad:** `/api/projects/:id`

* **Handler-Datei:** Nicht vorhanden in `src/pages/api/projects/`.

* **Security:** Theoretisch Rate-Limiting (5/min), Security-Headers, Audit-Logging, Input-Validierung, Eigentümer-Validierung

### Theoretischer Request-Body

```json
{
  "title": "Aktualisierter Projekttitel",
  "description": "Dies ist eine aktualisierte Beschreibung.",
  "progress": 80,
  "status": "active"
}
```

### Theoretische Erfolgreiche Antwort (`200 OK`) (2)

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

```text

### Theoretische Fehlerhafte Antwort (`404 Not Found`)

```json
{
  "error": "Projekt nicht gefunden",
  "success": false
}
```

---

## 5. Projekt löschen

Status: **Nicht implementiert.**
Dieser Endpunkt ist derzeit nicht funktional und gibt bei Aufruf einen 404-Fehler zurück. Laut Codebasis ist kein spezifischer Handler für DELETE `/api/projects/:id` vorhanden.

Löscht ein bestimmtes Projekt.

* **HTTP-Methode:** `DELETE`

* **Pfad:** `/api/projects/:id`

* **Handler-Datei:** Nicht vorhanden in `src/pages/api/projects/`.

* **Security:** Theoretisch Rate-Limiting (5/min), Security-Headers, Audit-Logging, Eigentümer-Validierung

### Theoretische Erfolgreiche Antwort (`200 OK`) (2) (2)

```json
{
  "success": true,
  "message": "Projekt erfolgreich gelöscht"
}

```text

### Theoretische Fehlerhafte Antwort (`404 Not Found`) (2)

```json
{
  "error": "Projekt nicht gefunden",
  "success": false
}
```

---

## 6. Sicherheitsrichtlinien

### Zugriffskontrolle

* Projekte sind nur für den Eigentümer und explizit berechtigte Benutzer zugänglich

* Alle Zugriffe werden protokolliert und auf Berechtigung geprüft

* Keine Preisgabe von Projektdaten an unbefugte Benutzer

* Konsistente Fehlerantworten ohne Informationslecks

### Datenschutz

* Verschlüsselte Übertragung aller Projektdaten (HTTPS)

* Sichere Speicherung in der Datenbank (Cloudflare D1)

* Regelmäßige Backups der Projektdaten

* Löschung inaktiver Projekte nach definiertem Zeitraum (optional)

### Audit-Trail

* Protokollierung aller Projektänderungen

* Nachverfolgbarkeit von Bearbeitungen und Löschungen

* Zeitstempel für alle Aktionen

* Benutzer-ID für alle Änderungen
