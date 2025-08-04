# ADR-0003: Cloudflare D1 Datenbankschema und Migrationsansatz

## Status

**Akzeptiert**

## Kontext

Für das Evolution Hub Projekt benötigten wir eine Datenbankstrategie, die folgende Anforderungen erfüllt:

1. Kompatibilität mit der Cloudflare-Plattform und serverless Architektur
2. Skalierbarkeit für wachsende Datenmengen und Benutzeraktivitäten
3. Typsicherheit und Integration mit unserem TypeScript-basierten Stack
4. Versionierbarkeit und kontrollierte Schemaevolution
5. Einfache lokale Entwicklung und Testbarkeit
6. Effiziente Abfragen für häufig benötigte Daten

Die Datenbank muss verschiedene Entitäten wie Benutzer, Projekte, Aktivitäten und Inhalte speichern und effizient abfragen können.

## Entscheidung

Wir haben uns für folgende Datenbankstrategie entschieden:

1. **Cloudflare D1** als primäre Datenbank:
   - SQLite-kompatible, serverless SQL-Datenbank
   - Vollständig in die Cloudflare-Plattform integriert
   - Automatische Replikation und Skalierung durch Cloudflare

2. **Relationales Datenbankschema** mit folgenden Haupttabellen:
   - `users`: Benutzerinformationen und Anmeldedaten
   - `sessions`: Aktive Benutzersitzungen (für Token-Blacklisting)
   - `projects`: Projektdaten und Metadaten
   - `project_members`: Beziehungen zwischen Projekten und Benutzern
   - `activities`: Benutzeraktivitäten und Ereignisse
   - `comments`: Benutzerkommentare zu Projekten
   - `tools`: Tool-Definitionen und Metadaten
   - `password_resets`: Passwort-Reset-Tokens und Metadaten

3. **Migrationsbasierter Ansatz** für Schemaevolution:
   - Versionierte SQL-Migrationsdateien
   - Automatisierte Migrationsausführung bei Deployment
   - Rollback-Möglichkeit für fehlgeschlagene Migrationen

4. **TypeScript-Typen** für Datenbankentitäten:
   - Strikte Typdefinitionen für alle Datenbankentitäten
   - Automatische Typableitung für Abfrageergebnisse
   - Konsistente Typen zwischen Datenbank und Anwendungscode

## Konsequenzen

### Positive Konsequenzen

1. **Nahtlose Integration**:
   - D1 ist vollständig in das Cloudflare-Ökosystem integriert
   - Einfache Verbindung von Workers zu D1 ohne externe Abhängigkeiten
   - Konsistente Plattform für Hosting und Datenbank

2. **Entwicklungseffizienz**:
   - SQL als bekannte und mächtige Abfragesprache
   - Typsicherheit durch TypeScript-Integration
   - Einfache lokale Entwicklung mit Wrangler CLI

3. **Kosteneffizienz**:
   - Serverless Modell ohne laufende Infrastrukturkosten
   - Pay-as-you-go-Preismodell für tatsächliche Nutzung
   - Keine Notwendigkeit für separate Datenbankserver

4. **Skalierbarkeit**:
   - Automatische Skalierung durch Cloudflare's Edge-Netzwerk
   - Effiziente Abfragen durch Indexierung und SQL-Optimierung
   - Verteilte Datenreplikation für globale Performance

### Negative Konsequenzen

1. **Einschränkungen von D1**:
   - Als relativ neuer Dienst hat D1 einige Feature-Einschränkungen
   - Begrenzte Unterstützung für komplexe SQL-Funktionen
   - Eingeschränkte Transaktionsunterstützung im Vergleich zu traditionellen RDBMS

2. **Vendor Lock-in**:
   - Starke Kopplung an die Cloudflare-Plattform
   - Migration zu anderen Datenbankanbietern könnte aufwändig sein
   - Abhängigkeit von Cloudflare's Roadmap für neue Features

3. **Komplexität bei Joins**:
   - Komplexe Joins können in serverless Umgebungen Performance-Probleme verursachen
   - Notwendigkeit für denormalisierte Daten in einigen Fällen
   - Sorgfältige Abfrageoptimierung erforderlich

4. **Lokale Entwicklung**:
   - Lokale Entwicklung erfordert Wrangler für D1-Emulation
   - Potenzielle Unterschiede zwischen lokalem und Produktionsverhalten
   - Eingeschränkte Debugging-Möglichkeiten für Datenbankprobleme

## Alternativen

### Alternative 1: NoSQL-Datenbank (z.B. Cloudflare KV oder Durable Objects)

**Vorteile**:
- Bessere Skalierbarkeit für bestimmte Anwendungsfälle
- Flexibleres Schema ohne Migrationen
- Möglicherweise bessere Performance für einfache Schlüssel-Wert-Operationen

**Nachteile**:
- Weniger mächtige Abfragemöglichkeiten als SQL
- Schwierigere Umsetzung von Beziehungen zwischen Entitäten
- Komplexere Datenmodellierung für relationale Daten

### Alternative 2: Externe SQL-Datenbank (z.B. PostgreSQL auf einem anderen Anbieter)

**Vorteile**:
- Vollständige SQL-Funktionalität
- Reifere Tooling-Unterstützung
- Unabhängigkeit von Cloudflare für Datenbankfunktionen

**Nachteile**:
- Höhere Latenz durch externe API-Aufrufe
- Zusätzliche Infrastrukturkosten
- Komplexere Verbindungsverwaltung in serverless Umgebungen

### Alternative 3: Hybridansatz mit mehreren Datenspeichern

**Vorteile**:
- Optimierte Speicherung für verschiedene Datentypen
- Bessere Performance durch spezialisierte Datenspeicher
- Geringere Abhängigkeit von einem einzelnen Anbieter

**Nachteile**:
- Erhöhte Komplexität durch mehrere Datenspeicher
- Herausforderungen bei der Datenkonsistenz
- Höherer Entwicklungs- und Wartungsaufwand

## Referenzen

- [Cloudflare D1 Dokumentation](https://developers.cloudflare.com/d1/)
- [SQL-Migrationsmuster und Best Practices](https://martinfowler.com/articles/evodb.html)
- [TypeScript und Datenbank-Typsicherheit](https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety)
- Interne Diskussionen zu Datenmodellierung und Performance-Anforderungen
- [Cloudflare Workers Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/learning/how-kv-works/)
