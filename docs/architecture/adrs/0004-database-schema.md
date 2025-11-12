---
status: active
date: '2023-11-15'
supersededBy: ''
description: 'ADR zur Evolution Hub Datenbank-Architektur auf Cloudflare D1.'
owner: 'team:architecture'
priority: 'medium'
lastSync: '2025-11-11'
codeRefs: 'migrations/**, src/lib/db, wrangler.toml'
testRefs: 'N/A'
---

<!-- markdownlint-disable MD051 -->

# ADR 0004: Datenbank-Schema-Design

## Status

Angenommen

## Datum

2023-11-05

## Kontext

Evolution Hub benötigt ein effizientes, skalierbares und sicheres Datenbankschema. Die Anwendung verwendet Cloudflare D1 als Datenbanksystem, eine SQLite-Datenbank, die an der Edge ausgeführt wird. Wir müssen ein Datenbankschema entwerfen, das:

1. Die Anforderungen der Anwendung effizient erfüllt
1. Mit den Einschränkungen von Cloudflare D1 kompatibel ist
1. Performance-optimiert ist, auch bei wachsender Datenmenge
1. Die Datenintegrität und -sicherheit gewährleistet
1. Flexibel für zukünftige Erweiterungen ist

## Entscheidung

Wir haben uns für ein relationales Datenbankschema mit folgenden Hauptentitäten entschieden:

1. **Users**: Benutzerinformationen und Authentifizierungsdaten
1. **Sessions**: Aktive Benutzersitzungen
1. **Projects**: Benutzerprojekte und deren Metadaten
1. **Comments**: Kommentare zu Projekten
1. **Tools**: Werkzeuge, die in Projekten verwendet werden können
1. **ProjectTools**: Verknüpfung zwischen Projekten und Werkzeugen
1. **ResetTokens**: Token für Passwort-Zurücksetzungen

Das Schema verwendet Fremdschlüsselbeziehungen, Indizes für häufig abgefragte Spalten und normalisierte Tabellen, um Redundanz zu minimieren.

## Begründung

### Warum ein relationales Schema?

- **Datenintegrität**: Fremdschlüsselbeziehungen gewährleisten referenzielle Integrität

- **Normalisierung**: Reduziert Datenredundanz und verbessert die Konsistenz

- **Abfrageeffizienz**: Optimierte Abfragen durch Indizes und Joins

- **Kompatibilität**: Perfekte Übereinstimmung mit Cloudflare D1 (SQLite)

### Warum separate Sessions- und ResetTokens-Tabellen?

- **Sicherheit**: Trennung von Authentifizierungsdaten und Benutzerinformationen

- **Performance**: Effiziente Validierung und Bereinigung abgelaufener Tokens

- **Skalierbarkeit**: Unabhängige Skalierung von Benutzer- und Sitzungsdaten

### Warum eine ProjectTools-Verknüpfungstabelle?

- **Flexibilität**: Viele-zu-viele-Beziehung zwischen Projekten und Werkzeugen

- **Erweiterbarkeit**: Einfaches Hinzufügen von Metadaten zur Verknüpfung

- **Abfrageeffizienz**: Optimierte Abfragen für projektspezifische Werkzeuge

## Konsequenzen

### Positive Konsequenzen

- **Datenintegrität**: Konsistente und zuverlässige Daten durch Constraints

- **Abfrageeffizienz**: Optimierte Abfragen durch geeignete Indizierung

- **Wartbarkeit**: Klare Struktur und Beziehungen erleichtern die Wartung

- **Skalierbarkeit**: Schema unterstützt Wachstum ohne grundlegende Änderungen

### Negative Konsequenzen

- **Komplexität**: Mehr Tabellen und Beziehungen erhöhen die Komplexität

- **Join-Overhead**: Mehrere Joins können die Performance beeinträchtigen

- **Migrations-Management**: Schemaänderungen erfordern sorgfältige Migrationen

- **D1-Einschränkungen**: Einige SQLite/D1-spezifische Einschränkungen müssen beachtet werden

### Mitigationsstrategien

- **Indizierung**: Sorgfältige Indizierung häufig abgefragter Spalten

- **Abfrage-Optimierung**: Verwendung von Prepared Statements und optimierten Abfragen

- **Migrations-Framework**: Robustes Migrations-System für Schemaänderungen

- **Caching**: Implementierung von Caching für häufig abgerufene Daten

## Alternativen

### NoSQL-Ansatz

- **Vorteile**: Flexibleres Schema, potenziell einfachere Skalierung

- **Nachteile**: Nicht direkt mit D1 kompatibel, weniger Unterstützung für Beziehungen

### Hybrides Schema (teilweise denormalisiert)

- **Vorteile**: Bessere Performance für bestimmte Abfragen, weniger Joins

- **Nachteile**: Erhöhte Datenredundanz, komplexere Datenaktualisierungen

### Single-Table Design

- **Vorteile**: Einfachere Struktur, keine Joins erforderlich

- **Nachteile**: Massive Datenredundanz, schlechtere Abfrageeffizienz bei komplexen Abfragen

## Implementierungsdetails

Das Datenbankschema wird wie folgt implementiert:

### Users-Tabelle

````sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    roles TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

```text

### Sessions-Tabelle

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
````

### Projects-Tabelle

````sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_is_public ON projects(is_public);

```text

### Comments-Tabelle

```sql
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
````

### Tools-Tabelle

````sql
CREATE TABLE tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

```text

### ProjectTools-Tabelle

```sql
CREATE TABLE project_tools (
    project_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    settings TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, tool_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

CREATE INDEX idx_project_tools_project_id ON project_tools(project_id);
CREATE INDEX idx_project_tools_tool_id ON project_tools(tool_id);
````

### ResetTokens-Tabelle

````sql
CREATE TABLE reset_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reset_tokens_user_id ON reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_expires_at ON reset_tokens(expires_at);

```text

## Indizierungsstrategie

- **Primärschlüssel**: Alle Tabellen haben einen Primärschlüssel für schnellen Zugriff

- **Fremdschlüssel**: Alle Fremdschlüssel sind indiziert für effiziente Joins

- **Häufig abgefragte Spalten**: Spalten wie `email`, `is_public` und `expires_at` sind indiziert

- **Kombinierte Indizes**: Für häufige Abfragemuster werden kombinierte Indizes verwendet

## Migrations-Strategie

- **Versionierte Migrationen**: Jede Schemaänderung wird als versionierte Migration implementiert

- **Aufwärts- und Abwärtskompatibilität**: Migrationen unterstützen sowohl Upgrade als auch Downgrade

- **Transaktionale Migrationen**: Migrationen werden in Transaktionen ausgeführt, um Datenintegrität zu gewährleisten

- **Migrations-Tests**: Automatisierte Tests für Migrationen, um Regressionen zu vermeiden

## Referenzen

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1)

- [SQLite Documentation](https://www.sqlite.org/docs.html)

- [Database Normalization Best Practices](https://www.guru99.com/database-normalization.html)

- [Indexing Strategies](https://use-the-index-luke.com/)

- [Schema Migration Patterns](https://martinfowler.com/articles/evodb.html)

```text
````
