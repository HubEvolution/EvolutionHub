<!-- markdownlint-disable MD051 -->

# Datenfluss-Dokumentation

Diese Dokumentation beschreibt die Datenflüsse innerhalb des Evolution Hub Systems, einschließlich der Interaktionen zwischen den verschiedenen Systemkomponenten und der Datenverarbeitung.

## Inhaltsverzeichnis

1. [Allgemeine Datenfluss-Architektur](#allgemeine-datenfluss-architektur)
1. [API-Request-Lifecycle](#api-request-lifecycle)
1. [Datenfluss-Diagramme](#datenfluss-diagramme)

   - [Benutzerauthentifizierung](#benutzerauthentifizierung)

   - [Projektverwaltung](#projektverwaltung)

   - [Dashboard-Daten](#dashboard-daten)

   - [Öffentliche APIs](#offentliche-apis)

1. [Datenvalidierung und -transformation](#datenvalidierung-und-transformation)
1. [Fehlerbehandlung](#fehlerbehandlung)
1. [Caching-Strategien](#caching-strategien)

---

## Allgemeine Datenfluss-Architektur

Der Datenfluss im Evolution Hub folgt einem mehrschichtigen Architekturmuster:

```mermaid
graph TD
    Client[Client] --> |HTTP Request| APILayer[API Layer]
    APILayer --> |Validierte Daten| ServiceLayer[Service Layer]
    ServiceLayer --> |Geschäftslogik| DataLayer[Data Layer]
    DataLayer --> |DB Operationen| Database[(Cloudflare D1)]
    Database --> |Rohdaten| DataLayer
    DataLayer --> |Transformierte Daten| ServiceLayer
    ServiceLayer --> |Verarbeitete Daten| APILayer
    APILayer --> |HTTP Response| Client

```text

### Datenfluss-Prinzipien

1. **Unidirektionaler Datenfluss**: Daten fließen in einer vorhersehbaren Richtung
1. **Klare Schichtenverantwortlichkeiten**:

   - API-Layer: Request/Response-Handling, Input-Validierung

   - Service-Layer: Geschäftslogik, Datenverarbeitung

   - Data-Layer: Datenbankoperationen, Datenmodellierung

1. **Typsicherheit**: TypeScript-Typen für alle Datenstrukturen
1. **Validierung an den Grenzen**: Eingehende Daten werden an den Systemgrenzen validiert

---

## API-Request-Lifecycle

Jede API-Anfrage durchläuft folgende Phasen:

### 1. Eingangsphase

- **Middleware-Verarbeitung**: Authentifizierung, Rate-Limiting, Security-Headers

- **Input-Validierung**: Überprüfung der Anfrageparameter und des Request-Body

- **Autorisierung**: Überprüfung der Benutzerberechtigungen

### 2. Verarbeitungsphase

- **Service-Aufruf**: Weiterleitung an den entsprechenden Service

- **Geschäftslogik**: Anwendung der Geschäftsregeln

### 3. Antwortphase

- **Datentransformation**: Umwandlung der internen Datenstrukturen in API-Antworten

- **Fehlerbehandlung**: Umwandlung von Fehlern in konsistente API-Fehlerantworten

- **Response-Generierung**: Erstellung der HTTP-Antwort mit

```mermaid
sequenceDiagram
    participant APIHandler
    participant Service
    participant Repository
    participant Database

    Client->>Middleware: HTTP Request
    Middleware->>Middleware: Authentifizierung
    Middleware->>Middleware: Rate-Limiting
    Middleware->>Middleware: Security-Headers
    Middleware->>APIHandler: Validierte Anfrage
    APIHandler->>APIHandler: Input-Validierung
    APIHandler->>APIHandler: Autorisierung
    APIHandler->>Service: Service-Aufruf
    Service->>Service: Geschäftslogik
    Service->>Repository: Datenbank-Operation
    Repository->>Database: SQL-Query
    Database->>Repository: Rohdaten
    Repository->>Service: Transformierte Daten
    Service->>APIHandler: Verarbeitete Daten
    APIHandler->>Client: HTTP Response
```

---

## Datenfluss-Diagramme

### Benutzerauthentifizierung

Hinweis (historisch): Das folgende Sequenzdiagramm zeigt den früheren Passwort-/JWT‑Login‑Flow. Der aktuelle Auth‑Flow basiert auf Magic Link (siehe `docs/architecture/auth-migration-stytch.md`).

Der Authentifizierungsdatenfluss umfasst Login, Registrierung und Sitzungsverwaltung:

```mermaid
sequenceDiagram
    participant Client
    participant AuthAPI
    participant AuthService
    participant UserRepository
    participant Database
    participant JWTService

    %% Login-Flow
    Client->>AuthAPI: POST /api/auth/login
    AuthAPI->>AuthAPI: Validiere Anmeldedaten
    AuthAPI->>AuthService: login(email, password)
    AuthService->>UserRepository: findUserByEmail(email)
    UserRepository->>Database: SELECT * FROM users WHERE email = ?
    Database->>UserRepository: User-Daten
    UserRepository->>AuthService: User-Objekt
    AuthService->>AuthService: Überprüfe Passwort-Hash
    AuthService->>JWTService: generateToken(userId, roles)
    JWTService->>AuthService: JWT-Token
    AuthService->>AuthAPI: Session-Informationen
    AuthAPI->>Client: HTTP Response mit HttpOnly-Cookie

```text

#### Aktueller Magic‑Link (Stytch) — Sequenz

```mermaid
sequenceDiagram
    participant Client
    participant AuthAPI as Auth API (/api/auth/magic)
    participant Stytch as Stytch
    participant Callback as Auth Callback (/api/auth/callback)
    participant Middleware as Global Middleware
    participant D1 as D1 (sessions)

    %% 1) Magic Link anfordern
    Client->>AuthAPI: POST /api/auth/magic/request (email)
    AuthAPI->>Stytch: login_or_create(email)
    Stytch-->>Client: E‑Mail mit Magic‑Link

    %% 2) Nutzer klickt Link
    Client->>Callback: GET /api/auth/callback?token=...
    Callback->>Stytch: authenticate(token)
    Stytch-->>Callback: user/session ok
    Callback->>D1: create session(user_id)
    Callback->>Client: Set‑Cookie __Host-session=...; Path=/; Secure; HttpOnly; SameSite=Strict
    Callback->>Client: 302 Redirect → /dashboard (locale‑aware)

    %% 3) Nachgelagerte Requests
    Client->>Middleware: GET /dashboard (mit __Host-session)
    Middleware->>D1: validateSession(session_id)
    D1-->>Middleware: session,user
    Middleware-->>Client: Response mit Security‑Headern (CSP/HSTS/…)
```

### Projektverwaltung

Der Datenfluss für die Projektverwaltung umfasst das Erstellen, Abrufen, Aktualisieren und Löschen von Projekten:

```mermaid
sequenceDiagram
    participant Client
    participant ProjectAPI
    participant ProjectService
    participant ProjectRepository
    participant Database

    %% Projekt erstellen
    Client->>ProjectAPI: POST /api/projects
    ProjectAPI->>ProjectAPI: Validiere Projektdaten
    ProjectAPI->>ProjectAPI: Autorisiere Benutzer
    ProjectAPI->>ProjectService: createProject(projectData, userId)
    ProjectService->>ProjectService: Anwenden von Geschäftsregeln
    ProjectService->>ProjectRepository: save(projectEntity)
    ProjectRepository->>Database: INSERT INTO projects
    Database->>ProjectRepository: Project ID
    ProjectRepository->>ProjectService: Gespeichertes Projekt
    ProjectService->>ProjectAPI: Projekt-Objekt
    ProjectAPI->>Client: HTTP Response mit Projekt-Daten

```text

### Dashboard-Daten

Der Datenfluss für das Dashboard umfasst das Abrufen von Benutzeraktivitäten, Projekten und Statistiken:

```mermaid
sequenceDiagram
    participant Client
    participant DashboardAPI
    participant DashboardService
    participant UserService
    participant ProjectService
    participant ActivityService
    participant Database

    Client->>DashboardAPI: GET /api/dashboard
    DashboardAPI->>DashboardAPI: Autorisiere Benutzer
    DashboardAPI->>DashboardService: getDashboardData(userId)

    par Parallele Datenabrufe
        DashboardService->>UserService: getUserProfile(userId)
        UserService->>Database: SELECT * FROM users WHERE id = ?
        Database->>UserService: User-Daten
        UserService->>DashboardService: User-Profil

        DashboardService->>ProjectService: getUserProjects(userId)
        ProjectService->>Database: SELECT * FROM projects WHERE user_id = ?
        Database->>ProjectService: Projekt-Daten
        ProjectService->>DashboardService: Projekt-Liste

        DashboardService->>ActivityService: getRecentActivities(userId)
        ActivityService->>Database: SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        Database->>ActivityService: Aktivitäts-Daten
        ActivityService->>DashboardService: Aktivitäts-Liste
    end

    DashboardService->>DashboardAPI: Aggregierte Dashboard-Daten
    DashboardAPI->>Client: HTTP Response mit Dashboard-Daten
```

### Öffentliche APIs

Der Datenfluss für öffentliche APIs wie Kommentare und Tools:

```mermaid
sequenceDiagram
    participant Client
    participant PublicAPI
    participant ContentService
    participant Repository
    participant Database
    participant RateLimiter

    Client->>PublicAPI: GET /api/comments
    PublicAPI->>RateLimiter: checkRateLimit(clientIP)
    RateLimiter->>PublicAPI: Rate-Limit-Status
    PublicAPI->>ContentService: getComments(filters)
    ContentService->>Repository: findComments(filters)
    Repository->>Database: SELECT * FROM comments WHERE...
    Database->>Repository: Kommentar-Daten
    Repository->>ContentService: Kommentar-Liste
    ContentService->>PublicAPI: Verarbeitete Kommentare
    PublicAPI->>Client: HTTP Response mit Kommentaren

```text

---

## Datenvalidierung und -transformation

Evolution Hub implementiert mehrere Schichten der Datenvalidierung und -transformation:

### Eingangsvalidierung

- **API-Ebene**: Validierung aller eingehenden Anfragen

- **Typisierte Schemas**: Verwendung von TypeScript-Interfaces für Request/Response-Typen

- **Validierungsregeln**: Spezifische Regeln für Felder (Länge, Format, Bereich)

### Datentransformation

- **DTO-Muster**: Data Transfer Objects für die Kommunikation zwischen Schichten

- **Mapping-Funktionen**: Umwandlung zwischen DTOs, Domain-Modellen und Datenbankentitäten

- **Serialisierung/Deserialisierung**: Umwandlung zwischen JSON und Objekten

### Beispiel für Datenvalidierung und -transformation

```typescript
// API-Ebene: Eingangsvalidierung
interface CreateProjectRequest {
  name: string;
  description: string;
  isPublic: boolean;
}

// Validierungsfunktion
function validateCreateProjectRequest(req: any): CreateProjectRequest {
  if (!req.name || typeof req.name !== 'string' || req.name.length < 3) {
    throw new ValidationError('Name must be at least 3 characters');
  }

  if (req.description && typeof req.description !== 'string') {
    throw new ValidationError('Description must be a string');
  }

  if (typeof req.isPublic !== 'boolean') {
    throw new ValidationError('isPublic must be a boolean');
  }

  return {
    name: req.name,
    description: req.description || '',
    isPublic: req.isPublic,
  };
}

// Service-Ebene: Transformation in Domain-Modell
interface ProjectEntity {
  id?: string;
  name: string;
  description: string;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

function createProjectEntity(dto: CreateProjectRequest, userId: string): ProjectEntity {
  const now = new Date();
  return {
    name: dto.name,
    description: dto.description,
    isPublic: dto.isPublic,
    userId,
    createdAt: now,
    updatedAt: now,
  };
}
```

---

## Fehlerbehandlung

Evolution Hub implementiert ein konsistentes Fehlerbehandlungssystem:

### Fehlertypen

- **ValidationError**: Fehler bei der Eingabevalidierung

- **AuthenticationError**: Fehler bei der Authentifizierung

- **AuthorizationError**: Fehler bei der Autorisierung

- **NotFoundError**: Ressource nicht gefunden

- **ConflictError**: Konflikt mit bestehenden Daten

- **DatabaseError**: Fehler bei Datenbankoperationen

- **InternalError**: Interne Serverfehler

### Fehlerbehandlungs-Workflow

```mermaid
graph TD
    Error[Fehler tritt auf] --> ErrorType{Fehlertyp?}
    ErrorType -->|ValidationError| Status400[HTTP 400 Bad Request]
    ErrorType -->|AuthenticationError| Status401[HTTP 401 Unauthorized]
    ErrorType -->|AuthorizationError| Status403[HTTP 403 Forbidden]
    ErrorType -->|NotFoundError| Status404[HTTP 404 Not Found]
    ErrorType -->|ConflictError| Status409[HTTP 409 Conflict]
    ErrorType -->|DatabaseError| Status500[HTTP 500 Internal Server Error]
    ErrorType -->|InternalError| Status500

    Status400 --> Response[Fehlerantwort generieren]
    Status401 --> Response
    Status403 --> Response
    Status404 --> Response
    Status409 --> Response
    Status500 --> Response

    Response --> Log[Fehler loggen]
    Log --> Client[Antwort an Client senden]

```text

### Beispiel für Fehlerbehandlung

```typescript
try {
  // API-Operation
} catch (error) {
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({
        error: 'Validation Error',
        message: error.message,
        details: error.details,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error instanceof AuthenticationError) {
    return new Response(
      JSON.stringify({
        error: 'Authentication Error',
        message: error.message,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Weitere Fehlertypen...

  // Unbekannter Fehler
  console.error('Unhandled error:', error);
  return new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

---

## Caching-Strategien

Evolution Hub implementiert mehrere Caching-Strategien zur Leistungsoptimierung:

### Edge-Caching

- **Statische Assets**: Lange Cache-Lebensdauer für unveränderliche Ressourcen

- **API-Antworten**: Selektives Caching für häufig abgerufene, selten geänderte Daten

- **Cache-Control-Header**: Steuerung des Browser- und CDN-Cachings

### In-Memory-Caching

- **Häufig abgerufene Daten**: Temporäres Caching im Worker-Kontext

- **Konfigurationsdaten**: Caching von selten geänderten Konfigurationen

- **Benutzerberechtigungen**: Caching von Berechtigungen für schnellere Autorisierung

### Beispiel für Caching-Implementierung

```typescript
// Edge-Caching für öffentliche API-Antworten
export async function onRequest(context) {
  const { request, env } = context;

  // Nur GET-Anfragen cachen
  if (request.method !== 'GET') {
    return await handleRequest(context);
  }

  const url = new URL(request.url);

  // Caching-Strategie basierend auf dem Pfad
  let cacheControl = 'no-cache';

  if (url.pathname.startsWith('/api/public/')) {
    // Öffentliche Daten für 1 Stunde cachen
    cacheControl = 'public, max-age=3600';
  } else if (url.pathname.startsWith('/api/comments/')) {
    // Kommentare für 5 Minuten cachen
    cacheControl = 'public, max-age=300';
  }

  const response = await handleRequest(context);

  // Cache-Control-Header hinzufügen
  response.headers.set('Cache-Control', cacheControl);

  return response;
}

```text

```text
