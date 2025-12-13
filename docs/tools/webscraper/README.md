---
description: 'Webscraper-Tool für Content-Extraktion und -Analyse in Evolution Hub'
owner: 'Tools Team'
priority: 'medium'
lastSync: '2025-11-26'
codeRefs: 'src/config/webscraper, src/pages/api/webscraper'
testRefs: 'tests/unit/webscraper, test-suite-v2/src/e2e/tools'
---

<!-- markdownlint-disable MD051 -->

# Webscraper Tool

**Scope** — Diese Kategorie dokumentiert das Webscraper-Tool für Content-Extraktion und -Analyse in Evolution Hub. Umfasst API-Endpunkte, Konfiguration und Nutzungsrichtlinien. Zielgruppe sind Entwickler und Power-User. Nicht enthalten: Frontend-UI (→ Frontend-Kategorie) oder allgemeine Scraping-Tools (→ externe Dokumentation).

## Primärdokumente

- **[Specification](./spec.md)** — Technische Beschreibung der aktuellen Funktionen

- **[Implementation Complete](./IMPLEMENTATION_COMPLETE.md)** — MVP-Status, Deploy-Anleitung und Betriebsnotizen

- **[Guidelines](./guidelines.md)** — Entwicklungsrichtlinien und Code-Konventionen

- **[Testing Strategy](./testing.md)** — Test-Pyramide, Quality-Metriken und Ausführungshinweise

- **[Roadmap](./roadmap.md)** — Geplante Erweiterungen und Phasen

## Sekundär-/Spezialdokumente

- Weitere Spezialisierungen werden aktuell direkt in den Primärdokumenten gepflegt. Eigenständige Teilkapitel für Usage, Rate-Limiting oder Security sind noch nicht veröffentlicht.

## Hauptfeatures

### Content-Extraktion

- **Strukturierte Daten:** JSON/XML/HTML-Parsing

- **Smart Extraction:** KI-gestützte Inhaltserkennung

- **Multi-Format:** Verschiedene Output-Formate (JSON, CSV, XML)

### API-Endpunkte

- **POST /api/webscraper/extract** — Haupt-Extraktions-Endpunkt

- **GET /api/webscraper/usage** — Nutzungsstatistiken

- **GET /api/webscraper/jobs/{id}** — Job-Status und Ergebnisse

## Dokumentation

### Setup & Konfiguration

Setup-Hinweise werden derzeit im Abschnitt *Deployment & Betrieb* von [Implementation Complete](./IMPLEMENTATION_COMPLETE.md) dokumentiert. Ergänzende Kapitel zu Abhängigkeiten oder Authentifizierung folgen mit dem nächsten Release.

### Integration

- **Testing:** Siehe [Testing Strategy](./testing.md) für Unit-, Integration- und E2E-Flows

## Cross-Referenzen

- **[API Documentation](../../api/README.md)** — Allgemeine API-Standards und Middleware

- **[Security Documentation](../../security/README.md)** — Security-Richtlinien

- **[Development Documentation](../../development/README.md)** — Tool-Entwicklung und Testing

## Ownership & Maintenance

**Owner:** Tools Team (Lead: Tool Developer)
**Update-Frequenz:** Bei Feature-Änderungen oder API-Updates
**Review-Prozess:** Code-Review + Security-Check
**Eskalation:** Bei Scraping-Problemen → Backend Team

## Standards & Konventionen

- **Rate-Limiting:** 10/min für Standard-User, höher für Enterprise

- **Output-Format:** Strukturiert und validiert

- **Security:** SSRF-Schutz, Rate-Limiting, Input-Validierung

- **Monitoring:** Nutzungsmetriken und Error-Tracking

- **Testing:** Unit-Tests für Parser, Integration-Tests für API

## Bekannte Lücken

- TODO: Vollständige Frontend-UI-Dokumentation

- TODO: Advanced Scraping-Features (JavaScript-Rendering)

- TODO: Enterprise-Feature-Dokumentation

## Übersicht

Automatische Web-Content-Extraktion mit robots.txt Compliance

---

## 🎯 Überblick

Das Webscraper-Tool ermöglicht es Nutzern, strukturierte Inhalte von Webseiten automatisch zu extrahieren. Es respektiert robots.txt-Regeln, implementiert Quota-Limits und bietet eine benutzerfreundliche UI.

### Hauptfeatures (2)

- ✅ **URL-basierte Extraktion**: Titel, Meta-Daten, Text, Links, Bilder

- ✅ **robots.txt Compliance**: Automatische Prüfung und Einhaltung

- ✅ **Quota-System**: 5 Requests/Tag (Gast), 20+ Requests/Tag (User – je nach Plan/Entitlements)

- ✅ **Sicherheit**: Rate-Limiting, CSRF-Schutz, Input-Validierung

