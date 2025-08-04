# Dashboard API Endpunkte

Dieses Dokument beschreibt die API-Endpunkte für das Benutzer-Dashboard.

## Authentifizierung

Alle Endpunkte erfordern eine Authentifizierung über einen JWT, der im `Authorization`-Header als `Bearer <token>` übergeben wird.

## Security-Features

Alle Dashboard-API-Endpunkte sind mit folgenden Sicherheitsmaßnahmen ausgestattet:

* **Rate-Limiting:** 50 Anfragen pro Minute (standardApiLimiter)
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
* **Handler-Funktion:** `getProjects` in `dashboard.handler.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Benutzer-Filterung

#### Beispielhafte Antwort (`200 OK`)

```json
[
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
]
```

---

## 2. Aktivitäten

### 2.1. Letzte Aktivitäten eines Benutzers abrufen

Ruft eine Liste der letzten Aktivitäten des authentifizierten Benutzers ab.

* **HTTP-Methode:** `GET`
* **Pfad:** `/api/dashboard/activities`
* **Handler-Funktion:** `getActivities` in `dashboard.handler.ts`
* **Security:** Rate-Limiting (50/min), Security-Headers, Audit-Logging, Benutzer-Filterung

#### Beispielhafte Antwort (`200 OK`)

```json
[
  {
    "id": "act_n4o5p6q7",
    "user_id": "usr_x1y2z3",
    "action": "created_project",
    "target_id": "prj_a1b2c3d4",
    "target_type": "project",
    "created_at": "2023-10-27T10:00:00Z"
  },
  {
    "id": "act_m1l2k3j4",
    "user_id": "usr_x1y2z3",
    "action": "updated_profile",
    "target_id": "usr_x1y2z3",
    "target_type": "user",
    "created_at": "2023-10-27T09:00:00Z"
  }
]
```

---

## 3. Neue Handler-Funktionen

Die folgenden Handler-Funktionen müssen in einer neuen Datei `cloudflare/workers/src/handlers/dashboard.handler.ts` erstellt werden:

* `getProjects(c: Context)`: Diese Funktion ist verantwortlich für das Abrufen der Projekte des Benutzers aus der Datenbank.
* `getActivities(c: Context)`: Diese Funktion ist verantwortlich für das Abrufen der letzten Aktivitäten des Benutzers.

---

## 4. Speicherarchitektur

Für die Speicherung der Dashboard-Daten (`projects` und `activities`) wurden verschiedene Cloudflare-Speicherlösungen evaluiert. Die Entscheidung basiert auf den Anforderungen des relationalen Datenmodells, das in `db_schema.md` definiert ist.

### 4.1. Evaluierte Optionen

* **Cloudflare D1 (Relationale Datenbank):**
  * **Analyse:** D1 ist eine SQL-Datenbank, die für relationale Daten optimiert ist. Sie unterstützt komplexe Abfragen, Fremdschlüsselbeziehungen und Transaktionen. Dies passt perfekt zum definierten Schema, in dem `projects` und `activities` klare Beziehungen zu `users` haben.
  * **Bewertung:** Sehr gut geeignet. Die Abfrage von Projekten für einen bestimmten Benutzer oder das Verknüpfen von Aktivitäten mit Projekten ist einfach und effizient. Die starke Konsistenz von D1 gewährleistet die Datenintegrität.

* **Cloudflare KV (Key-Value-Speicher):**
  * **Analyse:** KV ist ein global verteilter Key-Value-Speicher, der für hohe Leseleistung optimiert ist. Er bietet keine Unterstützung für relationale Abfragen oder komplexe Filter. Beziehungen müssten manuell in der Anwendungslogik verwaltet werden (z.B. durch Speichern von Listen von Projekt-IDs pro Benutzer).
  * **Bewertung:** Ungeeignet. Der Abfrageaufwand wäre hoch und die Implementierung komplex und fehleranfällig. Die "eventual consistency" ist für transaktionale Daten wie die Erstellung eines neuen Projekts nicht ideal.

* **Cloudflare R2 (Objektspeicher):**
  * **Analyse:** R2 ist für die Speicherung großer, unstrukturierter Daten wie Mediendateien, Backups oder Logs konzipiert. Es bietet keine Datenbank-ähnlichen Abfragefunktionen.
  * **Bewertung:** Völlig ungeeignet. R2 ist nicht für strukturierte, relationale Anwendungsdaten vorgesehen.

### 4.2. Empfehlung

**Die klare Empfehlung ist die Verwendung von Cloudflare D1.**

D1 ist die einzige der evaluierten Lösungen, die die relationalen Anforderungen der Anwendung nativ unterstützt. Die Verwendung von D1 führt zu einer einfacheren, robusteren und performanteren Implementierung der Dashboard-API. Das bestehende Datenbankschema ist bereits für D1 optimiert.
