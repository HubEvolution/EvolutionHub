# Dashboard API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für das Benutzer-Dashboard.

## Authentifizierung

Alle Endpunkte erfordern eine Authentifizierung über eine Server-Session (HttpOnly-Cookie `__Host-session`). Die Prüfung erfolgt zentral über `withAuthApiMiddleware`.

## Security-Features

Alle Dashboard-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (`standardApiLimiter`)
* **Security-Headers:** Alle Standard-Security-Headers werden angewendet
* **Audit-Logging:** Alle API-Zugriffe werden protokolliert
* **Input-Validierung:** Alle Eingabeparameter werden validiert und sanitisiert
* **Benutzer-Filterung:** Daten werden nur für den authentifizierten Benutzer zurückgegeben

---

## 1. Projekte

### 1.1. Alle Projekte eines Benutzers abrufen

Ruft eine Liste aller Projekte ab, die dem authentifizierten Benutzer zugeordnet sind.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/projects`
* **Handler-Funktion:** GET-Handler in `dashboard/projects.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Benutzer-Filterung

### Beispielhafte Antwort (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "prj_a1b2c3d4",
      "user_id": "usr_x1y2z3",
      "title": "Mein erstes Projekt",
      "description": "Dies ist eine Beschreibung für mein erstes Projekt.",
      "progress": 75,
      "status": "active",
      "created_at": "2023-10-27T10:00:00Z",
      "updated_at": "2023-10-27T12:30:00Z"
    }
  ]
}
```

---

## 2. Aktivitäten

### 2.1. Letzte Aktivitäten eines Benutzers abrufen

Ruft eine Liste der letzten Aktivitäten des authentifizierten Benutzers ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/activity`
* **Handler-Funktion:** GET-Handler in `activity.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Benutzer-Filterung

### Beispielhafte Antwort (`200 OK`)

```json
{
  "success": true,
  "data": [
    {
      "id": "act_n4o5p6q7",
      "user": "Max Mustermann",
      "action": "created_project",
      "timestamp": "2023-10-27T10:00:00Z",
      "icon": "✨",
      "color": "text-purple-400"
    }
  ]
}
```

---

## 3. Statistiken

Ruft aggregierte Dashboard-Statistiken ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/stats`
* **Handler-Funktion:** GET-Handler in `stats.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Benutzer-Filterung

### Beispielhafte Antwort (`200 OK`)

```json
{
  "success": true,
  "data": { "projects": 3, "tasks": 12, "teamMembers": 5 }
}
```

---

## 4. Benachrichtigungen

Ruft die letzten Benachrichtigungen des authentifizierten Benutzers ab (max. 10).

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/notifications`
* **Handler-Funktion:** GET-Handler in `notifications.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Benutzer-Filterung

Hinweis: Die Antwort enthält die letzten Einträge aus der Tabelle `notifications` als Array in `data`. Feldnamen entsprechen dem Datenbankschema.

---

## 5. Quick Actions (öffentlich)

Liefert die verfügbaren Quick Actions. Keine Authentifizierung erforderlich.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/quick-actions`
* **Handler-Funktion:** GET-Handler in `quick-actions.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging
* **Authentifizierung:** nicht erforderlich

### Beispielhafte Antwort (`200 OK`)

```json
{
  "success": true,
  "data": [
    { "id": "qa1", "title": "New Post", "description": "Write a new blog article.", "icon": "✍️", "variant": "primary", "action": "createPost" }
  ]
}
```

---

## 6. Aktion ausführen

Führt eine Dashboard-Aktion aus.

* **HTTP-Methode:** `POST`
* **Pfad:** `/api/dashboard/perform-action`
* **Handler-Funktion:** POST-Handler in `perform-action.ts`
* **Security:** Rate-Limiting (50/min über `standardApiLimiter`), Security-Headers, Audit-Logging, Benutzer-Filterung, Input-Validierung

### Request-Body (JSON)

```json
{ "action": "create_project" }
```

Unterstützte Aktionen: `create_project`, `create_task`, `invite_member`, `view_docs`.

### Erfolgreiche Antwort (`200 OK`)

```json
{ "success": true, "data": { "message": "Project created successfully", "projectId": "prj_..." } }
```

### Fehlerhafte Antwort (`400 Bad Request`)

```json
{ "success": false, "error": { "type": "validation_error", "message": "Invalid action: <action>" } }