- ✅ **Internationalisierung**: Deutsch/Englisch

- ✅ **Responsive UI**: Mobile-First Design mit Tailwind CSS

---

## 📋 Dokumentation

- **[Specification](spec.md)** - Detaillierte Feature-Spezifikation

- **[Roadmap](roadmap.md)** - 14-Wochen Entwicklungsplan (Phasen 1-4)

- **[Guidelines](guidelines.md)** - Entwicklungsrichtlinien für Claude Code

- **[Testing Strategy](testing.md)** - Test-Pyramide und Quality-Metriken

- **[Implementation Complete](IMPLEMENTATION_COMPLETE.md)** - MVP-Status & Deployment-Guide

---

## 🚀 Quick Start

### Lokal testen

```bash

# Dependencies installieren

npm install

# Development-Server starten

npm run dev:remote

# Tool aufrufen

open http://127.0.0.1:8787/tools/webscraper/app

```bash

### API verwenden

```bash
# URL scrapen
curl -X POST http://127.0.0.1:8787/api/webscraper/extract \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{"url": "https://example.com"}'
```

---

## 🏗 Architektur

```text
Webscraper Tool
├── Backend
│   ├── Config (src/config/webscraper.ts)
│   ├── Types (src/types/webscraper.ts)
│   ├── Service (src/lib/services/webscraper-service.ts)
│   └── API (src/pages/api/webscraper/extract.ts)
├── Frontend
│   ├── Island (src/components/tools/webscraper/WebscraperIsland.tsx)
│   ├── Form (src/components/tools/webscraper/WebscraperForm.tsx)
│   ├── Results (src/components/tools/webscraper/WebscraperResults.tsx)
│   └── Pages (src/pages/{de,en,}/tools/webscraper/app.astro)
├── Infrastructure
│   ├── Migration (migrations/0022_create_scraping_jobs_table.sql)
│   └── KV (wrangler.toml)
└── Tests
    ├── Unit (tests/unit/services/webscraper-service.test.ts)
    ├── Integration (tests/integration/api/webscraper.test.ts)
    └── E2E (test-suite-v2/tests/webscraper.spec.ts)

```text

---

## 📊 Status

| Component         | Status      | Coverage |
| ----------------- | ----------- | -------- |
| Backend Service   | ✅ Complete | 100%     |
| API Endpoint      | ✅ Complete | 100%     |
| Frontend UI       | ✅ Complete | 100%     |
| Unit Tests        | ✅ Passing  | 10/10    |
| Integration Tests | ✅ Passing  | 7/7      |
| E2E Tests         | ✅ Passing  | 7/7      |
| Build             | ✅ Success  | 12.89 kB |

---

## 🔧 Konfiguration

### Environment Variables

```bash
# Feature-Flag (default: true)
PUBLIC_WEBSCRAPER_V1=true

# Quotas
WEBSCRAPER_GUEST_LIMIT=5    # Requests/Tag für Gäste
WEBSCRAPER_USER_LIMIT=20    # Requests/Tag für eingeloggte User

# Timeouts
WEBSCRAPER_TIMEOUT=10000    # Fetch-Timeout in ms

# Limits
WEBSCRAPER_MAX_SIZE=5242880 # Max Response-Größe (5MB)

### Quota & Usage

Die effektiven Quoten werden planbasiert in `src/config/webscraper/entitlements.ts` gepflegt (`dailyBurstCap` pro rolling 24h Fenster, `monthlyRuns` pro Monat) und über `GET /api/webscraper/usage` exponiert. Die dort zurückgegebenen Felder `usage`/`dailyUsage` und – sofern `KV_WEBSCRAPER` aktiv ist – `monthlyUsage` sind maßgeblich für UI/HUDs.

Die Environment-Variablen `WEBSCRAPER_GUEST_LIMIT` und `WEBSCRAPER_USER_LIMIT` speisen das `limits`-Objekt in der Usage-Response und dienen primär als statische Defaults/Debug-Hilfen; die Durchsetzung von Limits erfolgt über die Entitlements (`dailyBurstCap`, `monthlyRuns`) und das 24h-/Monats-Usage-Tracking.

### KV-Namespaces

```toml

# Development

[[env.development.kv_namespaces]]
binding = "KV_WEBSCRAPER"
id = "webscraper-dev-local"

# Production

[[kv_namespaces]]
binding = "KV_WEBSCRAPER"
id = "webscraper-production"

```text

---

## 📖 API-Referenz

### POST /api/webscraper/extract

**Request:**

```json
{
  "url": "https://example.com"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "result": {
      "url": "https://example.com",
      "title": "Example Domain",
      "description": "Example description",
      "text": "Page content...",
      "metadata": { "author": "...", "language": "en" },
      "links": ["https://example.com/page1"],
      "images": ["https://example.com/logo.png"],
      "scrapedAt": "2025-10-03T09:00:00.000Z",
      "robotsTxtAllowed": true
    },
    "usage": {
      "used": 1,
      "limit": 5,
      "resetAt": 1728037200000
    }
  }
}

