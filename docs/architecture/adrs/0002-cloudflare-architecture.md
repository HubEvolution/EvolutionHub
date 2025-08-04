# ADR 0002: Cloudflare-basierte Architektur

## Status

Angenommen

## Datum

2023-10-20

## Kontext

Evolution Hub benötigt eine moderne, skalierbare und performante Architektur. Wir müssen eine Infrastruktur wählen, die:

1. Globale Verfügbarkeit und niedrige Latenz bietet
2. Kostengünstig ist, auch bei Wachstum
3. Minimalen Verwaltungsaufwand erfordert
4. Moderne Entwicklungsworkflows unterstützt
5. Mit unserer Astro-basierten Frontend-Architektur kompatibel ist

## Entscheidung

Wir haben uns für eine vollständig auf Cloudflare-Diensten basierende Architektur entschieden:

1. **Hosting**: Cloudflare Pages für das Frontend und die API-Endpunkte
2. **Datenbank**: Cloudflare D1 (SQLite an der Edge) für persistente Datenspeicherung
3. **Serverless Functions**: Cloudflare Workers für API-Logik und Backend-Prozesse
4. **Caching**: Cloudflare CDN für statische Assets und API-Responses
5. **Sicherheit**: Cloudflare WAF und Bot Management für Anwendungsschutz

## Begründung

### Warum Cloudflare Pages?

- **Edge-Deployment**: Automatisches Deployment an über 200 Edge-Standorten weltweit
- **Integriertes CI/CD**: Automatische Builds und Deployments bei Git-Pushes
- **Preview-Deployments**: Automatische Preview-Umgebungen für Pull Requests
- **Astro-Kompatibilität**: Hervorragende Unterstützung für Astro-Projekte
- **Serverless Functions**: Nahtlose Integration von API-Endpunkten mit Pages Functions

### Warum Cloudflare D1?

- **Edge-Datenbank**: SQLite-Datenbank, die global an der Edge repliziert wird
- **SQL-Standard**: Vertraute SQL-Syntax und Funktionalität
- **Skalierbarkeit**: Automatische Skalierung ohne manuelle Konfiguration
- **Kosteneffizienz**: Pay-per-use-Modell ohne Vorabkosten
- **Niedrige Latenz**: Daten werden nahe am Benutzer gespeichert und abgerufen

### Warum Cloudflare Workers?

- **Globale Ausführung**: Code wird am nächstgelegenen Edge-Standort ausgeführt
- **Schnelle Startzeit**: Cold-Start-Zeiten im Millisekundenbereich
- **Isolierte Umgebungen**: V8-Isolates für Sicherheit und Effizienz
- **Einfache API-Integration**: Nahtlose Integration mit Pages und D1
- **TypeScript-Support**: Vollständige TypeScript-Unterstützung

## Konsequenzen

### Positive Konsequenzen

- **Globale Performance**: Extrem niedrige Latenz für Benutzer weltweit
- **Vereinfachte DevOps**: Keine Server-Verwaltung oder komplexe Infrastruktur
- **Kosteneffizienz**: Pay-per-use ohne teure Vorabinvestitionen
- **Skalierbarkeit**: Automatische Skalierung ohne manuelle Eingriffe
- **Sicherheit**: Integrierte Sicherheitsfeatures auf Netzwerk- und Anwendungsebene

### Negative Konsequenzen

- **Vendor Lock-in**: Starke Abhängigkeit von Cloudflare-Diensten
- **Einschränkungen**: Limitierungen der Cloudflare-Plattform (z.B. Ausführungszeit, Speichergrenzen)
- **Debugging-Komplexität**: Potenziell schwierigeres Debugging in verteilten Edge-Umgebungen
- **Eingeschränkte Datenbankfunktionen**: D1 bietet nicht alle Features traditioneller Datenbanken

### Mitigationsstrategien

- **Abstraktion**: Implementierung von Abstraktionsschichten für Datenbankzugriff und API-Aufrufe
- **Lokale Entwicklung**: Robuste lokale Entwicklungsumgebung mit Wrangler
- **Monitoring**: Implementierung umfassender Logging- und Monitoring-Lösungen
- **Backup-Strategien**: Regelmäßige Backups der D1-Datenbank

## Alternativen

### Traditionelle Cloud-Provider (AWS, Azure, GCP)

- **Vorteile**: Mehr Kontrolle, umfangreichere Dienste, etablierte Ökosysteme
- **Nachteile**: Höhere Komplexität, höhere Kosten, mehr Verwaltungsaufwand

### Vercel + MongoDB/Postgres

- **Vorteile**: Gute Astro-Integration, umfangreichere Datenbankfunktionen
- **Nachteile**: Höhere Datenbanklatenz, separate Dienste zu verwalten, potenziell höhere Kosten

### Self-Hosting

- **Vorteile**: Vollständige Kontrolle, keine Vendor-Abhängigkeit
- **Nachteile**: Hoher Verwaltungsaufwand, schlechtere globale Performance, höhere Kosten

## Implementierungsdetails

Die Cloudflare-Architektur wird wie folgt implementiert:

1. **Frontend-Deployment**:
   - Astro-Projekt wird auf Cloudflare Pages gehostet
   - Statische Assets werden automatisch am CDN gecacht
   - Islands-Architektur für interaktive Komponenten

2. **API-Implementierung**:
   - API-Endpunkte als Cloudflare Pages Functions
   - Organisiert in der Verzeichnisstruktur unter `/src/pages/api/`
   - TypeScript für Typsicherheit und bessere Entwicklererfahrung

3. **Datenbank-Integration**:
   - D1-Datenbank über Cloudflare-Bindings eingebunden
   - Prepared Statements für alle Datenbankabfragen
   - Migrations-System für Schemaänderungen

4. **Caching-Strategie**:
   - Cache-Control-Header für optimales Asset-Caching
   - API-Caching für lesende Operationen wo angemessen
   - Edge-Cache für häufig abgerufene Daten

5. **Sicherheitsmaßnahmen**:
   - WAF-Regeln für bekannte Angriffsvektoren
   - Rate-Limiting für alle API-Endpunkte
   - Bot-Management für automatisierte Angriffe

## Referenzen

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)
- [Astro Documentation](https://docs.astro.build)
- [Edge Computing Best Practices](https://www.cloudflare.com/learning/serverless/glossary/what-is-edge-computing/)