```text

**Response (Error):**

```json
{
  "success": false,
  "error": {
    "type": "validation_error|forbidden|server_error",
    "message": "Error description"
  }
}
```

---

## 🧪 Testing

```bash

# Unit-Tests

npm run test:unit:run -- tests/unit/services/webscraper-service.test.ts

# Integration-Tests

npm run test:integration:run -- tests/integration/api/webscraper.test.ts

# E2E-Tests (benötigt laufenden Server)

npm run test:e2e -- webscraper.spec.ts

```text

---

## 🐛 Bekannte Limitierungen (MVP)

1. **Kein JavaScript-Rendering** - Nur statisches HTML
1. **Kein Batch-Processing** - Eine URL pro Request
1. **Keine KI-Analyse** - Keine Sentiment/Entity-Erkennung
1. **Kein Monitoring** - Keine geplanten Scraping-Jobs
1. **Keine Bild-Downloads** - Nur URLs, keine Speicherung

→ Siehe [Roadmap](roadmap.md) für geplante Features in Phase 2-4

---

## 🎓 Best Practices

### Für Entwickler

1. **robots.txt respektieren** - Das Tool lehnt automatisch blockierte URLs ab
1. **Quotas beachten** - Gäste: 5/Tag, User: 20/Tag
1. **Error-Handling** - Nutze strukturierte Fehler-Typen
1. **Testing** - Alle neuen Features müssen getestet sein (≥70% Coverage)

### Für Nutzer

1. **Verantwortungsvoller Einsatz** - Keine exzessiven Requests
1. **Rechtliche Compliance** - Urheberrecht und Datenschutz beachten
1. **robots.txt** - Wenn blockiert, respektiere die Entscheidung
1. **Quota-Management** - Bei Limit-Überschreitung warten bis Reset

---

## 📞 Support

- **Issues**: GitHub Issues im Evolution Hub Repository

- **Dokumentation**: Siehe [docs/tools/webscraper/](.)

- **Tests**: Siehe [tests/](../../../tests/)

---

**Version**: 1.0.0-mvp
**Last Updated**: 2025-10-27
**Status**: Production Ready ✅

---

## 🎯 Überblick (2)

Das Webscraper-Tool ermöglicht es Nutzern, strukturierte Inhalte von Webseiten automatisch zu extrahieren. Es respektiert robots.txt-Regeln, implementiert Quota-Limits und bietet eine benutzerfreundliche UI.

### Hauptfeatures (2) (2)

- ✅ **URL-basierte Extraktion**: Titel, Meta-Daten, Text, Links, Bilder

- ✅ **robots.txt Compliance**: Automatische Prüfung und Einhaltung

- ✅ **Quota-System**: 5 Requests/Tag (Gast), 20 Requests/Tag (User)

- ✅ **Sicherheit**: Rate-Limiting, CSRF-Schutz, Input-Validierung

- ✅ **Internationalisierung**: Deutsch/Englisch

- ✅ **Responsive UI**: Mobile-First Design mit Tailwind CSS

---

## 📋 Dokumentation (2)

- **[Specification](spec.md)** - Detaillierte Feature-Spezifikation

- **[Roadmap](roadmap.md)** - 14-Wochen Entwicklungsplan (Phasen 1-4)

- **[Guidelines](guidelines.md)** - Entwicklungsrichtlinien für Claude Code

- **[Testing Strategy](testing.md)** - Test-Pyramide und Quality-Metriken

- **[Implementation Complete](IMPLEMENTATION_COMPLETE.md)** - MVP-Status & Deployment-Guide

---

## 🚀 Quick Start (2)

### Lokal testen (2)

```bash
# Dependencies installieren
npm install

# Development-Server starten
npm run dev:remote

# Tool aufrufen
open http://127.0.0.1:8787/tools/webscraper/app
```

### API verwenden (2)

```bash

# URL scrapen

curl -X POST http://127.0.0.1:8787/api/webscraper/extract \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -d '{"url": "https://example.com"}'

```text

---

## 🏗 Architektur (2)

```text
Webscraper Tool
├── Backend
│   ├── Config (src/config/webscraper.ts)
│   ├── Types (src/types/webscraper.ts)
│   ├── Service (src/lib/services/webscraper-service.ts)
│   └── API (src/pages/api/webscraper/extract.ts)
├── Frontend
│   ├── Island (src/components/tools/webscraper/WebscraperIsland.tsx)
│   ├── Form (src/components/tools/webscraper/WebscraperForm.tsx)
│   ├── Results (src/components/tools/webscraper/WebscraperResults.tsx)
│   └── Pages (src/pages/{de,en,}/tools/webscraper/app.astro)
├── Infrastructure
│   ├── Migration (migrations/0022_create_scraping_jobs_table.sql)
│   └── KV (wrangler.toml)
└── Tests
    ├── Unit (tests/unit/services/webscraper-service.test.ts)
    ├── Integration (tests/integration/api/webscraper.test.ts)
    └── E2E (test-suite-v2/tests/webscraper.spec.ts)
```

---

## 📊 Status (2)

| Component         | Status      | Coverage |
| ----------------- | ----------- | -------- |
| Backend Service   | ✅ Complete | 100%     |
| API Endpoint      | ✅ Complete | 100%     |
| Frontend UI       | ✅ Complete | 100%     |
| Unit Tests        | ✅ Passing  | 10/10    |
| Integration Tests | ✅ Passing  | 7/7      |
| E2E Tests         | ✅ Passing  | 7/7      |
| Build             | ✅ Success  | 12.89 kB |

---

## 🔧 Konfiguration (2)

### Environment Variables (2)

```bash

# Feature-Flag (default: true)

PUBLIC_WEBSCRAPER_V1=true

# Quotas

WEBSCRAPER_GUEST_LIMIT=5    # Requests/Tag für Gäste
WEBSCRAPER_USER_LIMIT=20    # Requests/Tag für eingeloggte User

# Timeouts

WEBSCRAPER_TIMEOUT=10000    # Fetch-Timeout in ms

# Limits

WEBSCRAPER_MAX_SIZE=5242880 # Max Response-Größe (5MB)

```text

### KV-Namespaces (2)

```toml
# Development
[[env.development.kv_namespaces]]
binding = "KV_WEBSCRAPER"
id = "webscraper-dev-local"

# Production
[[kv_namespaces]]
binding = "KV_WEBSCRAPER"
id = "webscraper-production"
```

---

## 📖 API-Referenz (2)

### POST /api/webscraper/extract (2)

**Request:**

```json
{
  "url": "https://example.com"
}

```json

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "result": {
      "url": "https://example.com",
      "title": "Example Domain",
      "description": "Example description",
      "text": "Page content...",
      "metadata": { "author": "...", "language": "en" },
      "links": ["https://example.com/page1"],
      "images": ["https://example.com/logo.png"],
      "scrapedAt": "2025-10-03T09:00:00.000Z",
      "robotsTxtAllowed": true
    },
    "usage": {
      "used": 1,
      "limit": 5,
      "resetAt": 1728037200000
    }
  }
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": {
    "type": "validation_error|forbidden|server_error",
    "message": "Error description"
  }
}

```bash

---

## 🧪 Testing (2)

```bash
# Unit-Tests
npm run test:unit:run -- tests/unit/services/webscraper-service.test.ts

# Integration-Tests
npm run test:integration:run -- tests/integration/api/webscraper.test.ts

# E2E-Tests (benötigt laufenden Server)
npm run test:e2e -- webscraper.spec.ts
```

---

## 🐛 Bekannte Limitierungen (MVP) (2)

1. **Kein JavaScript-Rendering** - Nur statisches HTML
1. **Kein Batch-Processing** - Eine URL pro Request
1. **Keine KI-Analyse** - Keine Sentiment/Entity-Erkennung
1. **Kein Monitoring** - Keine geplanten Scraping-Jobs
1. **Keine Bild-Downloads** - Nur URLs, keine Speicherung

→ Siehe [Roadmap](roadmap.md) für geplante Features in Phase 2-4

---

## 🎓 Best Practices (2)

### Für Entwickler (2)

1. **robots.txt respektieren** - Das Tool lehnt automatisch blockierte URLs ab
1. **Quotas beachten** - Gäste: 5/Tag, User: 20/Tag
1. **Error-Handling** - Nutze strukturierte Fehler-Typen
1. **Testing** - Alle neuen Features müssen getestet sein (≥70% Coverage)

### Für Nutzer (2)

1. **Verantwortungsvoller Einsatz** - Keine exzessiven Requests
1. **Rechtliche Compliance** - Urheberrecht und Datenschutz beachten
1. **robots.txt** - Wenn blockiert, respektiere die Entscheidung
1. **Quota-Management** - Bei Limit-Überschreitung warten bis Reset

---

## 📞 Support (2)

- **Issues**: GitHub Issues im Evolution Hub Repository

- **Dokumentation**: Siehe [docs/tools/webscraper/](.)

- **Tests**: Siehe [tests/](../../../tests/)

---

**Version**: 1.0.0-mvp
**Last Updated**: 2025-10-03
**Status**: Production Ready ✅
